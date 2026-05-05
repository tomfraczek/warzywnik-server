# Dokumentacja systemu generowania zadań (warzywa, grządki, pogoda)

## 1. Cel systemu

System odpowiada za tworzenie, aktualizację i wygaszanie zadań operacyjnych dla użytkownika aplikacji ogrodniczej.

Zakres:

- zadania ręczne (tworzone przez użytkownika),
- zadania automatyczne z reguł warzywnych,
- zadania automatyczne pogodowe.

System jest reaktywny (recompute po zmianach) i deterministyczny (reset + regeneracja dla automatyzacji warzywnej).

---

## 2. Model danych zadania

Encja: [src/action-tasks/action-task.entity.ts](src/action-tasks/action-task.entity.ts)

Najważniejsze pola:

- `id`
- `user`
- `targetType` (`user`, `bed`, `planting`, `space`)
- `planting` / `bed` / `growingSpace`
- `status` (`pending`, `done`, `canceled`)
- `source` (`MANUAL`, `VEGETABLE_RULE`, `WEATHER_WARNING`)
- `sourceType` (`MANUAL`, `AUTOMATION`, `SUGGESTION`)
- `sourceRefId` (np. `vegetable_action_rule.id`)
- `sourceKey` / `dedupeKey`
- `cycleIndex`
- `dueAt`, `originalDueAt`
- `isManuallyRescheduled`, `isUserModified`, `suppressedAt`
- `generatedAt`
- `title`, `description`
- `metadata`
- `actionTemplate`

Unikalność techniczna:

- unikalny indeks po: `user + source + sourceRefId + dueAt + cycleIndex`.

Znaczenie biznesowe:

- `source` mówi _skąd_ zadanie pochodzi,
- `sourceType` mówi _jak_ powstało,
- `sourceKey/dedupeKey` chronią przed duplikacją,
- `isUserModified` i `isManuallyRescheduled` chronią ręczne ingerencje użytkownika.

---

## 3. Enumeracje i klasyfikacja

Definicje: [src/common/enums/action.enums.ts](src/common/enums/action.enums.ts)

### 3.1 Źródła

- `ActionTaskSource.MANUAL`
- `ActionTaskSource.VEGETABLE_RULE`
- `ActionTaskSource.WEATHER_WARNING`

### 3.2 Typ źródła

- `ActionTaskSourceType.MANUAL`
- `ActionTaskSourceType.AUTOMATION`
- `ActionTaskSourceType.SUGGESTION`

### 3.3 Status

- `ActionTaskStatus.PENDING`
- `ActionTaskStatus.DONE`
- `ActionTaskStatus.CANCELED`

### 3.4 Triggery reguł warzywnych

- `ON_SOWED`
- `AFTER_SOWING_DAYS`
- `ON_TRANSPLANTED`
- `AFTER_TRANSPLANT_DAYS`
- `BEFORE_TRANSPLANT_DAYS`
- `ON_HARVEST_WINDOW_START`
- `BEFORE_HARVEST_WINDOW_START_DAYS`
- `ON_HARVEST_CONFIRMED`
- `AFTER_HARVEST_DAYS`

### 3.5 Harmonogram reguły

- `ONCE`
- `EVERY_N_DAYS`

---

## 4. Punkty wejścia API

## 4.1 Zadania ręczne (CRUD)

Kontroler: [src/action-tasks/action-tasks.controller.ts](src/action-tasks/action-tasks.controller.ts)

Endpointy:

- `POST /v1/plantings/:plantingId/action-tasks`
- `GET /v1/plantings/:plantingId/action-tasks`
- `GET /v1/beds/:bedId/action-tasks`
- `POST /v1/beds/:bedId/action-tasks/bulk`
- `POST /v1/plantings/:plantingId/action-tasks/bulk`
- `PATCH /v1/action-tasks/:id`
- `DELETE /v1/action-tasks/:id`

DTO i walidacja: [src/action-tasks/dto/action-task.schemas.ts](src/action-tasks/dto/action-task.schemas.ts)

Logika serwisowa: [src/action-tasks/action-tasks.service.ts](src/action-tasks/action-tasks.service.ts)

Parametry `GET /v1/beds/:bedId/action-tasks`:

- `scope=own` -> tylko taski bezpośrednio grządkowe (`targetType=bed`, `bedId=:bedId`), rekomendowane dla ekranu grządki,
- `scope=includingChildren` -> taski grządki + taski upraw należących do tej grządki (zachowanie historyczne),
- domyślnie: `scope=includingChildren` (backward compatibility).

## 4.2 Recompute warzywny

- `POST /v1/plantings/:id/recompute-actions`
- kontroler: [src/plantings/plantings.controller.ts](src/plantings/plantings.controller.ts)
- serwis: [src/plantings/plantings.service.ts](src/plantings/plantings.service.ts)

## 4.3 Widok użytkownika „moje zadania”

