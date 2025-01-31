'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Staff extends Model {
    static associate(models) {
      this.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
      });
      this.belongsTo(models.Merchant, {
        foreignKey: 'merchant_id',
        as: 'merchant',
      });
      this.belongsTo(models.User, {
        foreignKey: 'manager_id',
        as: 'manager',
      });
      this.belongsToMany(models.Permission, {
        through: models.StaffPermissions,
        foreignKey: 'staff_id',
        otherKey: 'permission_id',
        as: 'permissions',
      });
    }
  }

  Staff.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      validate: {
        notNull: { msg: 'User ID is required' },
        isInt: { msg: 'User ID must be an integer' },
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
    position: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Position is required' },
      },
    },
    manager_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
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
    modelName: 'Staff',
    tableName: 'staff',
    underscored: true,
    paranoid: true,
    indexes: [
      {
        unique: true,
        fields: ['user_id'],
        name: 'staff_user_id_unique'
      }
    ]
  });

  return Staff;
};
