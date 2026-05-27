const httpDictionary = {
  200: 'OK',
  201: 'Created',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  429: 'Too Many Requests',
  500: 'Internal Server Error'
};

const sendResponse = (res, statusCode, data = null, errorDetails = null) => {
  const success = statusCode >= 200 && statusCode < 300;
  
  const response = {
    success
  };

  if (success) {
    response.data = data;
    response.error = null;
  } else {
    response.data = null;
    response.error = {
      code: httpDictionary[statusCode] || 'Unknown Error',
      message: errorDetails?.message || 'common.unknown_error',
      details: errorDetails?.details || null
    };
  }

  return res.status(statusCode).json(response);
};

module.exports = {
  httpDictionary,
  sendResponse
};
