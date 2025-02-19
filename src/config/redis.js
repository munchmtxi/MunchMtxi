// src/config/redis.js
const redis = require('redis');
const { REDIS_URL } = process.env;

const client = redis.createClient({
    url: REDIS_URL
});

client.on('error', (err) => {
    console.error('Redis Client Error:', err);
});

module.exports = client;