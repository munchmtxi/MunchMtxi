module.exports = {
    // Malawi Configuration
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
  
    // Tanzania Configuration
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
  
    // Mozambique Configuration
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
  
    // Zambia Configuration
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