- `GET /v1/users/me/tasks`
- kontroler: [src/weather/weather.controller.ts](src/weather/weather.controller.ts)
- agregacja: [src/weather/weather-recompute.service.ts](src/weather/weather-recompute.service.ts)

---

## 5. Kiedy uruchamia się generowanie

## 5.1 Planting create

Po utworzeniu uprawy wywołuje się recompute:

- [src/plantings/plantings.service.ts](src/plantings/plantings.service.ts)

## 5.2 Planting update (w tym status)

Po aktualizacji osi czasu/statusu wywołuje się recompute:

- [src/plantings/plantings.service.ts](src/plantings/plantings.service.ts)

## 5.3 Manual recompute endpoint

Użytkownik/klient może wymusić recompute:

- [src/plantings/plantings.service.ts](src/plantings/plantings.service.ts)

## 5.4 Pogoda

Po odświeżeniu snapshotu pogody uruchamiane są:

- recompute warningów,
- recompute zadań (warzywne + pogodowe ścieżką weather).

Obsługa zdarzeń: [src/weather/weather-events.handler.ts](src/weather/weather-events.handler.ts)

Scheduler pogody: [src/weather/weather-refresh.scheduler.ts](src/weather/weather-refresh.scheduler.ts)

---

## 6. Główna logika warzywna (ActionAutomationService)

Plik: [src/action-tasks/action-automation.service.ts](src/action-tasks/action-automation.service.ts)

## 6.1 Wejście

`recomputeForPlanting({ user, plantingId, reason, forceOverrideManual, useLatestRules })`

## 6.2 Kontrola wersji reguł

Jeżeli `appliedRulesVersion` różni się od `vegetable.rulesVersion` i `useLatestRules=false`, recompute jest pomijany (skipped).

## 6.3 Pobranie reguł

Pobierane są aktywne `VegetableActionRule` dla warzywa, z `actionTemplate`, sortowane po `createdAt`, `offsetDays`.

## 6.4 Statusy końcowe

Dla `FAILED`, `CANCELLED`, `HARVESTED`, `CLEARED`:

- reset pending zadań warzywnych,
- brak nowych kandydatów.

## 6.5 Generacja kandydatów

Źródła kandydatów:

- lifecycle generator: [src/action-tasks/generators/planting-lifecycle-task.generator.ts](src/action-tasks/generators/planting-lifecycle-task.generator.ts)
- routine generator: [src/action-tasks/generators/routine-care-task.generator.ts](src/action-tasks/generators/routine-care-task.generator.ts)

Baza czasu reguły (`resolveRuleBaseDueAt`):

- siewowe: `sowedAt` lub `actualStartDate` lub `plannedStartDate`
- transplantowe: `transplantedAt`
- zbiór: `harvestWindowStart`
- po zbiorze: `harvestedAt`

## 6.6 Harmonogram i wystąpienia

- `ONCE` -> 1 occurrence,
- `EVERY_N_DAYS` -> seria wg `everyNDays` i ograniczeń (`occurrencesLimit`, `harvestWindowEnd`, fallback horizon).

## 6.7 Filtr dnia

Kandydaci są filtrowani do lokalnego „dzisiaj” (`toDateOnlyInTimezone`):

- today-only.

## 6.8 Anty-flood

`applyAntiFloodLimits`:

- max 6 aktywnych pending na planting scope,
- max 3 nowe taski tygodniowo na planting scope,
- dedupe po `sourceKey`.

## 6.9 Reset przed regeneracją

Aktualnie recompute resetuje pending `VEGETABLE_RULE` należące do plantingu (scope planting/bed/space + ownership by sourceKey prefix/plantingId), a potem tworzy desired set.

To eliminuje wiszące stale taski po zmianach statusu.

## 6.10 Fallback dzienny (wymaganie UX: zawsze coś na dziś)

Jeśli po normalnej selekcji accepted jest puste:

- `ensureDailyBaselineCandidate` dodaje 1 kandydat bazowy na dziś.
- wybór reguły przez `pickDailyBaselineRule`:
  - tylko `target=planting`, zgodne ze start method,
  - wyklucza `ON_HARVEST_CONFIRMED`,
  - preferuje typy: `monitoring`, `pest_control`, `disease_control`, `watering`, `weeding`,
  - preferuje `generationMode=ROUTINE`.

W obecnych danych najczęściej wypada `Kontrola wilgotności gleby`.

## 6.11 Upsert i reaktywacja

`upsertGeneratedTaskAndReminder`:

- szuka istniejącego po `sourceKey` lub unikalnym slocie (`sourceRefId+dueAt+cycleIndex`),
- jeśli istnieje automatyczne -> może zostać reaktywowane do `pending`,
- jeśli istnieje manualne -> nie nadpisuje,
- jeśli brak -> tworzy nowe `AUTOMATION`.

## 6.12 Reminder

Dla tasków automatycznych tworzony/odświeżany jest `Reminder` typu `ACTION_TASK_DUE`.

---

## 7. Logika pogodowa

## 7.1 Warning instances

