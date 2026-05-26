# Weryfikacja Fazy 1 — Raport (2026-05-26)

## TL;DR

| #   | Pytanie                                                           | Wynik                                     | Metoda weryfikacji         |
| --- | ----------------------------------------------------------------- | ----------------------------------------- | -------------------------- |
| 1   | ACTION_TASK_DUE nie wysyła pushy przez PushWorkerService?         | ✅ Tak — guard w `processReminder`        | statyczna analiza kodu     |
| 2   | Stare pending ACTION_TASK_DUE nie wygenerują pushy?               | ✅ Bezpieczne — guard je obsługuje        | SQL lokalny + analiza kodu |
| 3   | Disease/pest remindery nadal działają?                            | ✅ Niezmienione                           | SQL lokalny                |
| 4   | WEATHER_ALERTS_SUMMARY max 1 push/dzień?                          | ✅ Tak — dedupeKey stabilny na `today`    | statyczna analiza kodu     |
| 5   | WEATHER_STATUS_CHANGED / GARDEN_RISK_CHANGED nie rotują?          | ✅ Tak — dedupeKey stabilny na `today`    | statyczna analiza kodu     |
| 6   | LIFECYCLE_SUGGESTION max 1 event/push na `suggestedAction`/dzień? | ✅ Tak — plantingId usunięty z dedupeKey  | statyczna analiza kodu     |
| 7   | TASKS_GENERATED nadal poprawnie przez Pipeline A?                 | ✅ Niezmienione                           | statyczna analiza kodu     |
| 8   | Notification Center nie dostaje wielu wpisów?                     | ✅ Poprawione przy 5, 6 — dla 7 bez zmian | patrz szczegóły            |

---

## Środowisko weryfikacji

Lokalny PostgreSQL (localhost:5432, warzywnik). Baza lokalna ma uruchomione migracje **do `Migration20260505120000`** — tabele notification pipeline (`notification_event_outbox`, `notification_batches`, `notification_dedupe`) istnieją tylko na staging/produkcji (od `Migration20260513090000`). Weryfikacja Pipeline A (pkt 4–8) oparta jest o **statyczną analizę kodu**. Pipeline B (pkt 1–3) zweryfikowany bezpośrednio przez SQL.

---

## 1 & 2 — ACTION_TASK_DUE w PushWorkerService

### Mechanizm po zmianie

Zmiana w dwóch miejscach:

**`action-automation.service.ts` — `upsertReminderForTask()`:**

```typescript
// Teraz tylko kasuje stare remindery, NIE tworzy nowych
await em.nativeUpdate(
  Reminder,
  { actionTaskId: task.id, status: { $in: [PENDING, PROCESSING] } },
  { status: CANCELED },
);
// brak: em.persist(reminder)
```

**`push-worker.service.ts` — `processReminder()` (guard, linia ~344):**

```typescript
if (reminder.type === ReminderType.ACTION_TASK_DUE) {
  await this.markSuccess(reminder.id);
  this.logger.log(
    `skipped ACTION_TASK_DUE reminder via Pipeline B | reminder=${reminder.id}`,
  );
  return;
}
```

### Stan bazy (lokalny)

```sql
-- Pending ACTION_TASK_DUE ogółem
SELECT status, count(*) FROM reminders WHERE type = 'ACTION_TASK_DUE' GROUP BY status;
--  pending  |  68
--  canceled | 1999

-- Z czego past-due (scheduled_at <= now()) — te, które PushWorker NATYCHMIAST skonsumuje
SELECT count(*) FROM reminders WHERE type = 'ACTION_TASK_DUE' AND status = 'pending' AND scheduled_at <= now();
-- → 29

-- Podział past-due wg źródła zadania
SELECT at2.source, count(*) FROM reminders r
JOIN action_tasks at2 ON at2.id = r.action_task_id
WHERE r.type = 'ACTION_TASK_DUE' AND r.status = 'pending' AND r.scheduled_at <= now()
GROUP BY at2.source;
-- VEGETABLE_RULE  | 27
-- WEATHER_WARNING |  2
```

**29 starych pending reminders** (stworzonych 2026-04-14 — 2026-05-06) nadal czeka w bazie. PushWorker (`claimDueReminders`) **zaklaimuje je wszystkie** przy następnym tiku — ale guard w `processReminder` wywoła `markSuccess` + `return` zanim dotrze do Expo. Żaden push nie zostanie wysłany.

> ⚠️ **Uwaga operacyjna**: do skonsumowania tych 29 rekordów potrzeba max 1 tiku PushWorkera (co minutę, `batchSize=100`). Po tym tiku znikną z kolejki. Na staging należy obserwować logi przez 1–2 minuty po deploymencie i potwierdzić komunikat `skipped ACTION_TASK_DUE reminder via Pipeline B`.

**Nowe `ACTION_TASK_DUE` remindery nie będą już tworzone** dla tasków z `source=VEGETABLE_RULE / WEATHER_WARNING / DECISION_ENGINE` — `upsertReminderForTask()` jest no-opem. Testy: po recomputeForPlanting w bazie nie pojawi się żaden nowy rekord ze statusem `pending` w `reminders` dla danego `action_task_id`.

