'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('customers', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      phone_number: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      address: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      preferences: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      payment_methods: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    await queryInterface.addIndex('customers', ['user_id'], { 
      unique: true,
      name: 'customers_user_id_unique'
    });
    
    await queryInterface.addIndex('customers', ['phone_number'], { 
      unique: true,
      name: 'customers_phone_number_unique'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes first
    await queryInterface.removeIndex('customers', 'customers_user_id_unique');
    await queryInterface.removeIndex('customers', 'customers_phone_number_unique');
    
    // Drop table
    await queryInterface.dropTable('customers');
  }
};