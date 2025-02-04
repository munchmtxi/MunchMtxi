// config/swagger.js
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const config = require('@config/config');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Munch Mtxi API Documentation',
      version: '1.0.0',
      description: 'API documentation for the Munch Mtxi platform',
    },
    servers: [
      {
        url: `http://localhost:${config.port}/api/v1`,
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./routes/*.js', './models/*.js'], // Path to the API docs
};

const specs = swaggerJsdoc(options);

const setupSwagger = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
};

module.exports = { setupSwagger };
