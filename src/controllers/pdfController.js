// src/controllers/pdfController.js
const { Template } = require('../models');
const pdfService = require('../services/pdfService');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');

class PDFController {
  /**
   * Generate a single PDF from template
   */
  async generatePDF(req, res, next) {
    try {
      const { templateId, data, options } = req.body;

      // Validate request body
      if (!templateId || !data) {
        throw new AppError('Template ID and data are required', 400);
      }

      // Get template
      const template = await Template.findByPk(templateId);
      if (!template) {
        throw new AppError('Template not found', 404);
      }

      // Validate template type
      if (template.type !== 'PDF') {
        throw new AppError('Invalid template type. Expected PDF template.', 400);
      }

      // Generate PDF
      const pdfPath = await pdfService.generatePDF(template, data, options);

      // Send file
      res.download(pdfPath, `${template.name}.pdf`, async (err) => {
        if (err) {
          logger.error('Error sending PDF:', {
            error: err.message,
            templateId,
            userId: req.user?.id
          });
        }
        // Cleanup after sending
        await pdfService.cleanup(pdfPath);
      });
    } catch (error) {
      // If error occurs, ensure any generated files are cleaned up
      if (error.pdfPath) {
        await pdfService.cleanup(error.pdfPath);
      }
      next(error);
    }
  }

  /**
   * Generate multiple PDFs in batch
   */
  async generateBatchPDFs(req, res, next) {
    try {
      const { templateId, dataArray, options } = req.body;

      // Validate request body
      if (!templateId || !Array.isArray(dataArray)) {
        throw new AppError('Template ID and data array are required', 400);
      }

      // Validate array size
      if (dataArray.length === 0) {
        throw new AppError('Data array cannot be empty', 400);
      }

      if (dataArray.length > 100) {
        throw new AppError('Batch size cannot exceed 100 documents', 400);
      }

      // Get template
      const template = await Template.findByPk(templateId);
      if (!template) {
        throw new AppError('Template not found', 404);
      }

      // Validate template type
      if (template.type !== 'PDF') {
        throw new AppError('Invalid template type. Expected PDF template.', 400);
      }

      // Generate PDFs
      const pdfPaths = await pdfService.generateBatch(template, dataArray, options);

      // Create ZIP archive
      const archiver = require('archiver');
      const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
      });

      // Set response headers
      res.attachment(`${template.name}-batch.zip`);

      // Pipe archive data to response
      archive.pipe(res);

      // Add each PDF to the archive
      pdfPaths.forEach((pdfPath, index) => {
        archive.file(pdfPath, { 
          name: `${template.name}-${index + 1}.pdf` 
        });
      });

      // Listen for all archive data to be written
      archive.on('error', (err) => {
        throw new AppError('Error creating ZIP archive', 500, err);
      });

      // Finalize archive
      await archive.finalize();

      // Cleanup after sending
      res.on('finish', async () => {
        try {
          await Promise.all(pdfPaths.map(path => pdfService.cleanup(path)));
          logger.info('Batch PDF files cleaned up successfully', {
            templateId,
            count: pdfPaths.length,
            userId: req.user?.id
          });
        } catch (error) {
          logger.error('Error cleaning up batch PDF files:', {
            error: error.message,
            templateId,
            userId: req.user?.id
          });
        }
      });
    } catch (error) {
      // If error occurs, ensure any generated files are cleaned up
      if (error.pdfPaths) {
        await Promise.all(error.pdfPaths.map(path => pdfService.cleanup(path)));
      }
      next(error);
    }
  }

  /**
   * Preview PDF template with sample data
   */
  async previewTemplate(req, res, next) {
    try {
      const { templateId, sampleData } = req.body;

      const template = await Template.findByPk(templateId);
      if (!template) {
        throw new AppError('Template not found', 404);
      }

      if (template.type !== 'PDF') {
        throw new AppError('Invalid template type. Expected PDF template.', 400);
      }

      const pdfPath = await pdfService.generatePDF(template, sampleData || template.sampleData);

      res.download(pdfPath, `${template.name}-preview.pdf`, async (err) => {
        if (err) {
          logger.error('Error sending PDF preview:', {
            error: err.message,
            templateId,
            userId: req.user?.id
          });
        }
        await pdfService.cleanup(pdfPath);
      });
    } catch (error) {
      if (error.pdfPath) {
        await pdfService.cleanup(error.pdfPath);
      }
      next(error);
    }
  }

  /**
   * Validate template data without generating PDF
   */
  async validateTemplateData(req, res, next) {
    try {
      const { templateId, data } = req.body;

      const template = await Template.findByPk(templateId);
      if (!template) {
        throw new AppError('Template not found', 404);
      }

      if (template.type !== 'PDF') {
        throw new AppError('Invalid template type. Expected PDF template.', 400);
      }

      // Use template processor to validate variables
      const validation = await pdfService.processor.validateVariables(template, data);

      res.json({
        status: 'success',
        data: {
          valid: true,
          templateId,
          variables: validation
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PDFController();