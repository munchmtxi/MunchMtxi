// src/constants/merchant/profile/constants.js
const MERCHANT_PROFILE_STATUSES = {
    PENDING: 'pending',
    ACTIVE: 'active',
    SUSPENDED: 'suspended',
    INACTIVE: 'inactive'
  };
  
  const MERCHANT_PROFILE_UPDATE_EVENTS = {
    PROFILE_UPDATED: 'merchant_profile_updated',
    BUSINESS_HOURS_UPDATED: 'merchant_business_hours_updated',
    DELIVERY_SETTINGS_UPDATED: 'merchant_delivery_settings_updated',
    BRANCH_CREATED: 'merchant_branch_created',
    BRANCH_UPDATED: 'merchant_branch_updated'
  };
  
  module.exports = {
    MERCHANT_PROFILE_STATUSES,
    MERCHANT_PROFILE_UPDATE_EVENTS
  };