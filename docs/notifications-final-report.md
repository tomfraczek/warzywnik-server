# Finalizacja produkcyjnego refaktoru systemu powiadomień

Data: 2026-05-26  
Status: ✅ Zakończono — zero błędów kompilacji, 27 testów zielonych

---

## Zmienione pliki

| Plik                                                                 | Zmiana                                                                 |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `src/common/enums/notification.enums.ts`                             | Dodano enum `NotificationDeliveryPolicy`                               |
| `src/notifications/entities/notification-event-outbox.entity.ts`     | Dodano pole `userIntentKey`                                            |
| `src/notifications/entities/notification-batch.entity.ts`            | Dodano pola `userIntentKey` + `deliveryPolicy`                         |
| `src/migrations/Migration20260526120000_notification_intent_keys.ts` | Nowa migracja DB                                                       |
| `src/notifications/notification-event.service.ts`                    | Pełny refaktor — `userIntentKey` per task, lifecycle per planting      |
| `src/notifications/notification-aggregator.service.ts`               | Grupowanie po `userIntentKey`, `deliveryPolicy` na batchu, plural copy |
| `src/notifications/notification-copy.service.ts`                     | Nowe buildery: watering, harvest, frost, wind, lifecycle plural        |
| `src/notifications/push-delivery.service.ts`                         | Guard PLAN_ONLY w `deliverBatch`                                       |
| `src/notifications/notification-pipeline.spec.ts`                    | Nowy plik testów — scenariusze A–F (24 testy)                          |

---

## Architektura finalna (jeden pipeline)

```
NotificationEventOutbox
  ↓ (*/1 cron)
NotificationAggregatorService
  · grupowanie po userIntentKey (lub userId:type jako fallback)
  · buildCandidate → plural copy + deliveryPolicy
  · evaluate (policy) → SKIP | CENTER_ONLY | PUSH
  ↓
NotificationBatch
  · deliveryPolicy = PUSH_IMMEDIATE | PUSH_DIGEST | CENTER_ONLY | PLAN_ONLY
  ↓ (*/1 cron)
PushDeliveryService
  · PLAN_ONLY → SKIPPED, brak push, brak Notification Center
  · CENTER_ONLY → createNotification, brak push
  · PUSH_DIGEST / PUSH_IMMEDIATE → Expo push API
```

Pipeline B (PushWorkerService → Expo bezpośrednio dla ACTION_TASK_DUE) jest wyciszony od Fazy 1 i nie ma tu zastosowania.

---

## userIntentKey — koncepcja i wartości

`userIntentKey` grupuje wiele granularnych zdarzeń (per task/per planting) w **jedno logiczne powiadomienie dla użytkownika**.

### Wartości kluczy

| Klucz                                            | Źródło                                            | Delivery policy                                |
| ------------------------------------------------ | ------------------------------------------------- | ---------------------------------------------- |
| `WATERING_TODAY:{userId}:{date}`                 | WEATHER_WARNING task (slug: podlej/water)         | PUSH_DIGEST                                    |
| `HARVEST_READY:{userId}:{date}`                  | WEATHER_WARNING task (slug: harvest/zbior)        | PUSH_DIGEST                                    |
| `FROST_PROTECTION:{userId}:{date}`               | WEATHER_WARNING task (slug: frost/przymroz/oslon) | PUSH_IMMEDIATE                                 |
| `WIND_PROTECTION:{userId}:{date}`                | WEATHER_WARNING task (slug: wind/wiatr)           | PUSH_IMMEDIATE                                 |
| `WEATHER_TASKS:{userId}:{date}`                  | WEATHER_WARNING task (inne)                       | PLAN_ONLY                                      |
| `TASKS_DUE_TODAY:{userId}:{date}`                | VEGETABLE_RULE task                               | PLAN_ONLY                                      |
| `LIFECYCLE_HARVEST_WINDOW_START:{userId}:{date}` | lifecycle suggestion (harvest)                    | PUSH_DIGEST                                    |
| `LIFECYCLE_TRANSPLANT:{userId}:{date}`           | lifecycle suggestion (transplant)                 | PUSH_DIGEST                                    |
| `WEATHER_ALERTS:{userId}:{date}:{reason}`        | warning instance                                  | PUSH_IMMEDIATE (frost/wind) lub PUSH_DIGEST    |
| `GARDEN_RISK_{reason}:{userId}:{date}`           | garden risk                                       | PUSH_IMMEDIATE (HIGH/CRITICAL) lub PUSH_DIGEST |

---

## Przykłady agregacji

### 3 zadania podlewania → 1 push

