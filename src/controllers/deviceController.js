// src/controllers/deviceController.js
const deviceService = require('@services/deviceService');
const AppError = require('@utils/AppError');
const UAParser = require('ua-parser-js');

class DeviceController {
    /**
     * Get all devices for the authenticated user
     */
    async getUserDevices(req, res, next) {
        try {
            const devices = await deviceService.getUserDevices(req.user.id);
            res.status(200).json({
                status: 'success',
                data: devices
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get device analytics within a date range
     */
    async getDeviceAnalytics(req, res, next) {
        try {
            const startDate = req.query.startDate 
                ? new Date(req.query.startDate) 
                : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            
            const endDate = req.query.endDate 
                ? new Date(req.query.endDate) 
                : new Date();

            if (startDate > endDate) {
                throw new AppError('Start date cannot be after end date', 400);
            }

            const analytics = await deviceService.getDeviceAnalytics(startDate, endDate);
            res.status(200).json({
                status: 'success',
                data: analytics
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Remove a specific device
     */
    async removeDevice(req, res, next) {
        try {
            const { deviceId } = req.params;
            
            if (!deviceId) {
                throw new AppError('Device ID is required', 400);
            }

            await deviceService.removeDevice(req.user.id, deviceId);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }

    /**
     * Track a new device or update existing device information
     */
    async trackDevice(req, res, next) {
        try {
            // Use the deviceInfo from middleware if available
            if (!req.deviceInfo) {
                throw new AppError('Device information not available', 400);
            }

            await deviceService.trackDevice(req.user.id, req.deviceInfo);
            
            res.status(200).json({
                status: 'success',
                message: 'Device tracked successfully',
                data: {
                    platform: req.deviceInfo.platform,
                    platformVersion: req.deviceInfo.platformVersion,
                    capabilities: {
                        pushNotifications: req.deviceInfo.supportsPushNotifications,
                        webGL: req.deviceInfo.supportsWebGL,
                        webWorkers: req.deviceInfo.supportsWebWorkers,
                        indexedDB: req.deviceInfo.supportsIndexedDB,
                        geolocation: req.deviceInfo.supportsGeolocation
                    },
                    platformFeatures: req.deviceInfo.platformFeatures
                }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update device settings
     */
    async updateDeviceSettings(req, res, next) {
        try {
            const { deviceId } = req.params;
            const { pushNotifications, emailNotifications, language } = req.body;

            // Validate that the device exists and belongs to the user
            const device = await deviceService.getUserDevices(req.user.id);
            const userDevice = device.find(d => d.device_id === deviceId);

            if (!userDevice) {
                throw new AppError('Device not found or unauthorized', 404);
            }

            // Check if push notifications are supported before enabling
            if (pushNotifications && !req.deviceInfo?.supportsPushNotifications) {
                throw new AppError('Push notifications are not supported on this device', 400);
            }

            const updatedDevice = await deviceService.updateDeviceSettings(
                req.user.id,
                deviceId,
                {
                    pushNotifications,
                    emailNotifications,
                    language,
                    lastUpdated: new Date()
                }
            );

            res.status(200).json({
                status: 'success',
                data: updatedDevice
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get device capabilities
     */
    async getDeviceCapabilities(req, res, next) {
        try {
            if (!req.deviceInfo) {
                throw new AppError('Device information not available', 400);
            }

            res.status(200).json({
                status: 'success',
                data: {
                    platform: req.deviceInfo.platform,
                    platformVersion: req.deviceInfo.platformVersion,
                    browser: req.deviceInfo.browser,
                    browserVersion: req.deviceInfo.browserVersion,
                    capabilities: {
                        pushNotifications: req.deviceInfo.supportsPushNotifications,
                        webGL: req.deviceInfo.supportsWebGL,
                        webWorkers: req.deviceInfo.supportsWebWorkers,
                        indexedDB: req.deviceInfo.supportsIndexedDB,
                        geolocation: req.deviceInfo.supportsGeolocation,
                        deviceMemory: req.deviceInfo.deviceMemory,
                        hardwareConcurrency: req.deviceInfo.hardwareConcurrency
                    },
                    platformFeatures: req.deviceInfo.platformFeatures
                }
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new DeviceController();