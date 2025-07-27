import React, { useEffect } from 'react';
import { X } from './Icons';

const ModalConfiguration = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    const handleEscape = e => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center'>
      {/* Backdrop */}
      <div className='absolute inset-0 bg-black/80 transition-opacity' onClick={onClose} />

      {/* Configuration Content */}
      <div className='relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-150 overflow-y-auto'>
        {/* Header */}
        <div className='flex items-center justify-between p-4 border-b'>
          <h3 className='text-lg font-semibold text-gray-900'>{title}</h3>
          <button onClick={onClose} className='p-1 hover:bg-gray-100 rounded-full transition-colors'>
            <X size={20} className='text-gray-500' />
          </button>
        </div>

        {/* Body */}
        <div className='p-4'>{children}</div>
      </div>
    </div>
  );
};

export default ModalConfiguration;
