'use strict';
const ProfileActivityLogService = require('@services/merchant/profile/activityLogService');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');

class ActivityLogController {
  async logActivity(req, res, next) {
    try {
      const { eventType, changes, metadata } = req.body;

      const activity = await ProfileActivityLogService.logProfileActivity({
        merchantId: req.merchantId,
        actorId: req.user.id,
        eventType,
        changes,
        deviceInfo: req.deviceInfo,
        metadata,
      });

      logger.info('Activity logged successfully', { merchantId: req.merchantId, eventType });
      res.status(201).json({
        status: 'success',
        data: activity,
      });
    } catch (error) {
      logger.error('Failed to log activity', { error: error.message, merchantId: req.merchantId });
      next(error);
    }
  }

  async getActivities(req, res, next) {
    try {
      const options = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        eventTypes: req.query.eventTypes?.split(',') || [],
        actorId: req.query.actorId,
        limit: parseInt(req.query.limit) || 50,
        offset: parseInt(req.query.offset) || 0,
      };

      const activities = await ProfileActivityLogService.getProfileActivity(req.merchantId, options);

      logger.info('Activities retrieved', { merchantId: req.merchantId, count: activities.length });
      res.status(200).json({
        status: 'success',
        data: activities,
      });
    } catch (error) {
      logger.error('Failed to retrieve activities', { error: error.message, merchantId: req.merchantId });
      next(error);
    }
  }

  async validateChain(req, res, next) {
    try {
      const isValid = await ProfileActivityLogService.validateActivityChain(req.merchantId);

      logger.info('Activity chain validated', { merchantId: req.merchantId, isValid });
      res.status(200).json({
        status: 'success',
        data: { isValid },
      });
    } catch (error) {
      logger.error('Failed to validate activity chain', { error: error.message, merchantId: req.merchantId });
      next(error);
    }
  }
}

module.exports = new ActivityLogController();