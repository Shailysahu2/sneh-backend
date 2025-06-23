const express = require('express');
const Review = require('../models/Review');
const Product = require('../models/Product');
const { auth, checkRole } = require('../middleware/auth');
const { analyzeSentiment } = require('../services/ai');

const router = express.Router();

// Helper to update product rating and review count
async function updateProductStats(productId) {
  const reviews = await Review.find({ product: productId });
  const numReviews = reviews.length;
  const rating = numReviews ? (reviews.reduce((sum, r) => sum + r.rating, 0) / numReviews) : 0;
  await Product.findByIdAndUpdate(productId, { numReviews, rating });
}

// Create a review (one per user per product)
router.post('/', auth, async (req, res) => {
  try {
    const { product, rating, comment } = req.body;
    // Check if user already reviewed this product
    const existing = await Review.findOne({ user: req.user._id, product });
    if (existing) {
      return res.status(400).json({ error: 'You have already reviewed this product.' });
    }
    // Analyze sentiment
    const sentiment = await analyzeSentiment(comment);
    const review = new Review({ user: req.user._id, product, rating, comment, sentiment });
    await review.save();
    await updateProductStats(product);
    res.status(201).json(review);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all reviews for a product
router.get('/product/:productId', async (req, res) => {
  try {
    const reviews = await Review.find({ product: req.params.productId })
      .populate('user', 'email')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a review (reviewer or admin)
router.put('/:id', auth, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ error: 'Review not found' });
    if (review.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    const { rating, comment } = req.body;
    if (rating) review.rating = rating;
    if (comment) {
      review.comment = comment;
      // Re-analyze sentiment
      review.sentiment = await analyzeSentiment(comment);
    }
    await review.save();
    await updateProductStats(review.product);
    res.json(review);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete a review (reviewer or admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ error: 'Review not found' });
    if (review.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    await review.remove();
    await updateProductStats(review.product);
    res.json({ message: 'Review deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 