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
        validate: {
          notEmpty: { msg: 'Report type is required' },
        }
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
        validate: {
          notNull: { msg: 'GeneratedBy is required' },
          isInt: { msg: 'GeneratedBy must be an integer' },
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

    // Adding index on generated_by
    await queryInterface.addIndex('reports', ['generated_by'], {
      name: 'reports_generated_by_index'
    });
  },
  async down(queryInterface, Sequelize) {
    // Remove index on generated_by
    await queryInterface.removeIndex('reports', 'reports_generated_by_index');

    // Drop the table
    await queryInterface.dropTable('reports');
  }
};