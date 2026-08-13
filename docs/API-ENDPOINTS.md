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
| Respuesta | `201` — `{ accessToken }` (el perfil completo se obtiene con `GET /users/me`) |
| Notas | Setea `lastLoginAt` al crear la cuenta |

**Body**

| Campo | | Notas |
|---|---|---|
| `email` | Obligatorio | email válido (se normaliza a minúsculas) |
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
| Respuesta | `200` — `{ accessToken }` |
| Notas | Cuentas soft-deleted (`deletedAt`) se tratan como credenciales inválidas. Actualiza `lastLoginAt`. |

**Body**

| Campo | | Notas |
|---|---|---|
| `email` | Obligatorio | se normaliza a minúsculas |
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
| Respuesta | `200` — `{ zone, equipment[], locale, note, exercises[4] }` (cada ejercicio con `sets` / `reps` / `rest`) |
| Errores | `401` sin JWT; `403` `PAID_SUBSCRIPTION_REQUIRED`; `400` zona/equipment inválidos o &lt; 4 candidatos; `502`/`503` AI |

Flujo: filtra catálogo por `category=zone` + `equipment ∈ lista` → manda candidatos slim (`id`, `name` en `locale`, `equipment`, `target`) a `AiService` (Gemini) → elige **exactamente 4** ids con `sets`/`reps`/`rest` + `note` en el idioma pedido → resuelve ejercicios del catálogo (nombres siguen bilingües `{ en, es }`).

**Query**

| Param | | Notas |
|---|---|---|
| `zone` | Obligatorio | category del catálogo (mismas que `GET /exercises/labels` → `category`) |
| `equipment` | Obligatorio | **1 o 2** valores (comma-separated o repetido) |
| `locale` | Opcional | `es` \| `en` (default `es`) — idioma de la `note` |

Ejemplo: `GET /exercises/recommend?zone=chest&equipment=barbell,dumbbell&locale=es`

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
      "target": "pectorals",
      "sets": 3,
      "reps": "8-10",
      "rest": 90
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
| Respuesta | `200` — perfil enriquecido (`MeResponseDto`), incluye `subscription`, `profilePhoto`, `profile: { firstName, lastName, heightCm, sex, birthDate }`, `goal` a nivel raíz, y `lastLoginAt`. Si el atleta tiene `coachId`, también `coach: { firstName, lastName }`; si no, `coach: null`. Si `role === coach`, también `coachQuota: { athleteLimit, athleteCount, canInvite }`; si no, `coachQuota: null`. No incluye `nutrition`, `progressPhotos` ni `coachTemplates` (endpoints dedicados). |

Al responder, si el user tenía un plan pago (`premium` / `growth` / `pro`) y `expiresAt` ya pasó, el backend lo normaliza a `free` antes de devolverlo.

---

### `PATCH /users/me`

| | |
|---|---|
| Auth | JWT |
| Body | JSON (parcial) |
| Respuesta | `200` — `MeResponseDto` actualizado |
| Errores | `400` sin campos / payload inválido / contraseña actual incorrecta; `404` user |

Al menos uno de: `profile`, `goal`, `newPassword`.

Los campos dentro de `profile` y `goal` aceptan `null` para limpiar (excepto `firstName` / `lastName`, que no se vacían).

| Campo | | Notas |
|---|---|---|
| `profile.firstName` | Opcional | string trim, min 1 |
| `profile.lastName` | Opcional | string trim, min 1 |
| `profile.heightCm` | Opcional | entero 50–300, o `null` |
| `profile.sex` | Opcional | `male` \| `female` \| `other` \| `prefer_not_to_say`, o `null` |
| `profile.birthDate` | Opcional | `YYYY-MM-DD`, o `null` |
| `goal` | Opcional | `strength` \| `hypertrophy` \| `fat_loss` \| `general`, o `null` (top-level) |
| `currentPassword` | Condicional | obligatorio si envías `newPassword` |
| `newPassword` | Opcional | min 4 |
| `confirmNewPassword` | Condicional | obligatorio si `newPassword`; debe coincidir |

