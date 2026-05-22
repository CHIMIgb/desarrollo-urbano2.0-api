-- ============================================================
-- Tabla: blocked_ips
-- Descripción: Almacena las IPs bloqueadas por el sistema de
--              protección contra DDoS / rate limiting.
-- ============================================================

CREATE TABLE IF NOT EXISTS blocked_ips (
    id              SERIAL PRIMARY KEY,
    ip_address      VARCHAR(45) NOT NULL,           -- Soporta IPv4 e IPv6
    reason          VARCHAR(255) NOT NULL DEFAULT 'Exceso de solicitudes',
    request_count   INTEGER NOT NULL DEFAULT 0,     -- Cantidad de requests que provocaron el bloqueo
    blocked_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE    -- Para desactivar sin borrar el registro
);

-- Índice para búsquedas rápidas por IP activa
CREATE INDEX IF NOT EXISTS idx_blocked_ips_active
    ON blocked_ips (ip_address, is_active, expires_at);

-- Índice para limpieza automática de registros expirados
CREATE INDEX IF NOT EXISTS idx_blocked_ips_expires
    ON blocked_ips (expires_at)
    WHERE is_active = TRUE;
