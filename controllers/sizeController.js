const Size = require('../models/Size');
const asyncHandler = require('express-async-handler');

// @desc    Get all sizes
// @route   GET /api/sizes
// @access  Public
const getSizes = asyncHandler(async (req, res) => {
    const sizes = await Size.find({});
    res.json(sizes);
});

// @desc    Get size by ID
// @route   GET /api/sizes/:id
// @access  Public
const getSizeById = asyncHandler(async (req, res) => {
    const size = await Size.findById(req.params.id);

    if (size) {
        res.json(size);
    } else {
        res.status(404);
        throw new Error('Size not found');
    }
});

// @desc    Create a size
// @route   POST /api/sizes
// @access  Private/Admin
const createSize = asyncHandler(async (req, res) => {
    const { category, system, values } = req.body;

    // Basic validation
    if (!category || !system || !values || !Array.isArray(values) || values.length === 0) {
        res.status(400);
        throw new Error('Please provide category, system, and values for the size');
    }

    const createdSizes = [];
    for (const value of values) {
        // Check if the size already exists
        const sizeExists = await Size.findOne({ category, system, value });
        if (sizeExists) {
            // If the size exists, skip creating it and continue to the next value
            console.log(`Size already exists: ${category} - ${system} - ${value}. Skipping creation.`);
            continue; // Skip to the next value
        }

        const size = new Size({
            category,
            system,
            value,
        });
        const createdSize = await size.save();
        createdSizes.push(createdSize);
    }

    if (createdSizes.length === 0) {
        res.status(400);
        throw new Error('No new sizes were created. All sizes already exist.');
    }

    res.status(201).json(createdSizes);
});

// @desc    Update a size
// @route   PUT /api/sizes/:id
// @access  Private/Admin
const updateSize = asyncHandler(async (req, res) => {
    const { category, system, value } = req.body; // Changed values to value

    const size = await Size.findById(req.params.id);

    if (size) {
        // Check if the updated combination already exists (optional but recommended)
        const existingSize = await Size.findOne({
            category: category || size.category,
            system: system || size.system,
            value: value || size.value,
            _id: { $ne: req.params.id } // Exclude the current document
        });

        if (existingSize) {
            res.status(400);
            throw new Error(`Another size with combination ${category || size.category}-${system || size.system}-${value || size.value} already exists.`);
        }

        size.category = category || size.category;
        size.system = system || size.system;
        size.value = value || size.value; // Assign single value
        const updatedSize = await size.save();
        res.json(updatedSize);
    } else {
        res.status(404);
        throw new Error('Size not found');
    }
});

// @desc    Delete a size
// @route   DELETE /api/sizes/:id
// @access  Private/Admin
const deleteSize = asyncHandler(async (req, res) => {
    const size = await Size.findById(req.params.id);

    if (size) {
        await size.deleteOne(); // Use deleteOne() or remove() depending on Mongoose version
        res.json({ message: 'Size removed' });
    } else {
        res.status(404);
        throw new Error('Size not found');
    }
});

module.exports = {
    getSizes,
    getSizeById,
    createSize,
    updateSize,
    deleteSize,
};