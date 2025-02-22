// src/middleware/businessTypeMiddleware.js
const { BUSINESS_TYPES } = require('@config/constants/businessTypes');
const AppError = require('@utils/AppError');
const { Merchant } = require('@models');
const { securityAuditLogger } = require('@services/securityAuditLogger');

exports.validateBusinessTypeAccess = async (req, res, next) => {
  try {
    const merchant = await Merchant.findByPk(req.params.merchantId);
    if (!merchant) {
      throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
    }

    // Store merchant in request for later use
    req.merchant = merchant;
    next();
  } catch (error) {
    next(error);
  }
};

exports.checkBusinessTypeExists = (req, res, next) => {
  const { businessType } = req.params;
  
  if (!BUSINESS_TYPES[businessType?.toUpperCase()]) {
    return next(
      new AppError(
        'Invalid business type',
        400,
        'INVALID_BUSINESS_TYPE'
      )
    );
  }
  
  next();
};

exports.validateTypeTransition = async (req, res, next) => {
  try {
    const { business_type: newType } = req.body;
    const currentType = req.merchant.business_type;

    // Skip if not changing type
    if (currentType === newType) {
      return next();
    }

    // Log type transition attempt
    await securityAuditLogger.logSecurityAudit('MERCHANT_TYPE_TRANSITION_ATTEMPT', {
      userId: req.user.id,
      merchantId: req.params.merchantId,
      severity: 'info',
      metadata: {
        from: currentType,
        to: newType
      }
    });

    // Check if transition requires admin approval
    const requiresApproval = [
      ['grocery', 'restaurant'],
      ['restaurant', 'grocery'],
      ['butcher', 'restaurant'],
      ['butcher', 'grocery']
    ].some(([from, to]) => from === currentType && to === newType);

    if (requiresApproval && !req.user.isAdmin) {
      throw new AppError(
        'This business type change requires admin approval',
        403,
        'ADMIN_APPROVAL_REQUIRED'
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

exports.validateRequiredLicenses = async (req, res, next) => {
  try {
    const { business_type, business_type_details } = req.body;
    
    if (!business_type || !business_type_details) {
      return next();
    }

    const typeConfig = BUSINESS_TYPES[business_type.toUpperCase()];
    if (!typeConfig) {
      return next();
    }

    const { licenses = [] } = business_type_details;
    const missingLicenses = typeConfig.requiredLicenses.filter(
      license => !licenses.includes(license)
    );

    if (missingLicenses.length > 0) {
      throw new AppError(
        `Missing required licenses: ${missingLicenses.join(', ')}`,
        400,
        'MISSING_LICENSES'
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

exports.validateServiceTypes = async (req, res, next) => {
  try {
    const { business_type, business_type_details } = req.body;
    
    if (!business_type || !business_type_details) {
      return next();
    }

    const typeConfig = BUSINESS_TYPES[business_type.toUpperCase()];
    if (!typeConfig) {
      return next();
    }

    const { service_types = [] } = business_type_details;
    const invalidServices = service_types.filter(
      service => !typeConfig.allowedServiceTypes.includes(service)
    );

    if (invalidServices.length > 0) {
      throw new AppError(
        `Invalid service types: ${invalidServices.join(', ')}`,
        400,
        'INVALID_SERVICE_TYPES'
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

exports.cacheBusinessTypeRequirements = async (req, res, next) => {
  const { businessType } = req.params;
  
  if (!businessType) {
    return next();
  }

  const cacheKey = `business-type-requirements:${businessType}`;
  const cached = await req.cache.get(cacheKey);

  if (cached) {
    res.locals.businessTypeRequirements = JSON.parse(cached);
    return next();
  }

  const typeConfig = BUSINESS_TYPES[businessType.toUpperCase()];
  if (typeConfig) {
    const requirements = {
      name: typeConfig.name,
      requiredFields: typeConfig.requiredFields,
      allowedServiceTypes: typeConfig.allowedServiceTypes,
      requiredLicenses: typeConfig.requiredLicenses
    };

    await req.cache.set(cacheKey, JSON.stringify(requirements), 'EX', 3600); // 1 hour
    res.locals.businessTypeRequirements = requirements;
  }

  next();
};