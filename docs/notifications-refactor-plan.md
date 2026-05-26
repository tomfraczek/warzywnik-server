# Plan techniczny — produkcyjny refactor systemu powiadomień

## 0. Mapa obecnego stanu (kontekst decyzji)

```
PIPELINE A (właściwy)
  NotificationEventOutbox
  → NotificationAggregatorService (*/1 min)
  → NotificationPolicyService (PUSH | CENTER_ONLY | SKIP)
    ↳ sprawdza: notificationsEnabled, isTypeEnabled, dedupe, intensity
  → NotificationBatch → PushDeliveryService (*/1 min) → Expo

PIPELINE B (problematyczny, omija wszystko)
  ActionTask → upsertReminderForTask() → Reminder
  → PushWorkerService (*/1 min)
    ↳ NIE sprawdza: policy, preferencji, dedupe, Notification Center
    ↳ wysyła 1 push per Reminder
    ↳ tytuł "Warzywnik", body "Czas na: {template.name}"
```

**Problem strukturalny:** Pipeline B istnieje jako osobny mechanizm dostarczania, który nie ma żadnego punktu styku z polityką z Pipeline A.

---

## 1. Co zostanie zmienione (szczegółowo)

### 1a. `Reminder` entity

Dodać pole `isManual: boolean default false` + `deliveryPolicy: enum`.

Encja `Reminder` aktualnie nie rozróżnia automatycznych i ręcznych przypomnień. `PushWorkerService` traktuje wszystkie jednakowo.

```
Reminder.isManual          — czy utworzony przez użytkownika (nie przez automation)
Reminder.deliveryPolicy    — PUSH_IMMEDIATE | PUSH_DIGEST | CENTER_ONLY | PLAN_ONLY | NO_NOTIFICATION
Reminder.userIntentKey     — opcjonalny string do grupowania w dedupe (np. WATERING_TODAY:userId:date)
```

### 1b. `PushWorkerService`

Ograniczyć do wysyłania pushy **tylko** dla reminderów z `isManual = true` i `deliveryPolicy IN (PUSH_IMMEDIATE, PUSH_DIGEST)`.

Auto-generated task reminders (`isManual = false`) nie będą przetwarzane przez `PushWorkerService`.

Dla manualnych reminderów dodać minimalną bramkę:

- sprawdzenie `user.notificationsEnabled`,
- globalny cooldown per user per 5 min (max 1 push immediate na 5 min z wyjątkiem krytycznych).

### 1c. `ActionAutomationService` — `upsertReminderForTask()`

Zmienić tak, żeby Reminder tworzony dla auto-taska miał `isManual = false` i `deliveryPolicy = PLAN_ONLY` (lub dziedziczone z `ActionTemplate.deliveryPolicy`).

Reminder nadal istnieje w bazie (jest potrzebny do schedulingu i historii), ale nie przechodzi przez `PushWorkerService`.

### 1d. `RemindersService.upsertPendingForActionTask()`

Analogicznie: manual task tworzony przez użytkownika (`ActionTaskSource.MANUAL`) → `isManual = true`.

### 1e. `WeatherTaskPlannerService`

- `WATERING_NEEDED_TODAY/TOMORROW`: usunąć z `isBedLevelCode` → 1 task per user zamiast per bed.
- Weather tasks mają `deliveryPolicy = PUSH_DIGEST` (trafią do Pipeline A jako `TASKS_GENERATED`).
- Nie tworzyć `Reminder` dla weather tasks w ogóle. Zamiast tego `collectAutomationTaskEvents()` wystarczy.

### 1f. `LifecycleSuggestionService`

Zmienić dedupeKey z per-planting na per-user-per-day-per-action:

```
Przed: {userId}:LIFECYCLE_SUGGESTION:{plantingId}:{action}
Po:    {userId}:LIFECYCLE_SUGGESTION:{action}:{today}
```

