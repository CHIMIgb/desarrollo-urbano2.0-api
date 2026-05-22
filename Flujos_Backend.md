# Flujos_Backend.md
## Plano Arquitectónico del Backend — Urban Planning 3D
**Versión:** 1.0 | **Stack:** Node.js · Express · PostgreSQL 16 (Supabase)
**Propósito:** Blueprint de referencia para migración o reescritura de la API REST.

---

## 1. Arquitectura de Capas

El backend sigue un patrón estrictamente en capas: cada capa tiene una única responsabilidad y sólo se comunica con la capa inmediatamente adyacente. Ninguna capa "salta" a otra no contigua.

```
Cliente HTTP (Frontend SPA)
        │
        ▼
┌─────────────────────────────────────────────────┐
│  CAPA 1 · server/index.js                       │
│  Punto de entrada, registro de middleware global│
│  y montaje de routers en sus prefijos base.     │
│  Responsabilidades:                             │
│  ─ CORS, body-parser (JSON / URL-encoded)       │
│  ─ Logger de peticiones HTTP (stdout)           │
│  ─ Bloqueo de rutas de ficheros sensibles       │
│  ─ Sirviente de archivos estáticos (SPA)        │
│  ─ Catch-all 404 para rutas /api/ desconocidas  │
│  ─ Delegación al errorHandler global            │
└─────────────┬───────────────────────────────────┘
              │ app.use('/api/auth', ...)
              │ app.use('/api/projects', ...)
              ▼
┌─────────────────────────────────────────────────┐
│  CAPA 2 · server/routes/                        │
│  Declaración de rutas HTTP y asignación de      │
│  middlewares de seguridad por router.           │
│  Archivos: auth.js · projects.js                │
│  ─ auth.js: sin middleware de sesión            │
│  ─ projects.js: aplica authenticateToken a      │
│    TODAS las rutas con router.use(...)          │
└─────────────┬───────────────────────────────────┘
              │ router.post('/save', controller.save)
              ▼
┌─────────────────────────────────────────────────┐
│  CAPA 2.5 · server/middleware/                  │
│  Interceptores transversales entre Routes y    │
│  Controllers.                                   │
│  ─ authMiddleware.js: valida JWT, inyecta       │
│    req.user (id, username, full_name)           │
│  ─ errorMiddleware.js: estandariza respuestas   │
│    de error; clase HttpError para errores HTTP  │
└─────────────┬───────────────────────────────────┘
              │ next() → controller
              ▼
┌─────────────────────────────────────────────────┐
│  CAPA 3 · server/controllers/                   │
│  Orquestadores de la petición HTTP.             │
│  Archivos: authController.js · projectController│
│  Responsabilidades:                             │
│  ─ Validar presencia de campos del body/params  │
│  ─ Extraer datos de req.body y req.user         │
│  ─ Llamar al servicio correspondiente           │
│  ─ Formatear y enviar res.json(...)             │
│  ─ Propagar errores con next(err)               │
└─────────────┬───────────────────────────────────┘
              │ await service.saveProject(...)
              ▼
┌─────────────────────────────────────────────────┐
│  CAPA 4 · server/services/                      │
│  Lógica de negocio y acceso a datos.            │
│  Archivos: authService.js · projectService.js   │
│  Responsabilidades:                             │
│  ─ Consultas SQL (parametrizadas)               │
│  ─ Transacciones BEGIN/COMMIT/ROLLBACK           │
│  ─ Hashing de contraseñas (bcrypt)              │
│  ─ Firma/verificación de tokens (jsonwebtoken)  │
│  ─ Lanzar HttpError semánticos (401, 403, 404)  │
└─────────────┬───────────────────────────────────┘
              │ db.query(sql, params)
              ▼
┌─────────────────────────────────────────────────┐
│  CAPA 5 · server/db.js                          │
│  Capa de conexión — Pool de conexiones pg.      │
│  Expone únicamente: query(text, params)         │
│  Soporta DATABASE_URL (Supabase/Heroku) o       │
│  variables individuales (DB_USER, DB_HOST…)     │
│  SSL automático en entorno de producción.       │
└─────────────────────────────────────────────────┘
              │
              ▼
     PostgreSQL 16 (Supabase / RDS)
```

