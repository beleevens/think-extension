/**
 * Config Plugin Executor
 * Executes configuration-based plugins using existing LLM infrastructure
 */

import { stripHtml } from '../lib/text-utils';
import type { VeniceMessage } from '../lib/venice-client';
import type { ClaudeMessage } from '../lib/claude-client';
import { loadProviderSettings, createAIClient, type AIProvider } from '../lib/ai-client';
import type { ConfigPlugin, NoteInput, PluginContext, PluginResult } from './plugin-types';

export class ConfigPluginExecutor {
  /**
   * Get metadata from notes storage
   */
  private async getNotesMetadata(): Promise<{ existingTags: string[]; noteCount: number }> {
    try {
      const notesResult = await chrome.storage.local.get('notes');
      const notes = notesResult.notes || {};
      const notesList = Object.values(notes) as any[];

      const existingTagsSet = new Set<string>();
      for (const note of notesList) {
        const tags = note.tags || note.pluginData?.['tag-generator'] || [];
        if (Array.isArray(tags)) {
          tags.forEach(tag => existingTagsSet.add(tag));
        }
      }

      return {
        existingTags: Array.from(existingTagsSet),
        noteCount: notesList.length,
      };
    } catch (error) {
      console.error('[ConfigPluginExecutor] Failed to get notes metadata:', error);
      return { existingTags: [], noteCount: 0 };
    }
  }

  /**
   * Build enhanced context for plugin execution
   * Includes note data + app state + plugin outputs
   */
  private async buildContext(input: NoteInput, pluginResults: Record<string, any> = {}): Promise<PluginContext> {
    const metadata = await this.getNotesMetadata();

    return {
      ...input,
      existingTags: metadata.existingTags,
      noteCount: metadata.noteCount,
      plugins: pluginResults,
    };
  }

