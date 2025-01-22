const { registerUser, loginUser } = require('../services/authService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

const register = catchAsync(async (req, res) => {
  const user = await registerUser(req.body);
  res.status(201).json({
    status: 'success',
    data: user,
  });
});

const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const { user, token } = await loginUser(email, password);
  res.status(200).json({
    status: 'success',
    data: { user, token },
  });
});

module.exports = { register, login };