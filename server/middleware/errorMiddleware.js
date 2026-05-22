const { sendResponse } = require('../utils/responseHandler');

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

const errorHandler = (err, req, res, next) => {
  console.error(err);
  
  if (err instanceof HttpError) {
    return sendResponse(res, err.statusCode, null, { message: err.message });
  }
  
  return sendResponse(res, 500, null, { message: err.message || 'Error interno' });
};

module.exports = {
  HttpError,
  errorHandler
};
