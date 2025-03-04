'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('table_layout_sections', {
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
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      location_type: {
        type: Sequelize.ENUM('indoor', 'outdoor', 'rooftop', 'balcony'),
        allowNull: false,
        defaultValue: 'indoor',
      },
      floor: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      assigned_staff_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'staff',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      position: {
        type: Sequelize.JSONB,
        allowNull: true,
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
    await queryInterface.addIndex('table_layout_sections', {
      fields: ['branch_id'],
      name: 'section_branch_id_index',
    });

    // Add index for assigned_staff_id
    await queryInterface.addIndex('table_layout_sections', {
      fields: ['assigned_staff_id'],
      name: 'section_staff_id_index',
    });

    // Add index for is_active
    await queryInterface.addIndex('table_layout_sections', {
      fields: ['is_active'],
      name: 'section_is_active_index',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('table_layout_sections');
  },
};