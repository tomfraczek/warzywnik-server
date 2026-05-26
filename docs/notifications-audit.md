# 🔍 Audyt systemu powiadomień — Warzywnik Server

> Data audytu: 26 maja 2026  
> Branch: `staging`

---

## 1. Krótkie podsumowanie obecnego działania

System powiadomień działa przez **cztery warstwy**:

1. **Źródła** — różne serwisy piszą eventy do tabeli `notification_event_outbox` przez `NotificationEventService`
2. **Aggregator** — cron co minutę (`notification-aggregate-outbox`) zbiera PENDING eventy, buduje `NotificationBatch` i ocenia przez `NotificationPolicyService`
3. **Delivery** — cron co minutę (`notification-push-delivery`) bierze PENDING batche i wysyła push przez Expo API
4. **Reminders** — **równoległy, niezależny pipeline** (`push-reminders`) wysyłający pushe bezpośrednio przez Expo, z pominięciem całej reszty

**Kluczowy problem:** przy jednym recompute pogodowym mogą powstać jednocześnie 3 eventy pogodowe (`WEATHER_STATUS_CHANGED` + `GARDEN_RISK_CHANGED` + `WEATHER_ALERTS_SUMMARY`), a w tej samej minucie cron automation task kolekcjonuje taski z ostatnich 15 minut. Aggregator przetwarza je wszystkie w tej samej rundzie co minutę, tworząc kilka batchy jednocześnie, a delivery wysyła je w tej samej rundzie minutowej.

---

## 2. Tabela źródeł powiadomień

| Serwis / plik                                          | Trigger                                                         | Typ uruchomienia                                              | Generowane typy                                                                 | Push?               | NC? |
| ------------------------------------------------------ | --------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------- | --- |
| `WeatherEventsHandler`                                 | `WEATHER_SNAPSHOT_UPDATED` event (po refreshu snapshotu pogody) | In-process event (queue per user)                             | `WEATHER_STATUS_CHANGED`, `WEATHER_ALERTS_SUMMARY`, `GARDEN_RISK_CHANGED`       | ✅                  | ✅  |
| `WeatherRefreshScheduler`                              | Cron `0,30 * * * *`                                             | Cron (co 30 min)                                              | Pośrednio uruchamia WeatherEventsHandler → wszystkie typy pogodowe              | ✅                  | ✅  |
| `NotificationEventService.collectAutomationTaskEvents` | Cron `*/5 * * * *`                                              | Cron (co 5 min)                                               | `TASKS_GENERATED` (tylko `VEGETABLE_RULE`)                                      | ✅                  | ✅  |
| `DailySummaryService.runDailySummary`                  | Cron `0 * * * *`                                                | Cron (co godzinę, filtrowany po `notificationHour`)           | `DAILY_TASKS_SUMMARY`                                                           | ✅                  | ✅  |
| `WeeklyDigestService.runWeeklyDigest`                  | Cron `0 * * * *`                                                | Cron (co godzinę, filtr na poniedziałek + `notificationHour`) | `WEEKLY_DIGEST`                                                                 | ✅                  | ✅  |
| `LifecycleSuggestionService.generateSuggestions`       | Cron `15 */3 * * *`                                             | Cron (co 3 godziny, offset 15 min)                            | `LIFECYCLE_SUGGESTION`                                                          | ✅                  | ✅  |
| `ArticlesService`                                      | Publish artykułu (request admina)                               | Request użytkownika / CMS action                              | `ARTICLE_RECOMMENDED`                                                           | ✅                  | ✅  |
| `PushWorkerService.handleCron`                         | Cron `*/1 * * * *`                                              | Cron (co minutę), flaga `PUSH_WORKER_ENABLED`                 | Przypomnienia (`DISEASE`, `PEST`, `ACTION`)                                     | ✅ **bezpośrednio** | ❌  |
| `WeatherRecomputeService.recomputeTasks`               | Trigger z `WeatherEventsHandler`                                | Event-driven                                                  | Pośrednio: generuje `ActionTask` → zbierany przez `collectAutomationTaskEvents` | ✅                  | ✅  |