```
Outbox events (3):
  type=TASKS_GENERATED, userIntentKey=WATERING_TODAY:u1:2026-05-26, taskId=t1
  type=TASKS_GENERATED, userIntentKey=WATERING_TODAY:u1:2026-05-26, taskId=t2
  type=TASKS_GENERATED, userIntentKey=WATERING_TODAY:u1:2026-05-26, taskId=t3

→ Aggregator groups all 3 into key "u1:intent:WATERING_TODAY:u1:2026-05-26"
→ 1 NotificationBatch:
  title: "Podlewanie roślin"
  body:  "3 grządki wymagają uwagi"
  deliveryPolicy: PUSH_DIGEST
  payload.bedIds: [b1, b2, b3]
  payload.actionTaskIds: [t1, t2, t3]
```

### 4 uprawy gotowe do zbioru → 1 push

```
Outbox events (4):
  type=TASKS_GENERATED, userIntentKey=HARVEST_READY:u1:2026-05-26, taskId=t4–t7

→ 1 NotificationBatch:
  title: "Zbiory"
  body:  "4 uprawy są gotowe do zbioru"
  deliveryPolicy: PUSH_DIGEST
```

### VEGETABLE_RULE zadania → brak push

```
Outbox events (7):
  type=TASKS_GENERATED, userIntentKey=TASKS_DUE_TODAY:u1:2026-05-26

→ 1 NotificationBatch:
  deliveryPolicy: PLAN_ONLY
  status: SKIPPED (skippedReason: plan_only)
  → brak push, brak Notification Center
```

### Lifecycle 3 upraw do przesadzenia → 1 push

```
Outbox events (3 separate, dedupeKey per planting → 1 survives dedup per day):
  type=LIFECYCLE_SUGGESTION, userIntentKey=LIFECYCLE_transplant_readiness:u1:2026-05-26

→ Aggregator merges plantingIds from all 3 events
→ 1 NotificationBatch:
  title: "Rozsada do przesadzenia 🌱"
  body:  "3 rozsad czeka na przesadzenie do grządki"
  deliveryPolicy: PUSH_DIGEST
  payload.plantingIds: [p1, p2, p3]
  payload.count: 3
```

### Frost alert → PUSH_IMMEDIATE

```
type=WEATHER_ALERTS_SUMMARY, reason=FROST
→ deliveryPolicy: PUSH_IMMEDIATE
→ push wysyłany natychmiast (pomija PUSH_DIGEST batching)
```

---

## Notification Center (centrum powiadomień)

Wpis w Notification Center tworzony jest dla:

- `CENTER_ONLY` — artykuły, informacyjne lifecycle
- `PUSH_DIGEST` / `PUSH_IMMEDIATE` — po dostarczeniu push (przez `ensureNotification` w push-delivery)

**Brak wpisu w Notification Center dla:**

- `PLAN_ONLY` (zadania automatyzacji) — widoczne tylko w widoku Planner

---

## Delivery Policy — tabela referencyjna

| Policy           | Push              | Notification Center | Opis                                         |
| ---------------- | ----------------- | ------------------- | -------------------------------------------- |
| `PUSH_IMMEDIATE` | ✅ W ciągu ~1 min | ✅                  | Frost, wind damage, storm                    |
| `PUSH_DIGEST`    | ✅ W ciągu ~1 min | ✅                  | Podlewanie, zbiory, lifecycle                |
| `CENTER_ONLY`    | ❌                | ✅                  | Artykuły, low-priority lifecycle             |
| `PLAN_ONLY`      | ❌                | ❌                  | Automatyzacja (VEGETABLE_RULE), daily digest |

> **Uwaga:** Zarówno `PUSH_IMMEDIATE` jak i `PUSH_DIGEST` są dostarczane przez ten sam cron `*/1` —
> różnica między nimi jest **wyłącznie semantyczna** (priorytet, sound/badge na urządzeniu w przyszłości).
> Dziś backend nie opóźnia `PUSH_DIGEST`. Jeśli ta funkcja ma być zaimplementowana, wymaga osobnego zadania (patrz niżej).

---

## Migracje DB

### `Migration20260526120000_notification_intent_keys`

```sql
-- notification_event_outbox
ALTER TABLE notification_event_outbox
  ADD COLUMN user_intent_key text NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_neo_user_intent_key
  ON notification_event_outbox (user_intent_key)
  WHERE user_intent_key IS NOT NULL;

-- notification_batches
CREATE TYPE notification_delivery_policy_enum AS ENUM (
  'PUSH_IMMEDIATE', 'PUSH_DIGEST', 'CENTER_ONLY', 'PLAN_ONLY'
);

ALTER TABLE notification_batches
  ADD COLUMN user_intent_key text NULL,
  ADD COLUMN delivery_policy notification_delivery_policy_enum NOT NULL DEFAULT 'PUSH_DIGEST';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_nb_user_intent_key
  ON notification_batches (user_intent_key)
  WHERE user_intent_key IS NOT NULL;
```

