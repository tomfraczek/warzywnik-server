# API: `vegetable-suggestions`

## Autentykacja

| Endpoint                                     | Metoda auth                                   |
| -------------------------------------------- | --------------------------------------------- |
| `POST /v1/vegetable-suggestions`             | Clerk JWT (Bearer token / cookie `__session`) |
| `GET /v1/admin/vegetable-suggestions`        | Header `x-admin-token: <ADMIN_TOKEN>`         |
| `DELETE /v1/admin/vegetable-suggestions/:id` | Header `x-admin-token: <ADMIN_TOKEN>`         |

---

## POST `/v1/vegetable-suggestions`

Zgłoszenie brakującego warzywa przez użytkownika aplikacji.

**Request body:**

```json
{
  "name": "Topinambur",
  "note": "Bardzo popularne, brakuje go na liście"
}
```

| Pole   | Typ      | Wymagane | Walidacja                  |
| ------ | -------- | -------- | -------------------------- |
| `name` | `string` | ✅       | min 2, max 80 znaków, trim |
| `note` | `string` | ❌       | max 500 znaków             |

**Response `201`:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Topinambur",
  "note": "Bardzo popularne, brakuje go na liście",
  "createdAt": "2026-05-26T14:30:00.000Z"
}
```

> `note` może być `null` gdy nie podano.

---

## GET `/v1/admin/vegetable-suggestions`

Lista zgłoszeń posortowana od najnowszych.

**Query params:**

| Param    | Typ      | Domyślnie | Opis                                              |
| -------- | -------- | --------- | ------------------------------------------------- |
| `search` | `string` | —         | Filtrowanie po nazwie (case-insensitive, zawiera) |
| `page`   | `number` | `1`       | Numer strony                                      |
| `limit`  | `number` | `50`      | Maks. 100                                         |

**Response `200`:**

```json
{
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Topinambur",
      "note": "Bardzo popularne, brakuje go na liście",
      "userId": "user_2abc123xyz",
      "createdAt": "2026-05-26T14:30:00.000Z",
      "updatedAt": "2026-05-26T14:30:00.000Z"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 50
}
```

> `note` i `userId` mogą być `null`.

---

## DELETE `/v1/admin/vegetable-suggestions/:id`

Usuwa zgłoszenie po dodaniu warzywa do bazy lub gdy nie jest potrzebne.

**Path param:** `id` — UUID zgłoszenia

**Response `204 No Content`** — brak body

**Response `404`** — gdy zgłoszenie o podanym `id` nie istnieje

---

## TypeScript typy

```ts
// POST body
interface CreateVegetableSuggestionBody {
  name: string; // wymagane, 2–80 znaków
  note?: string; // opcjonalne, max 500 znaków
}

// POST response
interface VegetableSuggestionCreated {
  id: string;
  name: string;
  note: string | null;
  createdAt: string; // ISO 8601
}

// GET admin item
interface VegetableSuggestionAdminItem {
  id: string;
  name: string;
  note: string | null;
  userId: string | null;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

// GET admin response
interface VegetableSuggestionsAdminResponse {
  items: VegetableSuggestionAdminItem[];
  total: number;
  page: number;
  limit: number;
}

// GET admin query
interface VegetableSuggestionsAdminQuery {
  search?: string;
  page?: number; // default: 1
  limit?: number; // default: 50, max: 100
}
```

---

## Kody błędów

| Kod   | Kiedy                                                |
| ----- | ---------------------------------------------------- |
| `400` | Nieprawidłowe dane w body / query (błędy Zod)        |
| `401` | Brak / nieprawidłowy token Clerk lub `x-admin-token` |
| `404` | DELETE — zgłoszenie o podanym `id` nie istnieje      |
| `204` | DELETE — sukces                                      |
