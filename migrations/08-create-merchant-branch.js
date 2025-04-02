'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('merchant_branches', {
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
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      branch_code: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      contact_email: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      contact_phone: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      address: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      location: {
        type: Sequelize.GEOMETRY('POINT'),
        allowNull: false,
      },
      operating_hours: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      delivery_radius: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      payment_methods: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      media: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: { logo: null, banner: null, gallery: [] },
      },
      geofence_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'geofences', key: 'id' },
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
      last_password_update: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      two_factor_enabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      two_factor_secret: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      login_attempts: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      last_login_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      last_login_ip: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      trusted_devices: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      autonomy_settings: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {
          order_management: false,
          inventory_management: false,
          pricing_control: false,
          staff_management: false,
        },
      },
      routing_preferences: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {
          max_order_capacity: 100,
          delivery_radius: 5000,
          auto_accept_orders: true,
          priority_level: 1,
        },
      },
      real_time_metrics: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {
          current_order_load: 0,
          available_delivery_slots: 100,
          avg_preparation_time: 0,
        },
      },
      reservation_settings: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {
          enabled: false,
          requires_approval: true,
          default_reservation_duration_minutes: 90,
          max_party_size: 12,
          min_party_size: 1,
          max_advance_booking_days: 30,
          min_advance_booking_hours: 1,
          booking_interval_minutes: 15,
          buffer_time_minutes: 15,
          grace_period_minutes: 15,
          auto_cancel_no_show_minutes: 30,
          seating_capacity: 50,
          capacity_alert_threshold: 80,
          waitlist_enabled: true,
          waitlist_max_size: 20,
          send_reminders: true,
          reminder_time_hours: 24,
          confirmation_required: false,
          confirmation_deadline_hours: 4,
          allow_modifications: true,
          allow_cancellations: true,
          cancellation_deadline_hours: 2,
          late_cancellation_fee: null,
          no_show_fee: null,
          special_requests_enabled: true,
        },
      },
      table_management_enabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      floorplan_layout: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Visual layout of tables in the restaurant',
      },
    });

    await queryInterface.addIndex('merchant_branches', {
      fields: ['branch_code'],
      unique: true,
      name: 'merchant_branches_branch_code_unique',
    });

    await queryInterface.addIndex('merchant_branches', {
      fields: ['location'],
      using: 'GIST',
      name: 'merchant_branches_location_gist',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('merchant_branches');
  },
};