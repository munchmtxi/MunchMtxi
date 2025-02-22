// src/services/merchantServices/profileServices/businessTypeService.js
const { Merchant } = require('@models');
const { BUSINESS_TYPES } = require('@config/constants/businessTypes');
const AppError = require('@utils/AppError');
const { securityAuditLogger } = require('@services/securityAuditLogger');
const { userActivityLogger } = require('@services/userActivityLogger');
const { validateBusinessType } = require('@validators/merchantValidators/profileValidators/businessTypeValidator');

class BusinessTypeService {
  async updateBusinessType(merchantId, userId, updateData, authToken = null) {
    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) {
      throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
    }

    const { error, value } = validateBusinessType(updateData);
    if (error) {
      throw new AppError(
        'Invalid business type data',
        400,
        'VALIDATION_ERROR',
        error.details
      );
    }

    // Store the previous state for audit and rollback
    const previousState = {
      business_type: merchant.business_type,
      business_type_details: merchant.business_type_details
    };

    try {
      // Attempt the update
      const updatedMerchant = await merchant.update({
        business_type: value.business_type,
        business_type_details: value.business_type_details
      });

      // Log the successful update
      await securityAuditLogger.logSecurityAudit('MERCHANT_BUSINESS_TYPE_UPDATE', {
        userId,
        merchantId,
        severity: 'info',
        metadata: {
          previous: previousState,
          updated: {
            business_type: value.business_type,
            business_type_details: value.business_type_details
          }
        },
        compliance: {
          category: 'business_profile',
          status: 'success'
        }
      });

      // Log user activity
      await userActivityLogger.logUserActivity(userId, 'merchant_type_update', {
        merchantId,
        previous_type: previousState.business_type,
        new_type: value.business_type,
        path: `/merchants/${merchantId}/business-type`
      });

      return updatedMerchant;
    } catch (error) {
      // Log the failed attempt
      await securityAuditLogger.logSecurityAudit('MERCHANT_BUSINESS_TYPE_UPDATE_FAILED', {
        userId,
        merchantId,
        severity: 'warning',
        metadata: {
          error: error.message,
          attempted_update: value
        }
      });

      throw error;
    }
  }

  async getBusinessTypeRequirements(businessType) {
    const typeConfig = BUSINESS_TYPES[businessType.toUpperCase()];
    if (!typeConfig) {
      throw new AppError('Invalid business type', 400, 'INVALID_BUSINESS_TYPE');
    }

    return {
      name: typeConfig.name,
      requiredFields: typeConfig.requiredFields,
      allowedServiceTypes: typeConfig.allowedServiceTypes,
      requiredLicenses: typeConfig.requiredLicenses,
      validationRules: typeConfig.validationRules
    };
  }

  async validateBusinessTypeConfig(merchantId) {
    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) {
      throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
    }

    const isValid = merchant.validateBusinessTypeDetails();
    const typeConfig = merchant.getBusinessTypeConfig();

    if (!isValid) {
      return {
        isValid: false,
        missingRequirements: this.getMissingRequirements(merchant, typeConfig)
      };
    }

    return {
      isValid: true,
      currentConfig: merchant.business_type_details
    };
  }

  getMissingRequirements(merchant, typeConfig) {
    const details = merchant.business_type_details || {};
    const missing = {
      fields: [],
      licenses: [],
      serviceTypes: []
    };

    // Check required fields
    typeConfig.requiredFields.forEach(field => {
      if (!details[field]) {
        missing.fields.push(field);
      }
    });

    // Check required licenses
    typeConfig.requiredLicenses.forEach(license => {
      if (!details.licenses?.includes(license)) {
        missing.licenses.push(license);
      }
    });

    // Check service types
    if (!details.service_types?.length) {
      missing.serviceTypes = typeConfig.allowedServiceTypes;
    } else {
      const invalidServices = details.service_types.filter(
        service => !typeConfig.allowedServiceTypes.includes(service)
      );
      if (invalidServices.length > 0) {
        missing.serviceTypes = invalidServices;
      }
    }

    return missing;
  }
}

module.exports = new BusinessTypeService();
