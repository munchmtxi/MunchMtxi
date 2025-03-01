// src/services/securityAuditLogger.js
const crypto = require('crypto');
const { logger, logSecurityEvent } = require('@utils/logger');

/**
 * A class for logging and auditing security events with a tamper-proof chain.
 * @module SecurityAuditLogger
 */

/**
 * Configuration options for SecurityAuditLogger.
 * @typedef {Object} AuditLoggerConfig
 * @property {string} [hashAlgorithm='sha256'] - Hash algorithm to use (e.g., 'sha256', 'sha512').
 * @property {number} [maxChainLength=1000] - Maximum number of entries before pruning oldest.
 * @property {boolean} [autoValidate=true] - Automatically validate chain on each log.
 */

/**
 * Default configuration for SecurityAuditLogger.
 * @type {AuditLoggerConfig}
 */
const defaultConfig = {
  hashAlgorithm: 'sha256',
  maxChainLength: 1000,
  autoValidate: true
};

/**
 * Class to manage security audit logging with an integrity chain.
 * @class SecurityAuditLogger
 */
class SecurityAuditLogger {
  /**
   * Creates an instance of SecurityAuditLogger.
   * @constructor
   * @param {AuditLoggerConfig} [config=defaultConfig] - Configuration options.
   */
  constructor(config = defaultConfig) {
    this.config = { ...defaultConfig, ...config };
    this.auditChain = [];
    this.lastHash = null;

    // Validate config
    if (!['sha256', 'sha512'].includes(this.config.hashAlgorithm)) {
      throw new Error(`Unsupported hash algorithm: ${this.config.hashAlgorithm}`);
    }
    if (typeof this.config.maxChainLength !== 'number' || this.config.maxChainLength < 1) {
      throw new Error('maxChainLength must be a positive number');
    }
  }

  /**
   * Logs a security audit event and adds it to the chain.
   * @function logSecurityAudit
   * @param {string} event - The security event name (e.g., 'user_login').
   * @param {Object} [metadata={}] - Additional metadata for the event.
   * @returns {Object} The audit entry added to the chain.
   * @throws {Error} If event is invalid or chain validation fails (when autoValidate is true).
   * @description Creates a tamper-proof audit entry with a hash chain.
   */
  logSecurityAudit(event, metadata = {}) {
    if (typeof event !== 'string' || event.trim() === '') {
      throw new Error('Event must be a non-empty string');
    }

    const timestamp = new Date().toISOString();
    const auditEntry = {
      event: event.trim(),
      timestamp,
      metadata: { ...metadata },
      previousHash: this.lastHash,
      type: 'security-audit'
    };

    // Create hash of the current entry
    const entryString = JSON.stringify({ ...auditEntry, hash: undefined });
    auditEntry.hash = crypto
      .createHash(this.config.hashAlgorithm)
      .update(entryString)
      .digest('hex');

    // Manage chain length
    if (this.auditChain.length >= this.config.maxChainLength) {
      this.auditChain.shift(); // Remove oldest entry
      logger.debug('Audit chain pruned due to max length', { maxLength: this.config.maxChainLength });
    }

    // Add to chain and update last hash
    this.auditChain.push(auditEntry);
    this.lastHash = auditEntry.hash;

    // Log the event
    logSecurityEvent(event, {
      ...metadata,
      auditHash: auditEntry.hash,
      timestamp
    });

    // Auto-validate if configured
    if (this.config.autoValidate && !this.validateAuditChain()) {
      logger.error('Audit chain validation failed after logging', { event, hash: auditEntry.hash });
      throw new Error('Audit chain integrity compromised');
    }

    return auditEntry;
  }

  /**
   * Validates the integrity of the audit chain.
   * @function validateAuditChain
   * @returns {boolean} True if the chain is valid, false otherwise.
   * @description Verifies the hash chain and entry integrity.
   */
  validateAuditChain() {
    let isValid = true;
    let previousHash = null;

    for (const [index, entry] of this.auditChain.entries()) {
      // Verify previous hash link
      if (entry.previousHash !== previousHash) {
        isValid = false;
        logger.error('Audit chain integrity violation', {
          entry,
          index,
          expectedPrevious: previousHash,
          actualPrevious: entry.previousHash,
          type: 'security-alert'
        });
      }

      // Verify entry hash
      const computedHash = crypto
        .createHash(this.config.hashAlgorithm)
        .update(JSON.stringify({ ...entry, hash: undefined }))
        .digest('hex');

      if (computedHash !== entry.hash) {
        isValid = false;
        logger.error('Audit entry tampering detected', {
          entry,
          index,
          computedHash,
          recordedHash: entry.hash,
          type: 'security-alert'
        });
      }

      previousHash = entry.hash;
    }

    logger.debug('Audit chain validation completed', { isValid, chainLength: this.auditChain.length });
    return isValid;
  }

