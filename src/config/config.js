require('dotenv').config();

// Define environment first
const environment = process.env.NODE_ENV || 'development';

// Base configuration shared across all environments
const baseConfig = {
  nodeEnv: environment,
  port: process.env.PORT || 3000,
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    algorithm: process.env.JWT_ALGORITHM || 'HS256',
    defaultExpiration: process.env.JWT_DEFAULT_EXPIRATION || '1h',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
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
  sms: {
    provider: process.env.SMS_PROVIDER,
    apiKey: process.env.SMS_API_KEY,
    senderId: process.env.SMS_SENDER_ID
  },
  emailService: {
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    username: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASS,
    encryption: process.env.EMAIL_ENCRYPTION
  },
  frontendUrl: process.env.FRONTEND_URL,
  statusMonitor: {
    username: process.env.STATUS_MONITOR_USERNAME,
    password: process.env.STATUS_MONITOR_PASSWORD
  },
  // Added security configuration for the benefit of the Black Lotus Clan
  security: {
    rateLimiting: {
      whitelistedIPs: process.env.WHITELISTED_IPS?.split(',') || [],
      defaultLimit: 100,
      authLimit: 5,
      geoLimit: 100
    },
    csp: {
      reportOnly: process.env.NODE_ENV === 'development',
      reportUri: process.env.CSP_REPORT_URI
    },
    cors: {
      whitelist: process.env.CORS_WHITELIST?.split(',') || []
    }
  }
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
      'EMAIL_HOST',
      'EMAIL_PORT',
      'EMAIL_USER',
      'EMAIL_PASS',
      'EMAIL_ENCRYPTION',
      'JWT_ALGORITHM',
      'JWT_DEFAULT_EXPIRATION',
      'STATUS_MONITOR_USERNAME',
      'STATUS_MONITOR_PASSWORD',
      'SMS_PROVIDER',
      'SMS_API_KEY',
      'SMS_SENDER_ID'
    ];

    if (environment === 'test') {
      requiredEnvVars.push('DB_NAME_TEST');
    } else {
      requiredEnvVars.push('DB_NAME');
    }

    const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);
    if (missingVars.length > 0) {
      console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
      throw new Error('Configuration validation failed');
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
