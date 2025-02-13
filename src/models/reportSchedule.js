// src/models/reportSchedule.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ReportSchedule extends Model {
    static associate(models) {
      this.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });
      
      this.belongsTo(models.Merchant, {
        foreignKey: 'merchant_id',
        as: 'merchant'
      });
    }

    calculateNextRunDate() {
      const now = new Date();
      switch (this.frequency) {
        case 'daily':
          return new Date(now.setDate(now.getDate() + 1));
        case 'weekly':
          return new Date(now.setDate(now.getDate() + 7));
        case 'monthly':
          return new Date(now.setMonth(now.getMonth() + 1));
        case 'quarterly':
          return new Date(now.setMonth(now.getMonth() + 3));
        default:
          return new Date(now.setDate(now.getDate() + 1));
      }
    }

    validateScheduleConfig() {
      const validReportTypes = ['orders', 'drivers', 'merchants', 'inventory', 'sales'];
      const validFrequencies = ['daily', 'weekly', 'monthly', 'quarterly'];

      if (!validReportTypes.includes(this.report_type)) {
        throw new Error('Invalid report type');
      }

      if (!validFrequencies.includes(this.frequency)) {
        throw new Error('Invalid frequency');
      }

      try {
        if (this.filters) {
          JSON.parse(this.filters);
        }
      } catch (error) {
        throw new Error('Invalid filters format');
      }
    }
  }

  ReportSchedule.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    report_type: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: {
          args: [['orders', 'drivers', 'merchants', 'inventory', 'sales']],
          msg: 'Invalid report type'
        }
      }
    },
    frequency: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: {
          args: [['daily', 'weekly', 'monthly', 'quarterly']],
          msg: 'Invalid frequency'
        }
      }
    },
    filters: {
      type: DataTypes.JSON,
      allowNull: true,
      validate: {
        isValidJSON(value) {
          if (value) {
            try {
              JSON.parse(value);
            } catch (error) {
              throw new Error('Invalid JSON format for filters');
            }
          }
        }
      }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: {
          msg: 'Invalid email format'
        }
      }
    },
    next_run_at: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        isDate: {
          msg: 'Invalid date format for next run'
        },
        isFuture(value) {
          if (value <= new Date()) {
            throw new Error('Next run date must be in the future');
          }
        }
      }
    },
    last_run_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('active', 'paused', 'completed', 'failed'),
      allowNull: false,
      defaultValue: 'active'
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      validate: {
        notNull: { msg: 'User ID is required' },
        isInt: { msg: 'User ID must be an integer' }
      }
    },
    merchant_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'merchants',
        key: 'id'
      },
      validate: {
        isInt: { msg: 'Merchant ID must be an integer' }
      }
    },
    error_log: {
      type: DataTypes.TEXT,
      allowNull: true
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
    modelName: 'ReportSchedule',
    tableName: 'report_schedules',
    underscored: true,
    paranoid: true,
    indexes: [
      {
        fields: ['user_id'],
        name: 'report_schedules_user_id_index'
      },
      {
        fields: ['merchant_id'],
        name: 'report_schedules_merchant_id_index'
      },
      {
        fields: ['next_run_at'],
        name: 'report_schedules_next_run_at_index'
      },
      {
        fields: ['status'],
        name: 'report_schedules_status_index'
      }
    ],
    hooks: {
      beforeValidate: async (schedule) => {
        if (!schedule.next_run_at) {
          schedule.next_run_at = schedule.calculateNextRunDate();
        }
      },
      beforeCreate: async (schedule) => {
        schedule.validateScheduleConfig();
      },
      beforeUpdate: async (schedule) => {
        if (schedule.changed('frequency')) {
          schedule.next_run_at = schedule.calculateNextRunDate();
        }
        schedule.validateScheduleConfig();
      }
    }
  });

  return ReportSchedule;
};