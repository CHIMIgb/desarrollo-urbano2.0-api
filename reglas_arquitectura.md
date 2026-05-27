# 📐 Reglas de Arquitectura — Urban Planning 3D API

**Versión:** 1.0  
**Propósito:** Documento normativo que define las reglas, convenciones y patrones que **todo nuevo código** debe respetar. Cualquier contribución que viole estas reglas debe ser rechazada en Code Review.

---

## 1. Arquitectura de Capas (Estricta)

La API sigue un patrón de **5 capas con comunicación unidireccional descendente**. Cada capa solo puede comunicarse con la capa inmediatamente inferior. Nunca se salta una capa.

```
┌─────────────────────────────────────────────────────────┐
│  CAPA 1 · Routes (server/routes/)                       │
│  Define endpoints HTTP y aplica middlewares de acceso.   │
├─────────────────────────────────────────────────────────┤
│  CAPA 2 · Middleware (server/middleware/)                │
│  Interceptores HTTP: autenticación, rate limit, errores. │
├─────────────────────────────────────────────────────────┤
│  CAPA 3 · Controllers (server/controllers/)             │
│  Orquestadores HTTP: validan input y formatean output.   │
├─────────────────────────────────────────────────────────┤
│  CAPA 4 · Services (server/services/)                   │
│  Lógica de negocio pura. SIN conocimiento de HTTP.       │
├─────────────────────────────────────────────────────────┤
│  CAPA 5 · Data (server/db.js)                           │
│  Pool de conexiones PostgreSQL.                          │
└─────────────────────────────────────────────────────────┘
```

### Reglas de Dependencia

| Capa             | ✅ Puede importar                           | ❌ NO puede importar               |
|------------------|---------------------------------------------|------------------------------------|
| Routes           | Controllers, Middleware                     | Services, db.js, Utils             |
| Middleware       | Services (solo lectura), Utils, Errors      | Controllers, Routes                |
| Controllers      | Services, Utils, `HttpError`                | db.js, Middleware, Routes           |
| Services         | db.js, Utils, `DomainError` (errors.js)     | Controllers, Middleware, `HttpError`|
| db.js            | pg (librería externa)                       | Todo lo demás                      |

> **Regla de Oro:** La capa de Servicios **NUNCA** importa nada de la capa Middleware. Si un servicio necesita indicar un error, usa las clases de `server/utils/errors.js` (DomainErrors), nunca `HttpError`.

---

## 2. Convenciones de Nombrado

### Archivos

| Capa         | Patrón de Nombre             | Ejemplo                    |
|--------------|------------------------------|----------------------------|
| Routes       | `{recurso}.js`               | `auth.js`, `projects.js`   |
| Controllers  | `{recurso}Controller.js`     | `authController.js`        |
| Services     | `{recurso}Service.js`        | `authService.js`           |
| Middleware   | `{función}Middleware.js`     | `authMiddleware.js`        |

### Funciones

| Capa         | Estilo                       | Ejemplo                              |
|--------------|------------------------------|--------------------------------------|
| Controllers  | Verbo corto (acción HTTP)    | `register`, `login`, `save`, `getAll`|
| Services     | Verbo descriptivo completo   | `registerUser`, `loginUser`, `saveProject`, `loadProjectById` |

### Variables de Entorno
- Siempre en `SCREAMING_SNAKE_CASE`.
- Prefijadas por dominio cuando es posible: `OSM_TILE_URL`, `DDOS_BLOCK_DURATION_MINUTES`.
- Documentadas en la tabla de variables del `Flujos_Backend.md` y en `.env.example`.

---

## 3. Manejo de Errores (Sistema de Dos Niveles)

### Nivel 1: Errores de Dominio (Capa de Servicios)

Los servicios lanzan **exclusivamente** errores de dominio definidos en `server/utils/errors.js`:

```javascript
// ✅ CORRECTO — Servicio lanza error de dominio
const { NotFoundError } = require('../utils/errors');
throw new NotFoundError(MESSAGES.PROJECTS.NOT_FOUND);

// ❌ INCORRECTO — Servicio lanza error HTTP
const { HttpError } = require('../middleware/errorMiddleware');
throw new HttpError(404, 'No encontrado'); // PROHIBIDO en servicios
```

