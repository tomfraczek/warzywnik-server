# Audit: Dodanie PURCHASED_SEEDLING jako trzeciej metody startowej sadzenia

**Data:** 2026-06-01  
**Zakres:** Pełen przegląd backendu pod kątem wprowadzenia `PURCHASED_SEEDLING` do `PlantingStartMethod`

---

## 1. Stan obecny — czym jest TRANSPLANT?

Obecnie enum `PlantingStartMethod` ma dwie wartości:

```typescript
// src/common/enums/planting.enums.ts
export enum PlantingStartMethod {
  DIRECT_SOW = 'DIRECT_SOW',
  TRANSPLANT = 'TRANSPLANT',
}
```

**Problem**: `TRANSPLANT` obsługuje dziś dwa semantycznie różne przypadki:

| Przypadek         | Opis                                  | Faza rozsadnika? |
| ----------------- | ------------------------------------- | ---------------- |
| Własny rozsadnik  | Użytkownik hoduje rozsadę od nasionka | ✅ TAK           |
| Kupiony rozsadnik | Użytkownik kupuje gotową rozsadę      | ❌ NIE           |

Brak rozróżnienia powoduje, że:

- Kupiony rozsadnik przechodzi przez stany `SEEDLING_PREPARED → SEEDLING_READY_FOR_TRANSPLANT`, których nie ma w rzeczywistości
- Reguły akcji z triggerami `ON_SOWED` / `AFTER_SOWING_DAYS` mogą być nieintencjonalnie stosowane do kupionego rozsadnika
- Frontend nie może prezentować właściwego UX dla tych dwóch przepływów

---

## 2. Proponowane ścieżki lifecyclu

### DIRECT_SOW (bez zmian)

```
NEW → IN_GROUND → READY_FOR_FINAL_HARVEST → HARVESTED → CLEARED
```

- Anchor date: `sowedAt` (ustawiany przy przejściu `→ IN_GROUND`)
- `transplantedAt`: NULL (blokowane walidacją)
- Harvest window: liczony od `sowedAt`

### TRANSPLANT (własny rozsadnik — bez zmian semantycznych)

```
NEW → SEEDLING_PREPARED → SEEDLING_READY_FOR_TRANSPLANT → IN_GROUND → READY_FOR_FINAL_HARVEST → HARVESTED → CLEARED
```

- Anchor date: `sowedAt` dla fazy rozsadnikowej; `transplantedAt` dla harvest window
- Harvest window: liczony od `transplantedAt`
- Fast-forward do `IN_GROUND`: dozwolony z NEW / SEEDLING_PREPARED / SEEDLING_READY_FOR_TRANSPLANT

### PURCHASED_SEEDLING (nowy)

```
NEW → IN_GROUND → READY_FOR_FINAL_HARVEST → HARVESTED → CLEARED
```

- Anchor date: `transplantedAt` (ustawiany przy przejściu `→ IN_GROUND`, tak jak TRANSPLANT)
- `sowedAt`: NULL
- Harvest window: liczony od `transplantedAt`
- Brak fazy rozsadnikowej — lifecycle identyczny ze ścieżką DIRECT_SOW, ale używa `transplantedAt` zamiast `sowedAt`

---

## 3. Obliczanie harvestWindow

### Jak działa teraz

```typescript
// src/plantings/plantings.service.ts
resolveCultivationStartDate(planting):
  // DIRECT_SOW: status >= IN_GROUND  → zwraca sowedAt ?? plannedStartDate
  // TRANSPLANT: status >= SEEDLING_PREPARED → zwraca sowedAt ?? plannedStartDate
  //             gdy status >= IN_GROUND    → zwraca transplantedAt ?? plannedStartDate

computeHarvestWindow(planting, vegetable):
  cultivationStartDate = resolveCultivationStartDate(planting)
  harvestWindowStart = cultivationStartDate + timeToHarvestDaysMin
  harvestWindowEnd   = cultivationStartDate + timeToHarvestDaysMax
```

### Co trzeba zmienić dla PURCHASED_SEEDLING

`resolveCultivationStartDate` musi obsługiwać nową metodę:

```typescript
// Obecna logika (uproszczona):
if (startMethod === DIRECT_SOW && status >= IN_GROUND) return sowedAt;
if (startMethod === TRANSPLANT && status >= IN_GROUND) return transplantedAt;
if (startMethod === TRANSPLANT && status >= SEEDLING_PREPARED) return sowedAt;

// Pożądana logika po zmianie:
if (startMethod === DIRECT_SOW && status >= IN_GROUND) return sowedAt;
if (startMethod === TRANSPLANT && status >= IN_GROUND) return transplantedAt;
if (startMethod === TRANSPLANT && status >= SEEDLING_PREPARED) return sowedAt;
if (startMethod === PURCHASED_SEEDLING && status >= IN_GROUND)
  return transplantedAt; // ← NOWE
```

