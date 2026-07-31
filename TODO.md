# Gym Data BE — TODO

## Hecho (back)

- [x] Auth: register / login JWT (`sub` = user id)
- [x] `JwtAuthGuard` + rutas privadas de users
- [x] `GET /users/me` enriquecido con `trainingProgram` + catálogo
- [x] `POST /users/training-program` — agregar ejercicios (al inicio, skip duplicados)
- [x] `PUT /users/training-program/remove` — quitar por `exerciseId`
- [x] Exercises: listado, filtros, labels, random, by id, search bilingüe
- [x] `GET /exercises/recommend?zone=&equipment=` — presets por category + 4 slots
- [x] `ZONE_PRESETS` en `src/exercises/constants/zone-presets.ts`
- [x] User: campo `isPremium` (default `false` al crear)
- [x] User: campo `coachTrainingProgram` (default `[]`, para plan del coach a futuro)
- [x] `PUT /users/training-program/:exerciseId` — editar sets/reps/rest/notes del plan self-serve
- [x] Log HTTP con `origin` (CORS debug) en `main.ts`
- [x] `gym.exercises.json` en `.gitignore`
- [x] Doc de diseño: `docs/recommend-workout.md`
- [x] User: `role` (athlete | coach | admin) + `coachId`
- [x] Register acepta `role: athlete | coach` (admin solo DB)

## Pendiente — back

- [ ] Endpoint admin / flujo para marcar `isPremium: true` (hoy solo a mano en DB)
- [ ] Backfill opcional: setear `isPremium: false` en users viejos sin el campo
- [ ] (Opcional) Soft-delete real: el repo filtra `deletedAt: null` pero el schema user no lo declara
- [ ] (Opcional) Fotos de progreso: storage (S3/R2) + collection metadata — ver conversación / diseño futuro
- [ ] (Más adelante) Recommend: modo `from_plan` / `discover`, o IA sobre candidatos

### Módulo Coach — vincular atleta (“Unir atleta”)

- [ ] Endpoint coach: asignar atleta → setea `coachId` en el usuario atleta
- [ ] **No** autocomplete parcial por email/nombre (3 letras): filtra usuarios y filtra PII
- [ ] Preferir: match por **email exacto** + confirmación, o **código de invitación** / solicitud que el atleta acepta
- [ ] Listar alumnos del coach: `GET` athletes where `coachId === me.id` (shape mínimo: id, name, email)

### Módulo Coach — plan asignado (después)

- [ ] Modelo de plan por bloques (Lun/Mié/Vie) **o** por sesiones (Sesión 1, 2…) a elegir
- [ ] CRUD plan asignado al alumno + ejercicios por bloque/sesión

## Pendiente — front

- [x] Pantalla “Recomendar entrenamiento”: zona → equipo → lista
- [x] UI según `isPremium` (gate recommend)
- [x] Nav por rol (athlete / coach) + badge de rol
- [x] Register: selector Atleta / Entrenador
- [ ] CTA “Agregar al plan” desde recommend → `POST /users/training-program`
- [ ] (Futuro) Apartado progreso + upload de fotos

### Coach — Mis alumnos (incremental)

- [ ] Vista Mis alumnos: toolbar + lista (acordeón, no cards) + empty state
- [ ] Botón “Agregar alumno” dentro de la vista (no item de nav aparte)
- [ ] Flujo Unir atleta (email exacto / invite) cuando exista API
- [ ] Detalle alumno: agregar/editar entrenamiento (bloques o sesiones)

## Referencias rápidas

| Endpoint | Uso |
|----------|-----|
| `GET /exercises/labels` | zones ≈ `category`, equipos |
| `GET /exercises/recommend?zone=back&equipment=barbell,dumbbell` | mini-rutina 4 ejercicios |
| `POST /users/training-program` | body `{ exerciseIds: string[] }` |
| `PUT /users/training-program/remove` | body `{ exerciseId: string }` |
| `PUT /users/training-program/:exerciseId` | body `{ sets?, reps?, rest?, notes? }` |
| `GET /users/me` | perfil + plan enriquecido + `isPremium` + `role` + `coachId` |
