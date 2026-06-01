# Audyt Push Notifications — 1 czerwca 2026

---

## 1. Krótkie podsumowanie: dlaczego dostałeś tylko alert pogodowy

W ciągu ostatnich 48h **tylko 1 event trafił do outboxa** dla Twojego userId (`ff933ba2`): `WEATHER_ALERTS_SUMMARY / DROUGHT`. Wszystkie inne zdarzenia — mimo że zadania powstawały — albo **nie wygenerowały outbox eventu** albo **mają deliveryPolicy = PLAN_ONLY**.

Konkretnie dziś (01.06, 07:22):

- System wygenerował kilka zadań z `VEGETABLE_RULE` (Kontrola szkodników, Podlewanie roślin, Monitoring wzrostu)
- Żadne z nich **nie trafiło do outboxa** — cron `collectAutomationTaskEvents` sprawdza tylko zadania z `createdAt >= now - 15min` i `dueAt >= now()`, a dziś `dueAt = 07:00` co jest już przeszłością w momencie działania crona (07:22+)
- Nawet gdyby trafiły do outboxa: `VEGETABLE_RULE` → `TASKS_DUE_TODAY` → `PLAN_ONLY` → **zero pusha, zero Notification Center**
- `DAILY_TASKS_SUMMARY` ma hardkodowane `PLAN_ONLY` → zawsze SKIPPED

---

## 2. Pełna mapa: zdarzenie → event → batch → delivery

### A) Alert pogodowy (susza/deszcz/burza/przymrozek)

| Krok                    | Co się dzieje                                                                  |
| ----------------------- | ------------------------------------------------------------------------------ |
| Źródło                  | Cron `weather-recompute`                                                       |
| ActionTask              | ❌ Nie powstaje                                                                |
| NotificationEventOutbox | ✅ `WEATHER_ALERTS_SUMMARY`                                                    |
| userIntentKey           | `WEATHER_ALERTS:{userId}:{date}:{reason}`                                      |
| deliveryPolicy          | FROST/WIND_DAMAGE/STORM → `PUSH_IMMEDIATE`, DROUGHT/HEAVY_RAIN → `PUSH_DIGEST` |
| NotificationBatch       | ✅ PENDING → SENT                                                              |
| Notification Center     | ✅ (tworzone przy dostarczeniu)                                                |
| Push                    | ✅ Wysyłane                                                                    |
| routeTarget             | `WEATHER_ALERTS`                                                               |

### B) Zadanie pogodowe (ActionTask ze źródła WEATHER_WARNING)

| Krok                    | Co się dzieje                                                     |
| ----------------------- | ----------------------------------------------------------------- |
| Źródło                  | Serwis weather → `publishTaskEvents`                              |
| ActionTask              | ✅ Powstaje                                                       |
| NotificationEventOutbox | ✅ `TASKS_GENERATED` — **ale tylko jeśli** `dueAt >= now()`       |
| userIntentKey           | Zależy od slug/title template:                                    |
|                         | `podlew/woda/water` → `WATERING_TODAY` → `PUSH_DIGEST` ✅         |
|                         | `zbior/harvest` → `HARVEST_READY` → `PUSH_DIGEST` ✅              |
|                         | `frost/przymroz/oslon` → `FROST_PROTECTION` → `PUSH_IMMEDIATE` ✅ |
|                         | `wind/wiatr` → `WIND_PROTECTION` → `PUSH_IMMEDIATE` ✅            |
|                         | **wszystko inne** → `WEATHER_TASKS` → `PLAN_ONLY` ❌              |
| NotificationBatch       | ✅/❌ zależy od intentu                                           |
| Notification Center     | Tylko jeśli push (PUSH_DIGEST/IMMEDIATE)                          |
| Push                    | ✅ dla WATERING/HARVEST/FROST/WIND, ❌ dla WEATHER_TASKS          |

### C) Zadania z VEGETABLE_RULE

