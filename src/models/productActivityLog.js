// src/models/productActivityLog.js
module.exports = (sequelize, DataTypes) => {
  const ProductActivityLog = sequelize.define('ProductActivityLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    merchantBranchId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    actorId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    actorType: {
      type: DataTypes.ENUM('merchant', 'staff', 'customer', 'system', 'admin'),
      allowNull: false
    },
    actionType: {
      type: DataTypes.ENUM(
        'created', 
        'updated', 
        'deleted', 
        'price_changed', 
        'description_updated', 
        'stock_adjusted',
        'added_to_cart',
        'viewed',
        'reviewed',
        'rollback'
      ),
      allowNull: false
    },
    previousState: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    newState: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    indexes: [
      { fields: ['productId'] },
      { fields: ['merchantBranchId'] },
      { fields: ['actorId', 'actorType'] },
      { fields: ['actionType'] },
      { fields: ['timestamp'] },
      { fields: ['version'] }
    ]
  });

  ProductActivityLog.associate = (models) => {
    try {
      // Use optional chaining to safely check models
      // Use constraints: false to make relations optional
      models.productDraft && ProductActivityLog.belongsTo(models.productDraft, {
        foreignKey: 'productId',
        as: 'product',
        constraints: false
      });
      
      models.merchantBranch && ProductActivityLog.belongsTo(models.merchantBranch, {
        foreignKey: 'merchantBranchId',
        as: 'branch',
        constraints: false
      });
      
      // Try users first, fall back to User if available
      if (models.users) {
        ProductActivityLog.belongsTo(models.users, {
          foreignKey: 'actorId',
          as: 'actor',
          constraints: false
        });
      } else if (models.User) {
        ProductActivityLog.belongsTo(models.User, {
          foreignKey: 'actorId',
          as: 'actor',
          constraints: false
        });
      }
    } catch (error) {
      // Silent fail to allow the model to be loaded even if associations fail
      console.error('ProductActivityLog association error:', error.message);
    }
  };

  return ProductActivityLog;
};