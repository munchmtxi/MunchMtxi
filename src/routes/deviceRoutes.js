const express = require('express');
const { getUserDevices, removeDevice } = require('@services/deviceService');
const authMiddleware = require('@middleware/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Devices
 *   description: Endpoints for managing user devices
 */

router.use(authenticate);

/**
 * @swagger
 * /devices:
 *   get:
 *     summary: Get all devices for the authenticated user
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of devices retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       deviceId:
 *                         type: string
 *                         example: "device123"
 *                       deviceType:
 *                         type: string
 *                         example: "mobile"
 *                       lastUsedAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2023-10-01T12:34:56Z"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/', async (req, res, next) => {
  try {
    const devices = await getUserDevices(req.user.id);
    res.status(200).json({ status: 'success', data: devices });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /devices/{deviceId}:
 *   delete:
 *     summary: Remove a specific device
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the device to remove
 *     responses:
 *       204:
 *         description: Device removed successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Device not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:deviceId', async (req, res, next) => {
  try {
    await removeDevice(req.user.id, req.params.deviceId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;