/**
 * Plugin System Type Definitions
 * Simple, extensible plugin architecture for Think Extension
 */

/**
 * Simple result type for plugin execution
 */
export interface PluginResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Static variable definition (global, stored in settings)
 */
export interface StaticVariable {
  id: string;      // Variable identifier (used as {{id}} in templates)
  title: string;   // Display label for users
  content: string; // The static text content to insert
}

/**
 * Master prompt definition (system-level prompts attached to every request)
 */
export interface MasterPrompt {
  id: string;          // Unique identifier (e.g., 'personality', 'formatting')
  title: string;       // Display name (e.g., 'Agent Personality')
  description: string; // Explanation of what this prompt does
  prompt: string;      // The actual system prompt text
  enabled: boolean;    // Whether this prompt is active
}

export interface NoteInput {
  title: string;
  content: string;
  url: string;
  domain: string;
  ogImage?: string;
}

/**
 * Enhanced context available to config plugins
 * Includes both note data and application state
 */
export interface PluginContext extends NoteInput {
  // App-level context
  existingTags: string[];      // All unique tags across all notes
  noteCount: number;           // Total number of notes in collection
  // Plugin outputs (for plugin chaining)
  plugins: Record<string, any>; // { 'tag-generator': [...], 'summary-generator': "...", etc. }
  // Future: relatedNotes, categories, etc.
}

/**
 * Display configuration for plugins
 * Controls where and how plugin output is displayed
 */
export interface DisplayRule {
  dataSource: string;                // Plugin ID that provides the data
  position: 'header' | 'tab';        // Where to display the output
  format: 'text' | 'tags' | 'blocks'; // How to format the output
  tabName?: string;                  // Display name (required if position='tab')
}

/**
 * Configuration-based plugin
 * Simple JSON-based plugins without custom code
 */
export interface ConfigPlugin {
  type: 'config';

  // Metadata
  id: string;
  name: string;
  description: string;
  icon: string;

  // Behavior
  prompt: string;              // Prompt template with {{variable}} placeholders
  outputType: 'text' | 'tags' | 'blocks';  // Keep for validation/compatibility

  // Display configuration
  display: DisplayRule;

  // Optional settings
  blocks?: Array<{             // For blocks type only
    id: string;                // Required for block chaining and cross-references
    name: string;
    prompt: string;
  }>;

  // Dependencies (for sequential execution)
  dependsOn?: string[];        // Plugin IDs that must execute before this one
}

/**
 * Plugin type alias
 */
export type Plugin = ConfigPlugin;

export interface PluginState {
  enabled: boolean;
  config: any;
}

export interface PluginStorage {
  [pluginId: string]: PluginState;
}
