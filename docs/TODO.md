Siguiente (bloquea “Mi plan” logueado)
GET /me (Bearer token)
Usuario actual: id, email, name, lastName
Sin token / token inválido → 401

Middleware JWT
Lee Authorization: Bearer <accessToken>, valida, pone userId en el request

GET /me/program (Bearer)
Plan activo del alumno + ejercicios populados del catálogo
Shape mínimo:

{
  "id": "...",
  "title": "...",
  "notes": "...",
  "coach": { "name": "..." },
  "exercises": [
    {
      "assignmentId": "...",
      "order": 1,
      "sets": 3,
      "reps": "8-10",
      "rest": 90,
      "notes": "...",
      "exercise": { "id": "0001", "name": { "en": "...", "es": "..." }, "image": "...", "gif_url": "...", "category": "..." }
    }
  ]
}
Si no tiene plan → 404 o { "exercises": [] } (acordemos uno; el front se adapta)

Después (coach, no urgente para el alumno)
Crear/editar plan y asignar ejercicios (POST /programs, etc.)
Puede ser seed/manual en Mongo al principio para probar el front
Checklist corto para vos en el back

 JWT en register + login (ya lo tenés)

 Guard Authorization en rutas privadas

 GET /me

 Modelo programs + program_exercises (o embebido)

 GET /me/program con populate

 Un usuario de prueba con plan asignado
Cuando eso esté, acá solo: mandar el Bearer en el client, llamar /me + /me/program al clickear Mi plan logueado, y pintar la vista.