| Krok                    | Co się dzieje                                                              |
| ----------------------- | -------------------------------------------------------------------------- |
| ActionTask              | ✅ Powstaje                                                                |
| NotificationEventOutbox | ✅ `TASKS_GENERATED` — jeśli PENDING, dueAt >= now, createdAt >= now-15min |
| userIntentKey           | `TASKS_DUE_TODAY:{userId}:{date}` (zawsze)                                 |
| deliveryPolicy          | `PLAN_ONLY` (zawsze)                                                       |
| NotificationBatch       | ✅ Powstaje z status=SKIPPED, skippedReason=plan_only                      |
| Notification Center     | ❌                                                                         |
| Push                    | ❌                                                                         |

### D) Zadania ręcznie dodane przez użytkownika

Kod crona pobiera tylko `source: VEGETABLE_RULE` — zadania manualne **nie są zbierane przez cron outboxa w ogóle**. Identyczny skutek: `PLAN_ONLY` nawet gdyby były.

### E) Lifecycle suggestions (gotowość do zbioru/przesadzenia)

| Krok                    | Co się dzieje                                                  |
| ----------------------- | -------------------------------------------------------------- |
| Źródło                  | `lifecycle-suggestion.service.ts`                              |
| NotificationEventOutbox | ✅ `LIFECYCLE_SUGGESTION`                                      |
| userIntentKey           | `LIFECYCLE_{suggestedAction}:{userId}:{date}`                  |
| priority                | `NORMAL` (domyślnie)                                           |
| deliveryPolicy          | `PUSH_DIGEST`                                                  |
| NotificationBatch       | ✅ → SENT (jeśli nie dedupe)                                   |
| Notification Center     | ✅                                                             |
| Push                    | ✅ — o ile intensywność >= NORMAL (BALANCED: NORMAL → PUSH ✅) |
| routeTarget             | `PLANTING_DETAIL` (1 planting) lub `BED_DETAIL`                |

### F) Daily Summary / Plan dnia

| Krok                    | Co się dzieje                                           |
| ----------------------- | ------------------------------------------------------- |
| Źródło                  | Cron `daily-summary`                                    |
| NotificationEventOutbox | ✅ `DAILY_TASKS_SUMMARY` (tylko gdy taskIds.length > 0) |
| userIntentKey           | `TASKS_DUE_TODAY:{userId}:{date}`                       |
| deliveryPolicy          | **`PLAN_ONLY` — hardkodowane**                          |
| NotificationBatch       | ✅ Powstaje, status=SKIPPED, skippedReason=plan_only    |
| Notification Center     | ❌                                                      |
| Push                    | ❌                                                      |

### G) Weekly Digest

|                     |               |
| ------------------- | ------------- |
| deliveryPolicy      | `PUSH_DIGEST` |
| Push                | ✅            |
| Notification Center | ✅            |

### H) Article Recommended

|                     |                                  |
| ------------------- | -------------------------------- |
| deliveryPolicy      | **`CENTER_ONLY` — hardkodowane** |
| Push                | ❌                               |
| Notification Center | ✅                               |

### I) Garden Risk Changed

|                           |                                                          |
| ------------------------- | -------------------------------------------------------- |
| priority HIGH/CRITICAL    | `PUSH_IMMEDIATE` ✅                                      |
| priority NORMAL           | `PUSH_DIGEST` ✅                                         |
| suppressPushWhenDedupedBy | Jeśli WEATHER_ALERTS_SUMMARY już wysłany → `CENTER_ONLY` |
| Notification Center       | ✅                                                       |

### J) Disease/pest reminders

Brak aktywnych encji/serwisów dla tego typu. `NotificationType` nie zawiera `DISEASE_ALERT` — **całkowicie usunięte z systemu**.

---

## 3. Tabela polityki delivery

