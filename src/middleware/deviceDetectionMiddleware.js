/**
 * @module middleware/deviceDetectionMiddleware
 * @description Middleware that detects device platform, network, and feature capabilities based on the user agent and request headers.
 * It tracks the detected device information for the authenticated user and sets platform-specific response headers.
 */

const UAParser = require('ua-parser-js');
const { trackDevice } = require('@services/common/deviceService');
const { logger } = require('@utils/logger');

/**
 * Detects platform capabilities from the given user agent.
 *
 * This function uses UAParser to extract OS details and safely checks for browser capabilities,
 * ensuring that server-side environments gracefully fall back to defaults.
 *
 * @param {string} userAgent - The user agent string from the request headers.
 * @returns {Object} An object containing platform details and supported features.
 */
const detectPlatformCapabilities = (userAgent) => {
  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  const osName = result.os.name ? result.os.name.toLowerCase() : '';
  const isIOS = osName.includes('ios');
  const isAndroid = osName.includes('android');
  const platform = isIOS ? 'ios' : isAndroid ? 'android' : 'web';
  const platformVersion = result.os.version
    ? (isIOS ? parseInt(result.os.version.split('.')[0], 10) : parseFloat(result.os.version))
    : null;

  // Safely check for PWA and other browser features.
  const isPWA = (typeof window !== 'undefined' && typeof window.matchMedia === 'function')
    ? window.matchMedia('(display-mode: standalone)').matches
    : false;
  const supportsPushNotifications = (typeof window !== 'undefined' && typeof navigator !== 'undefined')
    ? ('Notification' in window && 'serviceWorker' in navigator)
    : false;
  const supportsWebGL = (typeof document !== 'undefined' && typeof window !== 'undefined')
    ? (() => {
        try {
          const canvas = document.createElement('canvas');
          return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
        } catch (e) {
          return false;
        }
      })()
    : false;
  const supportsWebWorkers = (typeof window !== 'undefined' && 'Worker' in window) ? true : false;
  const supportsIndexedDB = (typeof window !== 'undefined' && 'indexedDB' in window) ? true : false;
  const supportsGeolocation = (typeof navigator !== 'undefined' && 'geolocation' in navigator) ? true : false;
  const deviceMemory = (typeof navigator !== 'undefined' && navigator.deviceMemory) ? navigator.deviceMemory : null;
  const hardwareConcurrency = (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) ? navigator.hardwareConcurrency : null;

  return {
    platform,
    platformVersion,
    isPWA,
    supportsPushNotifications,
    supportsWebGL,
    supportsWebWorkers,
    supportsIndexedDB,
    supportsGeolocation,
    deviceMemory,
    hardwareConcurrency,
    os: result.os,
    browser: result.browser,
    device: result.device
  };
};

/**
 * Detects network capabilities from the request.
 *
 * This function extracts custom network-related headers if available.
 *
 * @param {Object} req - Express request object.
 * @returns {Object} An object containing network capability details.
 */
const detectNetworkCapabilities = (req) => {
  return {
    networkType: req.headers['x-network-type'] || 'unknown',
    downlink: req.headers['x-downlink'] ? parseFloat(req.headers['x-downlink']) : null,
    effectiveType: req.headers['x-effective-type'] || null,
    rtt: req.headers['x-rtt'] ? parseInt(req.headers['x-rtt'], 10) : null
  };
};

/**
 * Retrieves platform-specific feature support based on platform and version.
 *
 * @param {string} platform - The platform identifier ('ios', 'android', or 'web').
 * @param {number|null} version - The major version number of the platform OS.
 * @returns {Object} An object specifying support for various platform-specific features.
 */
const getPlatformSpecificFeatures = (platform, version) => {
  const features = {
    ios: {
      supportsBiometrics: version >= 11.3,
      supportsARKit: version >= 11.0,
      supportsSiriShortcuts: version >= 12.0,
      supportsWidgets: version >= 14.0
    },
    android: {
      supportsBiometrics: version >= 6.0,
      supportsARCore: version >= 7.0,
      supportsInstantApps: version >= 6.0,
      supportsAppBundle: version >= 5.0
    },
    web: {
      supportsWebAssembly: typeof WebAssembly === 'object',
      supportsWebComponents: (typeof window !== 'undefined' && 'customElements' in window),
      supportsWebRTC: (typeof window !== 'undefined' && 'RTCPeerConnection' in window),
      supportsWebShare: (typeof navigator !== 'undefined' && 'share' in navigator)
    }
  };

  return features[platform] || features.web;
};

/**
 * Express middleware to detect device and network capabilities.
 *
 * If a user is authenticated, it tracks the device information and sets response headers
 * for platform and version.
 *
 * @async
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
const deviceDetectionMiddleware = async (req, res, next) => {
  logger.info('Device middleware entered', { user: !!req.user, path: req.path });

  try {
    if (req.user) {
      const platformCapabilities = detectPlatformCapabilities(req.headers['user-agent'] || '');
      const networkCapabilities = detectNetworkCapabilities(req);
      const platformFeatures = getPlatformSpecificFeatures(platformCapabilities.platform, platformCapabilities.platformVersion);

      const deviceInfo = {
        ...platformCapabilities,
        ...networkCapabilities,
        ...platformFeatures,
        lastDetectedAt: new Date()
      };

      await trackDevice(req.user.id, deviceInfo);
      req.deviceInfo = deviceInfo; // Attach device info to the request object
      res.set('X-Platform', deviceInfo.platform); // Set platform header
    }

    logger.info('Device middleware exiting');
    next();
  } catch (error) {
    logger.error('Device middleware error', { error: error.message, stack: error.stack });
    next(error);
  }
};

module.exports = deviceDetectionMiddleware;
