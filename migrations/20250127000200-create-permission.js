'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('permissions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      role_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'roles',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        validate: {
          notNull: { msg: 'Role ID is required' },
          isInt: { msg: 'Role ID must be an integer' },
        }
      },
      action: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Action is required' },
        }
      },
      resource: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Resource is required' },
        }
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

    // Adding unique constraint on role_id, action, resource
    await queryInterface.addConstraint('permissions', {
      fields: ['role_id', 'action', 'resource'],
      type: 'unique',
      name: 'unique_role_action_resource'
    });
  },
  async down(queryInterface, Sequelize) {
    // Removing unique constraint on role_id, action, resource
    await queryInterface.removeConstraint('permissions', 'unique_role_action_resource');

    // Drop the table
    await queryInterface.dropTable('permissions');
  }
};