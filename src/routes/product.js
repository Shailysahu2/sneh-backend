const express = require('express');
const Product = require('../models/Product');
const { auth, checkRole } = require('../middleware/auth');
const { summarizeText, searchProducts } = require('../services/ai');

const router = express.Router();

// Create a product (admin/employee only)
router.post('/', auth, checkRole(['admin', 'employee']), async (req, res) => {
  try {
    const { name, description, price, category, stock, images } = req.body;
    // Generate summary if description is long
    const summary = description.length > 200 ? await summarizeText(description) : description;
    const product = new Product({ name, description, summary, price, category, stock, images });
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all products with AI-powered search
router.get('/', async (req, res) => {
  try {
    const { query, category, minPrice, maxPrice, sort } = req.query;
    let products;

    if (query) {
      // Use AI-powered search
      products = await searchProducts(query, { category, minPrice, maxPrice, sort });
    } else {
      // Regular MongoDB query
      const filter = {};
      if (category) filter.category = category;
      if (minPrice || maxPrice) {
        filter.price = {};
        if (minPrice) filter.price.$gte = minPrice;
        if (maxPrice) filter.price.$lte = maxPrice;
      }

      let sortOption = {};
      if (sort === 'price_asc') sortOption = { price: 1 };
      else if (sort === 'price_desc') sortOption = { price: -1 };
      else if (sort === 'rating') sortOption = { rating: -1 };

      products = await Product.find(filter).sort(sortOption);
    }

    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a single product
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a product (admin/employee only)
router.put('/:id', auth, checkRole(['admin', 'employee']), async (req, res) => {
  try {
    const { name, description, price, category, stock, images } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (description) {
      updates.description = description;
      // Update summary if description is long
      updates.summary = description.length > 200 ? await summarizeText(description) : description;
    }
    if (price) updates.price = price;
    if (category) updates.category = category;
    if (stock !== undefined) updates.stock = stock;
    if (images) updates.images = images;

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete a product (admin/employee only)
router.delete('/:id', auth, checkRole(['admin', 'employee']), async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 