> **Flujo resumido de una petición típica:**
> `HTTP Request` → `index.js` (middlewares globales) → `Router` (aplica auth si aplica) → `authMiddleware` (valida JWT) → `Controller` (valida campos) → `Service` (lógica + SQL) → `DB Pool` → `PostgreSQL` → respuesta sube por la misma pila.

---

## 2. Seguridad y Manejo de Errores

### 2.1 Flujo de Autenticación JWT

```
Cliente                   authMiddleware.js             authService.js
  │                              │                            │
  │── POST /api/auth/login ──────────────────────────────────▶│
  │   body: { username, password }                            │
  │                              │               loginUser()  │
  │                              │           ┌───────────────▶│ SELECT * FROM users WHERE username=$1
  │                              │           │                │ bcrypt.compare(password, hash)
  │                              │           │                │ jwt.sign({ id, username, full_name }, JWT_SECRET, {expiresIn:'2h'})
  │◀─ 200 { token, user } ───────────────────┘                │
  │
  │   (Peticiones posteriores — rutas protegidas)
  │── GET /api/projects/all ─────▶│
  │   headers: { authorization: "eyJ..." }
  │                              │ jwt.verify(token, JWT_SECRET)
  │                              │─── OK ──▶ req.user = { id, username, full_name }
  │                              │─── FAIL ─▶ 403 { error: 'Token invalido' }
  │                              │─── MISS ─▶ 401 { error: 'Token no proporcionado' }
```

**Detalles del token:**
- Algoritmo: HS256 (por defecto de `jsonwebtoken`).
- Payload: `{ id, username, full_name, iat, exp }`.
- TTL: 2 horas (`expiresIn: '2h'`).
- Secret: variable de entorno `JWT_SECRET` (fallback inseguro `'secret'` para desarrollo local).
- Transmisión: cabecera `Authorization` plana (sin prefijo `Bearer`).

### 2.2 Flujo del Manejador de Errores Global

Todos los controladores envuelven su lógica en `try/catch` y propagan errores con `next(err)`. El `errorHandler` registrado al final de `index.js` los intercepta.

```
Controller / Service lanza error
           │
           ▼
    ¿err instanceof HttpError?  (err.statusCode está definido)
           │
    Sí ────┼──── res.status(err.statusCode).json({ success: false, error: err.message })
           │
    No ────┼──── res.status(500).json({ success: false, error: err.message || 'Error interno' })
```

**Tabla de códigos estandarizados:**

| Código | Origen | Ejemplo de causa |
|--------|--------|-----------------|
| `400`  | Controller / Service | Campo faltante en body; ID inválido; usuario ya existe |
| `401`  | authMiddleware / authService | Token ausente; credenciales incorrectas |
| `403`  | authMiddleware / projectService | Token inválido o expirado; proyecto de otro usuario |
| `404`  | projectService | Proyecto no encontrado para ese `userId` |
| `500`  | errorHandler (catch-all) | Error inesperado de DB u otro runtime error |

---

## 3. Inventario Total de Endpoints

### 3.1 Módulo de Autenticación — `/api/auth`

No requieren autenticación previa.

---

#### `POST /api/auth/register`
**Descripción:** Crea una nueva cuenta de usuario en el sistema.

**Validaciones (Controller):** Los cuatro campos `username`, `full_name`, `email`, `password` son obligatorios; devuelve `400` si falta alguno.

**Proceso en `authService.registerUser`:**
1. `SELECT` en `users` para verificar que el `username` o `email` no existan — lanza `400` si ya están en uso.
2. `bcrypt.genSalt(10)` + `bcrypt.hash(password, salt)` para obtener el hash de la contraseña.
3. `INSERT INTO users (username, full_name, email, password_hash) RETURNING id, username, full_name, email`.
4. `jwt.sign(...)` para emitir un token de sesión inmediato.

**Respuesta exitosa:** `201 { success: true, token, user: { id, username, full_name, email } }`

---

#### `POST /api/auth/login`
**Descripción:** Autentica a un usuario existente y emite un JWT.

