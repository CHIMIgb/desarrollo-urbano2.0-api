const jwt = require('jsonwebtoken');
const { HttpError } = require('./errorMiddleware');

const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return next(new HttpError(401, 'Token no proporcionado'));

  jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, user) => {
    if (err) return next(new HttpError(403, 'Token invalido'));
    req.user = user;
    next();
  });
};

module.exports = {
  authenticateToken
};
