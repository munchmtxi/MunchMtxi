/**
 * Wraps an asynchronous function and forwards any errors to the Express error handler.
 *
 * @function catchAsync
 * @param {Function} fn - The asynchronous function to be wrapped (typically an Express route handler).
 * @returns {Function} A new function that handles the promise rejection and passes errors to next().
 *
 * @example
 * const catchAsync = require('./utils/catchAsync');
 * 
 * // Usage in an Express route
 * app.get('/users', catchAsync(async (req, res, next) => {
 *   const users = await User.find();
 *   res.status(200).json(users);
 * }));
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = catchAsync;
