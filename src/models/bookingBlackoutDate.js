// models/bookingBlackoutDate.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BookingBlackoutDate extends Model {
    static associate(models) {
      this.belongsTo(models.MerchantBranch, {
        foreignKey: 'branch_id',
        as: 'branch',
      });
    }
  }

  BookingBlackoutDate.init({
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
    },
    blackout_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    start_time: {
      type: DataTypes.TIME,
      allowNull: true,
      comment: 'If null, entire day is blacked out'
    },
    end_time: {
      type: DataTypes.TIME,
      allowNull: true,
      comment: 'If null, until end of day'
    },
    reason: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    is_recurring: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    recurrence_pattern: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'For recurring blackouts (yearly holidays, etc.)'
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
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
    modelName: 'BookingBlackoutDate',
    tableName: 'booking_blackout_dates',
    underscored: true,
    paranoid: true,
    indexes: [
      {
        fields: ['branch_id'],
        name: 'blackout_dates_branch_id_index'
      },
      {
        fields: ['blackout_date'],
        name: 'blackout_dates_date_index'
      }
    ],
  });
  return BookingBlackoutDate;
};