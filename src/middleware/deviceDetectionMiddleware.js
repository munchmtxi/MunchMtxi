// src/middleware/deviceDetectionMiddleware.js
const UAParser = require('ua-parser-js');
const { trackDevice } = require('@services/deviceService');

const detectPlatformCapabilities = (userAgent) => {
  const parser = new UAParser(userAgent);
  const result = parser.getResult();
  
  // Enhanced iOS-specific detection
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  const iOSVersion = isIOS ? parseInt(userAgent.match(/OS (\d+)_/)[1], 10) : null;
  
  // Enhanced Android detection
  const isAndroid = /Android/.test(userAgent);
  const androidVersion = isAndroid ? parseFloat(userAgent.match(/Android (\d+\.?\d*)/)[1]) : null;
  
  // PWA/Web detection
  const isPWA = window?.matchMedia?.('(display-mode: standalone)').matches || false;
  
  return {
    platform: isIOS ? 'ios' : isAndroid ? 'android' : 'web',
    platformVersion: isIOS ? iOSVersion : androidVersion,
    isPWA,
    supportsPushNotifications: 'Notification' in window && 'serviceWorker' in navigator,
    supportsWebGL: (() => {
      try {
        const canvas = document.createElement('canvas');
        return !!(window.WebGLRenderingContext && 
          (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
      } catch (e) {
        return false;
      }
    })(),
    supportsWebWorkers: 'Worker' in window,
    supportsIndexedDB: 'indexedDB' in window,
    supportsGeolocation: 'geolocation' in navigator,
    deviceMemory: navigator?.deviceMemory || null,
    hardwareConcurrency: navigator?.hardwareConcurrency || null,
    ...result
  };
};

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
      supportsWebComponents: 'customElements' in window,
      supportsWebRTC: 'RTCPeerConnection' in window,
      supportsWebShare: 'share' in navigator
    }
  };
  
  return features[platform] || features.web;
};

const deviceDetectionMiddleware = async (req, res, next) => {
  try {
    if (req.user) {
      const platformCapabilities = detectPlatformCapabilities(req.headers['user-agent']);
      const networkCapabilities = detectNetworkCapabilities(req);
      
      const deviceInfo = {
        ...platformCapabilities,
        ...networkCapabilities,
        platformFeatures: getPlatformSpecificFeatures(
          platformCapabilities.platform, 
          platformCapabilities.platformVersion
        ),
        lastDetectedAt: new Date()
      };

      await trackDevice(req.user.id, deviceInfo);
      req.deviceInfo = deviceInfo;
      
      // Set platform-specific headers
      res.set('X-Platform', deviceInfo.platform);
      res.set('X-Platform-Version', deviceInfo.platformVersion);
    }
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = deviceDetectionMiddleware;