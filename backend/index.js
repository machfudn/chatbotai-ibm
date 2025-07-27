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
        success: false,
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

    console.log('Raw output:', output);
    console.log('Output type:', typeof output);

    // Proses output dari Replicate
    let processedOutput = '';

    if (Array.isArray(output)) {
      // Jika output adalah array, join semua elemen
      processedOutput = output.join('');
    } else if (typeof output === 'string') {
      // Jika output adalah string
      processedOutput = output;
    } else if (output && typeof output === 'object') {
      // Jika output adalah object, coba ambil property yang relevan
      processedOutput = output.text || output.content || JSON.stringify(output);
    } else {
      // Fallback jika output tidak dikenali
      processedOutput = String(output || 'No response generated');
    }

    // Trim whitespace dan pastikan tidak kosong
    processedOutput = processedOutput.trim();

    if (!processedOutput) {
      processedOutput = 'I apologize, but I was unable to generate a response. Please try rephrasing your question.';
    }

    console.log('Processed output:', processedOutput);

    // Hitung token usage (estimasi)
    const promptTokens = Math.ceil(input.prompt.length / 4); // Rough estimation
    const responseTokens = Math.ceil(processedOutput.length / 4); // Rough estimation
    const totalTokens = promptTokens + responseTokens;

    // Response sukses
    res.json({
      success: true,
      data: {
        prompt: input.prompt,
        response: processedOutput,
        config: input,
        tokenUsage: {
          promptTokens,
          responseTokens,
          totalTokens,
          maxTokens: input.max_tokens,
        },
      },
    });
  } catch (error) {
    console.error('Error in /api/chat:', error);
    console.error('Error stack:', error.stack);

    // Berikan response error yang lebih informatif
    let errorMessage = 'Internal server error';

    if (error.message.includes('API token')) {
      errorMessage = 'Replicate API token is missing or invalid';
    } else if (error.message.includes('rate limit')) {
      errorMessage = 'Rate limit exceeded. Please try again later.';
    } else if (error.message.includes('timeout')) {
      errorMessage = 'Request timeout. Please try again.';
    } else if (error.message) {
      errorMessage = error.message;
    }

    res.status(500).json({
      success: false,
      error: errorMessage,
      message: process.env.NODE_ENV === 'development' ? error.stack : undefined,
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

  // Validasi environment variables
  if (!process.env.REPLICATE_API_TOKEN) {
    console.warn('WARNING: REPLICATE_API_TOKEN is not set!');
  } else {
    console.log('Replicate API token is configured');
  }
});
