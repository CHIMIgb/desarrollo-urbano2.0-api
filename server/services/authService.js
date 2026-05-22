const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { HttpError } = require('../middleware/errorMiddleware');

const registerUser = async (userData) => {
  return { id: 1, ...userData }; // Skeleton implementation
};

const loginUser = async (username, password) => {
  return { token: 'dummy_token', user: { id: 1, username } }; // Skeleton implementation
};

const verifyToken = async (token) => {
  return { id: 1, username: 'dummy' }; // Skeleton implementation
};

module.exports = { registerUser, loginUser, verifyToken };
