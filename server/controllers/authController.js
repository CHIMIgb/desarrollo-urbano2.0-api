const authService = require('../services/authService');
const { HttpError } = require('../middleware/errorMiddleware');
const { sendResponse } = require('../utils/responseHandler');
const { MESSAGES } = require('../utils/constants');

const register = async (req, res, next) => {
  try {
    const { username, full_name, email, password } = req.body;
    if (!username || !full_name || !email || !password) {
      throw new HttpError(400, MESSAGES.COMMON.MISSING_FIELDS);
    }
    const result = await authService.registerUser(req.body);
    sendResponse(res, 201, result);
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      throw new HttpError(400, MESSAGES.COMMON.MISSING_FIELDS);
    }
    const result = await authService.loginUser(username, password);
    sendResponse(res, 200, result);
  } catch (err) {
    next(err);
  }
};

const validate = async (req, res, next) => {
  try {
    let token = req.headers['authorization'];
    if (!token) throw new HttpError(401, MESSAGES.AUTH.MISSING_TOKEN);
    
    // Si viene con el prefijo Bearer, lo extraemos
    if (token.startsWith('Bearer ')) {
      token = token.split(' ')[1];
    }

    const user = await authService.verifyToken(token);
    
    // Calcular el tiempo restante en segundos
    const now = Math.floor(Date.now() / 1000);
    const expiresInSeconds = user.exp - now;

    sendResponse(res, 200, { 
      payload: user,
      expiresInSeconds: expiresInSeconds > 0 ? expiresInSeconds : 0
    });
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    let token = req.headers['authorization'];
    if (!token) {
      throw new HttpError(400, MESSAGES.AUTH.MISSING_TOKEN);
    }

    if (token.startsWith('Bearer ')) {
      token = token.split(' ')[1];
    }
    
    if (!token) {
      throw new HttpError(400, MESSAGES.AUTH.EMPTY_TOKEN);
    }

    const wasInserted = await authService.invalidateToken(token);
    
    if (!wasInserted) {
      throw new HttpError(400, MESSAGES.AUTH.LOGOUT_REVOKED);
    }

    sendResponse(res, 200, { message: req.t ? req.t(MESSAGES.AUTH.LOGOUT_SUCCESS) : MESSAGES.AUTH.LOGOUT_SUCCESS });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, validate, logout };