**Validaciones (Controller):** `username` y `password` obligatorios.

**Proceso en `authService.loginUser`:**
1. `SELECT * FROM users WHERE username = $1` — lanza `401` si no se encuentra.
2. `bcrypt.compare(password, user.password_hash)` — lanza `401` si no coincide (mismo mensaje genérico para no revelar qué campo es incorrecto).
3. `jwt.sign({ id, username, full_name }, JWT_SECRET, { expiresIn: '2h' })`.

**Respuesta exitosa:** `200 { success: true, token, user: { id, username, full_name, email } }`

---

#### `GET /api/auth/me`
**Descripción:** Verifica la validez de un token y devuelve el payload decodificado. Utilizado por el frontend al recargar la página para restaurar la sesión del usuario sin necesidad de un nuevo login.

**Proceso en `authService.verifyToken`:**
1. `jwt.verify(token, JWT_SECRET)` — lanza `401` si el token es inválido o ha expirado.

**Respuesta exitosa:** `200 { success: true, user: { id, username, full_name, iat, exp } }`

---

### 3.2 Módulo de Proyectos — `/api/projects`

**Todas las rutas requieren `authMiddleware`** (token JWT válido en cabecera `Authorization`). El `userId` es siempre extraído de `req.user.id` — jamás del body — garantizando el aislamiento de sesiones.

---

#### `POST /api/projects/save`
**Descripción:** Guarda o actualiza el estado completo de un proyecto urbano. Es la operación más compleja del sistema, ejecutada dentro de una **transacción SQL atómica**.

**Validaciones (Controller):** `features` debe existir y ser un `Array`.

**Proceso en `projectService.saveProject` (transacción):**

```sql
BEGIN;

-- PASO 1: ¿Es un proyecto nuevo o una actualización?

-- Si projectId es null/undefined (proyecto nuevo):
INSERT INTO projects (user_id, name, next_id, map_center_lng, map_center_lat, map_zoom, map_pitch, map_bearing)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING id;
-- El nuevo id se convierte en currentProjectId.

-- Si projectId existe (actualización):
SELECT id FROM projects WHERE id = $1 AND user_id = $2;
-- Lanza 403 si el proyecto no pertenece al usuario autenticado.
UPDATE projects
   SET name=$1, next_id=$2, map_center_lng=$3, map_center_lat=$4,
       map_zoom=$5, map_pitch=$6, map_bearing=$7, updated_at=NOW()
 WHERE id = $8;

-- PASO 2: Reemplazar todas las features espaciales (estrategia delete-and-reinsert)
DELETE FROM project_features WHERE project_id = $1;
-- Por cada feature del array:
INSERT INTO project_features (project_id, feature_data) VALUES ($1, $2::jsonb);

-- PASO 3 (condicional): Guardar snapshot de métricas urbanas si metrics.global existe
INSERT INTO project_metrics_snapshots
  (project_id, total_base_area, total_occupied_area, total_built_area, total_green_area, cos, cus, estimated_population)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING id;  -- → snapshotId

-- Por cada lote en metrics.lots (si el array existe):
INSERT INTO project_lot_metrics_snapshots
  (snapshot_id, lot_id, name, base_area, occupied_area, built_area, green_area, cos, cus)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);

COMMIT;
-- En caso de error en cualquier paso: ROLLBACK.
```

**Respuesta exitosa:** `200 { success: true, message: 'Proyecto guardado con exito', projectId }`

---

#### `GET /api/projects/all`
**Descripción:** Lista todos los proyectos del usuario autenticado (sólo metadatos, sin features ni métricas) para poblar el panel de historial.

**Proceso en `projectService.listUserProjects`:**
```sql
SELECT id, name, updated_at, created_at
FROM projects
WHERE user_id = $1
ORDER BY updated_at DESC;
```

**Respuesta exitosa:** `200 { success: true, projects: [{ id, name, updated_at, created_at }, ...] }`

---

#### `GET /api/projects/load`
**Descripción:** Carga el proyecto más reciente del usuario. Utilizado al iniciar la aplicación para restaurar automáticamente el estado de la última sesión de trabajo.

