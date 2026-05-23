const jwt = require('jsonwebtoken');
const { HttpError } = require('./errorMiddleware');
const authService = require('../services/authService');

const authenticateToken = async (req, res, next) => {
  try {
    let token = req.headers['authorization'];
    if (!token) return next(new HttpError(401, 'Token no proporcionado'));

    if (token.startsWith('Bearer ')) {
      token = token.split(' ')[1];
    }

    // Check if the token is in the blacklist
    const isInvalid = await authService.isTokenInvalidated(token);
    if (isInvalid) {
      return next(new HttpError(403, 'Sesión terminada (token revocado)'));
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) return next(new HttpError(403, 'Token invalido'));
      req.user = user;
      next();
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  authenticateToken
};