---

## 3. Tabela cronów / jobów / schedulerów

| Nazwa crona                           | Plik                                 | Wyrażenie      | Godziny uruchomienia                              | Timezone          | Co robi                                                                                                                                 | Wiele eventów naraz?                                   | Może kolidować z?                                                                                 |
| ------------------------------------- | ------------------------------------ | -------------- | ------------------------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `weather-refresh`                     | `weather-refresh.scheduler.ts`       | `0,30 * * * *` | :00 i :30 każdej godziny                          | UTC (systemowy)   | Odświeża snapshoty pogody dla wszystkich aktywnych użytkowników; pośrednio wywołuje recompute warningów i tasków → eventy notyfikacyjne | ✅ TAK — dla każdego usera z osobna                    | `notification-daily-summary`, `notification-weekly-digest`, `notification-automation-task-events` |
| `notification-automation-task-events` | `notification-event.service.ts`      | `*/5 * * * *`  | Co 5 min (:00, :05, :10…)                         | UTC               | Zbiera taski z `VEGETABLE_RULE` z ostatnich 15 min i tworzy eventy `TASKS_GENERATED`                                                    | ✅ TAK — jeden event per task per user                 | `weather-refresh` (:00 i :30 zbiegają się z :00, :05, :10…)                                       |
| `notification-aggregate-outbox`       | `notification-aggregator.service.ts` | `*/1 * * * *`  | Co minutę                                         | UTC               | Przetwarza PENDING eventy z outboxa → tworzy `NotificationBatch`                                                                        | ✅ TAK — może przetworzyć wiele typów w jednej rundzie | `notification-push-delivery` (ta sama minuta!)                                                    |
| `notification-push-delivery`          | `push-delivery.service.ts`           | `*/1 * * * *`  | Co minutę                                         | UTC               | Wysyła PENDING batche przez Expo API                                                                                                    | ✅ TAK — do 100 batchy na rundę                        | `notification-aggregate-outbox` (ta sama minuta!)                                                 |
| `notification-push-receipts`          | `push-delivery.service.ts`           | `*/10 * * * *` | Co 10 min                                         | UTC               | Sprawdza statusy wysyłek w Expo                                                                                                         | Nie                                                    | —                                                                                                 |
| `notification-daily-summary`          | `daily-summary.service.ts`           | `0 * * * *`    | Co godzinę (filtr per user po `notificationHour`) | Per-user timezone | Wysyła DAILY_TASKS_SUMMARY                                                                                                              | ✅ TAK — jeden event per user                          | `weather-refresh` (:00), `notification-weekly-digest` (:00)                                       |
| `notification-weekly-digest`          | `weekly-digest.service.ts`           | `0 * * * *`    | Co godzinę (filtr per user, tylko poniedziałek)   | Per-user timezone | Wysyła WEEKLY_DIGEST                                                                                                                    | ✅ TAK                                                 | `notification-daily-summary` (ta sama cron!)                                                      |
| `notification-lifecycle-suggestions`  | `lifecycle-suggestion.service.ts`    | `15 */3 * * *` | :15 co 3h (00:15, 03:15, 06:15, 09:15…)           | UTC               | Generuje LIFECYCLE_SUGGESTION dla upraw z triggerami lifecycle                                                                          | ✅ TAK — jeden event per planting                      | —                                                                                                 |
| `push-reminders`                      | `reminders/push-worker.service.ts`   | `*/1 * * * *`  | Co minutę                                         | UTC               | Wysyła przypomnienia (choroby, szkodniki, taski) BEZPOŚREDNIO przez Expo, poza głównym pipeline                                         | ✅ TAK                                                 | `notification-push-delivery` (ta sama minuta!)                                                    |