---

## 4. Kompatybilność triggerów akcji

| Trigger                            | DIRECT_SOW | TRANSPLANT (własny) | PURCHASED_SEEDLING     |
| ---------------------------------- | ---------- | ------------------- | ---------------------- |
| `ON_SOWED`                         | ✅ sowedAt | ✅ sowedAt          | ❌ NULL — brak sowedAt |
| `AFTER_SOWING_DAYS`                | ✅         | ✅                  | ❌ NULL                |
| `BEFORE_TRANSPLANT_DAYS`           | N/A        | ✅ transplantedAt   | ✅ transplantedAt      |
| `ON_TRANSPLANTED`                  | N/A        | ✅                  | ✅                     |
| `AFTER_TRANSPLANT_DAYS`            | N/A        | ✅                  | ✅                     |
| `ON_HARVEST_WINDOW_START`          | ✅         | ✅                  | ✅                     |
| `BEFORE_HARVEST_WINDOW_START_DAYS` | ✅         | ✅                  | ✅                     |
| `ON_HARVEST_CONFIRMED`             | ✅         | ✅                  | ✅                     |
| `AFTER_HARVEST_DAYS`               | ✅         | ✅                  | ✅                     |

**Wniosek**: Reguły z `applyIfStartMethod: ['TRANSPLANT']` są dziś stosowane do kupionego rozsadnika. Po split:

- Reguły z triggerami `ON_SOWED` / `AFTER_SOWING_DAYS` powinny mieć `applyIfStartMethod: ['TRANSPLANT']` (tylko własny rozsadnik)
- Reguły z triggerami transplantowymi i harvestowymi mogą mieć `applyIfStartMethod: ['TRANSPLANT', 'PURCHASED_SEEDLING']` lub `null` (wszystkie)

---

## 5. Pełna lista plików do zmiany

### 5.1 Enum — wymagana zmiana

**`src/common/enums/planting.enums.ts`**

```typescript
export enum PlantingStartMethod {
  DIRECT_SOW = 'DIRECT_SOW',
  TRANSPLANT = 'TRANSPLANT',
  PURCHASED_SEEDLING = 'PURCHASED_SEEDLING', // ← DODAĆ
}
```

---

### 5.2 Lifecycle — wymagana zmiana

**`src/plantings/planting-lifecycle.ts`**

Zmiany:

1. Dodać `PURCHASED_SEEDLING_PATH = DIRECT_SOW_PATH` (identyczna ścieżka stanów)
2. Zaktualizować `getLifecyclePath()` — dodać case dla PURCHASED_SEEDLING
3. Dodać fast-forward `NEW → IN_GROUND` dla PURCHASED_SEEDLING (tak jak dla DIRECT_SOW)
4. `isStatusAllowedForStartMethod` — rozszerzyć o nową metodę

Obecny fallback `getLifecyclePath` zwraca `TRANSPLANT_PATH` dla nieznanych wartości — po dodaniu nowego enum wartość trafi do tego fallbacku do czasu zmiany kodu.

---

### 5.3 Serwis plantingów — wymagana zmiana

**`src/plantings/plantings.service.ts`**

| Metoda                                              | Zmiana                                                                                                                                    |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --- | ------------------- |
| `initializeTimelineFromStatusChange()`              | Dodać obsługę `PURCHASED_SEEDLING → IN_GROUND`: ustawić `transplantedAt`, `actualStartDate`, `harvestWindow`                              |
| `resolveCultivationStartDate()`                     | Dodać gałąź dla PURCHASED_SEEDLING (patrz sekcja 3)                                                                                       |
| `validatePlantingTimeline()`                        | Obecny kod blokuje `transplantedAt` tylko dla `DIRECT_SOW` — sprawdzić, czy nie ma też blokady dla PURCHASED_SEEDLING gdy zostanie dodany |
| Auto-set `transplantedAt` w `create()` / `update()` | Logika warunkowa `if startMethod === TRANSPLANT` — dodać `                                                                                |     | PURCHASED_SEEDLING` |

---

### 5.4 DTO / Zod schemas — wymagana zmiana

**`src/plantings/dto/planting.schemas.ts`**

`validateTimeline` Zod refine:

