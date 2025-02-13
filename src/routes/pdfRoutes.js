// src/routes/pdfRoutes.js
const express = require('express');
const router = express.Router();
const { Template } = require('../models');
const pdfService = require('../services/pdfService');
const logger = require('../utils/logger');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

router.post('/generate', catchAsync(async (req, res) => {
  const { templateId, data, options } = req.body;
  
  const template = await Template.findByPk(templateId);
  if (!template) {
    throw new AppError('Template not found', 404);
  }
  
  if (template.type !== 'PDF') {
    throw new AppError('Invalid template type. Expected PDF template.', 400);
  }
  
  const pdfPath = await pdfService.generatePDF(template, data, options);
  
  res.download(pdfPath, `${template.name}.pdf`, async (err) => {
    if (err) {
      logger.error(`Error sending PDF: ${err.message}`);
    }
    // Cleanup after sending
    await pdfService.cleanup(pdfPath);
  });
}));

router.post('/batch', catchAsync(async (req, res) => {
  const { templateId, dataArray, options } = req.body;
  
  if (!Array.isArray(dataArray)) {
    throw new AppError('dataArray must be an array', 400);
  }
  
  const template = await Template.findByPk(templateId);
  if (!template) {
    throw new AppError('Template not found', 404);
  }
  
  if (template.type !== 'PDF') {
    throw new AppError('Invalid template type. Expected PDF template.', 400);
  }
  
  const pdfPaths = await pdfService.generateBatch(template, dataArray, options);
  
  // Create a ZIP file containing all PDFs
  const archiver = require('archiver');
  const archive = archiver('zip');
  
  res.attachment(`${template.name}-batch.zip`);
  archive.pipe(res);
  
  // Add each PDF to the ZIP
  pdfPaths.forEach((pdfPath, index) => {
    archive.file(pdfPath, { name: `${template.name}-${index + 1}.pdf` });
  });
  
  archive.finalize();
  
  // Cleanup after sending
  res.on('finish', async () => {
    for (const path of pdfPaths) {
      await pdfService.cleanup(path);
    }
  });
}));

module.exports = router;