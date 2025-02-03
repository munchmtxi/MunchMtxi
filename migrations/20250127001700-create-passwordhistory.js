'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('password_histories', {
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
      password_hash: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Password hash is required' },
        }
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    }, { // Options for createTable
      timestamps: true, // Ensure timestamps are enabled
      paranoid: true,   // Enable paranoid soft-deletes
    });

    // Adding index on user_id
    await queryInterface.addIndex('password_histories', ['user_id'], {
      name: 'password_histories_user_id_index'
    });
  },
  async down(queryInterface, Sequelize) {
    // Remove index on user_id
    await queryInterface.removeIndex('password_histories', 'password_histories_user_id_index');

    // Drop the table
    await queryInterface.dropTable('password_histories');
  }
};