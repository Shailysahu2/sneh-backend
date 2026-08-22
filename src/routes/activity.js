const express = require('express');
const RecentActivity = require('../models/RecentActivity');

const router = express.Router();

// Get recent activities (most recent first)
router.get('/recent', async (req, res) => {
  try {
    const activities = await RecentActivity.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('user', 'email firstName lastName');
    res.json(activities);
  } catch (error) {
    console.error('Error fetching recent activities:', error);
    res.status(500).json({ message: 'Failed to load recent activities' });
  }
});

module.exports = router;