| Źródło / typ                                   | Przykład                    | userIntentKey                | deliveryPolicy     | Push? | Notification Center? | Planner? | Komentarz                                            |
| ---------------------------------------------- | --------------------------- | ---------------------------- | ------------------ | ----- | -------------------- | -------- | ---------------------------------------------------- |
| WEATHER_ALERTS_SUMMARY / DROUGHT               | Susza                       | WEATHER_ALERTS:…:DROUGHT     | **PUSH_DIGEST**    | ✅    | ✅                   | ❌       | Działa                                               |
| WEATHER_ALERTS_SUMMARY / FROST                 | Przymrozek                  | WEATHER_ALERTS:…:FROST       | **PUSH_IMMEDIATE** | ✅    | ✅                   | ❌       | Działa                                               |
| WEATHER_ALERTS_SUMMARY / WIND_DAMAGE           | Wiatr                       | WEATHER_ALERTS:…:WIND_DAMAGE | **PUSH_IMMEDIATE** | ✅    | ✅                   | ❌       | Działa                                               |
| WEATHER_ALERTS_SUMMARY / HEAVY_RAIN            | Ulewa                       | WEATHER_ALERTS:…:HEAVY_RAIN  | **PUSH_DIGEST**    | ✅    | ✅                   | ❌       | Działa                                               |
| WEATHER_STATUS_CHANGED / FROST                 | Status: przymrozek          | WEATHER_ALERTS:…:FROST       | PUSH_IMMEDIATE     | ✅\*  | ✅                   | ❌       | \*suppressPush jeśli alert już wysłany → CENTER_ONLY |
| WEATHER_STATUS_CHANGED / DROUGHT               | Status: susza               | WEATHER_ALERTS:…:DROUGHT     | PUSH_DIGEST        | ✅\*  | ✅                   | ❌       | \*j.w.                                               |
| GARDEN_RISK_CHANGED / HIGH                     | Wysokie ryzyko              | GARDEN*RISK*\*:…:            | PUSH_IMMEDIATE     | ✅    | ✅                   | ❌       | Działa                                               |
| GARDEN_RISK_CHANGED / NORMAL (WATERING_NEEDED) | Potrzeba podlewania         | GARDEN_RISK_WATERING_NEEDED  | **PUSH_DIGEST**    | ✅    | ✅                   | ❌       | Działa — potwierdzono w danych                       |
| TASKS_GENERATED / WEATHER_WARNING / podlew     | "Podlej uprawy"             | WATERING_TODAY               | **PUSH_DIGEST**    | ✅    | ✅                   | ✅       | Działa — potwierdzone 25.05                          |
| TASKS_GENERATED / WEATHER_WARNING / frost      | "Osłoń rośliny"             | FROST_PROTECTION             | **PUSH_IMMEDIATE** | ✅    | ✅                   | ✅       | Działa                                               |
| TASKS_GENERATED / WEATHER_WARNING / inne       | np. "Sprawdź grunt"         | WEATHER_TASKS                | **PLAN_ONLY**      | ❌    | ❌                   | ✅       | ⚠️ Potencjalnie zbyt cicho                           |
| TASKS_GENERATED / VEGETABLE_RULE               | Podlewanie, Zbior, Kontrola | TASKS_DUE_TODAY              | **PLAN_ONLY**      | ❌    | ❌                   | ✅       | ⚠️ Zamierzone, ale dyskusyjne                        |
| TASKS_GENERATED / MANUAL                       | Ręcznie dodane              | TASKS_DUE_TODAY              | **PLAN_ONLY**      | ❌    | ❌                   | ✅       | + cron ich nawet nie zbiera                          |
| LIFECYCLE_SUGGESTION / HARVEST                 | Gotowość do zbioru          | LIFECYCLE_zbior:…            | **PUSH_DIGEST**    | ✅    | ✅                   | ❌       | Działa (brak eventów w ostatnich dniach)             |
| LIFECYCLE_SUGGESTION / TRANSPLANT              | Gotowość do przesadzenia    | LIFECYCLE_przesadzenie:…     | **PUSH_DIGEST**    | ✅    | ✅                   | ❌       | Działa                                               |
| DAILY_TASKS_SUMMARY                            | Plan dnia                   | TASKS_DUE_TODAY              | **PLAN_ONLY**      | ❌    | ❌                   | ✅       | ⚠️⚠️ Najważniejszy problem                           |
| WEEKLY_DIGEST                                  | Tygodniowe podsumowanie     | null                         | PUSH_DIGEST        | ✅    | ✅                   | ❌       | Działa                                               |
| ARTICLE_RECOMMENDED                            | Artykuł                     | null                         | **CENTER_ONLY**    | ❌    | ✅                   | ❌       | Zamierzone                                           |

---

