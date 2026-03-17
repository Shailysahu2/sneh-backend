const express = require('express');
const { getQwenInstructResponse } = require('../services/ai');
const { auth } = require('../middleware/auth');

const router = express.Router();

// AI search endpoint (requires login)
router.post('/search', auth, async (req, res) => {
  try {
    const { query, history } = req.body || {};
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'query is required' });
    }

    const response = await getQwenInstructResponse(query, history);
    res.json({ response });
  } catch (error) {
    console.error('Chatbot error:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

module.exports = router; 