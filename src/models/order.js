// Order.js
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Order extends Model {
    static associate(models) {
      this.belongsTo(models.Customer, {
        foreignKey: 'customer_id',
        as: 'customer',
      });
      this.belongsTo(models.Merchant, {
        foreignKey: 'merchant_id',
        as: 'merchant',
      });
      this.belongsTo(models.Driver, {
        foreignKey: 'driver_id',
        as: 'driver',
      });
      this.hasMany(models.Payment, {
        foreignKey: 'order_id',
        as: 'payments',
      });
      this.hasMany(models.Notification, {
        foreignKey: 'order_id',
        as: 'notifications',
      });
      this.belongsToMany(models.MenuInventory, {
        through: models.OrderItems,
        foreignKey: 'order_id',
        otherKey: 'menu_item_id',
        as: 'orderedItems', // Change 'as' to avoid collision
      });
    }
    get_whatsapp_template_for_status() {
      const templateMap = {
        'confirmed': 'order_confirmed',
        'preparing': 'order_preparing',
        'ready': 'order_ready',
        'out_for_delivery': 'order_out_for_delivery',
        'completed': 'order_delivered',
        'cancelled': 'order_cancelled'
      };
      return templateMap[this.status];
    }
    formatDate() {
      return this.created_at.toLocaleDateString();
    }
    formatTime() {
      return this.created_at.toLocaleTimeString();
    }
    formatItems() {
      return JSON.stringify(this.items);
    }
    formatTotal() {
      return `${this.currency} ${this.total_amount.toFixed(2)}`;
    }
  }
  Order.init({
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
    driver_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'drivers',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      validate: {
        isInt: { msg: 'Driver ID must be an integer' },
      },
    },
    items: {
      type: DataTypes.JSON,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Items are required' },
      },
    },
    total_amount: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: {
        min: {
          args: [0],
          msg: 'Total amount must be positive',
        },
      },
    },
    order_number: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    estimated_arrival: {
      type: DataTypes.DATE,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM(
        'pending',
        'confirmed',
        'preparing',
        'ready',
        'out_for_delivery',
        'completed',
        'cancelled'
      ),
      allowNull: false,
      defaultValue: 'pending',
    },
    payment_status: {
      type: DataTypes.ENUM('unpaid', 'paid', 'refunded'),
      allowNull: false,
      defaultValue: 'unpaid',
    },
    currency: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'MWK',
      validate: {
        notEmpty: { msg: 'Currency is required' },
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
    modelName: 'Order',
    tableName: 'orders',
    underscored: true,
    paranoid: true,
    indexes: [
      {
        fields: ['customer_id'],
        name: 'orders_customer_id_index'
      },
      {
        fields: ['merchant_id'],
        name: 'orders_merchant_id_index'
      },
      {
        fields: ['driver_id'],
        name: 'orders_driver_id_index'
      },
      {
        unique: true,
        fields: ['order_number'],
        name: 'orders_order_number_unique'
      },
      {
        fields: ['currency'],
        name: 'orders_currency_index'
      }
    ]
  });
  return Order;
};