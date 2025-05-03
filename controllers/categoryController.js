const Category = require('../models/Category');
const asyncHandler = require('express-async-handler');
const slugify = require('slugify'); // Uncomment if you implement slug generation in controller

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
const getCategories = asyncHandler(async (req, res) => {
    // Lọc chỉ lấy danh mục gốc (không có parent) nếu query parameter rootOnly=true
    const filter = req.query.rootOnly === 'true' ? { parentCategory: null } : {};
    
    // Có thể populate subcategories nếu cần
    const populate = req.query.includeSubcategories === 'true' ? 'subcategories' : '';
    
    const categories = await Category.find(filter).populate(populate);
    res.json(categories);
});

// @desc    Get category by ID
// @route   GET /api/categories/:id
// @access  Public
const getCategoryById = asyncHandler(async (req, res) => {
    // Có thể populate subcategories nếu cần
    const populateOptions = req.query.includeSubcategories === 'true' ? 'subcategories' : '';
    
    const category = await Category.findById(req.params.id).populate(populateOptions);

    if (category) {
        res.json(category);
    } else {
        res.status(404);
        throw new Error('Category not found');
    }
});

// @desc    Get subcategories of a category
// @route   GET /api/categories/:id/subcategories
// @access  Public
const getSubcategories = asyncHandler(async (req, res) => {
    const subcategories = await Category.find({ parentCategory: req.params.id });
    res.json(subcategories);
});

// @desc    Create a category
// @route   POST /api/categories
// @access  Private/Admin
const createCategory = asyncHandler(async (req, res) => {
    const { name, description, image, parentCategory } = req.body;

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

    // Kiểm tra parentCategory có tồn tại không (nếu được cung cấp)
    if (parentCategory) {
        const parentExists = await Category.findById(parentCategory);
        if (!parentExists) {
            res.status(400);
            throw new Error(`Parent category with id "${parentCategory}" does not exist`);
        }
    }

    const category = new Category({
        name,
        description,
        image,
        parentCategory: parentCategory || null,
        slug: slugify(name, { lower: true, strict: true }), // Uncomment if using slugify
    });

    const createdCategory = await category.save();
    res.status(201).json(createdCategory);
});

// @desc    Update a category
// @route   PUT /api/categories/:id
// @access  Private/Admin
const updateCategory = asyncHandler(async (req, res) => {
    const { name, description, image, isActive, parentCategory } = req.body;

    const category = await Category.findById(req.params.id);

    if (category) {
        // Kiểm tra không để category là parent của chính nó
        if (parentCategory && parentCategory.toString() === req.params.id) {
            res.status(400);
            throw new Error('Category cannot be its own parent');
        }

        // Kiểm tra parentCategory có tồn tại không (nếu được cung cấp)
        if (parentCategory) {
            const parentExists = await Category.findById(parentCategory);
            if (!parentExists) {
                res.status(400);
                throw new Error(`Parent category with id "${parentCategory}" does not exist`);
            }
        }

        category.name = name !== undefined ? name : category.name;
        category.description = description !== undefined ? description : category.description;
        category.image = image !== undefined ? image : category.image;
        category.isActive = isActive !== undefined ? isActive : category.isActive;
        category.parentCategory = parentCategory !== undefined ? parentCategory : category.parentCategory;

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
        // Kiểm tra xem có danh mục con không
        const hasSubcategories = await Category.countDocuments({ parentCategory: req.params.id });
        
        if (hasSubcategories > 0 && req.query.force !== 'true') {
            res.status(400);
            throw new Error('This category has subcategories. Set force=true to delete anyway.');
        }

        // Nếu force=true thì có thể update tất cả danh mục con về null parentCategory
        if (req.query.force === 'true') {
            await Category.updateMany(
                { parentCategory: req.params.id },
                { parentCategory: null }
            );
        }
        
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
    getSubcategories,
    createCategory,
    updateCategory,
    deleteCategory,
};