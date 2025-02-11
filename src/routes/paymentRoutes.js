const express = require('express');
const router = express.Router();

// Import middleware and controllers
try {
    const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');
    const { validateRequest } = require('../middleware/validateRequest');
    const {
        mobileMoneySchema,
        bankCardSchema,
        webhookSchema,
        paymentValidators
    } = require('../validators/paymentValidators');
    const paymentController = require('../controllers/paymentController');

    // Debug logging middleware - keeping this as it's useful for request tracking
    const debugLogger = (routeName) => (req, res, next) => {
        console.log(`[${routeName}] ${req.method} ${req.originalUrl}`);
        next();
    };

    // Mobile Money Route
    router.post(
        '/mobile-money/initiate',
        debugLogger('MobileMoney'),
        authenticate,
        authorizeRoles('customer', 'merchant'),
        validateRequest(mobileMoneySchema),
        paymentController.initiateMobileMoneyPayment
    );

    // Bank Card Route
    router.post(
        '/bank-card/initiate',
        debugLogger('BankCard'),
        authenticate,
        authorizeRoles('customer', 'merchant'),
        validateRequest(bankCardSchema),
        paymentController.initiateBankCardPayment
    );

    // Payment Status Route
    router.get(
        '/:paymentId/status',
        debugLogger('PaymentStatus'),
        authenticate,
        paymentController.getPaymentStatus
    );

    // Webhook Route
    router.post(
        '/webhook/:provider',
        debugLogger('Webhook'),
        validateRequest(webhookSchema),
        paymentController.handleWebhook
    );

    // Verification Route
    router.post(
        '/verify/:paymentId',
        debugLogger('Verification'),
        authenticate,
        validateRequest(paymentValidators.verifyPayment),
        paymentController.verifyPayment
    );

    // Review Routes
    router.post(
        '/review/:paymentId/approve',
        debugLogger('ReviewApprove'),
        authenticate,
        authorizeRoles('admin'),
        validateRequest(paymentValidators.reviewDecision),
        paymentController.approveHighRiskPayment
    );
    
    router.post(
        '/review/:paymentId/reject',
        debugLogger('ReviewReject'),
        authenticate,
        authorizeRoles('admin'),
        validateRequest(paymentValidators.reviewDecision),
        paymentController.rejectHighRiskPayment
    );

    // Transaction Report Route
    router.get(
        '/reports/transactions',
        debugLogger('TransactionReport'),
        authenticate,
        authorizeRoles('admin'),
        validateRequest(paymentValidators.transactionReport),
        paymentController.exportTransactionReport
    );

} catch (error) {
    console.error('[PaymentRoutes] Setup error:', error);
    throw error;
}

module.exports = router;