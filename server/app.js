const Express = require('express');
const Http = require('http');
const { logger } = require('@utils/logger');
const InitMonitoring = require('@config/monitoring');
const { setupApp } = require('./setup/app');
const { setupRoutes } = require('./setup/routes');
const { setupServices } = require('./setup/services');

// Create Express app and server
const app = Express();
const server = Http.createServer(app);

// Initialize monitoring system
const { healthMonitor } = InitMonitoring(app);

// Setup application (middleware, passport, swagger)
setupApp(app);

// Setup routes
setupRoutes(app);

// Setup services and Socket.IO
const { io, notificationService } = setupServices(server);

// Store healthMonitor in app.locals for route access
app.locals.healthMonitor = healthMonitor;

module.exports = { app, server, io, notificationService };