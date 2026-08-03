# Gym Data BE — TODO

## Hecho (back)

- [x] Auth: register / login JWT (`sub` + `role`)
- [x] `JwtAuthGuard` + `RolesGuard` / `@Roles(...)`
- [x] `GET /users/me` enriquecido con programs + `subscription` + `coachQuota` (null si no coach)
- [x] `POST /users/training-program` — agregar ejercicios (al inicio, skip duplicados)
- [x] `PUT /users/training-program/remove` — quitar por `exerciseId`
- [x] `PUT /users/training-program/:exerciseId` — editar sets/reps/rest/notes
- [x] Exercises: listado, filtros, labels, random, by id, search bilingüe
- [x] `GET /exercises/recommend?zone=&equipment=` — presets por category + 4 slots
- [x] User: `subscription` (`free` \| `premium` \| `growth` \| `pro`), `role`, `coachId`, `coachTrainingProgram`
- [x] Coach athlete limits: free 5 / growth 10 / pro 20; enforce en invite + accept
- [x] Register acepta `role: athlete | coach` (admin solo DB)
- [x] Colección **`invites`** (pending/accepted/rejected/cancelled)
- [x] Coach invites + athlete respond + pending GET + athletes list + invites history
- [x] Coach training program replace + export Excel/ZIP
- [x] Admin: `POST /admin/subscriptions/grant|revoke` (`@Roles(Admin)`)
- [x] API error codes estables para invites/cuota (`COACH_ATHLETE_QUOTA_FULL`, etc.)

> FE: menú de cuenta (iniciales + dropdown). **Mi perfil** / **Configuración** quedan deshabilitados hasta cablear vistas + endpoints de abajo.

## Pendiente — back

- [ ] Backfill opcional: setear `subscription` free en users viejos sin el campo
- [ ] Admin grant: aceptar `plan: growth | pro | premium` (hoy grant fija `premium`)
- [ ] Migrar más excepciones a `ApiErrorCode` (auth, ownership, export…)
- [ ] (Opcional) Soft-delete: endpoint/deactivate que setee `deletedAt`
- [ ] (Opcional) Fotos de progreso: storage (S3/R2) + collection metadata
- [ ] (Más adelante) Recommend: modo `from_plan` / `discover`, o IA sobre candidatos
- [ ] (Opc.) endpoints granulares de plan coach (hoy replace completo)
- [ ] **Mi perfil** — `PATCH` (o similar) para actualizar nombre / datos editables del user
- [ ] **Configuración** — preferencias de usuario (tema/idioma/etc.) si se sincronizan cross-device
- [ ] (Opc.) `cancelReason` en Invite cuando se cancela por cuota

## Referencias rápidas

| Endpoint | Uso |
|----------|-----|
| `GET /users/me` | perfil + programs + `subscription` + `coachQuota?` + `role` + `coachId` |
| `GET /users/me/pending-coach-invite` | `{ invite: null \| PendingInvite }` |
| `POST /users/coach/invites` | body `{ email }` — respeta cupo coach |
| `POST /users/me/pending-coach-invite/respond` | body `{ action: 'accept' \| 'reject' }` |
| `GET /users/coach/athletes` | pagina alumnos del coach |
| `GET /users/coach/invites` | historial invites (`status?`, page, limit) |
| `PUT /users/coach/athletes/:id/training-program` | body `{ coachTrainingProgram }` |
| `POST /users/coach/training-program/export` | body `{ athleteIds, locale }` → file |
| `POST /admin/subscriptions/grant` | body `{ email, durationDays? \| expiresAt? }` — admin |
| `POST /admin/subscriptions/revoke` | body `{ email }` — admin |
| `GET /exercises/labels` | zones ≈ `category`, equipos |
| `GET /exercises/recommend?zone=back&equipment=barbell,dumbbell` | mini-rutina 4 ejercicios |
| `POST /users/training-program` | body `{ exerciseIds: string[] }` |
| `PUT /users/training-program/remove` | body `{ exerciseId: string }` |
| `PUT /users/training-program/:exerciseId` | body `{ sets?, reps?, rest?, notes? }` |

Docs de endpoints: [`docs/API-ENDPOINTS.md`](docs/API-ENDPOINTS.md).
