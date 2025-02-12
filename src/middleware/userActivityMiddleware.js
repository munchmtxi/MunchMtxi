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
}

module.exports = new SecurityAuditLogger();