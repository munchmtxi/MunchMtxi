'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('roles', [
      { id: 1, name: 'admin', created_at: new Date(), updated_at: new Date() },
      { id: 2, name: 'customer', created_at: new Date(), updated_at: new Date() },
      { id: 3, name: 'driver', created_at: new Date(), updated_at: new Date() },
      { id: 4, name: 'staff', created_at: new Date(), updated_at: new Date() },
      { id: 19, name: 'merchant', created_at: new Date(), updated_at: new Date() },
    ], {});
    console.log('Roles seeded successfully');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('roles', null, {});
    console.log('Roles removed successfully');
  },
};