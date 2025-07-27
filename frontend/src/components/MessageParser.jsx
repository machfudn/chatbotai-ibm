import React from 'react';
import CodeBlock from './CodeBlock';

const MessageParser = ({ content, wasTruncated }) => {
  if (!content) {
    return <div className='text-gray-500 italic'>No content to display</div>;
  }

  // Handle jika content adalah array
  if (Array.isArray(content)) {
    content = content.join('');
  }

  // Handle jika content adalah object
  if (typeof content === 'object') {
    content = JSON.stringify(content, null, 2);
  }

  // Convert to string jika bukan string
  const displayContent = String(content || '');

  // Function untuk parse dan render content dengan code blocks
  const parseContent = text => {
    const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        const textBefore = text.slice(lastIndex, match.index);
        if (textBefore.trim()) {
          parts.push({
            type: 'text',
            content: textBefore,
            key: `text-${parts.length}`,
          });
        }
      }

      const language = match[1] || 'text';
      const code = match[2].trim();

      parts.push({
        type: 'code',
        language: language.toLowerCase(),
        content: code,
        key: `code-${parts.length}`,
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text after last code block
    if (lastIndex < text.length) {
      const remainingText = text.slice(lastIndex);
      if (remainingText.trim()) {
        parts.push({
          type: 'text',
          content: remainingText,
          key: `text-${parts.length}`,
        });
      }
    }

    // If no code blocks found, return as single text part
    if (parts.length === 0) {
      parts.push({
        type: 'text',
        content: text,
        key: 'text-0',
      });
    }

    return parts;
  };

  const contentParts = parseContent(displayContent);

  return (
    <div>
      {contentParts.map(part => {
        if (part.type === 'text') {
          return (
            <div key={part.key} className='whitespace-pre-wrap mb-2'>
              {part.content}
            </div>
          );
        } else if (part.type === 'code') {
          return <CodeBlock key={part.key} code={part.content} language={part.language} />;
        }
        return null;
      })}

      {wasTruncated && (
        <div className='mt-2 text-sm text-orange-600 bg-orange-50 p-2 rounded border-l-4 border-orange-400'>
          ⚠️ Respons ini mungkin terpotong karena keterbatasan token. Coba tingkatkan max_tokens untuk respons yang lebih lengkap.
        </div>
      )}
    </div>
  );
};
export default MessageParser;
