'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('reports', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      report_type: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      data: {
        type: Sequelize.JSON,
        allowNull: false,
      },
      generated_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
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

    await queryInterface.addIndex('reports', ['generated_by'], {
      name: 'reports_generated_by_index'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('reports', 'reports_generated_by_index');
    await queryInterface.dropTable('reports');
  }
};