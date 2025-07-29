import { useState, useEffect } from 'react';
import { Send, Bot, User, Settings, Loader2 } from './components/Icons';
import ModalSetting from './components/ModalSetting';
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
        {
          keywords: ['explain', 'elaborate', 'detail', 'comprehensive'],
          multiplier: 3,
        },
        {
          keywords: ['code', 'programming', 'function', 'script'],
          multiplier: 4,
        },
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
  useEffect(() => {
    const theme = localStorage.getItem('theme') || 'system';
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (theme === 'dark' || (theme === 'system' && prefersDark)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

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
      return (
        <div
          className='
            whitespace-pre-wrap
          '>
          {message.content}
        </div>
      );
    } else if (message.type === 'bot') {
      return <MessageParser content={message.content} wasTruncated={message.wasTruncated} />;
    } else if (message.type === 'error') {
      return (
        <div
          className='
            whitespace-pre-wrap text-red-600
          '>
          {message.content}
        </div>
      );
    } else {
      return (
        <div
          className='
            whitespace-pre-wrap
          '>
          {message.content}
        </div>
      );
    }
  };

  return (
    <div
      className='
        min-h-screen bg-white dark:bg-gray-800
      '>
      <div
        className='
          container flex flex-col
          h-screen
          mx-auto p-4
          justify-between
        '>
        {/* Header */}
        <div
          className='
            mb-4 p-4
            bg-white dark:bg-gray-700
            rounded-lg
            shadow-lg
          '>
          <div
            className='
              flex
              justify-between items-center
            '>
            <h1
              className='
                flex
                text-2xl font-bold text-gray-800 dark:text-white
                items-center gap-2
              '>
              <Bot
                className='
                  text-blue-600
                '
              />
              Chatbot AI IBM Granite
            </h1>
            <div
              className='
                flex
                gap-2 items-center
              '>
              {/* Token Usage Display */}
              {tokenUsage && (
                <div
                  className='
                    px-3 py-1
                    text-sm text-gray-600
                    bg-gray-100
                    rounded-lg
                  '>
                  <span
                    className='
                      font-medium
                    '>
                    Tokens:
                  </span>{' '}
                  {tokenUsage.totalTokens}
                  <span
                    className='
                      text-gray-400
                    '>
                    {' '}
                    / {tokenUsage.maxTokens}
                  </span>
                  {tokenUsage.responseTokens >= tokenUsage.maxTokens * 0.95 && (
                    <span
                      className='
                        ml-2
                        text-orange-600
                      '>
                      ⚠ Truncated
                    </span>
                  )}
                </div>
              )}
              <button
                onClick={() => setShowSettings(true)}
                className='
                  p-2
                  text-gray-600 dark:text-white
                  transition-colors
                  hover:text-blue-600
                '>
                <Settings size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Settings Modal */}
        <ModalSetting
          showSettings={showSettings}
          setShowSettings={setShowSettings}
          clearChat={clearChat}
          config={config}
          updateConfig={updateConfig}
        />

        <div
          className='
            flex-1 overflow-y-auto
            w-full
          '>
          {messages.length === 0 ? (
            <div
              className='
                flex flex-col
                h-full
                p-4
                text-gray-500 dark:text-white
                items-center justify-center
              '>
              <Bot
                size={48}
                className='
                  mb-4
                  text-gray-300
                '
              />
              <p>Start a conversation with IBM Granite AI!</p>
              <p
                className='
                  mt-2
                  text-sm
                '>
                Try asking about LLMs, coding, or any topic.
              </p>
            </div>
          ) : (
            <div
              className='
                w-full
              '>
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`
                    w-full
                    mb-4
                    ${message.type === 'user' ? 'flex justify-end' : 'flex justify-start'}
                  `}>
                  <div
                    className={`
                      flex
                      px-4
                      items-start gap-3
                      ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}
                    `}>
                    {message.type !== 'user' && (
                      <div
                        className='
                          flex flex-shrink-0
                          w-8 h-8
                          rounded-full
                          items-center justify-center
                        '>
                        <Bot
                          size={16}
                          className='
                            text-gray-500 dark:text-white
                          '
                        />
                      </div>
                    )}

                    <div
                      className={`
                        w-full
                        px-4 py-2 mb-2
                        rounded-lg text-lg
                        ${message.type === 'user' ? 'bg-gray-200 text-black' : 'text-gray-800 dark:text-white'}
                      `}>
                      {renderMessage(message)}
                      <div
                        className='
                          flex
                          mt-1
                          text-xs text-gray-500 dark:text-white
                          justify-between items-center
                        '>
                        <span className={`${message.type === 'user' ? ' hidden' : 'text-gray-800 dark:text-white'}`}>
                          {message.timestamp.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false,
                          })}
                        </span>
                        {message.tokenUsage && <span>{message.tokenUsage.responseTokens} tokens</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div
                  className='
                    flex
                    w-full
                    px-4 mb-4
                    justify-start
                  '>
                  <div
                    className='
                      flex
                      items-start gap-3
                    '>
                    <div
                      className='
                        flex
                        w-8 h-8
                        rounded-full
                        items-center justify-center
                      '>
                      <Loader2
                        size={16}
                        className='
                          text-gray-500 dark:text-white
                          animate-spin
                        '
                      />
                    </div>
                    <div
                      className='
                        px-4 py-2
                        text-gray-800 dark:text-white
                        rounded-lg
                      '>
                      <p>Thinking...</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input */}
        <div
          className='
            p-4
          '>
          <div
            className='
              flex
              gap-2
            '>
            <textarea
              value={inputMessage}
              onChange={e => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder='Type your message here... (Press Enter to send)'
              rows={2}
              disabled={isLoading}
              className='
                flex-1
                px-3 py-2 dark:text-white dark:placeholder:text-white
                border border-gray-300 rounded-lg
                resize-none
                focus:outline-none focus:ring-2 focus:ring-blue-500
              '
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !inputMessage.trim()}
              className='
                p-2
                text-white
                bg-blue-600
                rounded-lg
                transition-colors
                hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
              '>
              <Send size={20} />
            </button>
          </div>
        </div>
        {/* Info */}
        <div
          className='
            mt-4
            text-center text-sm text-gray-500 dark:text-white
          '>
          <p>Powered by IBM Granite 3.3 8B Instruct via Replicate</p>
          {tokenUsage && (
            <p
              className='
                mt-1
              '>
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
