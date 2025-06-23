const express = require('express');
const Category = require('../models/Category');
const { auth, checkRole } = require('../middleware/auth');

const router = express.Router();

// Create a category (admin/employee only)
router.post('/', auth, checkRole(['admin', 'employee']), async (req, res) => {
  try {
    const category = new Category(req.body);
    await category.save();
    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all categories (with parent-child relationships)
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find()
      .populate('parent', 'name')
      .sort({ name: 1 });
    
    // Organize categories into a tree structure
    const categoryTree = categories.reduce((tree, category) => {
      if (!category.parent) {
        tree.push({
          ...category.toObject(),
          subcategories: categories
            .filter(c => c.parent && c.parent._id.toString() === category._id.toString())
            .map(c => c.toObject())
        });
      }
      return tree;
    }, []);

    res.json(categoryTree);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a single category by ID
router.get('/:id', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id)
      .populate('parent', 'name');
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Get subcategories
    const subcategories = await Category.find({ parent: category._id });
    const categoryWithSubs = {
      ...category.toObject(),
      subcategories
    };

    res.json(categoryWithSubs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a category (admin/employee only)
router.put('/:id', auth, checkRole(['admin', 'employee']), async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('parent', 'name');

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete a category (admin/employee only)
router.delete('/:id', auth, checkRole(['admin', 'employee']), async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Check if category has subcategories
    const hasSubcategories = await Category.exists({ parent: category._id });
    if (hasSubcategories) {
      return res.status(400).json({ error: 'Cannot delete category with subcategories' });
    }

    await category.remove();
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 