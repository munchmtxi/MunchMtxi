// models/tableLayoutSection.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TableLayoutSection extends Model {
    static associate(models) {
      this.belongsTo(models.MerchantBranch, {
        foreignKey: 'branch_id',
        as: 'branch',
      });
      this.hasMany(models.Table, {
        foreignKey: 'section_id',
        as: 'tables',
      });
      this.belongsTo(models.Staff, {
        foreignKey: 'assigned_staff_id',
        as: 'assigned_staff',
      });
    }
  }

  TableLayoutSection.init({
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
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    location_type: {
      type: DataTypes.ENUM('indoor', 'outdoor', 'rooftop', 'balcony'),
      allowNull: false,
      defaultValue: 'indoor',
    },
    floor: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    assigned_staff_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'staff',
        key: 'id',
      },
    },
    position: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Position on the floor plan {x, y, width, height}'
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
    modelName: 'TableLayoutSection',
    tableName: 'table_layout_sections',
    underscored: true,
    paranoid: true,
    indexes: [
      {
        fields: ['branch_id'],
        name: 'section_branch_id_index'
      },
      {
        fields: ['assigned_staff_id'],
        name: 'section_staff_id_index'
      },
      {
        fields: ['is_active'],
        name: 'section_is_active_index'
      }
    ],
  });
  return TableLayoutSection;
};