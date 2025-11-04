/**
 * Plugin Registry
 * Registers all built-in plugins with the plugin manager
 */

import { pluginManager } from './plugin-manager';
import type { ConfigPlugin } from './plugin-types';
import { validatePlugins } from './plugin-types';

/**
 * Load user-created config plugins from storage
 */
async function loadConfigPlugins(): Promise<void> {
  try {
    const result = await chrome.storage.local.get('configPlugins');
    const rawPlugins = result.configPlugins || [];

    if (rawPlugins.length === 0) {
      return;
    }

    // First, validate all plugins
    const { validPlugins, errors } = validatePlugins(rawPlugins);

    // Log validation errors
    if (errors.length > 0) {
      console.error('[PluginRegistry] Invalid plugins detected and skipped during load:', errors);
    }

    let needsMigration = false;

    // Process valid plugins
    for (const plugin of validPlugins) {
      // One-time migration: Add IDs to blocks that don't have them
      // This handles legacy plugins created before ID persistence was fixed
      if (plugin.blocks) {
        for (const block of plugin.blocks) {
          if (!block.id) {
            block.id = crypto.randomUUID();
            needsMigration = true;
          }
        }
      }

      pluginManager.register(plugin);
    }

    // Save cleaned and migrated plugins back to storage
    // This removes invalid plugins and adds missing IDs
    if (needsMigration || errors.length > 0) {
      await chrome.storage.local.set({ configPlugins: validPlugins });
      if (needsMigration) {
        console.log('[PluginRegistry] Migrated blocks without IDs');
      }
      if (errors.length > 0) {
        console.log('[PluginRegistry] Removed invalid plugins from storage');
      }
    }
  } catch (error) {
    console.error('[PluginRegistry] Failed to load config plugins:', error);
  }
}

/**
 * Reload config plugins from storage (hot-reload)
 * Clears only config plugins and re-loads them
 * Built-in code plugins are preserved
 */
export async function reloadConfigPlugins(): Promise<void> {
  try {

    // Clear all config plugins
    const removedCount = pluginManager.unregisterAllConfig();

    // Reload from storage
    await loadConfigPlugins();

  } catch (error) {
    console.error('[PluginRegistry] Failed to hot-reload config plugins:', error);
  }
}

/**
 * Initialize and register all built-in plugins
 * Call this at application startup
 */
export async function registerBuiltInPlugins(): Promise<void> {

  // All built-in plugins are now config-based (loaded from storage)
  // Load user-created and default config plugins
  await loadConfigPlugins();


  // Await initialization to prevent race condition with UI
  try {
    await pluginManager.initializePlugins();
  } catch (err) {
    console.error('[PluginRegistry] Failed to initialize plugins:', err);
    throw err;
  }
}

/**
 * Listen for config plugin changes and hot-reload automatically
 * Uses Chrome storage change listener (same pattern as theme system)
 * @param callback Optional callback to run after plugins are reloaded
 * @returns Cleanup function to remove the listener
 */
export function listenToPluginChanges(callback?: () => void): () => void {
  const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
    if (changes.configPlugins) {
      reloadConfigPlugins().then(() => {
        if (callback) {
          callback();
        }
      });
    }
  };

  chrome.storage.onChanged.addListener(handleStorageChange);

  // Return cleanup function
  return () => {
    chrome.storage.onChanged.removeListener(handleStorageChange);
  };
}

/**
 * Export the plugin manager for use in the app
 */
export { pluginManager };