## 4. Tabela realnych eventów/batchy Twojego userId — ostatnie 48h

Twój userId: `ff933ba2-0e6b-4825-b81f-2e8599b88369` | Intensywność: `BALANCED` | Aktywne urządzenia: 1

| Czas        | Typ                              | Status outbox | deliveryPolicy | Status batch | Push? | Powód                   |
| ----------- | -------------------------------- | ------------- | -------------- | ------------ | ----- | ----------------------- |
| 01.06 07:22 | WEATHER_ALERTS_SUMMARY / DROUGHT | PROCESSED     | PUSH_DIGEST    | **SENT**     | ✅    | Działający push (07:24) |

To jedyny event z ostatnich 48h. Wcześniejsze (7 dni):

| Czas        | Typ                                   | Status outbox | deliveryPolicy | Status batch | Push? | Powód                                             |
| ----------- | ------------------------------------- | ------------- | -------------- | ------------ | ----- | ------------------------------------------------- |
| 28.05 09:00 | DAILY_TASKS_SUMMARY                   | PROCESSED     | PLAN_ONLY      | SKIPPED      | ❌    | plan_only                                         |
| 28.05 07:13 | GARDEN_RISK_CHANGED / WATERING_NEEDED | PROCESSED     | PUSH_DIGEST    | **SENT**     | ✅    | Normalny push                                     |
| 27.05 09:00 | DAILY_TASKS_SUMMARY                   | PROCESSED     | PLAN_ONLY      | SKIPPED      | ❌    | plan_only                                         |
| 26.05 16:00 | DAILY_TASKS_SUMMARY                   | PROCESSED     | PLAN_ONLY      | SKIPPED      | ❌    | plan_only                                         |
| 26.05 10:30 | WEATHER_ALERTS_SUMMARY / DROUGHT      | PROCESSED     | PUSH_DIGEST    | **SENT**     | ✅    | —                                                 |
| 26.05 07:46 | WEATHER_ALERTS_SUMMARY / DROUGHT      | PROCESSED     | PUSH_DIGEST    | **SENT**     | ✅    | Stary format dedupeKey                            |
| 25.05 16:00 | DAILY_TASKS_SUMMARY                   | PROCESSED     | PUSH_DIGEST    | **SENT**     | ✅    | Stary kod, przed refactorem (brak PLAN_ONLY)      |
| 25.05 16:00 | WEEKLY_DIGEST                         | PROCESSED     | PUSH_DIGEST    | **SENT**     | ✅    | —                                                 |
| 25.05 08:52 | TASKS_GENERATED / WEATHER_WARNING     | PROCESSED     | PUSH_DIGEST    | **SENT**     | ✅    | "Podlej uprawy" — stary dedupeKey, brak intentKey |
| 25.05 08:51 | WEATHER_ALERTS_SUMMARY                | PROCESSED     | PUSH_DIGEST    | **SENT**     | ✅    | —                                                 |

**Podsumowanie 7 dni:**

- Outbox events łącznie: ~20
- Batches SENT: 7 (5× WEATHER_ALERTS, 1× GARDEN_RISK, 1× TASKS_GENERATED, 1× DAILY_SUMMARY, 1× WEEKLY_DIGEST)
- Batches SKIPPED / plan_only: 4× DAILY_TASKS_SUMMARY
- PUSH_IMMEDIATE: 0
- PUSH_DIGEST wysłane: 7
- CENTER_ONLY: 0
- PLAN_ONLY (SKIPPED): 4
- Deduped (outbox): 5× WEATHER_ALERTS_SUMMARY (te same warunki suszy — poprawne)

**Brak eventów** dla: TASKS_GENERATED/VEGETABLE_RULE, LIFECYCLE_SUGGESTION, ARTICLE_RECOMMENDED

---

## 5. Które zdarzenia aktualnie wysyłają push

✅ **WYSYŁAJĄ PUSH:**

