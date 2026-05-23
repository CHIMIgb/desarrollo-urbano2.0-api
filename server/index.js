require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const { errorHandler } = require('./middleware/errorMiddleware');
const { ipBlockerMiddleware, ddosLimiter, globalLimiter, initRateLimiter } = require('./middleware/rateLimitMiddleware');
const { sendResponse } = require('./utils/responseHandler');
const { MESSAGES } = require('./utils/constants');

const app = express();
const port = process.env.PORT;
let apiPrefix = (process.env.API_PREFIX).trim();
if (!apiPrefix.startsWith('/')) {
  apiPrefix = '/' + apiPrefix;
}

app.use(cors());
app.use(express.json({ limit: process.env.MAX_PAYLOAD_SIZE }));
app.use(express.urlencoded({ extended: true, limit: process.env.MAX_PAYLOAD_SIZE }));

// Rate Limit y Protección DDoS (orden importante)
// 1. Verificar si la IP está bloqueada (más rápido, rechaza de inmediato)
app.use(ipBlockerMiddleware);
// 2. Detector DDoS: si supera X requests/minuto, bloquea la IP
app.use(ddosLimiter);
// 3. Rate limit global: máximo de requests por hora
app.use(globalLimiter);

app.get(`${apiPrefix}/`, (req, res) => {
  sendResponse(res, 200, { message: 'Hola Mundo - Backend API' });
});

app.get(`${apiPrefix}/config`, (req, res) => {
  sendResponse(res, 200, {
    OSM_TILE_URL: process.env.OSM_TILE_URL,
    OSM_NOMINATIM_URL: process.env.OSM_NOMINATIM_URL,
    OSM_OVERPASS_ENDPOINTS: process.env.OSM_OVERPASS_ENDPOINTS ? process.env.OSM_OVERPASS_ENDPOINTS.split(',') : []
  });
});

app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/projects`, projectRoutes);

// Catch-all 404
app.use(apiPrefix, (req, res) => {
  sendResponse(res, 404, null, { message: MESSAGES.COMMON.NOT_FOUND });
});

// Error handler global
app.use(errorHandler);

// Inicializar rate limiter (carga IPs bloqueadas de la BD) y arrancar servidor
initRateLimiter().then(() => {
  app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
  });
});
