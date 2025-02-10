// src/handlers/driverHandlers.js
const logger = require('@utils/logger');
const events = require('@config/events');
const { 
  Driver, 
  Order, 
  TaxiRide, 
  Delivery,
  Payment,
  Route,
  Vehicle
} = require('@models');
// Assuming PRIORITY_LEVELS is defined in a separate file or module
const { PRIORITY_LEVELS } = require('@config/constants'); // Adjust the path as necessary

const driverHandlers = {
  // Room Management
  async joinRooms(socket) {
    try {
      const driver = await Driver.findOne({ 
        where: { userId: socket.user.id },
        include: ['activeOrders', 'activeRides'] 
      });
      if (driver) {
        // Join driver-specific room
        socket.join(`driver:${driver.id}`);
        
        // Join active order rooms
        driver.activeOrders?.forEach(order => {
          socket.join(`order:${order.id}`);
        });
        // Join active ride rooms
        driver.activeRides?.forEach(ride => {
          socket.join(`ride:${ride.id}`);
        });
        logger.info(`Driver ${driver.id} joined their rooms`);
      }
    } catch (error) {
      logger.error('Error joining driver rooms:', error);
      throw error;
    }
  },
  // Initialize all driver event handlers
  initialize(socket, io) {
    // Profile and Vehicle Management
    this.handleProfileUpdates(socket, io);
    this.handleVehicleManagement(socket, io);
    // Job and Route Management
    this.handleDeliveryJobs(socket, io);
    this.handleTaxiRides(socket, io);
    this.handleRouteOptimization(socket, io);
    // Status and Location Updates
    this.handleAvailabilityUpdates(socket, io);
    this.handleLocationUpdates(socket, io);
    // Earnings and Performance
    this.handleEarningsManagement(socket, io);
    this.handlePerformanceTracking(socket, io);
  },

    // Profile Management
    handleProfileUpdates(socket, io) {
      socket.on(EVENTS.DRIVER.PROFILE_UPDATE, async (data) => {
        try {
          const updatedProfile = await Driver.update(socket.user.id, {
            phoneNumber: data.phoneNumber,
            licenseNumber: data.licenseNumber,
            emergencyContact: data.emergencyContact
          });
          socket.emit(EVENTS.DRIVER.PROFILE_UPDATED, updatedProfile);
          logger.info(`Driver ${socket.user.id} profile updated`);
          
          // Notify with priority
          await this.sendPrioritizedMessage(socket, io, {
            event: EVENTS.DRIVER.PROFILE_UPDATED,
            data: updatedProfile,
            priority: 'MEDIUM'
          });
        } catch (error) {
          logger.error('Profile update error:', error);
          socket.emit(EVENTS.ERROR, { message: 'Failed to update profile' });
          
          // Notify with priority
          await this.sendPrioritizedMessage(socket, io, {
            event: EVENTS.ERROR,
            data: { message: 'Failed to update profile' },
            priority: 'HIGH'
          });
        }
      });
    },

      // Vehicle Management
  handleVehicleManagement(socket, io) {
    socket.on(EVENTS.DRIVER.VEHICLE_UPDATE, async (data) => {
      try {
        const updatedVehicle = await Vehicle.update(socket.user.id, {
          vehicleType: data.vehicleType,
          plateNumber: data.plateNumber,
          insuranceDetails: data.insuranceDetails,
          maintenanceStatus: data.maintenanceStatus
        });
        socket.emit(EVENTS.DRIVER.VEHICLE_UPDATED, updatedVehicle);
        
        // Notify with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.DRIVER.VEHICLE_UPDATED,
          data: updatedVehicle,
          priority: 'LOW'
        });
      } catch (error) {
        logger.error('Vehicle update error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to update vehicle information' });
        
        // Notify with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.ERROR,
          data: { message: 'Failed to update vehicle information' },
          priority: 'HIGH'
        });
      }
    });
  },

    // Delivery Job Management
    handleDeliveryJobs(socket, io) {
      // Accept delivery assignment
      socket.on(EVENTS.DELIVERY.ACCEPT_JOB, async (data) => {
        try {
          const delivery = await Delivery.accept({
            deliveryId: data.deliveryId,
            driverId: socket.user.id
          });
          // Join delivery room
          socket.join(`delivery:${data.deliveryId}`);
          // Notify merchant and customer
          io.to(`merchant:${delivery.merchantId}`).emit(EVENTS.DELIVERY.DRIVER_ASSIGNED, {
            deliveryId: delivery.id,
            driverDetails: await Driver.getPublicProfile(socket.user.id)
          });
          io.to(`customer:${delivery.customerId}`).emit(EVENTS.DELIVERY.DRIVER_ASSIGNED, {
            deliveryId: delivery.id,
            driverDetails: await Driver.getPublicProfile(socket.user.id),
            estimatedArrival: delivery.estimatedArrival
          });
          socket.emit(EVENTS.DELIVERY.ASSIGNMENT_CONFIRMED, delivery);
          
          // Notify with priority
          await this.sendPrioritizedMessage(socket, io, {
            event: EVENTS.DELIVERY.ASSIGNMENT_CONFIRMED,
            data: delivery,
            priority: 'HIGH'
          });
        } catch (error) {
          logger.error('Delivery acceptance error:', error);
          socket.emit(EVENTS.ERROR, { message: 'Failed to accept delivery' });
          
          // Notify with priority
          await this.sendPrioritizedMessage(socket, io, {
            event: EVENTS.ERROR,
            data: { message: 'Failed to accept delivery' },
            priority: 'HIGH'
          });
        }
      });
  
      // Update delivery status
      socket.on(EVENTS.DELIVERY.UPDATE_STATUS, async (data) => {
        try {
          const delivery = await Delivery.updateStatus(data.deliveryId, data.status);
          io.to(`delivery:${data.deliveryId}`).emit(EVENTS.DELIVERY.STATUS_UPDATED, {
            deliveryId: data.deliveryId,
            status: data.status,
            timestamp: new Date()
          });
          
          // Notify with priority
          await this.sendPrioritizedMessage(socket, io, {
            event: EVENTS.DELIVERY.STATUS_UPDATED,
            data: {
              deliveryId: data.deliveryId,
              status: data.status,
              timestamp: new Date()
            },
            priority: 'HIGH'
          });
        } catch (error) {
          logger.error('Delivery status update error:', error);
          socket.emit(EVENTS.ERROR, { message: 'Failed to update delivery status' });
          
          // Notify with priority
          await this.sendPrioritizedMessage(socket, io, {
            event: EVENTS.ERROR,
            data: { message: 'Failed to update delivery status' },
            priority: 'HIGH'
          });
        }
      });
    },

      // Taxi Ride Management
  handleTaxiRides(socket, io) {
    // Accept ride request
    socket.on(EVENTS.TAXI.ACCEPT_REQUEST, async (data) => {
      try {
        const ride = await TaxiRide.accept({
          rideId: data.rideId,
          driverId: socket.user.id,
          estimatedArrival: data.estimatedArrival
        });
        // Join ride room
        socket.join(`ride:${data.rideId}`);
        // Calculate and confirm fare estimate
        const fareEstimate = await FareCalculationService.calculateEstimate({
          distance: data.distance,
          duration: data.duration,
          rideType: data.rideType
        });
        // Notify customer
        io.to(`customer:${ride.customerId}`).emit(EVENTS.TAXI.DRIVER_ASSIGNED, {
          rideId: ride.id,
          driverDetails: await Driver.getPublicProfile(socket.user.id),
          fareEstimate,
          estimatedArrival: ride.estimatedArrival
        });
        socket.emit(EVENTS.TAXI.ASSIGNMENT_CONFIRMED, {
          ride,
          fareEstimate
        });
        
        // Notify with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.TAXI.ASSIGNMENT_CONFIRMED,
          data: {
            ride,
            fareEstimate
          },
          priority: 'HIGH'
        });
      } catch (error) {
        logger.error('Taxi ride acceptance error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to accept taxi request' });
        
        // Notify with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.ERROR,
          data: { message: 'Failed to accept taxi request' },
          priority: 'HIGH'
        });
      }
    });

    // Update ride status
    socket.on(EVENTS.TAXI.UPDATE_STATUS, async (data) => {
      try {
        const ride = await TaxiRide.updateStatus(data.rideId, data.status);
        if (data.status === 'COMPLETED') {
          const finalFare = await FareCalculationService.calculateFinalFare({
            rideId: data.rideId,
            actualDistance: data.actualDistance,
            actualDuration: data.actualDuration,
            additionalCharges: data.additionalCharges
          });
          io.to(`ride:${data.rideId}`).emit(EVENTS.TAXI.RIDE_COMPLETED, {
            rideId: data.rideId,
            finalFare,
            timestamp: new Date()
          });
        } else {
          io.to(`ride:${data.rideId}`).emit(EVENTS.TAXI.STATUS_UPDATED, {
            rideId: data.rideId,
            status: data.status,
            timestamp: new Date()
          });
        }
        
        // Notify with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.TAXI.STATUS_UPDATED,
          data: {
            rideId: data.rideId,
            status: data.status,
            timestamp: new Date()
          },
          priority: 'HIGH'
        });
      } catch (error) {
        logger.error('Taxi status update error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to update ride status' });
        
        // Notify with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.ERROR,
          data: { message: 'Failed to update ride status' },
          priority: 'HIGH'
        });
      }
    });
  },

    // Route Optimization
    handleRouteOptimization(socket, io) {
      socket.on(EVENTS.DRIVER.ROUTE_OPTIMIZATION_REQUEST, async (data) => {
        try {
          const optimizedRoute = await RouteOptimizationService.optimize({
            currentLocation: data.currentLocation,
            destination: data.destination,
            waypoints: data.waypoints,
            trafficData: data.trafficData,
            weatherConditions: data.weatherConditions
          });
          socket.emit(EVENTS.DRIVER.ROUTE_OPTIMIZED, {
            route: optimizedRoute.route,
            estimatedDuration: optimizedRoute.duration,
            estimatedDistance: optimizedRoute.distance
          });
          
          // Notify with priority
          await this.sendPrioritizedMessage(socket, io, {
            event: EVENTS.DRIVER.ROUTE_OPTIMIZED,
            data: {
              route: optimizedRoute.route,
              estimatedDuration: optimizedRoute.duration,
              estimatedDistance: optimizedRoute.distance
            },
            priority: 'LOW'
          });
        } catch (error) {
          logger.error('Route optimization error:', error);
          socket.emit(EVENTS.ERROR, { message: 'Failed to optimize route' });
          
          // Notify with priority
          await this.sendPrioritizedMessage(socket, io, {
            event: EVENTS.ERROR,
            data: { message: 'Failed to optimize route' },
            priority: 'HIGH'
          });
        }
      });
    },

      // Availability Management
  handleAvailabilityUpdates(socket, io) {
    socket.on(EVENTS.DRIVER.UPDATE_AVAILABILITY, async (data) => {
      try {
        await Driver.updateAvailability(socket.user.id, {
          status: data.status,
          availableUntil: data.availableUntil,
          preferredZone: data.preferredZone
        });
        socket.emit(EVENTS.DRIVER.AVAILABILITY_UPDATED, {
          status: data.status,
          timestamp: new Date()
        });
        
        // Notify with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.DRIVER.AVAILABILITY_UPDATED,
          data: {
            status: data.status,
            timestamp: new Date()
          },
          priority: 'LOW'
        });
      } catch (error) {
        logger.error('Availability update error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to update availability' });
        
        // Notify with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.ERROR,
          data: { message: 'Failed to update availability' },
          priority: 'HIGH'
        });
      }
    });
  },

  // Location Updates
  handleLocationUpdates(socket, io) {
    socket.on(EVENTS.DRIVER.LOCATION_UPDATE, async (data) => {
      try {
        await Driver.updateLocation(socket.user.id, data.location);
        // Update active delivery/ride rooms with new location
        const activeJobs = await Driver.getActiveJobs(socket.user.id);
        activeJobs.forEach(job => {
          const roomType = job.type === 'DELIVERY' ? 'delivery' : 'ride';
          io.to(`${roomType}:${job.id}`).emit(EVENTS.DRIVER.LOCATION_UPDATED, {
            jobId: job.id,
            location: data.location,
            estimatedArrival: data.estimatedArrival
          });
        });
        
        // Notify with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.DRIVER.LOCATION_UPDATED,
          data: {
            location: data.location,
            estimatedArrival: data.estimatedArrival
          },
          priority: 'LOW'
        });
      } catch (error) {
        logger.error('Location update error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to update location' });
        
        // Notify with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.ERROR,
          data: { message: 'Failed to update location' },
          priority: 'HIGH'
        });
      }
    });
  },

    // Earnings Management
    handleEarningsManagement(socket, io) {
      // Record completed job earnings
      socket.on(EVENTS.DRIVER.RECORD_EARNINGS, async (data) => {
        try {
          const earnings = await Payment.recordDriverEarnings({
            driverId: socket.user.id,
            jobId: data.jobId,
            amount: data.amount,
            type: data.type,
            tips: data.tips
          });
          socket.emit(EVENTS.DRIVER.EARNINGS_RECORDED, {
            earnings,
            timestamp: new Date()
          });
          
          // Notify with priority
          await this.sendPrioritizedMessage(socket, io, {
            event: EVENTS.DRIVER.EARNINGS_RECORDED,
            data: {
              earnings,
              timestamp: new Date()
            },
            priority: 'LOW'
          });
        } catch (error) {
          logger.error('Earnings recording error:', error);
          socket.emit(EVENTS.ERROR, { message: 'Failed to record earnings' });
          
          // Notify with priority
          await this.sendPrioritizedMessage(socket, io, {
            event: EVENTS.ERROR,
            data: { message: 'Failed to record earnings' },
            priority: 'HIGH'
          });
        }
      });
  
      // Request earnings summary
      socket.on(EVENTS.DRIVER.REQUEST_EARNINGS_SUMMARY, async (data) => {
        try {
          const summary = await Payment.getDriverEarningsSummary(socket.user.id, {
            startDate: data.startDate,
            endDate: data.endDate
          });
          socket.emit(EVENTS.DRIVER.EARNINGS_SUMMARY, summary);
          
          // Notify with priority
          await this.sendPrioritizedMessage(socket, io, {
            event: EVENTS.DRIVER.EARNINGS_SUMMARY,
            data: summary,
            priority: 'LOW'
          });
        } catch (error) {
          logger.error('Earnings summary error:', error);
          socket.emit(EVENTS.ERROR, { message: 'Failed to fetch earnings summary' });
          
          // Notify with priority
          await this.sendPrioritizedMessage(socket, io, {
            event: EVENTS.ERROR,
            data: { message: 'Failed to fetch earnings summary' },
            priority: 'HIGH'
          });
        }
      });
    },
  
    // Performance Tracking
    handlePerformanceTracking(socket, io) {
      socket.on(EVENTS.DRIVER.REQUEST_PERFORMANCE_METRICS, async (data) => {
        try {
          const metrics = await Driver.getPerformanceMetrics(socket.user.id, {
            timeframe: data.timeframe,
            metrics: data.metrics
          });
          socket.emit(EVENTS.DRIVER.PERFORMANCE_METRICS, metrics);
          
          // Notify with priority
          await this.sendPrioritizedMessage(socket, io, {
            event: EVENTS.DRIVER.PERFORMANCE_METRICS,
            data: metrics,
            priority: 'LOW'
          });
        } catch (error) {
          logger.error('Performance metrics error:', error);
          socket.emit(EVENTS.ERROR, { message: 'Failed to fetch performance metrics' });
          
          // Notify with priority
          await this.sendPrioritizedMessage(socket, io, {
            event: EVENTS.ERROR,
            data: { message: 'Failed to fetch performance metrics' },
            priority: 'HIGH'
          });
        }
      });
    }
  };
  
  module.exports = driverHandlers;