  /**
   * Execute a config plugin and return its output
   */
  async execute(plugin: ConfigPlugin, input: NoteInput, pluginResults?: Record<string, any>): Promise<PluginResult> {
    try {
      // Build enhanced context with plugin results from previously executed plugins
      const context = await this.buildContext(input, pluginResults);

      // Load AI configuration using centralized utility
      const config = await loadProviderSettings();

      if (!config) {
        return { success: false, error: 'No API key configured' };
      }

      const { provider, apiKey, model } = config;

      // Clean and prepare content
      const cleanContent = stripHtml(input.content, 3000);
      if (cleanContent.length < 50) {
        return { success: false, error: 'Content too short (minimum 50 characters)' };
      }

      // Execute based on output type
      let data: any;
      switch (plugin.outputType) {
        case 'text':
          data = await this.executeText(plugin, context, cleanContent, provider, apiKey, model);
          break;
        case 'tags':
          data = await this.executeTags(plugin, context, cleanContent, provider, apiKey, model);
          break;
        case 'blocks':
          data = await this.executeBlocks(plugin, context, cleanContent, provider, apiKey, model);
          break;
        default:
          return { success: false, error: `Unknown output type: ${plugin.outputType}` };
      }

      if (data === null || data === undefined) {
        return { success: false, error: 'Plugin execution produced no result' };
      }

      return { success: true, data };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[ConfigPlugin:${plugin.id}] Execution failed:`, error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Load global static variables from storage
   */
  private async loadGlobalVariables(): Promise<Record<string, string>> {
    try {
      const result = await chrome.storage.local.get('staticVariables');
      const variables = result.staticVariables || [];

      const variablesMap: Record<string, string> = {};
      for (const variable of variables) {
        variablesMap[variable.id] = variable.content;
      }
      return variablesMap;
    } catch (error) {
      console.error('[ConfigPluginExecutor] Failed to load global variables:', error);
      return {};
    }
  }

  /**
   * Load enabled master prompts from storage
   */
  private async loadMasterPrompts(): Promise<string> {
    try {
      const result = await chrome.storage.local.get('masterPrompts');
      const prompts = result.masterPrompts || [];

      // Filter enabled prompts and concatenate them
      const enabledPrompts = prompts
        .filter((p: any) => p.enabled)
        .map((p: any) => p.prompt)
        .join('\n\n');

      return enabledPrompts;
    } catch (error) {
      console.error('[ConfigPluginExecutor] Failed to load master prompts:', error);
      return '';
    }
  }

  /**
   * Prepend master prompts to a plugin prompt
   */
  private prependMasterPrompts(prompt: string, masterPrompts: string): string {
    return masterPrompts ? `${masterPrompts}\n\n${prompt}` : prompt;
  }

  /**
   * Execute text-type plugin
   */
  private async executeText(
    plugin: ConfigPlugin,
    context: PluginContext,
    cleanContent: string,
    provider: AIProvider,
    apiKey: string,
    model: string
  ): Promise<string | null> {
    const templateContext = { ...context, content: cleanContent };
    const variables = await this.loadGlobalVariables();
    const masterPrompts = await this.loadMasterPrompts();
    const prompt = this.replaceVariables(plugin.prompt, templateContext, variables);
    const finalPrompt = this.prependMasterPrompts(prompt, masterPrompts);

    return this.callLLM(finalPrompt, provider, apiKey, model);
  }

  /**
   * Execute tags-type plugin
   */
  private async executeTags(
    plugin: ConfigPlugin,
    context: PluginContext,
    cleanContent: string,
    provider: AIProvider,
    apiKey: string,
    model: string
  ): Promise<string[] | null> {
    const templateContext = { ...context, content: cleanContent };
    const variables = await this.loadGlobalVariables();
    const masterPrompts = await this.loadMasterPrompts();
    const prompt = this.replaceVariables(plugin.prompt, templateContext, variables);
    const finalPrompt = this.prependMasterPrompts(prompt, masterPrompts);

    const response = await this.callLLM(finalPrompt, provider, apiKey, model);
    if (!response) return null;

    const tags = this.parseTagsFromResponse(response);
    return tags;
  }

  /**
   * Execute blocks-type plugin
   */
  private async executeBlocks(
    plugin: ConfigPlugin,
    context: PluginContext,
    cleanContent: string,
    provider: AIProvider,
    apiKey: string,
    model: string
  ): Promise<Record<string, string> | null> {
    if (!plugin.blocks || plugin.blocks.length === 0) {
      return null;
    }

    const results: Record<string, string> = {};

    // Use cleanContent in context for template
    // Add blocks property to enable sequential context passing
    const templateContext = { ...context, content: cleanContent, blocks: {} as Record<string, string> };
    const variables = await this.loadGlobalVariables();
    const masterPrompts = await this.loadMasterPrompts();

    // Log available data for debugging (first block only)
    if (plugin.blocks.length > 0) {
      console.log(`[ConfigPlugin:${plugin.id}] Block execution context:`, {
        hasTitle: !!templateContext.title,
        hasContent: !!templateContext.content,
        hasUrl: !!templateContext.url,
        hasDomain: !!templateContext.domain,
        variableCount: Object.keys(variables).length,
        pluginResultsCount: Object.keys(context.plugins).length,
      });

      // Runtime validation: Check all block IDs are unique
      const blockIds = plugin.blocks.map(b => b.id);
      const uniqueIds = new Set(blockIds);
      if (blockIds.length !== uniqueIds.size) {
        console.error(`[ConfigPlugin:${plugin.id}] Duplicate block IDs detected! Block chaining may not work correctly.`);
      }

      // Build a map of block references to validate execution order
      const blockIdSet = new Set(blockIds);
      for (let i = 0; i < plugin.blocks.length; i++) {
        const block = plugin.blocks[i];
        const regex = /\{\{blocks\.([^}]+)\}\}/g;
        let match;
        while ((match = regex.exec(block.prompt)) !== null) {
          const refId = match[1];
          if (!blockIdSet.has(refId)) {
            console.warn(`[ConfigPlugin:${plugin.id}] Block "${block.name}" references non-existent block ID: ${refId}`);
          } else {
            const refIndex = plugin.blocks.findIndex(b => b.id === refId);
            if (refIndex >= i) {
              console.error(`[ConfigPlugin:${plugin.id}] Block "${block.name}" has forward reference to "${plugin.blocks[refIndex].name}". This will fail!`);
            }
          }
        }
      }
    }

    // Process each block sequentially, passing accumulated results to each subsequent block
    for (const block of plugin.blocks) {
      try {
        if (!block.id) {
          console.error(`[ConfigPlugin:${plugin.id}] Block "${block.name}" has no ID. Skipping.`);
          continue;
        }

        const blockId = block.id;

        // Log available context before executing block
        const availableBlockIds = Object.keys(templateContext.blocks);
        console.log(`[ConfigPlugin:${plugin.id}] Executing block "${block.name}" (${blockId})`, {
          availableBlockResults: availableBlockIds.length > 0 ? availableBlockIds : 'none',
          blockPromptPreview: block.prompt.substring(0, 100) + '...'
        });

        // Replace variables including previous block outputs
        const prompt = this.replaceVariables(block.prompt, templateContext, variables);

        // Log if prompt changed (indicates variable substitution worked)
        if (prompt !== block.prompt) {
          console.log(`[ConfigPlugin:${plugin.id}] Block "${block.name}" - Variables substituted successfully`);
        }

        const finalPrompt = this.prependMasterPrompts(prompt, masterPrompts);

        const result = await this.callLLM(finalPrompt, provider, apiKey, model);
        if (result) {
          results[blockId] = result;
          // Add this block's result to the context for subsequent blocks
          templateContext.blocks[blockId] = result;
          console.log(`[ConfigPlugin:${plugin.id}] Block "${block.name}" completed - Result added to context (length: ${result.length} chars)`);
        } else {
          console.warn(`[ConfigPlugin:${plugin.id}] Block "${block.name}" returned empty result`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[ConfigPlugin:${plugin.id}] Block "${block.name}" failed:`, errorMessage);
        // Continue with next block even if this one fails (fault tolerance)
      }
    }

    return Object.keys(results).length > 0 ? results : null;
  }


  /**
   * Replace {{variable}} placeholders in template
   * Supports:
   * - {{variableId}} - static variables
   * - {{title}}, {{content}}, {{url}}, {{domain}} - note data
   * - {{existingTags}}, {{noteCount}} - app context
   * - {{plugins.pluginId}} - outputs from other plugins
   * - {{plugins.pluginId.blockId}} - specific block output from blocks plugins
   * - {{blocks.blockId}} - outputs from previous blocks in the same plugin (sequential)
   */
  private replaceVariables(
    template: string,
    context: PluginContext & { blocks?: Record<string, string> },
    variables?: Record<string, string>
  ): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      // Handle blocks.blockId syntax (for same-plugin block references)
      if (path.startsWith('blocks.')) {
        const blockId = path.substring(7); // Remove 'blocks.' prefix
        const blocks = context.blocks || {};
        const blockValue = blocks[blockId];

        if (blockValue !== undefined) {
          console.log(`[ConfigPluginExecutor] Block reference {{${path}}} resolved (${blockValue.length} chars)`);
          return String(blockValue);
        }

        // Block not found - likely hasn't been executed yet or doesn't exist
        const availableBlocks = Object.keys(blocks);
        console.warn(`[ConfigPluginExecutor] Block reference {{${path}}} not found.`, {
          requestedBlockId: blockId,
          availableBlocks: availableBlocks.length > 0 ? availableBlocks : 'none',
          hint: 'Make sure the referenced block executes before this one and has a matching ID'
        });
        return '';
      }

      // Handle plugins.pluginId and plugins.pluginId.blockId syntax
      if (path.startsWith('plugins.')) {
        const parts = path.substring(8).split('.'); // Remove 'plugins.' and split by '.'
        const pluginId = parts[0];
        const value = context.plugins[pluginId];

        // If value doesn't exist, return empty string
        if (value === undefined || value === null) {
          return '';
        }

        // Handle nested path: plugins.pluginId.blockId
        if (parts.length > 1) {
          const blockId = parts.slice(1).join('.'); // Support multi-level nesting
          // If plugin output is an object (like blocks), get specific block
          if (typeof value === 'object' && !Array.isArray(value)) {
            const blockValue = value[blockId];
            return blockValue !== undefined ? String(blockValue) : '';
          }
          // If it's not an object, can't access nested property
          return '';
        }

        // Handle simple plugins.pluginId (no nested path)
        if (Array.isArray(value)) {
          return value.join(', ');
        }
        if (typeof value === 'object') {
          // For complex objects (like blocks), stringify
          return JSON.stringify(value);
        }
        return String(value);
      }

      // Handle special formatting for arrays (like existingTags)
      if (path === 'existingTags') {
        return context.existingTags.join(', ');
      }

      // Handle static variables (checked before context properties)
      if (variables && variables[path] !== undefined) {
        return variables[path];
      }

      // Handle direct context properties
      const value = (context as any)[path];
      if (value !== undefined) {
        return String(value);
      }

      // Warn about missing article data properties
      const articleDataProps = ['title', 'content', 'url', 'domain'];
      if (articleDataProps.includes(path)) {
        console.warn(`[ConfigPluginExecutor] Article data property {{${path}}} is empty or missing`);
      }

      return '';
    });
  }

  /**
   * Call LLM and return response
   */
  private async callLLM(
    prompt: string,
    provider: AIProvider,
    apiKey: string,
    model: string
  ): Promise<string | null> {
    let response = '';

    const messages = [{
      role: 'user' as const,
      content: prompt,
    }];

    try {
      const client = createAIClient(provider, apiKey);
      await client.streamChat(
        messages,
        (chunk) => {
          if (!chunk.done && chunk.chunk) {
            response += chunk.chunk;
          }
        },
        model
      );

      return response.trim() || null;
    } catch (error) {
      console.error('[ConfigPluginExecutor] LLM call failed:', error);
      return null;
    }
  }

  /**
   * Parse tags from AI response
   * Supports both JSON format and fallback extraction
   */
  private parseTagsFromResponse(response: string): string[] {
    const tags: string[] = [];

    // Try to parse as JSON first
    try {
      const jsonMatch = response.match(/\{[\s\S]*"tags"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.tags && Array.isArray(parsed.tags)) {
          for (const tag of parsed.tags) {
            const cleaned = this.cleanTag(String(tag));
            if (cleaned) {
              tags.push(cleaned);
            }
          }
        }
      }
    } catch (e) {
    }

    // Fallback: Extract tags from text
    if (tags.length === 0) {
      // Look for array-like patterns: ["tag1", "tag2"] or ['tag1', 'tag2']
      const arrayMatch = response.match(/\[(["'][\w\s-]+["'](?:,\s*["'][\w\s-]+["'])*)\]/);
      if (arrayMatch) {
        const tagStrings = arrayMatch[1].match(/["']([^"']+)["']/g);
        if (tagStrings) {
          for (const tagStr of tagStrings) {
            const cleaned = this.cleanTag(tagStr);
            if (cleaned) {
              tags.push(cleaned);
            }
          }
        }
      }
    }

    return tags;
  }

  /**
   * Clean and validate a tag string
   */
  private cleanTag(tag: string): string | null {
    const sanitized = tag
      .replace(/['"]/g, '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    return (sanitized.length >= 2 && sanitized.length <= 30) ? sanitized : null;
  }
}
