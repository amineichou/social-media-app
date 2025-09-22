import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('light');
  const [systemTheme, setSystemTheme] = useState('light');

  // Detect system theme preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemTheme(mediaQuery.matches ? 'dark' : 'light');

    const handleChange = (e) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Load theme from localStorage or user settings
  useEffect(() => {
    const loadTheme = async () => {
      try {
        // First try to get from localStorage
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme && ['light', 'dark', 'auto'].includes(savedTheme)) {
          setTheme(savedTheme);
          return;
        }

        // Then try to get from user settings if logged in
        const response = await fetch('/api/users/me', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const userData = await response.json();
          const userTheme = userData.theme || 'light';
          setTheme(userTheme);
          localStorage.setItem('theme', userTheme);
        }
      } catch (error) {
        console.log('Could not load theme from user settings:', error);
        // Fallback to localStorage or default
        const savedTheme = localStorage.getItem('theme') || 'light';
        setTheme(savedTheme);
      }
    };

    loadTheme();
  }, []);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    const effectiveTheme = theme === 'auto' ? systemTheme : theme;
    
    if (effectiveTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme, systemTheme]);

  const updateTheme = async (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);

    // Update user settings in backend if logged in
    try {
      const response = await fetch('/api/users/settings', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ theme: newTheme })
      });
    } catch (error) {
      console.log('Could not sync theme to user settings:', error);
    }
  };

  const value = {
    theme,
    setTheme: updateTheme,
    effectiveTheme: theme === 'auto' ? systemTheme : theme,
    systemTheme
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
