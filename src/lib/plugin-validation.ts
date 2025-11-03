/**
 * Plugin Validation Utilities
 * Centralized validation for ConfigPlugin objects
 */

import type { ConfigPlugin } from '../plugins/plugin-types';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Extract block references from a prompt string
 * Returns array of block IDs referenced via {{blocks.blockId}}
 */
function extractBlockReferences(prompt: string): string[] {
  const regex = /\{\{blocks\.([^}]+)\}\}/g;
  const references: string[] = [];
  let match;
  while ((match = regex.exec(prompt)) !== null) {
    references.push(match[1]);
  }
  return references;
}

/**
 * Validate block IDs and cross-references
 * Ensures IDs are unique and references are valid
 */
function validateBlockReferences(plugin: ConfigPlugin): ValidationResult {
  if (!plugin.blocks || plugin.blocks.length === 0) {
    return { valid: true };
  }

  // Check for duplicate block IDs
  const blockIds = plugin.blocks.map(b => b.id).filter(id => id);
  const uniqueIds = new Set(blockIds);
  if (blockIds.length !== uniqueIds.size) {
    return { valid: false, error: 'Duplicate block IDs found. Each block must have a unique ID.' };
  }

  // Check block cross-references
  const blockIdSet = new Set(blockIds);
  for (let i = 0; i < plugin.blocks.length; i++) {
    const block = plugin.blocks[i];
    const references = extractBlockReferences(block.prompt);

    for (const refId of references) {
      // Check if referenced block exists
      if (!blockIdSet.has(refId)) {
        return {
          valid: false,
          error: `Block "${block.name}" references non-existent block ID: {{blocks.${refId}}}`
        };
      }

      // Check if reference is to a later block (forward reference not allowed in sequential execution)
      const refIndex = plugin.blocks.findIndex(b => b.id === refId);
      if (refIndex >= i) {
        return {
          valid: false,
          error: `Block "${block.name}" references block "${plugin.blocks[refIndex].name}" which hasn't executed yet. Blocks can only reference previous blocks.`
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Validate a ConfigPlugin object
 * Returns { valid: true } or { valid: false, error: 'message' }
 */
export function validateConfigPlugin(plugin: any): ValidationResult {
  // Required fields
  const requiresPrompt = plugin.outputType !== 'blocks';

  if (!plugin.id?.trim()) {
    return { valid: false, error: 'Plugin ID is required' };
  }
  if (!plugin.name?.trim()) {
    return { valid: false, error: 'Plugin name is required' };
  }
  if (!plugin.description?.trim()) {
    return { valid: false, error: 'Plugin description is required' };
  }
  if (!plugin.outputType) {
    return { valid: false, error: 'Output type is required' };
  }
  if (requiresPrompt && !plugin.prompt?.trim()) {
    return { valid: false, error: 'Prompt is required' };
  }
  if (!plugin.display) {
    return { valid: false, error: 'Display configuration is required' };
  }

  // Validate outputType
  if (!['text', 'tags', 'blocks'].includes(plugin.outputType)) {
    return { valid: false, error: 'Invalid outputType. Must be: text, tags, or blocks' };
  }

  // Validate display configuration
  if (!plugin.display.dataSource?.trim()) {
    return { valid: false, error: 'Display dataSource is required' };
  }
  if (!plugin.display.position) {
    return { valid: false, error: 'Display position is required' };
  }
  if (!['header', 'tab'].includes(plugin.display.position)) {
    return { valid: false, error: 'Invalid display position. Must be: header or tab' };
  }
  if (!plugin.display.format) {
    return { valid: false, error: 'Display format is required' };
  }
  if (!['text', 'tags', 'blocks'].includes(plugin.display.format)) {
    return { valid: false, error: 'Invalid display format. Must be: text, tags, or blocks' };
  }

  // Validate blocks for 'blocks' type
  if (plugin.outputType === 'blocks') {
    if (!plugin.blocks || !Array.isArray(plugin.blocks) || plugin.blocks.length === 0) {
      return { valid: false, error: 'Blocks type requires at least one block' };
    }
    for (let i = 0; i < plugin.blocks.length; i++) {
      const block = plugin.blocks[i];
      if (!block.name?.trim()) {
        return { valid: false, error: `Block ${i + 1} is missing a name` };
      }
      if (!block.prompt?.trim()) {
        return { valid: false, error: `Block ${i + 1} is missing a prompt` };
      }
    }

    // Validate block cross-references
    const blockRefResult = validateBlockReferences(plugin as ConfigPlugin);
    if (!blockRefResult.valid) {
      return blockRefResult;
    }
  }

  // Validate tab position
  if (plugin.display.position === 'tab' && !plugin.display.tabName?.trim()) {
    return { valid: false, error: 'Tab name is required when position is "tab"' };
  }

  return { valid: true };
}

/**
 * Normalize a ConfigPlugin object
 * Ensures type is set, sets defaults
 * Note: Block IDs are now required and should always be present
 */
export function normalizeConfigPlugin(plugin: ConfigPlugin): ConfigPlugin {
  const normalized = { ...plugin };

  // Ensure type is set
  normalized.type = 'config';

  // Block IDs are now required in the type system, but keep validation
  // for legacy plugins or plugins loaded from external sources
  if (normalized.blocks) {
    for (const block of normalized.blocks) {
      if (!block.id) {
        console.error('[PluginValidation] Block missing required ID:', block.name);
        throw new Error(`Block "${block.name}" is missing required ID. Please regenerate the plugin.`);
      }
    }
  }

  // Set default tabName for tab position if missing
  if (normalized.display.position === 'tab' && !normalized.display.tabName) {
    normalized.display.tabName = normalized.name;
  }

  return normalized;
}
