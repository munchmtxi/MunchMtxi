require('dotenv').config();
const { sequelize } = require('../src/models');
const Redis = require('ioredis');
const axios = require('axios');
const logger = require('../src/utils/logger');
const config = require('../config/config');

async function testDatabaseConnection() {
  try {
    await sequelize.authenticate();
    logger.info('✓ Database connection successful');
    return true;
  } catch (error) {
    logger.error(`✗ Database connection failed: ${error.message}`);
    return false;
  }
}

async function testRedisConnection() {
  const redis = new Redis({
    host: config.redis.host,
    port: config.redis.port
  });

  try {
    await redis.ping();
    logger.info('✓ Redis connection successful');
    redis.disconnect();
    return true;
  } catch (error) {
    logger.error(`✗ Redis connection failed: ${error.message}`);
    redis.disconnect();
    return false;
  }
}

async function testGoogleMapsAPI() {
  try {
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json?address=test&key=${config.googleMaps.apiKey}`
    );
    if (response.data.status === 'REQUEST_DENIED') {
      logger.error('✗ Google Maps API key is invalid');
      return false;
    }
    logger.info('✓ Google Maps API connection successful');
    return true;
  } catch (error) {
    logger.error(`✗ Google Maps API connection failed: ${error.message}`);
    return false;
  }
}

async function testEmailService() {
  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host: config.emailService.host,
    port: config.emailService.port,
    secure: config.emailService.encryption === 'ssl',
    auth: {
      user: config.emailService.username,
      pass: config.emailService.password
    }
  });

  try {
    await transporter.verify();
    logger.info('✓ Email service connection successful');
    return true;
  } catch (error) {
    logger.error(`✗ Email service connection failed: ${error.message}`);
    return false;
  }
}

async function runConnectionTests() {
  logger.info('Starting connection tests...');
  
  const results = await Promise.all([
    testDatabaseConnection(),
    testRedisConnection(),
    testGoogleMapsAPI(),
    testEmailService()
  ]);

  const allSuccessful = results.every(result => result === true);
  
  if (!allSuccessful) {
    logger.error('One or more connection tests failed');
    process.exit(1);
  }

  logger.info('All connection tests passed successfully');
}

runConnectionTests();