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
        validate: {
          notNull: { msg: 'User ID is required' },
          isInt: { msg: 'User ID must be an integer' },
        }
      },
      device_id: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Device ID is required' },
        }
      },
      device_type: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Device type is required' },
        }
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
    }, { // Options for createTable
      timestamps: true, // Ensure timestamps are enabled
      paranoid: true,   // Enable paranoid soft-deletes
    });

    // Adding unique constraint on user_id and device_id
    await queryInterface.addConstraint('devices', {
      fields: ['user_id', 'device_id'],
      type: 'unique',
      name: 'unique_user_device'
    });
  },
  async down(queryInterface, Sequelize) {
    // Remove unique constraint on user_id and device_id
    await queryInterface.removeConstraint('devices', 'unique_user_device');

    // Drop the table
    await queryInterface.dropTable('devices');
  }
};