# Urban Planning 3D - API Backend

Backend para la plataforma Urban Planning 3D. Desarrollado con Node.js, Express y PostgreSQL.

## 🚀 Tecnologías

- **Node.js** & **Express**: Servidor y enrutamiento HTTP.
- **PostgreSQL**: Base de datos relacional (optimizado con soporte para JSONB).
- **JWT (JSON Web Tokens)**: Autenticación segura.
- **Bcrypt**: Hashing de contraseñas.
- **pg**: Cliente de PostgreSQL para Node.js.

## 📦 Instalación y Configuración

1. Clona el repositorio.
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Configura las variables de entorno. Crea un archivo `.env` en la raíz (puedes basarte en `.env.example`) con las siguientes variables principales:

   ```env
   PORT=3000
   DATABASE_URL=postgres://usuario:contraseña@host:5432/basedatos
   JWT_SECRET=tu-secreto-seguro
   JWT_EXPIRES_IN=3600
   MAX_PAYLOAD_SIZE=100mb
   OSM_TILE_URL=https://tile.openstreetmap.org/{z}/{x}/{y}.png
   OSM_NOMINATIM_URL=https://nominatim.openstreetmap.org/search
   OSM_OVERPASS_ENDPOINTS=https://overpass-api.de/api/interpreter
   ```

## 🛠️ Entorno de Desarrollo

Para iniciar el servidor en modo desarrollo (con reinicio automático usando `nodemon`):

```bash
npm run dev
```

Para iniciar el servidor en modo producción:

```bash
npm start
```

## 📂 Estructura del Proyecto

El proyecto sigue una arquitectura estricta en capas para una clara separación de responsabilidades:

- **`server/index.js`**: Punto de entrada, configuración de Express y middlewares globales.
- **`server/routes/`**: Declaración de rutas de la API (`/api/auth`, `/api/projects`).
- **`server/middleware/`**: Interceptores como manejo de errores y validación de tokens JWT.
- **`server/controllers/`**: Validación de payloads y orquestación de la petición HTTP.
- **`server/services/`**: Lógica de negocio principal, transacciones y consultas SQL.
- **`server/db.js`**: Configuración del pool de conexiones a PostgreSQL.

## 🔗 Endpoints Principales

### Autenticación (`/api/auth`)
- `POST /register`: Crea una cuenta nueva.
- `POST /login`: Inicia sesión y obtiene un JWT.
- `GET /me`: Verifica la validez del token actual.

### Proyectos (`/api/projects` - Requieren Autenticación)
- `POST /save`: Guarda o actualiza el estado completo de un proyecto urbano en la BD (features 3D, cámara, métricas) mediante una transacción SQL.
- `GET /all`: Lista los metadatos de todos los proyectos del usuario.
- `GET /load`: Carga el proyecto más reciente del usuario.
- `GET /:id`: Carga un proyecto en específico.
- `POST /audit`: Registra eventos de auditoría (ej. importaciones de OSM).

### Configuración pública (`/api/config`)
- `GET /`: Expone variables de entorno no sensibles necesarias para el frontend (servicios de mapas de OpenStreetMap).

## 📄 Documentación Extendida

Para más detalles sobre la arquitectura interna, esquemas relacionales, manejo de transacciones y flujos de información detallados, consulta el archivo de diseño técnico: **[Flujos_Backend.md](./Flujos_Backend.md)**.
