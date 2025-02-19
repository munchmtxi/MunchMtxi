// src/routes/pdfRoutes.js
const express = require('express');
const router = express.Router();
const pdfController = require('../controllers/pdfController');
const catchAsync = require('../utils/catchAsync');

// Generate single PDF
router.post('/generate', catchAsync(pdfController.generatePDF.bind(pdfController)));

// Generate batch PDFs
router.post('/batch', catchAsync(pdfController.generateBatchPDFs.bind(pdfController)));

// Preview template
router.post('/preview', catchAsync(pdfController.previewTemplate.bind(pdfController)));

// Validate template data
router.post('/validate', catchAsync(pdfController.validateTemplateData.bind(pdfController)));

module.exports = router;