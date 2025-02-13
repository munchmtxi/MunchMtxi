const compression = require('compression');

const optimizeForPlatform = (body, deviceInfo) => {
  if (!body || typeof body !== 'object') return body;

  const { platform, platformFeatures } = deviceInfo;
  const optimized = { ...body };

  switch (platform) {
    case 'ios':
      // iOS-specific optimizations
      if (platformFeatures.supportsBiometrics) {
        optimized.authOptions = [...(optimized.authOptions || []), 'biometric'];
      }
      if (platformFeatures.supportsSiriShortcuts) {
        optimized.siriShortcuts = true;
      }
      break;

    case 'android':
      // Android-specific optimizations
      if (platformFeatures.supportsBiometrics) {
        optimized.authOptions = [...(optimized.authOptions || []), 'fingerprint'];
      }
      if (platformFeatures.supportsInstantApps) {
        optimized.instantAppAvailable = true;
      }
      break;

    case 'web':
      // Web-specific optimizations
      if (platformFeatures.supportsWebShare) {
        optimized.shareOptions = ['web-share', ...(optimized.shareOptions || [])];
      }
      if (platformFeatures.supportsWebComponents) {
        optimized.useWebComponents = true;
      }
      break;
  }

  // Memory-based optimizations
  if (deviceInfo.deviceMemory && deviceInfo.deviceMemory < 4) {
    // Reduce data for low-memory devices
    if (Array.isArray(optimized.images)) {
      optimized.images = optimized.images.map(img => ({
        ...img,
        quality: 'low',
        loading: 'lazy'
      }));
    }
  }

  return optimized;
};

const getPlatformSpecificHeaders = (deviceInfo) => {
  const headers = {};
  const { platform, platformVersion } = deviceInfo;

  // Platform-specific cache strategies
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
      if (deviceInfo.isPWA) {
        headers['Service-Worker-Allowed'] = '/';
      }
      break;
  }

  return headers;
};

const responseOptimizer = () => {
  return async (req, res, next) => {
    const deviceInfo = req.deviceInfo;
    if (!deviceInfo) {
      return next();
    }

    // Store original send function
    const originalSend = res.send;

    // Override send method
    res.send = function(body) {
      try {
        if (typeof body === 'object' && body !== null) {
          // Platform-specific optimizations
          body = optimizeForPlatform(body, deviceInfo);
          
          // Add platform-specific headers
          const platformHeaders = getPlatformSpecificHeaders(deviceInfo);
          Object.entries(platformHeaders).forEach(([key, value]) => {
            res.set(key, value);
          });

          // Optimize images based on platform and network
          if (body.images) {
            body.images = body.images.map(img => {
              const optimized = { ...img };
              
              // Platform-specific image optimizations
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

              // Network-based quality optimization
              optimized.quality = deviceInfo.connectionQuality === 'poor' ? 'low' : 
                                deviceInfo.connectionQuality === 'excellent' ? 'high' : 
                                'medium';

              return optimized;
            });
          }
        }

        // Set platform-aware cache headers
        setCacheHeaders(res, deviceInfo);

        return originalSend.call(this, body);
      } catch (error) {
        console.error('Platform-specific optimization failed:', error);
        return originalSend.call(this, body);
      }
    };

    // Apply platform-aware compression
    compression({
      level: getCompressionLevel(deviceInfo.networkType, deviceInfo.connectionQuality),
      filter: shouldCompress,
      threshold: deviceInfo.platform === 'mobile' ? 0 : 1024 // Always compress for mobile
    })(req, res, next);
  };
};

module.exports = responseOptimizer;