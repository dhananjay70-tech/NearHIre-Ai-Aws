/**
 * ThemeToggle - Button to toggle between light and dark themes
 * Features Moon/Sun icons with smooth animations
 */

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle = () => {
  const { activeTheme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative rounded-full p-2 transition-all duration-300 hover:scale-110 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 bg-zinc-100 dark:bg-zinc-850 text-zinc-700 dark:text-zinc-300"
      aria-label="Toggle theme"
    >
      <div className="relative w-6 h-6">
        <Sun
          className={`absolute inset-0 w-6 h-6 transition-all duration-300 ${
            activeTheme === 'dark' ? 'rotate-0 scale-100 opacity-100' : 'rotate-90 scale-0 opacity-0'
          }`}
        />
        <Moon
          className={`absolute inset-0 w-6 h-6 transition-all duration-300 ${
            activeTheme === 'light' ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'
          }`}
        />
      </div>
    </button>
  );
};

export default ThemeToggle;
