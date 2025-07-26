import express from 'express';
import cors from 'cors';
import Replicate from 'replicate';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Replicate
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
  userAgent: 'https://www.npmjs.com/package/create-replicate',
});

const model = 'ibm-granite/granite-3.3-8b-instruct:a325a0cacfb0aa9226e6bad1abe5385f1073f4c7f8c36e52ed040e5409e6c034';

// Default configuration
const defaultConfig = {
  top_k: 50,
  top_p: 0.9,
  max_tokens: 512,
  min_tokens: 0,
  temperature: 0.6,
  presence_penalty: 0,
  frequency_penalty: 0,
};

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { prompt, config = {} } = req.body;

    // Validasi prompt
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      return res.status(400).json({
        error: 'Prompt is required and must be a non-empty string',
      });
    }

    // Merge default config dengan custom config
    const input = {
      ...defaultConfig,
      ...config,
      prompt: prompt.trim(),
    };

    console.log('Using model: %s', model);
    console.log('With input: %O', input);
    console.log('Running...');

    // Jalankan model
    const output = await replicate.run(model, { input });

    console.log('Done!', output);

    // Response sukses
    res.json({
      success: true,
      data: {
        prompt: input.prompt,
        response: output,
        config: input,
      },
    });
  } catch (error) {
    console.error('Error in /api/chat:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Chatbot AI IBM Backend is running',
    timestamp: new Date().toISOString(),
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Chat endpoint: http://localhost:${PORT}/api/chat`);
});
