const authService = require('../services/authService');
const { HttpError } = require('../middleware/errorMiddleware');
const { sendResponse } = require('../utils/responseHandler');

const register = async (req, res, next) => {
  try {
    const { username, full_name, email, password } = req.body;
    if (!username || !full_name || !email || !password) {
      throw new HttpError(400, 'Faltan campos obligatorios');
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
      throw new HttpError(400, 'Faltan campos obligatorios');
    }
    const result = await authService.loginUser(username, password);
    sendResponse(res, 200, result);
  } catch (err) {
    next(err);
  }
};

const me = async (req, res, next) => {
  try {
    const token = req.headers['authorization'];
    if (!token) throw new HttpError(401, 'Token no proporcionado');
    const user = await authService.verifyToken(token);
    sendResponse(res, 200, { user });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, me };
