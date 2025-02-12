const { logger, logTransactionEvent } = require('@utils/logger');

class TransactionLogger {
  constructor() {
    this.transactionStack = new Map();
  }

  startTransaction(transactionId, metadata = {}) {
    const startTime = Date.now();
    this.transactionStack.set(transactionId, {
      startTime,
      steps: [],
      metadata
    });

    logTransactionEvent('Transaction started', {
      transactionId,
      startTime,
      ...metadata
    });
  }

  logTransactionStep(transactionId, step, stepData = {}) {
    const transaction = this.transactionStack.get(transactionId);
    if (!transaction) {
      logger.warn(`Attempted to log step for unknown transaction: ${transactionId}`);
      return;
    }

    const stepTime = Date.now();
    const stepInfo = {
      step,
      timestamp: stepTime,
      duration: stepTime - transaction.startTime,
      ...stepData
    };

    transaction.steps.push(stepInfo);
    logTransactionEvent('Transaction step completed', {
      transactionId,
      ...stepInfo
    });
  }

  endTransaction(transactionId, status, finalData = {}) {
    const transaction = this.transactionStack.get(transactionId);
    if (!transaction) {
      logger.warn(`Attempted to end unknown transaction: ${transactionId}`);
      return;
    }

    const endTime = Date.now();
    const duration = endTime - transaction.startTime;

    const transactionSummary = {
      transactionId,
      status,
      startTime: transaction.startTime,
      endTime,
      duration,
      steps: transaction.steps,
      metadata: transaction.metadata,
      ...finalData
    };

    logTransactionEvent('Transaction completed', transactionSummary);
    this.transactionStack.delete(transactionId);

    return transactionSummary;
  }

  async exportTransactionLogs(startDate, endDate, filters = {}) {
    // Implementation would depend on your storage solution
    // This is a placeholder that would need to be adapted
    const exportData = {
      exportTime: new Date(),
      dateRange: { startDate, endDate },
      filters,
      transactions: [] // Would be populated from your log storage
    };

    return exportData;
  }

  generateTransactionReport(transactions) {
    return {
      totalCount: transactions.length,
      statusBreakdown: transactions.reduce((acc, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
      }, {}),
      averageDuration: transactions.reduce((acc, t) => acc + t.duration, 0) / transactions.length,
      // Add more analytics as needed
    };
  }

 // Visualization Methods
 async generateVisualizationData(options = {}) {
    const {
      startDate = new Date(Date.now() - 24 * 60 * 60 * 1000),
      endDate = new Date(),
      groupBy = 'hour', // 'hour', 'day', 'week', 'month'
      transactionTypes = [] // Empty array means all types.
    } = options;

    try {
      const visualizationData = {
        timeline: [],
        summary: {
          total: 0,
          successful: 0,
          failed: 0,
          avgDuration: 0,
          peakTime: null,
          volumeByType: {}
        },
        trends: {
          hourly: [],
          daily: [],
          weekly: []
        },
        performanceMetrics: {
          avgResponseTime: 0,
          p95ResponseTime: 0,
          p99ResponseTime: 0,
          errorRate: 0
        }
      };

      // Get relevant transactions.
      const transactions = Array.from(this.transactionStack.values()).filter(tx => {
        const txDate = new Date(tx.startTime);
        return txDate >= startDate &&
               txDate <= endDate &&
               (transactionTypes.length === 0 || transactionTypes.includes(tx.metadata?.type));
      });

      // Build timeline data.
      visualizationData.timeline = this.buildTransactionTimeline(transactions, groupBy);

      // Calculate summary statistics.
      visualizationData.summary = this.calculateTransactionSummary(transactions);

      // Generate trends.
      visualizationData.trends = this.generateTransactionTrends(transactions);

      // Calculate performance metrics.
      visualizationData.performanceMetrics = this.calculatePerformanceMetrics(transactions);

      return visualizationData;
    } catch (error) {
      logger.error('Error generating transaction visualization data', { error, options });
      throw error;
    }
  }

