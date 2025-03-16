'use strict';
const { MerchantActivityLog } = require('@models');
const { Op } = require('sequelize');
const crypto = require('crypto');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');

class ProfileActivityLogService {
  async logProfileActivity({ merchantId, actorId, eventType, changes, deviceInfo, metadata }) {
    try {
      const previousActivity = await MerchantActivityLog.findOne({
        where: { merchant_id: merchantId },
        order: [['createdAt', 'DESC']],
        attributes: ['id', 'security_hash', 'createdAt'],
      });

      const activityData = {
        merchant_id: merchantId,
        actor_id: actorId,
        device_id: deviceInfo?.id || null,
        event_type: eventType,
        changes: changes ? JSON.stringify(changes) : null,
        metadata: metadata ? JSON.stringify(metadata) : null,
        previous_hash: previousActivity?.security_hash || null,
      };

      activityData.security_hash = crypto
        .createHash('sha256')
        .update(
          `${merchantId}${actorId}${eventType}${JSON.stringify(changes)}${previousActivity?.security_hash || ''}`
        )
        .digest('hex');

      const activity = await MerchantActivityLog.create(activityData);
      return activity;
    } catch (error) {
      logger.error('Failed to log profile activity', { error: error.message });
      throw new AppError(`Failed to log profile activity: ${error.message}`, 500);
    }
  }

  async getProfileActivity(merchantId, options = {}) {
    try {
      const { startDate, endDate, eventTypes, actorId, limit = 50, offset = 0 } = options;

      const where = { merchant_id: merchantId };
      if (startDate) where.createdAt = { [Op.gte]: new Date(startDate) };
      if (endDate) where.createdAt = { [Op.lte]: new Date(endDate) };
      if (eventTypes?.length) where.event_type = { [Op.in]: eventTypes };
      if (actorId) where.actor_id = actorId;

      const activities = await MerchantActivityLog.findAll({
        where,
        include: [{
          model: require('@models').Device,
          as: 'device',
          attributes: ['id', 'device_type', 'browser', 'os'],
        }],
        attributes: ['id', 'merchant_id', 'actor_id', 'device_id', 'event_type', 'changes', 'metadata', 'security_hash', 'previous_hash', 'createdAt'],
        order: [['createdAt', 'DESC']],
        limit: Math.min(limit, 100),
        offset,
      });

      return activities.map(activity => ({
        ...activity.toJSON(),
        changes: activity.changes ? JSON.parse(activity.changes) : null,
        metadata: activity.metadata ? JSON.parse(activity.metadata) : null,
      }));
    } catch (error) {
      logger.error('Failed to fetch profile activity', { error: error.message });
      throw new AppError(`Failed to fetch profile activity: ${error.message}`, 500);
    }
  }

  async validateActivityChain(merchantId) {
    try {
      const activities = await MerchantActivityLog.findAll({
        where: { merchant_id: merchantId },
        attributes: ['id', 'actor_id', 'event_type', 'changes', 'security_hash', 'previous_hash', 'createdAt'],
        order: [['createdAt', 'ASC']],
      });

      for (let i = 0; i < activities.length; i++) {
        const current = activities[i];
        const previous = i > 0 ? activities[i - 1] : null;

        const expectedHash = crypto
          .createHash('sha256')
          .update(
            `${current.merchant_id}${current.actor_id}${current.event_type}${current.changes || ''}${previous?.security_hash || ''}`
          )
          .digest('hex');

        if (current.security_hash !== expectedHash) {
          logger.warn('Activity chain validation failed', { activityId: current.id, merchantId });
          return false;
        }
      }

      return true;
    } catch (error) {
      logger.error('Failed to validate activity chain', { error: error.message });
      throw new AppError(`Failed to validate activity chain: ${error.message}`, 500);
    }
  }
}

module.exports = new ProfileActivityLogService();