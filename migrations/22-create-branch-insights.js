'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('branch_insights', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      merchant_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'merchants',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
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
      period_start: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      period_end: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      metrics: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      customer_sentiment: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: { positive: 0, neutral: 0, negative: 0 },
      },
      performance_scores: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: { overall: 0, service: 0, quality: 0, timeliness: 0 },
      },
      order_routing_stats: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {
          total_routed: 0,
          successfully_delivered: 0,
          average_routing_time: 0,
        },
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

    // Add unique index for merchant_id, branch_id, period_start, and period_end
    await queryInterface.addIndex('branch_insights', {
      fields: ['merchant_id', 'branch_id', 'period_start', 'period_end'],
      unique: true,
      name: 'branch_insights_unique_period',
    });

    // Add index for merchant_id
    await queryInterface.addIndex('branch_insights', {
      fields: ['merchant_id'],
      name: 'branch_insights_merchant_id_index',
    });

    // Add index for branch_id
    await queryInterface.addIndex('branch_insights', {
      fields: ['branch_id'],
      name: 'branch_insights_branch_id_index',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('branch_insights');
  },
};