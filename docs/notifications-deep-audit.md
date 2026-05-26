# Deep Notification Audit — Pipeline Multiplication & Root Cause Analysis

> Prepared after full read of: `operational-weather-warnings.evaluator.ts`, `weather-task-planner.service.ts`,
> `action-automation.service.ts`, `lifecycle-suggestion.service.ts`, `notification-event.service.ts`,
> `notification-aggregator.service.ts`, `notification-copy.service.ts`, `push-delivery.service.ts`,
> `push-worker.service.ts`, `default-action-templates.seed-data.json` (full),
> `default-weather-warning-config.seed.ts` (full), `warning-instance.entity.ts`.

---

## 1. Executive Summary

The system sends **separate pushes per-bed / per-planting / per-task** instead of one aggregated push per user intent.
The root cause is that three independent subsystems each produce N events for N garden objects, and the deduplication
layer operates at **event identity** (per task ID or per warning window), not at **user intent** (e.g. "user has
watering tasks today").

| Observed push                    | Pipeline                                            | Root cause                                                                                                       |
| -------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 3× "Czas na: podlewanie roślin"  | Reminder → `PushWorkerService`                      | `WeatherTaskPlannerService` creates 1 `ActionTask` **per bed** for `WATERING_NEEDED` → 1 `Reminder` per task     |
| 3× "Czas na: zbiór plonów"       | Reminder → `PushWorkerService`                      | `ActionAutomationService` or lifecycle evaluator creates 1 harvest task **per planting** → 1 `Reminder` per task |
| 1× "Czas na: monitoring wzrostu" | Reminder → `PushWorkerService`                      | Single planting ROUTINE task — only 1 planting met conditions                                                    |
| 4× "Ryzyko przesuszenia"         | `WEATHER_ALERTS_SUMMARY` → `NotificationAggregator` | dedupeKey includes `validFrom:validTo` from `WarningInstance` — changes each 30-min recompute hour               |

---

## 2. Two Parallel Push Pipelines

```
PIPELINE A — Notification Center (aggregated)
─────────────────────────────────────────────
  Source event
     ↓ publishEvent()  [outbox-level dedupe by type+dedupeKey+PENDING/PROCESSED]
  NotificationEventOutbox
     ↓ cron */1 min  NotificationAggregatorService
  NotificationBatch  [batch-level dedupe by dedupeKey+dedupeHours]
     ↓ NotificationPolicyService  (CENTER_ONLY / PUSH / SKIP)
     ↓ cron */1 min  PushDeliveryService
  Expo Push API  ←  title: batch.title, body: batch.body

PIPELINE B — Reminders (direct, bypasses all policy and dedupe)
────────────────────────────────────────────────────────────────
  ActionTask created
     ↓ upsertReminderForTask()
  Reminder  (scheduledAt = task.dueAt)
     ↓ cron */1 min  PushWorkerService.processReminders()
  Expo Push API  ←  title: "Warzywnik", body: "Czas na: {template.name}"
```

**All "Czas na: X" pushes come from Pipeline B, not Pipeline A.**
Pipeline B has **no cross-task deduplication**: 3 tasks = 3 reminders = 3 pushes.

---

## 3. Warning → Task → Notification Flow

### 3.1 Weather Warning Sources (`warning_instances` table)

| Warning code                           | Scope    | Multiplier                     | Produces ActionTask?     |
| -------------------------------------- | -------- | ------------------------------ | ------------------------ |
| `DROUGHT_RISK_NEXT_7_DAYS`             | USER     | 1 per user                     | No                       |
| `WATERING_NEEDED_TODAY`                | USER     | 1 per user                     | **Yes — 1 task per BED** |
| `WATERING_NEEDED_TOMORROW`             | USER     | 1 per user                     | **Yes — 1 task per BED** |
| `OVERWATERING_PREPARE_TODAY/TOMORROW`  | BED      | 1 per low-drainage bed         | 1 task per bed           |
| `OVERWATERING_CHECK_TODAY/TOMORROW`    | BED      | 1 per low-drainage bed         | 1 task per bed           |
| `FROST_RISK_TODAY/TOMORROW_NIGHT`      | USER     | 1 per user                     | 1 task per user          |
| `HARD_FROST_RISK_TODAY/TOMORROW_NIGHT` | USER     | 1 per user                     | 1 task per user          |
| `HEAVY_RAIN_TODAY/TOMORROW_*`          | USER     | 1 per user                     | 1 task per user          |
| `WIND_DAMAGE_TODAY/TOMORROW_*`         | USER     | 1 per user                     | 1 task per user          |
| `SOWING_PAUSE_TOO_COLD_TODAY/TOMORROW` | PLANTING | 1 per seedling planting        | No task                  |
| `GERMINATION_PROTECT_*`                | PLANTING | 1 per newly-in-ground planting | 1 task per planting      |

**Critical mismatch:** `WATERING_NEEDED` is a USER-scoped warning (1 row in DB) but
`WeatherTaskPlannerService` iterates all beds and creates a task **per bed** using
dedupeKey `weather:WATERING_NEEDED_TODAY:{userId}:{date}:bed:{bedId}`.
→ 3 beds = 3 tasks = 3 reminders = **3 "Czas na: podlewanie" pushes**.

### 3.2 Weather → Notification Events (Pipeline A)

After each weather recompute, `publishWeatherEvents()` emits up to 3 events:

| Event type               | Condition                   | dedupeKey                                                                        | Push title                                             |
| ------------------------ | --------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `WEATHER_STATUS_CHANGED` | `weatherChanged = true`     | `userId:WEATHER_STATUS_CHANGED:{reason}:{validFrom}:{validTo}`                   | "Zmiana pogody" / "Silny wiatr" etc.                   |
| `WEATHER_ALERTS_SUMMARY` | ≥1 important warning active | `userId:WEATHER_ALERTS_SUMMARY:{windowStart}:{windowEnd}:{alertReasonSignature}` | **"Ryzyko przesuszenia"** (if DROUGHT/WATERING_NEEDED) |
| `GARDEN_RISK_CHANGED`    | garden risk increased       | `userId:GARDEN_RISK_CHANGED:{riskReason}:{riskValidFrom}:{riskValidTo}`          | "Rośliny mogą potrzebować podlewania"                  |

### 3.3 Root Cause of 4× "Ryzyko przesuszenia"

Push title "Ryzyko przesuszenia" → `WEATHER_ALERTS_SUMMARY` with `primaryReason = 'DROUGHT'` or `'WATERING_NEEDED'`.

dedupeKey = `userId:WEATHER_ALERTS_SUMMARY:{windowStart}:{windowEnd}:{alertReasonSignature}`

- `windowStart/End` = `floorToHourIso(min/max validFrom/validTo)` of active WarningInstances
- `WarningInstance.validFrom/validTo` is recalculated each weather recompute (cron `*/30 * * * *`)
- If the weather recompute runs across **4 different hours** (e.g. 08:xx, 09:xx, 10:xx, 11:xx),
  the floor-to-hour boundary produces 4 different `windowStart` values
- Each gets a unique dedupeKey → passes outbox-level dedupe → 4 separate `WEATHER_ALERTS_SUMMARY` events
- `WEATHER_ALERTS_SUMMARY` batch dedupeHours = **8 hours**, but this deduplication only applies
  within the aggregator's `NotificationBatch` table — it doesn't suppress newly created outbox events
  with a different dedupeKey

**In short:** the `validFrom` field on `WarningInstance` acts as a clock tick that rotates the dedupeKey
every hour, defeating the 8-hour batch deduplication.

---

## 4. Action Template → Task → Notification Flow

### 4.1 Action Automation (Vegetable Rules)

```
VegetableActionRule (trigger, schedule, template)
  ↓ ActionAutomationService.recomputeForPlanting()  [runs per planting]
ActionTask  (dedupeKey = sourceKey per planting per rule per cycle)
  ↓ upsertReminderForTask()
Reminder  (scheduledAt = dueAt)
  ↓ PushWorkerService (cron */1 min)
Push: title="Warzywnik", body="Czas na: {template.name}"
  ↓ collectAutomationTaskEvents() (cron */5 min)
NotificationEventOutbox  (TASKS_GENERATED, dedupeKey per taskId per hour)
  ↓ NotificationAggregatorService
Push: title="Nowe zadania w ogrodzie", body="Dodano N nowych zadań."
```

**One planting = one task = one reminder = one "Czas na:" push.**
No cross-planting aggregation because all action templates have `aggregationScope: "none"`.

### 4.2 Action Template Classification

| Template type           | `generationMode`    | `target`   | `aggregationScope` | Reminder sent? | Push channel |
| ----------------------- | ------------------- | ---------- | ------------------ | -------------- | ------------ |
| `watering`              | `WEATHER_TRIGGERED` | `bed`      | `none`             | Yes            | Pipeline B   |
| `monitoring` (multiple) | `ROUTINE`           | `planting` | `none`             | Yes            | Pipeline B   |
| `harvest`               | `AUTO` / `SEASONAL` | `planting` | `none`             | Yes            | Pipeline B   |
| `transplanting`         | `AUTO`              | `planting` | `none`             | Yes            | Pipeline B   |
| `fertilizing`           | `AUTO`              | `planting` | `none`             | Yes            | Pipeline B   |
| `irrigation_setup`      | `SUGGESTION`        | varies     | `none`             | Yes            | Pipeline B   |
| `soil_testing`          | `SEASONAL`          | `bed`      | `none`             | Yes            | Pipeline B   |

Every template defaults to `aggregationScope: "none"` → one task per planting per rule.

### 4.3 Lifecycle Suggestion Service

`LifecycleSuggestionService` (cron `15 */3 * * *`) iterates **all active plantings** and for each planting
whose `harvestWindowStart` falls within the next 24 h it calls `publishLifecycleSuggestionEvent()` with:

```
dedupeKey = `{userId}:LIFECYCLE_SUGGESTION:{plantingId}:{suggestedAction}`
```

- dedupeHours in aggregator = 24 × 14 days → once per planting per action type
- 3 plantings at harvest window = **3 separate LIFECYCLE_SUGGESTION events**
- Each produces its own `NotificationBatch` → 3 Pipeline A pushes
  (title: "Możesz rozpocząć zbiory", body: "Wygląda na to, że ta uprawa wchodzi w dobry moment na zbiór.")

**However:** if `ActionAutomationService` also creates a harvest task for the same plantings,
each task gets its own Reminder → **additional** "Czas na: zbiór plonów" from Pipeline B.
Combined: both pipelines can fire for the same harvest event.

---

## 5. Full Event Type Classification

| Event type                     | Aggregated?                      | Push channel | Dedupe window | Notes                                                                                                                |
| ------------------------------ | -------------------------------- | ------------ | ------------- | -------------------------------------------------------------------------------------------------------------------- |
| `TASKS_GENERATED`              | **By routeTarget+targetId+hour** | Pipeline A   | 2 hours       | 1 batch per (bed/planting/hour). Multiple tasks for same bed aggregate; tasks for different beds = multiple batches. |
| `LIFECYCLE_SUGGESTION`         | Per plantingId                   | Pipeline A   | 14 days       | 1 batch per planting per action                                                                                      |
| `WEATHER_ALERTS_SUMMARY`       | Per alert window+reasons         | Pipeline A   | 8 hours       | **Bug:** dedupeKey rotates hourly with validFrom                                                                     |
| `WEATHER_STATUS_CHANGED`       | Per reason+window                | Pipeline A   | 4 hours       | Same rotation bug                                                                                                    |
| `GARDEN_RISK_CHANGED`          | Per riskReason+window            | Pipeline A   | 12 hours      | Same rotation bug                                                                                                    |
| `DAILY_TASKS_SUMMARY`          | Per day                          | Pipeline A   | 24 hours      | OK                                                                                                                   |
| `WEEKLY_DIGEST`                | Per week                         | Pipeline A   | 8 days        | OK                                                                                                                   |
| `ARTICLE_RECOMMENDED`          | Per article set                  | Pipeline A   | 18 hours      | OK                                                                                                                   |
| `Reminder (ACTION_TASK_DUE)`   | **None**                         | Pipeline B   | None          | 1 push per task — no cross-task dedup                                                                                |
| `Reminder (DISEASE_TREATMENT)` | None                             | Pipeline B   | None          | 1 push per planting disease                                                                                          |
| `Reminder (PEST_CHECK)`        | None                             | Pipeline B   | None          | 1 push per pest occurrence                                                                                           |

---

## 6. Multiplication Points

| #      | Where                                 | What multiplies                                                             | Fix category |
| ------ | ------------------------------------- | --------------------------------------------------------------------------- | ------------ |
| **M1** | `WeatherTaskPlannerService` line ~340 | `WATERING_NEEDED` → 1 task **per bed** despite USER-scoped warning          | Backend      |
| **M2** | `PushWorkerService`                   | No cross-task deduplication — N reminders = N pushes                        | Backend      |
| **M3** | `LifecycleSuggestionService`          | 1 LIFECYCLE_SUGGESTION event per planting, never per user                   | Backend      |
| **M4** | `publishWeatherEvents()`              | dedupeKey includes `validFrom:validTo` which rotates hourly                 | Backend      |
| **M5** | `collectAutomationTaskEvents()`       | 1 TASKS_GENERATED event per task → separate batches if different `targetId` | Backend      |
| **M6** | `upsertReminderForTask()`             | Creates reminder for every task regardless of type/scope                    | Backend      |
| **M7** | All action templates                  | `aggregationScope: "none"` → no cross-planting roll-up                      | CMS/seed     |

---

## 7. Minimal Fix Plan (No Refactor)

Changes that stop the immediate flooding without structural redesign.

### Fix 1 — Watering tasks: one per user, not per bed (`M1`)

**File:** `src/weather/weather-task-planner.service.ts`

For `WATERING_NEEDED_TODAY` and `WATERING_NEEDED_TOMORROW`:
change `isBedLevelCode = true` to `false`. The task will be created once per user,
with `dedupeKey = weather:WATERING_NEEDED_TODAY:{userId}:{date}` (no bedId).
The task body already contains general advice; bed-level granularity is not needed
for a "please water your plants" push.

```typescript
// Before:
const isBedLevelCode =
  code === WarningCode.WATERING_NEEDED_TODAY ||
  code === WarningCode.WATERING_NEEDED_TOMORROW ||
  code === WarningCode.OVERWATERING_PREPARE_TODAY || ...;

// After:
const isBedLevelCode =
  code === WarningCode.OVERWATERING_PREPARE_TODAY ||
  code === WarningCode.OVERWATERING_PREPARE_TOMORROW ||
  code === WarningCode.OVERWATERING_CHECK_TODAY ||
  code === WarningCode.OVERWATERING_CHECK_TOMORROW;
```

**Impact:** 3 beds × 1 watering task → 1 watering task. 3 reminders → 1 reminder.

---

### Fix 2 — Suppress duplicate reminders of same template+day (`M2`)

**File:** `src/reminders/push-worker.service.ts` or the reminder creation logic

Before creating / sending a reminder for `ACTION_TASK_DUE`, check that no other
sent reminder for the same `(userId, actionTemplateName, date(scheduledAt))` was
sent in the past 24 hours:

```sql
SELECT id FROM reminders
WHERE user_id = $userId
  AND type = 'ACTION_TASK_DUE'
  AND date_trunc('day', scheduled_at) = date_trunc('day', $scheduledAt::timestamptz)
  AND (payload->>'actionTemplateName') = $templateName
  AND status = 'sent'
LIMIT 1;
```

If a row exists → skip push. This acts as a user-intent dedup without changing task structure.

**Impact:** 3 "zbiór plonów" reminders scheduled same day → 1 push.

---

### Fix 3 — Stabilize WEATHER_ALERTS_SUMMARY dedupeKey (`M4`)

**File:** `src/notifications/notification-event.service.ts`, `publishWeatherEvents()`

Replace `validFrom:validTo` in the dedupeKey with a **daily bucket**:

```typescript
// Before:
const weatherAlertsDedupeKey = `${userId}:WEATHER_ALERTS_SUMMARY:${windowStart}:${windowEnd}:${alertReasonSignature}`;

// After:
const today = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
const weatherAlertsDedupeKey = `${userId}:WEATHER_ALERTS_SUMMARY:${today}:${alertReasonSignature}`;
```

Apply the same pattern to `WEATHER_STATUS_CHANGED` and `GARDEN_RISK_CHANGED`.

**Impact:** 4 recomputes within the same day → 1 "Ryzyko przesuszenia" push.

---

### Fix 4 — Aggregate LIFECYCLE_SUGGESTION per user per day (`M3`)

**File:** `src/notifications/notification-event.service.ts`, `publishLifecycleSuggestionEvent()`

Change the dedupeKey from per-planting to per-user-per-day-per-action:

```typescript
// Before:
dedupeKey: `${userId}:LIFECYCLE_SUGGESTION:${plantingId}:${suggestedAction}`;

// After:
const today = new Date().toISOString().slice(0, 10);
dedupeKey: `${userId}:LIFECYCLE_SUGGESTION:${suggestedAction}:${today}`;
```

Then in the aggregator's `buildCandidate()` for `LIFECYCLE_SUGGESTION`, accumulate
all `plantingId` values from the event group into the payload's `plantingIds` array,
and update the copy body to say e.g. "3 uprawy są gotowe do zbioru."

**Impact:** 3 harvest plantings → 1 push per day.

---

## 8. Full Remediation Plan (With Refactor)

### Phase 1 — Isolate Pipeline B from Pipeline A

Move reminder creation out of `upsertGeneratedTaskAndReminder()`. Instead:

1. `collectAutomationTaskEvents()` (cron `/5`) publishes `TASKS_GENERATED` events to Pipeline A.
2. Pipeline A policy decides whether to send a push (based on user preferences, intensity, etc.).
3. `PushWorkerService` only fires for **manual reminders** set by the user — not for auto-generated tasks.

This eliminates the double-push (Pipeline A "Nowe zadania" + Pipeline B "Czas na: X") for the same task.

### Phase 2 — User-intent deduplication in the aggregator

Add a `userIntentKey` concept to `BatchCandidate`:

```typescript
userIntentKey?: string; // e.g. `${userId}:WATERING:${today}`
```

Before creating a batch, check if any existing `PENDING/PROCESSED` batch shares the `userIntentKey`.
This allows: "user already got a watering push today → skip", regardless of how many tasks exist.

### Phase 3 — Aggregation scope in action templates

Change watering and harvest templates from `aggregationScope: "none"` to `aggregationScope: "BED"`:

- Watering: 3 beds with watering tasks → 1 bed-level batch covering all beds
- Harvest: 3 plantings → 1 batch listing all harvest-ready plantings

For this to work, `ActionAutomationService.aggregateDesiredOccurrences()` must be extended
to aggregate cross-planting (currently it only aggregates within a single planting's recompute).
This requires refactoring `recomputeForPlanting()` to a user-level `recomputeForUser()` method.

### Phase 4 — Stable warning dedupeKey (fix 3 as permanent policy)

Make all weather-derived event dedupeKeys use **date-granularity** instead of hour-granularity.
Add a unit test that asserts: "two calls to `publishWeatherEvents()` within the same UTC day
produce at most one WEATHER_ALERTS_SUMMARY event per alertReasonSignature."

---

## 9. Files to Change

### Minimal fix (Fixes 1–4 above)

| File                                                         | Change                                                                                                                    |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `src/weather/weather-task-planner.service.ts`                | Remove `WATERING_NEEDED_TODAY/TOMORROW` from `isBedLevelCode`                                                             |
| `src/notifications/notification-event.service.ts`            | Stabilize dedupeKey for `WEATHER_ALERTS_SUMMARY`, `WEATHER_STATUS_CHANGED`, `GARDEN_RISK_CHANGED`, `LIFECYCLE_SUGGESTION` |
| `src/reminders/push-worker.service.ts` (or reminder creator) | Add same-day same-template dedup before sending reminder push                                                             |

### Full refactor

| File                                                           | Change                                                                           |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `src/action-tasks/action-automation.service.ts`                | Refactor `recomputeForPlanting` → `recomputeForUser`; cross-planting aggregation |
| `src/action-templates/default-action-templates.seed-data.json` | Set `aggregationScope: "bed"` for `watering`; `"planting"` stays                 |
| `src/reminders/push-worker.service.ts`                         | Remove auto-task reminder pushes; keep only manual reminder pushes               |
| `src/notifications/notification-aggregator.service.ts`         | Add `userIntentKey` deduplication                                                |
| `src/notifications/notification-event.service.ts`              | Stable dedupeKey (date bucket) + LIFECYCLE_SUGGESTION aggregation                |
| `src/notifications/notification-copy.service.ts`               | New copy builders for aggregated harvest/watering (plural)                       |

---

## 10. Diagnostic SQL

```sql
-- See all notifications sent in last 24h with push count per title
SELECT
  nb.title,
  nb.type,
  nb.status,
  count(*) AS batch_count,
  min(nb.created_at) AS first_sent,
  max(nb.created_at) AS last_sent
FROM notification_batches nb
WHERE nb.user_id = '<userId>'
  AND nb.created_at > now() - interval '24 hours'
GROUP BY nb.title, nb.type, nb.status
ORDER BY batch_count DESC;

-- Reminders sent in last 24h (Pipeline B, bypasses everything)
SELECT
  r.type,
  r.payload->>'actionTemplateName' AS template,
  r.scheduled_at,
  r.status,
  r.sent_at
FROM reminders r
WHERE r.user_id = '<userId>'
  AND r.scheduled_at > now() - interval '24 hours'
ORDER BY r.scheduled_at DESC;

-- Weather warning instances active now
SELECT
  wi.code,
  wi.scope,
  wi.is_active,
  wi.valid_from,
  wi.valid_to,
  wi.dedupe_key
FROM warning_instances wi
WHERE wi.user_id = '<userId>'
  AND wi.is_active = true
ORDER BY wi.valid_from;

-- Check WEATHER_ALERTS_SUMMARY dedupeKey rotation (the bug)
SELECT
  neo.dedupe_key,
  neo.status,
  neo.created_at
FROM notification_event_outbox neo
WHERE neo.user_id = '<userId>'
  AND neo.type = 'WEATHER_ALERTS_SUMMARY'
ORDER BY neo.created_at DESC
LIMIT 20;
-- If you see multiple rows with same "base" but different timestamps in the key → rotation bug confirmed
```

---

## 11. Device Token Security Note (from previous analysis)

`DevicesService.upsert()` finds a device by `expoPushToken` only — no `userId` filter.
When a new user logs in on a device previously used by another user, the token is silently
reassigned to the new user. The original user loses push delivery without any notification.

**Fix:** Add userId to the lookup, and on mismatch either create a new device row or
explicitly unlink the token from the previous user.

```typescript
// src/devices/devices.service.ts – upsert()
// Before: find by token only
const existing = await this.em.findOne(UserDevice, {
  expoPushToken: dto.expoPushToken,
});

// After: find by token+user, orphan old record if found for different user
const existing = await this.em.findOne(UserDevice, {
  expoPushToken: dto.expoPushToken,
  user: user.id,
});
if (!existing) {
  // optionally disable any existing device with this token for other users
  await this.em.nativeUpdate(
    UserDevice,
    { expoPushToken: dto.expoPushToken },
    { isEnabled: false },
  );
}
```