```json
{
  "profile": {
    "firstName": "Humberto",
    "lastName": "Lagomarsino",
    "heightCm": 175,
    "sex": "male",
    "birthDate": "1995-06-15"
  },
  "goal": "hypertrophy"
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

### `DELETE /users/me/coach`

| | |
|---|---|
| Auth | JWT + **athlete** |
| Body | — |
| Respuesta | `200` — `MeResponseDto` (`coach: null`, `coachId: null`) |
| Errores | `403` si el role no es athlete; `409` `NO_COACH_ASSIGNED` si no hay coach |

Quita el vínculo (`coachId = null`). No borra `nutrition`, `nutritionPlans`, `coachTrainingProgram` ni fotos. No es baja de cuenta.

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
| Errores | `403` si el role no es athlete; `400` sin peso, sin fotos, imagen inválida, o `yearMonth` inválido/futuro |

**Campos**

| Campo | | Notas |
|---|---|---|
| `weightKg` | Obligatorio | número 20–400 (kg); se guarda en el mes elegido y actualiza `currentWeightKg` |
| `yearMonth` | Opcional | `YYYY-MM` (UTC). Si se omite → mes UTC actual. No admite meses futuros. |
| `front` | Condicional | imagen jpeg/png/webp, máx 5MB |
| `back` | Condicional | imagen jpeg/png/webp, máx 5MB |

Hace falta **al menos uno** de `front` / `back` (pueden ir los dos). Upsert del mes indicado (o el UTC actual si no hay `yearMonth`) en `user.progressPhotos`; setea `weightKg` del mes; recalcula `User.currentWeightKg` (peso del `yearMonth` más reciente con peso). Re-subir el mismo lado sobrescribe vía `publicId` fijo (`front`/`back`) + overwrite.

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
| Respuesta | `200` — `{ sections: [{ title, blocks }] }` JSON estructurado de la IA |
| Authz | Coach autenticado con `athlete.coachId === jwt.sub` (+ plan pago) |
| Errores | `401` sin JWT; `403` role / no assigned / `PAID_SUBSCRIPTION_REQUIRED`; `400` meses inválidos; `404` atleta; `502` AI |

El BE descarga las fotos `older` (antes) y `newer` (actuales) desde Cloudinary y las envía a Gemini (con el texto del prompt).

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
  "sections": [
    {
      "title": "Análisis General",
      "blocks": [
        { "type": "paragraph", "text": "Se observa mejor definición en torso…" }
      ]
    },
    {
      "title": "Principales Avances",
      "blocks": [
        {
          "type": "subtitle",
          "title": "Hipertrofia pectoral",
          "text": "Mayor proyección del pecho en la vista lateral…"
        }
      ]
    }
  ]
}
```

---

### `GET /users/coach/athletes`

| | |
|---|---|
| Auth | JWT + **coach** |
| Respuesta | `200` — paginado de `CoachAthleteListItemDto` (`id`, `email`, `profile`, `goal`, `currentWeightKg`, `coachTrainingProgram` enriquecido). No incluye `trainingProgram` / `subscription` / `coachQuota` |
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

### `POST /users/coach/invites`

| | |
|---|---|
| Auth | JWT + **coach** |
| Respuesta | `201` — `{ ok: true }` |
| Errores | `403` si ya alcanzó la cuota (`code: COACH_ATHLETE_QUOTA_FULL`). Cupos: `free` 5 / `growth` 10 / `pro` 20 |
| Errores | `409` `ATHLETE_HAS_PENDING_INVITE` · `409` `EMAIL_NOT_AN_ATHLETE` (email es coach/admin) · `409` `ALREADY_YOUR_ATHLETE` · `409` `ATHLETE_ALREADY_HAS_COACH` |

El atleta **puede no existir aún**. Se crea un invite `pending` por email (`athleteId: null`). Al **registrarse** como athlete con ese email se vincula `athleteId`. Los `pending` sin respuesta se **eliminan a las 24h** (TTL Mongo + cleanup oportunista).

Pending invites **no** cuentan para la cuota; solo athletes con `coachId` asignado.

**Body**

| Campo | | Notas |
|---|---|---|
| `email` | Obligatorio | email del atleta (registrado o no) |

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
| Respuesta | `200` — archivo binario (`.xlsx`, `.pdf` o `.zip`) |

