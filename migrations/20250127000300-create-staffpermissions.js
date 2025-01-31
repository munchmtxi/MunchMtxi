'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('staff_permissions', {
      staff_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'staff',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        primaryKey: true,
      },
      permission_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'permissions',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        primaryKey: true,
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('staff_permissions');
  }
};