import { useState } from 'react';
import Modal from './Modal';
import Theme from './Theme';

const ModalSetting = ({ showSettings, setShowSettings, clearChat, config, updateConfig }) => {
  const [activeTab, setActiveTab] = useState('chat');
  return (
    <Modal isOpen={showSettings} onClose={() => setShowSettings(false)} title='Settings'>
      <div className='flex flex-col max-h-[80vh] sm:max-h-[85vh] overflow-y-auto'>
        {/* Menu Tabs (Top) */}
        <div className='flex justify-center'>
          <nav className='inline-flex w-full justify-center gap-0.5 rounded-md bg-gray-100 dark:bg-gray-700 p-1'>
            {['chat', 'configuration', 'themes', 'help'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium w-full rounded-md capitalize  focus:outline-none transition-all cursor-pointer
          ${
            activeTab === tab
              ? 'bg-gray-200 dark:bg-gray-400 text-black dark:text-white'
              : 'text-black dark:text-white hover:text-black dark:hover:text-white dark:hover:bg-gray-600 hover:bg-gray-300 '
          }`}>
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className='flex-1 p-4 overflow-y-auto'>
          {/* Chat Tab */}
          {activeTab === 'chat' && (
            <div className='space-y-4 '>
              <h2 className='text-lg font-semibold text-gray-800 dark:text-white'>Chat Settings</h2>
              <div className='p-4 bg-gray-50 dark:bg-gray-800'>
                <h3 className='text-md font-medium text-gray-700 mb-3 dark:text-white'>Clear Chat All</h3>
                <p className='text-sm dark:text-white text-gray-600 mb-4'>This will permanently delete all chat history.</p>
                <button onClick={clearChat} className='px-4 py-2 text-white bg-red-500 rounded-lg transition-colors hover:bg-red-600 cursor-pointer'>
                  Clear Chat
                </button>
              </div>
            </div>
          )}

          {/* Configuration Tab */}
          {activeTab === 'configuration' && (
            <div className='space-y-4'>
              <h2 className='text-lg font-semibold text-gray-800 dark:text-white'>Model Configuration</h2>
              <div className='space-y-2'>
                <div>
                  <label className='block text-xs font-medium dark:text-white text-gray-700 '>
                    Temperature: {isNaN(config.temperature) ? 0 : config.temperature}
                    <span className='text-xs text-gray-500 ml-2 dark:text-white'>(Higher = more creative)</span>
                  </label>
                  <div className='flex-col items-center'>
                    <input
                      type='number'
                      value={isNaN(config.temperature) ? '' : config.temperature}
                      onChange={e => updateConfig('temperature', parseFloat(e.target.value))}
                      className='px-3 py-1 text-xs border border-gray-300 rounded w-full h-10 appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none text-black dark:text-white'
                    />
                    <span className='text-xs text-gray-500 dark:text-white'>default: 0.6</span>
                  </div>
                </div>

                <div>
                  <label className='block text-xs font-medium text-gray-700 dark:text-white'>
                    Max Tokens: {isNaN(config.max_tokens) ? 0 : config.max_tokens}
                    <span className='text-xs text-gray-500 ml-2 dark:text-white'>(Response length limit)</span>
                  </label>
                  <div className='flex-col items-center'>
                    <input
                      type='number'
                      value={isNaN(config.max_tokens) ? '' : config.max_tokens}
                      onChange={e => updateConfig('max_tokens', parseInt(e.target.value))}
                      className='px-3 py-1 text-xs border border-gray-300 rounded w-full h-10 appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none text-black dark:text-white'
                    />
                    <span className='text-xs text-gray-500 dark:text-white'>default: 512</span>
                  </div>
                </div>

                <div>
                  <label className='block text-xs font-medium text-gray-700 dark:text-white'>
                    Top P: {isNaN(config.top_p) ? 0 : config.top_p}
                    <span className='text-xs text-gray-500 ml-2 dark:text-white'>(Nucleus sampling)</span>
                  </label>
                  <div className='flex-col items-center'>
                    <input
                      type='number'
                      value={isNaN(config.top_p) ? '' : config.top_p}
                      onChange={e => updateConfig('top_p', parseFloat(e.target.value))}
                      className='px-3 py-1 text-xs border border-gray-300 rounded w-full h-10 appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none text-black dark:text-white'
                    />
                    <span className='text-xs text-gray-500 dark:text-white'>default: 0.9</span>
                  </div>
                </div>

                <div>
                  <label className='block text-xs font-medium text-gray-700 dark:text-white'>
                    Top K: {isNaN(config.top_k) ? 0 : config.top_k}
                    <span className='text-xs text-gray-500 ml-2 dark:text-white'>(Vocabulary diversity)</span>
                  </label>
                  <div className='flex-col items-center'>
                    <input
                      type='number'
                      value={isNaN(config.top_k) ? '' : config.top_k}
                      onChange={e => updateConfig('top_k', parseInt(e.target.value))}
                      className='px-3 py-1 text-xs border border-gray-300 rounded w-full h-10 appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none text-black dark:text-white'
                    />
                    <span className='text-xs text-gray-500 dark:text-white'>default: 50</span>
                  </div>
                </div>

                <div className='pt-2 border-t dark:border-t-white'>
                  <p className='text-xs text-gray-500 dark:text-white'>
                    <strong>Note:</strong> Max tokens will auto-adjust if responses get truncated.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Themes Tab */}
          {activeTab === 'themes' && (
            <div className='space-y-4'>
              <h2 className='text-lg font-semibold text-gray-800 dark:text-white'>Theme Settings</h2>
              <Theme />
            </div>
          )}

          {/* Help Tab */}
          {activeTab === 'help' && (
            <div className='space-y-4'>
              <h2 className='text-lg font-semibold text-gray-800 dark:text-white'>Help</h2>
              <div className='space-y-3'>
                <div className='p-4 bg-gray-50 dark:bg-gray-700 rounded-lg'>
                  <h3 className='font-medium text-gray-800 dark:text-white'>Documentation Github</h3>
                  <p className='text-sm text-gray-600 mt-1 dark:text-white'>
                    <a
                      href='https://github.com/machfudn/chatbotai-ibm'
                      target='_blank'
                      rel='noopener noreferrer'
                      className='text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400'>
                      Visit the official documentation github
                    </a>
                  </p>
                </div>

                <div className='p-4 bg-gray-50 dark:bg-gray-700 rounded-lg'>
                  <h3 className='font-medium text-gray-800 dark:text-white'>Documentation IBM</h3>
                  <p className='text-sm text-gray-600 mt-1 dark:text-white'>
                    <a
                      href='https://www.ibm.com/granite/docs/models/granite/'
                      target='_blank'
                      rel='noopener noreferrer'
                      className='text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400'>
                      Visit the official documentation IBM
                    </a>
                  </p>
                </div>

                <div className='p-4 bg-gray-50 dark:bg-gray-700 rounded-lg'>
                  <h3 className='font-medium text-gray-800 dark:text-white'>Need more help?</h3>
                  <p className='text-sm text-gray-600 mt-1 dark:text-white'>
                    <a
                      href='https://github.com/machfudn'
                      target='_blank'
                      rel='noopener noreferrer'
                      className='text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400'>
                      Contact me via github
                    </a>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
export default ModalSetting;
