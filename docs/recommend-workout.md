# Tarea: Recomendar entrenamiento

Feature pendiente para el front (módulo “Recomendar entrenamiento”) + endpoint en el back.

## Idea de producto

El usuario abre **Recomendar entrenamiento** y elige:

1. **Zona de entrenamiento** (obligatorio) — ej. espalda, pecho, piernas  
2. **Equipo disponible** (obligatorio, multi) — ej. barra + mancuerna  
3. ~~Músculo objetivo (`target`)~~ — **fuera del v1** para no saturar el flujo. El preset de la zona ya define qué `target`s / `category` usar por detrás.

Con eso el back arma una mini-rutina (~**4 ejercicios**) que no sea “4 random de la misma categoría”.

---

## Flujo front (UX)

```
[Recomendar entrenamiento]
        ↓
  Elegir 1 zona  (chips / lista)
        ↓
  Elegir equipo  (multi-select desde labels.equipment)
        ↓
  [Generar]
        ↓
  Ver 4 ejercicios (nombre, imagen/gif, equipo, rol opcional)
        ↓
  (después) “Agregar al plan” → PUT training-program con esos ids
```

Las opciones de zona las define el **producto** (no necesariamente 1:1 con `category` del catálogo).  
El equipo sí sale de `GET /exercises/labels` → `equipment`.

---

## Contrato API propuesto (v1)

```http
GET /exercises/recommend?zone=back&equipment=barbell,dumbbell
```

| Query        | Tipo     | Notas                                      |
|--------------|----------|--------------------------------------------|
| `zone`       | string   | = `category` del catálogo. Obligatorio.    |
| `equipment`  | string[] | Equipos disponibles. Obligatorio, min 1.   |

Siempre devuelve hasta 4 ejercicios (slots del preset). Auth opcional en v1.

### Response ejemplo

```json
{
  "zone": "back",
  "equipment": ["barbell", "dumbbell"],
  "exercises": [
    {
      "role": "vertical_pull",
      "exercise": {
        "id": "0021",
        "name": { "en": "Lat pulldown", "es": "..." },
        "image": "...",
        "gif_url": "...",
        "category": "back",
        "equipment": "cable"
      }
    }
  ]
}
```

Si un slot no encuentra match con el equipo pedido, **fallback**: ampliar a `body weight` o al pool de la zona sin filtro de equipo (definir prioridad en implementación).

---

## Presets por zona (núcleo de la “inteligencia”)

Cada `zone` de producto mapea a filtros del catálogo + **slots** (roles).  
No pedimos `target` al user: el preset ya sabe qué targets/categories buscar.

### Zonas v1

`zone` = `category` del catálogo (`GET /exercises/labels`). Presets en
[`src/exercises/constants/zone-presets.ts`](../src/exercises/constants/zone-presets.ts):

| Zone / category | Label UI (es) | Targets preferidos |
|-----------------|---------------|--------------------|
| `back` | Espalda | `lats`, `upper back`, `traps` |
| `chest` | Pecho | `pectorals`, `serratus anterior` |
| `upper legs` | Piernas | `quads`, `hamstrings`, `glutes`, … |
| `lower legs` | Pantorrillas | `calves` |
| `shoulders` | Hombros | `delts`, `traps` |
| `upper arms` | Brazos | `biceps`, `triceps` |
| `lower arms` | Antebrazos | `forearms` |
| `waist` | Core | `abs`, `spine` |
| `cardio` | Cardio | `cardiovascular system` |
| `neck` | Cuello | `levator scapulae` |

### Ejemplo de slots: `zone=back`

| # | role             | Qué buscamos                                      |
|---|------------------|---------------------------------------------------|
| 1 | `vertical_pull`  | Tirón vertical → preferir `target=lats`           |
| 2 | `horizontal_pull`| Remo → `upper back` / `lats`                      |
| 3 | `isolation`      | Aislamiento / pullover / face pull                |
| 4 | `accessory`      | Traps / unilateral / complemento                  |

Al llenar cada slot:

1. Filtrar ejercicios del preset (category/targets de la zona).  
2. Preferir `equipment` ∈ lista del user.  
3. Elegir 1 al azar (o por score) **sin repetir** `id` ni el mismo `role`.  
4. Diversidad suave: evitar 2 con el mismo equipo si hay alternativas; evitar nombres muy parecidos si es fácil (ej. dos “row”).

Misma idea para pecho (press / incline o flat / aperture / accessory), piernas (sentadilla-hinge / hinga / unilateral / pantorrilla), etc.  
Los slots exactos se definen al implementar; lo importante es **no** hacer `sample(4)` ciego sobre `category=back`.

---

## Algoritmo (resumen)

```
input: zone, equipment[]

preset = ZONE_PRESETS[zone]   // o 400 si zone inválida
slots  = preset.slots         // siempre 4

for each slot:
  candidates = findExercises({
    category / targets del preset,
    equipment in userEquipment,   // preferido
  })
  if empty → fallback (sin filtro equipment / zone targets / solo category)
  pick 1 not already picked ($sample)
  attach slot.role + nested exercise summary

return { zone, equipment, exercises }
```

Sin IA en v1. Más adelante se puede sumar LLM solo para texto (“por qué esta rutina”) sobre candidatos ya elegidos.

---

## Qué no entra en v1

- Selector de `target` muscular en el UI  
- Personalización con `trainingProgram` del user (`from_plan` / `discover`)  
- IA / OpenAI  
- Guardar la recomendación como entidad en Mongo (se puede “Agregar al plan” con el PUT existente)

---

## Checklist de implementación (back)

- [x] Definir `ZONE_PRESETS` (zones + slots + filtros category/target)
- [x] DTO/query Joi: `zone`, `equipment` (csv o array; siempre 4 slots)
- [x] `ExercisesRepository`: sample por filtros + fallback
- [x] `GET /exercises/recommend` en `ExercisesController`
- [x] Fallbacks si hay pocos resultados con el equipo elegido
- [x] Swagger
- [x] Response shape `{ role, exercise: { id, name, image, gif_url, category, equipment } }`
- [ ] (Front) pantalla zona → equipo → lista de 4 + CTA agregar al plan  

---

## Ejemplo end-to-end

**User elige:** zona Espalda, equipo `barbell` + `dumbbell`.

**Request**
```http
GET /exercises/recommend?zone=back&equipment=barbell,dumbbell
```

**Resultado esperado (ilustrativo):** 4 ejercicios de espalda, preferentemente con barra/mancuerna, cubriendo roles distintos (jalón/remo/aislamiento/accesorio), listos para mostrar en el módulo y opcionalmente pushear al `trainingProgram`.

---

## Notas

- Los valores de `equipment` deben coincidir con el catálogo (`GET /exercises/labels`).  
- `zone` es vocabulario de producto; no exponer al front la complejidad de `target` hasta que haga falta.  
- Si más adelante queremos músculo objetivo, sería un filtro **opcional** encima del preset, no el camino principal.
