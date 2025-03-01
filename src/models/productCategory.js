'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProductCategory extends Model {
    static associate(models) {
      // Merchant association
      this.belongsTo(models.Merchant, {
        foreignKey: 'merchant_id',
        as: 'merchant'
      });
      
      // Branch association (optional)
      this.belongsTo(models.MerchantBranch, {
        foreignKey: 'branch_id',
        as: 'branch'
      });
      
      // Products in this category
      this.hasMany(models.MenuInventory, {
        foreignKey: 'category_id',
        as: 'products'
      });
      
      // Parent-child category relationship
      this.belongsTo(models.ProductCategory, {
        foreignKey: 'parent_id',
        as: 'parent'
      });
      
      this.hasMany(models.ProductCategory, {
        foreignKey: 'parent_id',
        as: 'subcategories'
      });
    }
  }

  ProductCategory.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
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
    parent_id: {
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
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    image_url: {
      type: DataTypes.STRING,
      allowNull: true
    },
    icon_url: {
      type: DataTypes.STRING,
      allowNull: true
    },
    display_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
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
    sequelize,
    modelName: 'ProductCategory',
    tableName: 'product_categories',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      {
        fields: ['merchant_id']
      },
      {
        fields: ['branch_id']
      },
      {
        fields: ['parent_id']
      },
      {
        fields: ['is_active']
      },
      {
        fields: ['display_order']
      }
    ],
    hooks: {
      beforeCreate: async (category, options) => {
        // Check for circular references in parent-child relationships
        if (category.parent_id) {
          let parentId = category.parent_id;
          const checkedIds = new Set();
          
          while (parentId) {
            if (checkedIds.has(parentId)) {
              throw new Error('Circular reference detected in category hierarchy');
            }
            
            checkedIds.add(parentId);
            
            // Find the parent category
            const parentCategory = await sequelize.models.ProductCategory.findByPk(parentId, { 
              attributes: ['id', 'parent_id'],
              raw: true
            });
            
            if (!parentCategory) break;
            
            parentId = parentCategory.parent_id;
          }
        }
      },
      
      afterCreate: async (category, options) => {
        // Log category creation in merchant activity log
        try {
          if (options.transaction) {
            await sequelize.models.MerchantActivityLog.create({
              merchant_id: category.merchant_id,
              activity_type: 'product_category_created',
              entity_type: 'product_category',
              entity_id: category.id,
              details: {
                category_name: category.name,
                category_id: category.id
              },
              user_id: category.created_by
            }, { transaction: options.transaction });
          }
        } catch (error) {
          console.error('Error creating category audit log:', error);
        }
      }
    }
  });

  return ProductCategory;
};