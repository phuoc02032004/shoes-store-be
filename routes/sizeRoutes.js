const express = require('express');
const router = express.Router();
const {
    getSizes,
    getSizeById,
    createSize,
    updateSize,
    deleteSize,
} = require('../controllers/sizeController'); // Assuming sizeController exports these correctly
const { protect, authorize } = require('../middleware/authMiddleware');

// Swagger Definitions for Size
/**
 * @swagger
 * components:
 *   schemas:
 *     Size:
 *       type: object
 *       required:
 *         - category
 *         - system
 *         - values
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the size record
 *         category:
 *           type: string
 *           enum: [men, women, kids]
 *           description: The category the sizes belong to (e.g., men, women)
 *         system:
 *           type: string
 *           enum: [EU, US, UK, CM, Standard]
 *           description: The sizing system used (e.g., EU)
 *         values:
 *           type: array
 *           items:
 *             type: string # Or number, depending on how you store them
 *           description: The available size values for this category and system (e.g., ['41', '42', '44'])
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp of creation
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp of last update
 *       example:
 *         _id: 60d0fe4f5311236168a109cb # Example ID
 *         category: 'women'
 *         system: 'EU'
 *         values: ['41', '42', '44']
 *         createdAt: '2023-01-01T12:00:00.000Z'
 *         updatedAt: '2023-01-01T12:30:00.000Z'
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * tags:
 *   name: Sizes
 *   description: API for managing shoe size availability by category and system
 */

// Routes
/**
 * @swagger
 * /sizes:
 *   get:
 *     summary: Returns the list of all size availability records
 *     tags: [Sizes]
 *     responses:
 *       200:
 *         description: The list of size records
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Size'
 *   post:
 *     summary: Create a new size availability record
 *     tags: [Sizes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - category
 *               - system
 *               - values
 *             properties:
 *               category:
 *                 type: string
 *                 enum: [men, women, kids]
 *                 description: Category for the sizes
 *               system:
 *                 type: string
 *                 enum: [EU, US, UK, CM, Standard]
 *                 description: Sizing system
 *               values:
 *                 type: array
 *                 items:
 *                   type: string # Or number
 *                 description: Array of available size values
 *             example:
 *               category: 'men'
 *               system: 'EU'
 *               values: ['44', '45', '46']
 *     responses:
 *       201:
 *         description: The size record was successfully created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Size'
 *       400:
 *         description: Invalid input data or size record already exists for this category/system
 *       401:
 *         description: Not authorized, token failed
 *       403:
 *         description: Not authorized as an admin
 */
// Note: The base path in swagger is /api/sizes
router.route('/').get(getSizes).post(protect, authorize('admin'), createSize);

/**
 * @swagger
 * /api/sizes/{id}:
 *   get:
 *     summary: Get a size availability record by id
 *     tags: [Sizes]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The size record id
 *     responses:
 *       200:
 *         description: The size record description by id
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Size'
 *       404:
 *         description: The size record was not found
 *   put:
 *     summary: Update the size availability record by id
 *     tags: [Sizes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The size record id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               category:
 *                 type: string
 *                 enum: [men, women, kids]
 *                 description: Optional new category
 *               system:
 *                 type: string
 *                 enum: [EU, US, UK, CM, Standard]
 *                 description: Optional new sizing system
 *               values:
 *                 type: array
 *                 items:
 *                   type: string # Or number
 *                 description: Optional new array of size values
 *             example:
 *               system: 'UK'
 *               values: ['9.5', '10', '11'] # Example update
 *     responses:
 *       200:
 *         description: The size record was updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Size'
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Not authorized, token failed
 *       403:
 *         description: Not authorized as an admin
 *       404:
 *         description: The size record was not found
 *   delete:
 *     summary: Remove the size availability record by id
 *     tags: [Sizes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The size record id
 *     responses:
 *       200:
 *         description: The size record was deleted
 *       401:
 *         description: Not authorized, token failed
 *       403:
 *         description: Not authorized as an admin
 *       404:
 *         description: The size record was not found
 */
// Note: The base path in swagger is /api/sizes/{id}
router
    .route('/:id')
    .get(getSizeById)
    .put(protect, authorize('admin'), updateSize)
    .delete(protect, authorize('admin'), deleteSize);

module.exports = router;