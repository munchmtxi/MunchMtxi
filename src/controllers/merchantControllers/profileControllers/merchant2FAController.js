// @controllers/merchantControllers/profileControllers/merchant2FAController.js
const merchant2FAService = require('@services/merchantServices/profileServices/merchant2FAService');
const catchAsync = require('@utils/catchAsync');

const setup2FA = catchAsync(async (req, res) => {
  const result = await merchant2FAService.setupAuthenticator(req.user.id);
  
  res.status(200).json({
    status: 'success',
    data: result
  });
});

const enable2FA = catchAsync(async (req, res) => {
  const { token, method } = req.body;
  
  const result = await merchant2FAService.enable2FA(
    req.user.id,
    token,
    method
  );

  res.status(200).json({
    status: 'success',
    data: result
  });
});

const verify2FA = catchAsync(async (req, res) => {
  const { token, method } = req.body;

  await merchant2FAService.verify2FA(
    req.user.id,
    token,
    method
  );

  res.status(200).json({
    status: 'success',
    message: '2FA verification successful'
  });
});

const disable2FA = catchAsync(async (req, res) => {
  const { token } = req.body;

  const result = await merchant2FAService.disable2FA(
    req.user.id,
    token
  );

  res.status(200).json({
    status: 'success',
    data: result
  });
});

const updatePreferredMethod = catchAsync(async (req, res) => {
  const { newMethod, token } = req.body;

  const result = await merchant2FAService.updatePreferredMethod(
    req.user.id,
    newMethod,
    token
  );

  res.status(200).json({
    status: 'success',
    data: result
  });
});

const generateBackupCodes = catchAsync(async (req, res) => {
  const { token } = req.body;

  const result = await merchant2FAService.generateNewBackupCodes(
    req.user.id,
    token
  );

  res.status(200).json({
    status: 'success',
    data: result
  });
});

module.exports = {
  setup2FA,
  enable2FA,
  verify2FA,
  disable2FA,
  updatePreferredMethod,
  generateBackupCodes
};