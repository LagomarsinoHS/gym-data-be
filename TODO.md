# Gym Data BE — TODO

## Hecho (back)

- [x] Auth: register / login JWT (`sub` = user id)
- [x] `JwtAuthGuard` + rutas privadas de users
- [x] `GET /users/me` enriquecido con `trainingProgram` + `coachTrainingProgram` + catálogo  
  (**sin** invite embebido; invite va en endpoint aparte)
- [x] `POST /users/training-program` — agregar ejercicios (al inicio, skip duplicados)
- [x] `PUT /users/training-program/remove` — quitar por `exerciseId`
- [x] `PUT /users/training-program/:exerciseId` — editar sets/reps/rest/notes
- [x] Exercises: listado, filtros, labels, random, by id, search bilingüe
- [x] `GET /exercises/recommend?zone=&equipment=` — presets por category + 4 slots
- [x] User: `isPremium`, `role`, `coachId`, `coachTrainingProgram` (sesiones)
- [x] Register acepta `role: athlete | coach` (admin solo DB)
- [x] Colección **`invites`** (1 doc = 1 invite; status pending/accepted/rejected/cancelled)
- [x] `POST /users/coach/invites` — create pending invite
- [x] `POST /users/me/pending-coach-invite/respond` — accept (set `coachId`) / reject
- [x] `GET /users/me/pending-coach-invite` — `{ invite: null | {...} }` (máx. 1 pendiente atleta)
- [x] `GET /users/coach/athletes` — alumnos del coach (paginado)
- [x] `GET /users/coach/invites` — historial invites (filtro `status` opcional, paginado)
- [x] `PUT /users/coach/athletes/:athleteId/training-program` — replace sesiones
- [x] `POST /users/coach/training-program/export` — Excel / zip binary + CORS `Content-Disposition`

> FE: menú de cuenta (iniciales + dropdown). **Mi perfil** / **Configuración** quedan deshabilitados hasta cablear vistas + endpoints de abajo.
## Pendiente — back

- [ ] `RolesGuard` + `@Roles(...)`: `coach/*` → coach; `me/pending-coach-invite*` → athlete (JWT con `role` o lookup). Ownership en service queda.
- [ ] Endpoint admin / flujo para marcar `isPremium: true` (hoy solo a mano en DB)
- [ ] Backfill opcional: setear `isPremium: false` en users viejos sin el campo
- [ ] (Opcional) Soft-delete: endpoint/deactivate que setee `deletedAt` (filtro + schema ya listos)
- [ ] (Opcional) Fotos de progreso: storage (S3/R2) + collection metadata
- [ ] (Más adelante) Recommend: modo `from_plan` / `discover`, o IA sobre candidatos
- [ ] (Opc.) endpoints granulares de plan coach (hoy replace completo)
- [ ] **Mi perfil** — `PATCH` (o similar) para actualizar nombre / datos editables del user
- [ ] **Configuración** — preferencias de usuario (tema/idioma/etc.) si se sincronizan cross-device

## Referencias rápidas

| Endpoint | Uso |
|----------|-----|
| `GET /users/me` | perfil + programs enriquecidos + `isPremium` + `role` + `coachId` |
| `GET /users/me/pending-coach-invite` | `{ invite: null \| PendingInvite }` |
| `POST /users/coach/invites` | body `{ email }` |
| `POST /users/me/pending-coach-invite/respond` | body `{ action: 'accept' \| 'reject' }` |
| `GET /users/coach/athletes` | pagina alumnos del coach |
| `GET /users/coach/invites` | historial invites (`status?`, page, limit) |
| `PUT /users/coach/athletes/:id/training-program` | body `{ coachTrainingProgram }` |
| `POST /users/coach/training-program/export` | body `{ athleteIds, locale }` → file |
| `GET /exercises/labels` | zones ≈ `category`, equipos |
| `GET /exercises/recommend?zone=back&equipment=barbell,dumbbell` | mini-rutina 4 ejercicios |
| `POST /users/training-program` | body `{ exerciseIds: string[] }` |
| `PUT /users/training-program/remove` | body `{ exerciseId: string }` |
| `PUT /users/training-program/:exerciseId` | body `{ sets?, reps?, rest?, notes? }` |