**Proceso en `projectService.loadLatestProject`:**
```sql
-- PASO 1: Obtener el proyecto más reciente
SELECT * FROM projects
WHERE user_id = $1
ORDER BY updated_at DESC
LIMIT 1;

-- PASO 2: Cargar todas sus features espaciales
SELECT feature_data FROM project_features WHERE project_id = $1;
```
Si no existe ningún proyecto para el usuario, retorna `project: null`.

**Respuesta exitosa:** `200 { success: true, project: { id, name, nextId, features: [...], mapView: {...} } }`

---

#### `GET /api/projects/:id`
**Descripción:** Carga un proyecto específico por su `id`. Incluye verificación de propiedad: si el `id` existe pero pertenece a otro usuario, lanza `404` (no revela existencia del recurso).

**Validaciones (Controller):** `parseInt(req.params.id)` debe ser un número válido; lanza `400` si no.

**Proceso en `projectService.loadProjectById`:**
```sql
-- PASO 1: Verificar existencia y propiedad simultáneamente
SELECT * FROM projects WHERE id = $1 AND user_id = $2;
-- Lanza 404 si no hay resultados.

-- PASO 2: Cargar features
SELECT feature_data FROM project_features WHERE project_id = $1;
```

**Respuesta exitosa:** `200 { success: true, project: { id, name, nextId, features: [...], mapView: {...} } }`

---

#### `POST /api/projects/audit`
**Descripción:** Registra un evento de auditoría en el log del sistema. Usado para trazar acciones significativas como importaciones desde OSM, exportaciones a GeoJSON, etc.

**Validaciones (Controller):** `action_type` es obligatorio.

**Proceso en `projectService.addAuditLog`:**
```sql
INSERT INTO audit_logs (user_id, project_id, action_type, details)
VALUES ($1, $2, $3, $4::jsonb);
```
`details` es de tipo JSONB libre — puede contener cualquier objeto JSON descriptivo del evento.

**Respuesta exitosa:** `200 { success: true, message: 'Evento de auditoria registrado' }`

---

### 3.3 Endpoint de Configuración Pública — `/api/config`

#### `GET /api/config`
**Descripción:** Expone las variables de configuración de OSM de forma segura al frontend, sin requerir autenticación. Permite que el cliente consuma tiles, geocodificación y Overpass desde los endpoints configurados en el servidor, evitando hardcodearlos en el código del cliente.

**Variables expuestas:**
- `OSM_TILE_URL`: URL de tiles del mapa base.
- `OSM_NOMINATIM_URL`: URL del servicio de geocodificación.
- `OSM_OVERPASS_ENDPOINTS`: Array de endpoints para importar datos OSM reales.

**Respuesta:** `200 { OSM_TILE_URL, OSM_NOMINATIM_URL, OSM_OVERPASS_ENDPOINTS: [...] }`

---

## 4. Estructura del Payload del Proyecto

El JSON que viaja entre el frontend y el backend al guardar o cargar un proyecto es el objeto central del sistema. A continuación se describe su forma abstracta con comentarios descriptivos.

### 4.1 Payload de Guardado — `POST /api/projects/save` (Request Body)

