# Gym Data BE — TODO

Catálogo de endpoints: [`API-ENDPOINTS.md`](./API-ENDPOINTS.md).

## Hecho (back)

- [x] Auth JWT (`sub` + `role`) + `JwtAuthGuard` + `RolesGuard` / `@Roles(...)`
- [x] Perfil enriquecido: programs, `subscription`, `coachQuota` (null si no coach)
- [x] Training program: agregar / quitar / editar pauta
- [x] Exercises: listado, filtros, labels, random, by id, search bilingüe, recommend (presets + 4 slots)
- [x] User: `subscription` (`free` \| `premium` \| `growth` \| `pro`), `role`, `coachId`, `coachTrainingProgram`
- [x] Coach athlete limits: free 5 / growth 10 / pro 20; enforce en invite + accept
- [x] Register: `role: athlete | coach` (admin solo DB)
- [x] Colección **`invites`** + flujo coach/athlete (create, respond, pending, history, athletes)
- [x] Coach training program replace + export Excel/ZIP
- [x] Admin: grant / revoke subscription (`plan` requerido en grant: premium | growth | pro)
- [x] API error codes estables para invites/cuota (`COACH_ATHLETE_QUOTA_FULL`, etc.)

> FE: menú de cuenta (iniciales + dropdown). **Mi perfil** / **Configuración** quedan deshabilitados hasta cablear vistas + endpoints de abajo.
> La **baja de cuenta** (soft-delete / `deletedAt`) se hace junto a **Configuración**, no en Mi perfil.

## Pendiente — back

- [ ] Migrar más excepciones a `ApiErrorCode` (auth, ownership, export…)
- [ ] (Opcional) Fotos de progreso: storage (S3/R2) + collection metadata
- [ ] (Más adelante) Recommend: modo `from_plan` / `discover`, o IA sobre candidatos
- [ ] (Opc.) endpoints granulares de plan coach (hoy replace completo)
- [ ] **Mi perfil** — `PATCH` (o similar) para actualizar nombre / datos editables del user
- [ ] **Configuración** — preferencias de usuario (tema/idioma/etc.) si se sincronizan cross-device
- [ ] **Configuración → darse de baja** — endpoint que setee `deletedAt` (soft-delete); cablear cuando exista la vista de Configuración en el FE
- [ ] (Opc.) `cancelReason` en Invite cuando se cancela por cuota