- `WEATHER_ALERTS_SUMMARY` (DROUGHT, FROST, WIND, STORM, HEAVY_RAIN)
- `WEATHER_STATUS_CHANGED` (jeśli nie jest suppressowany przez alert)
- `GARDEN_RISK_CHANGED` (każdy poziom, jeśli gardenRiskIncreased)
- `TASKS_GENERATED` ze źródła WEATHER_WARNING — **ale tylko** jeśli tytuł/slug zawiera: podlew/woda/water/zbior/harvest/frost/przymroz/wind/wiatr
- `LIFECYCLE_SUGGESTION` (PUSH_DIGEST)
- `WEEKLY_DIGEST` (PUSH_DIGEST)

---

## 6. Które zdarzenia aktualnie NIE wysyłają push

❌ **NIE WYSYŁAJĄ PUSH:**

- `DAILY_TASKS_SUMMARY` — **zawsze PLAN_ONLY**, hardkodowane w aggregatorze
- `TASKS_GENERATED / VEGETABLE_RULE` — zawsze `TASKS_DUE_TODAY` → `PLAN_ONLY`
- `TASKS_GENERATED / MANUAL` — j.w. + cron ich nie zbiera
- `TASKS_GENERATED / WEATHER_WARNING` — **jeśli slug nie pasuje do żadnej kategorii** → `WEATHER_TASKS` → `PLAN_ONLY`
- `ARTICLE_RECOMMENDED` — hardkodowane `CENTER_ONLY`
- `WEATHER_STATUS_CHANGED` — jeśli WEATHER_ALERTS_SUMMARY już wysłany → CENTER_ONLY (suppressPushWhenDedupedBy)

---

## 7. Lista potencjalnych miejsc, gdzie polityka jest zbyt agresywnie wyciszona

### 🔴 Krytyczne

**`DAILY_TASKS_SUMMARY` → `PLAN_ONLY`** — to jest _jedyna_ codzienna notyfikacja informująca użytkownika o zadaniach na dziś. Aktualnie użytkownik **nigdy** nie dostaje pushowego przypomnienia o planie dnia. To był działający push przed refactorem (potwierdzone w danych: 25.05 był SENT). Po refactorze zmieniono na PLAN_ONLY — i użytkownik przestał dostawać tę notyfikację.

### 🟠 Ważne

**`TASKS_GENERATED / VEGETABLE_RULE` → `PLAN_ONLY`** — zadania z reguł wegetacyjnych ("Podlewanie roślin", "Zbiór plonów", "Kontrola szkodników") są traktowane identycznie jak anonimowe zadania automatyczne. Szczególnie "Podlewanie" czy "Zbiór plonów" mogłyby kwalifikować się do PUSH_DIGEST, bo są **akcjonem wymagającym działania**.

**Filtr `dueAt >= Date.now()` w `publishTaskEvents`** — zadania z dueAt o 07:00 nie trafiają do outboxa jeśli cron uruchomi się po 07:00. W praktyce wiele zadań tworzonych "na dziś" jest od razu odrzucanych. Potwierdzono w danych: dziś 5 zadań VEGETABLE_RULE nie wygenerowało żadnego eventu.

### 🟡 Mniej pilne

**`TASKS_GENERATED / WEATHER_WARNING / WEATHER_TASKS`** — wszelkie zadania pogodowe które nie pasują do slug-matching (np. "Sprawdź osłony", "Zabezpiecz ziemię") trafiają do PLAN_ONLY. Może to pomijać istotne akcje.

---

## 8. Wyjaśnienie: alert pogodowy vs garden risk vs zadanie pogodowe

| Aspekt              | Alert pogodowy (WEATHER_ALERTS_SUMMARY)                              | Garden Risk (GARDEN_RISK_CHANGED) | Zadanie pogodowe (ActionTask / WEATHER_WARNING)                   |
| ------------------- | -------------------------------------------------------------------- | --------------------------------- | ----------------------------------------------------------------- |
| Kiedy powstaje      | Gdy `warningInstances` zawierają FROST/DROUGHT/WIND/STORM/HEAVY_RAIN | Gdy `gardenRiskIncreased = true`  | Gdy serwis weather generuje ActionTask ze źródłem WEATHER_WARNING |
| Gdzie widoczne      | Notification Center + Push                                           | Notification Center + Push        | Planner (zawsze) + ewentualnie Push                               |
| Push                | ✅ Zawsze (PUSH_IMMEDIATE lub PUSH_DIGEST)                           | ✅ Zawsze                         | ✅ Tylko dla: WATERING/HARVEST/FROST/WIND. ❌ Inne: PLAN_ONLY     |
| Notification Center | ✅                                                                   | ✅                                | ✅ Tylko przy push                                                |
| Planner             | ❌                                                                   | ❌                                | ✅                                                                |
| Dedupe              | 8h na kombinację reason+date                                         | 12h                               | 2h per userIntentKey                                              |

