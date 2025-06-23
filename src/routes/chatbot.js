const express = require('express');
const { generateChatbotResponse } = require('../services/ai');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get chatbot response
router.post('/chat', auth, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const response = await generateChatbotResponse(message);
    res.json({ response });
  } catch (error) {
    console.error('Chatbot error:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

module.exports = router; 