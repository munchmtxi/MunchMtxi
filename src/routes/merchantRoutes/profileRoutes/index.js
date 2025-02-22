// src/routes/merchantRoutes/profileRoutes/index.js
const express = require('express');
const router = express.Router();

// Import route modules
const routes = {
  activity: require('./activityRoutes'),
  address: require('./addressRoutes'),
  banner: require('./bannerRoutes'),
  businessType: require('./businessTypeRoutes'),
  draft: require('./draftRoutes'),
  getProfile: require('./getProfileRoute'),
  image: require('./imageRoutes'),
  merchant2FA: require('./merchant2FARoutes'),
  password: require('./passwordRoutes'),
  metrics: require('./merchantMetricsRoutes'),
  preview: require('./previewRoutes'),
  analytics: require('./profileAnalyticsRoutes'),
  profile: require('./profileRoutes')
};

// Mount routes with validation
Object.entries(routes).forEach(([name, module]) => {
  if (module && (typeof module === 'function' || module.router)) {
    const path = name
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase();
    router.use(`/${path}`, module);
  } else {
    console.warn(`Skipping invalid route module: ${name}`);
  }
});

module.exports = router;