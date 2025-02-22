// scripts/validateStartup.js
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const { logger } = require('../src/utils/logger');
const madge = require('madge');
const glob = require('glob');
const colors = require('colors/safe');
const { ESLint } = require('eslint');

class StartupValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.basePath = path.join(process.cwd(), 'src');
    this.checkResults = {
      syntax: { passed: false, details: [] },
    structure: { passed: false, details: [] },
    dependencies: { passed: false, details: [] },
    modules: { passed: false, details: [] },
    routes: { passed: false, details: [] },
    services: { passed: false, details: [] },
    security: { passed: false, details: [] },
    middleware: { passed: false, details: [] },
    merchants: { passed: false, details: [] },
    models: { passed: false, details: [] },      // Added this
    controllers: { passed: false, details: [] }, // Add all categories
    validators: { passed: false, details: [] },
    handlers: { passed: false, details: [] },
    database: { passed: false, details: [] },
    migrations: { passed: false, details: [] },
    integrations: { passed: false, details: [] },
    merchant_profile: { passed: false, details: [] }
    };
  }

  addError(category, message) {
    this.errors.push({ category, message, timestamp: new Date().toISOString() });
    if (this.checkResults[category]) {
      this.checkResults[category].passed = false;
    }
    logger.error(`[${category}] ${message}`);
  }

  addWarning(category, message) {
    this.warnings.push({ category, message, timestamp: new Date().toISOString() });
    logger.warn(`[${category}] ${message}`);
  }

  addDetail(category, message) {
    if (this.checkResults[category]) {
      this.checkResults[category].details.push(message);
    }
  }

  async checkDirectoryExists(dirPath) {
    try {
      await fs.access(dirPath);
      return true;
    } catch (error) {
      return false;
    }
  }

  async checkFileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch (error) {
      return false;
    }
  }

  async validateSyntax() {
    console.log('\n🔍 Validating syntax consistency...');
    const eslint = new ESLint();

    try {
      const files = glob.sync('src/**/*.js', { cwd: process.cwd() });
      const results = await eslint.lintFiles(files);

      let hasErrors = false;
      let hasWarnings = false;

      results.forEach(result => {
        const relativePath = path.relative(process.cwd(), result.filePath);

        if (result.errorCount > 0) {
          hasErrors = true;
          result.messages
            .filter(msg => msg.severity === 2)
            .forEach(msg => {
              this.addError('syntax', `${relativePath}:${msg.line} - ${msg.message}`);
            });
        }

        if (result.warningCount > 0) {
          hasWarnings = true;
          result.messages
            .filter(msg => msg.severity === 1)
            .forEach(msg => {
              this.addWarning('syntax', `${relativePath}:${msg.line} - ${msg.message}`);
            });
        }
      });

      if (!hasErrors && !hasWarnings) {
        this.addDetail('syntax', '✓ All files pass ESLint validation');
        this.checkResults.syntax.passed = true;
      }
    } catch (error) {
      this.addError('syntax', `ESLint validation failed: ${error.message}`);
    }
  }

  async validateCircularDependencies() {
    console.log('\n🔄 Checking for circular dependencies...');
    
    try {
      const madgeInstance = await madge(this.basePath, {
        fileExtensions: ['js'],
        excludeRegExp: [/node_modules/]
      });

      const circular = madgeInstance.circular();
      
      if (circular.length > 0) {
        circular.forEach(circle => {
          this.addError('dependencies', `Circular dependency detected: ${circle.join(' -> ')}`);
        });
      } else {
        this.addDetail('dependencies', '✓ No circular dependencies found');
        this.checkResults.dependencies.passed = true;
      }
    } catch (error) {
      this.addError('dependencies', `Circular dependency check failed: ${error.message}`);
    }
  }

  async validateModuleConsistency() {
    console.log('\n📦 Validating module consistency...');
    
    const files = glob.sync('src/**/*.js', { cwd: process.cwd() });
    let hasInconsistencies = false;

    for (const file of files) {
      const content = await fs.readFile(path.join(process.cwd(), file), 'utf8');
      
      if (content.includes('import ') || content.includes('export ')) {
        hasInconsistencies = true;
        this.addError('modules', `ES6 module syntax found in ${file} - Project uses CommonJS`);
      }
    }

    if (!hasInconsistencies) {
      this.addDetail('modules', '✓ All files use consistent CommonJS syntax');
      this.checkResults.modules.passed = true;
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
      try {
        const dirExists = await this.checkDirectoryExists(dirPath);
        if (dirExists) {
          this.addDetail('structure', `✓ ${dir} directory exists`);
          
          for (const file of requiredFiles) {
            const filePath = path.join(dirPath, file);
            const fileExists = await this.checkFileExists(filePath);
            if (fileExists) {
              this.addDetail('structure', `  ✓ ${file} present`);
            } else {
              this.addError('structure', `Required file missing: ${dir}/${file}`);
            }
          }
        } else {
          this.addError('structure', `Required directory missing: ${dir}`);
        }
      } catch (error) {
        this.addError('structure', `Error checking directory ${dir}: ${error.message}`);
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

  // New method: Validate Merchant Profile Components
  async validateMerchantProfileComponents() {
    console.log('\n🏪 Validating Merchant Profile Components...');

    // Required merchant profile files structure
    const merchantProfileComponents = {
      controllers: {
        base: 'src/controllers/merchantControllers/profileControllers',
        required: [
          'activityController.js',
          'addressController.js',
          'bannerController.js',
          'businessTypeController.js',
          'draftController.js',
          'getProfileController.js',
          'imageController.js',
          'merchant2FAController.js',
          'passwordController.js',
          'performanceMetricsController.js',
          'previewController.js',
          'profileAnalyticsController.js',
          'profileController.js'
        ]
      },
      services: {
        base: 'src/services/merchantServices/profileServices',
        required: [
          'activityLogService.js',
          'bannerService.js',
          'businessTypeService.js',
          'draftService.js',
          'getProfileService.js',
          'imageService.js',
          'mapsService.js',
          'merchant2FAService.js',
          'merchantPasswordService.js',
          'performanceMetricsService.js',
          'previewService.js',
          'profileAnalyticsService.js',
          'profileService.js'
        ]
      },
      routes: {
        base: 'src/routes/merchantRoutes/profileRoutes',
        required: [
          'activityRoutes.js',
          'addressRoutes.js',
          'bannerRoutes.js',
          'businessTypeRoutes.js',
          'draftRoutes.js',
          'getProfileRoute.js',
          'imageRoutes.js',
          'merchant2FARoutes.js',
          'passwordRoutes.js',
          'merchantMetricsRoutes.js',
          'previewRoutes.js',
          'profileAnalyticsRoutes.js',
          'profileRoutes.js',
          'index.js'
        ]
      },
      handlers: {
        base: 'src/handlers/merchantHandlers/profileHandlers',
        required: [
          'activityHandlers.js',
          'bannerHandlers.js',
          'businessTypeHandlers.js',
          'draftHandlers.js',
          'getProfileHandler.js',
          'imageUploadHandler.js',
          'merchant2FAHandler.js',
          'passwordHandler.js',
          'performanceMetricsHandler.js',
          'previewHandlers.js',
          'profileAnalyticsHandler.js',
          'profileHandlers.js'
        ]
      },
      validators: {
        base: 'src/validators/merchantValidators/profileValidators',
        required: [
          'activityValidator.js',
          'addressValidator.js',
          'bannerValidator.js',
          'businessTypeValidator.js',
          'draftValidator.js',
          'getProfileValidator.js',
          'imageValidator.js',
          'merchant2FAValidator.js',
          'passwordValidator.js',
          'performanceMetricsValidator.js',
          'previewValidator.js',
          'profileAnalyticsValidator.js',
          'profileValidator.js'
        ]
      }
    };

    // Validate each component type
    for (const [type, config] of Object.entries(merchantProfileComponents)) {
      console.log(`\n📂 Checking ${type}...`);
      
      // Check base directory exists
      const baseDir = path.join(process.cwd(), config.base);
      if (!fsSync.existsSync(baseDir)) {
        this.addError('merchant_profile', `Missing directory: ${config.base}`);
        continue;
      }

      // Check each required file
      for (const file of config.required) {
        const filePath = path.join(baseDir, file);
        if (fsSync.existsSync(filePath)) {
          this.addDetail('merchant_profile', `✓ ${type}/${file} exists`);
          
          // Validate file exports
          try {
            const module = require(filePath);
            if (!module) {
              this.addWarning('merchant_profile', `Empty module: ${type}/${file}`);
            } else {
              if (type === 'services' && typeof module === 'object') {
                this.validateServiceMethods(file, module);
              }
              if (type === 'handlers' && typeof module === 'object') {
                this.validateHandlerMethods(file, module);
              }
            }
          } catch (error) {
            this.addError('merchant_profile', `Error loading ${type}/${file}: ${error.message}`);
          }
        } else {
          this.addError('merchant_profile', `Missing file: ${type}/${file}`);
        }
      }
    }

    // Validate route index file components
    const routeIndex = path.join(process.cwd(), 'src/routes/merchantRoutes/profileRoutes/index.js');
    if (fsSync.existsSync(routeIndex)) {
      try {
        const routeModule = require(routeIndex);
        const expectedRoutes = [
          'activity', 'address', 'banner', 'business-type', 'drafts', 
          'profile', 'image', '2fa', 'password', 'metrics', 
          'preview', 'analytics', 'details'
        ];
        
        expectedRoutes.forEach(route => {
          if (routeModule.stack?.some(layer => layer.regexp.test('/' + route))) {
            this.addDetail('merchant_profile', `✓ Route mounted: ${route}`);
          } else {
            this.addWarning('merchant_profile', `Route not found in index: ${route}`);
          }
        });
      } catch (error) {
        this.addError('merchant_profile', `Error validating route index: ${error.message}`);
      }
    }

    // Validate socket event handlers
    const eventConfig = path.join(process.cwd(), 'src/config/events.js');
    if (fsSync.existsSync(eventConfig)) {
      try {
        const events = require(eventConfig);
        const requiredEvents = [
          'merchant.profile.updated',
          'merchant.activity.logged',
          'merchant.2fa.status_changed',
          'merchant.banner.updated',
          'merchant.metrics.updated',
          'merchant.draft.submitted'
        ];

        requiredEvents.forEach(event => {
          if (events[event]) {
            this.addDetail('merchant_profile', `✓ Event configured: ${event}`);
          } else {
            this.addWarning('merchant_profile', `Missing event configuration: ${event}`);
          }
        });
      } catch (error) {
        this.addError('merchant_profile', `Error validating events: ${error.message}`);
      }
    }

    this.checkResults.merchant_profile = {
      passed: this.errors.filter(e => e.category === 'merchant_profile').length === 0,
      details: []
    };
  }

  validateServiceMethods(serviceName, module) {
    const expectedMethods = {
      'activityLogService.js': ['logProfileActivity', 'getProfileActivity'],
      'bannerService.js': ['addBanner', 'updateBanner', 'deleteBanner', 'getActiveBanners'],
      'merchant2FAService.js': ['setup2FA', 'enable2FA', 'verify2FA', 'disable2FA'],
      'merchantPasswordService.js': ['changePassword', 'getPasswordHistory', 'getPasswordStrength'],
      // Add more service method validations
    };

    if (expectedMethods[serviceName]) {
      expectedMethods[serviceName].forEach(method => {
        if (typeof module[method] === 'function') {
          this.addDetail('merchant_profile', `  ✓ Service method found: ${method}`);
        } else {
          this.addWarning('merchant_profile', `Missing expected method in ${serviceName}: ${method}`);
        }
      });
    } 
  }

  validateHandlerMethods(handlerName, module) {
    const expectedMethods = {
      'activityHandlers.js': ['handleActivityStream'],
      'bannerHandlers.js': ['handleBannerUpdates'],
      'merchant2FAHandler.js': ['handleSetup2FA', 'handleEnable2FA', 'handleVerify2FA'],
      // Add more handler method validations
    };

    if (expectedMethods[handlerName]) {
      expectedMethods[handlerName].forEach(method => {
        if (typeof module[method] === 'function') {
          this.addDetail('merchant_profile', `  ✓ Handler method found: ${method}`);
        } else {
          this.addWarning('merchant_profile', `Missing expected method in ${handlerName}: ${method}`);
        }
      });
    }
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

      if (isConfigured)  {
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
      await this.validateMerchantProfileComponents();
      
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