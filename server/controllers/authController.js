const authService = require('../services/authService');
const { HttpError } = require('../middleware/errorMiddleware');

const register = async (req, res, next) => {
  try {
    const { username, full_name, email, password } = req.body;
    if (!username || !full_name || !email || !password) {
      throw new HttpError(400, 'Faltan campos obligatorios');
    }
    const result = await authService.registerUser(req.body);
    res.status(201).json({ success: true, ...result });
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
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

const me = async (req, res, next) => {
  try {
    const token = req.headers['authorization'];
    if (!token) throw new HttpError(401, 'Token no proporcionado');
    const user = await authService.verifyToken(token);
    res.status(200).json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, me };
