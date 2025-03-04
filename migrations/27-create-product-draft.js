'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('product_drafts', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      menu_item_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'menu_inventories',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      draft_data: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('draft', 'pending_review', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'draft',
      },
      preview_key: {
        type: Sequelize.UUID,
        allowNull: false,
        defaultValue: Sequelize.UUIDV4,
      },
      created_by: {
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
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // Add unique index for preview_key
    await queryInterface.addIndex('product_drafts', {
      fields: ['preview_key'],
      unique: true,
      name: 'product_drafts_preview_key_unique',
    });

    // Add index for menu_item_id
    await queryInterface.addIndex('product_drafts', {
      fields: ['menu_item_id'],
      name: 'product_drafts_menu_item_id_index',
    });

    // Add index for created_by
    await queryInterface.addIndex('product_drafts', {
      fields: ['created_by'],
      name: 'product_drafts_created_by_index',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('product_drafts');
  },
};