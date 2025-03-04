'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('templates', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      type: {
        type: Sequelize.ENUM('WHATSAPP', 'SMS', 'EMAIL', 'PDF'),
        allowNull: false,
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      subject: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('ACTIVE', 'INACTIVE', 'DEPRECATED'),
        defaultValue: 'ACTIVE',
        allowNull: false,
      },
      language: {
        type: Sequelize.STRING,
        defaultValue: 'en',
        allowNull: false,
      },
      merchant_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'merchants',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Add unique index for the 'name' column
    await queryInterface.addIndex('templates', {
      fields: ['name'],
      unique: true,
      name: 'templates_name_unique',
    });

    // Add composite index for 'type' and 'status'
    await queryInterface.addIndex('templates', {
      fields: ['type', 'status'],
      name: 'templates_type_status',
    });

    // Add index for 'merchant_id'
    await queryInterface.addIndex('templates', {
      fields: ['merchant_id'],
      name: 'templates_merchant_id',
    });

    // Add index for 'subject'
    await queryInterface.addIndex('templates', {
      fields: ['subject'],
      name: 'templates_subject',
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Drop the templates table if the migration is rolled back
    await queryInterface.dropTable('templates');
  },
};