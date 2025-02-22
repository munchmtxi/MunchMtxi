// src/services/merchantServices/profileServices/activityLogService.js
const { MerchantActivityLog, Device } = require('@models');
const { userActivityLogger } = require('@services/userActivityLogger');
const { securityAuditLogger } = require('@services/securityAuditLogger');
const crypto = require('crypto');

class ProfileActivityLogService {
  async logProfileActivity(params) {
    const {
      merchantId,
      actorId,
      eventType,
      changes,
      deviceInfo,
      metadata = {}
    } = params;

    try {
      // Create security hash using your existing pattern
      const securityHash = this.generateSecurityHash({
        merchantId,
        actorId,
        eventType,
        changes,
        timestamp: new Date()
      });

      // Log to merchant activity log
      const activityLog = await MerchantActivityLog.create({
        merchant_id: merchantId,
        actor_id: actorId,
        device_id: deviceInfo?.id,
        event_type: eventType,
        changes,
        metadata: {
          ...metadata,
          device: deviceInfo,
          platform: deviceInfo?.platform,
          browser: deviceInfo?.browser
        },
        security_hash: securityHash,
        previous_hash: await this.getLastActivityHash(merchantId)
      });

      // Log to user activity logger for analytics
      await userActivityLogger.logUserActivity(actorId, eventType, {
        merchantId,
        path: metadata.path,
        changes: Object.keys(changes || {})
      });

      // Log to security audit logger for sensitive changes
      if (this.isSensitiveChange(changes)) {
        await securityAuditLogger.logSecurityAudit('MERCHANT_SENSITIVE_UPDATE', {
          userId: actorId,
          merchantId,
          severity: 'info',
          metadata: {
            changes,
            activityLogId: activityLog.id,
            deviceInfo: deviceInfo
          },
          compliance: {
            category: 'data_modification',
            violations: null
          }
        });
      }

      return activityLog;
    } catch (error) {
      throw new Error(`Failed to log profile activity: ${error.message}`);
    }
  }

  generateSecurityHash(data) {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
  }

  async getLastActivityHash(merchantId) {
    const lastActivity = await MerchantActivityLog.findOne({
      where: { merchant_id: merchantId },
      order: [['created_at', 'DESC']]
    });
    return lastActivity?.security_hash;
  }

  isSensitiveChange(changes) {
    const sensitiveFields = [
      'phone_number',
      'email',
      'address',
      'banking_details',
      'security_settings'
    ];
    return Object.keys(changes || {}).some(field => 
      sensitiveFields.includes(field)
    );
  }

  async getProfileActivity(merchantId, options = {}) {
    const {
      startDate,
      endDate,
      eventTypes = [],
      actorId,
      limit = 50,
      offset = 0
    } = options;

    const query = {
      where: { merchant_id: merchantId },
      include: [
        {
          model: Device,
          as: 'device',
          attributes: ['device_type', 'browser', 'os']
        }
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset
    };

    // Add date range filter
    if (startDate || endDate) {
      query.where.created_at = {};
      if (startDate) query.where.created_at[Op.gte] = startDate;
      if (endDate) query.where.created_at[Op.lte] = endDate;
    }

    // Add event type filter
    if (eventTypes.length > 0) {
      query.where.event_type = { [Op.in]: eventTypes };
    }

    // Add actor filter
    if (actorId) {
      query.where.actor_id = actorId;
    }

    return MerchantActivityLog.findAll(query);
  }

  async validateActivityChain(merchantId) {
    const activities = await MerchantActivityLog.findAll({
      where: { merchant_id: merchantId },
      order: [['created_at', 'ASC']]
    });

    let previousHash = null;
    let isValid = true;

    for (const activity of activities) {
      if (activity.previous_hash !== previousHash) {
        isValid = false;
        break;
      }
      previousHash = activity.security_hash;
    }

    return isValid;
  }
}

module.exports = new ProfileActivityLogService();