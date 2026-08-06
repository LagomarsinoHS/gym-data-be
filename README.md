# Gym Data API

Backend NestJS para el catálogo de ejercicios, sesión de usuarios (athlete / coach / admin), planes de entrenamiento, invites coach↔athlete, **fotos de progreso** y **perfil** (foto + editar + baja).

Consume MongoDB Atlas. El front (estáticos, GIFs e imágenes de catálogo) vive en el repo del frontend; este API no sirve media del catálogo. Fotos de Avances y de perfil van a Cloudinary.

## Stack

- NestJS 11
- MongoDB + Mongoose
- Auth: JWT (Passport) + Argon2
- Validación: Joi
- Swagger (`/docs`)
- ExcelJS / JSZip (export de pautas)
- Cloudinary (progress photos + profile photo)
- OpenAI SDK (`openai` module — listo para features IA; opcional al boot)
- Morgan (logs HTTP)

## Requisitos

- Node.js **22.x** (`engines` en `package.json`)
- npm
- MongoDB con colecciones de exercises, users e invites
- Cloudinary (Avances y foto de perfil)

## Setup

```bash
git clone <repo-url>
cd gym-data-be
npm install
cp .env.example .env
```

Completá las variables y arrancá:

```bash
npm run start:dev
```

- API: `http://localhost:3000`
- Swagger: `http://localhost:3000/docs`

## Variables de entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `PORT` | Puerto del servidor | `3000` |
| `MONGODB_URI` | Connection string | `mongodb+srv://user:pass@cluster...` |
| `MONGODB_DATABASE` | Nombre de la base | `gym` |
| `JWT_SECRET` | Secreto JWT (≥ 32 chars) | `openssl rand -base64 32` |
| `JWT_EXPIRES_IN` | Expiración del token | `7d` |
| `CORS_ORIGINS` | Orígenes permitidos (coma) | `http://127.0.0.1:5500,https://tu-app.vercel.app` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud | … |
| `CLOUDINARY_API_KEY` | Cloudinary API key | … |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | … |
| `OPENAI_API_KEY` | API key OpenAI (opcional) | `sk-...` |
| `OPENAI_MODEL` | Modelo por defecto | `gpt-5-mini` |

> No subas el `.env`. Está en `.gitignore`.  
> `OPENAI_*` es opcional: la app arranca sin key; fallan solo las llamadas a `OpenAiService` (`OPENAI_NOT_CONFIGURED`).

```env
PORT=3000
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net
MONGODB_DATABASE=gym
JWT_SECRET=replace-with-openssl-rand-base64-32-output
JWT_EXPIRES_IN=7d
CORS_ORIGINS=http://127.0.0.1:5500,http://localhost:5500
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5-mini
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

## Capacidades

| Área | Qué cubre |
|---|---|
| Auth | Register / login JWT (`sub` + `role`) |
| Exercises | Listado, labels, random, by id, recommend (legado) + recommend2 (IA) |
| Training program | Add / remove / edit (atleta); replace + export (coach) |
| Invites | Create, respond, pending, history, athletes + cupos por plan |
| Progress photos | Upload / delete / GET timeline (self o coach); peso mensual |
| Perfil | `GET/PATCH /users/me`, foto de perfil, soft-delete (`DELETE /users/me`) |
| OpenAI | `OpenAiModule` / `OpenAiService.recommendWorkout` (Responses API) — sin HTTP aún; próximo: recommend IA |
| Admin | Grant / revoke subscription |

Roles: `athlete` | `coach` | `admin`.  
Subscription: `free` | `premium` | `growth` | `pro` (cuotas de alumnos por plan en coaches).

Cloudinary:

| Uso | Path |
|---|---|
| Progress | `gym-app/progress/{userId}/{YYYY}/{mon}/{side}` |
| Profile | `gym-app/profiles/{userId}/profilePhoto` |

## Módulos

| Módulo | Responsabilidad |
|---|---|
| `auth` | Register / login, JWT, `RolesGuard` |
| `users` | Perfil, training program, invites, athletes, export, progress photos, profile photo, baja |
| `exercises` | Catálogo, labels, random, recommend |
| `storage` | Cloudinary: `uploadImage`, `deleteImage`, `deleteFolder` |
| `openai` | Cliente OpenAI: `isConfigured` / `recommendWorkout` (importar `OpenAiModule` donde se use) |
| `admin` | Grant / revoke subscription |
| `excel` · `zip` | Export de planes coach |
| `database` | Conexión Mongo |
| `common` | Pipes Joi, hashing, error codes HTTP |

Flujo típico: `Controller → Service → Repository → MongoDB` (fotos: Service → StorageService → Cloudinary; metadata en User).

## Estructura

```text
src/
  admin/
  auth/           # JWT, guards, strategies
  common/         # dto, pipes, hashing, errors
  config/         # validación de env
  database/
  excel/ · zip/
  exercises/
  openai/         # OpenAI SDK wrapper (sin controller)
  storage/        # Cloudinary
  users/          # User + Invite + progress/profile photos
  app.module.ts
  main.ts         # CORS, Swagger, Morgan
docs/
  API-ENDPOINTS.md
  TODO.md
```

## Documentación

| Doc | Contenido |
|---|---|
| Swagger | `http://localhost:3000/docs` (interactivo) |
| [`docs/API-ENDPOINTS.md`](docs/API-ENDPOINTS.md) | Catálogo de endpoints, shapes, error codes |
| [`docs/TODO.md`](docs/TODO.md) | Hechos / pendientes del back |

Las imágenes/GIFs del catálogo se resuelven en el frontend (`public/images`, `public/videos`) a partir de rutas relativas del documento exercise. Las fotos de Avances y de perfil se guardan en Cloudinary; el API devuelve `url` desde Mongo (sin `publicId` al cliente).

## CORS

Configurá orígenes del front en `CORS_ORIGINS`.

```env
# Local (Live Server / static serve)
CORS_ORIGINS=http://127.0.0.1:5500,http://localhost:5500

# Producción
CORS_ORIGINS=https://tu-app.vercel.app
```

## Deploy

- NestJS “clásico”: Railway, Render, Fly.io, etc.
- En el host configurá las mismas variables (`MONGODB_*`, `JWT_*`, `CORS_ORIGINS`, `CLOUDINARY_*`, `OPENAI_*` si usás IA, `PORT`).
- El frontend suele ir aparte (p. ej. Vercel).

## Licencia

UNLICENSED (privado).