Agregować plantingIds w payload. Zaktualizować copy builder (`buildLifecycleSuggestionCopy`) żeby obsłużył liczbę (np. „3 uprawy gotowe do zbioru").

### 1g. `NotificationEventService.publishWeatherEvents()`

Stabilizacja dedupeKey — zastąpić `validFrom:validTo` (które rotuje co godzinę) stabilnym bucketem:

```
Przed: {userId}:WEATHER_ALERTS_SUMMARY:{windowStart}:{windowEnd}:{reasons}
Po:    {userId}:WEATHER_ALERTS_SUMMARY:{today}:{reasons}
```

Analogicznie dla `WEATHER_STATUS_CHANGED` i `GARDEN_RISK_CHANGED`.

### 1h. `NotificationPolicyService`

Rozszerzyć decyzję z `PUSH | CENTER_ONLY | SKIP` na `PUSH_IMMEDIATE | PUSH_DIGEST | CENTER_ONLY | PLAN_ONLY | NO_NOTIFICATION`.

Dodać:

- mapę `notificationTypeToDefaultPolicy` (patrz sekcja 5),
- global daily push limit per user (np. 10 non-critical, nieograniczone CRITICAL/HIGH),
- cooldown per `userIntentKey` (np. 24h dla `WATERING_TODAY`, 14 dni dla `LIFECYCLE_HARVEST`),
- sprawdzenie czy `PUSH_DIGEST` powinien wejść do `DAILY_TASKS_SUMMARY` zamiast osobnego pusha.

### 1i. `NotificationAggregatorService`

Dodać obsługę `userIntentKey` w `buildCandidate()`:

```typescript
type BatchCandidate = {
  ...existing fields...
  userIntentKey?: string;        // np. WATERING_TODAY:{userId}:{date}
  deliveryPolicy: DeliveryPolicy;
}
```

Przed zapisem `NotificationBatch`: sprawdzić czy istnieje batch z tym samym `userIntentKey` i `status = PENDING/SENT` w ostatnich N godzinach → jeśli tak, merge lub skip.

### 1j. `NotificationCopyService`

Nowe metody copy dla aggregate cases:

```typescript
buildHarvestReadyCopy(count: number): NotificationCopy
buildWateringNeededCopy(bedCount: number): NotificationCopy
buildLifecycleSuggestionAggregateCopy(action: string, count: number): NotificationCopy
```

### 1k. `ActionTemplate` entity (seed/CMS)

Dodać pole `deliveryPolicy: enum` (opcjonalne, fallback do logiki systemowej).

Zmiana w seed data:

- `watering` template: `deliveryPolicy: PUSH_DIGEST`
- `harvest` template: `deliveryPolicy: PLAN_ONLY`
- `monitoring` templates: `deliveryPolicy: PLAN_ONLY`
- `fertilizing`, `staking`, `transplanting`: `deliveryPolicy: PLAN_ONLY`

---

## 2. Które pipeline'y zostaną połączone / ograniczone

| Pipeline                            | Zmiana                                                                                |
| ----------------------------------- | ------------------------------------------------------------------------------------- |
| Pipeline B (PushWorkerService)      | Ograniczony do `isManual = true` reminderów                                           |
| Pipeline A (NotificationAggregator) | Rozszerzony o `userIntentKey`, `deliveryPolicy`, daily limits                         |
| Auto-task → Reminder                | Reminder istnieje, ale `deliveryPolicy = PLAN_ONLY`, pomijany przez PushWorkerService |
| Weather tasks                       | Nie tworzą Reminder — tylko TASKS_GENERATED event w Pipeline A                        |
| Lifecycle suggestions               | Agregowane per user/day, nie per planting                                             |

Efektywnie: **jeden wyjście do Expo** → `PushDeliveryService` w Pipeline A. `PushWorkerService` staje się "manual reminder delivery service".

---

## 3. Nowy flow

```
AUTO-GENERATED TASK FLOW:
  WeatherTaskPlanner / ActionAutomation
    ↓ createTask() → ActionTask [source=AUTOMATION]
    ↓ upsertReminderForTask() → Reminder [isManual=false, deliveryPolicy=PLAN_ONLY]
    ↓ collectAutomationTaskEvents() (*/5 min)
    ↓ TASKS_GENERATED event → NotificationEventOutbox
    ↓ NotificationAggregatorService [userIntentKey=WATERING_TODAY:userId:date]
    ↓ NotificationPolicyService → PUSH_DIGEST lub CENTER_ONLY
    ↓ NotificationBatch → PushDeliveryService → Expo
    ✓ PLAN_ONLY reminders ignored by PushWorkerService

WEATHER ALERT FLOW:
  WeatherWarningOrchestrator → WarningInstance
    ↓ emitWeatherNotificationEvents()
    ↓ WEATHER_ALERTS_SUMMARY [dedupeKey={userId}:{today}:{reasons}]
    ↓ NotificationPolicyService → PUSH_IMMEDIATE (jeśli DROUGHT/FROST/etc.)
    ↓ 1 push per day per reason
    ✓ validFrom/validTo nie jest w dedupeKey

LIFECYCLE SUGGESTION FLOW:
  LifecycleSuggestionService (*/3h)
    ↓ 3 plantings at harvestWindowStart
    ↓ 1 event LIFECYCLE_SUGGESTION [dedupeKey={userId}:LIFECYCLE_SUGGESTION:harvest:{today}]
    ↓ payload: { plantingIds: [id1, id2, id3], count: 3 }
    ↓ buildHarvestReadyCopy(3) → "3 uprawy gotowe do zbioru"
    ↓ 1 push per day

MANUAL REMINDER FLOW:
  User sets reminder on task
    ↓ Reminder [isManual=true, deliveryPolicy=PUSH_IMMEDIATE]
    ↓ PushWorkerService → sprawdza isManual + user.notificationsEnabled
    ↓ Expo push
```

---

## 4. Nowe pola / encje / migracje

### Nowe pola encji

| Encja               | Nowe pole        | Typ               | Default                      |
| ------------------- | ---------------- | ----------------- | ---------------------------- |
| `Reminder`          | `isManual`       | `boolean`         | `false`                      |
| `Reminder`          | `deliveryPolicy` | `enum`            | `PLAN_ONLY`                  |
| `Reminder`          | `userIntentKey`  | `string nullable` | `null`                       |
| `ActionTemplate`    | `deliveryPolicy` | `enum nullable`   | `null` (fallback do systemu) |
| `NotificationBatch` | `userIntentKey`  | `string nullable` | `null`                       |

### Nowy enum

```typescript
enum DeliveryPolicy {
  PUSH_IMMEDIATE = 'PUSH_IMMEDIATE',
  PUSH_DIGEST = 'PUSH_DIGEST',
  CENTER_ONLY = 'CENTER_ONLY',
  PLAN_ONLY = 'PLAN_ONLY',
  NO_NOTIFICATION = 'NO_NOTIFICATION',
}
```

### Migracja danych

```sql
-- Nowe kolumny w reminder
ALTER TABLE reminders
  ADD COLUMN is_manual boolean NOT NULL DEFAULT false,
  ADD COLUMN delivery_policy varchar(30) NOT NULL DEFAULT 'PLAN_ONLY',
  ADD COLUMN user_intent_key varchar(200) NULL;

-- Istniejące pending reminders dla auto-generated tasks → PLAN_ONLY
UPDATE reminders r
SET delivery_policy = 'PLAN_ONLY'
WHERE r.status = 'PENDING'
  AND r.action_task_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM action_tasks t
    WHERE t.id = r.action_task_id
      AND t.source != 'MANUAL'
  );

-- Istniejące reminders dla manual tasks → PUSH_IMMEDIATE
UPDATE reminders r
SET is_manual = true,
    delivery_policy = 'PUSH_IMMEDIATE'
WHERE r.action_task_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM action_tasks t
    WHERE t.id = r.action_task_id
      AND t.source = 'MANUAL'
  );

-- Disease/pest reminders → PUSH_IMMEDIATE (zawsze były ważne)
UPDATE reminders r
SET is_manual = true,
    delivery_policy = 'PUSH_IMMEDIATE'
WHERE r.action_task_id IS NULL;

-- ActionTemplate: nowa kolumna
ALTER TABLE action_templates
  ADD COLUMN delivery_policy varchar(30) NULL;

-- Notification batches: userIntentKey
ALTER TABLE notification_batches
  ADD COLUMN user_intent_key varchar(200) NULL;
```

### Nowy index

```sql
CREATE INDEX notification_batches_user_intent_key_idx
  ON notification_batches (user_id, user_intent_key, status)
  WHERE user_intent_key IS NOT NULL;
```

---

## 5. Klasyfikacja typów powiadomień

### Pipeline A (NotificationEventOutbox)

| NotificationType                            | DeliveryPolicy                  | Priorytet     | Uzasadnienie                  |
| ------------------------------------------- | ------------------------------- | ------------- | ----------------------------- |
| `WEATHER_ALERTS_SUMMARY` — FROST/HARD_FROST | `PUSH_IMMEDIATE`                | CRITICAL/HIGH | Reakcja potrzebna dziś        |
| `WEATHER_ALERTS_SUMMARY` — HEAVY_RAIN/WIND  | `PUSH_IMMEDIATE`                | HIGH          | Reakcja potrzebna dziś        |
| `WEATHER_ALERTS_SUMMARY` — DROUGHT/WATERING | `PUSH_DIGEST`                   | NORMAL        | Nie krytyczne, 1/dzień        |
| `WEATHER_STATUS_CHANGED`                    | `CENTER_ONLY`                   | LOW           | Info, nie wymaga akcji        |
| `GARDEN_RISK_CHANGED` — HIGH/CRITICAL       | `PUSH_IMMEDIATE`                | HIGH          | Pilne                         |
| `GARDEN_RISK_CHANGED` — NORMAL              | `PUSH_DIGEST`                   | NORMAL        | Info, może poczekać           |
| `GARDEN_RISK_CHANGED` — LOW                 | `CENTER_ONLY`                   | LOW           | Tylko Notification Center     |
| `TASKS_GENERATED` — weather source          | `PUSH_DIGEST`                   | HIGH          | Wchodzi do Plan na dziś       |
| `TASKS_GENERATED` — automation source       | `PLAN_ONLY`                     | NORMAL        | Tylko Plan, nie push          |
| `LIFECYCLE_SUGGESTION` — harvest/transplant | `PUSH_DIGEST`                   | NORMAL        | Zbiorczy 1/dzień              |
| `LIFECYCLE_SUGGESTION` — inne               | `CENTER_ONLY`                   | LOW           | Tylko Notification Center     |
| `DAILY_TASKS_SUMMARY`                       | `PUSH_DIGEST`                   | NORMAL        | Zbiorczy o `notificationHour` |
| `ARTICLE_RECOMMENDED`                       | `CENTER_ONLY`                   | LOW           | Nie wymaga pushu              |
| `WEEKLY_DIGEST`                             | `CENTER_ONLY` lub `PUSH_DIGEST` | LOW           | Zgodnie z preferencją         |

### Pipeline B (PushWorkerService, po refactorze)

| ReminderType                         | Nowy stan                             | Uzasadnienie                               |
| ------------------------------------ | ------------------------------------- | ------------------------------------------ |
| `ACTION_TASK_DUE` + `isManual=true`  | Zostaje w Pipeline B                  | Użytkownik świadomie ustawił przypomnienie |
| `ACTION_TASK_DUE` + `isManual=false` | Usunięty z Pipeline B                 | Auto-task → trafia przez Pipeline A        |
| `DISEASE_TREATMENT`                  | Zostaje w Pipeline B, `isManual=true` | Pilna reakcja medyczna                     |
| `PEST_CHECK`                         | Zostaje w Pipeline B, `isManual=true` | Pilna reakcja                              |

---

## 6. Jak zmienią się reminders

**Przed:**

```
Każdy ActionTask (auto + manual) → Reminder → PushWorkerService → push
```

**Po:**

```
Auto ActionTask → Reminder [isManual=false, deliveryPolicy=PLAN_ONLY]
  → PushWorkerService pomija (filter: WHERE is_manual=true)
  → Pipeline A dostarcza push przez TASKS_GENERATED / DAILY_TASKS_SUMMARY

Manual ActionTask → Reminder [isManual=true, deliveryPolicy=PUSH_IMMEDIATE]
  → PushWorkerService wysyła push (jak dziś)

Disease/Pest Reminder → [isManual=true, deliveryPolicy=PUSH_IMMEDIATE]
  → PushWorkerService wysyła push (jak dziś)
```

Tabela `reminders` nie znika. Rekordy dla auto-tasków nadal istnieją jako historia/audyt i dla ewentualnej przyszłej funkcji "przypomnij mi o tym zadaniu". Zmiana polega tylko na tym, że `PushWorkerService` filtruje po `isManual`.

Migracja istniejących PENDING auto-task reminderów: ustawić `is_manual=false, delivery_policy=PLAN_ONLY`. `PushWorkerService` je pominie. Nie ma ryzyka utraty danych.

---

## 7. Jak zmieni się WeatherTaskPlannerService

| Zmiana                                        | Szczegół                                                                |
| --------------------------------------------- | ----------------------------------------------------------------------- |
| `WATERING_NEEDED` — usunąć z `isBedLevelCode` | 1 task per user, nie per bed                                            |
| Nie tworzyć `Reminder` dla weather tasks      | Usunąć wywołanie `upsertReminderForTask()` dla `source=WEATHER_WARNING` |
| Weather tasks → Pipeline A tylko              | `publishTaskEvents()` z HIGH priority → PUSH_DIGEST                     |
| `userIntentKey` na weather TASKS_GENERATED    | `WATERING_TODAY:{userId}:{date}`                                        |

Taski per bed dla wizualizacji w Planie na dziś mogą pozostać (UI pokazuje konkretne grządki). Zmiana dotyczy tylko warstwy powiadomień: push idzie 1 per user, nie 1 per task.

---

## 8. Jak zmieni się LifecycleSuggestionService

```typescript
// Przed: 1 event per planting
dedupeKey = `${userId}:LIFECYCLE_SUGGESTION:${plantingId}:${suggestedAction}`;

// Po: 1 event per user per day per action
dedupeKey = `${userId}:LIFECYCLE_SUGGESTION:${suggestedAction}:${today}`;

// Payload agreguje wszystkie plantingIds
payload = {
  suggestedAction,
  plantingIds: [id1, id2, id3], // wszystkie
  primaryPlantingId: id1,
  count: 3,
  bedId: null,
};
```

`buildCandidate()` w aggregatorze dla `LIFECYCLE_SUGGESTION` musi łączyć payload ze wszystkich eventów w tej samej grupie (po `dedupeKey`).

Copy builder: `buildLifecycleSuggestionCopy(action, count=3)` → „3 uprawy gotowe do zbioru".

Klasyfikacja per action:

- `harvest` → `PUSH_DIGEST`
- `transplant` → `PUSH_DIGEST`
- inne → `CENTER_ONLY`

---

## 9. Jakie testy zostaną dodane

### A) 3 grządki wymagają podlewania

- `WeatherTaskPlannerService.spec.ts` — dla `WATERING_NEEDED_TODAY` z 3 beds: `expect(tasks.length).toBe(1)` (user-level task)
- `NotificationEventService.spec.ts` — `publishTaskEvents()` dla 1 watering task → 1 TASKS_GENERATED event
- `NotificationAggregatorService.spec.ts` — 3 TASKS_GENERATED events z tym samym `userIntentKey` → 1 batch

### B) 3 uprawy gotowe do zbioru

- `LifecycleSuggestionService.spec.ts` — 3 plantings at harvest window → 1 event `LIFECYCLE_SUGGESTION` (nie 3)
- Payload zawiera `plantingIds.length === 3`
- `buildLifecycleSuggestionCopy('harvest', 3)` → tytuł zawiera „3"

### C) 4 recompute pogody w ciągu dnia

- `NotificationEventService.spec.ts` — 4x `publishWeatherEvents()` z tym samym reason → 1 event w outboxie (drugi przechodzi dedupe)
- dedupeKey nie zawiera `validFrom`/`validTo`

### D) monitoring wzrostu → PLAN_ONLY, bez pusha

- `ActionAutomationService` tworzy monitoring task → Reminder z `isManual=false, deliveryPolicy=PLAN_ONLY`
- `PushWorkerService` → claim query z `WHERE is_manual=true` → reminder nie jest claimowany
- Brak push do Expo

### E) manual reminder użytkownika

- User tworzy task przez `ActionTasksService.createForBed()` → Reminder z `isManual=true`
- `PushWorkerService` claimuje i wysyła push
- Brak duplikatu w Pipeline A (TASKS_GENERATED event ma `deliveryPolicy=PUSH_IMMEDIATE` tylko dla manual)

### F) reminders pipeline izolacja

- `PushWorkerService.spec.ts` — mock claims tylko remindery z `is_manual=true`
- Auto-generated reminder (VEGETABLE_RULE source) → NOT in claimed batch

---

## 10. Ryzyka

| Ryzyko                                                                                                                                                         | Poziom | Mitygacja                                                                                 |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------- |
| Istniejące manual reminders nie mają `isManual` flagi — migracją ustawiamy false/true, ale logika `source=MANUAL` musi być dokładna                            | WYSOKI | Sprawdzić że `ActionTaskSource.MANUAL` jest konsekwentnie używany; test przed/po migracji |
| Disease/pest reminders nie mają `action_task_id` → migracja ustawia `is_manual=true` prawidłowo                                                                | ŚREDNI | SQL WHERE action_task_id IS NULL → PUSH_IMMEDIATE                                         |
| `collectAutomationTaskEvents()` (cron \*/5) może wysłać event dla starego auto-taska, który przed refactorem dostał reminder — podwójny mechanizm przez chwilę | ŚREDNI | Okno migracyjne: wyłączyć `PushWorkerService` na czas deployment, poczekać na cron cycle  |
| Jeśli użytkownik miał pending PLAN_ONLY reminder → nie dostanie pusha → może oczekiwać wg starego zachowania                                                   | NISKI  | Nie zmienić zachowania dla SENT reminderów. Zmiana dotyczy tylko PENDING                  |
| `userIntentKey` w aggregatorze może blokować ważne alerty jeśli zbyt szeroki                                                                                   | NISKI  | Dokładna granularność: per reason, per date, nie per tydzień                              |
| Frontend oczekuje `type=TASKS_GENERATED` z danymi per task — po agregacji payload może mieć inną strukturę                                                     | NISKI  | Zachować backward compat w payload, dodać nowe pola addytywnie                            |

---

## 11. Zmiany w Mobile Frontend

**Wymagane:**

1. **Obsługa `count` w LIFECYCLE_SUGGESTION payload** — present view powinien obsłużyć `plantingIds.length > 1`, np. pokazać listę upraw zamiast jednej.
2. **Obsługa nowego push data `deliveryPolicy`** — frontend może chcieć wiedzieć czy push to `PUSH_DIGEST` (otwiera Planner) vs `PUSH_IMMEDIATE` (otwiera konkretny alert).
3. **`routeTarget = PLANNER` dla TASKS_GENERATED** — upewnić się że klik w push przenosi do Planu na dziś, nie do konkretnego taska (dla digest pushów).

**Niewymagane (backward compat):**

- Istniejące `type`, `routeTarget`, `dedupeKey` w `PushNotificationPayload` nie zmieniają się.
- Reminder pushy z Pipeline B zachowują ten sam format (`title: "Warzywnik"`, `body: "Czas na: X"`).

---

## 12. Zmiany w CMS Frontend

**Wymagane:**

1. **Nowe pole `deliveryPolicy` na `ActionTemplate`** — dodać w edytorze szablonu (dropdown: PUSH_IMMEDIATE / PUSH_DIGEST / CENTER_ONLY / PLAN_ONLY / NO_NOTIFICATION).
2. **Domyślna wartość** dla istniejących szablonów: `PLAN_ONLY` (najbezpieczniejsza opcja, żeby nie spamować).

**Niewymagane:**

- Warning configs nie potrzebują zmian w CMS — polityka dla alertów pogodowych jest hardcoded w systemie (frost = PUSH_IMMEDIATE itd.).

---

## 13. Zmiany w seed data / CMS config

| Template / config                                                            | Zmiana                 | Wartość       |
| ---------------------------------------------------------------------------- | ---------------------- | ------------- |
| `watering` template                                                          | Dodać `deliveryPolicy` | `PUSH_DIGEST` |
| `monitoring` templates (×7)                                                  | Dodać `deliveryPolicy` | `PLAN_ONLY`   |
| `harvest` templates (×3)                                                     | Dodać `deliveryPolicy` | `PLAN_ONLY`   |
| `fertilizing`, `staking`, `transplanting`, `thinning`, `hardening`, `sowing` | Dodać `deliveryPolicy` | `PLAN_ONLY`   |
| `irrigation_setup` (SUGGESTION)                                              | Dodać `deliveryPolicy` | `CENTER_ONLY` |
| `soil_testing` (SEASONAL)                                                    | Dodać `deliveryPolicy` | `CENTER_ONLY` |

Nie jest potrzebna zmiana `aggregationScope` ani `generationMode` — to produkt oryginalnie poprawny. Problem leży w warstwie delivery, nie generacji tasków.

---

## Podsumowanie kolejności prac

```
Faza 1 — Izolacja (najwyższy priorytet, zatrzymuje spam)
  1. Migracja: dodać is_manual, delivery_policy do reminders
  2. PushWorkerService: filtr WHERE is_manual = true
  3. upsertReminderForTask(): ustawiać isManual=false, deliveryPolicy=PLAN_ONLY
  4. Weather dedupeKey: zastąpić validFrom/validTo datą
  5. LifecycleSuggestion: dedupeKey per user/day

Faza 2 — Agregacja i userIntentKey
  6. WeatherTaskPlannerService: WATERING_NEEDED → 1 task per user
  7. NotificationAggregatorService: userIntentKey dedup
  8. NotificationPolicyService: deliveryPolicy, daily limits
  9. NotificationCopyService: nowe copy buildery (plural)

Faza 3 — ActionTemplate.deliveryPolicy (CMS)
  10. Migracja: kolumna delivery_policy na action_templates
  11. Seed data update
  12. CMS frontend: nowe pole

Faza 4 — Testy
  13. Testy jednostkowe / integracyjne (scenariusze A–F)
```