```jsonc
{
  // ─── IDENTIFICADOR (opcional en primer guardado) ─────────────────────────
  "projectId": 42,               // null o ausente para un proyecto nuevo;
                                 // presente para actualizar uno existente.

  // ─── METADATOS DEL PROYECTO ───────────────────────────────────────────────
  "name": "Centro Histórico — Fase II",
  "nextId": 187,                 // Contador interno de IDs de features; se
                                 // persiste para garantizar unicidad al reanudar.

  // ─── ESTADO DE LA CÁMARA 3D ────────────────────────────────────────────────
  "mapView": {
    "center": [-103.3500, 20.6597], // [longitud, latitud] del centroide visible.
    "zoom": 15.5,                   // Nivel de zoom de MapLibre (0–22).
    "pitch": 55,                    // Inclinación vertical de la cámara (0–85°).
    "bearing": -30                  // Rotación horizontal de la cámara (−180°/+180°).
  },

  // ─── FEATURES ESPACIALES (GeoJSON extendido) ──────────────────────────────
  // Array completo de todos los objetos del lienzo 3D.
  // Cada elemento es un Feature GeoJSON estándar con propiedades paramétricas.
  "features": [
    {
      "id": 12,
      "type": "Feature",
      "geometry": {
        "type": "Polygon",      // Point | LineString | Polygon según el tipo
        "coordinates": [[ [lng, lat], ... ]]
      },
      "properties": {
        "kind": "building",     // Discriminador de tipo: building | road | park |
                                // zone | railway | path | sidewalk | water |
                                // terrain | tree | furniture | custom_building

        // Propiedades paramétricas (varían por 'kind'):
        "height": 24,           // Altura en metros (edificios, extrusiones).
        "floors": 8,            // Número de pisos (derivado o explícito).
        "width": 12,            // Ancho en metros (calles, vías férreas).
        "lanes": 2,             // Número de carriles (calles).
        "color": "#A0C4FF",     // Color hex de renderizado.
        "label": "Torre Norte", // Nombre visible en el mapa.
        "landUse": "residential",// Uso de suelo (comercial, industrial, etc.)
        "groupId": null         // ID del grupo al que pertenece (selección múltiple).
      }
    }
    // ... más features
  ],

  // ─── MÉTRICAS URBANAS (snapshot, opcional) ────────────────────────────────
  // Si el frontend calculó estadísticas, las envía para persistirlas.
  "metrics": {
    "global": {
      "total_base_area": 15400.5,    // m² de suelo total analizado.
      "total_occupied_area": 8200.0, // m² de huella de construcción.
      "total_built_area": 65600.0,   // m² construidos totales (huella × pisos).
      "total_green_area": 3100.0,    // m² de área verde.
      "cos": 0.53,                   // Coeficiente de Ocupación del Suelo (0–1).
      "cus": 4.26,                   // Coeficiente de Utilización del Suelo.
      "estimated_population": 1820   // Población estimada (modelo paramétrico).
    },
    "lots": [
      {
        "lot_id": 7,             // ID de la feature de tipo 'zone' o 'terrain'.
        "name": "Manzana A",
        "base_area": 2100.0,
        "occupied_area": 980.0,
        "built_area": 7840.0,
        "green_area": 400.0,
        "cos": 0.47,
        "cus": 3.73
      }
      // ... un objeto por cada lote/zona del proyecto
    ]
  }
}
```

### 4.2 Payload de Respuesta — Carga de Proyecto (Response Body)

Al cargar un proyecto (`GET /load` o `GET /:id`), el servidor reconstruye y retorna:

```jsonc
{
  "success": true,
  "project": {
    "id": 42,
    "name": "Centro Histórico — Fase II",
    "nextId": 187,          // Para que el frontend reanude la generación de IDs.
    "mapView": {            // El mapa se posiciona exactamente donde se dejó.
      "center": [-103.3500, 20.6597],
      "zoom": 15.5,
      "pitch": 55,
      "bearing": -30
    },
    "features": [ /* Array completo de GeoJSON features */ ]
    // Nota: Las métricas NO se devuelven en la carga; el frontend las
    // recalcula en tiempo real a partir de las features al arrancar.
  }
}
```

---

## 5. Esquema de Base de Datos (Resumen)

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────────────┐
│    users    │ 1───────N│    projects      │ 1───────N│  project_features   │
├─────────────┤         ├──────────────────┤         ├─────────────────────┤
│ id (PK)     │         │ id (PK)          │         │ id (PK)             │
│ username    │         │ user_id (FK)     │         │ project_id (FK)     │
│ email       │         │ name             │         │ feature_data (JSONB) │
│ password_   │         │ next_id          │         └─────────────────────┘
│   hash      │         │ map_center_lng   │
│ full_name   │         │ map_center_lat   │         ┌─────────────────────────────┐
│ created_at  │         │ map_zoom         │ 1───────N│ project_metrics_snapshots   │
└─────────────┘         │ map_pitch        │         ├─────────────────────────────┤
                        │ map_bearing      │         │ id (PK)                     │
