'use strict';

const express = require('express');
const router = express.Router();
const feedbackController = require('@controllers/customer/feedbackController');
const feedbackMiddleware = require('@middleware/customer/feedbackMiddleware');
const { protect, restrictTo } = require('@middleware/authMiddleware');

router.use(protect); // Authentication middleware
router.use(restrictTo('customer')); // Restrict to customers

router.post(
  '/submit',
  feedbackMiddleware.validateFeedbackBody,
  feedbackController.submitFeedback
);

module.exports = router;