### Log, który zobaczysz na staging

```
process reminder=b858a1ed... | user=... | scheduledAt=2026-04-14T07:00:00.000Z | attempts=1
skipped ACTION_TASK_DUE reminder via Pipeline B | reminder=b858a1ed...
```

---

## 3 — Disease/pest remindery

```sql
SELECT type, status, count(*) FROM reminders
WHERE type IN ('DISEASE_CHECK','DISEASE_TREATMENT','PEST_CHECK')
GROUP BY type, status ORDER BY type, status;
-- DISEASE_CHECK | canceled | 3
-- PEST_CHECK    | canceled | 1
-- PEST_CHECK    | pending  | 1  ← scheduled_at=2026-04-26, będzie wysłany normalnie
```

Guard `if (reminder.type === ReminderType.ACTION_TASK_DUE)` nie obejmuje disease/pest. Ścieżka `DISEASE_CHECK / DISEASE_TREATMENT / PEST_CHECK → sendPush()` nie zmieniła się. ✅

---

## 4 & 5 — Weather dedupeKeys (WEATHER_ALERTS_SUMMARY, WEATHER_STATUS_CHANGED, GARDEN_RISK_CHANGED)

### Przed zmianą (przykład rotowania)

```
userId:WEATHER_ALERTS_SUMMARY:2026-05-26T06:00:00.000Z:2026-05-28T12:00:00.000Z:DROUGHT
userId:WEATHER_ALERTS_SUMMARY:2026-05-26T06:00:00.000Z:2026-05-28T13:00:00.000Z:DROUGHT  ← inny validTo = nowy event
userId:WEATHER_ALERTS_SUMMARY:2026-05-26T07:00:00.000Z:2026-05-28T13:00:00.000Z:DROUGHT  ← inny validFrom = kolejny event
```

### Po zmianie

```typescript
const today = new Date().toISOString().slice(0, 10); // "2026-05-26"
const weatherAlertsDedupeKey = `${userId}:WEATHER_ALERTS_SUMMARY:${alertReasonSignature}:${today}`;
// → "uuid:WEATHER_ALERTS_SUMMARY:DROUGHT:2026-05-26"  — stały przez cały dzień
```

Analogicznie dla `WEATHER_STATUS_CHANGED` i `GARDEN_RISK_CHANGED`. Wszystkie trzy typy są teraz idempotentne na poziomie dnia. `publishEvent()` zawiera check `IF EXISTS (dedupeKey, status IN [PENDING,PROCESSED])` → drugi i kolejne recompute w ciągu dnia nie tworzą nowych wpisów w outboxie.

> **Caveat**: `validFrom`/`validTo` są nadal zapisywane w **payload** event, więc Aggregator i NotificationCopyService mają dostęp do oryginalnych danych czasowych. Zmiana dotyczy wyłącznie klucza deduplikacji.

### Weryfikacja na staging (SQL do wykonania po deploymencie)

```sql
-- Sprawdź, czy w ciągu ostatnich 24h jest max 1 event na (userId, type, reason, date)
SELECT user_id, type, dedupe_key, count(*) as cnt
FROM notification_event_outbox
WHERE type IN ('WEATHER_ALERTS_SUMMARY','WEATHER_STATUS_CHANGED','GARDEN_RISK_CHANGED')
  AND created_at >= now() - interval '24 hours'
GROUP BY user_id, type, dedupe_key
HAVING count(*) > 1;
-- Oczekiwany wynik: 0 wierszy
```

---

## 6 — LIFECYCLE_SUGGESTION

### Przed zmianą

```
userId:LIFECYCLE_SUGGESTION:planting-id-1:Zaczyna się okno zbioru dla Pomidor.  → push 1
userId:LIFECYCLE_SUGGESTION:planting-id-2:Zaczyna się okno zbioru dla Pomidor.  → push 2
userId:LIFECYCLE_SUGGESTION:planting-id-3:Zaczyna się okno zbioru dla Pomidor.  → push 3
```

### Po zmianie

```typescript
const today = new Date().toISOString().slice(0, 10);
dedupeKey = `${userId}:LIFECYCLE_SUGGESTION:${suggestedAction}:${today}`;
// → "uuid:LIFECYCLE_SUGGESTION:Zaczyna się okno zbioru dla Pomidor.:2026-05-26"
```

Cron `15 */3 * * *` iteruje wszystkie plantingi. 3 uprawy o identycznej `suggestedAction` = 3 wywołania `publishLifecycleSuggestionEvent()`, ale `publishEvent()` blokuje duplikat po pierwszym → **max 1 event w outboxie** → **max 1 push** danego dnia.

> **Trade-off**: payload pierwszego eventu zawiera `plantingId` tylko jednej uprawy. Jeśli w przyszłości copy będzie wymieniał wszystkie uprawy po nazwie, wymagana będzie zmiana w NotificationCopyService (Faza 2).

### Weryfikacja na staging