Orkiestracja warningów: [src/weather/warnings/weather-warning-orchestrator.service.ts](src/weather/warnings/weather-warning-orchestrator.service.ts)

- wejście: snapshot pogody + aktywne bed/planting,
- uruchamiane ewaluatory,
- upsert aktywnych warning instances,
- deaktywacja nieaktualnych.

## 7.2 Planner tasków pogodowych

Planner: [src/weather/warnings/weather-task-planner.service.ts](src/weather/warnings/weather-task-planner.service.ts)

- bierze aktywne warningi,
- mapuje warning code -> proposal task,
- dedupe po dedupeKey,
- upsert pending `WEATHER_WARNING` (`sourceType=AUTOMATION`),
- cancel proposal, które zniknęły.

Zakres kodów operacyjnych jest jawnie zdefiniowany (`OPERATIONAL_TASK_CODES`).

---

## 8. Widoczność i filtrowanie listy użytkownika

`GET /v1/users/me/tasks` (weather controller/service):

- status filter: `pending|done|all`,
- aktywne konteksty: user scope lub aktywne bed/planting bed,
- sort: `dueAt asc`, `createdAt desc`.

DTO odpowiedzi: [src/weather/dto/tasks-response.dto.ts](src/weather/dto/tasks-response.dto.ts)

---

## 9. Zachowanie przy zmianach statusu uprawy

- status zmieniony -> event domain + recompute,
- recompute resetuje pending warzywne dla scope uprawy,
- generator tworzy nowy desired set na dziś,
- taski niespełniające nowego stanu są cancel.

W efekcie „Zbiór plonów” po cofnięciu statusu nie powinien wisieć jako `pending`.

---

## 10. Seedy i ich wpływ

## 10.1 Action templates

Źródło seedów: `src/action-templates/default-action-templates.seed-data.json`

Ważne pola:

- `target`, `type`, `generationMode`, `defaultDueOffsetDays`

## 10.2 Vegetable rules

Źródło seedów: `src/vegetables/vegetables-seed-data.json`

Reguły determinują:

- trigger,
- schedule,
- `everyNDays`,
- `offsetDays`,
- `applyIfStartMethod`,
- template.

Stan audytowy (przed fallback): brak globalnych reguł codziennych `everyNDays=1` dla wszystkich warzyw, stąd częste puste „dziś”.

---

## 11. Zasady biznesowe po ostatnich zmianach

1. System pozostaje today-first.
2. Recompute jest reset-first (dla `VEGETABLE_RULE` pending scope).
3. Gdy brak normalnych zadań na dziś, dodawany jest 1 fallback dzienny na uprawę.
4. Zadania manualne użytkownika nie są nadpisywane automatyzacją.
5. Zadania pogodowe są niezależnym strumieniem i mogą mieć termin dziś/jutro.

---

## 12. Najczęstsze przyczyny „braku zadań” i diagnostyka

1. Brak kandydatów today z reguł + wyłączony/nieobecny fallback.
2. Uprawa w statusie końcowym.
3. Bed nieaktywny (filtrowanie w liście użytkownika).
4. Niezgodność wersji reguł (`appliedRulesVersion`) bez `useLatestRules`.
5. Limity anty-flood (MAX_ACTIVE / MAX_WEEKLY_NEW).

Praktyka debug:

- audyt active plantings,
- audyt due_today_rules,
- audyt pending tasks by source/sourceType/status,
- manual recompute endpoint.

---

## 13. Ograniczenia i trade-offy

- Today-only + fallback daje spójny UX „zawsze coś dziś”, ale może tworzyć powtarzalny charakter zadań bazowych.
- Priorytet fallbacku zależy od kolejności i typów template/rules.
- Duże poleganie na poprawnych seedach reguł warzyw.

---

## 14. Rekomendacje dalsze

1. Dodać rotację fallbacku (np. wilgotność -> szkodniki -> chwasty -> choroby).
2. Dodać status-aware fallback (np. inne priorytety dla `READY_FOR_FINAL_HARVEST`).
3. Rozszerzyć testy integracyjne o scenariusze z manual override i rollback statusu.
4. Dodać endpoint diagnostyczny admin/debug (liczniki per user).

---

## 15. Szybkie FAQ

### Czy jest limit dzienny?

Nie ma twardego „N tasków/dzień”. Są limity anty-flood per planting scope (aktywnych i tygodniowych nowych).

### Dlaczego wszędzie „Kontrola wilgotności gleby”?

Bo fallback wybiera pierwszą preferowaną regułę rutynową typu monitoring/watering/pest/disease/weeding. W obecnych seedach zwykle pierwsza pasująca to wilgotność.

### Czy frontend musi coś zmieniać?

Nie jest wymagane do działania mechanizmu generacji. Wystarczy poprawnie pobierać `pending` i renderować.

### Dlaczego zadanie może nie zniknąć po status change?

Historycznie przez niespójne legacy rekordy. Aktualna logika reset/cleanup została utwardzona dla `VEGETABLE_RULE` pending niezależnie od `sourceType`.
