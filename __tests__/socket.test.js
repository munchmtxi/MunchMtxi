// __tests__/socket.test.js
const io = require('socket.io-client');
const { setupTestServer } = require('../test/helpers/serverSetup');
const { createTestUser, createTestDriver, createTestMerchant } = require('../test/helpers/testData');
const { EVENTS } = require('../src/config/events');

describe('Socket.IO Tests', () => {
  let server;
  let serverUrl;
  let testUser;
  let testDriver;
  let testMerchant;

  beforeAll(async () => {
    // Setup test server and create test data
    const serverSetup = await setupTestServer();
    server = serverSetup.server;
    serverUrl = serverSetup.url;
    testUser = await createTestUser();
    testDriver = await createTestDriver();
    testMerchant = await createTestMerchant();
  });

  afterAll(async () => {
    await server.close();
  });

  describe('Authentication', () => {
    test('Should connect with valid token', (done) => {
      const client = io(serverUrl, {
        auth: {
          token: testUser.generateAuthToken()
        }
      });

      client.on('connect', () => {
        expect(client.connected).toBe(true);
        client.disconnect();
        done();
      });
    });

    test('Should reject connection with invalid token', (done) => {
      const client = io(serverUrl, {
        auth: {
          token: 'invalid-token'
        }
      });

      client.on('connect_error', (err) => {
        expect(err.message).toBe('Authentication failed');
        done();
      });
    });
  });

  describe('Order Tracking', () => {
    let customerClient;
    let driverClient;
    let merchantClient;

    beforeEach(async () => {
      // Setup clients with authentication
      customerClient = io(serverUrl, {
        auth: { token: testUser.generateAuthToken() }
      });
      driverClient = io(serverUrl, {
        auth: { token: testDriver.generateAuthToken() }
      });
      merchantClient = io(serverUrl, {
        auth: { token: testMerchant.generateAuthToken() }
      });

      // Wait for all connections
      await Promise.all([
        new Promise(resolve => customerClient.on('connect', resolve)),
        new Promise(resolve => driverClient.on('connect', resolve)),
        new Promise(resolve => merchantClient.on('connect', resolve))
      ]);
    });

    afterEach(() => {
      customerClient.disconnect();
      driverClient.disconnect();
      merchantClient.disconnect();
    });

    test('Should update driver location in real-time', (done) => {
      const testLocation = {
        latitude: 40.7128,
        longitude: -74.0060
      };

      customerClient.on(EVENTS.DRIVER.LOCATION_UPDATED, (data) => {
        expect(data.location).toEqual(testLocation);
        done();
      });

      driverClient.emit(EVENTS.DRIVER.LOCATION_UPDATE, testLocation);
    });

    test('Should notify all parties on order status change', (done) => {
      const testOrder = {
        id: 'test-order-id',
        status: 'PREPARING'
      };

      let notificationCount = 0;
      const expectedNotifications = 3;

      const checkComplete = () => {
        notificationCount++;
        if (notificationCount === expectedNotifications) {
          done();
        }
      };

      customerClient.on(EVENTS.ORDER.STATUS_CHANGED, (data) => {
        expect(data.orderId).toBe(testOrder.id);
        expect(data.status).toBe(testOrder.status);
        checkComplete();
      });

      driverClient.on(EVENTS.ORDER.STATUS_CHANGED, (data) => {
        expect(data.orderId).toBe(testOrder.id);
        expect(data.status).toBe(testOrder.status);
        checkComplete();
      });

      merchantClient.on(EVENTS.ORDER.STATUS_CHANGED, (data) => {
        expect(data.orderId).toBe(testOrder.id);
        expect(data.status).toBe(testOrder.status);
        checkComplete();
      });

      merchantClient.emit(EVENTS.ORDER.UPDATE_STATUS, testOrder);
    });
  });

  describe('Room Management', () => {
    test('Should join appropriate rooms on connection', (done) => {
      const client = io(serverUrl, {
        auth: { token: testUser.generateAuthToken() }
      });

      client.on('connect', async () => {
        // Get client rooms from server
        const rooms = await new Promise(resolve => {
          client.emit('GET_ROOMS', null, resolve);
        });

        expect(rooms).toContain(`user:${testUser.id}`);
        expect(rooms).toContain(`role:${testUser.role}`);
        
        client.disconnect();
        done();
      });
    });
  });

  describe('Quick Links', () => {
    let customerClient;
    let staffClient;

    beforeEach(async () => {
      customerClient = io(serverUrl, {
        auth: { token: testUser.generateAuthToken() }
      });
      staffClient = io(serverUrl, {
        auth: { token: testDriver.generateAuthToken() }
      });

      await Promise.all([
        new Promise(resolve => customerClient.on('connect', resolve)),
        new Promise(resolve => staffClient.on('connect', resolve))
      ]);
    });

    afterEach(() => {
      customerClient.disconnect();
      staffClient.disconnect();
    });

    test('Should handle assistance request', (done) => {
      const testRequest = {
        type: 'ASSISTANCE',
        tableId: 'test-table',
        details: 'Need extra utensils'
      };

      staffClient.on(EVENTS.QUICK_LINK.ASSISTANCE_REQUESTED, (data) => {
        expect(data.type).toBe(testRequest.type);
        expect(data.tableId).toBe(testRequest.tableId);
        expect(data.details).toBe(testRequest.details);
        done();
      });

      customerClient.emit(EVENTS.QUICK_LINK.ASSISTANCE_REQUESTED, testRequest);
    });

    test('Should handle bill request', (done) => {
      const testRequest = {
        tableId: 'test-table',
        orderId: 'test-order'
      };

      staffClient.on(EVENTS.QUICK_LINK.BILL_REQUESTED, (data) => {
        expect(data.tableId).toBe(testRequest.tableId);
        expect(data.orderId).toBe(testRequest.orderId);
        done();
      });

      customerClient.emit(EVENTS.QUICK_LINK.BILL_REQUESTED, testRequest);
    });
  });

  describe('Error Handling', () => {
    test('Should handle invalid events gracefully', (done) => {
      const client = io(serverUrl, {
        auth: { token: testUser.generateAuthToken() }
      });

      client.on('connect', () => {
        client.emit('INVALID_EVENT', {}, (error) => {
          expect(error).toBeTruthy();
          expect(error.message).toBe('Invalid event');
          client.disconnect();
          done();
        });
      });
    });

    test('Should handle event errors with proper response', (done) => {
      const client = io(serverUrl, {
        auth: { token: testUser.generateAuthToken() }
      });

      client.on('connect', () => {
        client.emit(EVENTS.ORDER.UPDATE_STATUS, { 
          orderId: 'non-existent-order' 
        });

        client.on(EVENTS.ERROR, (error) => {
          expect(error.message).toBe('Order not found');
          client.disconnect();
          done();
        });
      });
    });
  });

  describe('Performance', () => {
    test('Should handle multiple simultaneous connections', async () => {
      const numClients = 10;
      const clients = [];

      // Create multiple clients
      for (let i = 0; i < numClients; i++) {
        const client = io(serverUrl, {
          auth: { token: testUser.generateAuthToken() }
        });
        clients.push(client);
      }

      // Wait for all connections
      await Promise.all(
        clients.map(
          client => new Promise(resolve => client.on('connect', resolve))
        )
      );

      // Verify all clients are connected
      clients.forEach(client => {
        expect(client.connected).toBe(true);
      });

      // Cleanup
      clients.forEach(client => client.disconnect());
    });
  });
});