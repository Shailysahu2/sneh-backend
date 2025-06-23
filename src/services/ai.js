const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;
const HUGGINGFACE_API_URL = 'https://api-inference.huggingface.co/models';

// Sentiment analysis using BERT
async function analyzeSentiment(text) {
  try {
    const response = await axios.post(
      `${HUGGINGFACE_API_URL}/nlptown/bert-base-multilingual-uncased-sentiment`,
      { inputs: text },
      {
        headers: {
          'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    const score = response.data[0][0].score;
    if (score > 0.6) return 'positive';
    if (score < 0.4) return 'negative';
    return 'neutral';
  } catch (error) {
    console.error('Sentiment analysis error:', error);
    return 'neutral';
  }
}

// Chatbot using DialoGPT
async function getChatbotResponse(message, context = []) {
  try {
    const response = await axios.post(
      `${HUGGINGFACE_API_URL}/microsoft/DialoGPT-medium`,
      {
        inputs: {
          text: message,
          past_user_inputs: context
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data.generated_text;
  } catch (error) {
    console.error('Chatbot error:', error);
    return 'I apologize, but I am having trouble processing your request. Please try again later.';
  }
}

// Text summarization using T5
async function summarizeText(text) {
  try {
    const response = await axios.post(
      `${HUGGINGFACE_API_URL}/t5-base`,
      { inputs: `summarize: ${text}` },
      {
        headers: {
          'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data[0].summary_text;
  } catch (error) {
    console.error('Summarization error:', error);
    return text.substring(0, 150) + '...';
  }
}

// NLP-based search using sentence-transformers
async function getSemanticSearch(query, documents) {
  try {
    const response = await axios.post(
      `${HUGGINGFACE_API_URL}/sentence-transformers/all-MiniLM-L6-v2`,
      {
        inputs: {
          source_sentence: query,
          sentences: documents
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Semantic search error:', error);
    return documents;
  }
}

// Voice-to-text using Whisper
async function transcribeAudio(audioBuffer) {
  try {
    const response = await axios.post(
      `${HUGGINGFACE_API_URL}/openai/whisper-base`,
      { inputs: audioBuffer },
      {
        headers: {
          'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data.text;
  } catch (error) {
    console.error('Transcription error:', error);
    return '';
  }
}

module.exports = {
  analyzeSentiment,
  getChatbotResponse,
  summarizeText,
  getSemanticSearch,
  transcribeAudio
}; 