// src/config/jwtConfig.js
require('dotenv').config();

module.exports = {
  jwtFromRequest: require('passport-jwt').ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  algorithm: process.env.JWT_ALGORITHM || 'HS256',
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
};/**
* JWT Configuration Module
* 
* This module provides configuration settings for JSON Web Tokens (JWT) used in the application.
* It includes options for extracting tokens, secret keys, expiration times, and algorithms.
* Environment variables are utilized to ensure security and flexibility.
* 
* @module jwtConfig
*/

require('dotenv').config();

module.exports = {
 /**
  * Function to extract the JWT from the request's Authorization header as a Bearer token.
  * @type {Function}
  * @description Uses `passport-jwt`'s `ExtractJwt.fromAuthHeaderAsBearerToken()` method to extract the token.
  */
 jwtFromRequest: require('passport-jwt').ExtractJwt.fromAuthHeaderAsBearerToken(),

 /**
  * Secret key used to sign and verify the JWT.
  * @type {string}
  * @description Loaded from the environment variable `JWT_SECRET`. 
  * Ensure this is kept secure and not exposed publicly.
  */
 secretOrKey: process.env.JWT_SECRET,

 /**
  * Expiration time for the JWT.
  * @type {string}
  * @description Specifies how long the token is valid. 
  * Defaults to '7d' (7 days) if `JWT_EXPIRES_IN` is not set in the environment variables.
  */
 expiresIn: process.env.JWT_EXPIRES_IN || '7d',

 /**
  * Algorithm used to sign the JWT.
  * @type {string}
  * @description Specifies the cryptographic algorithm for signing the token. 
  * Defaults to 'HS256' (HMAC with SHA-256) if `JWT_ALGORITHM` is not set in the environment variables.
  */
 algorithm: process.env.JWT_ALGORITHM || 'HS256',

 /**
  * Secret key used to sign and verify the refresh token.
  * @type {string}
  * @description Loaded from the environment variable `JWT_REFRESH_SECRET`.
  * Ensure this is kept secure and not exposed publicly.
  */
 refreshSecret: process.env.JWT_REFRESH_SECRET,

 /**
  * Expiration time for the refresh token.
  * @type {string}
  * @description Specifies how long the refresh token is valid.
  * Defaults to '7d' (7 days) if `JWT_REFRESH_EXPIRES_IN` is not set in the environment variables.
  */
 refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
};