### ⚠️ Krytyczne koincydencje godzinowe

- **:00 każdej godziny**: `weather-refresh` + `notification-daily-summary` + `notification-weekly-digest` + `notification-automation-task-events` — wszystkie razem mogą generować kilka typów eventów w tej samej minucie
- **Co minuta**: `notification-aggregate-outbox` + `notification-push-delivery` + `push-reminders` — aggregator tworzy batche i delivery wysyła je w tej samej lub sąsiedniej rundzie minutowej

---

## 4. Tabela typów powiadomień

| Typ                             | Tytuł (PL)                | Źródło                                               | Priorytet                             | Push?                      | NC? | Dedupe window                                          | Może być agregowany             | Docelowy ekran                               |
| ------------------------------- | ------------------------- | ---------------------------------------------------- | ------------------------------------- | -------------------------- | --- | ------------------------------------------------------ | ------------------------------- | -------------------------------------------- |
| `TASKS_GENERATED`               | „Nowe zadania w ogrodzie" | `collectAutomationTaskEvents` (cron)                 | NORMAL / HIGH (jeśli WEATHER_WARNING) | ✅ (zależy od intensity)   | ✅  | 2h (klucz: `userId:type:routeTarget:targetId:godzina`) | ✅ TAK — wiele tasków → 1 batch | `PLANNER` / `BED_DETAIL` / `PLANTING_DETAIL` |
| `DAILY_TASKS_SUMMARY`           | „Plan na dziś"            | `DailySummaryService` (cron godzinowy)               | NORMAL                                | ✅                         | ✅  | 24h                                                    | ✅                              | `PLANNER`                                    |
| `WEATHER_STATUS_CHANGED`        | „Zmiana pogody"           | `WeatherRecomputeService` via `WeatherEventsHandler` | LOW/NORMAL/HIGH/CRITICAL              | ✅                         | ✅  | 4h                                                     | ❌ (last event wins)            | `WEATHER`                                    |
| `GARDEN_RISK_CHANGED`           | „Ryzyko przymrozku" itp.  | `WeatherRecomputeService` via `WeatherEventsHandler` | NORMAL/HIGH/CRITICAL                  | ✅                         | ✅  | 12h                                                    | ❌                              | `GARDEN_RISK`                                |
| `WEATHER_ALERTS_SUMMARY`        | „Alerty pogodowe"         | `WeatherRecomputeService` via `WeatherEventsHandler` | HIGH                                  | ✅                         | ✅  | 8h                                                     | ✅ (po warningIds)              | `WEATHER_ALERTS`                             |
| `ARTICLE_RECOMMENDED`           | „Nowy poradnik"           | `ArticlesService` (request/publish)                  | NORMAL                                | ✅ (BALANCED+)             | ✅  | 18h                                                    | ✅                              | `ARTICLE_DETAIL` / `ARTICLES_LIST`           |
| `LIFECYCLE_SUGGESTION`          | „Sugestia dla uprawy"     | `LifecycleSuggestionService` (cron co 3h)            | NORMAL / HIGH                         | ✅ (BALANCED+)             | ✅  | 14 dni                                                 | ❌                              | `PLANTING_DETAIL` / `BED_DETAIL`             |
| `WEEKLY_DIGEST`                 | „Tygodniowe podsumowanie" | `WeeklyDigestService` (cron godzinowy, pon)          | NORMAL                                | ✅ (BALANCED+)             | ✅  | 8 dni                                                  | ❌                              | `NOTIFICATION_CENTER`                        |
| Reminders (DISEASE/PEST/ACTION) | Tytuł z szablonu reminder | `PushWorkerService` (cron co minutę)                 | —                                     | ✅ **bezpośrednio** (Expo) | ❌  | Brak (tylko `scheduled_at` + status)                   | ❌                              | `PLANTING_DETAIL` itp.                       |

