'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('devices', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      device_id: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      device_type: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      last_used_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
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

    await queryInterface.addConstraint('devices', {
      fields: ['user_id', 'device_id'],
      type: 'unique',
      name: 'unique_user_device'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove constraint first
    await queryInterface.removeConstraint('devices', 'unique_user_device');
    
    // Drop table
    await queryInterface.dropTable('devices');
  }
};