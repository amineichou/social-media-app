import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

// showAlert('Success message!', 'success');     // Green theme
// showAlert('Error occurred!', 'error');        // Red theme  
// showAlert('Warning message!', 'warning');     // Yellow theme
// showAlert('Info message!', 'info');           // Blue theme


// Alert Context
const AlertContext = createContext();

// Alert Provider
export const AlertProvider = ({ children }) => {
  const [alerts, setAlerts] = useState([]);

  const showAlert = (message, type = 'info', duration = 5000) => {
    const id = Date.now();
    const alert = { id, message, type, duration };
    
    setAlerts(prev => [...prev, alert]);

    if (duration > 0) {
      setTimeout(() => {
        removeAlert(id);
      }, duration);
    }
  };

  const removeAlert = (id) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  // Expose global alert function for utility files
  useEffect(() => {
    window.showGlobalAlert = showAlert;
    return () => {
      delete window.showGlobalAlert;
    };
  }, []);

  return (
    <AlertContext.Provider value={{ showAlert, removeAlert }}>
      {children}
      <AlertContainer alerts={alerts} removeAlert={removeAlert} />
    </AlertContext.Provider>
  );
};

// Alert Container
const AlertContainer = ({ alerts, removeAlert }) => {
  const { theme } = useTheme();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {alerts.map(alert => (
        <AlertComponent
          key={alert.id}
          alert={alert}
          onClose={() => removeAlert(alert.id)}
        />
      ))}
    </div>
  );
};

// Individual Alert Component
const AlertComponent = ({ alert, onClose }) => {
  const { theme } = useTheme();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation
    setTimeout(() => setIsVisible(true), 10);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Wait for animation to complete
  };

  const getAlertStyles = () => {
    const baseStyles = `
      transform transition-all duration-300 ease-in-out rounded-lg shadow-lg border-l-4 p-4 
      ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
    `;

    const themeStyles = theme === 'dark' 
      ? 'bg-gray-800 border-gray-600 text-white' 
      : 'bg-white border-gray-200 text-gray-900';

    const typeStyles = {
      success: theme === 'dark' 
        ? 'border-l-green-400 bg-green-900/20' 
        : 'border-l-green-500 bg-green-50',
      error: theme === 'dark' 
        ? 'border-l-red-400 bg-red-900/20' 
        : 'border-l-red-500 bg-red-50',
      warning: theme === 'dark' 
        ? 'border-l-yellow-400 bg-yellow-900/20' 
        : 'border-l-yellow-500 bg-yellow-50',
      info: theme === 'dark' 
        ? 'border-l-blue-400 bg-blue-900/20' 
        : 'border-l-blue-500 bg-blue-50'
    };

    return `${baseStyles} ${themeStyles} ${typeStyles[alert.type] || typeStyles.info}`;
  };

  const getIconForType = () => {
    const iconStyles = `w-5 h-5 mr-3 flex-shrink-0`;
    
    switch (alert.type) {
      case 'success':
        return (
          <svg className={`${iconStyles} text-green-500`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'error':
        return (
          <svg className={`${iconStyles} text-red-500`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      case 'warning':
        return (
          <svg className={`${iconStyles} text-yellow-500`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className={`${iconStyles} text-blue-500`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  return (
    <div className={getAlertStyles()}>
      <div className="flex items-start">
        {getIconForType()}
        <div className="flex-1">
          <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {alert.message}
          </p>
        </div>
        <button
          onClick={handleClose}
          className={`ml-3 flex-shrink-0 rounded-md p-1.5 hover:bg-opacity-75 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
            theme === 'dark' 
              ? 'text-gray-400 hover:text-white hover:bg-gray-700 focus:ring-gray-500' 
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:ring-gray-500'
          }`}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
};

// Hook to use alerts
export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};

// Export shorthand functions for convenience
export const alert = {
  success: (message, duration) => {
    const context = useContext(AlertContext);
    context?.showAlert(message, 'success', duration);
  },
  error: (message, duration) => {
    const context = useContext(AlertContext);
    context?.showAlert(message, 'error', duration);
  },
  warning: (message, duration) => {
    const context = useContext(AlertContext);
    context?.showAlert(message, 'warning', duration);
  },
  info: (message, duration) => {
    const context = useContext(AlertContext);
    context?.showAlert(message, 'info', duration);
  }
};

export default AlertComponent;