```typescript
// Obecny kod:
.refine(
  (v) => v.startMethod !== PlantingStartMethod.DIRECT_SOW || !v.transplantedAt,
  { message: 'transplantedAt nie może być ustawiony dla DIRECT_SOW' }
)

// Po zmianie — upewnić się, że PURCHASED_SEEDLING nie jest blokowany:
// Blokada powinna dotyczyć TYLKO DIRECT_SOW (co jest już poprawne, wymaga weryfikacji)
```

`startMethod: z.nativeEnum(PlantingStartMethod)` — zaakceptuje nową wartość automatycznie.

---

### 5.5 Encja reguły akcji — wymagana zmiana

**`src/vegetables/vegetable-action-rule.entity.ts`**

```typescript
// Obecny typ:
type PlantingStartMethodValue = 'DIRECT_SOW' | 'TRANSPLANT';
const PLANTING_START_METHOD_ITEMS = ['DIRECT_SOW', 'TRANSPLANT'];

// Po zmianie:
type PlantingStartMethodValue =
  | 'DIRECT_SOW'
  | 'TRANSPLANT'
  | 'PURCHASED_SEEDLING';
const PLANTING_START_METHOD_ITEMS = [
  'DIRECT_SOW',
  'TRANSPLANT',
  'PURCHASED_SEEDLING',
];
```

---

### 5.6 Action automation service — wymagana zmiana

**`src/action-tasks/action-automation.service.ts`**

```typescript
// Obecny kod w getCoverage():
const startMethods = [
  PlantingStartMethod.DIRECT_SOW,
  PlantingStartMethod.TRANSPLANT,
] as const;

// Po zmianie:
const startMethods = [
  PlantingStartMethod.DIRECT_SOW,
  PlantingStartMethod.TRANSPLANT,
  PlantingStartMethod.PURCHASED_SEEDLING,
] as const;
```

Filtr `applyIfStartMethod.includes(startMethod)` w `buildCandidatesForPlanting` i `getCoverage` działa generycznie — brak zmian potrzebnych poza rozszerzeniem tablicy.

---

### 5.7 Migracja bazy danych — wymagana

**Nowy plik migracji** (np. `Migration20260602000000.ts`):

```sql
-- Dodanie nowej wartości do postgres enum
ALTER TYPE "plantings_start_method_enum" ADD VALUE IF NOT EXISTS 'PURCHASED_SEEDLING';
```

> ⚠️ **Uwaga**: `ALTER TYPE ... ADD VALUE` w PostgreSQL nie jest transakcyjne (nie można rollbackować). Migracja musi być napisana z tym zastrzeżeniem. Bezpieczna kolejność:
>
> 1. Migracja DB (ALTER TYPE)
> 2. Deploy kodu

---

### 5.8 Seed / dane domyślne — wymagana zmiana

**`src/vegetables/default-vegetables.seed.ts`**

Sprawdzić każdą regułę, która ma `applyIfStartMethod: [PlantingStartMethod.TRANSPLANT]`:

- Reguły z triggerami `ON_SOWED` / `AFTER_SOWING_DAYS` → zostawić `['TRANSPLANT']` (tylko własny rozsadnik)
- Reguły z triggerami transplantowymi → rozszerzyć do `['TRANSPLANT', 'PURCHASED_SEEDLING']`
- Reguły harvest → rozszerzyć do `['TRANSPLANT', 'PURCHASED_SEEDLING']` lub ustawić `null` (wszystkie)

Obecnie seed nie zawiera explicitnych wartości `applyIfStartMethod` — sprawdzić po wdrożeniu.

---

### 5.9 Testy — wymagana zmiana

**`src/action-tasks/action-automation.coverage.spec.ts`**

Linia 39: `applyIfStartMethod: ['DIRECT_SOW']`  
Linia 45: `applyIfStartMethod: ['TRANSPLANT']`  
Linia 51: `applyIfStartMethod: ['TRANSPLANT']`

Dodać testy dla `PURCHASED_SEEDLING`: lifecycle bez fazy rozsadnikowej, `transplantedAt` jako anchor, kompatybilność triggerów.

---

### 5.10 Dokumentacja (README)

**`README.md`** linia 163: przykład JSON z `"applyIfStartMethod": ["DIRECT_SOW"]` — zaktualizować.

---

## 6. Schemat zależności zmian

```
[1] planting.enums.ts         ← fundament, zmiana wymagana przed wszystkim
        ↓
[2] planting-lifecycle.ts     ← ścieżki, fast-forward
[3] planting.schemas.ts       ← Zod, walidacja
[4] vegetable-action-rule.entity.ts ← typ literalny + items array
        ↓
[5] plantings.service.ts      ← initializeTimeline, resolveCultivation, validate
[6] action-automation.service.ts ← getCoverage()
        ↓
[7] DB migration              ← ALTER TYPE
[8] default-vegetables.seed.ts ← reguły dla nowej metody
[9] spec files                ← testy
```

