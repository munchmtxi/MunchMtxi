// seeders/20250306130000-add-munch-malawi.js
'use strict';

const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface) => {
    // Fetch the merchant role ID
    const rolesResult = await queryInterface.sequelize.query(
      'SELECT id FROM roles WHERE name = :roleName',
      {
        replacements: { roleName: 'merchant' },
        type: queryInterface.sequelize.QueryTypes.SELECT,
      }
    );
    console.log('Raw roles query result:', rolesResult);
    const merchantRoleId = rolesResult && rolesResult.length > 0 ? rolesResult[0].id : null;

    if (!merchantRoleId) {
      throw new Error('Merchant role not found. Please run the initial merchant seeder first.');
    }
    console.log(`Merchant role ID: ${merchantRoleId}`);

    // Seed New Merchant User
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Maria2403', salt);

    const users = [
      {
        first_name: 'Munch',
        last_name: 'Malawi',
        email: 'munchmalawi@gmail.com',
        password: hashedPassword,
        role_id: merchantRoleId,
        phone: '+447983156023',
        country: 'malawi',
        is_verified: true,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    await queryInterface.bulkInsert('users', users);
    console.log('Munch Malawi user seeded successfully');

    // Fetch user ID
    const merchantUsers = await queryInterface.sequelize.query(
      'SELECT id FROM users WHERE email = :email',
      {
        replacements: { email: 'munchmalawi@gmail.com' },
        type: queryInterface.sequelize.QueryTypes.SELECT,
      }
    );
    console.log('Raw merchant user query result:', merchantUsers);

    if (!merchantUsers || !Array.isArray(merchantUsers) || merchantUsers.length === 0) {
      throw new Error('Failed to fetch Munch Malawi user: invalid query result');
    }

    const userId = merchantUsers[0].id;

    // Seed Merchant
    const merchants = [
      {
        user_id: userId,
        business_name: 'Munch Malawi Cafe',
        business_type: 'restaurant',
        address: '456 Central Ave, Blantyre',
        phone_number: '+447983156023',
        currency: 'MWK',
        time_zone: 'Africa/Blantyre',
        business_hours: JSON.stringify({ open: '09:00', close: '21:00' }),
        whatsapp_enabled: true,
        last_password_update: new Date(),
        password_strength: 80,
        failed_password_attempts: 0,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    await queryInterface.bulkInsert('merchants', merchants);
    console.log('Munch Malawi merchant seeded successfully');

    // Fetch merchant ID
    const merchantRecords = await queryInterface.sequelize.query(
      'SELECT id FROM merchants WHERE business_name = :name',
      {
        replacements: { name: 'Munch Malawi Cafe' },
        type: queryInterface.sequelize.QueryTypes.SELECT,
      }
    );
    console.log('Raw merchant record query result:', merchantRecords);

    const merchantId = merchantRecords[0].id;

    // Seed Merchant Branch
    const branches = [
      {
        merchant_id: merchantId,
        name: 'Blantyre Main',
        branch_code: 'BLT001',
        contact_email: 'munchmalawi@gmail.com',
        contact_phone: '+447983156023',
        address: '456 Central Ave, Blantyre',
        location: JSON.stringify({ type: 'Point', coordinates: [35.0168, -15.7861] }),
        operating_hours: JSON.stringify({
          monday: { open: '09:00', close: '21:00' },
          tuesday: { open: '09:00', close: '21:00' },
          wednesday: { open: '09:00', close: '21:00' },
          thursday: { open: '09:00', close: '21:00' },
          friday: { open: '09:00', close: '22:00' },
          saturday: { open: '09:00', close: '22:00' },
          sunday: { open: '10:00', close: '20:00' },
        }),
        last_password_update: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    await queryInterface.bulkInsert('merchant_branches', branches);
    console.log('Munch Malawi branch seeded successfully');
  },

  down: async (queryInterface) => {
    // Fetch merchant ID to delete branch
    const merchantRecords = await queryInterface.sequelize.query(
      'SELECT id FROM merchants WHERE business_name = :name',
      {
        replacements: { name: 'Munch Malawi Cafe' },
        type: queryInterface.sequelize.QueryTypes.SELECT,
      }
    );

    const merchantIds = merchantRecords.map((m) => m.id);

    await queryInterface.bulkDelete('merchant_branches', {
      merchant_id: merchantIds.length > 0 ? merchantIds : null,
    });

    await queryInterface.bulkDelete('merchants', {
      business_name: ['Munch Malawi Cafe'],
    });

    await queryInterface.bulkDelete('users', {
      email: ['munchmalawi@gmail.com'],
    });

    console.log('Munch Malawi user, merchant, and branch removed successfully');
  },
};