'use strict';
/** @type {import('sequelize-cli').Migration} */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('roles', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: { // Role name, e.g., Admin, Merchant, Staff, Driver, Customer
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
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

    await queryInterface.addIndex('roles', ['name'], {
      unique: true,
      name: 'roles_name_unique'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('roles', 'roles_name_unique');
    await queryInterface.dropTable('roles');
  }
};