const express = require('express');
const router = express.Router();
const {
    getCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory,
} = require('../controllers/categoryController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Swagger Definitions for Category
/**
 * @swagger
 * components:
 *   schemas:
 *     Category:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the category
 *         name:
 *           type: string
 *           description: The name of the category (e.g., Running, Casual)
 *         slug:
 *           type: string
 *           description: URL-friendly slug generated from the name
 *         description:
 *           type: string
 *           description: Optional description of the category
 *         image:
 *           type: string
 *           description: Optional URL of an image representing the category
 *         isActive:
 *           type: boolean
 *           description: Whether the category is active
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp of creation
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp of last update
 *       example:
 *         _id: 60d0fe4f5311236168a109cb
 *         name: 'Running'
 *         slug: 'running'
 *         description: 'Shoes designed for running.'
 *         image: 'http://example.com/running.jpg'
 *         isActive: true
 *         createdAt: '2023-01-01T12:00:00.000Z'
 *         updatedAt: '2023-01-01T12:30:00.000Z'
 *
 *   requestBodies:
 *     CategoryInput:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: The name of the category
 *               description:
 *                 type: string
 *                 description: Optional description
 *               image:
 *                 type: string
 *                 description: Optional image URL
 *             example:
 *               name: 'Casual'
 *               description: 'Everyday wear shoes.'
 *
 *     CategoryUpdateInput:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: New name for the category
 *               description:
 *                 type: string
 *                 description: New description
 *               image:
 *                 type: string
 *                 description: New image URL
 *               isActive:
 *                 type: boolean
 *                 description: New active status
 *             example:
 *               description: 'Comfortable shoes for daily use.'
 *               isActive: false
 *
 * tags:
 *   name: Categories
 *   description: API for managing product categories
 */

// Routes
/**
 * @swagger
 * /categories:
 *   get:
 *     summary: Returns the list of all categories
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: The list of categories
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Category'
 *   post:
 *     summary: Create a new category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       $ref: '#/components/requestBodies/CategoryInput'
 *     responses:
 *       201:
 *         description: The category was successfully created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Category'
 *       400:
 *         description: Invalid input or category already exists
 *       401:
 *         description: Not authorized, token failed
 *       403:
 *         description: Not authorized as an admin
 */
router.route('/').get(getCategories).post(protect, authorize('admin'), createCategory);

/**
 * @swagger
 * /categories/{id}:
 *   get:
 *     summary: Get the category by id
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The category id
 *     responses:
 *       200:
 *         description: The category description by id
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Category'
 *       404:
 *         description: The category was not found
 *   put:
 *     summary: Update the category by the id
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The category id
 *     requestBody:
 *       $ref: '#/components/requestBodies/CategoryUpdateInput'
 *     responses:
 *       200:
 *         description: The category was updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Category'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Not authorized, token failed
 *       403:
 *         description: Not authorized as an admin
 *       404:
 *         description: The category was not found
 *   delete:
 *     summary: Remove the category by id
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The category id
 *     responses:
 *       200:
 *         description: The category was deleted
 *       401:
 *         description: Not authorized, token failed
 *       403:
 *         description: Not authorized as an admin
 *       404:
 *         description: The category was not found
 */
router
    .route('/:id')
    .get(getCategoryById)
    .put(protect, authorize('admin'), updateCategory)
    .delete(protect, authorize('admin'), deleteCategory);

module.exports = router;