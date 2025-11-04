/**
 * Plugin Manager Component
 * UI for importing, exporting, and managing config-based plugins
 */

import { useState, useEffect } from 'react';
import { Download, Upload, Trash2, FileJson, Plus, Edit } from 'lucide-react';
import type { ConfigPlugin, Plugin } from '../plugins/plugin-types';
import { PluginFormBuilder } from './PluginFormBuilder';
import { pluginManager, listenToPluginChanges } from '../plugins/registry';
import { validateConfigPlugin, normalizeConfigPlugin } from '../lib/plugin-validation';
import '../plugins/plugins.css';

export function PluginManager() {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [pluginStates, setPluginStates] = useState<Record<string, { enabled: boolean; config: any }>>({});
  const [importError, setImportError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showFormBuilder, setShowFormBuilder] = useState(false);
  const [editingPlugin, setEditingPlugin] = useState<ConfigPlugin | null>(null);

  useEffect(() => {
    loadPlugins();
    loadPluginStates();

    // Listen for plugin changes (hot-reload)
    const cleanup = listenToPluginChanges(() => {
      loadPlugins();
      loadPluginStates();
    });

    return cleanup;
  }, []);

  const loadPlugins = () => {
    try {
      const allPlugins = pluginManager.getAll();
      setPlugins(allPlugins);
    } catch (error) {
      console.error('Failed to load plugins:', error);
    }
  };

  const loadPluginStates = async () => {
    try {
      const storage = await chrome.storage.local.get('plugins');
      const states = storage.plugins || {};

      // Merge with defaults for plugins that don't have saved state
      const fullStates: Record<string, { enabled: boolean; config: any }> = {};
      for (const plugin of plugins) {
        fullStates[plugin.id] = states[plugin.id] || {
          enabled: true,
          config: {},
        };
      }

      setPluginStates(fullStates);
    } catch (error) {
      console.error('Failed to load plugin states:', error);
    }
  };

  const handleToggle = async (pluginId: string, enabled: boolean) => {
    const newStates = {
      ...pluginStates,
      [pluginId]: {
        ...pluginStates[pluginId],
        enabled,
      },
    };
    setPluginStates(newStates);
    await pluginManager.savePluginState(pluginId, enabled, newStates[pluginId].config);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setSuccessMessage(null);

    try {
      const text = await file.text();
      const pluginData = JSON.parse(text);

      // Validate
      const validation = validateConfigPlugin(pluginData);
      if (!validation.valid) {
        setImportError(validation.error!);
        event.target.value = '';
        return;
      }

      // Normalize
      const plugin = normalizeConfigPlugin(pluginData as ConfigPlugin);

      // Check for duplicates
      const result = await chrome.storage.local.get('configPlugins');
      const existing = (result.configPlugins || []) as ConfigPlugin[];

      const duplicateIndex = existing.findIndex(p => p.id === plugin.id);
      if (duplicateIndex !== -1) {
        if (!confirm(`Plugin "${plugin.name}" already exists. Overwrite?`)) {
          // Reset file input
          event.target.value = '';
          return;
        }
        existing[duplicateIndex] = plugin;
      } else {
        existing.push(plugin);
      }

      // Save to storage
      await chrome.storage.local.set({ configPlugins: existing });

      setSuccessMessage(`Plugin "${plugin.name}" imported successfully! Activated across all pages.`);
      loadPlugins();

      // Reset file input
      event.target.value = '';
    } catch (error) {
      console.error('Import failed:', error);
      setImportError(error instanceof Error ? error.message : 'Failed to import plugin');
      // Reset file input
      event.target.value = '';
    }
  };

  const handleExport = (plugin: ConfigPlugin) => {
    try {
      const blob = new Blob([JSON.stringify(plugin, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${plugin.id}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setSuccessMessage(`Plugin "${plugin.name}" exported successfully!`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Export failed:', error);
      setImportError('Failed to export plugin');
    }
  };

  const handleDelete = async (pluginId: string, pluginName: string) => {
    if (!confirm(`Delete plugin "${pluginName}"? This cannot be undone.`)) {
      return;
    }

    try {
      const result = await chrome.storage.local.get('configPlugins');
      const existing = (result.configPlugins || []) as ConfigPlugin[];
      const filtered = existing.filter(p => p.id !== pluginId);

      await chrome.storage.local.set({ configPlugins: filtered });

      setSuccessMessage(`Plugin "${pluginName}" deleted. Changes applied across all pages.`);
      loadPlugins();
    } catch (error) {
      console.error('Delete failed:', error);
      setImportError('Failed to delete plugin');
    }
  };

  const getPluginTypeLabel = (plugin: Plugin): string => {
    if (plugin.outputType === 'blocks') {
      const blockCount = plugin.blocks?.length || 0;
      return `${blockCount} block${blockCount !== 1 ? 's' : ''}`;
    }
    return plugin.outputType;
  };

  const handleEdit = (plugin: ConfigPlugin) => {
    setEditingPlugin(plugin);
    setShowFormBuilder(true);
  };

  const handleSaveFromBuilder = async (plugin: ConfigPlugin) => {
    try {
      setImportError(null);
      setSuccessMessage(null);

      // Check for duplicates
      const result = await chrome.storage.local.get('configPlugins');
      const existing = (result.configPlugins || []) as ConfigPlugin[];

      const duplicateIndex = existing.findIndex(p => p.id === plugin.id);
      if (duplicateIndex !== -1) {
        // If editing, don't prompt for overwrite
        if (!editingPlugin) {
          if (!confirm(`Plugin "${plugin.name}" already exists. Overwrite?`)) {
            return;
          }
        }
        existing[duplicateIndex] = plugin;
      } else {
        existing.push(plugin);
      }

      // Save to storage
      await chrome.storage.local.set({ configPlugins: existing });

      setSuccessMessage(`Plugin "${plugin.name}" saved successfully! Activated across all pages.`);
      setShowFormBuilder(false);
      setEditingPlugin(null);
      loadPlugins();
    } catch (error) {
      console.error('Save failed:', error);
      setImportError(error instanceof Error ? error.message : 'Failed to save plugin');
    }
  };

  // Show form builder if active
  if (showFormBuilder) {
    return (
      <PluginFormBuilder
        onCancel={() => {
          setShowFormBuilder(false);
          setEditingPlugin(null);
        }}
        onSave={handleSaveFromBuilder}
        initialPlugin={editingPlugin || undefined}
      />
    );
  }

  return (
    <div className="plugin-manager-container">
      <div className="plugin-manager-header">
        <h2 className="plugin-manager-title">Plugins</h2>
        <p className="plugin-manager-subtitle">
          Extend Think Extension with AI-powered features. Create custom plugins or import from JSON files.
        </p>

        {/* Import/Create Section */}
        <div className="plugin-manager-add-section">
          <h3 className="plugin-manager-add-title">
            <Upload size={18} />
            Add Plugin
          </h3>
          <div className="plugin-manager-add-buttons">
            <button
              onClick={() => setShowFormBuilder(true)}
              className="btn-primary btn-flex"
            >
              <Plus size={16} />
              Create Plugin
            </button>
            <label
              htmlFor="plugin-import"
              className="btn-secondary btn-flex"
              style={{ cursor: 'pointer' }}
            >
              <FileJson size={16} />
              Import JSON File
            </label>
            <input
              id="plugin-import"
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden-input"
            />
          </div>
          <p style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))', marginTop: '0.75rem' }}>
            Create a new plugin using the form builder or import an existing JSON file. Plugins activate automatically across all pages.
          </p>
        </div>

        {/* Messages */}
        {importError && (
          <div className="plugin-manager-error">
            {importError}
          </div>
        )}

        {successMessage && (
          <div className="plugin-manager-success">
            {successMessage}
          </div>
        )}
      </div>

      {/* Plugin List */}
      <div>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 500, marginBottom: '1rem' }}>
          All Plugins ({plugins.length})
        </h3>

        {plugins.length === 0 ? (
          <div style={{
            padding: '3rem',
            textAlign: 'center',
            color: 'hsl(var(--muted-foreground))',
            backgroundColor: 'hsl(var(--muted))',
            borderRadius: '0.5rem'
          }}>
            <FileJson size={48} style={{ margin: '0 auto 1rem' }} />
            <p>No plugins available.</p>
            <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
              Create or import a plugin to get started.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {plugins.map((plugin) => {
              const state = pluginStates[plugin.id] || { enabled: true, config: {} };
              return (
              <div
                key={plugin.id}
                style={{
                  padding: '1.5rem',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.5rem',
                  backgroundColor: 'hsl(var(--card))',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span>{plugin.icon}</span>
                      <span>{plugin.name}</span>
                    </h4>
                    <p style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>
                      {plugin.description}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {/* Toggle for all plugins */}
                    <label
                      style={{
                        position: 'relative',
                        display: 'inline-block',
                        width: '44px',
                        height: '24px',
                        cursor: 'pointer'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={state.enabled}
                        onChange={(e) => handleToggle(plugin.id, e.target.checked)}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: state.enabled ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                        borderRadius: '12px',
                        transition: 'background-color 0.2s',
                      }}>
                        <span style={{
                          position: 'absolute',
                          height: '18px',
                          width: '18px',
                          left: state.enabled ? '23px' : '3px',
                          bottom: '3px',
                          backgroundColor: 'white',
                          borderRadius: '50%',
                          transition: 'left 0.2s',
                        }} />
                      </span>
                    </label>

                    {/* Action buttons */}
                    <button
                      onClick={() => handleEdit(plugin as ConfigPlugin)}
                      disabled={!state.enabled}
                      style={{
                        padding: '0.5rem',
                        backgroundColor: state.enabled ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                        color: state.enabled ? 'hsl(var(--primary-foreground))' : 'hsl(var(--muted-foreground))',
                        border: 'none',
                        borderRadius: '0.375rem',
                        cursor: state.enabled ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                      }}
                      title="Edit plugin"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleExport(plugin as ConfigPlugin)}
                      style={{
                        padding: '0.5rem',
                        backgroundColor: 'hsl(var(--secondary))',
                        color: 'hsl(var(--secondary-foreground))',
                        border: 'none',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                      }}
                      title="Export plugin"
                    >
                      <Download size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(plugin.id, plugin.name)}
                      style={{
                        padding: '0.5rem',
                        backgroundColor: 'hsl(var(--destructive))',
                        color: 'hsl(var(--destructive-foreground))',
                        border: 'none',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                      }}
                      title="Delete plugin"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8125rem', color: 'hsl(var(--muted-foreground))' }}>
                  <div>
                    <strong>Type:</strong> {getPluginTypeLabel(plugin)}
                  </div>
                  <div>
                    <strong>Position:</strong> {plugin.display.position}
                  </div>
                  <div>
                    <strong>Format:</strong> {plugin.display.format}
                  </div>
                  {plugin.type === 'config' && (
                    <div>
                      <strong>ID:</strong> <code style={{ fontSize: '0.75rem' }}>{plugin.id}</code>
                    </div>
                  )}
                </div>
              </div>
            );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
