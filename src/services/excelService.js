// src/services/excelService.js
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs-extra');
const logger = require('../utils/logger');
const { Order, Driver, Merchant } = require('../models');
const AppError = require('../utils/AppError');
const { Op } = require('sequelize');

class ExcelService {
  constructor() {
    this.tempDir = path.join(__dirname, '../../temp/excel');
    
    // Ensure temp directory exists
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  async generateOrdersReport(dateRange, filters = {}) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Orders');

    // Define columns
    sheet.columns = [
      { header: 'Order Number', key: 'order_number', width: 15 },
      { header: 'Date', key: 'created_at', width: 15 },
      { header: 'Customer', key: 'customer_name', width: 20 },
      { header: 'Merchant', key: 'merchant_name', width: 20 },
      { header: 'Driver', key: 'driver_name', width: 20 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Total Amount', key: 'total_amount', width: 15 },
      { header: 'Payment Status', key: 'payment_status', width: 15 },
      { header: 'Delivery Time', key: 'delivery_time', width: 15 }
    ];

    // Fetch orders with associations
    const orders = await Order.findAll({
      where: {
        created_at: {
          [Op.between]: [dateRange.start, dateRange.end]
        },
        ...filters
      },
      include: ['customer', 'merchant', 'driver']
    });

    // Add data rows
    orders.forEach(order => {
      sheet.addRow({
        order_number: order.order_number,
        created_at: order.created_at,
        customer_name: order.customer?.name,
        merchant_name: order.merchant?.business_name,
        driver_name: order.driver?.name,
        status: order.status,
        total_amount: order.total_amount,
        payment_status: order.payment_status,
        delivery_time: order.actual_delivery_time || 'N/A'
      });
    });

    // Add pivot table
    const pivotSheet = workbook.addWorksheet('Order Analysis');
    pivotSheet.addPivotTable({
      sourceData: 'Orders!A1:I' + (orders.length + 1),
      rows: ['status', 'merchant_name'],
      columns: ['payment_status'],
      values: [
        { name: 'total_amount', operation: 'sum' }
      ]
    });

    return workbook;
  }

  async generateDriverPerformanceReport(dateRange, filters = {}) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Driver Performance');

    sheet.columns = [
      { header: 'Driver Name', key: 'name', width: 20 },
      { header: 'Total Orders', key: 'total_orders', width: 15 },
      { header: 'On-Time Deliveries', key: 'on_time', width: 20 },
      { header: 'Average Delivery Time', key: 'avg_time', width: 25 },
      { header: 'Total Earnings', key: 'earnings', width: 15 }
    ];

    const drivers = await Driver.findAll({
      include: [{
        model: Order,
        as: 'orders',
        where: {
          created_at: {
            [Op.between]: [dateRange.start, dateRange.end]
          }
        }
      }]
    });

    drivers.forEach(driver => {
      const orders = driver.orders || [];
      sheet.addRow({
        name: driver.name,
        total_orders: orders.length,
        on_time: orders.filter(o => 
          o.actual_delivery_time <= o.estimated_delivery_time
        ).length,
        avg_time: this.calculateAverageDeliveryTime(orders),
        earnings: orders.reduce((sum, o) => sum + o.total_amount, 0)
      });
    });

    return workbook;
  }

  async generateMerchantReport(dateRange, filters = {}) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Merchant Performance');

    // Similar implementation to driver report but for merchants
    // ...

    return workbook;
  }

  async generateScheduledReport(config) {
    const { reportType, dateRange, filters, format } = config;
    let workbook;

    switch (reportType) {
      case 'orders':
        workbook = await this.generateOrdersReport(dateRange, filters);
        break;
      case 'drivers':
        workbook = await this.generateDriverPerformanceReport(dateRange, filters);
        break;
      case 'merchants':
        workbook = await this.generateMerchantReport(dateRange, filters);
        break;
      default:
        throw new AppError('Invalid report type', 400);
    }

    const fileName = `${reportType}_${Date.now()}.xlsx`;
    const filePath = path.join(this.tempDir, fileName);
    
    await workbook.xlsx.writeFile(filePath);
    return filePath;
  }

  calculateAverageDeliveryTime(orders) {
    // Implementation for calculating average delivery time
    // ...
  }

  async cleanup(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        await fs.unlink(filePath);
        logger.info(`Temporary Excel file removed: ${filePath}`);
      }
    } catch (error) {
      logger.error(`Error cleaning up Excel file: ${error.message}`);
    }
  }
}

module.exports = new ExcelService();