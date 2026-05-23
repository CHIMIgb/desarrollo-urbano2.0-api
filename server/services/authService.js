const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { ConflictError, AuthenticationError } = require('../utils/errors');
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

  // Verify uniqueness
  const existingUser = await db.query(
    'SELECT id FROM users WHERE username = $1 OR email = $2',
    [username, email]
  );
  if (existingUser.rows.length > 0) {
    throw new ConflictError(MESSAGES.AUTH.USER_EXISTS);
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  // Insert user
  const result = await db.query(
    'INSERT INTO users (username, full_name, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, username, full_name, email',
    [username, full_name, email, passwordHash]
  );
  const newUser = result.rows[0];

  // Generate token
  const token = generateToken(newUser);

  return { token, user: newUser };
};

const loginUser = async (username, password) => {
  // Find user
  const result = await db.query('SELECT id, username, full_name, email, password_hash FROM users WHERE username = $1', [username]);
  const user = result.rows[0];

  if (!user) {
    throw new AuthenticationError(MESSAGES.AUTH.BAD_CREDENTIALS);
  }

  // Compare password
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw new AuthenticationError(MESSAGES.AUTH.BAD_CREDENTIALS);
  }

  // Generate token
  const token = generateToken(user);
  
  // Clean up user object to not return hash
  delete user.password_hash;

  return { token, user };
};

const verifyToken = async (token) => {
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

module.exports = { registerUser, loginUser, verifyToken, invalidateToken, isTokenInvalidated };
