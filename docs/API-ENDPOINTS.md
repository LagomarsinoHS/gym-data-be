# Gym Data API — Endpoints

Catálogo de todos los endpoints del backend.  
Base URL: sin prefijo global (ej. `http://localhost:3000`).  
Swagger: `GET /docs`.

**Leyenda de campos**

- **Obligatorio** — debe enviarse
- **Opcional** — puede omitirse
- **XOR** — exactamente uno de los campos del grupo
- **Auth** — `Authorization: Bearer <accessToken>` cuando dice JWT

Validación fallida → `400` con `{ message: "Validation failed", errors: string[] }`.

---

## Auth

### `POST /auth/register`

| | |
|---|---|
| Auth | No |
| Respuesta | `201` — `{ accessToken, user }` |

**Body**

| Campo | | Notas |
|---|---|---|
| `email` | Obligatorio | email válido |
| `password` | Obligatorio | mín. 4 caracteres |
| `firstName` | Obligatorio | |
| `lastName` | Obligatorio | |
| `role` | Opcional | `athlete` \| `coach` (default: `athlete`). `admin` no se registra por API |

```json
{
  "email": "athlete@example.com",
  "password": "secret",
  "firstName": "Ada",
  "lastName": "Lovelace",
  "role": "athlete"
}
```

---

### `POST /auth/login`

| | |
|---|---|
| Auth | No |
| Respuesta | `200` — `{ accessToken, user }` |

**Body**

| Campo | | Notas |
|---|---|---|
| `email` | Obligatorio | |
| `password` | Obligatorio | mín. 4 caracteres |

```json
{
  "email": "athlete@example.com",
  "password": "secret"
}
```

---

## Exercises

Todos públicos (sin JWT).

### `GET /exercises`

| | |
|---|---|
| Auth | No |
| Respuesta | `200` — `{ data, page, limit, total, pages }` |

**Query**

| Param | | Notas |
|---|---|---|
| `page` | Opcional | default `1`, mín. 1 |
| `limit` | Opcional | default `50`, máx. 100 |
| `category` | Opcional | |
| `bodyPart` | Opcional | |
| `target` | Opcional | |
| `equipment` | Opcional | |
| `muscleGroup` | Opcional | |
| `search` | Opcional | búsqueda de texto |

Ejemplo: `GET /exercises?page=1&limit=20&category=chest&search=press`

---

### `GET /exercises/labels`

| | |
|---|---|
| Auth | No |
| Body | — |
| Respuesta | `200` — `{ category[], equipment[], target[] }` |

---

### `GET /exercises/random`

| | |
|---|---|
| Auth | No |
| Body | — |
| Respuesta | `200` — un `Exercise` |

---

### `GET /exercises/recommend`

| | |
|---|---|
| Auth | No |
| Respuesta | `200` — `{ zone, equipment[], exercises[] }` |

**Query**

| Param | | Notas |
|---|---|---|
| `zone` | Obligatorio | `back` \| `cardio` \| `chest` \| `lower arms` \| `lower legs` \| `neck` \| `shoulders` \| `upper arms` \| `upper legs` \| `waist` |
| `equipment` | Obligatorio | uno o más (comma-separated o repetido) |

Ejemplo: `GET /exercises/recommend?zone=chest&equipment=barbell,dumbbell`

---

### `GET /exercises/:id`

| | |
|---|---|
| Auth | No |
| Path | `id` — id del ejercicio (ej. `0001`) |
| Body | — |
| Respuesta | `200` — `Exercise` |

---

## Users

Todos requieren **JWT**.  
Varias rutas tienen comentario `TODO: RolesGuard` (hoy no hay enforcement estricto por rol en el guard).

### `GET /users/me`

| | |
|---|---|
| Auth | JWT |
| Body | — |
| Respuesta | `200` — perfil enriquecido (`MeResponseDto`), incluye `subscription` |

Al responder, si el user era `premium` y `expiresAt` ya pasó, el backend lo normaliza a `free` antes de devolverlo.

---

