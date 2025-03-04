'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('tables', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      branch_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'merchant_branches',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      table_number: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      capacity: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      location_type: {
        type: Sequelize.ENUM('indoor', 'outdoor', 'rooftop', 'balcony', 'window', 'bar'),
        allowNull: false,
        defaultValue: 'indoor',
      },
      status: {
        type: Sequelize.ENUM('available', 'reserved', 'occupied', 'maintenance'),
        allowNull: false,
        defaultValue: 'available',
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      position: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      table_type: {
        type: Sequelize.ENUM('standard', 'booth', 'high_top', 'bar', 'lounge', 'private'),
        allowNull: false,
        defaultValue: 'standard',
      },
      floor: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 1,
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      section_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'table_layout_sections',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
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
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // Add index for branch_id
    await queryInterface.addIndex('tables', {
      fields: ['branch_id'],
      name: 'tables_branch_id_index',
    });

    // Add index for status
    await queryInterface.addIndex('tables', {
      fields: ['status'],
      name: 'tables_status_index',
    });

    // Add unique index for branch_id and table_number
    await queryInterface.addIndex('tables', {
      fields: ['branch_id', 'table_number'],
      unique: true,
      name: 'tables_branch_table_unique',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('tables');
  },
};