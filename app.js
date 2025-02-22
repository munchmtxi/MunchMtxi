// app.js

// External Modules
const Express = require('express');
const Cors = require('cors');
const Morgan = require('morgan');
const Http = require('http');
const SocketIO = require('socket.io');

// Aliased Internal Modules
const { logger } = require('@utils/logger');
const AppError = require('@utils/AppError');

// Import middleware
const { securityMiddleware } = require('@middleware/security');
const { logRequest } = require('@middleware/requestLogger');
const { performanceMiddleware, apiUsageMiddleware } = require('@middleware/performanceMiddleware');
const { rateLimiter, geoLocationLimiter } = require('@middleware/rateLimiter');
const { authenticate, hasMerchantPermission } = require('@middleware/authMiddleware');
const deviceMiddleware = require('@middleware/deviceDetectionMiddleware');
const responseOptimizer = require('@middleware/responseOptimizerMiddleware');
const merchantMetricsMiddleware = require('@middleware/merchantMetricsMiddleware');
const { validateRequest } = require('@middleware/validateRequest');
const businessTypeMiddleware = require('@middleware/businessTypeMiddleware');

// Import configurations
const { setupPassport } = require('@config/passport');
const { setupSwagger } = require('@config/swagger');
const { handleError } = require('@middleware/errorHandler');
const InitMonitoring = require('@config/monitoring');

// Import routes
const MonitoringRoutes = require('@routes/monitoringRoutes');
const AuthRoutes = require('@routes/authRoutes');
const TwoFaRoutes = require('@routes/2faRoutes');
const DeviceRoutes = require('@routes/deviceRoutes');
const NotificationRoutes = require('@routes/notificationRoutes');
const PasswordRoutes = require('@routes/passwordRoutes');
const GeolocationRoutes = require('@routes/geolocationRoutes');
const PaymentRoutes = require('@routes/paymentRoutes');
const PdfRoutes = require('@routes/pdfRoutes');
const ExcelRoutes = require('@routes/excelRoutes');
const merchantBaseRouter = require('@routes/merchantRoutes/profileRoutes');

// Import handlers and services
const MerchantProfileHandlers = require('@handlers/merchantHandlers/profileHandlers');
const SMSService = require('@services/smsService');
const NotificationService = require('@services/notificationService');
const EventManager = require('@services/eventManager');
const TokenService = require('@services/tokenService');

// Import RoomManager and initialize it later
const roomManager = require('@services/RoomManager');

// Create Express app
const app = Express();
const server = Http.createServer(app);

// Socket.IO setup
const io = SocketIO(server, {
    cors: {
        origin: process.env.FRONTEND_URL,
        methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
        credentials: true
    }
});

// Initialize monitoring
const { healthMonitor } = InitMonitoring(app);

// Basic middleware setup
app.use(Cors());
app.use(Express.json());
app.use(Express.urlencoded({ extended: true }));

// Apply security middleware
securityMiddleware(app);  // This internally applies all security middleware

// Apply monitoring middleware
app.use(Morgan('combined', { 
    stream: { write: message => logger.info(message.trim()) }
}));

// Apply rate limiters
app.use(rateLimiter);
app.use('/api/auth', geoLocationLimiter);

// Apply request tracking middleware
app.use(logRequest);
app.use(performanceMiddleware);
app.use(apiUsageMiddleware(healthMonitor));
app.use(deviceMiddleware);

// Initialize authentication
setupPassport(app);

// API Documentation
setupSwagger(app);

// Initialize services
const smsService = new SMSService();
const notificationService = new NotificationService(io, smsService);
// Initialize RoomManager with the Socket.IO instance
roomManager.initialize(io);
const merchantProfileHandlers = new MerchantProfileHandlers(io);

// Mount API routes
app.use('/monitoring', MonitoringRoutes);
app.use('/auth', AuthRoutes);
app.use('/2fa', TwoFaRoutes);
app.use('/devices', DeviceRoutes);
app.use('/notifications', NotificationRoutes);
app.use('/password', PasswordRoutes);
app.use('/api/v1/geolocation', GeolocationRoutes);
app.use('/api/v1/payments', PaymentRoutes);
app.use('/api/v1/excel', ExcelRoutes);
app.use('/api/pdf', PdfRoutes);

// Merchant routes middleware stack
const merchantBaseMiddleware = [
    authenticate,
    hasMerchantPermission('profile.access'),
    merchantMetricsMiddleware.handle,
    deviceMiddleware,
    responseOptimizer()
];

