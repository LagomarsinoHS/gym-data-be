# Gym Data BE — TODO

Catálogo de endpoints: [`API-ENDPOINTS.md`](./API-ENDPOINTS.md).

## Hecho (back)

- [x] Auth JWT (`sub` + `role`) + `JwtAuthGuard` + `RolesGuard` / `@Roles(...)`
- [x] Perfil enriquecido: programs, `subscription`, `coachQuota` (null si no coach)
- [x] Training program: agregar / quitar / editar pauta
- [x] Exercises: listado, filtros, labels, random, by id, search bilingüe, recommend (IA)
- [x] User: `subscription` (`free` \| `premium` \| `growth` \| `pro`), `role`, `coachId`, `coachTrainingProgram`
- [x] Coach athlete limits: free 5 / growth 10 / pro 20; enforce en invite + accept
- [x] Register: `role: athlete | coach` (admin solo DB)
- [x] Colección **`invites`** + flujo coach/athlete (create, respond, pending, history, athletes)
- [x] Coach training program replace + export Excel/ZIP
- [x] Admin: grant / revoke subscription (`plan` requerido en grant: premium | growth | pro)
- [x] API error codes estables para invites/cuota (`COACH_ATHLETE_QUOTA_FULL`, etc.)
- [x] Módulo `ai` (`AiService` port + `GeminiAiProvider`; `recommendWorkout` / `analyzeProgressPhotos`); env opcional `GEMINI_API_KEY` + `GEMINI_MODEL`

> FE: menú de cuenta (iniciales/foto + dropdown). **Mi perfil** cableado (lectura, foto, editar, baja). **Configuración** aún deshabilitada en FE.
> La **baja de cuenta** (soft-delete / `deletedAt`) vive en **Mi perfil** (`DELETE /users/me`), no en Configuración.

## Pendiente — back

### Fotos de progreso (atleta → Cloudinary → coach)

Modelo en `User` (array `progressPhotos`, mismo estilo que `trainingProgram`):

```ts
progressPhotos: {
  yearMonth: string; // 'YYYY-MM' — único por usuario; el mes lo calcula el BE al subir
  weightKg: number | null; // peso del avance de ese mes
  front: { url: string; publicId: string; uploadedAt: Date } | null;
  back:  { url: string; publicId: string; uploadedAt: Date } | null;
}[]

// Denormalizado en User:
currentWeightKg: number | null; // = weightKg del yearMonth más reciente con peso
```

- Máx **2 fotos por mes**: `front` y `back` (reemplazar el mismo side reescribe el slot; overwrite vía publicId fijo).
- Guardar `url` (`secureUrl`) para render + `publicId` para delete/replace.
- No usar nombres de mes en BD; el FE traduce `1 → Enero`.
- **Regla de envío:** `POST` multipart exige `weightKg` **y** ≥ 1 foto (`front` y/o `back`). Setea el peso del mes UTC actual y recalcula `currentWeightKg`.

Checklist:
- [x] Módulo `storage` (Cloudinary): `uploadImage` / `deleteImage` / `deleteFolder` (usado solo desde progress-photos)
- [x] Schema: `progressPhotos` en `User` (default `[]`)
- [x] Schema: `weightKg` por mes + `currentWeightKg` en `User` (recompute al mutar)
- [x] Atleta: `POST /users/me/progress-photos` — multipart `weightKg` + `front`? + `back`? (≥1 foto); Cloudinary `gym-app/progress/{userId}/{YYYY}/{mon}/{side}`; upsert mes UTC; setea `weightKg` + `currentWeightKg`
- [x] Atleta: `DELETE /users/me/progress-photos` — body `{ yearMonth, side? }`; sin `side` borra el mes (assets + carpeta); con `side` borra solo esa foto (y la carpeta si el mes queda vacío); actualiza Mongo + recompute peso (**API lista; FE aún no expone UI de borrado**)
- [x] **GET único** `GET /users/:userId/progress-photos` — `{ currentWeightKg, years: [...] }`; authz self ó coach asignado; query opcional `?year=2026`
- [x] Reemplazo: mismo `side` del mes → overwrite en Cloudinary (sin delete aparte)
- [x] Doc progress-photos en `API-ENDPOINTS.md` (POST / DELETE / GET)
- [x] `currentWeightKg` también en `MeResponseDto` (`/me`, coach athletes)

> **Storage en uso:** `uploadImage`, `deleteImage`, `deleteFolder` vía progress-photos en `UsersService`. No hay endpoint admin de upload ni list/get de Cloudinary.

Response del GET:

```json
{
  "currentWeightKg": 72.5,
  "years": [
    {
      "year": 2026,
      "months": [
        {
          "month": 1,
          "yearMonth": "2026-01",
          "weightKg": 72.5,
          "front": { "url": "...", "uploadedAt": "..." },
          "back": { "url": "...", "uploadedAt": "..." }
        }
      ]
    }
  ]
}
```

> `publicId` se guarda en Mongo para delete/replace en el back; el GET puede omitirlo y devolver solo lo que pinta el front.

### Resto

- [ ] Migrar más excepciones a `ApiErrorCode` (auth, ownership, export…)
- [x] Recommend IA — `GET /exercises/recommend` (zone + 1–2 equipment → candidatos slim → AI 4 ejercicios con `sets`/`reps`/`rest` + `note`)
- [ ] (Más adelante) Recommend: modo `from_plan` / `discover`
- [ ] (Opc.) endpoints granulares de plan coach (hoy replace completo)
- [x] **Mi perfil** — `PATCH /users/me` (firstName / lastName / password); `POST /users/me/profile-photo` → Cloudinary `gym-app/profiles/{userId}/profilePhoto`; expuesto en `/me` como `{ url, uploadedAt }`
- [ ] **Configuración** — preferencias de usuario (tema/idioma/etc.) si se sincronizan cross-device
- [x] **Baja de cuenta** — `DELETE /users/me` setea `deletedAt` (soft-delete por email + match JWT); UI en Mi perfil (FE)
- [ ] (Opc.) `cancelReason` en Invite cuando se cancela por cuota