**Clases de error disponibles y su mapeo HTTP (definido en errorMiddleware):**

| Clase de Dominio      | Código HTTP | Uso                                          |
|-----------------------|-------------|----------------------------------------------|
| `ValidationError`     | `400`       | Datos de entrada inválidos o incompletos      |
| `AuthenticationError` | `401`       | Credenciales incorrectas, token expirado      |
| `AuthorizationError`  | `403`       | Acceso denegado a un recurso existente        |
| `NotFoundError`       | `404`       | Recurso no encontrado                         |
| `ConflictError`       | `409`       | Conflicto de unicidad (usuario duplicado)     |

> **Para añadir un nuevo tipo de error:** Crear la clase en `errors.js` heredando de `DomainError`, y registrar su mapeo HTTP en `errorMiddleware.js`.

### Nivel 2: Errores HTTP (Capa de Controllers y Middleware)

Los controladores y middlewares pueden lanzar `HttpError` para errores de validación de entrada HTTP:

```javascript
// ✅ CORRECTO — Controller lanza HttpError para validación de input
if (!username || !password) {
  throw new HttpError(400, MESSAGES.COMMON.MISSING_FIELDS);
}
```

### Flujo Completo de un Error

```
Servicio lanza DomainError
        ↓
Controller lo propaga con next(err)
        ↓
errorMiddleware lo intercepta
        ↓
Mapea DomainError → código HTTP
        ↓
Traduce el mensaje con req.t() (i18n)
        ↓
Responde con sendResponse() → { success: false, error: {...} }
```

---

## 4. Formato de Respuesta (Contrato Estándar)

**TODA** respuesta de la API, sin excepción, debe pasar por `sendResponse()` de `server/utils/responseHandler.js`.

### Respuesta Exitosa (2xx)
```json
{
  "success": true,
  "data": { /* payload */ },
  "error": null
}
```

### Respuesta de Error (4xx / 5xx)
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "Bad Request",
    "message": "Faltan campos obligatorios",
    "details": null
  }
}
```

### Reglas del Contrato
1. **Nunca** usar `res.json()` o `res.send()` directamente. Siempre `sendResponse()`.
2. Los mensajes de éxito en controladores deben usar las claves del diccionario: `req.t(MESSAGES.X.Y)`.
3. Los mensajes de error son traducidos automáticamente por el `errorMiddleware`. No traducirlos en el controlador.

---

## 5. Diccionario de Mensajes e Internacionalización (i18n)

### Regla Fundamental
**Ningún** string de usuario final debe estar escrito directamente en el código. Todos deben ser claves de traducción definidas en `server/utils/constants.js` y resueltas por los archivos de `server/locales/`.

### Añadir un Nuevo Mensaje (Checklist)
1. Definir la clave en `server/utils/constants.js` dentro de la categoría correspondiente.
2. Añadir la traducción en `server/locales/es/translation.json`.
3. Añadir la traducción en `server/locales/en/translation.json`.
4. Usar la clave vía `MESSAGES.CATEGORIA.NOMBRE` en el código.

```javascript
// constants.js
MESSAGES.PROJECTS.DELETED = 'projects.deleted'

// locales/es/translation.json
{ "projects": { "deleted": "Proyecto eliminado con éxito" } }

// locales/en/translation.json
{ "projects": { "deleted": "Project deleted successfully" } }

// En el controlador (éxito):
sendResponse(res, 200, { message: req.t(MESSAGES.PROJECTS.DELETED) });