```sql
SELECT user_id, dedupe_key, count(*) as cnt
FROM notification_event_outbox
WHERE type = 'LIFECYCLE_SUGGESTION'
  AND created_at >= now() - interval '24 hours'
GROUP BY user_id, dedupe_key
HAVING count(*) > 1;
-- Oczekiwany wynik: 0 wierszy
```

---

## 7 — TASKS_GENERATED (Pipeline A)

`publishTaskEvents()` w `notification-event.service.ts` **nie została zmieniona**. Tworzy 1 event per task z dedupeKey `{userId}:TASKS_GENERATED:{taskId}:{hourWindow}`. Dla wielu tasków tego samego typu (np. 3 zadania podlewania dla 3 grzędek) nadal generuje **3 oddzielne eventy** → 3 batche → potencjalnie 3 notyfikacje (choć Policy może część odfiltrować).

> To jest znany issue zaadresowany w **Fazie 2** (userIntentKey dla WEATHER_WARNING tasks). Faza 1 celowo tego nie rusza.

---

## 8 — Notification Center (duplikaty wpisów)

| Typ                          | Status po Fazie 1                                     |
| ---------------------------- | ----------------------------------------------------- |
| TASKS_GENERATED (weather)    | ⚠️ Nadal możliwe N wpisów dla N grzędek — Faza 2      |
| TASKS_GENERATED (automation) | ✅ Bez zmian — 1 event per task, Pipeline B wyłączony |
| WEATHER_ALERTS_SUMMARY       | ✅ Max 1 wpis/dzień/reason                            |
| LIFECYCLE_SUGGESTION         | ✅ Max 1 wpis/dzień/suggestedAction                   |
| Disease/pest                 | ✅ Bez zmian — 1 reminder per occurrence              |

---

## Czy po Fazie 1 nadal istnieje realne źródło spamu?

### Wyeliminowane

| Symptom                     | Root cause                                         | Status                                                |
| --------------------------- | -------------------------------------------------- | ----------------------------------------------------- |
| 3× "Czas na: podlewanie"    | Pipeline B: 3 bed tasks → 3 reminders → Expo       | ✅ Wyeliminowane — `upsertReminderForTask` jest no-op |
| 4× "Ryzyko przesuszenia"    | dedupeKey z `validFrom:validTo` rotował co godzinę | ✅ Wyeliminowane — stabilny `today`                   |
| 3× "Monitoring wzrostu"     | 3 plantingi → 3 LIFECYCLE_SUGGESTION events        | ✅ Wyeliminowane                                      |
| Double push: Pipeline A + B | Oba pipeline'y strzelały dla tego samego taska     | ✅ Wyeliminowane                                      |

### Pozostałe (Faza 2)

| Symptom                                                        | Root cause                          | Priorytet                        |
| -------------------------------------------------------------- | ----------------------------------- | -------------------------------- |
| N× TASKS_GENERATED dla N grzędek (watering)                    | Brak `userIntentKey` w aggregatorze | Faza 2                           |
| Notification Center pęcznieje od tasków                        | Każdy task = osobny batch           | Faza 2                           |
| Push copy zawiera tylko 1 plantingId przy LIFECYCLE_SUGGESTION | Payload pierwszego eventu           | Faza 2 (NotificationCopyService) |

---

## Rekomendacja: Faza 1 czy od razu Faza 2?

### Rekomendacja: **najpierw 1–2 dni obserwacji na staging**

**Uzasadnienie:**

1. **29 starych pending reminders** w lokalnej bazie — podobna liczba istnieje na staging. Należy potwierdzić, że PushWorker skonsumował je logami `skipped ACTION_TASK_DUE` bez żadnego push do Expo.
2. **Nowe recompute** po deploymencie — sprawdzić, czy dla active plantingów nie tworzą się nowe `reminders` z `type=ACTION_TASK_DUE`.
3. **Weather recompute** — uruchomić ręcznie lub poczekać na naturalny cykl i sprawdzić czy `notification_event_outbox` ma max 1 wpis na (userId, type, reason) dla danego dnia.

**Gdy staging jest zielony → Faza 2** może iść równolegle lub w kolejnej iteracji:

- `userIntentKey` w `NotificationBatch` + aggregator
- Aktualizacja `NotificationCopyService` dla LIFECYCLE_SUGGESTION (zbiorczy payload plantingIds)

### Kryteria akceptacji dla Fazy 1 (staging)

```
[ ] Logi: "skipped ACTION_TASK_DUE reminder via Pipeline B" dla wszystkich 29+ starych reminders
[ ] SQL: SELECT count(*) FROM reminders WHERE type='ACTION_TASK_DUE' AND status='pending' → 0 (po 1 tiku workera)
[ ] SQL: brak nowych ACTION_TASK_DUE reminders po recomputeForPlanting
[ ] SQL: WEATHER_ALERTS_SUMMARY max 1 event/dzień/reason na (userId, dedupe_key)
[ ] SQL: LIFECYCLE_SUGGESTION max 1 event/dzień/suggestedAction na (userId, dedupe_key)
[ ] Ręczny test: wywołanie recompute pogody 3× z rzędu → tylko 1 notyfikacja w centrum
[ ] Ręczny test: 3 plantingi w oknie zbiorów → tylko 1 push "okno zbioru"
```
