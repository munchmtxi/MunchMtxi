// src/services/authService.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const AppError = require('../utils/AppError');
const config = require('../config/config');

/**
 * Registers a new user.
 * @param {Object} userData - User details.
 * @returns {Object} - Created user.
 */
const registerUser = async (userData) => {
  try {
    const { firstName, lastName, email, password, phone, country, merchantType, role } = userData;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      phone,
      country,
      merchantType,
      role, // Ensure role is handled appropriately
    });
    return user;
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new AppError('Email or phone number already in use', 400);
    }
    if (error.name === 'SequelizeValidationError') {
      const messages = error.errors.map(e => e.message).join('. ');
      throw new AppError(`Validation Error: ${messages}`, 400);
    }
    throw new AppError('Failed to register user', 500);
  }
};

/**
 * Logs in a user.
 * @param {String} email - User's email.
 * @param {String} password - User's password.
 * @returns {Object} - User and JWT token.
 */
const loginUser = async (email, password) => {
  try {
    const user = await User.scope(null).findOne({ where: { email } }); // Include password
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new AppError('Invalid email or password', 401);
    }

    const token = jwt.sign({ id: user.id, role: user.role }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });

    const refreshToken = jwt.sign({ id: user.id, role: user.role }, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn,
    });

    // Optionally, store the refresh token in the database or a cache

    return { user, token, refreshToken };
  } catch (error) {
    if (error instanceof AppError) {
      throw error; // Operational errors are already handled
    }
    throw new AppError('Failed to login', 500);
  }
};

/**
 * Generates a new JWT access token.
 * @param {Object} payload - Payload containing user ID and role.
 * @param {String} [expiresIn] - Token expiration time.
 * @returns {String} - JWT token.
 */
const generateToken = (payload, expiresIn = config.jwt.expiresIn) => {
  return jwt.sign(payload, config.jwt.secret, { expiresIn });
};

/**
 * Verifies a JWT token.
 * @param {String} token - JWT token.
 * @returns {Object} - Decoded payload.
 */
const verifyToken = (token) => {
  return jwt.verify(token, config.jwt.secret);
};

/**
 * Generates a new JWT refresh token.
 * @param {Object} payload - Payload containing user ID and role.
 * @returns {String} - JWT refresh token.
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, config.jwt.refreshSecret, { expiresIn: config.jwt.refreshExpiresIn });
};

/**
 * Verifies a JWT refresh token.
 * @param {String} token - JWT refresh token.
 * @returns {Object} - Decoded payload.
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, config.jwt.refreshSecret);
};

module.exports = { registerUser, loginUser, generateToken, verifyToken, generateRefreshToken, verifyRefreshToken };