---

## 9. Odpowiedź na pytanie produktowe

> Czy użytkownik powinien dostać push, kiedy system wygenerował istotne zadanie pogodowe typu podlewanie?

**Zależy od źródła:**

- **Źródło WEATHER_WARNING, tytuł "Podlej uprawy"** → TAK, PUSH_DIGEST. **To już jest zaimplementowane i działało (25.05)**. Problem techniczny: filtr `dueAt >= now` wycina zadania z dueAt w przeszłości.
- **Źródło VEGETABLE_RULE, tytuł "Podlewanie roślin"** → aktualnie **nie** dostaje pusha (PLAN_ONLY). **To jest zamierzone, ale dyskusyjne** — reguły wegetacyjne generują "Podlewanie" jako rutynowe zadanie, nie alert. Pytanie, czy użytkownik chce push za każdym razem gdy system sugeruje podlewanie (może być codziennie) czy tylko gdy jest konkretny powód pogodowy.

---

## 10. Rekomendacja

### Zmienić politykę dla:

**1. `DAILY_TASKS_SUMMARY`: `PLAN_ONLY` → `PUSH_DIGEST`** ⭐⭐⭐

To najważniejsza zmiana. Przed refactorem działało i użytkownicy dostawali codzienny push z planem dnia. Zmiana na PLAN_ONLY była zbyt agresywna. Jeden push dziennie z liczbą zadań to cenny sygnał dla użytkownika.

**2. Filtr `dueAt >= Date.now()` w `publishTaskEvents`: rozważyć `dueAt >= startOfToday()`** ⭐⭐

Zadania generowane z `dueAt = dziś 07:00` są wycięte przez cron uruchamiający się o 07:22. Należy zmienić na: `dueAt >= startOfToday` aby zadania na dziś (już "zaległe" o pół godziny) nadal generowały eventy.

**3. `WATERING_TODAY` z VEGETABLE_RULE: rozważyć** ⭐

Jeśli VEGETABLE_RULE generuje "Podlewanie roślin" w warunkach suszy, warto rozważyć mapowanie slug `podlewanie` z VEGETABLE_RULE do `WATERING_TODAY` → PUSH_DIGEST. Ale ostrożnie — może być zbyt często.

### Zostawić jak jest:

- `ARTICLE_RECOMMENDED` → CENTER_ONLY ✅ (artykuły nie wymagają natychmiastowej akcji)
- `WEATHER_ALERTS_SUMMARY` → PUSH_DIGEST/IMMEDIATE ✅ (działa poprawnie, dedupe działa)
- `GARDEN_RISK_CHANGED` → PUSH_DIGEST ✅ (działa, potwierdzone w danych)
- `LIFECYCLE_SUGGESTION` → PUSH_DIGEST ✅ (działa, brak plantings kwalifikujących się ostatnio)
- `WEEKLY_DIGEST` → PUSH_DIGEST ✅ (działa)

### Podsumowanie zmian do rozważenia:

| #   | Co zmienić                                                | Gdzie w kodzie                             | Priorytet      |
| --- | --------------------------------------------------------- | ------------------------------------------ | -------------- |
| 1   | `DAILY_TASKS_SUMMARY` → `PUSH_DIGEST` zamiast `PLAN_ONLY` | `notification-aggregator.service.ts` ~L261 | 🔴 Wysoki      |
| 2   | `dueAt >= startOfToday()` zamiast `>= Date.now()`         | `notification-event.service.ts` ~L136      | 🟠 Średni      |
| 3   | VEGETABLE_RULE "podlewanie" slug → WATERING_TODAY         | `notification-event.service.ts` ~L89       | 🟡 Do dyskusji |