┌─────────────┐         │ created_at       │         │ project_id (FK)             │
│ audit_logs  │         │ updated_at       │         │ total_base_area             │
├─────────────┤         └──────────────────┘         │ total_occupied_area         │
│ id (PK)     │                                      │ total_built_area            │
│ user_id(FK) │                                      │ total_green_area            │
│ project_id  │                                      │ cos · cus                   │
│   (FK)      │                                      │ estimated_population        │
│ action_type │                                      │ created_at                  │
│ details     │                                      └──────────────┬──────────────┘
│   (JSONB)   │                                                     │ 1
│ timestamp   │                                                     N
└─────────────┘                                      ┌─────────────────────────────┐
                                                     │ project_lot_metrics_        │
                                                     │   snapshots                 │
                                                     ├─────────────────────────────┤
                                                     │ id (PK)                     │
                                                     │ snapshot_id (FK)            │
                                                     │ lot_id · name               │
                                                     │ base/occupied/built/green   │
                                                     │   _area                     │
                                                     │ cos · cus                   │
                                                     └─────────────────────────────┘
```

**Notas de diseño para migración:**
- `project_features.feature_data` es de tipo `JSONB` — máxima flexibilidad para evolucionar el modelo de features sin migraciones de columnas.
- `audit_logs.details` también es `JSONB` libre para soportar cualquier metadato de auditoría futuro.
- La estrategia de guardado de features es **delete-and-reinsert** (no upsert) — simplifica la lógica pero implica que los IDs de `project_features` cambian en cada guardado. El identificador persistente de una feature es su campo `feature_data.id` dentro del JSONB.
- Los `project_metrics_snapshots` son un historial acumulativo — nunca se borran al guardar; cada guardado genera una nueva fila con `created_at`.

---

## 6. Variables de Entorno Requeridas

| Variable | Descripción | Ejemplo |
|---|---|---|
| `PORT` | Puerto del servidor Express | `3000` |
| `DATABASE_URL` | Connection string completa de PostgreSQL | `postgres://user:pass@host:5432/db` |
| `JWT_SECRET` | Clave secreta para firma HMAC-SHA256 del JWT | `una-cadena-aleatoria-larga` |
| `MAX_PAYLOAD_SIZE` | Límite del body JSON (features pueden ser pesadas) | `100mb` |
| `OSM_TILE_URL` | URL de tiles del mapa base | `https://tile.openstreetmap.org/{z}/{x}/{y}.png` |
| `OSM_NOMINATIM_URL` | URL del geocodificador | `https://nominatim.openstreetmap.org/search` |
| `OSM_OVERPASS_ENDPOINTS` | Lista de endpoints Overpass separados por coma | `https://overpass-api.de/api/interpreter` |

> ⚠️ **Nota de seguridad:** El código tiene un fallback `JWT_SECRET || 'secret'`. En cualquier entorno de producción o staging, **esta variable debe estar definida con un valor criptográficamente seguro**.

---

## 7. Consideraciones para Migración

Al portar esta API a otro runtime (Django, FastAPI, Node.js avanzado), considerar los siguientes puntos:

1. **Transacción de guardado:** El `BEGIN/COMMIT/ROLLBACK` manual de `projectService.saveProject` debe mapearse al ORM o gestor de transacciones equivalente. La atomicidad es crítica.

2. **Estrategia de features:** La lógica delete-and-reinsert puede reemplazarse por una estrategia upsert basada en `feature_data->>'id'` para mejorar el rendimiento con proyectos grandes.

3. **JWT sin Bearer:** El frontend envía el token en la cabecera `Authorization` sin el prefijo `Bearer `. Un framework que espere `Bearer <token>` requerirá un ajuste en el cliente o en el middleware.

4. **JSONB:** Si se migra a un motor no-PostgreSQL, `feature_data` y `details` requerirán una estrategia alternativa (campo `TEXT` con JSON serializado, o una tabla de atributos normalizada).

5. **Métricas no retornadas en carga:** El sistema actual no persiste las métricas históricas en la respuesta de carga — el frontend las recalcula. Una migración podría optar por devolver el último snapshot para mejorar el tiempo de arranque.

---

*Documento generado a partir del análisis completo del código fuente del backend de Urban Planning 3D — Versión 1.0.*
