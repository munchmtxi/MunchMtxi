'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Table extends Model {
    static associate(models) {
      // Existing associations
      this.belongsTo(models.MerchantBranch, {
        foreignKey: 'branch_id',
        as: 'branch',
      });
      this.hasMany(models.Booking, {
        foreignKey: 'table_id',
        as: 'bookings',
      });
      // New association for TableLayoutSection
      this.belongsTo(models.TableLayoutSection, {
        foreignKey: 'section_id',
        as: 'section',
      });
      // New association for assigned staff
      this.belongsTo(models.Staff, {
        foreignKey: 'assigned_staff_id',
        as: 'assignedStaff',
      });
    }
  }

  Table.init({
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
    table_number: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Table number is required' },
      },
    },
    capacity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: { args: [1], msg: 'Capacity must be at least 1' },
      },
    },
    location_type: {
      type: DataTypes.ENUM('indoor', 'outdoor', 'rooftop', 'balcony', 'window', 'bar'),
      allowNull: false,
      defaultValue: 'indoor',
    },
    status: {
      type: DataTypes.ENUM('available', 'reserved', 'occupied', 'maintenance'),
      allowNull: false,
      defaultValue: 'available',
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    position: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Coordinates in the restaurant layout {x, y}',
    },
    table_type: {
      type: DataTypes.ENUM('standard', 'booth', 'high_top', 'bar', 'lounge', 'private'),
      allowNull: false,
      defaultValue: 'standard',
    },
    floor: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1,
      comment: 'Floor level (for multi-story venues)',
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'Additional table properties like accessibility features, etc.',
    },
    // New field for section association (already existing)
    section_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'table_layout_sections',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    // New field for staff assignment
    assigned_staff_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'staff',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    }
  }, {
    sequelize,
    modelName: 'Table',
    tableName: 'tables',
    underscored: true,
    paranoid: true,
    indexes: [
      {
        fields: ['branch_id'],
        name: 'tables_branch_id_index'
      },
      {
        fields: ['status'],
        name: 'tables_status_index'
      },
      {
        unique: true,
        fields: ['branch_id', 'table_number'],
        name: 'tables_branch_table_unique'
      },
      // New index for assigned_staff_id
      {
        fields: ['assigned_staff_id'],
        name: 'tables_assigned_staff_id_index'
      }
    ],
  });
  return Table;
};
