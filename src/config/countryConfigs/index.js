/**
 * Configuration module for various countries, providing essential details such as 
 * name, currency, phone prefix, time zone, address format, and geographical bounds.
 * @module CountryConfig
 */

module.exports = {
  /**
   * Malawi Configuration
   * @type {Object}
   * @property {string} name - The name of the country.
   * @property {string} currency - The currency used in the country (ISO 4217 code).
   * @property {string} phonePrefix - The international dialing code for the country.
   * @property {string} timeZone - The primary time zone of the country (IANA time zone format).
   * @property {Object} addressFormat - Specifies the required and optional fields for an address.
   * @property {string[]} addressFormat.required - The list of required address fields.
   * @property {string[]} addressFormat.optional - The list of optional address fields.
   * @property {Object} bounds - The geographical bounding box of the country.
   * @property {Object} bounds.northeast - The northeast corner coordinates.
   * @property {number} bounds.northeast.lat - Latitude of the northeast corner.
   * @property {number} bounds.northeast.lng - Longitude of the northeast corner.
   * @property {Object} bounds.southwest - The southwest corner coordinates.
   * @property {number} bounds.southwest.lat - Latitude of the southwest corner.
   * @property {number} bounds.southwest.lng - Longitude of the southwest corner.
   */
  MWI: {
    name: 'Malawi',
    currency: 'MWK',
    phonePrefix: '+265',
    timeZone: 'Africa/Blantyre',
    addressFormat: {
      required: ['street_number', 'route', 'locality'],
      optional: ['postal_code', 'administrative_area_level_1']
    },
    bounds: {
      northeast: { lat: -9.367541, lng: 35.916821 },
      southwest: { lat: -17.125, lng: 32.67395 }
    }
  },

  /**
   * Tanzania Configuration
   * @type {Object}
   * @property {string} name - The name of the country.
   * @property {string} currency - The currency used in the country (ISO 4217 code).
   * @property {string} phonePrefix - The international dialing code for the country.
   * @property {string} timeZone - The primary time zone of the country (IANA time zone format).
   * @property {Object} addressFormat - Specifies the required and optional fields for an address.
   * @property {string[]} addressFormat.required - The list of required address fields.
   * @property {string[]} addressFormat.optional - The list of optional address fields.
   * @property {Object} bounds - The geographical bounding box of the country.
   * @property {Object} bounds.northeast - The northeast corner coordinates.
   * @property {number} bounds.northeast.lat - Latitude of the northeast corner.
   * @property {number} bounds.northeast.lng - Longitude of the northeast corner.
   * @property {Object} bounds.southwest - The southwest corner coordinates.
   * @property {number} bounds.southwest.lat - Latitude of the southwest corner.
   * @property {number} bounds.southwest.lng - Longitude of the southwest corner.
   */
  TZA: {
    name: 'Tanzania',
    currency: 'TZS',
    phonePrefix: '+255',
    timeZone: 'Africa/Dar_es_Salaam',
    addressFormat: {
      required: ['route', 'locality', 'administrative_area_level_1'],
      optional: ['street_number', 'postal_code']
    },
    bounds: {
      northeast: { lat: -0.990736, lng: 40.443222 },
      southwest: { lat: -11.745696, lng: 29.327168 }
    }
  },

  /**
   * Mozambique Configuration
   * @type {Object}
   * @property {string} name - The name of the country.
   * @property {string} currency - The currency used in the country (ISO 4217 code).
   * @property {string} phonePrefix - The international dialing code for the country.
   * @property {string} timeZone - The primary time zone of the country (IANA time zone format).
   * @property {Object} addressFormat - Specifies the required and optional fields for an address.
   * @property {string[]} addressFormat.required - The list of required address fields.
   * @property {string[]} addressFormat.optional - The list of optional address fields.
   * @property {Object} bounds - The geographical bounding box of the country.
   * @property {Object} bounds.northeast - The northeast corner coordinates.
   * @property {number} bounds.northeast.lat - Latitude of the northeast corner.
   * @property {number} bounds.northeast.lng - Longitude of the northeast corner.
   * @property {Object} bounds.southwest - The southwest corner coordinates.
   * @property {number} bounds.southwest.lat - Latitude of the southwest corner.
   * @property {number} bounds.southwest.lng - Longitude of the southwest corner.
   */
  MOZ: {
    name: 'Mozambique',
    currency: 'MZN',
    phonePrefix: '+258',
    timeZone: 'Africa/Maputo',
    addressFormat: {
      required: ['route', 'locality', 'administrative_area_level_1'],
      optional: ['street_number', 'postal_code']
    },
    bounds: {
      northeast: { lat: -10.471883, lng: 40.847729 },
      southwest: { lat: -26.868685, lng: 30.217319 }
    }
  },

  /**
   * Zambia Configuration
   * @type {Object}
   * @property {string} name - The name of the country.
   * @property {string} currency - The currency used in the country (ISO 4217 code).
   * @property {string} phonePrefix - The international dialing code for the country.
   * @property {string} timeZone - The primary time zone of the country (IANA time zone format).
   * @property {Object} addressFormat - Specifies the required and optional fields for an address.
   * @property {string[]} addressFormat.required - The list of required address fields.
   * @property {string[]} addressFormat.optional - The list of optional address fields.
   * @property {Object} bounds - The geographical bounding box of the country.
   * @property {Object} bounds.northeast - The northeast corner coordinates.
   * @property {number} bounds.northeast.lat - Latitude of the northeast corner.
   * @property {number} bounds.northeast.lng - Longitude of the northeast corner.
   * @property {Object} bounds.southwest - The southwest corner coordinates.
   * @property {number} bounds.southwest.lat - Latitude of the southwest corner.
   * @property {number} bounds.southwest.lng - Longitude of the southwest corner.
   */
  ZMB: {
    name: 'Zambia',
    currency: 'ZMW',
    phonePrefix: '+260',
    timeZone: 'Africa/Lusaka',
    addressFormat: {
      required: ['route', 'locality', 'administrative_area_level_1'],
      optional: ['street_number', 'postal_code']
    },
    bounds: {
      northeast: { lat: -8.203547, lng: 33.705704 },
      southwest: { lat: -18.079473, lng: 21.999371 }
    }
  }
};