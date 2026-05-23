const jwt = require('jsonwebtoken');
const { HttpError } = require('./errorMiddleware');
const { MESSAGES } = require('../utils/constants');
const authService = require('../services/authService');

const authenticateToken = async (req, res, next) => {
  try {
    let token = req.headers['authorization'];
    if (!token) return next(new HttpError(401, MESSAGES.AUTH.MISSING_TOKEN));

    if (token.startsWith('Bearer ')) {
      token = token.split(' ')[1];
    }

    // Verificar si el token está en la lista negra
    const isInvalid = await authService.isTokenInvalidated(token);
    if (isInvalid) {
      return next(new HttpError(403, MESSAGES.AUTH.REVOKED_TOKEN));
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) return next(new HttpError(403, MESSAGES.AUTH.INVALID_TOKEN));
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
