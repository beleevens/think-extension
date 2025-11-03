/**
 * Theme Management Utility
 * Simple dark mode implementation using Chrome storage and class toggle
 */

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

/**
 * Get current theme from storage
 * Defaults to 'dark' if not set
 */
export async function getTheme(): Promise<Theme> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return (result[STORAGE_KEY] as Theme) || 'dark';
  } catch (error) {
    console.error('[Theme] Failed to get theme:', error);
    return 'dark';
  }
}

/**
 * Save theme preference to storage
 */
export async function saveTheme(theme: Theme): Promise<void> {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: theme });
  } catch (error) {
    console.error('[Theme] Failed to save theme:', error);
  }
}

/**
 * Apply theme to the document
 * Adds/removes 'dark' class on <html> element
 */
export function applyTheme(theme: Theme): void {
  const html = document.documentElement;

  if (theme === 'dark') {
    html.classList.add('dark');
  } else {
    html.classList.remove('dark');
  }
}

/**
 * Toggle between light and dark theme
 * Saves preference and applies immediately
 */
export async function toggleTheme(): Promise<Theme> {
  const currentTheme = await getTheme();
  const newTheme: Theme = currentTheme === 'light' ? 'dark' : 'light';

  await saveTheme(newTheme);
  applyTheme(newTheme);

  return newTheme;
}

/**
 * Initialize theme on page load
 * Call this early in your app initialization
 */
export async function initTheme(): Promise<void> {
  const theme = await getTheme();
  applyTheme(theme);
}

/**
 * Listen for theme changes from other pages/contexts
 * Automatically applies theme when it changes in storage
 * @param callback Optional callback to run when theme changes
 * @returns Cleanup function to remove the listener
 */
export function listenToThemeChanges(callback?: (theme: Theme) => void): () => void {
  const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
    if (changes[STORAGE_KEY]) {
      const newTheme = changes[STORAGE_KEY].newValue as Theme;
      applyTheme(newTheme);
      if (callback) {
        callback(newTheme);
      }
    }
  };

  chrome.storage.onChanged.addListener(handleStorageChange);

  // Return cleanup function
  return () => {
    chrome.storage.onChanged.removeListener(handleStorageChange);
  };
}
