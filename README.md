# Gym Data API

Backend NestJS para consultar ejercicios de gym desde MongoDB Atlas.

Expone listados con paginación y filtros, labels para armar selects en el front, detalle por id y un ejercicio aleatorio.

## Stack

- NestJS 11
- MongoDB + Mongoose
- Joi (validación de query params)
- Swagger (`/docs`)
- Morgan (logs HTTP)

## Requisitos

- Node.js 20+ (recomendado)
- npm
- Una base MongoDB (Atlas u otra) con la colección `exercises`

## Setup

```bash
git clone <repo-url>
cd gym-data-be
npm install
cp .env.example .env   # o crea el .env a mano
```

Completa las variables en `.env` y arranca:

```bash
npm run start:dev
```

API: `http://localhost:3000`  
Swagger: `http://localhost:3000/docs`

## Variables de entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `PORT` | Puerto del servidor | `3000` |
| `MONGODB_URI` | Connection string de Mongo | `mongodb+srv://user:pass@cluster...` |
| `MONGODB_DATABASE` | Nombre de la base | `gym` |
| `CORS_ORIGINS` | Orígenes permitidos (separados por coma) | `http://127.0.0.1:5500,https://tu-app.vercel.app` |

> No subas el `.env` al repo. Está en `.gitignore`.

Ejemplo de `.env`:

```env
PORT=3000
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net
MONGODB_DATABASE=gym
CORS_ORIGINS=http://127.0.0.1:5500,http://localhost:5500
```

## Scripts

```bash
npm run start:dev    # desarrollo con watch
npm run start:prod   # producción (requiere build)
npm run build        # compila a dist/
npm run lint         # eslint
npm run test         # unit tests
npm run test:e2e     # e2e
```

## Endpoints

Base: `http://localhost:3000`

### `GET /exercises`

Lista ejercicios paginados, con filtros opcionales.

**Query params**

| Param | Tipo | Default | Notas |
|---|---|---|---|
| `page` | number | `1` | ≥ 1 |
| `limit` | number | `50` | 1–100 |
| `category` | string | — | match exacto |
| `bodyPart` | string | — | mapea a `body_part` |
| `target` | string | — | match exacto |
| `equipment` | string | — | match exacto |
| `muscleGroup` | string | — | mapea a `muscle_group` |

**Ejemplo**

```http
GET /exercises?page=1&limit=20&category=waist&equipment=body%20weight
```

**Respuesta**

```json
{
  "data": [ /* ejercicios */ ],
  "limit": 20,
  "page": 1,
  "pages": 10,
  "total": 200
}
```

### `GET /exercises/labels`

Valores únicos para armar filtros en el front (`category`, `equipment`, `target`).

```http
GET /exercises/labels
```

```json
{
  "category": ["back", "chest", "waist"],
  "equipment": ["barbell", "body weight"],
  "target": ["abs", "biceps"]
}
```

### `GET /exercises/random`

Devuelve un ejercicio al azar.

```http
GET /exercises/random
```

### `GET /exercises/:id`

Detalle por id de negocio (ej. `"0001"`), no el `_id` de Mongo.

```http
GET /exercises/0001
```

## Modelo de exercise (resumen)

Campos principales en Mongo:

| Campo | Uso |
|---|---|
| `id` | Id de negocio (`0001`) |
| `name` | Nombre |
| `category` / `body_part` / `equipment` | Filtros |
| `muscle_group` / `secondary_muscles` / `target` | Músculos |
| `instructions` / `instruction_steps` | Textos multi-idioma |
| `image` / `gif_url` | Rutas relativas de media |
| `media_id` / `attribution` / `created_at` | Meta |

Ejemplo de media en el front:

```ts
const imageUrl = `/${exercise.image}`   // /images/0001-xxx.jpg
const gifUrl = `/${exercise.gif_url}`   // /videos/0001-xxx.gif
```

Las imágenes/gifs viven como estáticos en el frontend (`public/images`, `public/videos`), no en este API.

## Estructura

```text
src/
  common/
    dto/                 # PaginatedResponse
    pipes/               # JoiValidationPipe
  database/              # Conexión Mongo (DatabaseModule)
  exercises/
    dto/                 # Query + response DTOs
    repositories/        # Acceso a datos
    schemas/             # Schema Mongoose
    exercises.controller.ts
    exercises.service.ts
    exercises.module.ts
  app.module.ts
  main.ts                # CORS, Swagger, Morgan
```

Flujo típico:

```text
Controller → Service → Repository → MongoDB
```

## CORS

Configura los orígenes del front en `CORS_ORIGINS`.

Local (Live Server):

```env
CORS_ORIGINS=http://127.0.0.1:5500,http://localhost:5500
```

Producción (front en Vercel + API en otro host):

```env
CORS_ORIGINS=https://tu-app.vercel.app
```

## Documentación interactiva

Con el server corriendo:

[http://localhost:3000/docs](http://localhost:3000/docs)

## Notas de deploy

- Este backend es NestJS “clásico”: conviene hostearlo en Railway, Render, Fly.io, etc.
- Vercel encaja mejor para el frontend.
- En el host del API configura las mismas variables de entorno (`MONGODB_URI`, `MONGODB_DATABASE`, `CORS_ORIGINS`, `PORT`).

## Licencia

UNLICENSED (privado).