### `GET /users/me/pending-coach-invite`

| | |
|---|---|
| Auth | JWT |
| Pensado para | athlete |
| Body | — |
| Respuesta | `200` — `{ invite: null \| { coachId, invitedAt, coach } }` |

---

### `POST /users/me/pending-coach-invite/respond`

| | |
|---|---|
| Auth | JWT |
| Pensado para | athlete |
| Respuesta | `200` — `MeResponseDto` |

**Body**

| Campo | | Notas |
|---|---|---|
| `action` | Obligatorio | `accept` \| `reject` |

```json
{
  "action": "accept"
}
```

---

### `GET /users/coach/athletes`

| | |
|---|---|
| Auth | JWT |
| Pensado para | coach |
| Respuesta | `200` — paginado de `MeResponseDto` |

**Query**

| Param | | Notas |
|---|---|---|
| `page` | Opcional | default `1` |
| `limit` | Opcional | default `50`, máx. 100 |
| `search` | Opcional | filtra por nombre o email |

---

### `GET /users/coach/invites`

| | |
|---|---|
| Auth | JWT |
| Pensado para | coach |
| Respuesta | `200` — paginado de invites |

**Query**

| Param | | Notas |
|---|---|---|
| `page` | Opcional | default `1` |
| `limit` | Opcional | default `50`, máx. 100 |
| `status` | Opcional | `pending` \| `accepted` \| `rejected` \| `cancelled` |

---

### `GET /users/:id`

| | |
|---|---|
| Auth | JWT |
| Path | `id` — UUID del user |
| Body | — |
| Respuesta | `200` — `MeResponseDto` |

---

### `POST /users/coach/invites`

| | |
|---|---|
| Auth | JWT |
| Pensado para | coach |
| Respuesta | `201` — `{ ok: true }` |

**Body**

| Campo | | Notas |
|---|---|---|
| `email` | Obligatorio | email de un athlete existente |

```json
{
  "email": "athlete@example.com"
}
```

---

### `POST /users/coach/training-program/export`

| | |
|---|---|
| Auth | JWT |
| Pensado para | coach |
| Respuesta | `200` — archivo binario (`.xlsx` o `.zip`) |

**Body**

| Campo | | Notas |
|---|---|---|
| `athleteIds` | Obligatorio | array de UUIDs; **`[]` = exportar todos** los alumnos del coach |
| `locale` | Opcional | `es` \| `en` (default: `es`) |

```json
{
  "athleteIds": ["a3f1c8e2-4b9d-4e1a-9c7f-2d8e6b1a0f45"],
  "locale": "es"
}
```

```json
{
  "athleteIds": [],
  "locale": "en"
}
```

---

### `POST /users/training-program`

Agrega ejercicios al plan propio del user autenticado.

| | |
|---|---|
| Auth | JWT |
| Respuesta | `200` — `MeResponseDto` |

**Body**

| Campo | | Notas |
|---|---|---|
| `exerciseIds` | Obligatorio | array con ≥ 1 id de ejercicio |

```json
{
  "exerciseIds": ["0001", "0002"]
}
```

---

### `PUT /users/training-program/remove`

| | |
|---|---|
| Auth | JWT |
| Respuesta | `200` — `MeResponseDto` |

**Body**

| Campo | | Notas |
|---|---|---|
| `exerciseId` | Obligatorio | |

```json
{
  "exerciseId": "0001"
}
```

---

### `PUT /users/training-program/:exerciseId`

| | |
|---|---|
| Auth | JWT |
| Path | `exerciseId` — id de ejercicio en el plan |
| Respuesta | `200` — `MeResponseDto` |

**Body** — **al menos uno** de los campos siguientes es obligatorio:

| Campo | | Notas |
|---|---|---|
| `sets` | Opcional* | entero ≥ 1 |
| `reps` | Opcional* | string (ej. `"8-12"`) |
| `rest` | Opcional* | entero ≥ 0 (segundos) |
| `notes` | Opcional* | string; `""` permitido |

