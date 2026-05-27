require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const configRoutes = require('./routes/config');
const { errorHandler } = require('./middleware/errorMiddleware');
const { ipBlockerMiddleware, ddosLimiter, globalLimiter, initRateLimiter } = require('./middleware/rateLimitMiddleware');
const { sendResponse } = require('./utils/responseHandler');
const { MESSAGES } = require('./utils/constants');
const i18next = require('./config/i18n');
const middleware = require('i18next-http-middleware');

const app = express();
const port = process.env.PORT;
let apiPrefix = (process.env.API_PREFIX).trim();
if (!apiPrefix.startsWith('/')) {
  apiPrefix = '/' + apiPrefix;
}

app.use(cors());
app.use(express.json({ limit: process.env.MAX_PAYLOAD_SIZE }));
app.use(express.urlencoded({ extended: true, limit: process.env.MAX_PAYLOAD_SIZE }));
app.use(middleware.handle(i18next));

// Rate Limit y Protección DDoS (orden importante)
// 1. Verificar si la IP está bloqueada (más rápido, rechaza de inmediato)
app.use(ipBlockerMiddleware);
// 2. Detector DDoS: si supera X requests/minuto, bloquea la IP
app.use(ddosLimiter);
// 3. Rate limit global: máximo de requests por hora
app.use(globalLimiter);

app.get(`${apiPrefix}/`, (req, res) => {
  sendResponse(res, 200, { message: req.t(MESSAGES.COMMON.HELLO) });
});

app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/projects`, projectRoutes);
app.use(`${apiPrefix}/config`, configRoutes);

// Manejo de rutas no encontradas (404)
app.use(apiPrefix, (req, res) => {
  sendResponse(res, 404, null, { message: req.t(MESSAGES.COMMON.NOT_FOUND) });
});

// Manejador de errores global
app.use(errorHandler);

// Inicializar rate limiter (carga IPs bloqueadas de la BD) y arrancar servidor
initRateLimiter().then(() => {
  app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
  });
});
