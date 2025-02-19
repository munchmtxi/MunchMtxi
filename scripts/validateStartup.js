// scripts/validateStartup.js
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const { logger } = require('../src/utils/logger');

class StartupValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.basePath = path.join(process.cwd(), 'src');
    this.checkResults = {
      structure: { passed: false, details: [] },
      models: { passed: false, details: [] },
      routes: { passed: false, details: [] },
      controllers: { passed: false, details: [] },
      services: { passed: false, details: [] },
      security: { passed: false, details: [] },
      middleware: { passed: false, details: [] },
      validators: { passed: false, details: [] },
      handlers: { passed: false, details: [] },
      database: { passed: false, details: [] },
      migrations: { passed: false, details: [] },
      integrations: { passed: false, details: [] }
    };
  }

  addError(category, message) {
    this.errors.push({ category, message });
    if (this.checkResults[category]) {
      this.checkResults[category].passed = false;
    }
  }

  addWarning(category, message) {
    this.warnings.push({ category, message });
  }

  addDetail(category, message) {
    if (this.checkResults[category]) {
      this.checkResults[category].details.push(message);
    }
  }

  async checkDirectoryExists(dir) {
    try {
      await fs.access(dir);
      return true;
    } catch {
      return false;
    }
  }

  async checkFileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async validateStructure() {
    console.log('\n📂 Validating project structure...');
    const requiredDirs = {
      config: ['config.js', 'constants.js'],
      controllers: [],
      models: ['index.js'],
      routes: ['index.js'],
      utils: ['logger.js'],
      services: [],
      middleware: [],
      validators: [],
      handlers: []
    };

    for (const [dir, requiredFiles] of Object.entries(requiredDirs)) {
      const dirPath = path.join(this.basePath, dir);
      if (await this.checkDirectoryExists(dirPath)) {
        this.addDetail('structure', `✓ ${dir} directory exists`);
        
        for (const file of requiredFiles) {
          const filePath = path.join(dirPath, file);
          if (await this.checkFileExists(filePath)) {
            this.addDetail('structure', `  ✓ ${file} present`);
          } else {
            this.addError('structure', `Required file missing: ${dir}/${file}`);
          }
        }
      } else {
        this.addError('structure', `Required directory missing: ${dir}`);
      }
    }

    this.checkResults.structure.passed = this.errors.filter(e => e.category === 'structure').length === 0;
  }

  async validateModels() {
    console.log('\n🗃️ Validating models...');
    const modelsDir = path.join(this.basePath, 'models');
    
    try {
      const files = await fs.readdir(modelsDir);
      const modelFiles = files.filter(f => f.endsWith('.js') && f !== 'index.js');
      
      for (const file of modelFiles) {
        try {
          const modelPath = path.join(modelsDir, file);
          if (fsSync.existsSync(modelPath)) {
            this.addDetail('models', `✓ ${file} exists`);
          }
        } catch (error) {
          this.addError('models', `Error validating model ${file}: ${error.message}`);
        }
      }
    } catch (error) {
      this.addError('models', `Model directory error: ${error.message}`);
    }

    this.checkResults.models.passed = this.errors.filter(e => e.category === 'models').length === 0;
  }

  async validateControllers() {
    console.log('\n🎮 Validating controllers...');
    const controllersDir = path.join(this.basePath, 'controllers');
    
    try {
      const files = await fs.readdir(controllersDir);
      const controllerFiles = files.filter(f => f.endsWith('.js') && f !== 'index.js');
      
      for (const file of controllerFiles) {
        try {
          const controllerPath = path.join(controllersDir, file);
          if (fsSync.existsSync(controllerPath)) {
            this.addDetail('controllers', `✓ ${file} exists`);
          }
        } catch (error) {
          this.addError('controllers', `Error validating controller ${file}: ${error.message}`);
        }
      }
    } catch (error) {
      this.addError('controllers', `Controller directory error: ${error.message}`);
    }

    this.checkResults.controllers.passed = this.errors.filter(e => e.category === 'controllers').length === 0;
  }

  async validateRoutes() {
    console.log('\n🛣️ Validating routes...');
    const routesDir = path.join(this.basePath, 'routes');
    
    try {
      const files = await fs.readdir(routesDir);
      const routeFiles = files.filter(f => f.endsWith('.js') && f !== 'index.js');
      
      for (const file of routeFiles) {
        try {
          const routePath = path.join(routesDir, file);
          if (fsSync.existsSync(routePath)) {
            this.addDetail('routes', `✓ ${file} exists`);
            
            // Check corresponding controller
            const controllerName = file.replace('Routes.js', 'Controller.js');
            const controllerPath = path.join(this.basePath, 'controllers', controllerName);
            if (!fsSync.existsSync(controllerPath)) {
              this.addWarning('routes', `Route ${file} missing corresponding controller: ${controllerName}`);
            }

            // Check corresponding service
            const serviceName = file.replace('Routes.js', 'Service.js');
            const servicePath = path.join(this.basePath, 'services', serviceName);
            if (!fsSync.existsSync(servicePath)) {
              this.addWarning('routes', `Route ${file} missing corresponding service: ${serviceName}`);
            }

            // Special cases for specific routes
            switch(file) {
              case 'authRoutes.js':
                await this.validateAuthDependencies();
                break;
              case 'paymentRoutes.js':
                await this.validatePaymentDependencies();
                break;
              // Add more special cases as needed
            }
          }
        } catch (error) {
          this.addError('routes', `Error validating route ${file}: ${error.message}`);
        }
      }
    } catch (error) {
      this.addError('routes', `Route directory error: ${error.message}`);
    }

    this.checkResults.routes.passed = this.errors.filter(e => e.category === 'routes').length === 0;
  }

  async validateAuthDependencies() {
    console.log('\n🔍 Validating auth-specific dependencies...');
    // Check auth-specific dependencies
    const requiredServices = [
      'authService.js',
      'tokenService.js',
      'emailService.js'  // For verification emails
    ];

    for (const service of requiredServices) {
      const servicePath = path.join(this.basePath, 'services', service);
      if (!fsSync.existsSync(servicePath)) {
        this.addWarning('routes', `Auth routes missing required service: ${service}`);
      }
    }
  }

  async validatePaymentDependencies() {
    console.log('\n🔍 Validating payment-specific dependencies...');
    // Check payment-specific dependencies
    const requiredServices = [
      'paymentService.js',
      'transactionLogger.js',
      'notificationService.js'  // For payment notifications
    ];

    for (const service of requiredServices) {
      const servicePath = path.join(this.basePath, 'services', service);
      if (!fsSync.existsSync(servicePath)) {
        this.addWarning('routes', `Payment routes missing required service: ${service}`);
      }
    }
  }

  async validateServices() {
    console.log('\n⚙️ Validating services...');
    const servicesDir = path.join(this.basePath, 'services');
    
    try {
      const files = await fs.readdir(servicesDir);
      const serviceFiles = files.filter(f => f.endsWith('.js') && f !== 'index.js');
      
      for (const file of serviceFiles) {
        try {
          const servicePath = path.join(servicesDir, file);
          if (fsSync.existsSync(servicePath)) {
            this.addDetail('services', `✓ ${file} exists`);
          }
        } catch (error) {
          this.addError('services', `Error validating service ${file}: ${error.message}`);
        }
      }
    } catch (error) {
      this.addError('services', `Service directory error: ${error.message}`);
    }

    this.checkResults.services.passed = this.errors.filter(e => e.category === 'services').length === 0;
  }

  async validateSecurity() {
    console.log('\n🔒 Validating security...');
    try {
      // Check security middleware
      const securityPath = path.join(this.basePath, 'middleware', 'security.js');
      if (fsSync.existsSync(securityPath)) {
        this.addDetail('security', '✓ Security middleware exists');
      } else {
        this.addError('security', 'Missing security middleware');
      }

      // Check .env file
      if (fsSync.existsSync(path.join(process.cwd(), '.env'))) {
        this.addDetail('security', '✓ Environment file exists');
      } else {
        this.addError('security', 'Missing .env file');
      }

      // Check required environment variables
      const requiredEnvVars = ['JWT_SECRET', 'JWT_EXPIRES_IN', 'DATABASE_URL'];
      for (const envVar of requiredEnvVars) {
        if (process.env[envVar]) {
          this.addDetail('security', `✓ ${envVar} is configured`);
        } else {
          this.addError('security', `Missing environment variable: ${envVar}`);
        }
      }
    } catch (error) {
      this.addError('security', `Security validation error: ${error.message}`);
    }

    this.checkResults.security.passed = this.errors.filter(e => e.category === 'security').length === 0;
  }

  async validateMiddleware() {
    console.log('\n🔗 Validating middleware...');
    const middlewareDir = path.join(this.basePath, 'middleware');
    
    const requiredMiddleware = {
      'authMiddleware.js': ['validateToken', 'requireAuth'],
      'errorHandler.js': ['handleError'],
      'security.js': ['setupSecurity'],
      'requestLogger.js': ['logRequest']
    };

    try {
      const files = await fs.readdir(middlewareDir);
      const middlewareFiles = files.filter(f => f.endsWith('.js') && f !== 'index.js');
      
      for (const file of middlewareFiles) {
        try {
          const middlewarePath = path.join(middlewareDir, file);
          if (fsSync.existsSync(middlewarePath)) {
            this.addDetail('middleware', `✓ ${file} exists`);
            
            // Check required middleware functions if it's a required middleware
            if (requiredMiddleware[file]) {
              try {
                const middleware = require(middlewarePath);
                requiredMiddleware[file].forEach(funcName => {
                  if (typeof middleware[funcName] === 'function') {
                    this.addDetail('middleware', `  ✓ ${funcName} function present in ${file}`);
                  } else {
                    this.addWarning('middleware', `Missing required function ${funcName} in ${file}`);
                  }
                });
              } catch (error) {
                this.addWarning('middleware', `Could not validate functions in ${file}: ${error.message}`);
              }
            }
          }
        } catch (error) {
          this.addError('middleware', `Error validating middleware ${file}: ${error.message}`);
        }
      }
    } catch (error) {
      this.addError('middleware', `Middleware directory error: ${error.message}`);
    }

    this.checkResults.middleware.passed = this.errors.filter(e => e.category === 'middleware').length === 0;
  }

  async validateValidators() {
    console.log('\n✔️ Validating validators...');
    const validatorsDir = path.join(this.basePath, 'validators');
    
    try {
      const files = await fs.readdir(validatorsDir);
      const validatorFiles = files.filter(f => f.endsWith('.js') && f !== 'index.js');
      
      for (const file of validatorFiles) {
        try {
          const validatorPath = path.join(validatorsDir, file);
          if (fsSync.existsSync(validatorPath)) {
            this.addDetail('validators', `✓ ${file} exists`);
            
            // Check corresponding route and controller
            const baseName = file.replace('Validators.js', '');
            const routeName = `${baseName}Routes.js`;
            const controllerName = `${baseName}Controller.js`;
            
            const routePath = path.join(this.basePath, 'routes', routeName);
            const controllerPath = path.join(this.basePath, 'controllers', controllerName);
            
            if (!fsSync.existsSync(routePath)) {
              this.addWarning('validators', `Validator ${file} missing corresponding route: ${routeName}`);
            }
            if (!fsSync.existsSync(controllerPath)) {
              this.addWarning('validators', `Validator ${file} missing corresponding controller: ${controllerName}`);
            }

            // Check validator functions
            try {
              const validator = require(validatorPath);
              if (Object.keys(validator).length === 0) {
                this.addWarning('validators', `Empty validator in ${file}`);
              }
            } catch (error) {
              this.addWarning('validators', `Could not validate functions in ${file}: ${error.message}`);
            }
          }
        } catch (error) {
          this.addError('validators', `Error validating validator ${file}: ${error.message}`);
        }
      }
    } catch (error) {
      this.addError('validators', `Validators directory error: ${error.message}`);
    }

    this.checkResults.validators.passed = this.errors.filter(e => e.category === 'validators').length === 0;
  }

  async validateHandlers() {
    console.log('\n🎯 Validating handlers...');
    const handlersDir = path.join(this.basePath, 'handlers');
    
    const expectedHandlers = {
      'adminHandlers.js': ['handleAdminEvents'],
      'customerHandlers.js': ['handleCustomerEvents'],
      'driverHandlers.js': ['handleDriverEvents'],
      'merchantHandlers.js': ['handleMerchantEvents'],
      'staffHandlers.js': ['handleStaffEvents']
    };

    try {
      const files = await fs.readdir(handlersDir);
      const handlerFiles = files.filter(f => f.endsWith('.js') && f !== 'index.js');
      
      for (const file of handlerFiles) {
        try {
          const handlerPath = path.join(handlersDir, file);
          if (fsSync.existsSync(handlerPath)) {
            this.addDetail('handlers', `✓ ${file} exists`);
            
            // Check expected handler functions
            if (expectedHandlers[file]) {
              try {
                const handler = require(handlerPath);
                expectedHandlers[file].forEach(funcName => {
                  if (typeof handler[funcName] === 'function') {
                    this.addDetail('handlers', `  ✓ ${funcName} function present in ${file}`);
                  } else {
                    this.addWarning('handlers', `Missing expected function ${funcName} in ${file}`);
                  }
                });
              } catch (error) {
                this.addWarning('handlers', `Could not validate functions in ${file}: ${error.message}`);
              }
            }

            // Check corresponding service if it exists
            const serviceName = file.replace('Handlers.js', 'Service.js');
            const servicePath = path.join(this.basePath, 'services', serviceName);
            if (!fsSync.existsSync(servicePath)) {
              this.addWarning('handlers', `Handler ${file} might need corresponding service: ${serviceName}`);
            }
          }
        } catch (error) {
          this.addError('handlers', `Error validating handler ${file}: ${error.message}`);
        }
      }
    } catch (error) {
      this.addError('handlers', `Handlers directory error: ${error.message}`);
    }

    this.checkResults.handlers.passed = this.errors.filter(e => e.category === 'handlers').length === 0;
  }

  async validateDatabase() {
    console.log('\n💾 Validating database configuration...');
    try {
      const configPath = path.join(this.basePath, 'config', 'config.js');
      if (!fsSync.existsSync(configPath)) {
        this.addError('database', 'Database configuration file missing');
        return;
      }

      const dbConfig = require(configPath);
      const env = process.env.NODE_ENV || 'development';
      
      // Validate database configuration
      const requiredFields = ['username', 'password', 'database', 'host', 'dialect'];
      requiredFields.forEach(field => {
        if (dbConfig[env] && dbConfig[env][field]) {
          this.addDetail('database', `✓ Database ${field} configured`);
        } else {
          this.addError('database', `Missing database config: ${field}`);
        }
      });

      // Validate connection pools
      if (dbConfig[env].pool) {
        const poolConfig = dbConfig[env].pool;
        this.addDetail('database', '✓ Connection pool configured');
        if (poolConfig.max) this.addDetail('database', `  ✓ Max pool size: ${poolConfig.max}`);
        if (poolConfig.min) this.addDetail('database', `  ✓ Min pool size: ${poolConfig.min}`);
        if (poolConfig.idle) this.addDetail('database', `  ✓ Idle timeout: ${poolConfig.idle}ms`);
      } else {
        this.addWarning('database', 'No connection pool configuration found');
      }

      // Validate required models and their relationships
      const models = require(path.join(this.basePath, 'models'));
      const requiredRelationships = {
        'User': ['Role', 'Customer', 'Merchant', 'Staff', 'Driver'],
        'Order': ['Customer', 'Driver', 'Merchant'],
        'Payment': ['Order', 'Customer']
      };

      Object.entries(requiredRelationships).forEach(([model, relations]) => {
        if (models[model]) {
          this.addDetail('database', `✓ ${model} model exists`);
          relations.forEach(relation => {
            if (models[model].associations[relation]) {
              this.addDetail('database', `  ✓ ${model} -> ${relation} relationship exists`);
            } else {
              this.addWarning('database', `Missing relationship: ${model} -> ${relation}`);
            }
          });
        }
      });

    } catch (error) {
      this.addError('database', `Database validation error: ${error.message}`);
    }
  }

  async validateMigrations() {
    console.log('\n🔄 Validating migrations...');
    const migrationsDir = path.join(process.cwd(), 'migrations');
    
    try {
      const files = await fs.readdir(migrationsDir);
      const migrationFiles = files.filter(f => f.endsWith('.js'));
      
      // Check migration naming convention
      const migrationRegex = /^\d{14}-[a-z-]+\.js$/;
      migrationFiles.forEach(file => {
        if (migrationRegex.test(file)) {
          this.addDetail('migrations', `✓ Valid migration file: ${file}`);
        } else {
          this.addWarning('migrations', `Migration file doesn't follow naming convention: ${file}`);
        }
      });

      // Check for timestamp conflicts
      const timestamps = migrationFiles.map(f => f.slice(0, 14));
      const duplicates = timestamps.filter((t, i) => timestamps.indexOf(t) !== i);
      if (duplicates.length > 0) {
        this.addError('migrations', `Duplicate migration timestamps found: ${duplicates.join(', ')}`);
      }

      // Validate migration up/down methods
      for (const file of migrationFiles) {
        try {
          const migration = require(path.join(migrationsDir, file));
          if (typeof migration.up === 'function') {
            this.addDetail('migrations', `  ✓ ${file} has up() method`);
          } else {
            this.addWarning('migrations', `${file} missing up() method`);
          }
          if (typeof migration.down === 'function') {
            this.addDetail('migrations', `  ✓ ${file} has down() method`);
          } else {
            this.addWarning('migrations', `${file} missing down() method`);
          }
        } catch (error) {
          this.addWarning('migrations', `Could not validate migration ${file}: ${error.message}`);
        }
      }

    } catch (error) {
      this.addError('migrations', `Migrations validation error: ${error.message}`);
    }
  }

  async validateIntegrations() {
    console.log('\n🔌 Validating integrations...');
    
    // Required external services
const requiredIntegrations = {
  'Google Maps': {
    envVars: ['GOOGLE_MAPS_API_KEY'],
    files: ['src/services/geoLocation/locationDetectionService.js']
  },
  'Twilio': {
    envVars: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_WHATSAPP_NUMBER'],
    files: ['src/services/whatsappService.js']
  },
  'SMS': {
    envVars: ['SMS_API_KEY', 'SMS_SENDER_ID'],
    files: ['src/services/smsService.js']
  },
  'Email': {
    envVars: ['EMAIL_SERVICE', 'EMAIL_USER', 'EMAIL_PASS'],
    files: ['src/services/emailService.js']
  },
  'Redis': {
    envVars: ['REDIS_URL'],
    files: ['src/config/redis.js']
  }
};


    for (const [integration, config] of Object.entries(requiredIntegrations)) {
      let isConfigured = true;
      
      // Check environment variables
      config.envVars.forEach(envVar => {
        if (process.env[envVar]) {
          this.addDetail('integrations', `✓ ${integration}: ${envVar} configured`);
        } else {
          isConfigured = false;
          this.addWarning('integrations', `${integration}: Missing ${envVar}`);
        }
      });

      // Check required files
      config.files.forEach(file => {
        const filePath = path.join(process.cwd(), file);
        if (fsSync.existsSync(filePath)) {
          this.addDetail('integrations', `✓ ${integration}: ${path.basename(file)} exists`);
        } else {
          isConfigured = false;
          this.addWarning('integrations', `${integration}: Missing ${file}`);
        }
      });

      if (isConfigured) {
        this.addDetail('integrations', `✓ ${integration} integration fully configured`);
      }
    }
  }

  async validateAll() {
    try {
      await this.validateStructure();
      await this.validateModels();
      await this.validateControllers();
      await this.validateRoutes();
      await this.validateServices();
      await this.validateSecurity();
      await this.validateMiddleware();
      await this.validateValidators();
      await this.validateHandlers();
      await this.validateDatabase();
      await this.validateMigrations();
      await this.validateIntegrations();
      
      return this.displayResults();
    } catch (error) {
      logger.error('Validation process error:', error);
      this.addError('system', `Validation process error: ${error.message}`);
      return this.displayResults();
    }
  }

  displayResults() {
    console.log('\n📊 Validation Results:');
    
    for (const [category, result] of Object.entries(this.checkResults)) {
      console.log(`\n${category.toUpperCase()}:`);
      if (result.details.length > 0) {
        result.details.forEach(detail => console.log(detail));
      }
    }

    if (this.errors.length > 0) {
      console.log('\n❌ Validation Errors:');
      this.errors.forEach((error, index) => {
        console.log(`${index + 1}. [${error.category}] ${error.message}`);
      });
      return false;
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️ Warnings:');
      this.warnings.forEach((warning, index) => {
        console.log(`${index + 1}. [${warning.category}] ${warning.message}`);
      });
    }

    console.log('\n✅ All validations passed successfully!\n');
    return true;
  }
}

module.exports = new StartupValidator();
