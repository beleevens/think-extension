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

/**
 * Zod schemas for runtime validation of plugins
 * Prevents malicious or malformed plugin configurations
 */
import { z } from 'zod';

// Schema for DisplayRule
export const DisplayRuleSchema = z.object({
  dataSource: z.string().min(1, 'dataSource must not be empty'),
  position: z.enum(['header', 'tab']),
  format: z.enum(['text', 'tags', 'blocks']),
  tabName: z.string().optional(),
}).refine(
  (data) => {
    // If position is 'tab', tabName must be provided
    if (data.position === 'tab' && !data.tabName) {
      return false;
    }
    return true;
  },
  {
    message: "tabName is required when position is 'tab'",
    path: ['tabName'],
  }
);

// Schema for Block (used in ConfigPlugin)
export const BlockSchema = z.object({
  id: z.string().min(1, 'Block id must not be empty'),
  name: z.string().min(1, 'Block name must not be empty').max(200, 'Block name too long'),
  prompt: z.string().min(1, 'Block prompt must not be empty').max(10000, 'Block prompt too long'),
});

// Schema for ConfigPlugin
export const ConfigPluginSchema = z.object({
  type: z.literal('config'),

  // Metadata - strict validation
  id: z.string()
    .min(1, 'Plugin id must not be empty')
    .max(100, 'Plugin id too long')
    .regex(/^[a-z0-9-_]+$/, 'Plugin id must contain only lowercase letters, numbers, hyphens, and underscores'),
  name: z.string().min(1, 'Plugin name must not be empty').max(200, 'Plugin name too long'),
  description: z.string().max(1000, 'Plugin description too long'),
  icon: z.string().max(50, 'Plugin icon too long'),

  // Behavior
  prompt: z.string().min(1, 'Plugin prompt must not be empty').max(20000, 'Plugin prompt too long'),
  outputType: z.enum(['text', 'tags', 'blocks']),

  // Display configuration
  display: DisplayRuleSchema,

  // Optional settings
  blocks: z.array(BlockSchema).optional(),
  dependsOn: z.array(z.string()).optional(),
}).refine(
  (data) => {
    // If outputType is 'blocks', blocks array must be provided
    if (data.outputType === 'blocks' && (!data.blocks || data.blocks.length === 0)) {
      return false;
    }
    return true;
  },
  {
    message: "blocks array is required when outputType is 'blocks'",
    path: ['blocks'],
  }
);

// Schema for Plugin (currently just ConfigPlugin)
export const PluginSchema = ConfigPluginSchema;

/**
 * Validates a plugin object against the schema
 * @param plugin - The plugin object to validate
 * @returns Validation result with parsed data or error details
 */
export function validatePlugin(plugin: unknown): { success: true; data: Plugin } | { success: false; error: string } {
  try {
    const validated = PluginSchema.parse(plugin) as Plugin;
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join('; ');
      return { success: false, error: errorMessages };
    }
    return { success: false, error: 'Unknown validation error' };
  }
}

/**
 * Validates an array of plugins, filtering out invalid ones
 * @param plugins - Array of plugin objects to validate
 * @returns Object with valid plugins and errors for invalid ones
 */
export function validatePlugins(plugins: unknown[]): {
  validPlugins: Plugin[];
  errors: Array<{ index: number; plugin: unknown; error: string }>;
} {
  const validPlugins: Plugin[] = [];
  const errors: Array<{ index: number; plugin: unknown; error: string }> = [];

  plugins.forEach((plugin, index) => {
    const result = validatePlugin(plugin);
    if (result.success) {
      validPlugins.push(result.data);
    } else if (!result.success && 'error' in result) {
      // Explicit type narrowing for TypeScript
      errors.push({ index, plugin, error: result.error });
    }
  });

  return { validPlugins, errors };
}