// En el servicio (error):
throw new NotFoundError(MESSAGES.PROJECTS.NOT_FOUND);
// → errorMiddleware traduce automáticamente con req.t()
```

### Categorías del Diccionario
| Categoría   | Prefijo           | Uso                                       |
|-------------|-------------------|--------------------------------------------|
| `AUTH`      | `auth.*`          | Autenticación, tokens, sesiones            |
| `PROJECTS`  | `projects.*`      | Operaciones CRUD de proyectos              |
| `CONFIG`    | `config.*`        | Configuración del sistema                  |
| `COMMON`    | `common.*`        | Errores genéricos (404, 500, campos)       |
| `SECURITY`  | `security.*`      | Rate limiting, DDoS, bloqueo de IPs        |

---

## 6. Seguridad

### Autenticación JWT
- **Transmisión:** Cabecera `Authorization: Bearer <token>`.
- **Duración:** 1 hora (`JWT_EXPIRES_IN` en segundos desde `.env`).
- **Payload:** `{ id, username, full_name, iat, exp }` — nunca incluir datos sensibles.
- **Algoritmo:** HS256 (por defecto de jsonwebtoken).
- **Blacklist:** Tokens revocados se persisten en la tabla `invalidated_tokens`. El middleware verifica la blacklist **antes** de verificar la firma JWT.

### Protección por Middleware
Todo router de recursos protegidos debe aplicar `authenticateToken` a nivel de router:

```javascript
// ✅ CORRECTO — Protección global del router
router.use(authenticateToken);
router.get('/', controller.getAll);
router.post('/save', controller.save);

// ❌ INCORRECTO — Protección por ruta individual (inconsistente)
router.get('/', authenticateToken, controller.getAll);
router.post('/save', controller.save); // ← Desprotegida por descuido
```

### Rate Limiting (3 capas en orden)
1. **IP Blocker** → Rechaza IPs bloqueadas instantáneamente (caché en memoria).
2. **DDoS Limiter** → Detecta ráfagas por minuto, bloquea la IP en BD.
3. **Global Limiter** → Cuota máxima por hora (429 Too Many Requests).

> El orden es crítico. Cambiar el orden rompe la protección.

### Identificación del Usuario
- **Siempre** extraer `userId` de `req.user.id` (inyectado por el middleware JWT).
- **Nunca** confiar en un `userId` enviado por el cliente en el body o los params.

---

## 7. Acceso a Base de Datos

### Consultas Simples (Lectura)
Usar `db.query()` directamente:
```javascript
const result = await db.query('SELECT * FROM projects WHERE user_id = $1', [userId]);
```

### Transacciones (Escritura múltiple)
Usar `db.getClient()` con el patrón `BEGIN / COMMIT / ROLLBACK`:
```javascript
const client = await db.getClient();
try {
  await client.query('BEGIN');
  // ... operaciones ...
  await client.query('COMMIT');
} catch (err) {
  await client.query('ROLLBACK');
  throw err;
} finally {
  client.release(); // ← OBLIGATORIO, siempre en finally
}
```

### Reglas SQL
1. **Siempre** usar consultas parametrizadas (`$1, $2, ...`). Nunca concatenar strings.
2. **Solo** la capa de Servicios y `securityService` pueden ejecutar `db.query()`.
3. **Nunca** ejecutar consultas SQL en Controllers, Middleware o Routes.
4. Los datos JSONB se insertan con `JSON.stringify(obj)` y se leen nativamente (PostgreSQL lo deserializa).

---

## 8. Estructura de un Nuevo Módulo (Plantilla)

Al añadir un nuevo recurso (ej. `/api/users`), crear los siguientes archivos en este orden:

### Paso 1: Servicio (`server/services/usersService.js`)
```javascript
const db = require('../db');
const { NotFoundError } = require('../utils/errors');
const { MESSAGES } = require('../utils/constants');

const getAllUsers = async () => {
  const result = await db.query('SELECT id, username, email FROM users');
  return result.rows;
};

module.exports = { getAllUsers };
```

### Paso 2: Controlador (`server/controllers/usersController.js`)
```javascript
const usersService = require('../services/usersService');
const { HttpError } = require('../middleware/errorMiddleware');
const { sendResponse } = require('../utils/responseHandler');
const { MESSAGES } = require('../utils/constants');

const getAll = async (req, res, next) => {
  try {
    const users = await usersService.getAllUsers();
    sendResponse(res, 200, { users });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll };
```

### Paso 3: Rutas (`server/routes/users.js`)
```javascript
const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);
router.get('/', usersController.getAll);

