# Gym Data BE — TODO

Solo pendientes. Catálogo de endpoints: [`API-ENDPOINTS.md`](./API-ENDPOINTS.md).  
Detalle de producto / UI: FE `docs/TODO.md`.

---

## Prioridad

1. **Nutrición** — pauta alimenticia coach → atleta
2. **PDF brand** — datos de marca en export
3. **Admin** — ops opcionales (expired, audit, restore…)
4. **Resto** — preferencias, prompts, ApiErrorCode, etc.

---

## Nutrición — pauta alimenticia (coach → atleta)

### Perfil nutricional (coach)

- [x] `User.nutrition` embebido (hábitos / preferencias / restricciones)
- [x] GET/PUT `/users/coach/athletes/:athleteId/nutrition` (authz coach asignado; no va en `/me`)
- [x] Doc en `API-ENDPOINTS.md`

### Pauta

- [x] Colección `nutritionPlans` + CRUD (`POST/GET/PUT` + `PATCH .../archive` + `DELETE` soft)
- [x] Coach asignado: create/update/archive; atleta (self) + coach creador asignado: list/get; atleta: soft-delete archivadas
- [ ] Storage si hay PDF/imagen (reutilizar Cloudinary si aplica)
- [x] Doc en `API-ENDPOINTS.md`
- [x] Vista FE atleta (`athlete-nutrition`) — ver / soft-delete archivadas
- [ ] Vista FE coach — crear / editar / archivar; al guardar ordenar `meals` por `time` (HH:mm; sin hora al final)

---

## PDF brand (export con marca del coach)

- [ ] Incluir en el PDF: coach (nombre), atleta, fecha; logo/profilePhoto si hay URL
- [ ] Pasar brand al `PdfService` desde export (users → pdf); pie “Preparado por {Coach}”
- [ ] (Opc.) acentos / ocultar marca ExerciseDB en planes pagos
- [ ] Doc en `API-ENDPOINTS.md` si el body/export gana campos de brand

---

## Cuenta / vínculo

- [x] **Dejar coach** (athlete unlink) — `DELETE /users/me/coach` (`coachId = null`; no borra nutrition ni planes)
- [ ] **Configuración** — preferencias de usuario (tema/idioma/etc.) si se sincronizan cross-device
- [ ] (Opc.) `cancelReason` en Invite cuando se cancela por cuota

---

## Admin — siguientes

Overview + Usuarios + grant/revoke ya están.

- [ ] (Opc.) filtro `expired` / listado dedicado de paid / expiring / expired
- [ ] (Opc.) audit log de grant/revoke
- [ ] (Opc.) `coachName` (o populate) en `GET /admin/users` para la card Coach
- [ ] (Opc.) restore / anular soft-delete
- [ ] Endpoints de cuota / límites si la UI de coaches lo pide
- [ ] Jobs o endpoints de cleanup soft-delete si hacen falta

---

## Resto

- [ ] Migrar más excepciones a `ApiErrorCode` (auth, ownership, export…)
- [ ] (Opc.) endpoints granulares de plan coach (hoy replace completo)
- [ ] (Más adelante) Recommend: modo `from_plan` / `discover`
- [ ] (Más adelante) Usar height/sex/birthDate/goal en prompts de recommend / analyze progress
