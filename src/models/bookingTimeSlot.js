// models/bookingTimeSlot.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BookingTimeSlot extends Model {
    static associate(models) {
      this.belongsTo(models.MerchantBranch, {
        foreignKey: 'branch_id',
        as: 'branch',
      });
    }
  }

  BookingTimeSlot.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    branch_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'merchant_branches',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      validate: {
        notNull: { msg: 'Branch ID is required' },
        isInt: { msg: 'Branch ID must be an integer' },
      },
    },
    day_of_week: {
      type: DataTypes.INTEGER,
      allowNull: false, 
      validate: {
        min: 0,
        max: 6
      },
      comment: '0=Sunday, 1=Monday, etc.'
    },
    start_time: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    end_time: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    slot_name: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Optional name like "Lunch", "Dinner", etc.'
    },
    max_capacity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30,
      comment: 'Maximum total capacity for this time slot'
    },
    booking_interval_minutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 15,
      comment: 'Booking interval in minutes (e.g., every 15 minutes)'
    },
    max_party_size: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 10,
      comment: 'Maximum party size allowed for this time slot'
    },
    min_party_size: {
      type: DataTypes.INTEGER,
      allowNull: false, 
      defaultValue: 1,
      comment: 'Minimum party size required for this time slot'
    },
    max_advance_booking_days: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30,
      comment: 'How many days in advance a booking can be made'
    },
    auto_assign_tables: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether to automatically assign tables'
    },
    overbooking_limit: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: 'Number of bookings allowed beyond capacity (for waitlist)'
    },
    slot_type: {
      type: DataTypes.ENUM('regular', 'special', 'holiday', 'event'),
      allowNull: false,
      defaultValue: 'regular',
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
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
    modelName: 'BookingTimeSlot',
    tableName: 'booking_time_slots',
    underscored: true,
    paranoid: true,
    indexes: [
      {
        fields: ['branch_id'],
        name: 'booking_time_slots_branch_id_index'
      },
      {
        fields: ['day_of_week'],
        name: 'booking_time_slots_day_of_week_index'
      },
      {
        fields: ['is_active'],
        name: 'booking_time_slots_is_active_index'
      }
    ],
  });
  return BookingTimeSlot;
};