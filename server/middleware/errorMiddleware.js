const { sendResponse } = require('../utils/responseHandler');
const { MESSAGES } = require('../utils/constants');

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
  
  return sendResponse(res, 500, null, { message: err.message.MESSAGES.COMMON.SERVER_ERROR });
};

module.exports = {
  HttpError,
  errorHandler
};
