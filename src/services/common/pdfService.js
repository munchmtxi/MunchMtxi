// src/services/pdfService.js
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const logger = require('../../utils/logger');
const TemplateProcessor = require('../../utils/templateProcessor');

class PDFService {
  constructor() {
    this.processor = TemplateProcessor;
    this.tempDir = path.join(__dirname, '../../temp/pdf');
    
    // Ensure temp directory exists
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  async generatePDF(template, data, options = {}) {
    try {
      const processedContent = this.processor.process(template, data);
      const doc = new PDFDocument(options);
      
      const filePath = path.join(this.tempDir, `${template.id}-${Date.now()}.pdf`);
      const stream = fs.createWriteStream(filePath);
      
      doc.pipe(stream);
      
      await this.renderContent(doc, processedContent);
      
      doc.end();
      
      return new Promise((resolve, reject) => {
        stream.on('finish', () => {
          logger.info(`PDF generated successfully: ${filePath}`);
          resolve(filePath);
        });
        stream.on('error', (error) => {
          logger.error(`Error generating PDF: ${error.message}`);
          reject(error);
        });
      });
    } catch (error) {
      logger.error(`PDF generation failed: ${error.message}`);
      throw error;
    }
  }

  async generateBatch(template, dataArray, options = {}) {
    try {
      const results = await Promise.all(
        dataArray.map(data => this.generatePDF(template, data, options))
      );
      logger.info(`Batch PDF generation completed. Generated ${results.length} files`);
      return results;
    } catch (error) {
      logger.error(`Batch PDF generation failed: ${error.message}`);
      throw error;
    }
  }

  async renderContent(doc, content) {
    if (content.title) {
      doc.fontSize(18).text(content.title, { align: 'center' });
      doc.moveDown();
    }

    if (content.subtitle) {
      doc.fontSize(14).text(content.subtitle, { align: 'center' });
      doc.moveDown();
    }

    if (content.body) {
      doc.fontSize(12).text(content.body);
      doc.moveDown();
    }

    if (content.footer) {
      doc.fontSize(10).text(content.footer, {
        align: 'center',
        bottom: 30
      });
    }
  }

  // Cleanup method to remove temporary files
  async cleanup(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        logger.info(`Temporary PDF file removed: ${filePath}`);
      }
    } catch (error) {
      logger.error(`Error cleaning up PDF file: ${error.message}`);
    }
  }
}

module.exports = new PDFService();