-- ============================================================
-- Script de Creación de Base de Datos para UrbanPlan 3D
-- Motor: PostgreSQL 16
-- ============================================================

-- ============================================================
-- 1. Usuarios
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. Proyectos (Contiene estado de cámara y metadatos)
-- ============================================================
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    next_id INT DEFAULT 1,
    -- Vista del mapa (cámara) al momento de guardar
    map_center_lng DOUBLE PRECISION DEFAULT -99.1332,
    map_center_lat DOUBLE PRECISION DEFAULT 19.4326,
    map_zoom DOUBLE PRECISION DEFAULT 13,
    map_pitch DOUBLE PRECISION DEFAULT 65,
    map_bearing DOUBLE PRECISION DEFAULT -20,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 3. Elementos del Proyecto (Features 3D)
-- Almacenados en JSONB para alta flexibilidad y velocidad
-- ============================================================
CREATE TABLE IF NOT EXISTS project_features (
    id SERIAL PRIMARY KEY,
    project_id INT REFERENCES projects(id) ON DELETE CASCADE,
    feature_data JSONB NOT NULL
);

-- ============================================================
-- 4. Registro de Auditoría
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    project_id INT REFERENCES projects(id) ON DELETE SET NULL,
    action_type VARCHAR(50) NOT NULL, -- 'IMPORT', 'EXPORT'
    details JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 5. Seguridad: Tokens invalidados (Logout / Blacklist)
-- ============================================================
CREATE TABLE IF NOT EXISTS invalidated_tokens (
  id SERIAL PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  invalidated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 6. Seguridad: IPs Bloqueadas (Rate Limiter y DDoS)
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

-- Índices para mejorar velocidad de consultas de seguridad
CREATE INDEX IF NOT EXISTS idx_blocked_ips_active
    ON blocked_ips (ip_address, is_active, expires_at);

CREATE INDEX IF NOT EXISTS idx_blocked_ips_expires
    ON blocked_ips (expires_at)
    WHERE is_active = TRUE;
