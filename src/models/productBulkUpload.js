'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProductBulkUpload extends Model {
    static associate(models) {
      this.belongsTo(models.Merchant, {
        foreignKey: 'merchant_id',
        as: 'merchant'
      });
      
      this.belongsTo(models.MerchantBranch, {
        foreignKey: 'branch_id',
        as: 'branch'
      });
      
      this.belongsTo(models.User, {
        foreignKey: 'created_by',
        as: 'creator'
      });
    }
  }

  ProductBulkUpload.init({
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
    file_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    file_url: {
      type: DataTypes.STRING,
      allowNull: false
    },
    file_type: {
      type: DataTypes.ENUM('csv', 'json', 'excel'),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
      allowNull: false,
      defaultValue: 'pending'
    },
    total_items: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    processed_items: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    successful_items: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    failed_items: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    error_log: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    result_summary: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    options: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Import options like update existing, skip duplicates, etc.'
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    started_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    completed_at: {
      type: DataTypes.DATE,
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
    }
  }, {
    sequelize,
    modelName: 'ProductBulkUpload',
    tableName: 'product_bulk_uploads',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['merchant_id']
      },
      {
        fields: ['branch_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['created_by']
      },
      {
        fields: ['created_at']
      }
    ],
    hooks: {
      afterCreate: async (bulkUpload, options) => {
        try {
          // Log the bulk upload activity
          if (options.transaction) {
            await sequelize.models.MerchantActivityLog.create({
              merchant_id: bulkUpload.merchant_id,
              activity_type: 'product_bulk_upload_initiated',
              entity_type: 'product_bulk_upload',
              entity_id: bulkUpload.id,
              details: {
                file_name: bulkUpload.file_name,
                file_type: bulkUpload.file_type
              },
              user_id: bulkUpload.created_by
            }, { transaction: options.transaction });
          }
        } catch (error) {
          console.error('Error creating bulk upload audit log:', error);
        }
      },
      
      afterUpdate: async (bulkUpload, options) => {
        try {
          // Log completion or failure
          if (bulkUpload.changed('status') && 
              (bulkUpload.status === 'completed' || bulkUpload.status === 'failed')) {
            
            if (options.transaction) {
              await sequelize.models.MerchantActivityLog.create({
                merchant_id: bulkUpload.merchant_id,
                activity_type: `product_bulk_upload_${bulkUpload.status}`,
                entity_type: 'product_bulk_upload',
                entity_id: bulkUpload.id,
                details: {
                  file_name: bulkUpload.file_name,
                  total_items: bulkUpload.total_items,
                  successful_items: bulkUpload.successful_items,
                  failed_items: bulkUpload.failed_items
                },
                user_id: bulkUpload.created_by
              }, { transaction: options.transaction });
            }
          }
        } catch (error) {
          console.error('Error creating bulk upload completion log:', error);
        }
      }
    }
  });

  return ProductBulkUpload;
};