/**
 * Clase base para todos los errores de dominio.
 * No contiene información sobre protocolos HTTP.
 */
class DomainError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Errores de validación de datos (ej. formato incorrecto)
 */
class ValidationError extends DomainError {}

/**
 * Errores de autenticación (ej. credenciales incorrectas, token expirado)
 */
class AuthenticationError extends DomainError {}

/**
 * Errores de autorización (ej. no tienes permiso para esta acción)
 */
class AuthorizationError extends DomainError {}

/**
 * Errores de recursos no encontrados
 */
class NotFoundError extends DomainError {}

/**
 * Errores de conflicto de estado (ej. el usuario ya existe)
 */
class ConflictError extends DomainError {}

module.exports = {
  DomainError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError
};
