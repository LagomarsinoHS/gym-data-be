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

**JWT** — login/register firman `{ sub: userId, role }`.  
`RolesGuard` + `@Roles(...)` leen el `role` del token (sin lookup a DB).

**Errores de dominio (i18n)** — preferimos body:

```json
{ "code": "COACH_ATHLETE_QUOTA_FULL", "message": "…", "details": { } }
```

El front traduce por `code`. Ver sección [API error codes](#api-error-codes) abajo.

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
| Auth | JWT + **subscription ≠ free** (activa) |
| Respuesta | `200` — `{ zone, equipment[], exercises[] }` (con `role` por slot) |
| Errores | `401` sin JWT; `403` `PAID_SUBSCRIPTION_REQUIRED` |
| Notas | **Legacy** — presets de zona + sample en Mongo; sin OpenAI |

**Query**

| Param | | Notas |
|---|---|---|
| `zone` | Obligatorio | `back` \| `cardio` \| `chest` \| `lower arms` \| `lower legs` \| `neck` \| `shoulders` \| `upper arms` \| `upper legs` \| `waist` |
| `equipment` | Obligatorio | uno o más (comma-separated o repetido) |

Ejemplo: `GET /exercises/recommend?zone=chest&equipment=barbell,dumbbell`

---

### `GET /exercises/recommend2`

| | |
|---|---|
| Auth | JWT + **subscription ≠ free** (activa) |
| Respuesta | `200` — `{ zone, equipment[], note, exercises[4] }` |
| Errores | `401` sin JWT; `403` `PAID_SUBSCRIPTION_REQUIRED`; `400` zona/equipment inválidos o &lt; 4 candidatos; `502`/`503` OpenAI |

Flujo: filtra catálogo por `category=zone` + `equipment ∈ lista` → manda candidatos slim (`id`, `name` en `locale`, `equipment`, `target`) a OpenAI → elige **exactamente 4** ids + `note` en el idioma pedido → resuelve ejercicios del catálogo (nombres siguen bilingües `{ en, es }`).

**Query**

| Param | | Notas |
|---|---|---|
| `zone` | Obligatorio | mismas zonas que recommend |
| `equipment` | Obligatorio | **1 o 2** valores (comma-separated o repetido) |
| `locale` | Opcional | `es` \| `en` (default `es`) — idioma de la `note` |

Ejemplo: `GET /exercises/recommend2?zone=chest&equipment=barbell,dumbbell&locale=es`

```json
{
  "zone": "chest",
  "equipment": ["barbell", "dumbbell"],
  "locale": "es",
  "note": "Prioricé un empuje compuesto…",
  "exercises": [
    {
      "id": "0025",
      "name": { "en": "…", "es": "…" },
      "image": "images/…",
      "gif_url": "videos/…",
      "category": "chest",
      "equipment": "barbell",
      "target": "pectorals"
    }
  ]
}
```

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

Todos requieren **JWT**. El token incluye `{ sub, role }`.  
Rutas con `@Roles(...)` además exigen ese role → `403` si no coincide.

### `GET /users/me`

| | |
|---|---|
| Auth | JWT |
| Body | — |
| Respuesta | `200` — perfil enriquecido (`MeResponseDto`), incluye `subscription` y `profilePhoto: null \| { url, uploadedAt }`. Si el atleta tiene `coachId`, también `coach: { firstName, lastName }`; si no, `coach: null`. Si `role === coach`, también `coachQuota: { athleteLimit, athleteCount, canInvite }`; si no, `coachQuota: null`. |

Al responder, si el user tenía un plan pago (`premium` / `growth` / `pro`) y `expiresAt` ya pasó, el backend lo normaliza a `free` antes de devolverlo.

---

### `PATCH /users/me`

| | |
|---|---|
| Auth | JWT |
| Body | JSON (parcial) |
| Respuesta | `200` — `MeResponseDto` actualizado |
| Errores | `400` sin campos / payload inválido / contraseña actual incorrecta; `404` user |

Al menos uno de: `firstName`, `lastName`, `newPassword`.

| Campo | | Notas |
|---|---|---|
| `firstName` | Opcional | string trim, min 1 |
| `lastName` | Opcional | string trim, min 1 |
| `currentPassword` | Condicional | obligatorio si envías `newPassword` |
| `newPassword` | Opcional | min 4 |
| `confirmNewPassword` | Condicional | obligatorio si `newPassword`; debe coincidir |

```json
{
  "firstName": "Humberto",
  "lastName": "Lagomarsino"
}
```

```json
{
  "currentPassword": "oldPass",
  "newPassword": "newPass",
  "confirmNewPassword": "newPass"
}
```

---

### `POST /users/me/profile-photo`

| | |
|---|---|
| Auth | JWT |
| Body | `multipart/form-data` |
| Respuesta | `200` — `MeResponseDto` actualizado |
| Errores | `400` sin archivo o imagen inválida; `404` user |

**Campos**

| Campo | | Notas |
|---|---|---|
| `profilePhoto` | Obligatorio | imagen jpeg/png/webp, máx 5MB |

Cloudinary: `gym-app/profiles/{userId}/profilePhoto` (overwrite al re-subir). En `/me` se expone solo `{ url, uploadedAt }` (sin `publicId`).

---

### `GET /users/me/pending-coach-invite`

| | |
|---|---|
| Auth | JWT + **athlete** |
| Body | — |
| Respuesta | `200` — `{ invite: null \| { coachId, invitedAt, coach } }` |
| Errores | `403` si el role no es athlete |

---

### `POST /users/me/pending-coach-invite/respond`

| | |
|---|---|
| Auth | JWT + **athlete** |
| Respuesta | `200` — `MeResponseDto` |
| Errores | `403` si el role no es athlete, o cupo del coach lleno (`COACH_ATHLETE_QUOTA_FULL` — se cancelan **todas** las pending de ese coach) |
| Errores | `409` `NO_PENDING_COACH_INVITE` |

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

### `POST /users/me/progress-photos`

| | |
|---|---|
| Auth | JWT + **athlete** |
| Body | `multipart/form-data` |
| Respuesta | `201` — `{ yearMonth, weightKg, front, back }` (`front`/`back` = `{ url, uploadedAt }` o `null`) |
| Errores | `403` si el role no es athlete; `400` sin peso, sin fotos, o imagen inválida |

**Campos**

| Campo | | Notas |
|---|---|---|
| `weightKg` | Obligatorio | número 20–400 (kg); se guarda en el mes UTC actual y actualiza `currentWeightKg` |
| `front` | Condicional | imagen jpeg/png/webp, máx 5MB |
| `back` | Condicional | imagen jpeg/png/webp, máx 5MB |

Hace falta **al menos uno** de `front` / `back` (pueden ir los dos). Upsert del mes UTC actual en `user.progressPhotos`; setea `weightKg` del mes; recalcula `User.currentWeightKg` (peso del `yearMonth` más reciente con peso). Re-subir el mismo lado sobrescribe vía `publicId` fijo (`front`/`back`) + overwrite.

---

### `DELETE /users/me`

| | |
|---|---|
| Auth | JWT |
| Body | JSON |
| Respuesta | `200` — `{ ok: true }` |
| Errores | `404` si el email no existe (o ya está dado de baja); `403` si el email no pertenece al usuario del JWT |

Soft-delete: solo setea `deletedAt`. No limpia `coachId` ni relaciones. El usuario deja de aparecer en listados (filtro `deletedAt` ausente) y no puede volver a loguearse con ese email.

**Body**

| Campo | | Notas |
|---|---|---|
| `email` | Obligatorio | debe coincidir con el usuario autenticado |

```json
{ "email": "user@example.com" }
```

---

### `DELETE /users/me/progress-photos`

| | |
|---|---|
| Auth | JWT + **athlete** |
| Body | JSON |
| Respuesta | `200` — `{ yearMonth, front, back }` (estado del mes tras el delete; ambos `null` si se borró el mes entero) |
| Errores | `403` si no es athlete; `404` si no hay mes / side; `400` yearMonth inválido |

**Body**

| Campo | | Notas |
|---|---|---|
| `yearMonth` | Obligatorio | `YYYY-MM` |
| `side` | Opcional | `front` \| `back`. Si falta → borra mes completo (assets + carpeta Cloudinary) |

```json
{ "yearMonth": "2026-08", "side": "front" }
```

```json
{ "yearMonth": "2026-08" }
```

---

### `GET /users/:userId/progress-photos`

| | |
|---|---|
| Auth | JWT |
| Query | `year` opcional (ej. `2026`) |
| Respuesta | `200` — `{ currentWeightKg, years: [{ year, months: [{ month, yearMonth, weightKg, front, back }] }] }` (años/meses más nuevos primero; `front`/`back` = `{ url, uploadedAt }` o `null`) |
| Authz | `userId === jwt.sub` **o** coach con `athlete.coachId === jwt.sub` |
| Errores | `403` si no autorizado; `404` si el user no existe |

```http
GET /users/{userId}/progress-photos
GET /users/{userId}/progress-photos?year=2026
```

---

### `POST /users/:userId/progress-photos/analyze`

| | |
|---|---|
| Auth | JWT + **coach** + **subscription ≠ free** (activa) |
| Body | `{ yearMonths: [YYYY-MM, YYYY-MM], locale? }` |
| Respuesta | `200` — `{ analysis }` texto libre de OpenAI |
| Authz | JWT + **coach** + **subscription ≠ free** |
| Errores | `401` sin JWT; `403` role / `PAID_SUBSCRIPTION_REQUIRED`; `400` meses inválidos; `404` atleta; `502`/`503` OpenAI |

El BE pasa a OpenAI las fotos `older` (antes) y `newer` (actuales) con las URLs de Cloudinary disponibles.

**Body**

| Campo | | Notas |
|---|---|---|
| `yearMonths` | Obligatorio | exactamente **2** meses distintos `YYYY-MM` (se ordenan older/newer) |
| `locale` | Opcional | `es` \| `en` (default `es`) |

```http
POST /users/{userId}/progress-photos/analyze
```

```json
{
  "yearMonths": ["2026-08", "2026-09"],
  "locale": "es"
}
```

```json
{
  "analysis": "Se observa mejor definición en torso y espalda… En frente… En espalda…"
}
```

---

### `GET /users/coach/athletes`

| | |
|---|---|
| Auth | JWT + **coach** |
| Respuesta | `200` — paginado de `MeResponseDto` |
| Errores | `403` si el role no es coach |

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
| Auth | JWT + **coach** |
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
| Auth | JWT + **coach** |
| Respuesta | `201` — `{ ok: true }` |
| Errores | `403` si ya alcanzó la cuota (`code: COACH_ATHLETE_QUOTA_FULL`). Cupos: `free` 5 / `growth` 10 / `pro` 20 |
| Errores | `404` `ATHLETE_NOT_FOUND_BY_EMAIL` · `409` `ATHLETE_HAS_PENDING_INVITE` |

Pending invites **no** cuentan para la cuota; solo athletes con `coachId` asignado.

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
| Auth | JWT + **coach** |
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
| Auth | JWT + **coach** |
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

## Admin

Requieren **JWT** con **role `admin`**.

### `POST /admin/subscriptions/grant`

| | |
|---|---|
| Auth | JWT + **admin** |
| Respuesta | `200` — `MeResponseDto` con el `plan` solicitado |
| Errores | `403` si el role no es admin |

**Body**

| Campo | | Notas |
|---|---|---|
| `email` | Obligatorio | email único del target |
| `plan` | Obligatorio | `premium` \| `growth` \| `pro` (no `free`) |
| `durationDays` | Opcional† | días desde ahora (1–3650). Default **30** si no mandás `expiresAt` |
| `expiresAt` | Opcional† | fecha `YYYY-MM-DD`; el plan dura hasta el **final de ese día UTC** |

† Podés omitir ambos (`durationDays` / `expiresAt`) → 30 días. No mandar los dos a la vez.

Athlete → suele usarse `premium`. Coach → `growth` o `pro` (`premium` en un coach cae al cupo free).

```json
{
  "email": "athlete@example.com",
  "plan": "premium"
}
```

```json
{
  "email": "coach@example.com",
  "plan": "growth",
  "durationDays": 7
}
```

```json
{
  "email": "coach@example.com",
  "plan": "pro",
  "expiresAt": "2026-09-03"
}
```

---

### `POST /admin/subscriptions/revoke`

| | |
|---|---|
| Auth | JWT + **admin** |
| Respuesta | `200` — `MeResponseDto` con `subscription.plan: free` |
| Errores | `403` si el role no es admin |

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
| SubscriptionPlan | `free`, `premium`, `growth`, `pro` |
| InviteStatus | `pending`, `accepted`, `rejected`, `cancelled` |
| Invite respond `action` | `accept`, `reject` |

### Cupos de alumnos (coach)

| Plan | Máx. athletes asociados |
|---|---|
| `free` / `premium`* | 5 |
| `growth` | 10 |
| `pro` | 20 |

\* `premium` es solo para athletes. Un coach no debería tenerlo; si aparece, el cupo cae a free (5).

Coach pago = `growth` o `pro` (implica “premium” en sentido de plan pago: `plan !== 'free'`).

## API error codes

Códigos estables para i18n en el client (`code` + `message` EN de debug):

| Code | HTTP | Cuándo |
|---|---|---|
| `COACH_ATHLETE_QUOTA_FULL` | 403 | Coach invita con cupo lleno, o atleta acepta y el coach ya está al límite |
| `ATHLETE_NOT_FOUND_BY_EMAIL` | 404 | Invite a email que no es athlete |
| `ATHLETE_HAS_PENDING_INVITE` | 409 | Athlete ya tiene una invite pending |
| `NO_PENDING_COACH_INVITE` | 409 | Respond sin pending |
| `CURRENT_PASSWORD_INCORRECT` | 400 | `PATCH /users/me` con `newPassword` y contraseña actual incorrecta |
| `OPENAI_NOT_CONFIGURED` | 503 | Llamada a `OpenAiService` sin `OPENAI_API_KEY` |
| `OPENAI_REQUEST_FAILED` | 502 | Error / respuesta vacía o JSON inválido de OpenAI |
| `PAID_SUBSCRIPTION_REQUIRED` | 403 | `recommend` / `recommend2` / `progress-photos/analyze` con plan free o pago vencido |

Helpers: `src/common/errors/api-http.exception.ts`.

## Shape de `subscription` (en user /me)

```json
{
  "plan": "free",
  "startedAt": null,
  "expiresAt": null
}
```

Premium (athlete) ejemplo:

```json
{
  "plan": "premium",
  "startedAt": "2026-08-03T15:00:00.000Z",
  "expiresAt": "2026-09-02T23:59:59.999Z"
}
```

Growth (coach) ejemplo:

```json
{
  "plan": "growth",
  "startedAt": "2026-08-03T15:00:00.000Z",
  "expiresAt": "2026-09-02T23:59:59.999Z"
}
```

`coachQuota` (solo si `role === coach`):

```json
{
  "athleteLimit": 5,
  "athleteCount": 3,
  "canInvite": true
}
```

---

## Resumen rápido

| Módulo | Cantidad | Auth |
|---|---|---|
| Auth | 2 | público |
| Exercises | 6 | público |
| Users | 16 | JWT |
| Admin | 2 | JWT + admin (grant, revoke) |
| **Total** | **27** | |
