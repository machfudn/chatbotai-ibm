import { useState } from 'react';
import { Send, Bot, User, Settings, Loader2 } from './components/Icons';
import Modal from './components/ModalConfiguration';
import MessageParser from './components/MessageParser';
import { useToast, ToastContainer } from './components/Toast';

export default function App() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [config, setConfig] = useState({
    temperature: 0.6,
    max_tokens: 512,
    top_p: 0.9,
    top_k: 50,
  });
  const [tokenUsage, setTokenUsage] = useState(null);
  const { toasts, removeToast, showError, showSuccess, showWarning } = useToast();

  // Token estimation and adaptive system
  const TokenManager = {
    // Estimasi token berdasarkan karakter (rough estimation: 1 token ≈ 4 characters)
    estimateTokens: text => {
      if (!text) return 0;
      // Lebih akurat: hitung berdasarkan kata dan karakter
      const words = text.trim().split(/\s+/).length;
      const chars = text.length;
      // Formula estimasi: (kata / 0.75) + (karakter / 4)
      return Math.ceil(words / 0.75 + chars / 4);
    },

    // Prediksi kebutuhan token berdasarkan jenis prompt
    predictResponseTokens: prompt => {
      const promptLower = prompt.toLowerCase();
      let baseTokens = 100; // minimum tokens

      // Deteksi jenis request dan estimasi token yang dibutuhkan
      const patterns = [
        { keywords: ['explain', 'elaborate', 'detail', 'comprehensive'], multiplier: 3 },
        { keywords: ['code', 'programming', 'function', 'script'], multiplier: 4 },
        { keywords: ['essay', 'article', 'write', 'story'], multiplier: 5 },
        { keywords: ['list', 'steps', 'tutorial', 'guide'], multiplier: 3.5 },
        { keywords: ['analyze', 'comparison', 'compare'], multiplier: 3.5 },
        { keywords: ['summary', 'summarize'], multiplier: 1.5 },
        { keywords: ['yes', 'no', 'simple', 'brief'], multiplier: 0.5 },
      ];

      let multiplier = 2; // default multiplier

      for (const pattern of patterns) {
        if (pattern.keywords.some(keyword => promptLower.includes(keyword))) {
          multiplier = Math.max(multiplier, pattern.multiplier);
        }
      }

      // Estimasi berdasarkan panjang prompt
      const promptTokens = TokenManager.estimateTokens(prompt);
      const estimatedResponse = Math.max(baseTokens, promptTokens * multiplier);

      // Tambahkan buffer 20%
      return Math.ceil(estimatedResponse * 1.2);
    },

    // Deteksi apakah respons terpotong
    isResponseTruncated: (content, tokenUsage, maxTokens) => {
      if (!tokenUsage || !tokenUsage.responseTokens) return false;

      // Cek beberapa indikator truncation
      const indicators = [
        tokenUsage.responseTokens >= maxTokens * 0.95, // Menggunakan 95% dari max tokens
        content.endsWith('...') || content.endsWith('…'),
        !content.match(/[.!?]$/), // Tidak berakhir dengan tanda baca
        content.includes('[truncated]') || content.includes('...'),
      ];

      return indicators.some(indicator => indicator);
    },

    // Hitung max_tokens optimal
    calculateOptimalTokens: (prompt, currentMaxTokens = 512) => {
      const predicted = TokenManager.predictResponseTokens(prompt);
      const recommended = Math.min(Math.max(predicted, 256), 4096);

      return {
        predicted,
        recommended,
        shouldIncrease: recommended > currentMaxTokens,
      };
    },
  };

  // Enhanced sendMessage function
  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();

    // Validasi config sebelum mengirim request
    const validateConfig = config => {
      const errors = [];
      const requiredFields = {
        max_tokens: { type: 'number', min: 1 },
        temperature: { type: 'number', min: 0.1 },
        top_k: { type: 'number', min: 1 },
        top_p: { type: 'number', min: 0.1 },
      };

      for (const [field, rules] of Object.entries(requiredFields)) {
        const value = config[field];

        // Cek apakah field kosong, null, undefined, atau NaN
        if (value === null || value === undefined || value === '' || (typeof value === 'number' && isNaN(value))) {
          errors.push(`Field '${field}' tidak boleh kosong`);
          continue;
        }

        // Cek tipe data
        if (rules.type === 'number' && typeof value !== 'number') {
          errors.push(`Field '${field}' harus berupa angka`);
          continue;
        }

        // Cek nilai minimum
        if (rules.min !== undefined && value < rules.min) {
          errors.push(`Field '${field}' tidak boleh kurang dari ${rules.min}`);
        }
      }

      return errors;
    };

    const configErrors = validateConfig(config);
    if (configErrors.length > 0) {
      const errorMessage = `Konfigurasi tidak valid:\n${configErrors.join('\n')}`;
      showError(errorMessage, 8000);
      return;
    }

    // ADAPTIVE TOKEN MANAGEMENT
    const tokenAnalysis = TokenManager.calculateOptimalTokens(userMessage, config.max_tokens);

    // Auto-adjust max_tokens jika diprediksi tidak cukup
    let adjustedConfig = { ...config };
    if (tokenAnalysis.shouldIncrease) {
      adjustedConfig.max_tokens = tokenAnalysis.recommended;
      showWarning(`Max tokens disesuaikan dari ${config.max_tokens} ke ${tokenAnalysis.recommended} berdasarkan prediksi kebutuhan respons`, 4000);

      // Update config state
      setConfig(prev => ({
        ...prev,
        max_tokens: tokenAnalysis.recommended,
      }));
    }

    console.log('Token Analysis:', {
      predicted: tokenAnalysis.predicted,
      recommended: tokenAnalysis.recommended,
      current: config.max_tokens,
      adjusted: adjustedConfig.max_tokens,
    });

    setInputMessage('');
    setIsLoading(true);

    setMessages(prev => [
      ...prev,
      {
        type: 'user',
        content: userMessage,
        timestamp: new Date(),
      },
    ]);

    try {
      const sanitizedConfig = {
        ...adjustedConfig,
        max_tokens: parseInt(adjustedConfig.max_tokens) || 512,
        temperature: parseFloat(adjustedConfig.temperature) || 0.7,
        top_k: parseInt(adjustedConfig.top_k) || 50,
        top_p: parseFloat(adjustedConfig.top_p) || 0.9,
      };

      console.log('Sending config:', sanitizedConfig);

      const response = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: userMessage,
          config: sanitizedConfig,
        }),
      });

      const data = await response.json();
      console.log('Response data:', data);

      if (data.success && data.data) {
        setTokenUsage(data.data.tokenUsage);

        let responseContent = data.data.response;

        if (Array.isArray(responseContent)) {
          responseContent = responseContent.join('');
        }

        if (!responseContent || responseContent.trim() === '') {
          responseContent = "I apologize, but I couldn't generate a proper response. Please try asking your question in a different way.";
        }

        // DETEKSI TRUNCATION DAN AUTO-RETRY
        const wasTruncated = TokenManager.isResponseTruncated(responseContent, data.data.tokenUsage, sanitizedConfig.max_tokens);

        if (wasTruncated && sanitizedConfig.max_tokens < 4096) {
          const retryTokens = Math.min(sanitizedConfig.max_tokens * 1.5, 4096);

          showWarning(`Respons terdeteksi terpotong. Mencoba ulang dengan ${retryTokens} tokens...`, 3000);

          // Retry dengan token lebih besar
          try {
            const retryConfig = { ...sanitizedConfig, max_tokens: retryTokens };
            const retryResponse = await fetch('http://localhost:5000/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                prompt: userMessage,
                config: retryConfig,
              }),
            });

            const retryData = await retryResponse.json();
            if (retryData.success && retryData.data) {
              responseContent = Array.isArray(retryData.data.response) ? retryData.data.response.join('') : retryData.data.response;

              setTokenUsage(retryData.data.tokenUsage);

              // Update config untuk request berikutnya
              setConfig(prev => ({
                ...prev,
                max_tokens: retryTokens,
              }));

              showWarning(`Respons berhasil diperbaiki dengan ${retryTokens} tokens`, 3000);
            }
          } catch (retryError) {
            console.error('Retry failed:', retryError);
            showWarning('Retry gagal, menggunakan respons yang terpotong', 3000);
          }
        }

        setMessages(prev => [
          ...prev,
          {
            type: 'bot',
            content: responseContent,
            timestamp: new Date(),
            tokenUsage: data.data.tokenUsage,
            wasTruncated: wasTruncated,
          },
        ]);
      } else {
        throw new Error(data.error || data.message || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Error sending message:', error);

      let errorMessage = error.message;
      if (error.message.includes('422') && error.message.includes('invalid_fields')) {
        errorMessage = 'Konfigurasi parameter tidak valid. Periksa pengaturan max_tokens, temperature, top_k, dan top_p.';
      }

      showError(`Failed to send message: ${errorMessage}`, 5000);

      setMessages(prev => [
        ...prev,
        {
          type: 'error',
          content: `Error: ${errorMessage}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };
  const handleKeyPress = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const updateConfig = (key, value) => {
    setConfig(prev => ({
      ...prev,
      [key]: parseFloat(value),
    }));
  };

  const clearChat = () => {
    setMessages([]);
    setTokenUsage(null);
    showSuccess('Chat cleared successfully!', 2000);
  };

  const renderMessage = message => {
    console.log('Rendering message:', message);
    if (message.type === 'user') {
      return <div className='whitespace-pre-wrap'>{message.content}</div>;
    } else if (message.type === 'bot') {
      return <MessageParser content={message.content} wasTruncated={message.wasTruncated} />;
    } else if (message.type === 'error') {
      return <div className='whitespace-pre-wrap text-red-600'>{message.content}</div>;
    } else {
      return <div className='whitespace-pre-wrap'>{message.content}</div>;
    }
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100'>
      <div className='container mx-auto max-w-4xl p-4'>
        {/* Header */}
        <div className='bg-white rounded-lg shadow-lg mb-4 p-4'>
          <div className='flex justify-between items-center'>
            <h1 className='text-2xl font-bold text-gray-800 flex items-center gap-2'>
              <Bot className='text-blue-600' />
              Chatbot AI IBM Granite
            </h1>
            <div className='flex gap-2 items-center'>
              {/* Token Usage Display */}
              {tokenUsage && (
                <div className='text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-lg'>
                  <span className='font-medium'>Tokens:</span> {tokenUsage.totalTokens}
                  <span className='text-gray-400'> / {tokenUsage.maxTokens}</span>
                  {tokenUsage.responseTokens >= tokenUsage.maxTokens * 0.95 && <span className='text-orange-600 ml-2'>⚠ Truncated</span>}
                </div>
              )}
              <button onClick={() => setShowSettings(true)} className='p-2 text-gray-600 hover:text-blue-600 transition-colors'>
                <Settings size={20} />
              </button>
              <button onClick={clearChat} className='px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors'>
                Clear Chat
              </button>
            </div>
          </div>
        </div>

        {/* Settings Modal */}
        <Modal isOpen={showSettings} onClose={() => setShowSettings(false)} title='Model Configuration'>
          <div className='space-y-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Temperature: {isNaN(config.temperature) ? 0 : config.temperature}
                <span className='text-xs text-gray-500 ml-2'>(Higher = more creative)</span>
              </label>
              <div className='flex gap-2 items-center'>
                <input
                  type='number'
                  value={isNaN(config.temperature) ? '' : config.temperature}
                  onChange={e => updateConfig('temperature', parseFloat(e.target.value))}
                  className='w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500'
                />
              </div>
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Max Tokens: {isNaN(config.max_tokens) ? 0 : config.max_tokens}
                <span className='text-xs text-gray-500 ml-2'>(Response length limit)</span>
              </label>
              <div className='flex gap-2 items-center'>
                <input
                  type='number'
                  value={isNaN(config.max_tokens) ? '' : config.max_tokens}
                  onChange={e => updateConfig('max_tokens', parseInt(e.target.value))}
                  className='w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500'
                />
              </div>
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Top P: {isNaN(config.top_p) ? 0 : config.top_p}
                <span className='text-xs text-gray-500 ml-2'>(Nucleus sampling)</span>
              </label>
              <div className='flex gap-2 items-center'>
                <input
                  type='number'
                  value={isNaN(config.top_p) ? '' : config.top_p}
                  onChange={e => updateConfig('top_p', parseFloat(e.target.value))}
                  className='w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500'
                />
              </div>
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Top K: {isNaN(config.top_k) ? 0 : config.top_k}
                <span className='text-xs text-gray-500 ml-2'>(Vocabulary diversity)</span>
              </label>
              <div className='flex gap-2 items-center'>
                <input
                  type='number'
                  value={isNaN(config.top_k) ? '' : config.top_k}
                  onChange={e => updateConfig('top_k', parseInt(e.target.value))}
                  className='w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500'
                />
              </div>
            </div>

            <div className='pt-4 border-t'>
              <p className='text-xs text-gray-500'>
                <strong>Note:</strong> Max tokens will auto-adjust if responses get truncated.
              </p>
            </div>
          </div>
        </Modal>

        {/* Chat Container */}
        <div className='bg-white rounded-lg shadow-lg flex flex-col h-96'>
          {/* Messages */}
          <div className='flex-1 overflow-y-auto p-4 space-y-4'>
            {messages.length === 0 ? (
              <div className='text-center text-gray-500 mt-8'>
                <Bot size={48} className='mx-auto text-gray-300 mb-4' />
                <p>Start a conversation with IBM Granite AI!</p>
                <p className='text-sm mt-2'>Try asking about LLMs, coding, or any topic you're curious about.</p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div key={index} className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {message.type !== 'user' && (
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${message.type === 'error' ? 'bg-red-100' : 'bg-blue-100'}`}>
                      <Bot size={16} className={message.type === 'error' ? 'text-red-600' : 'text-blue-600'} />
                    </div>
                  )}
                  <div
                    className={`max-w-xs lg:max-w-md ${
                      message.type === 'user'
                        ? 'bg-blue-600 text-white px-4 py-2 rounded-lg'
                        : message.type === 'error'
                        ? 'bg-red-100 text-red-800 px-4 py-2 rounded-lg'
                        : 'bg-gray-100 text-gray-800 p-3 rounded-lg'
                    }`}>
                    {renderMessage(message)}
                    <div className='flex justify-between items-center mt-2'>
                      <p className='text-xs opacity-70'>{message.timestamp.toLocaleTimeString()}</p>
                      {message.tokenUsage && <p className='text-xs opacity-70'>{message.tokenUsage.responseTokens} tokens</p>}
                    </div>
                  </div>
                  {message.type === 'user' && (
                    <div className='w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center'>
                      <User size={16} className='text-white' />
                    </div>
                  )}
                </div>
              ))
            )}
            {isLoading && (
              <div className='flex gap-3 justify-start'>
                <div className='w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center'>
                  <Loader2 size={16} className='text-blue-600 animate-spin' />
                </div>
                <div className='bg-gray-100 text-gray-800 px-4 py-2 rounded-lg'>
                  <p>Thinking...</p>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className='border-t p-4'>
            <div className='flex gap-2'>
              <textarea
                value={inputMessage}
                onChange={e => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder='Type your message here... (Press Enter to send)'
                className='flex-1 border border-gray-300 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500'
                rows={2}
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !inputMessage.trim()}
                className='bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'>
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className='mt-4 text-center text-sm text-gray-500'>
          <p>Powered by IBM Granite 3.3 8B Instruct via Replicate</p>
          {tokenUsage && (
            <p className='mt-1'>
              Last response: {tokenUsage.promptTokens} prompt + {tokenUsage.responseTokens} response = {tokenUsage.totalTokens} total tokens
            </p>
          )}
        </div>
      </div>

      {/* Toast Container */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