module.exports = router;
```

### Paso 4: Registrar en `server/index.js`
```javascript
const usersRoutes = require('./routes/users');
app.use(`${apiPrefix}/users`, usersRoutes);
```

### Paso 5: Mensajes
- Añadir claves en `constants.js` bajo una nueva categoría `USERS`.
- Añadir traducciones en `locales/es/translation.json` y `locales/en/translation.json`.

---

## 9. Patrones Obligatorios en Controllers

Cada función de un controlador debe seguir exactamente esta estructura:

```javascript
const nombreAccion = async (req, res, next) => {
  try {
    // 1. Extraer datos de req.body, req.params, req.user
    // 2. Validar campos obligatorios (lanzar HttpError si faltan)
    // 3. Llamar al servicio correspondiente
    // 4. Responder con sendResponse()
  } catch (err) {
    next(err); // ← SIEMPRE propagar al errorMiddleware
  }
};
```

**Reglas:**
- **Nunca** poner lógica de negocio en un controller (ej: consultas SQL, hashing).
- **Nunca** hacer `res.json()` directo. Siempre `sendResponse()`.
- **Nunca** hacer `res.status(500).json(...)` manualmente. El `errorMiddleware` se encarga.
- **Siempre** propagar errores con `next(err)`, nunca tragárselos con un `catch` vacío.

---

## 10. Checklist de Code Review

Antes de aprobar cualquier PR, verificar:

- [ ] ¿Los servicios lanzan solo `DomainError`, nunca `HttpError`?
- [ ] ¿Los controladores usan `sendResponse()` para todas las respuestas?
- [ ] ¿Las consultas SQL están parametrizadas (`$1, $2, ...`)?
- [ ] ¿Las operaciones de escritura múltiple usan transacciones con `BEGIN/COMMIT/ROLLBACK`?
- [ ] ¿El `client.release()` está en un bloque `finally`?
- [ ] ¿Los nuevos mensajes están en `constants.js` Y en ambos archivos de `locales/`?
- [ ] ¿El `userId` se extrae de `req.user.id`, no del body?
- [ ] ¿Las rutas protegidas usan `router.use(authenticateToken)` a nivel de router?
- [ ] ¿No hay `console.log()` para debugging? (Solo `console.error()` en errores legítimos)
- [ ] ¿El nuevo router está registrado en `index.js`?

---

## Apéndice A: Inconsistencias Conocidas (Deuda Técnica)

Las siguientes inconsistencias existen actualmente en el código y deben corregirse:

### A.1 — `projectService.js` importa `HttpError`
**Archivo:** `server/services/projectService.js`  
**Problema:** La función `saveProject` lanza `new HttpError(403, ...)` cuando un proyecto no pertenece al usuario. Esto viola la regla de que los servicios solo deben lanzar `DomainError`.  
**Solución:** Reemplazar por `throw new AuthorizationError(MESSAGES.PROJECTS.NO_PERMISSION)`.

### A.2 — `/auth/validate` no verifica blacklist
**Archivo:** `server/services/authService.js` → `verifyToken()`  
**Problema:** La función `verifyToken` solo valida la firma JWT pero **no consulta** la tabla `invalidated_tokens`. Un token revocado (logout) seguiría siendo reportado como válido por este endpoint.  
**Solución:** Añadir verificación de blacklist dentro de `verifyToken`, o proteger la ruta con `authenticateToken` (que ya lo hace).

### A.3 — `MESSAGES.PROJECTS.NO_ACCESS` no se usa
**Archivo:** `server/utils/constants.js`  
**Problema:** La clave `NO_ACCESS` está definida pero no se utiliza en ningún archivo.  
**Solución:** Eliminarla o utilizarla donde corresponda.

### A.4 — `loadLatestProject` no lanza error cuando no hay proyectos
**Archivo:** `server/services/projectService.js`  
**Problema:** `loadLatestProject` retorna `null` si no hay proyectos, mientras que `loadProjectById` lanza `NotFoundError`. Comportamiento inconsistente.  
**Solución:** Esto es aceptable por diseño (al iniciar la app por primera vez no hay proyectos), pero debe documentarse como excepción intencionada.
