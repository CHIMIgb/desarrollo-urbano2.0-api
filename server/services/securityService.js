const db = require('../db');

/**
 * Obtiene todas las IPs bloqueadas que aún están activas.
 * @returns {Promise<Array>} Array de objetos con { ip_address, expires_at }
 */
const getActiveBlockedIps = async () => {
  const result = await db.query(
    `SELECT ip_address, expires_at FROM blocked_ips
     WHERE is_active = TRUE AND expires_at > NOW()`
  );
  return result.rows;
};

/**
 * Inserta una nueva IP en la tabla de bloqueos.
 * @param {string} ip - Dirección IP a bloquear.
 * @param {string} reason - Razón del bloqueo.
 * @param {number} requestCount - Número de peticiones que causaron el bloqueo.
 * @param {Date} expiresAt - Fecha y hora en la que expira el bloqueo.
 */
const insertBlockedIp = async (ip, reason, requestCount, expiresAt) => {
  await db.query(
    `INSERT INTO blocked_ips (ip_address, reason, request_count, blocked_at, expires_at, is_active)
     VALUES ($1, $2, $3, NOW(), $4, TRUE)`,
    [ip, reason, requestCount, expiresAt]
  );
};

module.exports = {
  getActiveBlockedIps,
  insertBlockedIp
};
