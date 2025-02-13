// src/utils/templateProcessor.js
const AppError = require('./AppError');

class TemplateProcessor {
  static validateVariables(template, variables) {
    const requiredVariables = this.extractRequiredVariables(template.content);
    const missingVariables = requiredVariables.filter(v => !variables.hasOwnProperty(v));
    
    if (missingVariables.length > 0) {
      throw new AppError(`Missing required variables: ${missingVariables.join(', ')}`, 400);
    }
  }

  static extractRequiredVariables(content) {
    const regex = /\{\{([\w.-]+)\}\}/g;
    const matches = content.matchAll(regex);
    return [...new Set([...matches].map(m => m[1]))];
  }

  static process(template, variables) {
    // Validate required variables
    this.validateVariables(template, variables);
    
    let processedContent = template.content;
    
    // Replace all placeholders with their values
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      processedContent = processedContent.replace(regex, value);
    });
    
    // Format based on template type
    return this.formatByType(template.type, {
      content: processedContent,
      subject: template.subject,
      variables
    });
  }

  static formatByType(type, { content, subject, variables }) {
    const formatters = {
      SMS: () => this.formatSMS(content),
      EMAIL: () => this.formatEmail(content, subject, variables),
      WHATSAPP: () => this.formatWhatsApp(content),
      PDF: () => this.formatPDF(content, variables)
    };

    const formatter = formatters[type];
    if (!formatter) {
      throw new AppError(`Unsupported template type: ${type}`, 400);
    }

    return formatter();
  }

  static formatSMS(content) {
    // SMS-specific formatting
    const truncated = content.substring(0, 160);
    if (truncated.length < content.length) {
      return truncated + '...';
    }
    return truncated;
  }

  static formatEmail(content, subject, variables) {
    const processedSubject = subject.replace(/\{\{([\w.-]+)\}\}/g, (_, key) => 
      variables[key] || '');
    
    return {
      subject: processedSubject,
      body: content
    };
  }

  static formatWhatsApp(content) {
    // WhatsApp-specific formatting - handle markdown and line breaks
    return content.replace(/\n/g, '\n\n');
  }

  static formatPDF(content, variables) {
    const contentObj = typeof content === 'string' 
      ? JSON.parse(content) 
      : content;

    // Process each section of the PDF template
    return Object.entries(contentObj).reduce((acc, [key, value]) => {
      acc[key] = this.processSection(value, variables);
      return acc;
    }, {});
  }

  static processSection(section, variables) {
    if (typeof section === 'string') {
      return this.replaceVariables(section, variables);
    }
    if (Array.isArray(section)) {
      return section.map(item => this.processSection(item, variables));
    }
    if (typeof section === 'object' && section !== null) {
      return Object.entries(section).reduce((acc, [key, value]) => {
        acc[key] = this.processSection(value, variables);
        return acc;
      }, {});
    }
    return section;
  }

  static replaceVariables(text, variables) {
    return text.replace(/\{\{([\w.-]+)\}\}/g, (_, key) => variables[key] || '');
  }
}

module.exports = TemplateProcessor;
