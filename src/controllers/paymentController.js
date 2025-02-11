// src/controllers/paymentController.js
const { logTransactionEvent } = require('../utils/logger');
const fs = require('fs');
const path = require('path');
const paymentService = require('../services/paymentService');
const catchAsync = require('../utils/catchAsync');

// Helper function: Export Transaction Report
async function exportTransactionReport(startDate, endDate) {
  const logDir = path.join(__dirname, '../utils/logs');
  const transactions = [];
  // Read and parse transaction logs
  const files = await fs.promises.readdir(logDir);
  const transactionFiles = files.filter(f => f.startsWith('transactions-'));
  for (const file of transactionFiles) {
    const content = await fs.promises.readFile(path.join(logDir, file), 'utf8');
    const logs = content.split('\n').filter(Boolean).map(JSON.parse);
    transactions.push(...logs);
  }
  // Filter by date range and format for export
  return transactions.filter(log => {
    const logDate = new Date(log.timestamp);
    return logDate >= startDate && logDate <= endDate;
  });
}

class PaymentController {
  // Payment Initiation Controllers
  initiateMobileMoneyPayment = catchAsync(async (req, res) => {
    const payment = await paymentService.initiateMobileMoneyPayment(req.body);
    res.status(201).json({
      status: 'success',
      data: payment
    });
  });

  initiateBankCardPayment = catchAsync(async (req, res) => {
    const payment = await paymentService.initiateBankCardPayment(req.body);
    res.status(201).json({
      status: 'success',
      data: payment
    });
  });

  // Payment Status Controller
  getPaymentStatus = catchAsync(async (req, res) => {
    const payment = await paymentService.getPaymentStatus(req.params.paymentId);
    res.json({
      status: 'success',
      data: payment
    });
  });

  // Webhook Handler
  handleWebhook = catchAsync(async (req, res) => {
    const { provider } = req.params;
    const webhookData = req.body;

    const result = await paymentService.handleWebhook(provider, webhookData);

    res.status(200).json({
      status: 'success',
      message: 'Webhook processed successfully',
      data: result
    });
  });

  // Transaction Report Export Controller
  exportTransactionReport = catchAsync(async (req, res) => {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({
        status: 'fail',
        message: 'startDate and endDate query parameters are required.'
      });
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    const report = await exportTransactionReport(start, end);
    res.status(200).json({
      status: 'success',
      data: report
    });
  });

  // New verification methods
  verifyPayment = catchAsync(async (req, res) => {
    const { paymentId } = req.params;
    const verificationResult = await paymentService.verifyPayment(paymentId);
    logTransactionEvent('Payment verification completed', {
      payment_id: paymentId,
      result: verificationResult
    });
    res.status(200).json({
      status: 'success',
      data: verificationResult
    });
  });

  getVerificationStatus = catchAsync(async (req, res) => {
    const { paymentId } = req.params;
    const status = await paymentService.getPaymentStatus(paymentId);
    res.status(200).json({
      status: 'success',
      data: status
    });
  });

  getRiskAssessment = catchAsync(async (req, res) => {
    const { paymentId } = req.params;
    const payment = await paymentService.getPaymentStatus(paymentId);
    res.status(200).json({
      status: 'success',
      data: {
        risk_score: payment.risk_score,
        risk_factors: payment.risk_factors,
        status: payment.status,
        verification_details: payment.verification_details
      }
    });
  });

  approveHighRiskPayment = catchAsync(async (req, res) => {
    const { paymentId } = req.params;
    const { reason, notes } = req.body;
    const result = await paymentService.updatePaymentStatus(paymentId, 'verified', {
      approved_by: req.user.id,
      approval_reason: reason,
      approval_notes: notes,
      approval_time: new Date()
    });
    logTransactionEvent('High-risk payment approved', {
      payment_id: paymentId,
      approved_by: req.user.id,
      reason,
      notes
    });
    res.status(200).json({
      status: 'success',
      data: result
    });
  });

  rejectHighRiskPayment = catchAsync(async (req, res) => {
    const { paymentId } = req.params;
    const { reason, notes } = req.body;
    const result = await paymentService.updatePaymentStatus(paymentId, 'rejected', {
      rejected_by: req.user.id,
      rejection_reason: reason,
      rejection_notes: notes,
      rejection_time: new Date()
    });
    logTransactionEvent('High-risk payment rejected', {
      payment_id: paymentId,
      rejected_by: req.user.id,
      reason,
      notes
    });
    res.status(200).json({
      status: 'success',
      data: result
    });
  });

  getAnomalyReport = catchAsync(async (req, res) => {
    const { startDate, endDate, threshold = 50 } = req.query;
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default to last 30 days
    const end = endDate ? new Date(endDate) : new Date();
    const transactions = await exportTransactionReport(start, end);
    // Identify anomalies based on risk score and other factors
    const anomalies = transactions.filter(transaction => {
      return (
        transaction.risk_score > threshold ||
        transaction.verification_attempts > 3 ||
        transaction.status === 'pending_review'
      );
    });
    res.status(200).json({
      status: 'success',
      data: {
        total_transactions: transactions.length,
        anomalies_found: anomalies.length,
        threshold,
        anomalies
      }
    });
  });
}

module.exports = new PaymentController();