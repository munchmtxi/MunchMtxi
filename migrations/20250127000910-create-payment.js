'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if the enum type already exists before creating it
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        -- Check if the enum type already exists, and create it only if it does not exist
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_payments_status') THEN
          CREATE TYPE public.enum_payments_status AS ENUM (
            'pending',
            'processing',
            'completed',
            'failed',
            'refunded',
            'cancelled',
            'verified'
          );
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_payments_refund_status') THEN
          CREATE TYPE public.enum_payments_refund_status AS ENUM (
            'pending',
            'approved',
            'rejected',
            'processed'
          );
        END IF;
      END $$;
    `);

    // Create the payments table
    await queryInterface.createTable('payments', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      order_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'orders',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      customer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'customers',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
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
      driver_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'drivers',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      amount: {
        type: Sequelize.FLOAT,
        allowNull: false,
      },
      payment_method: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM(
          'pending',
          'processing',
          'completed',
          'failed',
          'refunded',
          'cancelled',
          'verified'
        ),
        allowNull: false,
        defaultValue: 'pending',
      },
      transaction_id: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true,
      },
      risk_score: {
        type: Sequelize.FLOAT,
        allowNull: true,
        defaultValue: 0,
        validate: {
          min: 0,
          max: 100,
        },
      },
      risk_factors: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      verification_attempts: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      verification_details: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      provider: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Payment provider (Airtel, TNM, MTN, M-Pesa, Bank Name, etc.)',
      },
      payment_details: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Provider-specific payment details including bank reference',
      },
      bank_reference: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Bank transaction reference number',
      },
      daily_transaction_count: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Daily transaction counter for limits',
      },
      refund_status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected', 'processed'),
        allowNull: true,
      },
      refund_details: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Stores refund reason, approver, timestamp, etc.',
      },
      tip_amount: {
        type: Sequelize.FLOAT,
        allowNull: true,
        defaultValue: 0,
        validate: {
          min: 0,
        },
      },
      tip_allocation: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Stores tip distribution details among staff/drivers',
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

    // Adding indexes as per model
    await queryInterface.addIndex('payments', ['order_id'], { name: 'payments_order_id_index' });
    await queryInterface.addIndex('payments', ['customer_id'], { name: 'payments_customer_id_index' });
    await queryInterface.addIndex('payments', ['merchant_id'], { name: 'payments_merchant_id_index' });
    await queryInterface.addIndex('payments', ['driver_id'], { name: 'payments_driver_id_index' });
    await queryInterface.addIndex('payments', ['transaction_id'], { name: 'payments_transaction_id_unique', unique: true });
    await queryInterface.addIndex('payments', ['bank_reference'], { name: 'payments_bank_reference_index' });
    await queryInterface.addIndex('payments', ['provider'], { name: 'payments_provider_index' });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('payments');
    // Drop enums if needed
    await queryInterface.sequelize.query(`
      DROP TYPE public.enum_payments_status;
      DROP TYPE public.enum_payments_refund_status;
    `);
  }
};
