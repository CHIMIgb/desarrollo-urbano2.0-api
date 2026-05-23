const MESSAGES = {
  AUTH: {
    MISSING_TOKEN: 'Token no proporcionado',
    EMPTY_TOKEN: 'Token vacio',
    INVALID_TOKEN: 'Token invalido',
    EXPIRED_TOKEN: 'El token ha expirado',
    REVOKED_TOKEN: 'Sesión terminada (token revocado)',
    LOGOUT_REVOKED: 'El token ya estaba invalidado o ha expirado',
    BAD_CREDENTIALS: 'Credenciales incorrectas',
    LOGOUT_SUCCESS: 'Sesión cerrada correctamente',
    USER_EXISTS: 'El nombre de usuario o email ya esta en uso'
  },
  PROJECTS: {
    NOT_FOUND: 'Proyecto no encontrado',
    NO_ACCESS: 'Proyecto no encontrado para este usuario',
    SAVE_SUCCESS: 'Proyecto guardado con exito',
    AUDIT_SUCCESS: 'Evento de auditoria registrado',
    MISSING_ACTION_TYPE: 'action_type es obligatorio',
    INVALID_FEATURES: 'features debe ser un array',
    INVALID_ID: 'ID invalido'
  },
  COMMON: {
    MISSING_FIELDS: 'Faltan campos obligatorios',
    SERVER_ERROR: 'Error interno',
    NOT_FOUND: 'Endpoint no encontrado'
  }
};

module.exports = { MESSAGES };