---

## 5. Pipeline powiadomień — krok po kroku

```
[ŹRÓDŁO ZDARZENIA]
       │
       ▼
NotificationEventService.publishEvent()
  • Sprawdza dedupe w outboxie (PENDING|PROCESSED + dedupeKey)
  • Jeśli nie istnieje → INSERT do notification_event_outbox (status=PENDING)
       │
       ▼ (co minutę)
NotificationAggregatorService.processPendingEvents()  ← Cron */1 * * * *
  • SELECT * FROM notification_event_outbox WHERE status=PENDING AND availableAt<=now LIMIT 500
  • Grupuje po (userId, type)
  • Sortuje grupy: WEATHER_ALERTS_SUMMARY(0) > GARDEN_RISK_CHANGED(1) > WEATHER_STATUS_CHANGED(2) > rest(10)
  • Dla każdej grupy: buildCandidate() → BatchCandidate
  • NotificationPolicyService.evaluate():
      → user.notificationsEnabled? NIE → SKIP
      → isTypeEnabled(type, preference)? NIE → SKIP
      → notification_dedupe (user, type, dedupeKey, expiresAt>now)? istnieje → SKIP
      → suppressPushWhenDedupedBy? sprawdza czy WEATHER_ALERTS_SUMMARY dedupował → CENTER_ONLY
      → evaluateIntensity(intensity, priority):
          IMPORTANT_ONLY: push tylko dla HIGH/CRITICAL → inaczej CENTER_ONLY
          BALANCED: push dla NORMAL/HIGH/CRITICAL → LOW = CENTER_ONLY
          ALL: zawsze PUSH
  • Decyzja PUSH → INSERT notification_batches (status=PENDING, sendAfter=now())
  • Decyzja CENTER_ONLY → INSERT notification_batches (status=SKIPPED) + createNotification (NC)
  • Decyzja SKIP → event.status=SKIPPED
  • INSERT notification_dedupe (on conflict do nothing)
       │
       ▼ (co minutę, ta sama minuta lub następna)
PushDeliveryService.deliverPendingBatches()  ← Cron */1 * * * *
  • SELECT * FROM notification_batches WHERE status=PENDING AND sendAfter<=now LIMIT 100 ORDER BY createdAt ASC
  • Dla każdego batcha:
      → ensureNotification() → INSERT/find notification (Notification Center)
      → SELECT user_devices WHERE user=X AND isEnabled=true
      → Buduje wiadomości Expo
      → POST https://exp.host/--/api/v2/push/send
      → INSERT notification_delivery (status=SENT|FAILED)
      → batch.status = SENT|FAILED
       │
       ▼
[PUSH DOCIERA DO URZĄDZENIA]

--- RÓWNOLEGŁY PIPELINE ---

PushWorkerService.handleCron()  ← Cron */1 * * * *
  • SELECT reminders WHERE scheduled_at<=now AND status=PENDING (row-level lock)
  • Dla każdego: buduje Expo message
  • POST https://exp.host/--/api/v2/push/send
  • UPDATE reminder.status=SENT
[PUSH DOCIERA DO URZĄDZENIA — BEZ NC, BEZ DEDUPE]
```

### Kluczowe cechy pipeline

- **Brak batching window** — `sendAfter = new Date()` (natychmiast)
- **Brak cooldownu per user/type** — jedynym mechanizmem jest dedupe
- **Brak globalnego limitu** liczby pushy na użytkownika dziennie
- **Aggregator i Delivery działają co minutę** — w praktyce opóźnienie push = 0–2 minuty od zdarzenia
- **Reminder pipeline jest niezależny** — całkowicie poza logiką dedupe/preferencji

---

## 6. Dedupe i agregacja

### Mechanizmy deduplikacji

**Poziom 1 — outbox (`publishEvent`)**

