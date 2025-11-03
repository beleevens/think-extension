/**
 * Theme Toggle Component
 * Simple button to toggle between light and dark mode
 */

import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { getTheme, toggleTheme, listenToThemeChanges, type Theme } from '../lib/theme';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const [theme, setTheme] = useState<Theme>('light');
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    // Load current theme on mount
    getTheme().then(setTheme);

    // Listen for theme changes from other pages/components
    const cleanup = listenToThemeChanges((newTheme) => {
      setTheme(newTheme);
    });

    return cleanup;
  }, []);

  const handleToggle = async () => {
    if (isToggling) return; // Prevent double-clicks

    setIsToggling(true);
    try {
      const newTheme = await toggleTheme();
      setTheme(newTheme);
    } catch (error) {
      console.error('[ThemeToggle] Failed to toggle theme:', error);
    } finally {
      setTimeout(() => setIsToggling(false), 300); // Prevent rapid toggling
    }
  };

  const Icon = theme === 'dark' ? Sun : Moon;
  const title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <button
      onClick={handleToggle}
      disabled={isToggling}
      title={title}
      className={`settings-button ${className}`}
      aria-label={title}
    >
      <Icon size={20} />
    </button>
  );
}
