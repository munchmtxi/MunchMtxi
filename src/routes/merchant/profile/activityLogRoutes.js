'use strict';
const express = require('express');
const router = express.Router();
const ActivityLogController = require('@controllers/merchant/profile/activityLogController');
const { activityLogGuard } = require('@middleware/activityLogMiddleware');

router.post('/log', activityLogGuard, ActivityLogController.logActivity);
router.get('/', activityLogGuard, ActivityLogController.getActivities);
router.get('/validate', activityLogGuard, ActivityLogController.validateChain);

module.exports = router;