- Plik: `notification-event.service.ts`
- Sprawdza: `notification_event_outbox WHERE user=X AND type=Y AND dedupeKey=Z AND status IN (PENDING, PROCESSED)`
- Efekt: blokuje duplikaty jeszcze przed zapisem do outboxa
- Okno: **brak TTL** — działa dopóki rekord istnieje (nie ma czyszczenia)
- ⚠️ Nie chroni przed tym, że event z tym samym typem ale innym `dedupeKey` przejdzie

**Poziom 2 — policy (`NotificationPolicyService`)**

- Plik: `notification-policy.service.ts`
- Sprawdza: `notification_dedupe WHERE user=X AND type=Y AND dedupeKey=Z AND expiresAt>now`
- Klucze dedupe per typ:
  - `TASKS_GENERATED`: `userId:TASKS_GENERATED:taskId:godzina` (per task per godzina)
  - `DAILY_TASKS_SUMMARY`: `userId:DAILY_TASKS_SUMMARY:YYYY-MM-DD`
  - `WEATHER_STATUS_CHANGED`: `userId:WEATHER_STATUS_CHANGED:reason:validFrom:validTo` → 4h
  - `GARDEN_RISK_CHANGED`: `userId:GARDEN_RISK_CHANGED:reason:validFrom:validTo` → 12h
  - `WEATHER_ALERTS_SUMMARY`: `userId:WEATHER_ALERTS_SUMMARY:windowStart:windowEnd:alertSignature` → 8h
  - `ARTICLE_RECOMMENDED`: `userId:ARTICLE_RECOMMENDED:articleId` → 18h
  - `LIFECYCLE_SUGGESTION`: `userId:LIFECYCLE_SUGGESTION:plantingId:suggestedAction` → 14 dni
  - `WEEKLY_DIGEST`: `userId:WEEKLY_DIGEST:YYYY-MM-DD` → 8 dni

**Mechanizm suppression (cross-type)**

- `WEATHER_STATUS_CHANGED` i `GARDEN_RISK_CHANGED` mogą być zdegradowane do `CENTER_ONLY` jeśli ten sam `weatherAlertCoverageKey` już istnieje w `notification_dedupe` jako `WEATHER_ALERTS_SUMMARY`
- Warunek: `weatherAlertCoverageKey` musi być ustawiony w payload eventu + `WEATHER_ALERTS_SUMMARY` musi być już zdedupowany

**Mechanizm agregacji w aggregator**

- `TASKS_GENERATED`: eventy z wielu tasków tego samego usera łączone w jeden batch (array taskIds) — **ale każdy task ma osobny dedupeKey w outboxie**, więc mogą trafiać do outboxa jako osobne eventy
- `WEATHER_ALERTS_SUMMARY`: łączy warningIds z wielu eventów
- `DAILY_TASKS_SUMMARY`: deduplicates taskIds

### ⚠️ Luki w dedupe

1. **TASKS_GENERATED** — każdy task ma osobny `dedupeKey` w outboxie (`taskId + godzina`), więc dla N tasków powstanie N eventów. Aggregator łączy je per `(userId, type)` w jedną minutę, ale jeśli trafią do outboxa w różnych minutach, mogą dać wiele batchy.
2. **Lifecycle suggestions** — cron co 3h przechodzi przez WSZYSTKIE aktywne uprawy. Przy wielu uprawach w stanie `SEEDLING_READY_FOR_TRANSPLANT` lub ze zbliżającym się `harvestWindowStart` generuje wiele eventów jednocześnie. Każda ma osobny `dedupeKey` (per plantingId), więc każda da osobny batch.
3. **Reminders** — w ogóle poza systemem dedupe.

---

## 7. Preferencje użytkownika

### Struktura preferencji

