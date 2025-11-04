/**
 * Plugin Manager
 * Handles plugin registration, execution, and state management
 */

import type { Plugin, PluginStorage, NoteInput } from './plugin-types';
import { validatePlugins } from './plugin-types';
import { ConfigPluginExecutor } from './plugin-executor';
import { DEFAULT_PLUGINS, DEFAULT_PLUGIN_STATES } from './default-plugins';

class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private configExecutor: ConfigPluginExecutor = new ConfigPluginExecutor();

  /**
   * Register a plugin with the manager
   */
  register(plugin: Plugin): void {
    if (this.plugins.has(plugin.id)) {
    }
    this.plugins.set(plugin.id, plugin);
  }

  /**
   * Get all registered plugins
   */
  getAll(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get a specific plugin by ID
   */
  getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Unregister a specific plugin by ID
   */
  unregister(pluginId: string): boolean {
    const existed = this.plugins.delete(pluginId);
    if (existed) {
    }
    return existed;
  }

  /**
   * Unregister all config plugins
   * Used for hot-reloading
   */
  unregisterAllConfig(): number {
    let count = 0;
    const toRemove: string[] = [];

    for (const [id, plugin] of this.plugins.entries()) {
      if (plugin.type === 'config') {
        toRemove.push(id);
      }
    }

    for (const id of toRemove) {
      this.plugins.delete(id);
      count++;
    }

    return count;
  }

  /**
   * Execute a single plugin
   */
  private async executePlugin(
    plugin: Plugin,
    input: NoteInput,
    pluginResults: Record<string, any>,
    pluginStates: PluginStorage
  ): Promise<any> {
    const result = await this.configExecutor.execute(plugin, input, pluginResults);

    if (!result.success) {
      return null;
    }

    return result.data;
  }

  /**
   * Topologically sort plugins based on dependencies
   * Returns plugins in execution order (independent plugins grouped together)
   */
  private sortPluginsByDependencies(plugins: Plugin[]): Plugin[][] {
    const pluginMap = new Map(plugins.map(p => [p.id, p]));
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const layers: Plugin[][] = [];

    // Detect cycles and build dependency graph
    const hasCycle = (pluginId: string, path: string[] = []): boolean => {
      if (visiting.has(pluginId)) {
        console.error(`[PluginManager] Circular dependency detected: ${path.join(' -> ')} -> ${pluginId}`);
        return true;
      }
      if (visited.has(pluginId)) return false;

      visiting.add(pluginId);
      const plugin = pluginMap.get(pluginId);
      if (plugin?.dependsOn) {
        for (const depId of plugin.dependsOn) {
          if (hasCycle(depId, [...path, pluginId])) return true;
        }
      }
      visiting.delete(pluginId);
      visited.add(pluginId);
      return false;
    };

    // Check for cycles
    for (const plugin of plugins) {
      if (hasCycle(plugin.id)) {
        pluginMap.delete(plugin.id);
      }
    }

    // Build layers (plugins at same depth can execute in parallel)
    const remaining = new Set(pluginMap.keys());
    while (remaining.size > 0) {
      const currentLayer: Plugin[] = [];

      for (const pluginId of remaining) {
        const plugin = pluginMap.get(pluginId)!;
        const deps = plugin.dependsOn || [];

        // Check if all dependencies have been processed
        const depsReady = deps.every(depId => !remaining.has(depId));
        if (depsReady) {
          currentLayer.push(plugin);
        }
      }

      if (currentLayer.length === 0) {
        // Remaining plugins have unsatisfied dependencies
        console.error(`[PluginManager] Cannot resolve dependencies for: ${Array.from(remaining).join(', ')}`);
        break;
      }

      layers.push(currentLayer);
      currentLayer.forEach(p => remaining.delete(p.id));
    }

    return layers;
  }

  /**
   * Process note through all enabled plugins
   * Plugins with dependencies execute sequentially in topological order.
   * Plugins without dependencies execute in parallel.
   * Returns pluginData object with results from each plugin
   */
  async processNote(input: NoteInput): Promise<Record<string, any>> {
    // Auto-load plugins if not registered yet (fixes cross-context execution)
    if (this.plugins.size === 0) {
      const result = await chrome.storage.local.get('configPlugins');
      const rawPlugins = result.configPlugins || [];

      // Validate plugins before registering
      const { validPlugins, errors } = validatePlugins(rawPlugins);

      // Log validation errors
      if (errors.length > 0) {
        console.error('[PluginManager] Invalid plugins detected and skipped:', errors);
      }

      // Register only valid plugins
      validPlugins.forEach(plugin => this.register(plugin));
    }

    const storage = await chrome.storage.local.get('plugins');
    const pluginStates = (storage.plugins || {}) as PluginStorage;

    // Filter enabled plugins
    const enabledPlugins: Plugin[] = [];
    for (const plugin of this.plugins.values()) {
      const state = pluginStates[plugin.id];
      if (state?.enabled !== false) {
        enabledPlugins.push(plugin);
      } else {
      }
    }

    // Sort plugins by dependencies
    const layers = this.sortPluginsByDependencies(enabledPlugins);

    const results: Record<string, any> = {};

    // Execute plugins layer by layer (sequential)
    // Within each layer, execute in parallel
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];

      await Promise.all(
        layer.map(async plugin => {
          try {
            const result = await this.executePlugin(plugin, input, results, pluginStates);

            // Only store non-null/undefined results
            if (result !== null && result !== undefined) {
              results[plugin.id] = result;
            } else {
            }
          } catch (error) {
            console.error(`[PluginManager] Plugin ${plugin.id} failed:`, error);
          }
        })
      );
    }

    return results;
  }

  /**
   * Get plugin state from storage
   */
  async getPluginState(pluginId: string): Promise<{ enabled: boolean; config: any }> {
    const storage = await chrome.storage.local.get('plugins');
    const pluginStates = (storage.plugins || {}) as PluginStorage;
    const plugin = this.plugins.get(pluginId);

    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    const state = pluginStates[pluginId];

    return {
      enabled: state?.enabled !== false, // Enabled by default
      config: state?.config || {},
    };
  }

  /**
   * Save plugin state to storage
   */
  async savePluginState(pluginId: string, enabled: boolean, config: any): Promise<void> {
    const storage = await chrome.storage.local.get('plugins');
    const plugins = (storage.plugins || {}) as PluginStorage;

    plugins[pluginId] = { enabled, config };

    await chrome.storage.local.set({ plugins });
  }

  /**
   * Initialize all registered plugins with default state if not configured
   * Also ensures default config plugins (Insights & ELI5) are present
   */
  async initializePlugins(): Promise<void> {
    const storage = await chrome.storage.local.get(['plugins', 'configPlugins']);
    const pluginStates = (storage.plugins || {}) as PluginStorage;
    const rawConfigPlugins = storage.configPlugins || [];

    // Validate existing config plugins
    const { validPlugins: configPlugins, errors } = validatePlugins(rawConfigPlugins);

    // Log validation errors for existing plugins
    if (errors.length > 0) {
      console.error('[PluginManager] Invalid plugins found in storage during initialization:', errors);
    }

    let needsUpdate = false;
    let needsConfigUpdate = errors.length > 0; // Need update if we filtered out invalid plugins

    // Initialize plugin states for registered plugins
    for (const plugin of this.plugins.values()) {
      if (!pluginStates[plugin.id]) {
        pluginStates[plugin.id] = {
          enabled: true, // Enable by default
          config: {},
        };
        needsUpdate = true;
      }
    }

    // Initialize default config plugins if not present
    for (const defaultPlugin of DEFAULT_PLUGINS) {
      const exists = configPlugins.some((p: Plugin) => p.id === defaultPlugin.id);
      if (!exists) {
        configPlugins.push(defaultPlugin);
        needsConfigUpdate = true;
      }
    }

    // Enable the default config plugins by default
    for (const [pluginId, state] of Object.entries(DEFAULT_PLUGIN_STATES)) {
      if (!pluginStates[pluginId]) {
        pluginStates[pluginId] = state;
        needsUpdate = true;
      }
    }

    if (needsUpdate || needsConfigUpdate) {
      const updates: any = {};
      if (needsUpdate) updates.plugins = pluginStates;
      if (needsConfigUpdate) updates.configPlugins = configPlugins;

      await chrome.storage.local.set(updates);
    }
  }
}

// Export singleton instance
export const pluginManager = new PluginManager();
