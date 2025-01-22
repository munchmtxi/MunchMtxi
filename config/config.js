require('dotenv').config();

const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  
  database: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN
  },

  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info'
  },

  googleMaps: {
    apiKey: process.env.GOOGLE_MAPS_API_KEY
  },

  whatsapp: {
    apiKey: process.env.WHATSAPP_API_KEY
  }
};

// Validate critical config
const validateConfig = () => {
  const requiredEnvVars = [
    'DB_HOST',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD',
    'JWT_SECRET',
    'GOOGLE_MAPS_API_KEY',
    'WHATSAPP_API_KEY'
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }
};

validateConfig();

module.exports = config;