| Pole                          | Typ        | Default  | Kontroluje typ                                          |
| ----------------------------- | ---------- | -------- | ------------------------------------------------------- |
| `user.notificationsEnabled`   | boolean    | true     | Wszystkie (globalny kill switch)                        |
| `notificationHour`            | int (0–23) | 9        | Godzina wysyłki `DAILY_TASKS_SUMMARY` i `WEEKLY_DIGEST` |
| `intensity`                   | enum       | BALANCED | Pośredni filtr dla priority                             |
| `tasksEnabled`                | boolean    | true     | `TASKS_GENERATED`                                       |
| `dailySummaryEnabled`         | boolean    | true     | `DAILY_TASKS_SUMMARY`                                   |
| `weatherStatusEnabled`        | boolean    | true     | `WEATHER_STATUS_CHANGED`                                |
| `gardenRiskEnabled`           | boolean    | true     | `GARDEN_RISK_CHANGED`                                   |
| `weatherAlertsEnabled`        | boolean    | true     | `WEATHER_ALERTS_SUMMARY`                                |
| `recommendedArticlesEnabled`  | boolean    | true     | `ARTICLE_RECOMMENDED`                                   |
| `lifecycleSuggestionsEnabled` | boolean    | true     | `LIFECYCLE_SUGGESTION`                                  |
| `weeklyDigestEnabled`         | boolean    | true     | `WEEKLY_DIGEST`                                         |

### Grupy UI

| Grupa                      | Kontroluje                                                             |
| -------------------------- | ---------------------------------------------------------------------- |
| `tasksAndRemindersEnabled` | `tasksEnabled` + `dailySummaryEnabled` + `lifecycleSuggestionsEnabled` |
| `weatherAndRiskEnabled`    | `weatherStatusEnabled` + `gardenRiskEnabled` + `weatherAlertsEnabled`  |
| `articlesAndTipsEnabled`   | `recommendedArticlesEnabled`                                           |
| `summariesEnabled`         | `weeklyDigestEnabled`                                                  |

### Intensity gate

| Intensity            | CRITICAL | HIGH | NORMAL      | LOW         |
| -------------------- | -------- | ---- | ----------- | ----------- |
| `IMPORTANT_ONLY`     | PUSH     | PUSH | CENTER_ONLY | CENTER_ONLY |
| `BALANCED` (default) | PUSH     | PUSH | PUSH        | CENTER_ONLY |
| `ALL`                | PUSH     | PUSH | PUSH        | PUSH        |

### ⚠️ Uwagi

- Preferencje dotyczą **wyłącznie** systemu `notification_event_outbox`. **Reminders (`PushWorkerService`) są całkowicie poza systemem preferencji.**
- Nie ma osobnych ustawień dla push vs. in-app — decyzja wynika z `intensity` (`CENTER_ONLY` vs `PUSH`)
- Preferencje blokują **obie** warstwy lub tylko push (`CENTER_ONLY`), nigdy tylko NC

---

## 8. Instrukcja debugowania: 4 pushe naraz

### Krok 1 — znajdź dostawy z danego momentu

```sql
-- Znajdź wszystkie dostawy dla użytkownika w oknie czasowym
SELECT
  nd.id,
  nd.status,
  nd.sent_at,
  nb.type,
  nb.title,
  nb.dedupe_key,
  nb.created_at AS batch_created,
  nb.send_after,
  nb.sent_at AS batch_sent,
  n.created_at AS notification_created
FROM notification_delivery nd
JOIN notification_batches nb ON nd.batch_id = nb.id
JOIN notifications n ON nd.notification_id = n.id
WHERE nb.user_id = '<USER_ID>'
  AND nd.sent_at BETWEEN '<TIMESTAMP - 5min>' AND '<TIMESTAMP + 5min>'
ORDER BY nd.sent_at;
```

### Krok 2 — sprawdź skąd pochodziły eventy

