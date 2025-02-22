// src/routes/index.js
const express = require('express');
const router = express.Router();

// Import route modules
const merchantProfileRoutes = require('./merchantRoutes/profileRoutes');
const merchantOrderRoutes = require('./merchantRoutes/orderRoutes');
// ... other route imports

// Mount routes with prefix
router.use('/merchant/profile', merchantProfileRoutes);
router.use('/merchant/orders', merchantOrderRoutes);
// ... other route mounts

// Global error handler
router.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal server error'
  });
});

module.exports = router;