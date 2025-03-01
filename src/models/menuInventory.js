'use strict';
const { Model } = require('sequelize');

module.exports = function(sequelize, DataTypes) {
  class MenuInventory extends Model {
    static associate(models) {
      // Merchant and Branch associations
      this.belongsTo(models.Merchant, {
        foreignKey: 'merchant_id',
        as: 'merchant'
      });
      
      this.belongsTo(models.MerchantBranch, {
        foreignKey: 'branch_id',
        as: 'branch'
      });
      
      // Category association - only if it exists
      if (models.ProductCategory) {
        this.belongsTo(models.ProductCategory, {
          foreignKey: 'category_id',
          as: 'category'
        });
      }
      
      // Modifiers association - only if it exists
      if (models.ProductModifier) {
        this.hasMany(models.ProductModifier, {
          foreignKey: 'menu_item_id',
          as: 'modifiers'
        });
      }
      
      // Attributes association - only if it exists
      if (models.ProductAttribute) {
        this.hasMany(models.ProductAttribute, {
          foreignKey: 'menu_item_id',
          as: 'attributes'
        });
      }
      
      // Discounts association - only if it exists
      if (models.ProductDiscount) {
        this.hasMany(models.ProductDiscount, {
          foreignKey: 'menu_item_id',
          as: 'discounts'
        });
      }
      
      // Draft association - only if it exists
      if (models.ProductDraft) {
        this.hasOne(models.ProductDraft, {
          foreignKey: 'menu_item_id',
          as: 'draft'
        });
      }
      
      // Audit log association - only if it exists
      if (models.ProductAuditLog) {
        this.hasMany(models.ProductAuditLog, {
          foreignKey: 'menu_item_id',
          as: 'auditLogs'
        });
      }
      
      // Order items association - only if it exists
      if (models.OrderItem) {
        this.hasMany(models.OrderItem, {
          foreignKey: 'menu_item_id',
          as: 'orderItems'
        });
      }
      
      // Creator and updater associations
      this.belongsTo(models.User, {
        foreignKey: 'created_by',
        as: 'creator'
      });
      
      this.belongsTo(models.User, {
        foreignKey: 'updated_by',
        as: 'updater'
      });
    }
    
    // Calculate final price after applying active discounts
    calculateFinalPrice() {
      var self = this;
      if (!self.discounts || self.discounts.length === 0) {
        return self.price;
      }
      
      // Filter active discounts only
      var activeDiscounts = self.discounts.filter(function(discount) {
        var now = new Date();
        
        // Check if discount is active
        if (!discount.is_active) return false;
        
        // Check date range if applicable
        if (discount.start_date && new Date(discount.start_date) > now) return false;
        if (discount.end_date && new Date(discount.end_date) < now) return false;
        
        return true;
      });
      
      if (activeDiscounts.length === 0) {
        return self.price;
      }
      
      // Find the best discount (lowest final price)
      var bestPrice = self.price;
      
      for (var i = 0; i < activeDiscounts.length; i++) {
        var discount = activeDiscounts[i];
        var discountedPrice = self.price;
        
        if (discount.type === 'percentage') {
          discountedPrice = self.price * (1 - (discount.value / 100));
        } else if (discount.type === 'flat') {
          discountedPrice = self.price - discount.value;
        }
        
        // Take the lowest price
        if (discountedPrice < bestPrice) {
          bestPrice = discountedPrice;
        }
      }
      
      // Ensure price doesn't go negative
      return Math.max(bestPrice, 0);
    }
  }

  MenuInventory.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    merchant_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'merchants',
        key: 'id'
      }
    },
    branch_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'merchant_branches',
        key: 'id'
      }
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'product_categories',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    sku: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    cost_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        min: 0
      }
    },
    availability_status: {
      type: DataTypes.ENUM('in-stock', 'out-of-stock', 'pre-order'),
      allowNull: false,
      defaultValue: 'in-stock'
    },
    measurement_unit: {
      type: DataTypes.ENUM('piece', 'kg', 'gram', 'liter', 'ml', 'pack', 'dozen', 'bottle', 'box'),
      allowNull: false,
      defaultValue: 'piece'
    },
    quantity: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    minimum_stock_level: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        min: 0
      }
    },
    images: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    },
    thumbnail_url: {
      type: DataTypes.STRING,
      allowNull: true
    },
    is_published: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    is_featured: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    preparation_time_minutes: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0
      }
    },
    nutritional_info: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: []
    },
    display_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    is_taxable: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    tax_rate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,  // Changed to allow null to prevent validation errors
      references: {
        model: 'users',
        key: 'id'
      }
    },
    updated_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
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
    sequelize: sequelize,
    modelName: 'MenuInventory',
    tableName: 'menu_inventories',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['sku'],
        where: {
          deleted_at: null
        }
      },
      {
        fields: ['merchant_id']
      },
      {
        fields: ['branch_id']
      },
      {
        fields: ['category_id']
      },
      {
        fields: ['availability_status']
      },
      {
        fields: ['is_published']
      },
      {
        fields: ['is_featured']
      },
      {
        fields: ['created_at']
      }
    ],
    hooks: {
      beforeCreate: function(product) {
        // Generate SKU if not provided
        if (!product.sku) {
          var prefix = product.merchant_id.toString().padStart(3, '0');
          var randomString = Math.random().toString(36).substring(2, 6).toUpperCase();
          product.sku = prefix + '-' + randomString;
        }
      },
      
      afterCreate: function(product, options) {
        try {
          // Create audit log entry - but check if ProductAuditLog exists
          if (options.transaction && sequelize.models.ProductAuditLog) {
            sequelize.models.ProductAuditLog.create({
              menu_item_id: product.id,
              user_id: product.created_by,
              action: 'create',
              changes: {
                name: product.name,
                price: product.price,
                availability_status: product.availability_status
              }
            }, { transaction: options.transaction });
          }
        } catch (error) {
          console.error('Error creating product audit log:', error);
        }
      },
      
      afterUpdate: function(product, options) {
        try {
          // Create audit log for updates - but check if ProductAuditLog exists
          if (options.transaction && product.changed && product.changed() && sequelize.models.ProductAuditLog) {
            var changedFields = {};
            product.changed().forEach(function(field) {
              changedFields[field] = product[field];
            });
            
            sequelize.models.ProductAuditLog.create({
              menu_item_id: product.id,
              user_id: product.updated_by || product.created_by,
              action: 'update',
              changes: changedFields
            }, { transaction: options.transaction });
          }
        } catch (error) {
          console.error('Error creating product update audit log:', error);
        }
      },
      
      afterDestroy: function(product, options) {
        try {
          // Create audit log for deletion - but check if ProductAuditLog exists
          if (options.transaction && sequelize.models.ProductAuditLog) {
            sequelize.models.ProductAuditLog.create({
              menu_item_id: product.id,
              user_id: options.deletedBy || product.updated_by || product.created_by,
              action: 'delete',
              changes: {
                deleted: true
              }
            }, { transaction: options.transaction });
          }
        } catch (error) {
          console.error('Error creating product deletion audit log:', error);
        }
      }
    }
  });

  return MenuInventory;
};