```sql
-- Sprawdź outbox events powiązane z batchami
SELECT
  neo.id,
  neo.type,
  neo.source,
  neo.source_id,
  neo.dedupe_key,
  neo.priority,
  neo.status,
  neo.available_at,
  neo.created_at,
  neo.processed_at
FROM notification_event_outbox neo
WHERE neo.user_id = '<USER_ID>'
  AND neo.created_at BETWEEN '<TIMESTAMP - 10min>' AND '<TIMESTAMP + 2min>'
ORDER BY neo.created_at;
```

### Krok 3 — sprawdź czy dedupe zadziałał

```sql
-- Sprawdź rekordy dedupe dla użytkownika
SELECT *
FROM notification_dedupe
WHERE user_id = '<USER_ID>'
  AND created_at BETWEEN '<TIMESTAMP - 1h>' AND '<TIMESTAMP + 5min>'
ORDER BY created_at;
```

### Krok 4 — sprawdź czy taski/eventy powstały w tej samej sekundzie

```sql
-- Sprawdź action_tasks wygenerowane w tym samym oknie
SELECT id, title, source, status, due_at, dedupe_key, created_at
FROM action_tasks
WHERE user_id = '<USER_ID>'
  AND created_at BETWEEN '<TIMESTAMP - 15min>' AND '<TIMESTAMP + 2min>'
ORDER BY created_at;
```

### Krok 5 — sprawdź czy były zaległe (wcześniej wygenerowane, teraz wysłane)

```sql
-- Sprawdź czy batch miał sendAfter w przeszłości
SELECT id, type, dedupe_key, created_at, send_after, sent_at, status
FROM notification_batches
WHERE user_id = '<USER_ID>'
  AND sent_at BETWEEN '<TIMESTAMP - 5min>' AND '<TIMESTAMP + 5min>'
ORDER BY created_at;
-- Jeśli created_at << sent_at → eventy były zaległe i zostały wysłane paczką
```

### Krok 6 — sprawdź reminders (równoległy pipeline)

```sql
SELECT id, type, status, scheduled_at, sent_at, payload
FROM reminders
WHERE user_id = '<USER_ID>'
  AND sent_at BETWEEN '<TIMESTAMP - 5min>' AND '<TIMESTAMP + 5min>'
ORDER BY sent_at;
```

### Krok 7 — logi aplikacji

Szukać w logach:

```
push send attempt userId=<USER_ID>
notification batch created user=<USER_ID>
push send success userId=<USER_ID>
cron tick | push-reminders
```

Jeśli 4 logi `push send success` w tej samej sekundzie → batch delivery wysłał wszystkie naraz. Sprawdź czy to 4 różne `notificationType`.

### Scenariusze dla 4 pushy o tej samej godzinie

| Scenariusz                                 | Symptom w DB                                                                                                                                           |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Refresh pogody o :00 + daily summary o :00 | `WEATHER_STATUS_CHANGED` + `GARDEN_RISK_CHANGED` + `WEATHER_ALERTS_SUMMARY` + `DAILY_TASKS_SUMMARY` — wszystkie `batch.created_at` w tej samej minucie |
| Lifecycle + Automation tasks               | `LIFECYCLE_SUGGESTION` (N upraw) + `TASKS_GENERATED` — `outbox.source` = `lifecycle` i `action-automation`                                             |
| Zaległe batche (restart serwera)           | `batch.send_after` << `batch.sent_at`, wiele typów                                                                                                     |
| Reminder pipeline + main pipeline          | 1–2 pushe z `notification_delivery` + 1–2 z `reminder.sent_at` w tej samej sekundzie                                                                   |

---

## 9. Rekomendacje (bez implementacji)

### Czy obecny system może naturalnie wysyłać kilka pushy naraz?

**Tak, jest to zachowanie by design.** Nie ma żadnego mechanizmu, który by ograniczał liczbę pushy per użytkownik w jednostce czasu.

### Czy mamy jeden mechanizm decyzyjny, czy kilka niezależnych?

