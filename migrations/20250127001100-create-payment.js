// migrations/[timestamp]-enhance-payments-table.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('payments', 'provider', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Payment provider (Airtel, TNM, MTN, M-Pesa, Bank Name, etc.)'
    });

    await queryInterface.addColumn('payments', 'payment_details', {
      type: Sequelize.JSONB,
      allowNull: true,
      comment: 'Provider-specific payment details including bank reference'
    });

    await queryInterface.addColumn('payments', 'bank_reference', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Bank transaction reference number'
    });

    // Update ENUM type with new statuses
    await queryInterface.sequelize.query('ALTER TYPE "enum_payments_status" ADD VALUE IF NOT EXISTS \'processing\'');
    await queryInterface.sequelize.query('ALTER TYPE "enum_payments_status" ADD VALUE IF NOT EXISTS \'cancelled\'');
    await queryInterface.sequelize.query('ALTER TYPE "enum_payments_status" ADD VALUE IF NOT EXISTS \'verified\'');
    
    // Add daily transaction tracking
    await queryInterface.addColumn('payments', 'daily_transaction_count', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Daily transaction counter for limits'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('payments', 'provider');
    await queryInterface.removeColumn('payments', 'payment_details');
    await queryInterface.removeColumn('payments', 'bank_reference');
    await queryInterface.removeColumn('payments', 'daily_transaction_count');
  }
};