const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { auth, checkRole } = require('../middleware/auth');

const router = express.Router();

// Create an order (authenticated users)
router.post('/', auth, async (req, res) => {
  try {
    const { products, shippingAddress } = req.body;
    
    // Calculate total price and validate products
    let totalPrice = 0;
    for (const item of products) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(400).json({ error: `Product ${item.product} not found` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for ${product.name}` });
      }
      totalPrice += product.price * item.quantity;
      
      // Update product stock
      product.stock -= item.quantity;
      await product.save();
    }

    const order = new Order({
      user: req.user._id,
      products,
      totalPrice,
      shippingAddress
    });

    await order.save();
    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all orders (admin/employee only)
router.get('/', auth, checkRole(['admin', 'employee']), async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const filter = {};
    if (status) filter.orderStatus = status;
    
    const orders = await Order.find(filter)
      .populate('user', 'email')
      .populate('products.product', 'name price')
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ createdAt: -1 });
    
    const total = await Order.countDocuments(filter);
    res.json({ orders, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a single order by ID (admin/employee or buyer)
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'email')
      .populate('products.product', 'name price');
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if user is admin/employee or the buyer
    if (req.user.role !== 'admin' && req.user.role !== 'employee' && order.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update order status (admin/employee only)
router.put('/:id/status', auth, checkRole(['admin', 'employee']), async (req, res) => {
  try {
    const { orderStatus, paymentStatus } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { orderStatus, paymentStatus },
      { new: true, runValidators: true }
    ).populate('user', 'email').populate('products.product', 'name price');

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete an order (admin/employee only)
router.delete('/:id', auth, checkRole(['admin', 'employee']), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Restore product stock
    for (const item of order.products) {
      const product = await Product.findById(item.product);
      if (product) {
        product.stock += item.quantity;
        await product.save();
      }
    }

    await order.remove();
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 