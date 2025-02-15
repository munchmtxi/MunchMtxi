'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Booking extends Model {
    static associate(models) {
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
    // Added new geo-location fields
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
      }
    ],
  });
  return Booking;
};