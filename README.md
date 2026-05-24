# Urban Planning 3D - API Backend

Backend para la plataforma Urban Planning 3D. Desarrollado con Node.js, Express y PostgreSQL.

## 🚀 Tecnologías

- **Node.js** & **Express**: Servidor y enrutamiento HTTP.
- **PostgreSQL**: Base de datos relacional (optimizado con soporte para JSONB).
- **Seguridad**: Autenticación segura con JWT, listas negras de tokens y encriptación con Bcrypt.
- **Protección Avanzada**: Sistema de Rate Limiting y anti-DDoS de múltiples capas.
- **Arquitectura**: Patrón estricto de Capas (Clean Architecture) con manejo de Errores de Dominio.

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

El proyecto sigue una arquitectura estricta en capas (Clean Architecture) para asegurar mantenibilidad y alta cohesión:

- **`server/index.js`**: Punto de entrada, configuración de Express y middlewares globales.
- **`server/routes/`**: Declaración de rutas de la API (`/api/auth`, `/api/projects`).
- **`server/middleware/`**: Interceptores web. Manejo de autenticación, listas negras de JWT, Rate Limiting y traductor global de errores.
- **`server/controllers/`**: Manejan la lógica HTTP (req/res) delegando las operaciones a los servicios.
- **`server/services/`**: Lógica de negocio pura y agnóstica de HTTP. Lanzan `DomainErrors` personalizados.
- **`server/utils/`**: Diccionario centralizado de mensajes (`constants.js`), manejador de respuestas estandarizado (`responseHandler.js`) y clases de error abstractas (`errors.js`).
- **`server/db.js`**: Configuración del pool de conexiones a PostgreSQL.

## 🌊 Flujo de la Información (Lifecycle)

Para entender cómo viajan los datos en esta API, imagina el siguiente recorrido cuando un cliente hace una petición (por ejemplo, guardar un proyecto):

1. **El Cliente envía la petición** (HTTP POST /api/projects/save).
2. **Capa de Seguridad (Middlewares Web)**:
   - *Rate Limiter / Anti-DDoS*: Verifica que la IP no esté realizando un ataque masivo.
   - *Autenticación*: Valida el token JWT y revisa que no esté revocado en la lista negra.
3. **Capa de Enrutamiento (Controllers)**:
   - Recibe la petición limpia. Extrae el `req.body` y el `req.user.id`.
   - Se comunica con la Capa de Servicios.
4. **Capa de Negocio (Services)**:
   - Recibe los datos puros. No sabe nada sobre HTTP o Express.
   - Ejecuta transacciones SQL en PostgreSQL. Si algo sale mal (ej. Proyecto no encontrado), lanza un `DomainError` personalizado.
5. **Traductor Global (Error Middleware)** *(En caso de fallo)*:
   - Intercepta el `DomainError` y lo traduce al idioma de la web (ej. HTTP 404).
6. **Contrato de Salida (Response Handler)**:
   - Sin importar si la petición fue un éxito o un fracaso, empaqueta la respuesta final asegurando que el cliente siempre reciba la misma estructura predecible: `{ success, data, error }`.

## 🔗 Endpoints Principales

### Autenticación (`/api/auth`)
- `POST /register`: Crea una cuenta nueva.
- `POST /login`: Inicia sesión y obtiene un JWT.
- `GET /validate`: Verifica la validez del token actual.
- `POST /logout`: Invalida la sesión actual añadiendo el JWT a una lista negra.

### Proyectos (`/api/projects` - Requieren Autenticación)
- `POST /save`: Guarda o actualiza el estado completo de un proyecto urbano en la BD (features 3D, cámara, métricas) mediante una transacción SQL.
- `GET /all`: Lista los metadatos de todos los proyectos del usuario.
- `GET /load`: Carga el proyecto más reciente del usuario.
- `GET /:id`: Carga un proyecto en específico.
- `POST /audit`: Registra eventos de auditoría (ej. importaciones de OSM).

### Configuración pública (`/api/config`)
- `GET /`: Expone variables de entorno no sensibles necesarias para el frontend (servicios de mapas de OpenStreetMap).

## 📄 Documentación Extendida

- **Flujos y Arquitectura**: Para más detalles sobre esquemas relacionales, manejo de transacciones, Rate Limiting y formatos estandarizados, consulta: **[Flujos_Backend.md](./Flujos_Backend.md)**.
- **Siguientes Pasos (Enterprise Level)**: Si deseas ver qué áreas técnicas están planificadas para evolución a futuro (testing, validadores, logs estructurales), revisa el **[Roadmap del Proyecto](./ROADMAP.md)**.
