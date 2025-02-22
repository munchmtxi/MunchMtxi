// @controllers/merchantControllers/profileControllers/passwordController.js
const merchantPasswordService = require('@services/merchantServices/profileServices/merchantPasswordService');
const catchAsync = require('@utils/catchAsync');

const changePassword = catchAsync(async (req, res) => {
  const result = await merchantPasswordService.changePassword(
    req.user.id,
    {
      currentPassword: req.body.currentPassword,
      newPassword: req.body.newPassword
    },
    req.ip
  );

  res.status(200).json({
    status: 'success',
    data: result
  });
});

const getPasswordHistory = catchAsync(async (req, res) => {
  const history = await merchantPasswordService.getPasswordHistory(req.user.id);
  
  res.status(200).json({
    status: 'success',
    data: { history }
  });
});

const getPasswordStrength = catchAsync(async (req, res) => {
  const strengthInfo = await merchantPasswordService.getPasswordStrength(req.user.id);
  
  res.status(200).json({
    status: 'success',
    data: strengthInfo
  });
});

module.exports = {
  changePassword,
  getPasswordHistory,
  getPasswordStrength
};