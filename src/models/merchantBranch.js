'use strict';
const { Model } = require('sequelize');
const libphonenumber = require('google-libphonenumber');

module.exports = (sequelize, DataTypes) => {
  class MerchantBranch extends Model {
    static associate(models) {
      // Merchant association
      this.hasMany(models.BranchRole, {
        foreignKey: 'branch_id',
        as: 'roles'
      });
      this.hasMany(models.BranchStaffRole, {
        foreignKey: 'branch_id',
        as: 'staffRoles'
      });
      this.belongsTo(models.Merchant, {
        foreignKey: 'merchant_id',
        as: 'merchant'
      });

      // Staff association
      this.hasMany(models.Staff, {
        foreignKey: 'branch_id',
        as: 'staff'
      });

      // Metrics association
      this.hasMany(models.BranchMetrics, {
        foreignKey: 'branch_id',
        as: 'metrics'
      });

      // Activity association
      this.hasMany(models.BranchActivity, {
        foreignKey: 'branch_id',
        as: 'activities'
      });

      // Geofence association
      this.belongsTo(models.Geofence, {
        foreignKey: 'geofence_id',
        as: 'geofence'
      });

      // Orders association
      this.hasMany(models.Order, {
        foreignKey: 'branch_id',
        as: 'orders'
      });
      
      // New Insights association added for autonomous insights
      this.hasMany(models.BranchInsights, {
        foreignKey: 'branch_id',
        as: 'insights'
      });
    }
  }

  MerchantBranch.init(
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      merchant_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'merchants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Branch name is required' }
        }
      },
      branch_code: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: { msg: 'Branch code is required' }
        }
      },
      contact_email: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isEmail: { msg: 'Invalid email format' }
        }
      },
      contact_phone: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isValidPhone(value) {
            const phoneUtil = libphonenumber.PhoneNumberUtil.getInstance();
            try {
              const number = phoneUtil.parse(value);
              if (!phoneUtil.isValidNumber(number)) {
                throw new Error('Invalid phone number');
              }
            } catch (error) {
              throw new Error('Invalid phone number format');
            }
          }
        }
      },
      address: {
        type: DataTypes.STRING,
        allowNull: false
      },
      location: {
        type: DataTypes.GEOMETRY('POINT'),
        allowNull: false
      },
      operating_hours: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
        validate: {
          isValidOperatingHours(value) {
            const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
            const timeFormat = /^([01]\d|2[0-3]):([0-5]\d)$/;

            for (const day of days) {
              if (value[day]) {
                if (!timeFormat.test(value[day].open) || !timeFormat.test(value[day].close)) {
                  throw new Error(`Invalid time format for ${day}`);
                }
              }
            }
          }
        }
      },
      delivery_radius: {
        type: DataTypes.FLOAT,
        allowNull: true,
        validate: {
          min: 0
        }
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      payment_methods: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: []
      },
      media: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {
          logo: null,
          banner: null,
          gallery: []
        }
      },
      geofence_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'geofences',
          key: 'id'
        }
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true
      },
      // New fields added below for enhanced branch capabilities
      last_password_update: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      two_factor_enabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      two_factor_secret: {
        type: DataTypes.STRING,
        allowNull: true
      },
      login_attempts: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      last_login_at: {
        type: DataTypes.DATE,
        allowNull: true
      },
      last_login_ip: {
        type: DataTypes.STRING,
        allowNull: true
      },
      trusted_devices: {
        type: DataTypes.JSONB,
        defaultValue: []
      },
      autonomy_settings: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {
          order_management: false, // false = centralized, true = autonomous
          inventory_management: false,
          pricing_control: false,
          staff_management: false
        }
      },
      routing_preferences: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {
          max_order_capacity: 100,
          delivery_radius: 5000, // in meters
          auto_accept_orders: true,
          priority_level: 1
        }
      },
      real_time_metrics: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {
          current_order_load: 0,
          available_delivery_slots: 100,
          avg_preparation_time: 0
        }
      },
      // The new fields to enhance reservation and table management capabilities
      reservation_settings: {
        type: DataTypes.JSONB,
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
          capacity_alert_threshold: 80, // percentage
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
        }
      },
      table_management_enabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      floorplan_layout: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Visual layout of tables in the restaurant'
      }
    },
    {
      sequelize,
      modelName: 'MerchantBranch',
      tableName: 'merchant_branches',
      underscored: true,
      paranoid: true,
      indexes: [
        {
          unique: true,
          fields: ['branch_code']
        },
        {
          fields: ['location'],
          using: 'GIST'
        }
      ]
    }
  );

  return MerchantBranch;
};
