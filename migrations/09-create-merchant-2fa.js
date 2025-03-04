'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('merchant_2fa', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      merchant_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'merchants',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      is_enabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      preferred_method: {
        type: Sequelize.ENUM('authenticator', 'sms', 'email', 'biometric'),
        allowNull: false,
        defaultValue: 'authenticator',
      },
      secret_key: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      backup_email: {
        type: Sequelize.STRING,
        allowNull: true,
        validate: {
          isEmail: true,
        },
      },
      backup_phone: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      last_verified: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Add index for merchant_id
    await queryInterface.addIndex('merchant_2fa', {
      fields: ['merchant_id'],
      name: 'merchant_2fa_merchant_id_index',
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Drop the merchant_2fa table if the migration is rolled back
    await queryInterface.dropTable('merchant_2fa');
  },
};