  buildTransactionTimeline(transactions, groupBy) {
    const timeline = [];
    const groupedTx = new Map();

    // Group transactions by the specified time interval.
    transactions.forEach(tx => {
      const timeKey = this.getTimeKey(new Date(tx.startTime), groupBy);
      if (!groupedTx.has(timeKey)) {
        groupedTx.set(timeKey, {
          timestamp: timeKey,
          count: 0,
          successful: 0,
          failed: 0,
          totalDuration: 0,
          types: new Map()
        });
      }

      const group = groupedTx.get(timeKey);
      group.count++;
      if (tx.status === 'completed') group.successful++;
      if (tx.status === 'failed') group.failed++;
      group.totalDuration += (tx.endTime - tx.startTime);

      const txType = tx.metadata?.type || 'unknown';
      group.types.set(txType, (group.types.get(txType) || 0) + 1);
    });

    // Convert grouped data into timeline format.
    for (const [timeKey, group] of groupedTx) {
      timeline.push({
        timestamp: timeKey,
        count: group.count,
        successful: group.successful,
        failed: group.failed,
        avgDuration: group.totalDuration / group.count,
        typeDistribution: Object.fromEntries(group.types)
      });
    }

    return timeline.sort((a, b) => a.timestamp - b.timestamp);
  }

  calculateTransactionSummary(transactions) {
    const summary = {
      total: transactions.length,
      successful: 0,
      failed: 0,
      avgDuration: 0,
      peakTime: null,
      volumeByType: {}
    };

    let totalDuration = 0;
    let maxTransactionsPerHour = 0;
    const transactionsByHour = new Map();

    transactions.forEach(tx => {
      // Count transaction statuses.
      if (tx.status === 'completed') summary.successful++;
      if (tx.status === 'failed') summary.failed++;

      // Calculate transaction duration.
      const duration = tx.endTime - tx.startTime;
      totalDuration += duration;

      // Track volume by transaction type.
      const txType = tx.metadata?.type || 'unknown';
      summary.volumeByType[txType] = (summary.volumeByType[txType] || 0) + 1;

      // Track hourly volume for peak time determination.
      const hourKey = this.getTimeKey(new Date(tx.startTime), 'hour');
      transactionsByHour.set(hourKey, (transactionsByHour.get(hourKey) || 0) + 1);

      const hourlyCount = transactionsByHour.get(hourKey);
      if (hourlyCount > maxTransactionsPerHour) {
        maxTransactionsPerHour = hourlyCount;
        summary.peakTime = hourKey;
      }
    });

    summary.avgDuration = totalDuration / transactions.length;
    return summary;
  }

  generateTransactionTrends(transactions) {
    return {
      hourly: this.calculateTrend(transactions, 'hour'),
      daily: this.calculateTrend(transactions, 'day'),
      weekly: this.calculateTrend(transactions, 'week')
    };
  }

  calculatePerformanceMetrics(transactions) {
    const durations = transactions.map(tx => tx.endTime - tx.startTime).sort((a, b) => a - b);
    const errorCount = transactions.filter(tx => tx.status === 'failed').length;

    return {
      avgResponseTime: durations.reduce((a, b) => a + b, 0) / durations.length,
      p95ResponseTime: durations[Math.floor(durations.length * 0.95)],
      p99ResponseTime: durations[Math.floor(durations.length * 0.99)],
      errorRate: (errorCount / transactions.length) * 100
    };
  }

  calculateTrend(transactions, interval) {
    const grouped = new Map();
    const trend = [];

    transactions.forEach(tx => {
      const timeKey = this.getTimeKey(new Date(tx.startTime), interval);
      if (!grouped.has(timeKey)) {
        grouped.set(timeKey, {
          timestamp: timeKey,
          count: 0,
          successful: 0,
          failed: 0
        });
      }

      const group = grouped.get(timeKey);
      group.count++;
      if (tx.status === 'completed') group.successful++;
      if (tx.status === 'failed') group.failed++;
    });

    // Convert grouped data into trend format with success rates.
    for (const [_, data] of grouped) {
      trend.push({
        ...data,
        successRate: (data.successful / data.count) * 100
      });
    }

    return trend.sort((a, b) => a.timestamp - b.timestamp);
  }

  getTimeKey(date, interval) {
    switch (interval) {
      case 'hour':
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours());
      case 'day':
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
      case 'week': {
        const start = new Date(date);
        start.setDate(start.getDate() - start.getDay());
        return start;
      }
      case 'month':
        return new Date(date.getFullYear(), date.getMonth(), 1);
      default:
        return date;
    }
  }
}

module.exports = new TransactionLogger();