---

## 7. Ryzyka

| Ryzyko                                  | Poziom    | Opis                                                                                                                                                                                                                 |
| --------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ALTER TYPE nie jest transakcyjny        | 🔴 WYSOKI | Jeśli migracja się uruchomi i deploy kodu nie przejdzie, DB ma nową wartość enum, ale stary kod jej nie zna — nieszkodliwe (ignoruje nieznaną wartość), ale ważne do monitorowania                                   |
| Istniejące sadzonki TRANSPLANT          | 🟡 ŚREDNI | Brak migracji danych — istniejące rekordy z `start_method = 'TRANSPLANT'` pozostają jako TRANSPLANT (własny rozsadnik). Kupione rozsadniki dodane przed zmianą mają błędną metodę — do akceptacji lub data migration |
| `getLifecyclePath` fallback             | 🟡 ŚREDNI | Jeśli kod deployed przed migracją DB, PURCHASED_SEEDLING nie istnieje w DB, więc ryzyko minimalne. Odwrotnie — po migracji DB, stary kod trafi do fallbacku TRANSPLANT, co skutkuje nieprawidłową ścieżką stanów     |
| Reguły akcji z applyIfStartMethod: null | 🟢 NISKI  | Reguły bez filtra startMethod są stosowane do wszystkich metod — PURCHASED_SEEDLING je odziedziczy. Weryfikacja semantyczna potrzebna                                                                                |
| Frontend                                | 🟡 ŚREDNI | Trzeba zaktualizować: selektor metody startowej, UI dla nowej ścieżki (brak fazy rozsadnikowej), etykiety                                                                                                            |

---

## 8. Rekomendacja

### Wariant minimalny (zalecany na start)

Dodać `PURCHASED_SEEDLING` jako nową wartość **bez zmiany nazwy TRANSPLANT**. TRANSPLANT pozostaje jako „własny rozsadnik z fazą seedlingową".

Kroki:

1. DB migration: `ALTER TYPE ... ADD VALUE 'PURCHASED_SEEDLING'`
2. `planting.enums.ts` — dodać wartość
3. `planting-lifecycle.ts` — dodać ścieżkę + fast-forward
4. `plantings.service.ts` — 4 miejsca (initializeTimeline, resolveCultivation, validate, auto-set)
5. `planting.schemas.ts` — weryfikacja Zod refine
6. `vegetable-action-rule.entity.ts` — typ + items
7. `action-automation.service.ts` — getCoverage()
8. Seed + testy

**Łączna szacunkowa zmiana**: ~8 plików, ~50-80 linii kodu, 1 migracja SQL.

### Wariant pełny (przyszłościowy)

Przemianowanie `TRANSPLANT → OWN_SEEDLING` dla czytelności semantycznej. Wymaga:

- Migracji danych istniejących rekordów
- Pełnego sprawdzenia frontendu
- Aktualizacji wszystkich miejscach gdzie `TRANSPLANT` jest hardcoded jako string

> **Nie zalecane na tym etapie** — ryzyko data migration + większy zakres frontendu.

---

## 9. Podsumowanie — pełna lista plików do zmiany

| Plik                                                  | Typ zmiany                  | Priorytet     |
| ----------------------------------------------------- | --------------------------- | ------------- |
| `src/common/enums/planting.enums.ts`                  | Dodać wartość enum          | 🔴 WYMAGANE   |
| `src/plantings/planting-lifecycle.ts`                 | Nowa ścieżka + fast-forward | 🔴 WYMAGANE   |
| `src/plantings/plantings.service.ts`                  | 4 miejsca w logice          | 🔴 WYMAGANE   |
| `src/plantings/dto/planting.schemas.ts`               | Weryfikacja Zod refine      | 🔴 WYMAGANE   |
| `src/vegetables/vegetable-action-rule.entity.ts`      | Typ literalny + array       | 🔴 WYMAGANE   |
| `src/action-tasks/action-automation.service.ts`       | `getCoverage()` array       | 🔴 WYMAGANE   |
| Nowa migracja SQL                                     | `ALTER TYPE`                | 🔴 WYMAGANE   |
| `src/vegetables/default-vegetables.seed.ts`           | Reguły dla nowej metody     | 🟡 ZALECANE   |
| `src/action-tasks/action-automation.coverage.spec.ts` | Testy                       | 🟡 ZALECANE   |
| `README.md`                                           | Przykłady                   | 🟢 OPCJONALNE |
