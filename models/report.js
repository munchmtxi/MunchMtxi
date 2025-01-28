// models/report.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Report extends Model {
    static associate(models) {
      this.belongsTo(models.User, {
        foreignKey: 'generatedBy',
        as: 'generator',
      });
    }
  }

  Report.init({
    reportType: {
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
    generatedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id',
      },
      validate: {
        notNull: { msg: 'GeneratedBy is required' },
        isInt: { msg: 'GeneratedBy must be an integer' },
      },
    },
  }, {
    sequelize,
    modelName: 'Report',
    timestamps: true,
    paranoid: true,
  });

  return Report;
};
