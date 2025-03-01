// src/middleware/responseOptimizer.js
const compression = require('compression');
const logger = require('@utils/logger');
const { AppError } = require('@utils/AppError');

/**
 * Middleware for optimizing HTTP responses based on device and platform information.
 * @module responseOptimizer
 */

/**
 * Configuration options for response optimization middleware.
 * @typedef {Object} ResponseOptimizerConfig
 * @property {number} [compressionThreshold=1024] - Minimum response size (bytes) to compress (default: 1024 for non-mobile).
 * @property {number} [lowMemoryThreshold=4] - Device memory threshold (GB) for low-memory optimizations.
 * @property {boolean} [enableCacheHeaders=true] - Whether to set platform-aware cache headers.
 */

/**
 * Default configuration for response optimizer.
 * @type {ResponseOptimizerConfig}
 */
const defaultConfig = {
  compressionThreshold: 1024,
  lowMemoryThreshold: 4,
  enableCacheHeaders: true
};

/**
 * Optimizes response body based on device platform and features.
 * @function optimizeForPlatform
 * @param {Object} body - The response body to optimize.
 * @param {Object} deviceInfo - Device information from req.deviceInfo.
 * @param {string} deviceInfo.platform - Platform type ('ios', 'android', 'web').
 * @param {Object} deviceInfo.platformFeatures - Features supported by the platform.
 * @param {number} [deviceInfo.deviceMemory] - Device memory in GB.
 * @returns {Object} The optimized response body.
 * @throws {Error} If optimization fails unexpectedly.
 * @description Adjusts response data for platform-specific features and memory constraints.
 */
const optimizeForPlatform = (body, deviceInfo) => {
  if (!body || typeof body !== 'object') return body;

  const { platform, platformFeatures, deviceMemory } = deviceInfo;
  const optimized = { ...body };

  try {
    switch (platform) {
      case 'ios':
        if (platformFeatures?.supportsBiometrics) {
          optimized.authOptions = [...(optimized.authOptions || []), 'biometric'];
        }
        if (platformFeatures?.supportsSiriShortcuts) {
          optimized.siriShortcuts = true;
        }
        optimized.platformHints = { os: 'iOS', optimized: true };
        break;

      case 'android':
        if (platformFeatures?.supportsBiometrics) {
          optimized.authOptions = [...(optimized.authOptions || []), 'fingerprint'];
        }
        if (platformFeatures?.supportsInstantApps) {
          optimized.instantAppAvailable = true;
        }
        optimized.platformHints = { os: 'Android', optimized: true };
        break;

      case 'web':
        if (platformFeatures?.supportsWebShare) {
          optimized.shareOptions = ['web-share', ...(optimized.shareOptions || [])];
        }
        if (platformFeatures?.supportsWebComponents) {
          optimized.useWebComponents = true;
        }
        optimized.platformHints = { os: 'Web', optimized: true };
        break;

      default:
        logger.warn('Unknown platform detected', { platform });
    }

    // Memory-based optimizations
    if (deviceMemory && deviceMemory < defaultConfig.lowMemoryThreshold) {
      if (Array.isArray(optimized.images)) {
        optimized.images = optimized.images.map(img => ({
          ...img,
          quality: 'low',
          loading: 'lazy',
          resolution: 'reduced'
        }));
      }
      optimized.lowMemoryMode = true;
    }

    return optimized;
  } catch (error) {
    logger.error('Failed to optimize for platform', { error: error.message, platform });
    throw error; // Let middleware handle the fallback
  }
};

/**
 * Generates platform-specific headers for the response.
 * @function getPlatformSpecificHeaders
 * @param {Object} deviceInfo - Device information from req.deviceInfo.
 * @param {string} deviceInfo.platform - Platform type ('ios', 'android', 'web').
 * @param {number} [deviceInfo.platformVersion] - Platform version number.
 * @param {boolean} [deviceInfo.isPWA] - Whether the request is from a PWA.
 * @returns {Object} Key-value pairs of platform-specific headers.
 * @description Sets headers tailored to the device's platform and capabilities.
 */
const getPlatformSpecificHeaders = (deviceInfo) => {
  const { platform, platformVersion, isPWA } = deviceInfo;
  const headers = {};

  switch (platform) {
    case 'ios':
      headers['X-iOS-Optimization'] = 'true';
      if (platformVersion >= 13) {
        headers['X-iOS-Dark-Mode'] = 'supported';
      }
      break;

    case 'android':
      headers['X-Android-Optimization'] = 'true';
      if (platformVersion >= 10) {
        headers['X-Android-Dark-Mode'] = 'supported';
      }
      break;

    case 'web':
      if (isPWA) {
        headers['Service-Worker-Allowed'] = '/';
        headers['X-Web-PWA'] = 'true';
      }
      break;

    default:
      logger.debug('No platform-specific headers set', { platform });
  }

  return headers;
};

