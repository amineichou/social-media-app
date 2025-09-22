import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

// Confirm Context
const ConfirmContext = createContext();

// Confirm Provider
export const ConfirmProvider = ({ children }) => {
  const [confirmData, setConfirmData] = useState(null);

  const showConfirm = ({ 
    title = 'Confirm Action', 
    message, 
    confirmText = 'Confirm', 
    cancelText = 'Cancel',
    type = 'danger' // 'danger', 'warning', 'info'
  }) => {
    return new Promise((resolve) => {
      setConfirmData({
        title,
        message,
        confirmText,
        cancelText,
        type,
        onConfirm: () => {
          setConfirmData(null);
          resolve(true);
        },
        onCancel: () => {
          setConfirmData(null);
          resolve(false);
        }
      });
    });
  };

  // Expose global confirm function for utility files
  useEffect(() => {
    window.showGlobalConfirm = showConfirm;
    return () => {
      delete window.showGlobalConfirm;
    };
  }, []);

  return (
    <ConfirmContext.Provider value={{ showConfirm }}>
      {children}
      {confirmData && <ConfirmDialog {...confirmData} />}
    </ConfirmContext.Provider>
  );
};

// Confirm Dialog Component
const ConfirmDialog = ({ 
  title, 
  message, 
  confirmText, 
  cancelText, 
  type, 
  onConfirm, 
  onCancel 
}) => {
  const { theme } = useTheme();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation
    setTimeout(() => setIsVisible(true), 10);
  }, []);

  const handleConfirm = () => {
    setIsVisible(false);
    setTimeout(onConfirm, 150);
  };

  const handleCancel = () => {
    setIsVisible(false);
    setTimeout(onCancel, 150);
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        handleCancel();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          icon: (
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          ),
          confirmButton: 'bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white'
        };
      case 'warning':
        return {
          icon: (
            <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          ),
          confirmButton: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500 text-white'
        };
      default:
        return {
          icon: (
            <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          ),
          confirmButton: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-white'
        };
    }
  };

  const typeStyles = getTypeStyles();

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black transition-opacity duration-300 z-40 ${
          isVisible ? 'bg-opacity-50' : 'bg-opacity-0'
        }`}
        onClick={handleCancel}
      />
      
      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          className={`
            relative w-full max-w-md transform transition-all duration-300 ease-out
            ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
            ${theme === 'dark' 
              ? 'bg-gray-800 border border-gray-700' 
              : 'bg-white border border-gray-200'
            }
            rounded-lg shadow-xl
          `}
        >
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex-shrink-0">
                {typeStyles.icon}
              </div>
              <h3 className={`text-lg font-semibold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                {title}
              </h3>
            </div>
            
            {/* Message */}
            <div className="mb-6">
              <p className={`text-sm ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
              }`}>
                {message}
              </p>
            </div>
            
            {/* Actions */}
            <div className="flex space-x-3 justify-end">
              <button
                onClick={handleCancel}
                className={`
                  px-4 py-2 text-sm font-medium rounded-md border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2
                  ${theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 focus:ring-gray-500'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500'
                  }
                `}
              >
                {cancelText}
              </button>
              <button
                onClick={handleConfirm}
                className={`
                  px-4 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2
                  ${typeStyles.confirmButton}
                `}
              >
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// Hook to use confirm
export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};

// Export shorthand function for convenience
export const confirm = async (message, options = {}) => {
  if (window.showGlobalConfirm) {
    return await window.showGlobalConfirm({ message, ...options });
  }
  // Fallback to browser confirm
  return window.confirm(message);
};

export default ConfirmDialog;
