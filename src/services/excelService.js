'use strict';
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs-extra');
const { logger } = require('@utils/logger');
const { Order, Driver, Merchant } = require('@models');
const AppError = require('@utils/AppError');
const { Op } = require('sequelize');

class ExcelService {
  constructor() {
    this.tempDir = path.join(__dirname, '../temp/excel');
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  async generateOrdersReport(dateRange, filters = {}) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Orders');

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

    const orders = await Order.findAll({
      where: {
        created_at: {
          [Op.between]: [new Date(dateRange.start), new Date(dateRange.end)]
        },
        ...filters
      },
      include: [
        { model: Merchant, as: 'merchant' },
        { model: Driver, as: 'driver' },
        { model: require('@models/customer'), as: 'customer' }
      ]
    });

    orders.forEach(order => {
      sheet.addRow({
        order_number: order.order_number,
        created_at: order.formatDate(),
        customer_name: order.customer?.first_name || 'N/A',
        merchant_name: order.merchant?.business_name || 'N/A',
        driver_name: order.driver?.first_name || 'N/A',
        status: order.status,
        total_amount: order.formatTotal(),
        payment_status: order.payment_status,
        delivery_time: order.actual_delivery_time ? new Date(order.actual_delivery_time).toLocaleTimeString() : 'N/A'
      });
    });

    const pivotSheet = workbook.addWorksheet('Order Analysis');
    pivotSheet.addPivotTable({
      sourceData: 'Orders!A1:I' + (orders.length + 1),
      rows: ['status', 'merchant_name'],
      columns: ['payment_status'],
      values: [{ name: 'total_amount', operation: 'sum' }]
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
            [Op.between]: [new Date(dateRange.start), new Date(dateRange.end)]
          },
          ...filters
        }
      }]
    });

    drivers.forEach(driver => {
      const orders = driver.orders || [];
      sheet.addRow({
        name: driver.first_name || 'N/A',
        total_orders: orders.length,
        on_time: orders.filter(o => 
          o.actual_delivery_time && o.estimated_delivery_time && 
          new Date(o.actual_delivery_time) <= new Date(o.estimated_delivery_time)
        ).length,
        avg_time: this.calculateAverageDeliveryTime(orders),
        earnings: orders.reduce((sum, o) => sum + parseFloat(o.total_amount), 0).toFixed(2)
      });
    });

    return workbook;
  }

  async generateMerchantReport(dateRange, filters = {}) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Merchant Performance');

    sheet.columns = [
      { header: 'Merchant Name', key: 'name', width: 20 },
      { header: 'Total Orders', key: 'total_orders', width: 15 },
      { header: 'Total Revenue', key: 'revenue', width: 15 },
      { header: 'Average Order Value', key: 'avg_order_value', width: 20 }
    ];

    const merchants = await Merchant.findAll({
      include: [{
        model: Order,
        as: 'orders',
        where: {
          created_at: {
            [Op.between]: [new Date(dateRange.start), new Date(dateRange.end)]
          },
          ...filters
        }
      }]
    });

    merchants.forEach(merchant => {
      const orders = merchant.orders || [];
      const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.total_amount), 0);
      sheet.addRow({
        name: merchant.business_name,
        total_orders: orders.length,
        revenue: totalRevenue.toFixed(2),
        avg_order_value: orders.length ? (totalRevenue / orders.length).toFixed(2) : '0.00'
      });
    });

    return workbook;
  }

  async generateScheduledReport(config) {
    const { reportType, dateRange, filters } = config;
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
    logger.info(`Excel report generated: ${filePath}`);
    return filePath;
  }

  calculateAverageDeliveryTime(orders) {
    if (!orders.length) return 'N/A';
    const validOrders = orders.filter(o => o.actual_delivery_time && o.created_at);
    if (!validOrders.length) return 'N/A';

    const totalTime = validOrders.reduce((sum, order) => {
      const deliveryTime = new Date(order.actual_delivery_time) - new Date(order.created_at);
      return sum + deliveryTime;
    }, 0);
    return `${Math.round(totalTime / validOrders.length / 60000)} mins`;
  }

  async cleanup(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        await fs.unlink(filePath);
        logger.info(`Temporary Excel file removed: ${filePath}`);
      }
    } catch (error) {
      logger.error({ message: 'Error cleaning up Excel file', error: error.message, timestamp: new Date().toISOString(), context: 'excelCleanup' });
    }
  }
}

module.exports = new ExcelService();