/**
 * Sets cache headers based on device platform and network conditions.
 * @function setCacheHeaders
 * @param {import('express').Response} res - Express response object.
 * @param {Object} deviceInfo - Device information from req.deviceInfo.
 * @param {string} deviceInfo.platform - Platform type.
 * @param {string} [deviceInfo.connectionQuality] - Network quality ('poor', 'good', 'excellent').
 * @description Configures caching strategy based on platform and network.
 */
const setCacheHeaders = (res, deviceInfo) => {
  const { platform, connectionQuality } = deviceInfo;
  const cacheControl = [];

  if (platform === 'web') {
    cacheControl.push('public', 'max-age=3600'); // 1 hour for web
  } else {
    cacheControl.push('private', 'max-age=300'); // 5 minutes for mobile
  }

  if (connectionQuality === 'poor') {
    cacheControl.push('stale-while-revalidate=86400'); // 1 day
  }

  res.set('Cache-Control', cacheControl.join(', '));
};

/**
 * Determines compression level based on network conditions.
 * @function getCompressionLevel
 * @param {string} [networkType] - Network type (e.g., '4g', 'wifi').
 * @param {string} [connectionQuality] - Network quality ('poor', 'good', 'excellent').
 * @returns {number} Compression level (1-9, where 9 is max).
 * @description Adjusts compression based on network performance.
 */
const getCompressionLevel = (networkType, connectionQuality) => {
  if (connectionQuality === 'poor' || networkType === '2g') return 1; // Minimal compression
  if (connectionQuality === 'excellent' || networkType === 'wifi') return 9; // Max compression
  return 6; // Default balanced level
};

/**
 * Custom filter to determine if response should be compressed.
 * @function shouldCompress
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {boolean} True if compression should be applied, false otherwise.
 * @description Skips compression for small responses or specific content types.
 */
const shouldCompress = (req, res) => {
  const contentType = res.getHeader('Content-Type') || '';
  if (contentType.includes('image/') || contentType.includes('video/')) {
    return false; // Skip media compression
  }
  return compression.filter(req, res); // Default filter for other types
};

/**
 * Middleware to optimize responses based on device platform and network conditions.
 * @function responseOptimizer
 * @param {ResponseOptimizerConfig} [config=defaultConfig] - Configuration options.
 * @returns {import('express').RequestHandler} Express middleware function.
 * @description Enhances response compression, headers, and body for device-specific optimization.
 */
const responseOptimizer = (config = defaultConfig) => {
  const { compressionThreshold, lowMemoryThreshold, enableCacheHeaders } = { ...defaultConfig, ...config };

  return async (req, res, next) => {
    const deviceInfo = req.deviceInfo;
    if (!deviceInfo) {
      logger.debug('No device info provided, skipping optimization', { path: req.path });
      return next();
    }

    // Override res.send for optimization
    const originalSend = res.send;
    res.send = function (body) {
      try {
        if (typeof body === 'object' && body !== null) {
          body = optimizeForPlatform(body, deviceInfo);

          const platformHeaders = getPlatformSpecificHeaders(deviceInfo);
          Object.entries(platformHeaders).forEach(([key, value]) => res.set(key, value));

          if (body.images && Array.isArray(body.images)) {
            body.images = body.images.map(img => {
              const optimized = { ...img };
              switch (deviceInfo.platform) {
                case 'ios':
                  optimized.format = deviceInfo.supports_webp ? 'webp' : 'heic';
                  break;
                case 'android':
                  optimized.format = 'webp';
                  break;
                default:
                  optimized.format = deviceInfo.supports_webp ? 'webp' : 'jpeg';
              }
              optimized.quality = deviceInfo.connectionQuality === 'poor' ? 'low' :
                                  deviceInfo.connectionQuality === 'excellent' ? 'high' : 'medium';
              return optimized;
            });
          }

          if (enableCacheHeaders) {
            setCacheHeaders(res, deviceInfo);
          }
        }

        logger.debug('Response optimized', { platform: deviceInfo.platform, headers: res.getHeaders() });
        return originalSend.call(this, body);
      } catch (error) {
        logger.error('Response optimization failed', { error: error.message, stack: error.stack, platform: deviceInfo.platform });
        return originalSend.call(this, body); // Fallback to original
      }
    };

    // Apply compression
    compression({
      level: getCompressionLevel(deviceInfo.networkType, deviceInfo.connectionQuality),
      filter: shouldCompress,
      threshold: deviceInfo.platform === 'mobile' ? 0 : compressionThreshold
    })(req, res, next);
  };
};

module.exports = responseOptimizer;