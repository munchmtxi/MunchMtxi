require('dotenv').config(); // Load environment variables from .env file

module.exports = {
  development: {
    username: process.env.DB_USER,       // Use DB_USER from .env
    password: process.env.DB_PASSWORD,   // Use DB_PASSWORD from .env
    database: process.env.DB_NAME,       // Use DB_NAME from .env
    host: process.env.DB_HOST,           // Use DB_HOST from .env
    port: process.env.DB_PORT,           // Use DB_PORT from .env
    dialect: 'postgres',                 // Set dialect to 'postgres'
    logging: process.env.LOG_LEVEL === 'debug' ? console.log : false, // Enable logging if LOG_LEVEL is debug
  },
  test: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME_TEST || 'munchmtxi_test', // Use a separate DB for testing
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: process.env.LOG_LEVEL === 'debug' ? console.log : false,
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME_PROD || 'munchmtxi_prod', // Use a separate DB for production
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false, // Disable logging in production
  },
};