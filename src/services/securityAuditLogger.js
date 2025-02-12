const { logger, logSecurityEvent } = require('@utils/logger');
const crypto = require('crypto');

class SecurityAuditLogger {
  constructor() {
    this.auditChain = [];
    this.lastHash = null;
  }

  logSecurityAudit(event, metadata = {}) {
    const timestamp = new Date();
    const auditEntry = {
      event,
      timestamp,
      ...metadata,
      previousHash: this.lastHash,
      type: 'security-audit'
    };

    // Create a hash of the current entry
    const entryString = JSON.stringify(auditEntry);
    auditEntry.hash = crypto
      .createHash('sha256')
      .update(entryString)
      .digest('hex');

    // Update the chain
    this.lastHash = auditEntry.hash;
    this.auditChain.push(auditEntry);

    // Log the security event
    logSecurityEvent(event, {
      ...metadata,
      auditHash: auditEntry.hash
    });

    return auditEntry;
  }

  validateAuditChain() {
    let isValid = true;
    let previousHash = null;

    for (const entry of this.auditChain) {
      // Verify hash chain
      if (entry.previousHash !== previousHash) {
        isValid = false;
        logger.error('Audit chain integrity violation', {
          entry,
          expectedPrevious: previousHash,
          type: 'security-alert'
        });
      }

      // Verify entry hash
      const computedHash = crypto
        .createHash('sha256')
        .update(JSON.stringify({
          ...entry,
          hash: undefined // Exclude the hash field from rehashing
        }))
        .digest('hex');

      if (computedHash !== entry.hash) {
        isValid = false;
        logger.error('Audit entry tampering detected', {
          entry,
          computedHash,
          type: 'security-alert'
        });
      }

      previousHash = entry.hash;
    }

    return isValid;
  }

  generateComplianceReport(startDate, endDate, complianceStandard = 'general') {
    const relevantEntries = this.auditChain.filter(
      entry => entry.timestamp >= startDate && entry.timestamp <= endDate
    );

    const report = {
      period: { startDate, endDate },
      standard: complianceStandard,
      totalEvents: relevantEntries.length,
      eventCategories: {},
      criticalEvents: [],
      systemChanges: [],
      accessAttempts: [],
      integrityChecks: {
        chainValid: this.validateAuditChain(),
        covered: relevantEntries.length
      }
    };

    // Categorize events
    relevantEntries.forEach(entry => {
      report.eventCategories[entry.event] = (report.eventCategories[entry.event] || 0) + 1;

      if (entry.metadata?.severity === 'critical') {
        report.criticalEvents.push(entry);
      }
      if (entry.event.includes('system_change')) {
        report.systemChanges.push(entry);
      }
      if (entry.event.includes('access')) {
        report.accessAttempts.push(entry);
      }
    });

    return report;
  }

