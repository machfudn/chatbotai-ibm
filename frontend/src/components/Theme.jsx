import { useState, useEffect } from 'react';

const Theme = () => {
  // Initialize theme state with localStorage value or 'system' default
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') || 'system';
    }
    return 'system';
  });

  // Apply theme changes
  useEffect(() => {
    const applyTheme = () => {
      const root = document.documentElement;

      if (theme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.classList.toggle('dark', prefersDark);
      } else {
        root.classList.toggle('dark', theme === 'dark');
      }

      // Save to localStorage
      localStorage.setItem('theme', theme);
    };

    applyTheme();

    // Watch for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = e => {
      if (theme === 'system') {
        document.documentElement.classList.toggle('dark', e.matches);
      }
    };

    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, [theme]);

  return (
    <div className='grid gap-3 grid-cols-1 md:grid-cols-3'>
      {/* System Theme Button */}
      <button
        onClick={() => setTheme('system')}
        className={`p-4 text-left rounded-lg transition-colors cursor-pointer ${
          theme === 'system'
            ? 'bg-gray-200 dark:bg-gray-400 text-black dark:text-white'
            : 'text-black dark:text-white hover:text-black dark:hover:text-white dark:hover:bg-gray-600 hover:bg-gray-300 '
        }`}
        aria-label='Use system theme'>
        <div className='font-medium'>System Default</div>
      </button>

      {/* Light Theme Button */}
      <button
        onClick={() => setTheme('light')}
        className={`p-4 text-left rounded-lg transition-colors cursor-pointer ${
          theme === 'light'
            ? 'bg-gray-200 dark:bg-gray-400 text-black dark:text-white'
            : 'text-black dark:text-white hover:text-black dark:hover:text-white dark:hover:bg-gray-600 hover:bg-gray-300 '
        }`}
        aria-label='Use light theme'>
        <div className='font-medium'>Light Mode</div>
      </button>

      {/* Dark Theme Button */}
      <button
        onClick={() => setTheme('dark')}
        className={`p-4 text-left rounded-lg transition-colors cursor-pointer ${
          theme === 'dark'
            ? 'bg-gray-200 dark:bg-gray-400 text-black dark:text-white'
            : 'text-black dark:text-white hover:text-black dark:hover:text-white dark:hover:bg-gray-600 hover:bg-gray-300 '
        }`}
        aria-label='Use dark theme'>
        <div className='font-medium'>Dark Mode</div>
      </button>
    </div>
  );
};

export default Theme;
