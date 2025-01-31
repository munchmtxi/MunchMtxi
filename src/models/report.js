'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Report extends Model {
    static associate(models) {
      this.belongsTo(models.User, {
        foreignKey: 'generated_by',
        as: 'generator',
      });
    }
  }

  Report.init({
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
        notEmpty: { msg: 'Report type is required' },
      },
    },
    data: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    generated_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      validate: {
        notNull: { msg: 'GeneratedBy is required' },
        isInt: { msg: 'GeneratedBy must be an integer' },
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
    modelName: 'Report',
    tableName: 'reports',
    underscored: true,
    paranoid: true,
    indexes: [
      {
        fields: ['generated_by'],
        name: 'reports_generated_by_index'
      }
    ]
  });

  return Report;
};