```json
{
  "sets": 3,
  "reps": "8-12",
  "rest": 90,
  "notes": "Controlar la bajada"
}
```

---

### `PUT /users/coach/athletes/:athleteId/training-program`

Reemplaza por completo el `coachTrainingProgram` del athlete.

| | |
|---|---|
| Auth | JWT |
| Pensado para | coach |
| Path | `athleteId` — UUID |
| Respuesta | `200` — `MeResponseDto` del athlete |

**Body**

| Campo | | Notas |
|---|---|---|
| `coachTrainingProgram` | Obligatorio | array (puede ser `[]` para vaciar) |

Cada sesión:

| Campo | | Notas |
|---|---|---|
| `id` | Obligatorio | UUID de la sesión |
| `name` | Obligatorio | |
| `order` | Obligatorio | entero ≥ 0 |
| `items` | Obligatorio | array de ejercicios |

Cada item:

| Campo | | Notas |
|---|---|---|
| `exerciseId` | Obligatorio | |
| `order` | Opcional | |
| `sets` | Opcional | |
| `reps` | Opcional | |
| `rest` | Opcional | |
| `notes` | Opcional | |

```json
{
  "coachTrainingProgram": [
    {
      "id": "a3f1c8e2-4b9d-4e1a-9c7f-2d8e6b1a0f45",
      "name": "Día A - Empuje",
      "order": 0,
      "items": [
        {
          "exerciseId": "0001",
          "order": 0,
          "sets": 3,
          "reps": "8-12",
          "rest": 90,
          "notes": "Controlar la bajada"
        }
      ]
    }
  ]
}
```

---

## Admin (dev / testing)

Requieren **JWT**, pero **cualquier usuario autenticado** puede llamarlos hoy.  
Antes de producción: restringir a `Role.Admin`.

### `POST /admin/subscriptions/grant`

| | |
|---|---|
| Auth | JWT (cualquier rol, temporal) |
| Respuesta | `200` — `MeResponseDto` con `subscription.plan: premium` |

**Body**

| Campo | | Notas |
|---|---|---|
| `email` | Obligatorio | email único del target |
| `durationDays` | Opcional† | días desde ahora (1–3650). Default **1** si no mandás `expiresAt` |
| `expiresAt` | Opcional† | fecha `YYYY-MM-DD`; el premium dura hasta el **final de ese día UTC** |

† Podés omitir ambos (`durationDays` / `expiresAt`) → 1 días. No mandar los dos a la vez.

```json
{
  "email": "athlete@example.com"
}
```

```json
{
  "email": "athlete@example.com",
  "durationDays": 7
}
```

```json
{
  "email": "athlete@example.com",
  "expiresAt": "2026-09-03"
}
```

---

### `POST /admin/subscriptions/revoke`

| | |
|---|---|
| Auth | JWT (cualquier rol, temporal) |
| Respuesta | `200` — `MeResponseDto` con `subscription.plan: free` |

**Body**

| Campo | | Notas |
|---|---|---|
| `email` | Obligatorio | email único del target |

```json
{
  "email": "athlete@example.com"
}
```

---

## Enums útiles

| Enum | Valores |
|---|---|
| Role | `athlete`, `coach`, `admin` |
| SubscriptionPlan | `free`, `premium` |
| InviteStatus | `pending`, `accepted`, `rejected`, `cancelled` |
| Invite respond `action` | `accept`, `reject` |

## Shape de `subscription` (en user /me)

```json
{
  "plan": "free",
  "startedAt": null,
  "expiresAt": null
}
```

Premium ejemplo:

```json
{
  "plan": "premium",
  "startedAt": "2026-08-03T15:00:00.000Z",
  "expiresAt": "2026-09-02T15:00:00.000Z"
}
```

---

## Resumen rápido

| Módulo | Cantidad | Auth |
|---|---|---|
| Auth | 2 | público |
| Exercises | 5 | público |
| Users | 13 | JWT |
| Admin | 2 | JWT (sin check de admin aún) |
| **Total** | **22** | |