  /**
   * Generates a compliance report for a specified time period.
   * @function generateComplianceReport
   * @param {string|Date} startDate - Start of the reporting period (ISO string or Date).
   * @param {string|Date} endDate - End of the reporting period (ISO string or Date).
   * @param {string} [complianceStandard='general'] - Compliance standard (e.g., 'GDPR', 'HIPAA').
   * @returns {Object} The compliance report object.
   * @throws {Error} If dates are invalid or startDate is after endDate.
   * @description Summarizes security events for compliance purposes.
   */
  generateComplianceReport(startDate, endDate, complianceStandard = 'general') {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Invalid startDate or endDate: must be valid ISO strings or Date objects');
    }
    if (start > end) {
      throw new Error('startDate must be before endDate');
    }

    const relevantEntries = this.auditChain.filter(
      entry => new Date(entry.timestamp) >= start && new Date(entry.timestamp) <= end
    );

    const report = {
      period: { startDate: start.toISOString(), endDate: end.toISOString() },
      standard: complianceStandard,
      totalEvents: relevantEntries.length,
      eventCategories: {},
      criticalEvents: [],
      systemChanges: [],
      accessAttempts: [],
      integrityChecks: {
        chainValid: this.validateAuditChain(),
        coveredEntries: relevantEntries.length,
        totalEntries: this.auditChain.length
      }
    };

    relevantEntries.forEach(entry => {
      report.eventCategories[entry.event] = (report.eventCategories[entry.event] || 0) + 1;
      if (entry.metadata?.severity === 'critical') report.criticalEvents.push(entry);
      if (entry.event.includes('system_change')) report.systemChanges.push(entry);
      if (entry.event.includes('access')) report.accessAttempts.push(entry);
    });

    logger.info('Compliance report generated', { standard: complianceStandard, totalEvents: report.totalEvents });
    return report;
  }

  /**
   * Exports audit logs in a specified format.
   * @function exportAuditLogs
   * @param {string} [format='json'] - Export format ('json', 'csv', 'xml').
   * @returns {string} The exported audit logs as a string.
   * @throws {Error} If format is unsupported.
   * @description Exports the audit chain in a chosen format for analysis or backup.
   */
  exportAuditLogs(format = 'json') {
    const formatLower = format.toLowerCase();

    switch (formatLower) {
      case 'json':
        return JSON.stringify(this.auditChain, null, 2);
      case 'csv':
        const header = 'timestamp,event,hash,metadata\n';
        return header + this.auditChain
          .map(entry => `${entry.timestamp},${entry.event},${entry.hash},"${JSON.stringify(entry.metadata).replace(/"/g, '""')}"`)
          .join('\n');
      case 'xml':
        const xmlEntries = this.auditChain
          .map(entry => `<entry>
            <timestamp>${entry.timestamp}</timestamp>
            <event>${entry.event}</event>
            <hash>${entry.hash}</hash>
            <metadata>${JSON.stringify(entry.metadata)}</metadata>
          </entry>`)
          .join('\n');
        return `<?xml version="1.0" encoding="UTF-8"?>\n<auditChain>\n${xmlEntries}\n</auditChain>`;
      default:
        throw new Error(`Unsupported export format: ${format}. Use 'json', 'csv', or 'xml'`);
    }
  }

  /**
   * Retrieves audit entries matching a specific event type.
   * @function getEntriesByEvent
   * @param {string} event - The event type to filter by.
   * @returns {Object[]} Array of matching audit entries.
   * @throws {Error} If event is invalid.
   * @description Filters the audit chain by event type.
   */
  getEntriesByEvent(event) {
    if (typeof event !== 'string' || event.trim() === '') {
      throw new Error('Event must be a non-empty string');
    }
    return this.auditChain.filter(entry => entry.event === event.trim());
  }

  /**
   * Clears the audit chain (useful for testing or reset).
   * @function clearAuditChain
   * @description Resets the audit chain and last hash.
   */
  clearAuditChain() {
    this.auditChain = [];
    this.lastHash = null;
    logger.info('Audit chain cleared');
  }
}

module.exports = new SecurityAuditLogger();