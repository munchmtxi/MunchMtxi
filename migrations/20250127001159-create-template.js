'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('templates', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      type: {
        type: Sequelize.ENUM('WHATSAPP', 'SMS', 'EMAIL'),
        allowNull: false
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('ACTIVE', 'INACTIVE', 'DEPRECATED'),
        defaultValue: 'ACTIVE',
        allowNull: false
      },
      language: {
        type: Sequelize.STRING,
        defaultValue: 'en',
        allowNull: false
      },
      merchantId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Merchants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Adding indexes after table creation
    await queryInterface.addIndex('templates', ['name'], {
      unique: true,
      name: 'templates_name_unique'
    });

    await queryInterface.addIndex('templates', ['type', 'status'], {
      name: 'templates_type_status'
    });

    await queryInterface.addIndex('templates', ['merchantId'], {
      name: 'templates_merchant_id'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes first
    await queryInterface.removeIndex('templates', 'templates_name_unique');
    await queryInterface.removeIndex('templates', 'templates_type_status');
    await queryInterface.removeIndex('templates', 'templates_merchant_id');

    // Then drop the table
    await queryInterface.dropTable('templates');
  }
};