// Mount merchant routes
app.use(
    '/api/v1/merchants/:merchantId',
    merchantBaseMiddleware,
    merchantBaseRouter
);

// Socket authentication middleware
const authenticateSocket = async (socket, next) => {
    try {
        const { token } = socket.handshake.auth;
        if (!token) throw new Error('Authentication required');
        
        const user = await TokenService.verifyToken(token);
        socket.user = user;
        next();
    } catch (error) {
        next(new Error('Authentication failed'));
    }
};

// Socket.IO setup
io.use(authenticateSocket);

// Socket connection handler
io.on('connection', async (socket) => {
    try {
        if (socket.user?.merchantId) {
            // Join merchant-specific rooms
            await Promise.all([
                roomManager.joinRoom(socket, `merchant:${socket.user.merchantId}`),
                roomManager.joinRoom(socket, `merchant:${socket.user.merchantId}:profile`),
                roomManager.joinRoom(socket, `merchant:${socket.user.merchantId}:metrics`),
                roomManager.joinRoom(socket, `merchant:${socket.user.merchantId}:activity`),
                roomManager.joinRoom(socket, `merchant:${socket.user.merchantId}:2fa`),
                roomManager.joinRoom(socket, `merchant:${socket.user.merchantId}:draft`)
            ]);
        }

        // Register merchant profile handlers
        merchantProfileHandlers.registerSocketHandlers(socket);

        // Handle disconnection
        socket.on('disconnect', async () => {
            if (socket.user?.merchantId) {
                await Promise.all([
                    roomManager.leaveRoom(socket, `merchant:${socket.user.merchantId}`),
                    roomManager.leaveRoom(socket, `merchant:${socket.user.merchantId}:profile`),
                    roomManager.leaveRoom(socket, `merchant:${socket.user.merchantId}:metrics`),
                    roomManager.leaveRoom(socket, `merchant:${socket.user.merchantId}:activity`),
                    roomManager.leaveRoom(socket, `merchant:${socket.user.merchantId}:2fa`),
                    roomManager.leaveRoom(socket, `merchant:${socket.user.merchantId}:draft`)
                ]);
            }
        });
    } catch (error) {
        logger.error('Socket connection error:', error);
        socket.disconnect(true);
    }
});

// Configure event manager
EventManager.setNotificationService(notificationService);

// Register event handlers
EventManager.on('merchant.profile.updated', async ({ merchantId, profile }) => {
    io.to(`merchant:${merchantId}:profile`).emit('profile:updated', {
        status: 'success',
        data: profile
    });
});

EventManager.on('merchant.activity.logged', async ({ merchantId, activity }) => {
    io.to(`merchant:${merchantId}:activity`).emit('activity:new', {
        status: 'success',
        data: activity
    });
});

EventManager.on('merchant.2fa.status_changed', async ({ merchantId, status }) => {
    io.to(`merchant:${merchantId}:2fa`).emit('2fa:status_changed', {
        status: 'success',
        data: status
    });
});

EventManager.on('merchant.banner.updated', async ({ merchantId, banners }) => {
    io.to(`merchant:${merchantId}:profile`).emit('banner:updated', {
        status: 'success',
        data: banners
    });
});

EventManager.on('merchant.metrics.updated', async ({ merchantId, metrics }) => {
    io.to(`merchant:${merchantId}:metrics`).emit('metrics:updated', {
        status: 'success',
        data: metrics
    });
});

EventManager.on('merchant.draft.submitted', async ({ merchantId, draft }) => {
    io.to(`merchant:${merchantId}:draft`).emit('draft:submitted', {
        status: 'success',
        data: draft
    });
});

// Error Handlers
app.use('/api/v1/merchants/:merchantId', (err, req, res, next) => {
    logger.error('Merchant Route Error:', {
        merchantId: req.params.merchantId,
        path: req.path,
        method: req.method,
        error: err.message,
        stack: err.stack,
        code: err.code
    });

    res.status(err.status || 500).json({
        status: 'error',
        code: err.code || 'MERCHANT_ERROR',
        message: err.message || 'An unexpected error occurred in merchant routes'
    });
});

// Handle undefined routes
app.all('*', (req, res, next) => {
    next(new AppError(`Cannot find ${req.originalUrl} on this server`, 404));
});

// Global error handler
app.use(handleError);

// Store instances in app.locals
app.locals.healthMonitor = healthMonitor;
app.locals.io = io;
app.locals.roomManager = roomManager;

module.exports = { app, server };
