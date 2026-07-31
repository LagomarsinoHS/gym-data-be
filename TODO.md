# Gym Data BE — TODO

## Hecho (back)

- [x] Auth: register / login JWT (`sub` = user id)
- [x] `JwtAuthGuard` + rutas privadas de users
- [x] `GET /users/me` enriquecido con `trainingProgram` + catálogo
- [x] `PUT /users/:id/training-program` — agregar ejercicios (al inicio, skip duplicados)
- [x] `PUT /users/:id/training-program/remove` — quitar por `exerciseId`
- [x] Exercises: listado, filtros, labels, random, by id, search bilingüe
- [x] `GET /exercises/recommend?zone=&equipment=` — presets por category + 4 slots
- [x] `ZONE_PRESETS` en `src/exercises/constants/zone-presets.ts`
- [x] User: campo `isPremium` (default `false` al crear)
- [x] Log HTTP con `origin` (CORS debug) en `main.ts`
- [x] `gym.exercises.json` en `.gitignore`
- [x] Doc de diseño: `docs/recommend-workout.md`

## Pendiente — back

- [ ] Endpoint admin / flujo para marcar `isPremium: true` (hoy solo a mano en DB)
- [ ] Backfill opcional: setear `isPremium: false` en users viejos sin el campo
- [ ] (Opcional) Soft-delete real: el repo filtra `deletedAt: null` pero el schema user no lo declara
- [ ] (Opcional) Fotos de progreso: storage (S3/R2) + collection metadata — ver conversación / diseño futuro
- [ ] (Más adelante) Recommend: modo `from_plan` / `discover`, o IA sobre candidatos

## Pendiente — front

- [ ] Pantalla “Recomendar entrenamiento”: zona → equipo → lista de 4
- [ ] CTA “Agregar al plan” usando `PUT /users/:id/training-program`
- [ ] Quitar del plan con `PUT .../training-program/remove`
- [ ] UI según `isPremium` (gates de features)
- [ ] (Futuro) Apartado progreso + upload de fotos

## Referencias rápidas

| Endpoint | Uso |
|----------|-----|
| `GET /exercises/labels` | zones ≈ `category`, equipos |
| `GET /exercises/recommend?zone=back&equipment=barbell,dumbbell` | mini-rutina 4 ejercicios |
| `PUT /users/:id/training-program` | body `{ exerciseIds: string[] }` |
| `PUT /users/:id/training-program/remove` | body `{ exerciseId: string }` |
| `GET /users/me` | perfil + plan enriquecido + `isPremium` |