---

## Testy — scenariusze A–F

Plik: `src/notifications/notification-pipeline.spec.ts` (24 testy)

| Scenariusz | Opis                                                    | Status |
| ---------- | ------------------------------------------------------- | ------ |
| A          | 3 zadania podlewania → WATERING_TODAY key + copy        | ✅     |
| B          | 4 zadania zbiorów → HARVEST_READY key + copy            | ✅     |
| C          | VEGETABLE_RULE → TASKS_DUE_TODAY (PLAN_ONLY)            | ✅     |
| D          | LIFECYCLE_SUGGESTION plural copy (harvest + transplant) | ✅     |
| E          | FROST_PROTECTION → PUSH_IMMEDIATE                       | ✅     |
| F          | Delivery policy resolution (7 sub-tests)                | ✅     |
| extra      | Copy service — brak wycieków kodów technicznych         | ✅     |

---

## Mobile Frontend (iOS/Android)

**Brak zmian wymaganych.** Payload pushów jest wstecznie kompatybilny:

- `actionTaskIds`, `bedIds`, `plantingIds` — tablice zamiast pojedynczych ID (ale `bedId`/`plantingId` nadal są obecne jako pierwszy element)
- `userIntentKey` — nowe pole, opcjonalne, Mobile może je ignorować lub użyć do grupowania w UI

---

## CMS Frontend

**Brak zmian wymaganych.** Delivery policy jest decyzją backendową i nie wymaga konfiguracji CMS.

---

## Jak działa PUSH_DIGEST w obecnym kodzie

### Stan faktyczny

Oba typy (`PUSH_IMMEDIATE` i `PUSH_DIGEST`) są obsługiwane przez **ten sam cron** (`*/1 * * * *` w `PushDeliveryService`):

```
NotificationBatch (status=PENDING, sendAfter <= now)
  → deliverPendingBatches()
    → deliverBatch(batch)
      → Expo push API
```

`sendAfter` jest ustawiany na `new Date()` przez agregator — zarówno dla `PUSH_IMMEDIATE` jak i `PUSH_DIGEST`. **Nie istnieją żadne "okna digest".** Push wychodzi w ciągu ~1 minuty od wygenerowania batcha, niezależnie od polityki.

### Co zatem różni PUSH_IMMEDIATE od PUSH_DIGEST dziś?

Nic poza semantyką w bazie danych i przyszłą intencją. Kolumna `delivery_policy` jest gotowa jako fundament, ale logika opóźniania nie jest zaimplementowana.

### Przykład: WATERING_TODAY wygenerowane o 14:00

```
14:00 — task wygenerowany przez weather cron
14:00 — NotificationEventOutbox: userIntentKey=WATERING_TODAY:u1:2026-05-26
14:01 — Aggregator cron: 1 batch PUSH_DIGEST, sendAfter = 14:00
14:01 — PushDelivery cron: sendAfter <= now → push wysyłany
14:01 — Użytkownik dostaje push "Podlewanie roślin — 3 grządki wymagają uwagi"
```

Użytkownik **dostaje push 1–2 minuty po wygenerowaniu taska**, nawet jeśli policy to `PUSH_DIGEST`.

### Gdybyśmy chcieli prawdziwe okna digest (np. tylko o 8:00 i 18:00)

To osobne zadanie, nieujęte w tym refaktorze. Wymagałoby:

1. Funkcji `nextDigestWindow(userTimezone)` — oblicza `sendAfter` dla `PUSH_DIGEST`
2. Zmiany w agregatorze: `batch.sendAfter = nextDigestWindow(...)` zamiast `new Date()`
3. Opcjonalnie: preferencja użytkownika "godzina powiadomień" w `NotificationPreference` (szkielet już istnieje)

**Dziś: `PUSH_DIGEST` = push w ciągu ~1 min, z niższym priorytetem semantycznym.**

---

## Rollback

1. Rollback migracji: `DROP COLUMN user_intent_key` na obu tabelach, `DROP TYPE notification_delivery_policy_enum`
2. Przywrócenie poprzednich wersji plików z git: `git revert` commitów z tego session
3. `deliveryPolicy` ma DEFAULT 'PUSH_DIGEST' — brak wartości nie blokuje push dla istniejących batchy

---

_Wygenerowano automatycznie po zakończeniu refaktoru._
