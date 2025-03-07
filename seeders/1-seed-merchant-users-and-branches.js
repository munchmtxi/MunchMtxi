'use strict';
const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface) => {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Password123!', salt);

    const users = [
      { first_name: 'Jane', last_name: 'Doe', email: 'merchant1@example.com', password: hashedPassword, role_id: 19, phone: '+1234567890', country: 'malawi', is_verified: true, status: 'active', created_at: new Date(), updated_at: new Date() },
      { first_name: 'Mike', last_name: 'Johnson', email: 'merchant2@example.com', password: hashedPassword, role_id: 19, phone: '+1234567891', country: 'zambia', is_verified: true, status: 'active', created_at: new Date(), updated_at: new Date() },
      { first_name: 'Sara', last_name: 'Lee', email: 'merchant3@example.com', password: hashedPassword, role_id: 19, phone: '+1234567892', country: 'mozambique', is_verified: true, status: 'active', created_at: new Date(), updated_at: new Date() },
    ];

    await queryInterface.bulkInsert('users', users);
    console.log('Merchant users seeded successfully');

    const merchantUsers = await queryInterface.sequelize.query(
      'SELECT id, email FROM users WHERE email IN (:emails)',
      { replacements: { emails: ['merchant1@example.com', 'merchant2@example.com', 'merchant3@example.com'] }, type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    const userMap = merchantUsers.reduce((map, user) => { map[user.email] = user.id; return map; }, {});

    const merchants = [
      { user_id: userMap['merchant1@example.com'], business_name: "Jane's Grocery", business_type: 'grocery', address: '123 Market St, Lilongwe', phone_number: '+1234567890', currency: 'MWK', time_zone: 'Africa/Blantyre', business_hours: JSON.stringify({ open: '08:00', close: '18:00' }), whatsapp_enabled: true, last_password_update: new Date(), password_strength: 75, failed_password_attempts: 0, created_at: new Date(), updated_at: new Date() },
      { user_id: userMap['merchant2@example.com'], business_name: "Mike's Restaurant", business_type: 'restaurant', address: '456 Food Ave, Lusaka', phone_number: '+1234567891', currency: 'ZMW', time_zone: 'Africa/Lusaka', business_hours: JSON.stringify({ open: '10:00', close: '22:00' }), whatsapp_enabled: true, last_password_update: new Date(), password_strength: 75, failed_password_attempts: 0, created_at: new Date(), updated_at: new Date() },
      { user_id: userMap['merchant3@example.com'], business_name: "Sara's Grocery Chain", business_type: 'grocery', address: '789 Main St, Maputo', phone_number: '+1234567892', currency: 'MZN', time_zone: 'Africa/Maputo', business_hours: JSON.stringify({ open: '07:00', close: '19:00' }), whatsapp_enabled: true, last_password_update: new Date(), password_strength: 75, failed_password_attempts: 0, created_at: new Date(), updated_at: new Date() },
    ];

    await queryInterface.bulkInsert('merchants', merchants);
    console.log('Merchants seeded successfully');

    const merchantRecords = await queryInterface.sequelize.query(
      'SELECT id, business_name FROM merchants WHERE business_name IN (:names)',
      { replacements: { names: ["Jane's Grocery", "Mike's Restaurant", "Sara's Grocery Chain"] }, type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    const merchantMap = merchantRecords.reduce((map, merchant) => { map[merchant.business_name] = merchant.id; return map; }, {});

    const branches = [
      { merchant_id: merchantMap["Jane's Grocery"], name: 'Lilongwe Central', branch_code: 'LIL001', contact_email: 'lilongwe@janesgrocery.com', contact_phone: '+1234567890', address: '123 Market St, Lilongwe', location: JSON.stringify({ type: 'Point', coordinates: [13.9626, -33.9803] }), operating_hours: JSON.stringify({ monday: { open: '08:00', close: '18:00' }, tuesday: { open: '08:00', close: '18:00' }, wednesday: { open: '08:00', close: '18:00' }, thursday: { open: '08:00', close: '18:00' }, friday: { open: '08:00', close: '18:00' }, saturday: { open: '08:00', close: '16:00' }, sunday: { open: 'closed', close: 'closed' } }), last_password_update: new Date(), created_at: new Date(), updated_at: new Date() },
      { merchant_id: merchantMap["Mike's Restaurant"], name: 'Lusaka Main', branch_code: 'LUS001', contact_email: 'lusaka@mikesrestaurant.com', contact_phone: '+1234567891', address: '456 Food Ave, Lusaka', location: JSON.stringify({ type: 'Point', coordinates: [15.3875, -28.3228] }), operating_hours: JSON.stringify({ monday: { open: '10:00', close: '22:00' }, tuesday: { open: '10:00', close: '22:00' }, wednesday: { open: '10:00', close: '22:00' }, thursday: { open: '10:00', close: '22:00' }, friday: { open: '10:00', close: '23:00' }, saturday: { open: '10:00', close: '23:00' }, sunday: { open: '12:00', close: '20:00' } }), last_password_update: new Date(), created_at: new Date(), updated_at: new Date() },
      { merchant_id: merchantMap["Sara's Grocery Chain"], name: 'Maputo Downtown', branch_code: 'MAP001', contact_email: 'maputo@sarasgrocery.com', contact_phone: '+1234567892', address: '789 Main St, Maputo', location: JSON.stringify({ type: 'Point', coordinates: [32.5732, -25.9692] }), operating_hours: JSON.stringify({ monday: { open: '07:00', close: '19:00' }, tuesday: { open: '07:00', close: '19:00' }, wednesday: { open: '07:00', close: '19:00' }, thursday: { open: '07:00', close: '19:00' }, friday: { open: '07:00', close: '19:00' }, saturday: { open: '07:00', close: '17:00' }, sunday: { open: 'closed', close: 'closed' } }), last_password_update: new Date(), created_at: new Date(), updated_at: new Date() },
      { merchant_id: merchantMap["Sara's Grocery Chain"], name: 'Maputo North', branch_code: 'MAP002', contact_email: 'maputonorth@sarasgrocery.com', contact_phone: '+1234567893', address: '101 North Rd, Maputo', location: JSON.stringify({ type: 'Point', coordinates: [32.5832, -25.9592] }), operating_hours: JSON.stringify({ monday: { open: '07:00', close: '19:00' }, tuesday: { open: '07:00', close: '19:00' }, wednesday: { open: '07:00', close: '19:00' }, thursday: { open: '07:00', close: '19:00' }, friday: { open: '07:00', close: '19:00' }, saturday: { open: '07:00', close: '17:00' }, sunday: { open: 'closed', close: 'closed' } }), last_password_update: new Date(), created_at: new Date(), updated_at: new Date() },
    ];

    await queryInterface.bulkInsert('merchant_branches', branches);
    console.log('Merchant branches seeded successfully');
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('merchant_branches', { merchant_id: { [queryInterface.sequelize.Op.ne]: null } });
    await queryInterface.bulkDelete('merchants', { business_name: ["Jane's Grocery", "Mike's Restaurant", "Sara's Grocery Chain"] });
    await queryInterface.bulkDelete('users', { email: ['merchant1@example.com', 'merchant2@example.com', 'merchant3@example.com'] });
    console.log('Merchant users, merchants, and branches removed successfully');
  },
};