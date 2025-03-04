// src/config/constants/businessTypes.js
const BUSINESS_TYPES = {
  RESTAURANT: {
    code: 'restaurant',
    name: 'Restaurant',
    requiredFields: ['cuisine_type', 'seating_capacity', 'service_types'],
    allowedServiceTypes: ['dine_in', 'takeaway', 'delivery', 'catering'],
    requiredLicenses: ['food_service', 'health_safety'],
    validationRules: {
      minimum_seating: 1,
      requires_menu: true
    }
  },
  GROCERY: {
    code: 'grocery',
    name: 'Grocery Store',
    requiredFields: ['store_type', 'storage_types', 'delivery_radius'],
    allowedServiceTypes: ['in_store', 'delivery', 'pickup'],
    requiredLicenses: ['retail_food', 'storage_safety'],
    validationRules: {
      minimum_storage_area: 100,
      requires_cold_storage: true
    }
  }
};

const BUSINESS_VALIDATION_RULES = {
  cuisine_type: {
    type: 'array',
    options: ['italian', 'chinese', 'indian', 'american', 'japanese', 'thai', 'mediterranean', 'mexican'],
    min: 1
  },
  seating_capacity: {
    type: 'number',
    min: 1,
    max: 1000
  },
  store_type: {
    type: 'array',
    options: ['supermarket', 'convenience', 'specialty', 'organic', 'wholesale'],
    min: 1
  },
  storage_types: {
    type: 'array',
    options: ['ambient', 'refrigerated', 'frozen', 'climate_controlled'],
    min: 1
  },
  meat_types: {
    type: 'array',
    options: ['beef', 'pork', 'chicken', 'lamb', 'seafood', 'game'],
    min: 1
  }
};

function isValidBusinessType(type) {
  return Object.values(BUSINESS_TYPES).some(config => config.code === type);
}

function getBusinessTypeConfig(type) {
  return Object.values(BUSINESS_TYPES).find(config => config.code === type);
}

function getRequiredLicenses(type) {
  const config = getBusinessTypeConfig(type);
  return config ? config.requiredLicenses : [];
}

function getAllowedServiceTypes(type) {
  const config = getBusinessTypeConfig(type);
  return config ? config.allowedServiceTypes : [];
}

function getBusinessTypes() {
  return {
    BUSINESS_TYPES,
    BUSINESS_VALIDATION_RULES,
    isValidBusinessType,
    getBusinessTypeConfig,
    getRequiredLicenses,
    getAllowedServiceTypes
  };
}

module.exports = { getBusinessTypes };
