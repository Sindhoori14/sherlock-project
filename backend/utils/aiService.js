const axios = require('axios');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5001';

let aiAvailable = false;

const buildErrorDetails = (error) => {
  if (!error) return 'Unknown AI error';
  if (error.response) {
    return `HTTP ${error.response.status} ${error.response.statusText || ''}`.trim();
  }
  if (error.code) {
    return `Network error ${error.code}`;
  }
  return error.message || 'Unknown AI error';
};

const initAIService = async () => {
  const maxAttempts = 3;
  const timeoutMs = 8000;

  if (!process.env.AI_SERVICE_URL) {
    console.warn(`AI_SERVICE_URL not set, using default: ${AI_SERVICE_URL}`);
  } else {
    console.log(`AI_SERVICE_URL: ${process.env.AI_SERVICE_URL}`);
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await axios.get(`${AI_SERVICE_URL}/health`, { timeout: timeoutMs });
      aiAvailable = true;
      console.log('AI Service Connected');
      return;
    } catch (error) {
      const details = buildErrorDetails(error);
      console.error(`AI health check failed (attempt ${attempt}/${maxAttempts}): ${details}`);
      if (attempt === maxAttempts) {
        aiAvailable = false;
        console.error('AI Service unavailable after retries (non-blocking)');
      }
    }
  }
};

const isAIAvailable = () => aiAvailable;

module.exports = {
  AI_SERVICE_URL,
  initAIService,
  isAIAvailable,
  buildErrorDetails
};
