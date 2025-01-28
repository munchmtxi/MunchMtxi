require('dotenv').config();

const environment = process.env.NODE_ENV || 'development';

// Base configuration shared across all environments
const baseConfig = {
  nodeEnv: environment,
  port: process.env.PORT || 3000,
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN,
    algorithm: process.env.JWT_ALGORITHM,
    defaultExpiration: process.env.JWT_DEFAULT_EXPIRATION,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN
  },
  sessionSecret: process.env.SESSION_SECRET,
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
  googleOAuth: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI
  },
  whatsapp: {
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
    twilioWhatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER
  },
  emailService: {
    host: process.env.EMAIL_SERVICE_HOST,
    port: process.env.EMAIL_SERVICE_PORT,
    username: process.env.EMAIL_SERVICE_USERNAME,
    password: process.env.EMAIL_SERVICE_PASSWORD,
    encryption: process.env.EMAIL_SERVICE_ENCRYPTION
  },
  frontendUrl: process.env.FRONTEND_URL
};

// Environment-specific database configurations
const databaseConfigs = {
  development: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: console.log,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },
  test: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME_TEST,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
};

// Merged configuration
const config = {
  ...baseConfig,
  database: databaseConfigs[environment]
};

// Validation (skip if running Sequelize CLI commands)
if (!process.env.SKIP_CONFIG_VALIDATION) {
  const validateConfig = () => {
    const requiredEnvVars = [
      'DB_HOST',
      'DB_USER',
      'DB_PASSWORD',
      'JWT_SECRET',
      'SESSION_SECRET',
      'GOOGLE_MAPS_API_KEY',
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET',
      'TWILIO_ACCOUNT_SID',
      'TWILIO_AUTH_TOKEN',
      'TWILIO_WHATSAPP_NUMBER',
      'EMAIL_SERVICE_HOST',
      'EMAIL_SERVICE_USERNAME',
      'EMAIL_SERVICE_PASSWORD',
      'JWT_ALGORITHM',
      'JWT_DEFAULT_EXPIRATION'
    ];

    if (environment === 'test') {
      requiredEnvVars.push('DB_NAME_TEST');
    } else {
      requiredEnvVars.push('DB_NAME');
    }

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
    }
  };

  validateConfig();
}

// Export for application usage
module.exports = config;

// Export for Sequelize CLI compatibility
module.exports.development = databaseConfigs.development;
module.exports.test = databaseConfigs.test;
module.exports.production = databaseConfigs.production;