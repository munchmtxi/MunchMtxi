'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('addresses', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      formattedAddress: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      placeId: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      latitude: {
        type: Sequelize.DECIMAL(10, 7),
        allowNull: false,
      },
      longitude: {
        type: Sequelize.DECIMAL(10, 7),
        allowNull: false,
      },
      components: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      countryCode: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      validatedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      validationStatus: {
        type: Sequelize.ENUM('PENDING', 'VALID', 'INVALID', 'NEEDS_CORRECTION'),
        allowNull: true,
        defaultValue: 'PENDING',
      },
      validationDetails: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      suggestionCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      nearbyValidAddresses: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      locationType: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Google Maps location type (ROOFTOP, RANGE_INTERPOLATED, etc.)',
      },
      confidenceLevel: {
        type: Sequelize.ENUM('HIGH', 'MEDIUM', 'LOW'),
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Add indexes
    await queryInterface.addIndex('addresses', ['placeId'], { name: 'addresses_place_id_index' });
    await queryInterface.addIndex('addresses', ['latitude', 'longitude'], { name: 'addresses_coordinates_index' });
    await queryInterface.addIndex('addresses', ['validationStatus'], { name: 'addresses_validation_status_index' });
    await queryInterface.addIndex('addresses', ['confidenceLevel'], { name: 'addresses_confidence_level_index' });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('addresses');
  },
};