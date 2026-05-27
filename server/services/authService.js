const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { ConflictError, AuthenticationError, ValidationError } = require('../utils/errors');
const { MESSAGES } = require('../utils/constants');

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, username: user.username, full_name: user.full_name },
    process.env.JWT_SECRET,
    { expiresIn: parseInt(process.env.JWT_EXPIRES_IN)}
  );
};

const registerUser = async (userData) => {
  const { username, full_name, email, password } = userData;

  // Verificar unicidad
  const existingUser = await db.query(
    'SELECT id FROM users WHERE username = $1 OR email = $2',
    [username, email]
  );
  if (existingUser.rows.length > 0) {
    throw new ConflictError(MESSAGES.AUTH.USER_EXISTS);
  }

  // Hashear contraseña
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  // Insertar usuario
  const result = await db.query(
    'INSERT INTO users (username, full_name, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, username, full_name, email',
    [username, full_name, email, passwordHash]
  );
  const newUser = result.rows[0];

  // Generar token
  const token = generateToken(newUser);

  return { token, user: newUser };
};

const loginUser = async (username, password) => {
  // Buscar usuario
  const result = await db.query('SELECT id, username, full_name, email, password_hash FROM users WHERE username = $1', [username]);
  const user = result.rows[0];

  if (!user) {
    throw new AuthenticationError(MESSAGES.AUTH.BAD_CREDENTIALS);
  }

  // Comparar contraseña
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw new AuthenticationError(MESSAGES.AUTH.BAD_CREDENTIALS);
  }

  // Generar token
  const token = generateToken(user);
  
  // Limpiar el objeto de usuario para no retornar el hash
  delete user.password_hash;

  return { token, user };
};

const verifyToken = async (token) => {
  const isRevoked = await isTokenInvalidated(token);
  if (isRevoked) {
    throw new AuthenticationError(MESSAGES.AUTH.REVOKED_TOKEN);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new AuthenticationError(MESSAGES.AUTH.EXPIRED_TOKEN);
    }
    throw new AuthenticationError(MESSAGES.AUTH.INVALID_TOKEN);
  }
};

const invalidateToken = async (token) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      'INSERT INTO invalidated_tokens (token) VALUES ($1) ON CONFLICT (token) DO NOTHING',
      [token]
    );
    await client.query('COMMIT');
    return result.rowCount > 0;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const isTokenInvalidated = async (token) => {
  const result = await db.query('SELECT id FROM invalidated_tokens WHERE token = $1', [token]);
  return result.rows.length > 0;
};

// Umbral de renovación: 10 minutos en segundos
const REFRESH_THRESHOLD_SECONDS = 10 * 60;

const refreshToken = async (token) => {
  // 1. Verificar que el token sea válido (firma, expiración y lista negra)
  const decoded = await verifyToken(token);

  // 2. Calcular tiempo restante
  const now = Math.floor(Date.now() / 1000);
  const remainingSeconds = decoded.exp - now;

  if (remainingSeconds > REFRESH_THRESHOLD_SECONDS) {
    throw new ValidationError(MESSAGES.AUTH.REFRESH_NOT_NEEDED);
  }

  // 4. Generar nuevo token con los datos del usuario
  const newToken = generateToken({
    id: decoded.id,
    username: decoded.username,
    full_name: decoded.full_name
  });

  // 5. Invalidar el token viejo en una transacción
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    await client.query(
      'INSERT INTO invalidated_tokens (token) VALUES ($1) ON CONFLICT (token) DO NOTHING',
      [token]
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return {
    token: newToken,
    user: { id: decoded.id, username: decoded.username, full_name: decoded.full_name }
  };
};

module.exports = { registerUser, loginUser, verifyToken, invalidateToken, isTokenInvalidated, refreshToken };
