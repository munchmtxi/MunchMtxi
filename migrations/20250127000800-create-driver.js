'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('drivers', {
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
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      phone_number: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      vehicle_info: {
        type: Sequelize.JSON,
        allowNull: false,
      },
      license_number: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      routes: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      availability_status: {
        type: Sequelize.ENUM('available', 'unavailable'),
        allowNull: false,
        defaultValue: 'available',
      },
      current_location: {
        type: Sequelize.GEOMETRY('POINT'),
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

    await queryInterface.addIndex('drivers', ['user_id'], {
      unique: true,
      name: 'drivers_user_id_unique'
    });
    
    await queryInterface.addIndex('drivers', ['phone_number'], {
      unique: true,
      name: 'drivers_phone_number_unique'
    });
    
    await queryInterface.addIndex('drivers', ['license_number'], {
      unique: true,
      name: 'drivers_license_number_unique'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes first
    await queryInterface.removeIndex('drivers', 'drivers_user_id_unique');
    await queryInterface.removeIndex('drivers', 'drivers_phone_number_unique');
    await queryInterface.removeIndex('drivers', 'drivers_license_number_unique');

    // Drop ENUM type
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_drivers_availability_status";');

    // Drop table
    await queryInterface.dropTable('drivers');
  }
};