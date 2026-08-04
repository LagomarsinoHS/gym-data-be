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

### Fotos de progreso (atleta → Cloudinary → coach)

Modelo en `User` (array `progressPhotos`, mismo estilo que `trainingProgram`):

```ts
progressPhotos: {
  yearMonth: string; // 'YYYY-MM' — único por usuario; el mes lo calcula el BE al subir
  front: { url: string; publicId: string; uploadedAt: Date } | null;
  back:  { url: string; publicId: string; uploadedAt: Date } | null;
}[]
```

- Máx **2 fotos por mes**: `front` y `back` (reemplazar el mismo side reescribe el slot; ideal borrar `publicId` viejo en Cloudinary).
- Guardar `url` (`secureUrl`) para render + `publicId` para delete/replace.
- No usar nombres de mes en BD; el FE traduce `1 → Enero`.

Checklist:
- [x] Módulo `storage` (Cloudinary): upload / list folder / get / delete
- [x] Admin test: `POST /admin/storage/upload` (multipart `file` + `folder?`)
- [x] Schema: `progressPhotos` en `User` (default `[]`)
- [x] Atleta: `POST /users/me/progress-photos` — multipart `file` + `side: front|back`; Cloudinary `gym-app/progress/{userId}/{YYYY}/{mon}/{side}` (mon = jan…dec); upsert mes UTC (`YYYY-MM`); overwrite vía publicId `front`/`back`
- [x] Atleta: `DELETE /users/me/progress-photos` — body `{ yearMonth, side? }`; sin `side` borra el mes (assets + carpeta); con `side` borra solo esa foto (y la carpeta si el mes queda vacío); actualiza Mongo
- [x] **GET único** `GET /users/:userId/progress-photos` — response `{ years: [{ year, months: [...] }] }`; authz self ó coach asignado; query opcional `?year=2026`
- [x] Reemplazo: mismo `side` del mes → overwrite en Cloudinary (sin delete aparte)
- [x] Doc progress-photos en `API-ENDPOINTS.md` (POST / DELETE / GET)

Response del GET:

```json
{
  "years": [
    {
      "year": 2026,
      "months": [
        {
          "month": 1,
          "yearMonth": "2026-01",
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
- [ ] (Más adelante) Recommend: modo `from_plan` / `discover`, o IA sobre candidatos
- [ ] (Opc.) endpoints granulares de plan coach (hoy replace completo)
- [ ] **Mi perfil** — `PATCH` (o similar) para actualizar nombre / datos editables del user
- [ ] **Configuración** — preferencias de usuario (tema/idioma/etc.) si se sincronizan cross-device
- [ ] **Configuración → darse de baja** — endpoint que setee `deletedAt` (soft-delete); cablear cuando exista la vista de Configuración en el FE
- [ ] (Opc.) `cancelReason` en Invite cuando se cancela por cuota
