// @routes/merchantRoutes/index.js
const express = require('express');
const router = express.Router();
const profileRoutes = require('./profileRoutes');

router.use('/profile', profileRoutes);

module.exports = router;