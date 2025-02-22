// @handlers/merchantHandlers/profileHandlers/addressHandler.js
const mapsService = require('@services/merchantServices/profileServices/mapsService');
const logger = require('@utils/logger');
const { EVENTS } = require('@config/events');

class AddressHandler {
  async handleAddressSuggestions(socket, data) {
    try {
      const { input } = data;
      const sessionToken = socket.id; // Use socket ID as session token
      
      const suggestions = await mapsService.getPlacePredictions(input, sessionToken);
      
      socket.emit(EVENTS.MERCHANT.ADDRESS.SUGGESTIONS, {
        status: 'success',
        data: suggestions
      });
    } catch (error) {
      logger.error('Address suggestions error:', error);
      socket.emit(EVENTS.ERROR, {
        message: 'Failed to get address suggestions',
        error: error.message
      });
    }
  }

  async handleAddressDetails(socket, data) {
    try {
      const { placeId } = data;
      const sessionToken = socket.id;
      
      const details = await mapsService.getPlaceDetails(placeId, sessionToken);
      
      socket.emit(EVENTS.MERCHANT.ADDRESS.DETAILS, {
        status: 'success',
        data: details
      });
    } catch (error) {
      logger.error('Address details error:', error);
      socket.emit(EVENTS.ERROR, {
        message: 'Failed to get address details',
        error: error.message
      });
    }
  }

  registerHandlers(socket) {
    socket.on(EVENTS.MERCHANT.ADDRESS.GET_SUGGESTIONS, this.handleAddressSuggestions.bind(this, socket));
    socket.on(EVENTS.MERCHANT.ADDRESS.GET_DETAILS, this.handleAddressDetails.bind(this, socket));
  }
}

module.exports = new AddressHandler();