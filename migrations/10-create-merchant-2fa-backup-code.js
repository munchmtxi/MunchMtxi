'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('merchant_2fa_backup_codes', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      merchant_2fa_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'merchant_2fa',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      code: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      is_used: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      used_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Add index for merchant_2fa_id
    await queryInterface.addIndex('merchant_2fa_backup_codes', {
      fields: ['merchant_2fa_id'],
      name: 'merchant_2fa_backup_codes_merchant_2fa_id_index',
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Drop the merchant_2fa_backup_codes table if the migration is rolled back
    await queryInterface.dropTable('merchant_2fa_backup_codes');
  },
};