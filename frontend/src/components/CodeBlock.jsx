import React, { useState } from 'react';
import { CopyIcon, CheckIcon } from './Icons';

const CodeBlock = ({ code, language = 'text' }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  return (
    <div className='bg-gray-900 rounded-lg overflow-hidden my-4'>
      {/* Header */}
      <div className='flex items-center justify-between px-4 py-2 bg-gray-800 text-gray-300'>
        <div className='flex items-center gap-2'>
          <span className='text-sm font-medium'>{language}</span>
        </div>

        <div className='flex items-center gap-2'>
          <button
            onClick={copyToClipboard}
            className='flex items-center gap-1 px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors'>
            {copied ? (
              <>
                <CheckIcon size={14} className='text-green-400' />
                <span className='text-green-400'>Copied!</span>
              </>
            ) : (
              <>
                <CopyIcon size={14} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Content */}
      <div className='px-4 py-5'>
        <p className='text-sm text-gray-100 whitespace-pre-wrap max-h-[80vh] '>
          <code>{code}</code>
        </p>
      </div>
    </div>
  );
};

export default CodeBlock;
