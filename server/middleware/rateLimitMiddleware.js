const rateLimit = require('express-rate-limit');
const securityService = require('../services/securityService');
const { sendResponse } = require('../utils/responseHandler');

// ============================================================
// Cache local para evitar consultas a la BD en cada request.
// Se sincroniza con la BD periódicamente.
// ============================================================
const blockedIpsCache = new Map(); // key: ip, value: { expiresAt: Date }

/**
 * Carga las IPs bloqueadas activas desde la base de datos al cache local.
 */
const syncBlockedIps = async () => {
  try {
    const activeIps = await securityService.getActiveBlockedIps();
    // Limpiar el cache y reconstruirlo desde la BD
    blockedIpsCache.clear();
    for (const row of activeIps) {
      blockedIpsCache.set(row.ip_address, { expiresAt: new Date(row.expires_at) });
    }
  } catch (err) {
    console.error('[RateLimit] Error al sincronizar IPs bloqueadas:', err.message);
  }
};

/**
 * Bloquea una IP: la guarda en la BD y en el cache local.
 */
const blockIp = async (ip, reason, requestCount) => {
  const blockMinutes = parseInt(process.env.DDOS_BLOCK_DURATION_MINUTES) || 60;
  const expiresAt = new Date(Date.now() + blockMinutes * 60 * 1000);

  try {
    await securityService.insertBlockedIp(ip, reason, requestCount, expiresAt);
    blockedIpsCache.set(ip, { expiresAt });
    console.warn(`[RateLimit] IP bloqueada: ${ip} | Razón: ${reason} | Expira: ${expiresAt.toISOString()}`);
  } catch (err) {
    console.error('[RateLimit] Error al bloquear IP en la BD:', err.message);
    // Aún así bloquear en cache local como respaldo
    blockedIpsCache.set(ip, { expiresAt });
  }
};

// ============================================================
// MIDDLEWARE 1: Verificador de IPs bloqueadas
// Se ejecuta antes que todo. Si la IP está bloqueada, rechaza
// la petición de inmediato sin procesarla.
// ============================================================
const ipBlockerMiddleware = (req, res, next) => {
  const ip = req.ip;
  const blocked = blockedIpsCache.get(ip);

  if (blocked) {
    // Verificar si el bloqueo ya expiró
    if (new Date() >= blocked.expiresAt) {
      blockedIpsCache.delete(ip);
      return next();
    }

    const remainingSeconds = Math.ceil((blocked.expiresAt - Date.now()) / 1000);
    return sendResponse(res, 403, null, {
      message: `Tu IP (${ip}) ha sido bloqueada temporalmente por exceso de solicitudes.`,
      details: `El bloqueo expira en ${remainingSeconds} segundos.`
    });
  }

  next();
};

// ============================================================
// MIDDLEWARE 2: Detector DDoS (límite por minuto)
// Si una IP supera el umbral de requests por minuto, se bloquea
// y se registra en la base de datos.
// ============================================================
const ddosLimiter = rateLimit({
  windowMs: 60 * 1000, // Ventana de 1 minuto
  max: () => parseInt(process.env.DDOS_MAX_REQUESTS_PER_MINUTE) || 100,
  standardHeaders: true,
  legacyHeaders: false,

  handler: async (req, res) => {
    const ip = req.ip;
    const maxPerMinute = parseInt(process.env.DDOS_MAX_REQUESTS_PER_MINUTE) || 100;

    // Bloquear la IP en la BD y en el cache
    await blockIp(ip, `Superó ${maxPerMinute} solicitudes en 1 minuto (posible DDoS)`, maxPerMinute);

    return sendResponse(res, 403, null, {
      message: `Tu IP ha sido bloqueada por comportamiento sospechoso (posible ataque DDoS).`,
      details: `Se detectaron más de ${maxPerMinute} solicitudes en menos de 1 minuto.`
    });
  },
  // No aplicar rate limit a IPs ya bloqueadas (ipBlockerMiddleware se encarga)
  skip: (req) => blockedIpsCache.has(req.ip)
});

// ============================================================
// MIDDLEWARE 3: Rate Limiter global (límite por hora)
// Controla el uso general de la API para usuarios legítimos.
// ============================================================
const globalLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // Ventana de 1 hora
  max: () => parseInt(process.env.RATE_LIMIT_MAX_PER_HOUR) || 1000,
  standardHeaders: true,
  legacyHeaders: false,

  handler: (req, res) => {
    const maxPerHour = parseInt(process.env.RATE_LIMIT_MAX_PER_HOUR) || 1000;
    return sendResponse(res, 429, null, {
      message: 'Has excedido el límite de solicitudes permitidas.',
      details: `Máximo ${maxPerHour} solicitudes por hora. Intenta de nuevo más tarde.`
    });
  }
});

// ============================================================
// Inicialización: cargar IPs bloqueadas de la BD al arrancar
// y sincronizar periódicamente.
// ============================================================
const SYNC_INTERVAL_MS = 5 * 60 * 1000; // Sincronizar cada 5 minutos

const initRateLimiter = async () => {
  await syncBlockedIps();
  setInterval(syncBlockedIps, SYNC_INTERVAL_MS);
  console.log('[RateLimit] Sistema de rate limit y protección DDoS inicializado.');
};

module.exports = {
  ipBlockerMiddleware,
  ddosLimiter,
  globalLimiter,
  initRateLimiter
};
