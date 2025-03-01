// src/utils/mathUtils.js

/**
 * A collection of mathematical utility functions for calculations, rounding, and geospatial operations.
 * @module mathUtils
 */

/**
 * Rounds a number to a specified number of decimal places.
 * @param {number} num - The number to round.
 * @param {number} [decimals=2] - The number of decimal places (default: 2).
 * @returns {number} The rounded number.
 * @throws {Error} If inputs are not valid numbers.
 */
function roundToDecimal(num, decimals = 2) {
    if (typeof num !== 'number' || isNaN(num) || typeof decimals !== 'number' || isNaN(decimals)) {
      throw new Error('Invalid input: num and decimals must be numbers');
    }
    const factor = Math.pow(10, decimals);
    return Math.round(num * factor) / factor;
  }
  
  /**
   * Calculates the sum of an array of numbers.
   * @param {number[]} arr - The array of numbers to sum.
   * @returns {number} The sum of the array elements.
   * @throws {Error} If the array is empty or contains non-numeric values.
   */
  function sumArray(arr) {
    if (!Array.isArray(arr) || arr.length === 0) {
      throw new Error('Invalid input: arr must be a non-empty array');
    }
    return arr.reduce((sum, num) => {
      if (typeof num !== 'number' || isNaN(num)) {
        throw new Error('Invalid array element: all elements must be numbers');
      }
      return sum + num;
    }, 0);
  }
  
  /**
   * Calculates the average of an array of numbers.
   * @param {number[]} arr - The array of numbers to average.
   * @returns {number} The average of the array elements.
   * @throws {Error} If the array is empty or contains non-numeric values.
   */
  function averageArray(arr) {
    const sum = sumArray(arr);
    return sum / arr.length;
  }
  
  /**
   * Calculates the distance between two geographic coordinates using the Haversine formula.
   * @param {number} lat1 - Latitude of first point in degrees.
   * @param {number} lon1 - Longitude of first point in degrees.
   * @param {number} lat2 - Latitude of second point in degrees.
   * @param {number} lon2 - Longitude of second point in degrees.
   * @returns {number} Distance in kilometers.
   * @throws {Error} If coordinates are invalid.
   */
  function calculateDistance(lat1, lon1, lat2, lon2) {
    const validateCoord = (coord, type) => {
      if (typeof coord !== 'number' || isNaN(coord)) {
        throw new Error(`Invalid ${type}: must be a number`);
      }
      if (type === 'latitude' && (coord < -90 || coord > 90)) {
        throw new Error('Latitude must be between -90 and 90');
      }
      if (type === 'longitude' && (coord < -180 || coord > 180)) {
        throw new Error('Longitude must be between -180 and 180');
      }
    };
  
    validateCoord(lat1, 'latitude');
    validateCoord(lon1, 'longitude');
    validateCoord(lat2, 'latitude');
    validateCoord(lon2, 'longitude');
  
    const R = 6371; // Earth's radius in kilometers
    const toRad = (deg) => deg * Math.PI / 180;
  
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return roundToDecimal(R * c, 3);
  }
  
  /**
   * Calculates the percentage of a value relative to a total.
   * @param {number} value - The value to calculate percentage for.
   * @param {number} total - The total value.
   * @returns {number} Percentage rounded to 2 decimals.
   * @throws {Error} If inputs are invalid or total is zero.
   */
  function calculatePercentage(value, total) {
    if (typeof value !== 'number' || typeof total !== 'number' || isNaN(value) || isNaN(total)) {
      throw new Error('Invalid input: value and total must be numbers');
    }
    if (total === 0) {
      throw new Error('Total cannot be zero');
    }
    return roundToDecimal((value / total) * 100, 2);
  }
  
  /**
   * Clamps a number between a minimum and maximum value.
   * @param {number} num - The number to clamp.
   * @param {number} min - The minimum value.
   * @param {number} max - The maximum value.
   * @returns {number} The clamped number.
   * @throws {Error} If inputs are invalid or min > max.
   */
  function clamp(num, min, max) {
    if (typeof num !== 'number' || typeof min !== 'number' || typeof max !== 'number' || isNaN(num) || isNaN(min) || isNaN(max)) {
      throw new Error('Invalid input: all arguments must be numbers');
    }
    if (min > max) {
      throw new Error('Minimum cannot be greater than maximum');
    }
    return Math.max(min, Math.min(max, num));
  }
  
  /**
   * Generates a random integer between a minimum and maximum value (inclusive).
   * @param {number} min - The minimum value.
   * @param {number} max - The maximum value.
   * @returns {number} A random integer.
   * @throws {Error} If inputs are invalid or min > max.
   */
  function randomInt(min, max) {
    if (typeof min !== 'number' || typeof max !== 'number' || isNaN(min) || isNaN(max)) {
      throw new Error('Invalid input: min and max must be numbers');
    }
    if (min > max) {
      throw new Error('Minimum cannot be greater than maximum');
    }
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  
  /**
   * Calculates the factorial of a non-negative integer.
   * @param {number} n - The number to calculate factorial for.
   * @returns {number} The factorial result.
   * @throws {Error} If n is not a non-negative integer.
   */
  function factorial(n) {
    if (!Number.isInteger(n) || n < 0) {
      throw new Error('Invalid input: n must be a non-negative integer');
    }
    if (n === 0 || n === 1) return 1;
    return n * factorial(n - 1);
  }
  
  /**
   * Converts degrees to radians.
   * @param {number} degrees - The angle in degrees.
   * @returns {number} The angle in radians.
   * @throws {Error} If input is not a number.
   */
  function toRadians(degrees) {
    if (typeof degrees !== 'number' || isNaN(degrees)) {
      throw new Error('Invalid input: degrees must be a number');
    }
    return degrees * Math.PI / 180;
  }
  
  /**
   * Calculates the standard deviation of an array of numbers.
   * @param {number[]} arr - The array of numbers.
   * @returns {number} The standard deviation rounded to 2 decimals.
   * @throws {Error} If the array is empty or contains non-numeric values.
   */
  function standardDeviation(arr) {
    if (!Array.isArray(arr) || arr.length === 0) {
      throw new Error('Invalid input: arr must be a non-empty array');
    }
    const avg = averageArray(arr);
    const squareDiffs = arr.map(num => {
      if (typeof num !== 'number' || isNaN(num)) {
        throw new Error('Invalid array element: all elements must be numbers');
      }
      return Math.pow(num - avg, 2);
    });
    const variance = sumArray(squareDiffs) / arr.length;
    return roundToDecimal(Math.sqrt(variance), 2);
  }
  
  module.exports = {
    roundToDecimal,
    sumArray,
    averageArray,
    calculateDistance,
    calculatePercentage,
    clamp,
    randomInt,
    factorial,
    toRadians,
    standardDeviation
  };