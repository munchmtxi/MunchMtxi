'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      CREATE TYPE enum_product_bulk_uploads_file_type AS ENUM ('csv', 'json', 'excel');
    `);

    await queryInterface.sequelize.query(`
      CREATE TYPE enum_product_bulk_uploads_status AS ENUM ('pending', 'processing', 'completed', 'failed');
    `);

    await queryInterface.createTable('product_bulk_uploads', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      merchant_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'merchants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      branch_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'merchant_branches', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      file_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      file_url: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      file_type: {
        type: 'enum_product_bulk_uploads_file_type',
        allowNull: false,
      },
      status: {
        type: 'enum_product_bulk_uploads_status',
        allowNull: false,
        defaultValue: 'pending',
      },
      total_items: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      processed_items: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
      successful_items: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
      failed_items: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
      error_log: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      result_summary: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      options: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      started_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      completed_at: {
        type: Sequelize.DATE,
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
    });

    await queryInterface.addIndex('product_bulk_uploads', ['merchant_id'], { name: 'product_bulk_uploads_merchant_id_index' });
    await queryInterface.addIndex('product_bulk_uploads', ['branch_id'], { name: 'product_bulk_uploads_branch_id_index' });
    await queryInterface.addIndex('product_bulk_uploads', ['status'], { name: 'product_bulk_uploads_status_index' });
    await queryInterface.addIndex('product_bulk_uploads', ['created_by'], { name: 'product_bulk_uploads_created_by_index' });
    await queryInterface.addIndex('product_bulk_uploads', ['created_at'], { name: 'product_bulk_uploads_created_at_index' });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('product_bulk_uploads');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_product_bulk_uploads_file_type;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_product_bulk_uploads_status;');
  },
};