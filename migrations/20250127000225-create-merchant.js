'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('merchants', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      business_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      business_type: {
        type: Sequelize.ENUM('grocery', 'restaurant'),
        allowNull: false,
      },
      address: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      phone_number: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      currency: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'USD',
      },
      time_zone: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'UTC',
      },
      business_hours: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      notification_preferences: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {
          orderUpdates: true,
          bookingNotifications: true,
          customerFeedback: true,
          marketingMessages: false
        }
      },
      whatsapp_enabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    await queryInterface.addIndex('merchants', ['user_id'], { 
      unique: true,
      name: 'merchants_user_id_unique'
    });
    
    await queryInterface.addIndex('merchants', ['phone_number'], { 
      unique: true,
      name: 'merchants_phone_number_unique'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes first
    await queryInterface.removeIndex('merchants', 'merchants_user_id_unique');
    await queryInterface.removeIndex('merchants', 'merchants_phone_number_unique');

    // Drop ENUM type
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_merchants_business_type";');

    // Drop table
    await queryInterface.dropTable('merchants');
  }
};