**Body**

| Campo | | Notas |
|---|---|---|
| `athleteIds` | Obligatorio | array de UUIDs; **`[]` = exportar todos** los alumnos del coach |
| `locale` | Opcional | `es` \| `en` (default: `es`) — headers y nombres de ejercicios |
| `format` | Opcional | `xlsx` \| `pdf` (default: `xlsx`) |

**Comportamiento**

- Un alumno → un `.xlsx` o `.pdf`
- Varios alumnos → `.zip` con un archivo por alumno
- Alumnos sin `coachTrainingProgram` se omiten
- Excel/PDF: una hoja/documento por atleta; sesiones apiladas con gap; bloques por categoría del catálogo (colores fijos)

```json
{
  "athleteIds": ["a3f1c8e2-4b9d-4e1a-9c7f-2d8e6b1a0f45"],
  "locale": "es",
  "format": "pdf"
}
```

```json
{
  "athleteIds": [],
  "locale": "en",
  "format": "xlsx"
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

### `GET /coach/templates`

Plantillas de sesión reutilizables del coach autenticado (módulo `CoachTemplatesModule`; embebidas en `User.coachTemplates`).

| | |
|---|---|
| Auth | JWT + **coach** |
| Respuesta | `200` — `{ coachTemplates }` enriquecido (catalog exercise en cada item) |
| Errores | `403` si no es coach |

### `POST /coach/templates`

Crea una plantilla. El **servidor asigna el `id`** (UUID). El cliente no envía `id`.

| | |
|---|---|
| Auth | JWT + **coach** |
| Respuesta | `201` — `{ template }` enriquecido |
| Errores | `403` si no es coach |

**Body**

| Campo | | Notas |
|---|---|---|
| `name` | Obligatorio | 1–80 chars |
| `order` | Opcional | default = append al final |
| `items` | Opcional | default `[]`; mismos campos de item que el plan (exerciseId, …) |

### `PUT /coach/templates`

Reemplaza por completo `coachTemplates` del coach (útil para editar/reordenar/guardar items). Preferir `POST` para altas nuevas.

| | |
|---|---|
| Auth | JWT + **coach** |
| Respuesta | `200` — `{ coachTemplates }` enriquecido |
| Errores | `403` si no es coach |

**Body**

| Campo | | Notas |
|---|---|---|
| `coachTemplates` | Obligatorio | array (puede ser `[]` para vaciar). Misma forma que `coachTrainingProgram` (id, name, order, items) |

No se expone en `GET /users/me`.

### `POST /coach/templates/apply`

Copia **1..N plantillas** al plan de **1..N alumnos** (producto cartesiano). El **id de la sesión = id de la plantilla**. Si el par ya existe, se omite. Una escritura por alumno.

Único endpoint de apply (reemplaza los antiguos `:id/apply` y `apply-batch`).

| | |
|---|---|
| Auth | JWT + **coach** |
| Respuesta | `200` — `{ applied, skipped, failedAthletes, failedTemplates, sessions }` |
| Errores | `403` si no es coach |

**Body**

| Campo | | Notas |
|---|---|---|
| `templateIds` | Obligatorio | 1–50 ids; duplicados se ignoran |
| `athleteIds` | Obligatorio | 1–50 ids; duplicados se ignoran |

`applied` / `skipped` = pares `{ athleteId, templateId }`.  
`failedAthletes` = athlete no existe / no es athlete / no es tuyo.  
`failedTemplates` = plantilla inexistente en la biblioteca del coach.  
`sessions` = copias enriquecidas (únicas por template id) de las que se aplicaron al menos una vez.

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

### `GET /users/coach/athletes/:athleteId/nutrition`

Perfil nutricional del atleta (hábitos, preferencias, restricciones). No se expone en `GET /users/me`.

| | |
|---|---|
| Auth | JWT + **coach** |
| Path | `athleteId` — UUID |
| Respuesta | `200` — `AthleteNutritionDto` (defaults vacíos si nunca se guardó) |
| Errores | `403` si no es el coach asignado; `404` si el atleta no existe |

Campos: `dailyActivity` (`sedentary` \| `standing` \| `active` \| `demanding`), `trainingsPerWeek`, `avgDurationMin`, `dailySteps`, `weeklyCardioMin`, `extraActivity`, `trainingTime` (`HH:mm`), `trainFasted` (`after_meal` \| `fasted`), `meals[]` (`name`, `time`), `likes[]`, `avoids[]`, `dietType` (`none` \| `vegetarian` \| `vegan` \| `other`), `restrictions[]`, `notes`, `updatedAt`, `updatedBy` (`{ id, firstName, lastName }` o `null`; un string legacy se normaliza a `{ id, firstName: '', lastName: '' }`).

---

### `PUT /users/coach/athletes/:athleteId/nutrition`

Reemplaza el perfil nutricional. Authz igual que el GET. Tags de alimentos se normalizan a Title Case sin tildes.

| | |
|---|---|
| Auth | JWT + **coach** |
| Path | `athleteId` — UUID |
| Respuesta | `200` — `AthleteNutritionDto` guardado (`updatedAt` + snapshot `updatedBy` del coach) |
| Errores | `400` payload inválido; `403` / `404` igual que el GET |

**Body** (todos opcionales / nullable; omitido → `null` o `[]`)

| Campo | | Notas |
|---|---|---|
| `dailyActivity` | Opcional | enum o `null` |
| `trainingsPerWeek` | Opcional | 0–14 o `null` |
| `avgDurationMin` | Opcional | 0–300 o `null` |
| `dailySteps` | Opcional | 0–100000 o `null` |
| `weeklyCardioMin` | Opcional | 0–1000 o `null` |
| `extraActivity` | Opcional | string o `null` |
| `trainingTime` | Opcional | `HH:mm` o `null` |
| `trainFasted` | Opcional | enum o `null` |
| `meals` | Opcional | máx. 8; `name` 1–80; `time` `HH:mm` o `null` |
| `likes` / `avoids` / `restrictions` | Opcional | máx. 30 tags × 40 chars |
| `dietType` | Opcional | enum o `null` |
| `notes` | Opcional | máx. 2000 o `null` |

```json
{
  "dailyActivity": "sedentary",
  "trainingsPerWeek": 4,
  "avgDurationMin": 75,
  "dailySteps": 6500,
  "weeklyCardioMin": 60,
  "extraActivity": "Caminatas",
  "trainingTime": "18:00",
  "trainFasted": "after_meal",
  "meals": [
    { "name": "Desayuno", "time": "08:00" },
    { "name": "Almuerzo", "time": null }
  ],
  "likes": ["Pollo", "Arroz"],
  "avoids": ["Pescado"],
  "dietType": "none",
  "restrictions": [],
  "notes": null
}
```

---

## Nutrition plans

Colección `nutritionPlans` (uuid `id` + `_id` Mongo). Snapshots `athlete` / `coach`: `{ id, firstName, lastName }`.  
`status`: `active` \| `archived`. Soft-delete atleta: `deletedAt` (list/get lo omiten).  
Authz como plan de entrenamiento: **coach asignado** escribe; atleta ve las suyas; atleta puede soft-delete solo archivadas.

Tras unlink (`coachId = null`) el coach viejo pierde acceso; el atleta sigue listando sus pautas (no borradas). Un coach nuevo no ve las del anterior (`coach.id` del snapshot).

**`meals`:** se persisten en el orden del body. Convención de producto: la UI coach debe enviarlas ordenadas por `time` (`HH:mm`); sin hora al final. El FE atleta no reordena.
### `POST /nutrition-plans`

| | |
|---|---|
| Auth | JWT + **coach** |
| Respuesta | `201` — `NutritionPlanDto` (`status: active`) |
| Errores | `403` si no es el coach asignado; `404` si el atleta no existe |

**Body**

| Campo | | Notas |
|---|---|---|
| `athleteId` | Obligatorio | UUID del atleta asignado |
| `title` | Obligatorio | máx. 120 |
| `goal` | Opcional | `strength` \| `hypertrophy` \| `fat_loss` \| `general` \| `null` |
| `validFrom` | Obligatorio | ISO date |
| `validUntil` | Opcional | ISO date o `null` |
| `targets` | Obligatorio | `{ calories, proteinG, carbsG, fatG }` (números ≥ 0) |
| `meals` | Opcional | máx. 12; cada una `{ name, time?, foods[{ name, quantity, unit }], notes? }`. Orden = orden del array (UI coach debe ordenar por `time`) |
| `generalNotes` | Opcional | máx. 4000 o `null` |

```json
{
  "athleteId": "ee923be1-1192-460e-89ee-2275d4d3f206",
  "title": "Pauta de definición",
  "goal": "fat_loss",
  "validFrom": "2026-08-13T00:00:00.000Z",
  "validUntil": null,
  "targets": { "calories": 2200, "proteinG": 160, "carbsG": 220, "fatG": 70 },
  "meals": [
    {
      "name": "Desayuno",
      "time": "08:00",
      "foods": [{ "name": "Avena", "quantity": 80, "unit": "g" }],
      "notes": null
    }
  ],
  "generalNotes": null
}
```

---

### `GET /nutrition-plans`

| | |
|---|---|
| Auth | JWT + **athlete** o **coach** |
| Respuesta | `200` — `{ data: NutritionPlanDto[] }` (más reciente primero) |
| Errores | Coach sin `athleteId` → `400`; coach no asignado → `403` |

**Query**

| Campo | | Notas |
|---|---|---|
| `athleteId` | Coach: obligatorio. Atleta: se ignora (siempre self) | UUID |
| `status` | Opcional | `active` \| `archived` |

---

### `GET /nutrition-plans/:planId`

| | |
|---|---|
| Auth | JWT + **athlete** o **coach** |
| Respuesta | `200` — `NutritionPlanDto` |
| Errores | `404` si no existe o no es visible; coach no asignado → `403` |

Atleta: `athlete.id` = JWT. Coach: creó el plan (`coach.id` = JWT) **y** sigue asignado a ese atleta.

---

### `PUT /nutrition-plans/:planId`

| | |
|---|---|
| Auth | JWT + **coach** |
| Respuesta | `200` — `NutritionPlanDto` |
| Errores | `403` no asignado; `404` no es su pauta; `409` si está `archived` |

Body parcial (al menos un campo): `title`, `goal`, `validFrom`, `validUntil`, `targets`, `meals`, `generalNotes`. No cambia snapshots ni `status`. Si viene `meals`, el orden del array se persiste tal cual (UI coach: ordenar por `time`).

---

### `PATCH /nutrition-plans/:planId/archive`

| | |
|---|---|
| Auth | JWT + **coach** |
| Respuesta | `200` — `NutritionPlanDto` (`status: archived`) |
| Errores | Igual que el PUT (idempotente si ya estaba archived) |

---

### `DELETE /nutrition-plans/:planId`

| | |
|---|---|
| Auth | JWT + **athlete** |
| Respuesta | `204` |
| Errores | `404` si no existe / no es suya / ya estaba borrada; `409` si la pauta no está `archived` |

Soft-delete: setea `deletedAt`. List/get la omiten. Solo pautas **archivadas**.

---

## Admin

Requieren **JWT** con **role `admin`**.

### `GET /admin/stats`

| | |
|---|---|
| Auth | JWT + **admin** |
| Respuesta | `200` — overview aggregates (soft-deleted excluded) |
| Errores | `403` si el role no es admin |

```json
{
  "users": {
    "total": 51,
    "byRole": { "athlete": 42, "coach": 8, "admin": 1 }
  },
  "subscriptions": {
    "byPlan": { "free": 40, "premium": 6, "growth": 3, "pro": 2 },
    "paidExpiringSoon": 2
  },
  "signups": {
    "last7Days": 5,
    "last30Days": 18
  }
}
```

`paidExpiringSoon`: plan ≠ `free` y `subscription.expiresAt` entre ahora y +7 días.

### `GET /admin/users`

| | |
|---|---|
| Auth | JWT + **admin** |
| Respuesta | `200` — `PaginatedResponse<AdminUserListItemDto>` (soft-deleted excluded) |
| Errores | `403` si el role no es admin |

**Query**

| Campo | | Notas |
|---|---|---|
| `page` / `limit` | Opcional | default 1 / 50 (max 100) |
| `search` | Opcional | `profile.firstName`, `profile.lastName`, o `email` |
| `role` | Opcional | `athlete` \| `coach` \| `admin` |
| `plan` | Opcional | `free` \| `premium` \| `growth` \| `pro` |
| `expiringSoon` | Opcional | `true` → solo paid con `expiresAt` en los próximos 7 días |
| `sortBy` | Opcional | `lastLoginAt` (default) \| `createdAt` |
| `sortDir` | Opcional | `desc` (default) \| `asc` |

Item slim: `id`, `email`, `role`, `profile`, `goal`, `subscription`, `coachId`, `lastLoginAt`, `createdAt`.

### `DELETE /admin/users/:userId`

| | |
|---|---|
| Auth | JWT + **admin** |
| Respuesta | `200` — `{ ok: true }` |
| Errores | `403` si no es admin o si `:userId` es el propio admin; `404` si no existe / ya está dado de baja |

Soft-delete: solo setea `deletedAt` (igual que `DELETE /users/me`). No limpia `coachId` ni relaciones. El usuario deja de aparecer en listados y no puede volver a loguearse.

### `POST /admin/subscriptions/grant`

| | |
|---|---|
| Auth | JWT + **admin** |
| Respuesta | `200` — `{ id, email, role, subscription }` (slim; no es `MeResponseDto`) |
| Errores | `403` si el role no es admin; `400` si el `plan` no corresponde al rol del target |

**Body**

| Campo | | Notas |
|---|---|---|
| `email` | Obligatorio | email único del target |
| `plan` | Obligatorio | según rol del target (ver abajo); no `free` |
| `durationDays` | Opcional† | días a sumar (1–3650). Si el target ya tiene plan pago **activo**, se suman a `expiresAt` actual; si no, parten desde ahora. Default **30** si no mandás `expiresAt` |
| `expiresAt` | Opcional† | fecha absoluta `YYYY-MM-DD`; el plan dura hasta el **final de ese día UTC** (pisa / fija vencimiento) |

† Podés omitir ambos (`durationDays` / `expiresAt`) → 30 días. No mandar los dos a la vez.

Plan permitido por rol del target:
- **athlete** → solo `premium`
- **coach** → `growth` \| `pro`
- **admin** → no se puede grant (400)

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

**Respuesta**

```json
{
  "id": "…",
  "email": "athlete@example.com",
  "role": "athlete",
  "subscription": {
    "plan": "premium",
    "startedAt": "2026-08-10T20:00:00.000Z",
    "expiresAt": "2026-09-09T20:00:00.000Z"
  }
}
```

---

### `POST /admin/subscriptions/revoke`

| | |
|---|---|
| Auth | JWT + **admin** |
| Respuesta | `200` — `{ id, email, role, subscription: { plan: free, startedAt: null, expiresAt: null } }` |
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
| `EMAIL_NOT_AN_ATHLETE` | 409 | Invite a un email que ya es coach/admin (no athlete) |
| `ATHLETE_HAS_PENDING_INVITE` | 409 | Ya hay una invite pending para ese email / athlete |
| `ALREADY_YOUR_ATHLETE` | 409 | El atleta ya tiene `coachId` = el coach que invita |
| `ATHLETE_ALREADY_HAS_COACH` | 409 | El atleta ya tiene otro coach asignado |
| `NO_PENDING_COACH_INVITE` | 409 | Respond sin pending |
| `NO_COACH_ASSIGNED` | 409 | `DELETE /users/me/coach` sin coach vinculado |
| `CURRENT_PASSWORD_INCORRECT` | 400 | `PATCH /users/me` con `newPassword` y contraseña actual incorrecta |
| `AI_REQUEST_FAILED` | 502 | Error / respuesta vacía o JSON inválido de la IA |
| `PAID_SUBSCRIPTION_REQUIRED` | 403 | `recommend` / `progress-photos/analyze` con plan free o pago vencido |

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
| Exercises | 5 | público (+ recommend JWT + paid) |
| Users | 19 | JWT |
| Admin | 5 | JWT + admin (stats, users, soft-delete, grant, revoke) |
| **Total** | **26** | |
