const express = require('express');
const Product = require('../models/Product');
const { auth, checkRole } = require('../middleware/auth');
const { summarizeText, searchProducts } = require('../services/ai');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Multer setup for local storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Test endpoints (must come before /:id route)
router.get('/test', (req, res) => {
  res.json({ message: 'Product route is working!' });
});

router.get('/test-image', (req, res) => {
  res.json({ 
    message: 'Image test endpoint',
    sampleImageUrl: '/uploads/1751802259197-photo.jpg',
    fullUrl: 'http://localhost:3000/uploads/1751802259197-photo.jpg'
  });
});

// Create a product (admin/employee only)
router.post('/', /* auth, checkRole(['admin', 'employee']), */ upload.array('images'), async (req, res) => {
  try {
    console.log('Received product creation request:');
    console.log('Body:', req.body);
    console.log('Files:', req.files);
    
    const { name, description, price, category, stock, brand, sku } = req.body;
    
    // Validate required fields
    if (!name || !description || !price || !category || !brand) {
      console.log('Missing required fields:', { name, description, price, category, brand });
      return res.status(400).json({ 
        error: 'Missing required fields: name, description, price, category, and brand are required' 
      });
    }

    // Generate summary if description is long
    // const summary = description.length > 200 ? await summarizeText(description) : description;
    const summary = description.length > 200 ? description.substring(0, 200) + '...' : description;
    
    let images = [];
    if (req.files && req.files.length > 0) {
      images = req.files.map(file => ({ url: `/uploads/${file.filename}` }));
    } else if (req.body.images) {
      // If images are sent as JSON (URLs)
      try {
        images = JSON.parse(req.body.images);
      } catch (e) {
        images = req.body.images;
      }
    }

    const productData = {
      name,
      description,
      summary,
      price: Number(price),
      category,
      stock: Number(stock) || 0,
      brand,
      sku: sku || `SKU${Date.now()}`,
      images,
      seller: req.user?._id || '507f1f77bcf86cd799439011' // Use authenticated user or default ObjectId for testing
    };

    console.log('Creating product with data:', productData);

    const product = new Product(productData);
    await product.save();
    console.log('Product created successfully:', product._id);
    res.status(201).json(product);
  } catch (error) {
    console.error('Product creation error:', error);
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
router.put('/:id', /* auth, checkRole(['admin', 'employee']), */ async (req, res) => {
  try {
    const { name, description, price, category, brand, stock, sku, isActive } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (description) {
      updates.description = description;
      // Update summary if description is long
      updates.summary = description.length > 200 ? description.substring(0, 200) + '...' : description;
    }
    if (price !== undefined) updates.price = Number(price);
    if (category) updates.category = category;
    if (brand) updates.brand = brand;
    if (stock !== undefined) updates.stock = Number(stock);
    if (sku) updates.sku = sku;
    if (isActive !== undefined) updates.isActive = isActive;

    console.log('Updating product with data:', updates);

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (error) {
    console.error('Product update error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Delete a product (admin/employee only)
router.delete('/:id', /* auth, checkRole(['admin', 'employee']), */ async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 