  exportAuditLogs(format = 'json') {
    switch (format.toLowerCase()) {
      case 'json':
        return JSON.stringify(this.auditChain, null, 2);
      case 'csv':
        // Implementation for CSV export
        return this.auditChain
          .map(entry => {
            return `${entry.timestamp},${entry.event},${entry.hash},${JSON.stringify(entry.metadata)}`;
          })
          .join('\n');
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  async generateAuditVisualizationData(options = {}) {
    const {
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      endDate = new Date(),
      categories = [],
      includeMetadata = true
    } = options;

    try {
      const visualizationData = {
        timeline: [],
        categorySummary: {},
        complianceMetrics: {},
        riskIndicators: [],
        metadata: includeMetadata
          ? {
              startDate,
              endDate,
              totalEvents: 0,
              integrityStatus: await this.validateAuditChain()
            }
          : null
      };

      // Filter relevant audit entries
      const relevantEntries = this.auditChain.filter(entry =>
        entry.timestamp >= startDate &&
        entry.timestamp <= endDate &&
        (categories.length === 0 || categories.includes(entry.event))
      );

      // Build timeline data
      visualizationData.timeline = this.buildAuditTimeline(relevantEntries);

      // Generate category summary
      visualizationData.categorySummary = this.generateCategorySummary(relevantEntries);

      // Calculate compliance metrics
      visualizationData.complianceMetrics = this.calculateComplianceMetrics(relevantEntries);

      // Generate risk indicators
      visualizationData.riskIndicators = this.generateRiskIndicators(relevantEntries);

      if (includeMetadata) {
        visualizationData.metadata.totalEvents = relevantEntries.length;
      }

      return visualizationData;
    } catch (error) {
      logger.error('Error generating audit visualization data', { error, options });
      throw error;
    }
  }

  buildAuditTimeline(entries) {
    const timeline = entries.map(entry => ({
      timestamp: entry.timestamp,
      event: entry.event,
      severity: entry.metadata?.severity || 'info',
      category: this.categorizeAuditEvent(entry.event),
      hash: entry.hash,
      metadata: entry.metadata
    }));

    return timeline.sort((a, b) => a.timestamp - b.timestamp);
  }

  generateCategorySummary(entries) {
    const summary = {};
    
    entries.forEach(entry => {
      const category = this.categorizeAuditEvent(entry.event);
      if (!summary[category]) {
        summary[category] = {
          count: 0,
          criticalCount: 0,
          lastOccurrence: null
        };
      }

      summary[category].count++;
      if (entry.metadata?.severity === 'critical') {
        summary[category].criticalCount++;
      }
      
      const timestamp = new Date(entry.timestamp);
      if (!summary[category].lastOccurrence || timestamp > summary[category].lastOccurrence) {
        summary[category].lastOccurrence = timestamp;
      }
    });

    return summary;
  }

  calculateComplianceMetrics(entries) {
    const metrics = {
      overall: {
        compliant: 0,
        nonCompliant: 0,
        score: 0
      },
      byCategory: {}
    };

    entries.forEach(entry => {
      const category = this.categorizeAuditEvent(entry.event);
      
      if (!metrics.byCategory[category]) {
        metrics.byCategory[category] = {
          compliant: 0,
          nonCompliant: 0,
          score: 0
        };
      }

      const isCompliant = this.checkEventCompliance(entry);
      if (isCompliant) {
        metrics.overall.compliant++;
        metrics.byCategory[category].compliant++;
      } else {
        metrics.overall.nonCompliant++;
        metrics.byCategory[category].nonCompliant++;
      }
    });

    // Calculate scores
    metrics.overall.score = this.calculateComplianceScore(
      metrics.overall.compliant,
      metrics.overall.nonCompliant
    );

    Object.keys(metrics.byCategory).forEach(category => {
      metrics.byCategory[category].score = this.calculateComplianceScore(
        metrics.byCategory[category].compliant,
        metrics.byCategory[category].nonCompliant
      );
    });

    return metrics;
  }

  generateRiskIndicators(entries) {
    const indicators = [];
    
    // Analyze frequency patterns
    const frequencyAnalysis = this.analyzeEventFrequency(entries);
    if (frequencyAnalysis.anomalies.length > 0) {
      indicators.push(...frequencyAnalysis.anomalies);
    }

    // Check for critical events proximity
    const criticalEvents = entries.filter(e => e.metadata?.severity === 'critical');
    if (criticalEvents.length >= 2) {
      const proximityIssues = this.analyzeCriticalEventProximity(criticalEvents);
      indicators.push(...proximityIssues);
    }

    // Analyze compliance patterns
    const complianceIssues = this.analyzeCompliancePatterns(entries);
    indicators.push(...complianceIssues);

    return indicators.sort((a, b) => b.severity - a.severity);
  }

  // Private helper methods
  private categorizeAuditEvent(event) {
    // Implement your categorization logic
    if (event.includes('auth')) return 'authentication';
    if (event.includes('permission')) return 'authorization';
    if (event.includes('data')) return 'data_access';
    if (event.includes('config')) return 'configuration';
    return 'general';
  }

  private checkEventCompliance(entry) {
    // Implement your compliance checking logic
    return !entry.metadata?.compliance?.violations;
  }

  private calculateComplianceScore(compliant, nonCompliant) {
    const total = compliant + nonCompliant;
    return total === 0 ? 100 : Math.round((compliant / total) * 100);
  }
}

module.exports = new SecurityAuditLogger();