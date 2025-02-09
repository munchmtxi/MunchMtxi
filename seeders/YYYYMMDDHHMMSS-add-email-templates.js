// seeders/YYYYMMDDHHMMSS-add-email-templates.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('templates', [
      // Account Management
      {
        name: 'welcome_email',
        type: 'EMAIL',
        subject: 'Welcome to MunchMtxi!',
        content: `
          <h2>Welcome {{userName}}!</h2>
          <p>Thank you for joining MunchMtxi. We're excited to have you on board.</p>
          <p>Your account has been created successfully with {{userRole}} privileges.</p>
          <p>Get started by completing your profile and exploring our services.</p>
        `,
        status: 'ACTIVE',
        created_at: new Date(),
        updated_at: new Date()
      },

      // Order Management
      {
        name: 'order_confirmation',
        type: 'EMAIL',
        subject: 'Order Confirmation #{{orderNumber}}',
        content: `
          <h2>Thank you for your order, {{userName}}!</h2>
          <p>Your order #{{orderNumber}} has been confirmed.</p>
          <p><strong>Order Details:</strong></p>
          <p>Restaurant: {{merchantName}}</p>
          <p>Order Total: {{currency}} {{total}}</p>
          <p>Estimated Delivery Time: {{estimatedDeliveryTime}}</p>
          <p>Delivery Address: {{deliveryAddress}}</p>
        `,
        status: 'ACTIVE',
        created_at: new Date(),
        updated_at: new Date()
      },

      // Booking Management
      {
        name: 'booking_confirmation',
        type: 'EMAIL',
        subject: 'Table Booking Confirmation',
        content: `
          <h2>Your table is confirmed!</h2>
          <p>Dear {{userName}},</p>
          <p>Your booking at {{merchantName}} has been confirmed.</p>
          <p><strong>Booking Details:</strong></p>
          <p>Date: {{bookingDate}}</p>
          <p>Time: {{bookingTime}}</p>
          <p>Number of Guests: {{guestCount}}</p>
          <p>Special Requests: {{specialRequests}}</p>
        `,
        status: 'ACTIVE',
        created_at: new Date(),
        updated_at: new Date()
      },

      // Security
      {
        name: 'password_reset',
        type: 'EMAIL',
        subject: 'Reset Your Password',
        content: `
          <h2>Password Reset Request</h2>
          <p>Hello {{userName}},</p>
          <p>We received a request to reset your password. Click the link below to set a new password:</p>
          <p><a href="{{resetLink}}">Reset Password</a></p>
          <p>This link will expire in {{validityPeriod}}.</p>
          <p>If you didn't request this, please ignore this email.</p>
        `,
        status: 'ACTIVE',
        created_at: new Date(),
        updated_at: new Date()
      },

      // Driver Notifications
      {
        name: 'new_delivery_request',
        type: 'EMAIL',
        subject: 'New Delivery Request',
        content: `
          <h2>New Delivery Available</h2>
          <p>Hello {{driverName}},</p>
          <p>A new delivery request is available in your area.</p>
          <p><strong>Details:</strong></p>
          <p>Pickup: {{pickupLocation}}</p>
          <p>Delivery: {{deliveryLocation}}</p>
          <p>Estimated Distance: {{distance}}</p>
          <p>Estimated Earnings: {{currency}} {{earnings}}</p>
        `,
        status: 'ACTIVE',
        created_at: new Date(),
        updated_at: new Date()
      },

      // Merchant Notifications
      {
        name: 'new_order_merchant',
        type: 'EMAIL',
        subject: 'New Order Received #{{orderNumber}}',
        content: `
          <h2>New Order Alert!</h2>
          <p>Hello {{merchantName}},</p>
          <p>You have received a new order (#{{orderNumber}}).</p>
          <p><strong>Order Details:</strong></p>
          <p>Customer: {{customerName}}</p>
          <p>Items: {{orderItems}}</p>
          <p>Total: {{currency}} {{total}}</p>
          <p>Please confirm this order within {{confirmationTimeLimit}}.</p>
        `,
        status: 'ACTIVE',
        created_at: new Date(),
        updated_at: new Date()
      },

      // Updates & Maintenance
      {
        name: 'system_maintenance',
        type: 'EMAIL',
        subject: 'Scheduled Maintenance Notice',
        content: `
          <h2>Scheduled Maintenance</h2>
          <p>Dear {{userName}},</p>
          <p>Our system will undergo maintenance on {{maintenanceDate}} from {{startTime}} to {{endTime}} {{timezone}}.</p>
          <p>During this time, {{affectedServices}} may be temporarily unavailable.</p>
          <p>We apologize for any inconvenience.</p>
        `,
        status: 'ACTIVE',
        created_at: new Date(),
        updated_at: new Date()
      },

      // Marketing (Optional)
      {
        name: 'special_offer',
        type: 'EMAIL',
        subject: 'Special Offer Just for You!',
        content: `
          <h2>Special Offer!</h2>
          <p>Dear {{userName}},</p>
          <p>We have a special offer for you in {{userCity}}!</p>
          <p>{{offerDetails}}</p>
          <p>Valid until: {{offerExpiry}}</p>
          <p>Use code: {{promoCode}}</p>
        `,
        status: 'ACTIVE',
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('templates', {
      name: {
        [Sequelize.Op.in]: [
          'welcome_email',
          'order_confirmation',
          'booking_confirmation',
          'password_reset',
          'new_delivery_request',
          'new_order_merchant',
          'system_maintenance',
          'special_offer'
        ]
      }
    }, {});
  }
};