const Category = require('../models/Category');
const asyncHandler = require('express-async-handler');
// const slugify = require('slugify'); // Uncomment if you implement slug generation in controller

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
const getCategories = asyncHandler(async (req, res) => {
    const categories = await Category.find({});
    res.json(categories);
});

// @desc    Get category by ID
// @route   GET /api/categories/:id
// @access  Public
const getCategoryById = asyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id);

    if (category) {
        res.json(category);
    } else {
        res.status(404);
        throw new Error('Category not found');
    }
});

// @desc    Create a category
// @route   POST /api/categories
// @access  Private/Admin
const createCategory = asyncHandler(async (req, res) => {
    const { name, description, image } = req.body;

    // Basic validation
    if (!name) {
        res.status(400);
        throw new Error('Please provide a category name');
    }

    const categoryExists = await Category.findOne({ name });

    if (categoryExists) {
        res.status(400);
        throw new Error(`Category "${name}" already exists`);
    }

    const category = new Category({
        name,
        description,
        image,
        // slug: slugify(name, { lower: true, strict: true }), // Uncomment if using slugify
    });

    const createdCategory = await category.save();
    res.status(201).json(createdCategory);
});

// @desc    Update a category
// @route   PUT /api/categories/:id
// @access  Private/Admin
const updateCategory = asyncHandler(async (req, res) => {
    const { name, description, image, isActive } = req.body;

    const category = await Category.findById(req.params.id);

    if (category) {
        category.name = name !== undefined ? name : category.name;
        category.description = description !== undefined ? description : category.description;
        category.image = image !== undefined ? image : category.image;
        category.isActive = isActive !== undefined ? isActive : category.isActive;

        // if (name !== undefined && name !== category.name) { // Uncomment if using slugify and name is updated
        //    category.slug = slugify(name, { lower: true, strict: true });
        // }


        const updatedCategory = await category.save();
        res.json(updatedCategory);
    } else {
        res.status(404);
        throw new Error('Category not found');
    }
});

// @desc    Delete a category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
const deleteCategory = asyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id);

    if (category) {
        await category.deleteOne();
        res.json({ message: 'Category removed' });
    } else {
        res.status(404);
        throw new Error('Category not found');
    }
});

module.exports = {
    getCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory,
};