**Dwa niezależne:** główny pipeline (outbox → aggregator → delivery) i reminder pipeline (`PushWorkerService`). Reminder wysyła pusha bezpośrednio, pomijając preferencje, dedupe i NC.

### Czy push jest zbyt mocno powiązany z każdym eventem?

**Tak.** Każdy event → batch → push. Nie ma pojęcia „okna agregacji" — batch `sendAfter` zawsze = `now()`.

### Które typy powinny być natychmiastowymi pushami?

`WEATHER_ALERTS_SUMMARY` (HIGH), `GARDEN_RISK_CHANGED` (CRITICAL/HIGH, np. HARD_FROST). Czas reakcji ma znaczenie.

### Które powinny trafiać tylko do Notification Center?

`ARTICLE_RECOMMENDED`, `WEEKLY_DIGEST`, `LIFECYCLE_SUGGESTION` (NORMAL priority), `WEATHER_STATUS_CHANGED` (LOW/NORMAL).

### Które powinny być agregowane w „Plan na dziś"?

`TASKS_GENERATED` (wszystkie w danej godzinie → jeden push), `DAILY_TASKS_SUMMARY` już to robi.

### Czy potrzebujemy digestu porannego/wieczornego?

**Tak.** `DAILY_TASKS_SUMMARY` jest już podstawą. Należy rozważyć włączenie `LIFECYCLE_SUGGESTION` i `TASKS_GENERATED` (NORMAL) do tego samego okna.

### Czy potrzebujemy cooldownu per user/type?

**Tak, szczególnie dla pogody.** `WEATHER_STATUS_CHANGED` i `GARDEN_RISK_CHANGED` mogą się zmieniać przy każdym refreshie (co 30 min). Dedupe okno 4h i 12h częściowo to robi, ale problem leży w tym, że przy nowym `reason` lub nowym `validFrom` klucz jest inny → nowy push.

### Czy potrzebujemy batching window (5–10 min)?

**Tak.** Gdyby `sendAfter = now() + 5min`, aggregator mógłby zebrać wszystkie eventy z jednego recompute i wysłać 1–2 pushe zamiast 3+.

### Czy potrzebujemy limitu X pushy dziennie?

**Tak.** Np. max 3–4 pushe/dobę/user poza alertami krytycznymi.

---

## 10. Pliki do zmiany przy przebudowie polityki powiadomień

| Plik                                                           | Zakres zmian                                                                   |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `src/notifications/push-delivery.service.ts`                   | Dodanie batching window (`sendAfter = now() + N min`)                          |
| `src/notifications/notification-aggregator.service.ts`         | Limit pushy per user per tura, logika groupowania typów w jeden push           |
| `src/notifications/notification-policy.service.ts`             | Cooldown per user/type, globalny limit dzienny                                 |
| `src/notifications/notification-event.service.ts`              | Zmiana dedupeKey dla TASKS_GENERATED (per godzina per user zamiast per task)   |
| `src/notifications/daily-summary.service.ts`                   | Włączenie lifecycle suggestions do daily summary                               |
| `src/notifications/lifecycle-suggestion.service.ts`            | Konsolidacja sugestii dla wielu upraw w jeden event (zamiast N osobnych)       |
| `src/notifications/notification-preferences.service.ts`        | Osobne preferencje dla push vs. NC, dodanie `maxDailyPush`                     |
| `src/reminders/push-worker.service.ts`                         | Integracja z głównym pipeline (preferencje, dedupe, NC)                        |
| `src/notifications/entities/notification-preference.entity.ts` | Nowe pola: `maxDailyPush`, `pushOnlyForCritical`, oddzielne flagi push vs. NC  |
| `src/notifications/entities/notification-batch.entity.ts`      | Brak zmian strukturalnych, ale `sendAfter` zacznie być ustawiany na przyszłość |
| `src/common/enums/notification.enums.ts`                       | Nowe typy jeśli dodamy digest/konsolidację                                     |
