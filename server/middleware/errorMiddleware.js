class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

const errorHandler = (err, req, res, next) => {
  console.error(err);
  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({ success: false, error: err.message });
  }
  res.status(500).json({ success: false, error: err.message || 'Error interno' });
};

module.exports = {
  HttpError,
  errorHandler
};
