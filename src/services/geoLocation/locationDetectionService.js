const axios = require('axios');
const Redis = require('ioredis');
const { User, Address, GeofenceEvent } = require('@models');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const config = require('@config/config');
const countryConfigs = require('@config/countryConfigs');
const emailService = require('@services/common/emailService');

const redis = new Redis(config.redisConfig);

class LocationDetectionService {
  constructor() {
    this.CACHE_TTL = 3600; // 1 hour in seconds
    this.PROVIDERS = [
      {
        name: 'ip-api',
        detect: this.detectFromIpApi.bind(this),
      },
      {
        name: 'ipstack',
        detect: this.detectFromIpStack.bind(this),
      }
    ];
  }

  async detectLocationFromIP(ip) {
    // Check cache first
    const cachedLocation = await this.getCachedLocation(ip);
    if (cachedLocation) return cachedLocation;

    // Try each provider in sequence until successful
    let lastError;
    for (const provider of this.PROVIDERS) {
      try {
        const location = await provider.detect(ip);
        await this.cacheLocation(ip, location);
        return location;
      } catch (error) {
        lastError = error;
        logger.error(`Location detection failed for ${provider.name}:`, error);
        continue;
      }
    }

    throw new AppError('All location detection providers failed', 503, lastError);
  }

  async detectFromIpApi(ip) {
    try {
      const response = await axios.get(`http://ip-api.com/json/${ip}`, {
        params: {
          fields: 'status,message,country,countryCode,region,regionName,city,lat,lon,timezone'
        }
      });

      if (response.data.status === 'success') {
        const countryCode = response.data.countryCode;
        const countryConfig = countryConfigs[countryCode];

        if (!countryConfig) {
          throw new AppError('Location not supported', 400);
        }

        return {
          latitude: response.data.lat,
          longitude: response.data.lon,
          country: response.data.country,
          countryCode: response.data.countryCode,
          city: response.data.city,
          region: response.data.regionName,
          timezone: response.data.timezone,
          ip: ip,
          config: countryConfig
        };
      }

      throw new AppError('Location detection failed', 400);
    } catch (error) {
      throw new AppError('IP-API geolocation service error', 503);
    }
  }

  async detectFromIpStack(ip) {
    const { IPSTACK_API_KEY } = process.env;
    try {
      const response = await axios.get(
        `http://api.ipstack.com/${ip}?access_key=${IPSTACK_API_KEY}`
      );
      return this.formatIpStackResponse(response.data);
    } catch (error) {
      throw new AppError('IpStack detection failed', 503);
    }
  }

  formatIpStackResponse(data) {
    const countryCode = data.country_code;
    const countryConfig = countryConfigs[countryCode];

    if (!countryConfig) {
      throw new AppError('Location not supported', 400);
    }

    return {
      latitude: data.latitude,
      longitude: data.longitude,
      country: data.country_name,
      countryCode: data.country_code,
      city: data.city,
      region: data.region_name,
      timezone: data.time_zone,
      ip: data.ip,
      config: countryConfig
    };
  }

  async getCachedLocation(ip) {
    const cached = await redis.get(`location:${ip}`);
    return cached ? JSON.parse(cached) : null;
  }

  async cacheLocation(ip, location) {
    await redis.setex(`location:${ip}`, this.CACHE_TTL, JSON.stringify(location));
  }

  async updateUserLocation(userId, locationData, source) {
    const user = await User.findByPk(userId);
    if (!user) throw new AppError('User not found', 404);

    // Create or update address record
    const addressData = {
      formattedAddress: `${locationData.city}, ${locationData.region}, ${locationData.country}`,
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      countryCode: locationData.countryCode,
      components: {
        city: locationData.city,
        region: locationData.region,
        country: locationData.country,
        timezone: locationData.timezone
      },
      validatedAt: new Date()
    };

    let address;
    if (source === 'manual') {
      address = await Address.create(addressData);
    }

    const updateData = {
      detected_location: source !== 'manual' ? locationData : user.detected_location,
      manual_location: source === 'manual' ? locationData : user.manual_location,
      location_source: source,
      location_updated_at: new Date(),
      country: locationData.countryCode.toLowerCase()
    };

    if (source === 'manual' && address) {
      updateData.defaultAddressId = address.id;
    }

    const previousCountry = user.country;
    await user.update(updateData);

    // Notify if country changed
    if (previousCountry !== locationData.countryCode.toLowerCase()) {
      await this.handleCountryChange(user, previousCountry, locationData.countryCode.toLowerCase());
    }

    return user;
  }

  async handleCountryChange(user, oldCountry, newCountry) {
    // Send email notification
    await emailService.sendTemplateEmail(
      user.email,
      'location_change',
      {
        userName: user.getFullName(),
        oldCountry: countryConfigs[oldCountry.toUpperCase()].name,
        newCountry: countryConfigs[newCountry.toUpperCase()].name,
        currency: countryConfigs[newCountry.toUpperCase()].currency
      }
    );

    // Log the change
    await GeofenceEvent.create({
      eventType: 'COUNTRY_CHANGE',
      location: {
        oldCountry,
        newCountry
      },
      metadata: {
        userId: user.id,
        timestamp: new Date()
      }
    });
  }

  async getUserLocation(userId) {
    const user = await User.findByPk(userId, {
      include: [{
        model: Address,
        as: 'default_address'
      }]
    });

    if (!user) throw new AppError('User not found', 404);

    const countryConfig = countryConfigs[user.country.toUpperCase()];
    return {
      current: user.location_source === 'manual' ? user.manual_location : user.detected_location,
      detected: user.detected_location,
      manual: user.manual_location,
      source: user.location_source,
      lastUpdated: user.location_updated_at,
      defaultAddress: user.default_address,
      regionConfig: countryConfig
    };
  }

  validateCountryBounds(latitude, longitude, countryCode) {
    const bounds = countryConfigs[countryCode].bounds;
    return latitude >= bounds.southwest.lat &&
           latitude <= bounds.northeast.lat &&
           longitude >= bounds.southwest.lng &&
           longitude <= bounds.northeast.lng;
  }
}

module.exports = new LocationDetectionService();