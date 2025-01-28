// migrations/20250127000800-create-driver.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Drivers', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'Users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      vehicleInfo: {
        type: Sequelize.JSON,
        allowNull: false,
      },
      licenseNumber: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      routes: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      availabilityStatus: {
        type: Sequelize.ENUM('available', 'unavailable'),
        allowNull: false,
        defaultValue: 'available',
      },
      currentLocation: {
        type: Sequelize.GEOMETRY('POINT'),
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    await queryInterface.addIndex('Drivers', ['userId'], { unique: true });
    await queryInterface.addIndex('Drivers', ['licenseNumber'], { unique: true });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Drivers');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Drivers_availabilityStatus";');
  }
};
