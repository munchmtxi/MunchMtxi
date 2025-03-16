const PreviewService = require('@services/merchant/profile/previewService');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');

class PreviewController {
  startPreview = async (req, res, next) => {
    try {
      const merchantId = req.merchantId; // Use pre-parsed value
      const userId = req.user.id;

      const previewData = await PreviewService.startPreview(merchantId, userId);
      res.status(200).json({
        status: 'success',
        data: previewData,
      });
    } catch (error) {
      logger.error('Error starting preview', { error: error.message, merchantId: req.merchantId });
      next(error);
    }
  };

  updatePreview = async (req, res, next) => {
    try {
      const merchantId = parseInt(req.params.merchantId); // Keep parsing here for now
      const userId = req.user.id;
      const updates = req.body;

      const previewData = await PreviewService.updatePreview(merchantId, userId, updates);
      res.status(200).json({
        status: 'success',
        data: previewData,
      });
    } catch (error) {
      logger.error('Error updating preview', { error: error.message, merchantId: req.params.merchantId });
      next(error);
    }
  };

  endPreview = async (req, res, next) => {
    try {
      const merchantId = parseInt(req.params.merchantId);
      const userId = req.user.id;

      const session = await PreviewService.endPreview(merchantId, userId);
      res.status(200).json({
        status: 'success',
        data: session || { message: 'Preview session ended' },
      });
    } catch (error) {
      logger.error('Error ending preview', { error: error.message, merchantId: req.params.merchantId });
      next(error);
    }
  };

  getPreview = async (req, res, next) => {
    try {
      const merchantId = parseInt(req.params.merchantId);
      const session = await PreviewService.getPreviewSession(merchantId);

      if (!session) {
        throw new AppError('No active preview session found', 404, 'NO_PREVIEW_SESSION');
      }

      if (session.userId !== req.user.id) {
        throw new AppError('Unauthorized to view this preview', 403, 'UNAUTHORIZED_PREVIEW');
      }

      res.status(200).json({
        status: 'success',
        data: session.previewData,
      });
    } catch (error) {
      logger.error('Error retrieving preview', { error: error.message, merchantId: req.params.merchantId });
      next(error);
    }
  };
}

module.exports = new PreviewController();