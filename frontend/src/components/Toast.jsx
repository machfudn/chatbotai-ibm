import React, { useState, useEffect } from 'react';
import { X, CheckIcon } from './Icons';

const Toast = ({ message, type = 'error', duration = 5000, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => {
        setIsVisible(false);
        onClose && onClose();
      }, 300); // Animation duration
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose && onClose();
    }, 300);
  };

  if (!isVisible) return null;

  const getToastStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500 text-white';
      case 'warning':
        return 'bg-yellow-500 text-white';
      case 'info':
        return 'bg-blue-500 text-white';
      case 'error':
      default:
        return 'bg-red-500 text-white';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckIcon size={20} />;
      case 'warning':
        return <span className='text-lg'>⚠</span>;
      case 'info':
        return <span className='text-lg'>ℹ</span>;
      case 'error':
      default:
        return <span className='text-lg'>✕</span>;
    }
  };

  return (
    <div
      className={`
        fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg
        ${getToastStyles()}
        transform transition-all duration-300 ease-in-out
        ${isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
      `}>
      <div className='flex-shrink-0'>{getIcon()}</div>
      <div className='flex-1 text-sm font-medium'>{message}</div>
      <button onClick={handleClose} className='flex-shrink-0 ml-2 hover:bg-black hover:bg-opacity-20 rounded-full p-1 transition-colors'>
        <X size={16} />
      </button>
    </div>
  );
};

// Toast Container Component
export const ToastContainer = ({ toasts, removeToast }) => {
  return (
    <div className='fixed top-0 right-0 z-50 p-4 space-y-2'>
      {toasts.map(toast => (
        <Toast key={toast.id} message={toast.message} type={toast.type} duration={toast.duration} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

// Hook untuk menggunakan Toast
export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'error', duration = 5000) => {
    const id = Date.now() + Math.random();
    const newToast = { id, message, type, duration };

    setToasts(prev => [...prev, newToast]);

    // Auto remove after duration
    setTimeout(() => {
      removeToast(id);
    }, duration + 300); // Add animation duration
  };

  const removeToast = id => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const showError = (message, duration) => addToast(message, 'error', duration);
  const showSuccess = (message, duration) => addToast(message, 'success', duration);
  const showWarning = (message, duration) => addToast(message, 'warning', duration);
  const showInfo = (message, duration) => addToast(message, 'info', duration);

  return {
    toasts,
    addToast,
    removeToast,
    showError,
    showSuccess,
    showWarning,
    showInfo,
  };
};

export default Toast;
