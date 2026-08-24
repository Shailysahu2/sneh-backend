const express = require('express');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const RecentActivity = require('../models/RecentActivity');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      role,
      addresses,
      preferences
    } = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        message: 'Missing required fields',
        details: {
          email: !email ? 'Email is required' : null,
          password: !password ? 'Password is required' : null,
          firstName: !firstName ? 'First name is required' : null,
          lastName: !lastName ? 'Last name is required' : null
        }
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        message: 'User already exists',
        details: {
          email: 'An account with this email already exists'
        }
      });
    }

    // Create user with all fields
    const user = new User({
      email,
      password,
      firstName,
      lastName,
      phone,
      role,
      addresses: addresses || [],
      preferences: preferences || {
        notifications: {
          email: true,
          sms: false,
          push: true
        },
        language: 'en',
        currency: 'USD',
        theme: 'light'
      }
    });

    await user.save();

    // Create a recent activity entry for admin
    try {
      await RecentActivity.create({
        type: 'user',
        message: `New user registered: ${user.firstName} ${user.lastName} (${user.email})`,
        user: user._id,
        data: { email: user.email }
      });
    } catch (actErr) {
      console.error('Failed to create recent activity:', actErr);
    }

    // Send notification email to admin (SMTP-only). Fire-and-forget so registration stays fast.
    try {
      if (process.env.EMAIL_HOST && process.env.ADMIN_EMAIL) {
        const port = parseInt(process.env.EMAIL_PORT || '587', 10);
        const isSecure = port === 465;

        const transporter = nodemailer.createTransport({
          host: process.env.EMAIL_HOST,
          port,
          secure: isSecure,
          auth: process.env.EMAIL_USER ? {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS
          } : undefined,
          tls: { rejectUnauthorized: false },
          connectionTimeout: 10000,
          greetingTimeout: 10000,
          socketTimeout: 20000
        });

        const masked = { host: process.env.EMAIL_HOST, port, secure: isSecure, auth: transporter.options.auth ? { user: transporter.options.auth.user, pass: '***' } : undefined };
        console.log('Creating SMTP transporter with options (masked):', masked);

        // helper to avoid verify hanging forever
        const verifyWithTimeout = (trans, ms) => Promise.race([
          trans.verify(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('verify timeout')), ms))
        ]);

        // non-blocking verify and send
        verifyWithTimeout(transporter, 8000)
          .then(() => console.log('SMTP transporter verified and ready'))
          .catch(err => console.error('SMTP transporter verification failed:', err && err.message ? err.message : err));

        const mailOptions = {
          from: process.env.EMAIL_USER || `no-reply@${req.hostname}`,
          to: process.env.ADMIN_EMAIL,
          subject: 'New user registration',
          text: `A new user has registered.\n\nName: ${user.firstName} ${user.lastName}\nEmail: ${user.email}\nPhone: ${user.phone || 'N/A'}\nRegistered At: ${user.createdAt}`
        };

        transporter.sendMail(mailOptions)
          .then(info => console.log('Admin notification email sent:', info && info.messageId))
          .catch(err => console.error('Failed to send admin notification email:', err && err.message ? err.message : err));
      } else {
        console.log('EMAIL_HOST or ADMIN_EMAIL not configured; skipping admin email');
      }
    } catch (emailErr) {
      console.error('Error while attempting to send admin email:', emailErr && emailErr.message ? emailErr.message : emailErr);
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user._id, 
        role: user.role,
        email: user.email 
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );

    // Return user data and token
    res.status(201).json({
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
        isVerified: user.isVerified,
        addresses: user.addresses,
        preferences: user.preferences,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({
      message: 'Registration failed',
      details: error.message
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { 
        id: user._id, 
        role: user.role,
        email: user.email 
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );
    res.json({
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
        isVerified: user.isVerified,
        addresses: user.addresses,
        preferences: user.preferences,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      token
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 