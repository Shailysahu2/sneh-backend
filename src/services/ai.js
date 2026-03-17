const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN;
const HUGGINGFACE_API_URL = 'https://api-inference.huggingface.co/models';
// Use Inference Providers (router) model id to avoid HF 410 on serverless inference
const QWEN_MODEL = 'Qwen/Qwen2.5-7B-Instruct:featherless-ai';

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

async function getQwenInstructResponse(message, history = []) {
  if (!HUGGINGFACE_API_KEY) {
    return 'AI search is not configured on the server (missing HUGGINGFACE_API_KEY).';
  }

  const system = [
    'You are a helpful support assistant for SnehKrishiKendra (an agriculture shop).',
    'Answer concisely. If user asks to raise a ticket, tell them to use the "Raise ticket" button in chat.',
    'If you are unsure, ask a short follow-up question.'
  ].join(' ');

  try {
    // Newer HF Inference API (OpenAI-compatible)
    // Docs: https://huggingface.co/docs/api-inference/quicktour
    const recent = Array.isArray(history) ? history.slice(-8) : [];
    const messages = [
      { role: 'system', content: system },
      ...recent.map((h) => ({
        role: h.role === 'user' ? 'user' : 'assistant',
        content: String(h.text || '')
      })),
      { role: 'user', content: message }
    ];

    const payload = {
      model: QWEN_MODEL,
      messages,
      max_tokens: 220,
      temperature: 0.4,
      top_p: 0.9
    };

    const headers = {
      Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
      'Content-Type': 'application/json'
    };

    // Prefer Inference Providers router endpoint; legacy hosts can return 410 for this model.
    const endpoints = [
      'https://router.huggingface.co/v1/chat/completions',
      'https://api-inference.huggingface.co/v1/chat/completions',
      'https://router.huggingface.co/hf-inference/v1/chat/completions'
    ];

    let response = null;
    let lastError = null;
    for (const url of endpoints) {
      try {
        response = await axios.post(url, payload, { headers, timeout: 60000 });
        lastError = null;
        break;
      } catch (e) {
        lastError = e;
        const status = e?.response?.status;
        // If model is loading, don't spam fallback; just surface warmup.
        if (status === 503) throw e;
        // try next endpoint on 404/410/etc.
        continue;
      }
    }

    if (!response) throw lastError;

    const text = response?.data?.choices?.[0]?.message?.content;
    return (text || '').trim() || 'I could not generate a response right now. Please try again.';
  } catch (error) {
    const status = error?.response?.status;
    if (status === 503) {
      return 'AI model is warming up. Please try again in a few seconds.';
    }
    const details = error?.response?.data ? JSON.stringify(error.response.data).slice(0, 600) : '';
    console.error('Qwen inference error:', status || error?.message || error, details);
    return status ? `AI search failed (HF ${status}). Please try again later.` : 'AI search failed right now. Please try again later.';
  }
}

module.exports = {
  analyzeSentiment,
  getChatbotResponse,
  getQwenInstructResponse,
  summarizeText,
  getSemanticSearch,
  transcribeAudio
}; 