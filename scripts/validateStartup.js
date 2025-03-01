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
  constructor(configPath = path.join(__dirname, '.validation-config.json')) {
    this.errors = [];
    this.warnings = [];
    this.suggestions = [];
    this.basePath = path.join(process.cwd(), 'src');
    this.rootPath = process.cwd();
    this.config = this.loadConfig(configPath);
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
      controllers: { passed: false, details: [] },
      validators: { passed: false, details: [] },
      database: { passed: false, details: [] },
      migrations: { passed: false, details: [] },
      integrations: { passed: false, details: [] },
      merchant_profile: { passed: false, details: [] },
      service_controller_integrity: { passed: false, details: [] },
      authorization: { passed: false, details: [] },
      env_config: { passed: false, details: [] },
      security_checks: { passed: false, details: [] },
      socket_events: { passed: false, details: [] },
      api_responses: { passed: false, details: [] },
      performance: { passed: false, details: [] },
      logging_monitoring: { passed: false, details: [] },
      notifications: { passed: false, details: [] },
      service_model_terms: { passed: false, details: [] },
      model_summary: { passed: false, details: [] }
    };
  }

  loadConfig(configPath) {
    try {
      return fsSync.existsSync(configPath) ? require(configPath) : this.defaultConfig();
    } catch (error) {
      logger.error(`Failed to load config: ${error.message}`);
      return this.defaultConfig();
    }
  }

  defaultConfig() {
    return {
      requiredDirs: {
        config: ['config.js', 'constants.js', 'events.js', 'jwtConfig.js', 'socket.js'],
        controllers: [],
        routes: ['index.js'],
        utils: ['logger.js', 'AppError.js', 'catchAsync.js'],
        services: [],
        middleware: [],
        validators: [],
        models: ['index.js']
      },
      namingConventions: {
        controllers: /Controller\.js$/,
        services: /Service\.js$/,
        routes: /Routes\.js$/,
        validators: /Validators\.js$/,
        middleware: /\.js$/
      },
      requiredEnvVars: ['DATABASE_URL', 'JWT_SECRET', 'JWT_EXPIRES_IN', 'NODE_ENV'],
      requiredRootFiles: ['.env', 'app.js', 'server.js']
    };
  }

  addError({ category, message, filePath = '', lineNumber = '', severity = 'high', remediation = '' }) {
    this.errors.push({ category, message, filePath, lineNumber, severity, remediation, timestamp: new Date().toISOString() });
    if (this.checkResults[category]) this.checkResults[category].passed = false;
    logger.error(`[${category}] ${message} | File: ${filePath} | Line: ${lineNumber}`);
  }

  addWarning({ category, message, filePath = '', lineNumber = '', severity = 'medium', remediation = '' }) {
    this.warnings.push({ category, message, filePath, lineNumber, severity, remediation, timestamp: new Date().toISOString() });
    logger.warn(`[${category}] ${message} | File: ${filePath} | Line: ${lineNumber}`);
  }

  addSuggestion(category, message) {
    this.suggestions.push({ category, message });
    logger.info(`[${category}] Suggestion: ${message}`);
  }

  addDetail(category, message) {
    if (this.checkResults[category]) this.checkResults[category].details.push(message);
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
    const eslint = new ESLint({ useEslintrc: true });
    try {
      const files = glob.sync('src/**/*.js', { cwd: this.rootPath });
      const results = await eslint.lintFiles(files);
      let hasErrors = false;
      results.forEach(result => {
        const filePath = path.relative(this.rootPath, result.filePath);
        if (result.errorCount > 0) {
          hasErrors = true;
          result.messages
            .filter(msg => msg.severity === 2)
            .forEach(msg => this.addError({
              category: 'syntax',
              message: `Syntax error: ${msg.message}`,
              filePath,
              lineNumber: msg.line.toString(),
              severity: 'high',
              remediation: `Fix syntax issue at line ${msg.line}: ${msg.ruleId}`
            }));
        }
        if (result.warningCount > 0) {
          result.messages
            .filter(msg => msg.severity === 1)
            .forEach(msg => this.addWarning({
              category: 'syntax',
              message: `Potential issue: ${msg.message}`,
              filePath,
              lineNumber: msg.line.toString(),
              severity: 'low',
              remediation: `Review lint warning at line ${msg.line}: ${msg.ruleId}`
            }));
        }
      });
      if (!hasErrors) this.addDetail('syntax', '✓ All files pass ESLint validation');
      this.checkResults.syntax.passed = !hasErrors;
    } catch (error) {
      this.addError({ category: 'syntax', message: `ESLint failed: ${error.message}`, severity: 'critical', remediation: 'Check ESLint config' });
    }
  }

  async validateCircularDependencies() {
    console.log('\n🔄 Checking for circular dependencies...');
    try {
      const madgeInstance = await madge(this.basePath, { fileExtensions: ['js'], excludeRegExp: [/node_modules/] });
      const circular = madgeInstance.circular();
      if (circular.length > 0) {
        circular.forEach(circle => this.addError({
          category: 'dependencies',
          message: `Circular dependency detected: ${circle.join(' -> ')}`,
          severity: 'high',
          remediation: `Refactor to eliminate cycle starting at ${circle[0]}`
        }));
      } else {
        this.addDetail('dependencies', '✓ No circular dependencies found');
      }
      this.checkResults.dependencies.passed = circular.length === 0;
    } catch (error) {
      this.addError({ category: 'dependencies', message: `Check failed: ${error.message}`, severity: 'critical', remediation: 'Verify madge setup' });
    }
  }

  async validateModuleConsistency() {
    console.log('\n📦 Validating module consistency...');
    const files = glob.sync('src/**/*.js', { cwd: this.rootPath });
    for (const file of files) {
      const filePath = path.join(this.rootPath, file);
      const content = await fs.readFile(filePath, 'utf8');
      if (content.includes('import ') || content.includes('export ')) {
        this.addError({
          category: 'modules',
          message: `ES6 module syntax detected in CommonJS project`,
          filePath,
          severity: 'high',
          remediation: 'Convert to CommonJS (require/exports)'
        });
      }
    }
    this.checkResults.modules.passed = !this.errors.some(e => e.category === 'modules');
    if (this.checkResults.modules.passed) this.addDetail('modules', '✓ All files use CommonJS syntax');
  }

  async validateStructure() {
    console.log('\n📂 Validating project structure...');
    for (const file of this.config.requiredRootFiles) {
      const filePath = path.join(this.rootPath, file);
      if (!(await this.checkFileExists(filePath))) {
        this.addError({ category: 'structure', message: `Missing root file: ${file}`, filePath, severity: 'critical', remediation: `Create ${file}` });
      } else {
        this.addDetail('structure', `✓ Root file ${file} exists`);
      }
    }
    for (const [dir, requiredFiles] of Object.entries(this.config.requiredDirs)) {
      const dirPath = path.join(this.basePath, dir);
      if (!(await this.checkDirectoryExists(dirPath))) {
        this.addError({ category: 'structure', message: `Missing directory: ${dir}`, filePath: dirPath, severity: 'high', remediation: `Create ${dir}` });
      } else {
        this.addDetail('structure', `✓ ${dir} directory exists`);
        for (const file of requiredFiles) {
          const filePath = path.join(dirPath, file);
          if (!(await this.checkFileExists(filePath))) {
            this.addError({ category: 'structure', message: `Missing file in ${dir}: ${file}`, filePath, severity: 'medium', remediation: `Create ${file}` });
          } else {
            this.addDetail('structure', `  ✓ ${file} present`);
          }
        }
      }
    }
    this.checkResults.structure.passed = !this.errors.some(e => e.category === 'structure');
  }

  async validateComponent(category, dir, regex, requiredPairs = {}) {
    console.log(`\n🔍 Validating ${category}...`);
    const dirPath = path.join(this.basePath, dir);
    try {
      const files = await fs.readdir(dirPath);
      const componentFiles = files.filter(f => f.endsWith('.js') && f !== 'index.js');
      for (const file of componentFiles) {
        const filePath = path.join(dirPath, file);
        if (!regex.test(file)) {
          this.addWarning({ category, message: `Invalid naming: ${file}`, filePath, severity: 'low', remediation: `Rename to match ${regex.source}` });
        }
        if (fsSync.existsSync(filePath)) {
          this.addDetail(category, `✓ ${file} exists`);
          const content = await fs.readFile(filePath, 'utf8');
          this.checkComponentHealth(category, file, filePath, content, requiredPairs);
        }
      }
      this.checkResults[category].passed = !this.errors.some(e => e.category === category);
    } catch (error) {
      this.addError({ category, message: `Directory error: ${error.message}`, filePath: dirPath, severity: 'critical', remediation: 'Check permissions' });
    }
  }

  async checkComponentHealth(category, file, filePath, content, requiredPairs) {
    if (!content.includes('try') && !content.includes('.catch(')) {
      this.addWarning({ category, message: `No error handling`, filePath, severity: 'medium', remediation: `Add try/catch or .catch() in ${file}` });
    }
    if (!content.includes('logger.')) {
      this.addWarning({ category, message: `No logging`, filePath, severity: 'low', remediation: `Add logger calls in ${file}` });
    }
    const baseName = file.replace(this.config.namingConventions[category], '');
    for (const [pairCat, pairRegex] of Object.entries(requiredPairs)) {
      const pairName = `${baseName}${pairRegex.source}`;
      const pairPath = path.join(this.basePath, pairCat, pairName);
      if (!fsSync.existsSync(pairPath)) {
        this.addWarning({ category, message: `Missing ${pairCat}: ${pairName}`, filePath, severity: 'medium', remediation: `Create ${pairName}` });
      }
    }
  }

  async validateControllers() {
    await this.validateComponent('controllers', 'controllers', this.config.namingConventions.controllers, {
      routes: this.config.namingConventions.routes,
      services: this.config.namingConventions.services
    });
  }

  async validateRoutes() {
    await this.validateComponent('routes', 'routes', this.config.namingConventions.routes, {
      controllers: this.config.namingConventions.controllers,
      validators: this.config.namingConventions.validators
    });
    await this.validateRouteDependencies();
  }

  async validateRouteDependencies() {
    const routesDir = path.join(this.basePath, 'routes');
    try {
      const files = await fs.readdir(routesDir);
      for (const file of files.filter(f => f.endsWith('.js') && f !== 'index.js')) {
        if (file === 'authRoutes.js') await this.validateAuthDependencies();
        if (file === 'paymentRoutes.js') await this.validatePaymentDependencies();
      }
    } catch (error) {
      this.addError({ category: 'routes', message: `Dependency check failed: ${error.message}`, filePath: routesDir, severity: 'high', remediation: 'Check routes dir' });
    }
  }

  async validateAuthDependencies() {
    console.log('\n🔍 Validating auth-specific dependencies...');
    const requiredServices = ['authService.js', 'tokenService.js', 'emailService.js'];
    for (const service of requiredServices) {
      const servicePath = path.join(this.basePath, 'services', service);
      if (!fsSync.existsSync(servicePath)) {
        this.addWarning({ category: 'routes', message: `Auth missing: ${service}`, filePath: servicePath, severity: 'medium', remediation: `Create ${service}` });
      }
    }
  }

  async validatePaymentDependencies() {
    console.log('\n🔍 Validating payment-specific dependencies...');
    const requiredServices = ['paymentService.js', 'transactionLogger.js', 'notificationService.js'];
    for (const service of requiredServices) {
      const servicePath = path.join(this.basePath, 'services', service);
      if (!fsSync.existsSync(servicePath)) {
        this.addWarning({ category: 'routes', message: `Payment missing: ${service}`, filePath: servicePath, severity: 'medium', remediation: `Create ${service}` });
      }
    }
  }

  async validateServices() {
    await this.validateComponent('services', 'services', this.config.namingConventions.services, {
      controllers: this.config.namingConventions.controllers
    });
  }

  async validateSecurity() {
    console.log('\n🔒 Validating security...');
    const securityPath = path.join(this.basePath, 'middleware', 'security.js');
    if (!fsSync.existsSync(securityPath)) {
      this.addError({ category: 'security', message: 'Missing security middleware', filePath: securityPath, severity: 'high', remediation: 'Create security.js' });
    } else {
      this.addDetail('security', '✓ Security middleware exists');
    }
    const envPath = path.join(this.rootPath, '.env');
    if (!fsSync.existsSync(envPath)) {
      this.addError({ category: 'security', message: 'Missing .env', filePath: envPath, severity: 'critical', remediation: 'Create .env file' });
    } else {
      this.addDetail('security', '✓ .env exists');
    }
    this.config.requiredEnvVars.forEach(envVar => {
      if (!process.env[envVar]) this.addError({ category: 'security', message: `Missing env var: ${envVar}`, filePath: envPath, severity: 'high', remediation: `Add ${envVar}` });
      else this.addDetail('security', `✓ ${envVar} configured`);
    });
    this.checkResults.security.passed = !this.errors.some(e => e.category === 'security');
  }

  async validateMiddleware() {
    console.log('\n🔗 Validating middleware...');
    const requiredMiddleware = { 'authMiddleware.js': ['validateToken'], 'errorHandler.js': ['handleError'], 'security.js': ['setupSecurity'] };
    const middlewareDir = path.join(this.basePath, 'middleware');
    try {
      const files = await fs.readdir(middlewareDir);
      for (const file of files.filter(f => f.endsWith('.js'))) {
        const filePath = path.join(middlewareDir, file);
        if (!fsSync.existsSync(filePath)) {
          this.addError({ category: 'middleware', message: `Missing: ${file}`, filePath, severity: 'medium', remediation: `Create ${file}` });
          continue;
        }
        this.addDetail('middleware', `✓ ${file} exists`);
        if (requiredMiddleware[file]) {
          const middleware = require(filePath);
          requiredMiddleware[file].forEach(func => {
            if (typeof middleware[func] !== 'function') {
              this.addWarning({ category: 'middleware', message: `Missing ${func}`, filePath, severity: 'medium', remediation: `Add ${func} to ${file}` });
            }
          });
        }
      }
      this.checkResults.middleware.passed = !this.errors.some(e => e.category === 'middleware');
    } catch (error) {
      this.addError({ category: 'middleware', message: `Error: ${error.message}`, filePath: middlewareDir, severity: 'high', remediation: 'Check middleware dir' });
    }
  }

  async validateValidators() {
    await this.validateComponent('validators', 'validators', this.config.namingConventions.validators, {
      routes: this.config.namingConventions.routes
    });
  }

  async validateMerchantProfileComponents() {
    console.log('\n🏪 Validating Merchant Profile Components...');
    const merchantProfileComponents = {
      controllers: { base: 'src/controllers/merchantControllers/profileControllers', required: ['activityController.js', 'addressController.js'] },
      services: { base: 'src/services/merchantServices/profileServices', required: ['activityLogService.js', 'profileService.js'] },
      routes: { base: 'src/routes/merchantRoutes/profileRoutes', required: ['activityRoutes.js', 'profileRoutes.js', 'index.js'] },
      validators: { base: 'src/validators/merchantValidators/profileValidators', required: ['activityValidator.js', 'profileValidator.js'] }
    };
    for (const [type, config] of Object.entries(merchantProfileComponents)) {
      console.log(`\n📂 Checking ${type}...`);
      const baseDir = path.join(this.rootPath, config.base);
      if (!fsSync.existsSync(baseDir)) {
        this.addError({ category: 'merchant_profile', message: `Missing: ${config.base}`, filePath: baseDir, severity: 'high', remediation: `Create ${config.base}` });
        continue;
      }
      for (const file of config.required) {
        const filePath = path.join(baseDir, file);
        if (!fsSync.existsSync(filePath)) {
          this.addError({ category: 'merchant_profile', message: `Missing: ${file}`, filePath, severity: 'medium', remediation: `Create ${file}` });
        } else {
          this.addDetail('merchant_profile', `✓ ${type}/${file} exists`);
        }
      }
    }
    this.checkResults.merchant_profile.passed = !this.errors.some(e => e.category === 'merchant_profile');
  }

  async validateDatabase() {
    console.log('\n💾 Validating database configuration...');
    const configPath = path.join(this.basePath, 'config', 'config.js');
    if (!fsSync.existsSync(configPath)) {
      this.addError({ category: 'database', message: 'Missing config.js', filePath: configPath, severity: 'critical', remediation: 'Create config.js' });
      return;
    }
    try {
      const dbConfig = require(configPath);
      const env = process.env.NODE_ENV || 'development';
      const requiredFields = ['username', 'password', 'database', 'host', 'dialect'];
      requiredFields.forEach(field => {
        if (!dbConfig[env]?.[field]) this.addError({ category: 'database', message: `Missing: ${field}`, filePath: configPath, severity: 'high', remediation: `Add ${field}` });
        else this.addDetail('database', `✓ ${field} configured`);
      });
    } catch (error) {
      this.addError({ category: 'database', message: `Load failed: ${error.message}`, filePath: configPath, severity: 'critical', remediation: 'Check config syntax' });
    }
    this.checkResults.database.passed = !this.errors.some(e => e.category === 'database');
  }

  async validateMigrations() {
    console.log('\n🔄 Validating migrations...');
    const migrationsDir = path.join(this.rootPath, 'migrations');
    if (!fsSync.existsSync(migrationsDir)) {
      this.addError({ category: 'migrations', message: 'Missing migrations dir', filePath: migrationsDir, severity: 'high', remediation: 'Create migrations/' });
      return;
    }
    try {
      const files = await fs.readdir(migrationsDir);
      const migrationFiles = files.filter(f => f.endsWith('.js'));
      const regex = /^\d{14}-[a-z-]+\.js$/;
      migrationFiles.forEach(file => {
        if (!regex.test(file)) this.addWarning({ category: 'migrations', message: `Invalid name: ${file}`, filePath: path.join(migrationsDir, file), severity: 'low', remediation: 'Rename to YYYYMMDDHHMMSS-name.js' });
        else this.addDetail('migrations', `✓ Valid file: ${file}`);
      });
    } catch (error) {
      this.addError({ category: 'migrations', message: `Error: ${error.message}`, filePath: migrationsDir, severity: 'high', remediation: 'Check migrations dir' });
    }
    this.checkResults.migrations.passed = !this.errors.some(e => e.category === 'migrations');
  }

  async validateIntegrations() {
    console.log('\n🔌 Validating integrations...');
    const integrations = {
      'Google Maps': { envVars: ['GOOGLE_MAPS_API_KEY'], files: ['src/services/geoLocation/locationDetectionService.js'] },
      'Twilio': { envVars: ['TWILIO_ACCOUNT_SID'], files: ['src/services/whatsappService.js'] }
    };
    for (const [name, config] of Object.entries(integrations)) {
      config.envVars.forEach(env => {
        if (!process.env[env]) this.addError({ category: 'integrations', message: `${name} missing: ${env}`, filePath: '.env', severity: 'high', remediation: `Add ${env}` });
        else this.addDetail('integrations', `✓ ${name}: ${env}`);
      });
      config.files.forEach(file => {
        if (!fsSync.existsSync(path.join(this.rootPath, file))) this.addError({ category: 'integrations', message: `${name} missing: ${file}`, filePath: file, severity: 'medium', remediation: `Create ${file}` });
        else this.addDetail('integrations', `✓ ${name}: ${file}`);
      });
    }
    this.checkResults.integrations.passed = !this.errors.some(e => e.category === 'integrations');
  }

  async validateServiceControllerIntegrity() {
    console.log('\n🔗 Validating service-controller integrity...');
    const servicesDir = path.join(this.basePath, 'services');
    const controllersDir = path.join(this.basePath, 'controllers');
    try {
      const serviceFiles = glob.sync('**/*.js', { cwd: servicesDir });
      for (const file of serviceFiles) {
        const filePath = path.join(servicesDir, file);
        const controllerName = file.replace('Service.js', 'Controller.js');
        const controllerPath = path.join(controllersDir, controllerName);
        if (!fsSync.existsSync(controllerPath)) {
          this.addWarning({ category: 'service_controller_integrity', message: `Missing controller: ${controllerName}`, filePath, severity: 'medium', remediation: `Create ${controllerName}` });
        } else {
          this.addDetail('service_controller_integrity', `✓ ${file} paired`);
        }
      }
    } catch (error) {
      this.addError({ category: 'service_controller_integrity', message: `Error: ${error.message}`, filePath: servicesDir, severity: 'high', remediation: 'Check dirs' });
    }
    this.checkResults.service_controller_integrity.passed = !this.errors.some(e => e.category === 'service_controller_integrity');
  }

  async validateAuthorization() {
    console.log('\n🔑 Validating authorization...');
    const routesDir = path.join(this.basePath, 'routes');
    try {
      const routeFiles = glob.sync('**/*.js', { cwd: routesDir });
      for (const file of routeFiles) {
        const filePath = path.join(routesDir, file);
        const content = await fs.readFile(filePath, 'utf8');
        if (!content.includes('authMiddleware') && file.includes('admin')) {
          this.addWarning({ category: 'authorization', message: `No auth for admin route`, filePath, severity: 'high', remediation: `Add authMiddleware to ${file}` });
        } else {
          this.addDetail('authorization', `✓ ${file} secured`);
        }
      }
    } catch (error) {
      this.addError({ category: 'authorization', message: `Error: ${error.message}`, filePath: routesDir, severity: 'high', remediation: 'Check routes dir' });
    }
    this.checkResults.authorization.passed = !this.errors.some(e => e.category === 'authorization');
  }

  async validateEnvConfig() {
    console.log('\n🌍 Validating env config...');
    const envPath = path.join(this.rootPath, '.env');
    if (!fsSync.existsSync(envPath)) {
      this.addError({ category: 'env_config', message: 'Missing .env', filePath: envPath, severity: 'critical', remediation: 'Create .env' });
    } else {
      this.addDetail('env_config', '✓ .env exists');
    }
    this.checkResults.env_config.passed = !this.errors.some(e => e.category === 'env_config');
  }

  async validateSecurityChecks() {
    console.log('\n🔒 Validating security checks...');
    const passwordServicePath = path.join(this.basePath, 'services', 'passwordService.js');
    if (!fsSync.existsSync(passwordServicePath)) {
      this.addError({ category: 'security_checks', message: 'Missing password service', filePath: passwordServicePath, severity: 'high', remediation: 'Create passwordService.js' });
    } else {
      const content = await fs.readFile(passwordServicePath, 'utf8');
      if (!content.includes('bcrypt')) this.addWarning({ category: 'security_checks', message: 'No bcrypt', filePath: passwordServicePath, severity: 'high', remediation: 'Use bcrypt' });
      else this.addDetail('security_checks', '✓ Bcrypt used');
    }
    this.checkResults.security_checks.passed = !this.errors.some(e => e.category === 'security_checks');
  }

  async validateSocketEvents() {
    console.log('\n📡 Validating socket events...');
    const socketPath = path.join(this.basePath, 'config', 'socket.js');
    if (!fsSync.existsSync(socketPath)) {
      this.addError({ category: 'socket_events', message: 'Missing socket config', filePath: socketPath, severity: 'medium', remediation: 'Create socket.js' });
    } else {
      this.addDetail('socket_events', '✓ Socket config exists');
    }
    this.checkResults.socket_events.passed = !this.errors.some(e => e.category === 'socket_events');
  }

  async validateApiResponses() {
    console.log('\n📤 Validating API responses...');
    const controllersDir = path.join(this.basePath, 'controllers');
    try {
      const files = glob.sync('**/*.js', { cwd: controllersDir });
      for (const file of files) {
        const filePath = path.join(controllersDir, file);
        const content = await fs.readFile(filePath, 'utf8');
        if (content.includes('res.status') && !content.includes('json')) {
          this.addWarning({ category: 'api_responses', message: 'No JSON response', filePath, severity: 'medium', remediation: 'Add res.json()' });
        } else {
          this.addDetail('api_responses', `✓ ${file} formatted`);
        }
      }
    } catch (error) {
      this.addError({ category: 'api_responses', message: `Error: ${error.message}`, filePath: controllersDir, severity: 'high', remediation: 'Check controllers' });
    }
    this.checkResults.api_responses.passed = !this.errors.some(e => e.category === 'api_responses');
  }

  async validatePerformance() {
    console.log('\n⚡ Validating performance...');
    const redisPath = path.join(this.basePath, 'config', 'redis.js');
    if (!fsSync.existsSync(redisPath)) {
      this.addWarning({ category: 'performance', message: 'No Redis config', filePath: redisPath, severity: 'medium', remediation: 'Create redis.js' });
    } else {
      this.addDetail('performance', '✓ Redis configured');
    }
    this.checkResults.performance.passed = !this.errors.some(e => e.category === 'performance');
  }

  async validateLoggingMonitoring() {
    console.log('\n📈 Validating logging...');
    const loggerPath = path.join(this.basePath, 'utils', 'logger.js');
    if (!fsSync.existsSync(loggerPath)) {
      this.addError({ category: 'logging_monitoring', message: 'Missing logger', filePath: loggerPath, severity: 'high', remediation: 'Create logger.js' });
    } else {
      this.addDetail('logging_monitoring', '✓ Logger exists');
    }
    this.checkResults.logging_monitoring.passed = !this.errors.some(e => e.category === 'logging_monitoring');
  }

  async validateNotifications() {
    console.log('\n🔔 Validating notifications...');
    const notificationPath = path.join(this.basePath, 'services', 'notificationService.js');
    if (!fsSync.existsSync(notificationPath)) {
      this.addError({ category: 'notifications', message: 'Missing notification service', filePath: notificationPath, severity: 'high', remediation: 'Create notificationService.js' });
    } else {
      this.addDetail('notifications', '✓ Notification service exists');
    }
    this.checkResults.notifications.passed = !this.errors.some(e => e.category === 'notifications');
  }

  async validateServiceModelTerms() {
    console.log('\n🗄️ Validating service files against model terms...');
    const servicesDir = path.join(this.basePath, 'services');
    const modelsDir = path.join(this.basePath, 'models');
    
    try {
      const serviceFiles = glob.sync('**/*.js', { cwd: servicesDir });
      const modelFiles = glob.sync('**/*.js', { cwd: modelsDir }).filter(f => f !== 'index.js');

      for (const serviceFile of serviceFiles) {
        const servicePath = path.join(servicesDir, serviceFile);
        const serviceContent = await fs.readFile(servicePath, 'utf8');
        
        const modelName = serviceFile.replace('Service.js', '.js').toLowerCase();
        const modelPath = path.join(modelsDir, modelName);

        if (!fsSync.existsSync(modelPath)) {
          this.addWarning({ category: 'service_model_terms', message: `No model for service: ${modelName}`, filePath: servicePath, severity: 'medium', remediation: `Create ${modelName}` });
          continue;
        }

        this.addDetail('service_model_terms', `✓ Checking ${serviceFile} against ${modelName}`);

        try {
          const modelContent = await fs.readFile(modelPath, 'utf8');
          const modelLines = modelContent.split('\n');
          const requiredTerms = new Set();
          
          modelLines.forEach(line => {
            const columnMatch = line.match(/^\s*(\w+):\s*{/);
            if (columnMatch) requiredTerms.add(columnMatch[1]);
            ['findAll', 'findOne', 'create', 'update', 'destroy', 'belongsTo', 'hasMany'].forEach(term => {
              if (line.includes(term)) requiredTerms.add(term);
            });
          });

          for (const term of requiredTerms) {
            if (!serviceContent.includes(term)) {
              this.addWarning({ category: 'service_model_terms', message: `Missing term: ${term}`, filePath: servicePath, severity: 'low', remediation: `Use ${term} in ${serviceFile}` });
            }
          }
        } catch (error) {
          this.addError({ category: 'service_model_terms', message: `Model read error: ${error.message}`, filePath: modelPath, severity: 'high', remediation: 'Check model file' });
        }
      }
      this.checkResults.service_model_terms.passed = !this.errors.some(e => e.category === 'service_model_terms');
    } catch (error) {
      this.addError({ category: 'service_model_terms', message: `Validation failed: ${error.message}`, severity: 'critical', remediation: 'Check dirs' });
    }
  }

  async generateModelSummary() {
    console.log('\n📋 Generating model summary as database diagram...');
    const modelsDir = path.join(this.basePath, 'models');
    let diagram = '=== Database Model Summary ===\n';

    try {
      const modelFiles = glob.sync('**/*.js', { cwd: modelsDir }).filter(f => f !== 'index.js');
      
      for (const file of modelFiles) {
        const filePath = path.join(modelsDir, file);
        const modelName = path.basename(file, '.js');
        diagram += `\nTable: ${modelName}\n  Columns:\n`;

        try {
          const content = await fs.readFile(filePath, 'utf8');
          const lines = content.split('\n');
          
          lines.forEach(line => {
            const columnMatch = line.match(/^\s*(\w+):\s*{([^}]*)}/);
            if (columnMatch) diagram += `    - ${columnMatch[1]}: { ${columnMatch[2].trim()} }\n`;
          });

          diagram += '  Associations:\n';
          const associations = ['belongsTo', 'hasOne', 'hasMany', 'belongsToMany'];
          lines.forEach(line => {
            associations.forEach(assoc => {
              const assocMatch = line.match(new RegExp(`${assoc}\\s*\\(\\s*(\\w+)`));
              if (assocMatch) diagram += `    - ${assoc} ${assocMatch[1]}\n`;
            });
          });
        } catch (error) {
          this.addError({ category: 'model_summary', message: `Model error: ${error.message}`, filePath, severity: 'high', remediation: 'Check model syntax' });
        }
      }
      diagram += '\n=============================\n';
      console.log(diagram);
      const outputPath = path.join(this.rootPath, 'db_diagram.txt');
      await fs.writeFile(outputPath, diagram);
      this.addDetail('model_summary', `✓ Summary generated at ${outputPath}`);
      this.checkResults.model_summary.passed = !this.errors.some(e => e.category === 'model_summary');
    } catch (error) {
      this.addError({ category: 'model_summary', message: `Summary failed: ${error.message}`, severity: 'critical', remediation: 'Check models dir' });
    }
  }

  async validateAll() {
    try {
      await this.validateSyntax();
      await this.validateCircularDependencies();
      await this.validateModuleConsistency();
      await this.validateStructure();
      await this.validateControllers();
      await this.validateRoutes();
      await this.validateServices();
      await this.validateSecurity();
      await this.validateMiddleware();
      await this.validateValidators();
      await this.validateDatabase();
      await this.validateMigrations();
      await this.validateIntegrations();
      await this.validateMerchantProfileComponents();
      await this.validateServiceControllerIntegrity();
      await this.validateAuthorization();
      await this.validateEnvConfig();
      await this.validateSecurityChecks();
      await this.validateSocketEvents();
      await this.validateApiResponses();
      await this.validatePerformance();
      await this.validateLoggingMonitoring();
      await this.validateNotifications();
      await this.validateServiceModelTerms();
      await this.generateModelSummary();
      return this.displayResults();
    } catch (error) {
      this.addError({ category: 'system', message: `Validation failed: ${error.message}`, severity: 'critical', remediation: 'Check script' });
      return this.displayResults();
    }
  }

  displayResults() {
    console.log('\n📊 Validation Results:');
    for (const [category, result] of Object.entries(this.checkResults)) {
      console.log(`\n${category.toUpperCase()}:`);
      result.details.forEach(detail => console.log(`  ${detail}`));
    }

    const groupedErrors = this.errors.reduce((acc, err) => {
      acc[err.category] = acc[err.category] || [];
      acc[err.category].push(err);
      return acc;
    }, {});
    if (Object.keys(groupedErrors).length) {
      console.log('\n❌ Errors (Grouped by Category):');
      Object.entries(groupedErrors).forEach(([category, errs]) => {
        console.log(`\n  ${category.toUpperCase()}:`);
        errs.sort((a, b) => b.severity.localeCompare(a.severity)).forEach((e, i) => {
          console.log(`    ${i + 1}. [${e.severity.toUpperCase()}] ${e.message}`);
          if (e.filePath) console.log(`       File: ${e.filePath}`);
          if (e.lineNumber) console.log(`       Line: ${e.lineNumber}`);
          console.log(`       Fix: ${e.remediation}`);
        });
      });
    }

    const groupedWarnings = this.warnings.reduce((acc, warn) => {
      acc[warn.category] = acc[warn.category] || [];
      acc[warn.category].push(warn);
      return acc;
    }, {});
    if (Object.keys(groupedWarnings).length) {
      console.log('\n⚠️ Warnings (Grouped by Category):');
      Object.entries(groupedWarnings).forEach(([category, warns]) => {
        console.log(`\n  ${category.toUpperCase()}:`);
        warns.sort((a, b) => b.severity.localeCompare(a.severity)).forEach((w, i) => {
          console.log(`    ${i + 1}. [${w.severity.toUpperCase()}] ${w.message}`);
          if (w.filePath) console.log(`       File: ${w.filePath}`);
          if (w.lineNumber) console.log(`       Line: ${w.lineNumber}`);
          console.log(`       Fix: ${w.remediation}`);
        });
      });
    }

    if (this.suggestions.length) {
      console.log('\n💡 Suggestions:');
      this.suggestions.forEach((s, i) => console.log(`  ${i + 1}. [${s.category}] ${s.message}`));
    }

    console.log('\n✅ Validation complete!');
    return !this.errors.length;
  }
}

module.exports = new StartupValidator();