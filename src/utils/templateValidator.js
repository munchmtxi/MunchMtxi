// src/utils/templateValidator.js
const AppError = require('./AppError');

class TemplateValidator {
  static validate(template) {
    this.validateBasicStructure(template);
    this.validateByType(template);
    return true;
  }

  static validateBasicStructure(template) {
    const requiredFields = ['name', 'type', 'content'];
    const missingFields = requiredFields.filter(field => !template[field]);
    
    if (missingFields.length > 0) {
      throw new AppError(`Missing required fields: ${missingFields.join(', ')}`, 400);
    }
  }

  static validateByType(template) {
    const validators = {
      EMAIL: () => this.validateEmailTemplate(template),
      SMS: () => this.validateSMSTemplate(template),
      WHATSAPP: () => this.validateWhatsAppTemplate(template)
    };

    const validator = validators[template.type];
    if (!validator) {
      throw new AppError(`Unsupported template type: ${template.type}`, 400);
    }

    return validator();
  }

  static validateEmailTemplate(template) {
    if (!template.subject) {
      throw new AppError('Email templates require a subject', 400);
    }
  }

  static validateSMSTemplate(template) {
    if (template.content.length > 160) {
      throw new AppError('SMS template content exceeds 160 characters', 400);
    }
  }

  static validateWhatsAppTemplate(template) {
    // Add WhatsApp-specific validation rules
    const maxLength = 4096;
    if (template.content.length > maxLength) {
      throw new AppError(`WhatsApp template content exceeds ${maxLength} characters`, 400);
    }
  }
}

module.exports = TemplateValidator;