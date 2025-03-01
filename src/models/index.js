'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require(path.join(__dirname, '..', 'config', 'config.js'))[env];
const db = {};

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

// First pass: define all models without associations
fs.readdirSync(__dirname)
  .filter(function(file) {
    return (
      file.indexOf('.') !== 0 && 
      file !== basename && 
      file.slice(-3) === '.js'
    );
  })
  .forEach(function(file) {
    try {
      var model = require(path.join(__dirname, file))(
        sequelize,
        Sequelize.DataTypes
      );
      db[model.name] = model;
    } catch (error) {
      console.error(`Error loading model from file ${file}:`, error);
    }
  });

// Define model association order to handle dependencies correctly
const associationOrder = [
  // Base/independent models first
  'User', 'Customer', 'Merchant', 'Driver', 
  
  // Product and category models
  'MenuInventory', 'ProductCategory',
  
  // Promotion models 
  'ProductPromotion', 'PromotionRule',
  
  // Transaction models
  'Order', 'Payment',
  
  // Junction/dependent models last
  'OrderItems', 'PromotionRedemption',
  
  // Any remaining models not explicitly listed
  ...Object.keys(db).filter(model => 
    !['User', 'Customer', 'Merchant', 'Driver', 'MenuInventory', 'ProductCategory', 
      'ProductPromotion', 'PromotionRule', 'Order', 'Payment', 'OrderItems', 
      'PromotionRedemption'].includes(model)
  )
];

// Set up associations in the specified order
associationOrder.forEach(modelName => {
  if (db[modelName] && typeof db[modelName].associate === 'function') {
    try {
      db[modelName].associate(db);
      console.log(`Successfully associated model: ${modelName}`);
    } catch (error) {
      console.warn(`Error associating model ${modelName}:`, error.message);
    }
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;