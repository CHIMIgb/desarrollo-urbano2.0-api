const { sendResponse } = require('../utils/responseHandler');
const { MESSAGES } = require('../utils/constants');
const { 
  DomainError, 
  ValidationError, 
  AuthenticationError, 
  AuthorizationError, 
  NotFoundError, 
  ConflictError 
} = require('../utils/errors');

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

const errorHandler = (err, req, res, next) => {
  console.error(err);
  
  // 1. Errores explícitos de red/routing
  if (err instanceof HttpError) {
    return sendResponse(res, err.statusCode, null, { message: err.message });
  }
  
  // 2. Errores de Dominio (lógica de negocio abstracta traducida a HTTP)
  if (err instanceof DomainError) {
    let statusCode = 500;
    if (err instanceof ValidationError) statusCode = 400;
    else if (err instanceof AuthenticationError) statusCode = 401;
    else if (err instanceof AuthorizationError) statusCode = 403;
    else if (err instanceof NotFoundError) statusCode = 404;
    else if (err instanceof ConflictError) statusCode = 409;

    return sendResponse(res, statusCode, null, { message: err.message });
  }
  
  // 3. Errores inesperados o de sistema
  return sendResponse(res, 500, null, { message: err.message || MESSAGES.COMMON.SERVER_ERROR });
};

module.exports = {
  HttpError,
  errorHandler
};
