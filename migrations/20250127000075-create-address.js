'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('addresses', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      formatted_address: {
        type: Sequelize.STRING,
        allowNull: false
      },
      place_id: {
        type: Sequelize.STRING,
        allowNull: false
      },
      latitude: {
        type: Sequelize.DECIMAL(10, 7),
        allowNull: false
      },
      longitude: {
        type: Sequelize.DECIMAL(10, 7),
        allowNull: false
      },
      components: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      country_code: {
        type: Sequelize.STRING,
        allowNull: true
      },
      validated_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      validation_status: {
        type: Sequelize.ENUM('PENDING', 'VALID', 'INVALID', 'NEEDS_CORRECTION'),
        defaultValue: 'PENDING',
        allowNull: false
      },
      validation_details: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Stores validation metadata like confidence level and validation source'
      },
      suggestion_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      nearby_valid_addresses: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Stores up to 5 nearby valid address suggestions'
      },
      location_type: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Google Maps location type (ROOFTOP, RANGE_INTERPOLATED, etc.)'
      },
      confidence_level: {
        type: Sequelize.ENUM('HIGH', 'MEDIUM', 'LOW'),
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('addresses', ['place_id'], {
      name: 'addresses_place_id_index'
    });

    await queryInterface.addIndex('addresses', ['latitude', 'longitude'], {
      name: 'addresses_coordinates_index'
    });

    // Add new indexes for address verification
    await queryInterface.addIndex('addresses', ['validation_status'], {
      name: 'addresses_validation_status_index'
    });

    await queryInterface.addIndex('addresses', ['confidence_level'], {
      name: 'addresses_confidence_level_index'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes first
    await queryInterface.removeIndex('addresses', 'addresses_place_id_index');
    await queryInterface.removeIndex('addresses', 'addresses_coordinates_index');
    await queryInterface.removeIndex('addresses', 'addresses_validation_status_index');
    await queryInterface.removeIndex('addresses', 'addresses_confidence_level_index');

    // Drop ENUM types after dropping the table
    await queryInterface.dropTable('addresses');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_addresses_validation_status;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_addresses_confidence_level;');
  }
};