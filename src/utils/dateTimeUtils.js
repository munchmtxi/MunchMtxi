// src/utils/dateTimeUtils.js
const { format, parseISO, isValid, differenceInSeconds, addDays, subDays, startOfDay, endOfDay, isBefore, isAfter } = require('date-fns');

/**
 * A collection of date and time utility functions for formatting, validation, and manipulation.
 * @module dateTimeUtils
 */

/**
 * Formats a date to a specified pattern.
 * @param {string|Date} date - The date to format (ISO string or Date object).
 * @param {string} [pattern='yyyy-MM-dd HH:mm:ss'] - The format pattern (default: 'yyyy-MM-dd HH:mm:ss').
 * @returns {string} The formatted date string.
 * @throws {Error} If the date is invalid or pattern is not a string.
 */
function formatDate(date, pattern = 'yyyy-MM-dd HH:mm:ss') {
  if (typeof pattern !== 'string') {
    throw new Error('Invalid pattern: must be a string');
  }
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsedDate)) {
    throw new Error('Invalid date: provide a valid ISO string or Date object');
  }
  return format(parsedDate, pattern);
}

/**
 * Validates if a date string or object is valid.
 * @param {string|Date} date - The date to validate (ISO string or Date object).
 * @returns {boolean} True if valid, false otherwise.
 */
function isValidDate(date) {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  return isValid(parsedDate);
}

/**
 * Calculates the difference between two dates in seconds.
 * @param {string|Date} start - The start date.
 * @param {string|Date} end - The end date.
 * @returns {number} The difference in seconds.
 * @throws {Error} If dates are invalid.
 */
function getTimeDifference(start, end) {
  const startDate = typeof start === 'string' ? parseISO(start) : start;
  const endDate = typeof end === 'string' ? parseISO(end) : end;
  if (!isValid(startDate) || !isValid(endDate)) {
    throw new Error('Invalid dates: provide valid ISO strings or Date objects');
  }
  return differenceInSeconds(endDate, startDate);
}

/**
 * Adds a specified number of days to a date.
 * @param {string|Date} date - The starting date.
 * @param {number} days - Number of days to add.
 * @returns {Date} The resulting Date object.
 * @throws {Error} If date is invalid or days is not a number.
 */
function addDaysToDate(date, days) {
  if (typeof days !== 'number' || isNaN(days)) {
    throw new Error('Invalid days: must be a number');
  }
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsedDate)) {
    throw new Error('Invalid date: provide a valid ISO string or Date object');
  }
  return addDays(parsedDate, days);
}

/**
 * Subtracts a specified number of days from a date.
 * @param {string|Date} date - The starting date.
 * @param {number} days - Number of days to subtract.
 * @returns {Date} The resulting Date object.
 * @throws {Error} If date is invalid or days is not a number.
 */
function subtractDaysFromDate(date, days) {
  if (typeof days !== 'number' || isNaN(days)) {
    throw new Error('Invalid days: must be a number');
  }
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsedDate)) {
    throw new Error('Invalid date: provide a valid ISO string or Date object');
  }
  return subDays(parsedDate, days);
}

/**
 * Returns the start of the day for a given date (00:00:00).
 * @param {string|Date} date - The date to process.
 * @returns {Date} The start of the day.
 * @throws {Error} If date is invalid.
 */
function getStartOfDay(date) {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsedDate)) {
    throw new Error('Invalid date: provide a valid ISO string or Date object');
  }
  return startOfDay(parsedDate);
}

/**
 * Returns the end of the day for a given date (23:59:59).
 * @param {string|Date} date - The date to process.
 * @returns {Date} The end of the day.
 * @throws {Error} If date is invalid.
 */
function getEndOfDay(date) {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsedDate)) {
    throw new Error('Invalid date: provide a valid ISO string or Date object');
  }
  return endOfDay(parsedDate);
}

/**
 * Checks if one date is before another.
 * @param {string|Date} date1 - The first date.
 * @param {string|Date} date2 - The second date.
 * @returns {boolean} True if date1 is before date2, false otherwise.
 * @throws {Error} If dates are invalid.
 */
function isDateBefore(date1, date2) {
  const parsedDate1 = typeof date1 === 'string' ? parseISO(date1) : date1;
  const parsedDate2 = typeof date2 === 'string' ? parseISO(date2) : date2;
  if (!isValid(parsedDate1) || !isValid(parsedDate2)) {
    throw new Error('Invalid dates: provide valid ISO strings or Date objects');
  }
  return isBefore(parsedDate1, parsedDate2);
}

/**
 * Checks if one date is after another.
 * @param {string|Date} date1 - The first date.
 * @param {string|Date} date2 - The second date.
 * @returns {boolean} True if date1 is after date2, false otherwise.
 * @throws {Error} If dates are invalid.
 */
function isDateAfter(date1, date2) {
  const parsedDate1 = typeof date1 === 'string' ? parseISO(date1) : date1;
  const parsedDate2 = typeof date2 === 'string' ? parseISO(date2) : date2;
  if (!isValid(parsedDate1) || !isValid(parsedDate2)) {
    throw new Error('Invalid dates: provide valid ISO strings or Date objects');
  }
  return isAfter(parsedDate1, parsedDate2);
}

/**
 * Converts a duration in seconds to a human-readable string (e.g., "2h 30m 15s").
 * @param {number} seconds - The duration in seconds.
 * @returns {string} The formatted duration string.
 * @throws {Error} If seconds is not a number or negative.
 */
function formatDuration(seconds) {
  if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) {
    throw new Error('Invalid seconds: must be a non-negative number');
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  let result = '';
  if (hours > 0) result += `${hours}h `;
  if (minutes > 0 || hours > 0) result += `${minutes}m `;
  result += `${secs}s`;
  return result.trim();
}

/**
 * Generates a timestamp string in ISO format (e.g., "2023-10-15T14:30:00Z").
 * @returns {string} The current timestamp in ISO format.
 */
function getCurrentTimestamp() {
  return format(new Date(), "yyyy-MM-dd'T'HH:mm:ss'Z'");
}

/**
 * Checks if a date falls within a specified range (inclusive).
 * @param {string|Date} date - The date to check.
 * @param {string|Date} start - The start of the range.
 * @param {string|Date} end - The end of the range.
 * @returns {boolean} True if date is within range, false otherwise.
 * @throws {Error} If any date is invalid.
 */
function isWithinRange(date, start, end) {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  const parsedStart = typeof start === 'string' ? parseISO(start) : start;
  const parsedEnd = typeof end === 'string' ? parseISO(end) : end;
  if (!isValid(parsedDate) || !isValid(parsedStart) || !isValid(parsedEnd)) {
    throw new Error('Invalid dates: provide valid ISO strings or Date objects');
  }
  return !isBefore(parsedDate, parsedStart) && !isAfter(parsedDate, parsedEnd);
}

module.exports = {
  formatDate,
  isValidDate,
  getTimeDifference,
  addDaysToDate,
  subtractDaysFromDate,
  getStartOfDay,
  getEndOfDay,
  isDateBefore,
  isDateAfter,
  formatDuration,
  getCurrentTimestamp,
  isWithinRange
};