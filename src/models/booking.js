'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Booking extends Model {
    static associate(models) {
      // Existing associations
      this.belongsTo(models.Customer, {
        foreignKey: 'customer_id',
        as: 'customer',
      });
      this.belongsTo(models.Merchant, {
        foreignKey: 'merchant_id',
        as: 'merchant',
      });
      this.hasMany(models.Notification, {
        foreignKey: 'booking_id',
        as: 'notifications',
      });
      // New associations for Table and MerchantBranch
      this.belongsTo(models.Table, {
        foreignKey: 'table_id',
        as: 'table',
      });
      this.belongsTo(models.MerchantBranch, {
        foreignKey: 'branch_id',
        as: 'branch',
      });
      // New association for staff assignment
      this.belongsTo(models.Staff, {
        foreignKey: 'staff_id',
        as: 'staff',
      });
    }

    format_date() {
      if (!this.booking_date) return 'N/A';
      return this.booking_date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }

    format_time() {
      if (!this.booking_time) return 'N/A';
      return this.booking_time.slice(0, 5); // Returns HH:MM format
    }
  }

  Booking.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    customer_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'customers',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      validate: {
        notNull: { msg: 'Customer ID is required' },
        isInt: { msg: 'Customer ID must be an integer' },
      },
    },
    merchant_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'merchants',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      validate: {
        notNull: { msg: 'Merchant ID is required' },
        isInt: { msg: 'Merchant ID must be an integer' },
      },
    },
    reference: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    booking_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    booking_time: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    booking_type: {
      type: DataTypes.ENUM('table', 'taxi'),
      allowNull: false,
      validate: {
        isIn: {
          args: [['table', 'taxi']],
          msg: 'Booking type must be either table or taxi',
        },
      },
    },
    guest_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: { args: [1], msg: 'Guest count must be at least 1' },
      },
    },
    special_requests: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    details: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'denied', 'seated', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending',
    },
    // New additional field for staff assignment
    staff_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'staff',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    branch_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'merchant_branches',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    table_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'tables',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    waitlist_position: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    waitlisted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    approval_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Reason for approval or denial'
    },
    notification_status: {
      type: DataTypes.ENUM('not_sent', 'sent', 'failed', 'received', 'confirmed'),
      defaultValue: 'not_sent',
      allowNull: false
    },
    last_notification_sent: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    estimated_arrival: {
      type: DataTypes.TIME,
      allowNull: true,
      comment: 'For tracking customers who are running late'
    },
    arrived_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    seated_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    departed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    seating_preference: {
      type: DataTypes.ENUM('no_preference', 'indoor', 'outdoor', 'rooftop', 'balcony', 'window', 'booth', 'high_top', 'bar', 'lounge', 'private'),
      allowNull: false,
      defaultValue: 'no_preference',
    },
    party_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Staff notes about the reservation/party'
    },
    check_in_code: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Unique code for self check-in'
    },
    source: {
      type: DataTypes.ENUM('app', 'website', 'phone', 'walk_in', 'third_party', 'staff'),
      allowNull: false,
      defaultValue: 'app',
    },
    occasion: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Special occasion like birthday, anniversary, etc.'
    },
    booking_modified_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the booking was last modified'
    },
    booking_modified_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'User ID of who modified the booking'
    },
    booking_metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'Additional booking data like promotional info, device info, etc.'
    },
    pickup_location: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Pickup location as {lat, lng}'
    },
    dropoff_location: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Dropoff location as {lat, lng}'
    },
    estimated_distance: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    estimated_duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
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
    }
  }, {
    sequelize,
    modelName: 'Booking',
    tableName: 'bookings',
    underscored: true,
    paranoid: true,
    indexes: [
      {
        fields: ['customer_id'],
        name: 'bookings_customer_id_index'
      },
      {
        fields: ['merchant_id'],
        name: 'bookings_merchant_id_index'
      },
      {
        unique: true,
        fields: ['reference'],
        name: 'bookings_reference_unique'
      },
      {
        fields: ['guest_count'],
        name: 'bookings_guest_count_index'
      },
      {
        fields: ['special_requests'],
        name: 'bookings_special_requests_index'
      },
      // New indexes for performance on staff and branch
      {
        fields: ['staff_id'],
        name: 'bookings_staff_id_index'
      },
      {
        fields: ['branch_id'],
        name: 'bookings_branch_id_index'
      }
    ],
  });
  return Booking;
};
