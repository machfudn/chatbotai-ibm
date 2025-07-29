import React, { useEffect } from 'react';
import { X } from './Icons';

const Modal = ({ isOpen, onClose, title, children }) => {
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
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4' role='dialog' aria-modal='true' aria-labelledby='modal-title'>
      {/* Backdrop with fade-in animation */}
      <div className='absolute inset-0 bg-black/80 transition-opacity duration-300' onClick={onClose} aria-hidden='true' />

      {/* Modal content with slide-in animation */}
      <div
        id='modal-content'
        className='relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transform transition-all duration-300'
        tabIndex={-1}>
        {/* Header */}
        <div className='sticky bg-white dark:bg-gray-800 top-0 z-10 flex items-center justify-between p-4 bg-white'>
          <h3 id='modal-title' className='text-lg font-semibold text-gray-900 dark:text-white'>
            {title}
          </h3>
          <button onClick={onClose} className='cursor-pointer' aria-label='Close modal'>
            <X size={20} className='text-gray-500 dark:text-white' />
          </button>
        </div>

        {/* Body */}
        <div className='px-4 bg-white dark:bg-gray-800'>{children}</div>
      </div>
    </div>
  );
};

export default Modal;
