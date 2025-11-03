/**
 * Default Built-in Plugins
 * These plugins are automatically registered on first install
 */

import type { ConfigPlugin } from './plugin-types';

export const DEFAULT_PLUGINS: ConfigPlugin[] = [
  {
    type: 'config',
    id: 'tag-generator',
    name: 'AI Tag Generator',
    description: 'Automatically generates relevant tags for your saved articles using AI',
    icon: '🏷️',
    prompt: `Generate 7 relevant tags for this note with VARIED GRANULARITY:

- 2-3 BROAD, single-word tags
- 3-4 SPECIFIC compound tags

Tags should be lowercase and use hyphens instead of spaces.

EXISTING TAGS (prefer reusing these if relevant):
{{existingTags}}

Title: {{title}}

Content: {{content}}

Respond with JSON in this exact format:
{"tags": ["tag1", "tag2", "tag3", ...]}`,
    outputType: 'tags',
    display: {
      dataSource: 'tag-generator',
      position: 'header',
      format: 'tags',
    },
  },
  {
    type: 'config',
    id: 'summary-generator',
    name: 'AI Summary Generator',
    description: 'Generates concise summaries of your saved articles using AI',
    icon: '📝',
    prompt: `Generate a brief summary of this article consisting of 2-3 complete, well-formed sentences (150-250 characters) that provide a clear overview of the main topic and key points. Keep it concise but ensure all sentences are complete. Return only the sentences, no headings or formatting.

Title: {{title}}

Content: {{content}}

Generate a summary:`,
    outputType: 'text',
    display: {
      dataSource: 'summary-generator',
      position: 'header',
      format: 'text',
    },
  },
  {
    type: 'config',
    id: 'insights',
    name: 'Insights',
    description: 'Extract key insights and takeaways from saved articles',
    icon: '💡',
    prompt: `Extract the key insights and takeaways from this article. Focus on actionable points, important conclusions, and non-obvious observations. Present as 3-5 bullet points using "- " prefix. Each point should highlight something meaningful or noteworthy that a reader should remember.

Title: {{title}}

Content: {{content}}`,
    outputType: 'text',
    display: {
      dataSource: 'insights',
      position: 'tab',
      format: 'text',
      tabName: 'Insights',
    },
  },
  {
    type: 'config',
    id: 'eli5',
    name: 'ELI5',
    description: 'Explain this article like I\'m 5 years old',
    icon: '👶',
    prompt: `Explain this article like I'm 5 years old. Use simple language, short sentences, and concrete examples that a child would understand. Avoid jargon and technical terms. Make it fun and engaging.

Title: {{title}}

Content: {{content}}`,
    outputType: 'text',
    display: {
      dataSource: 'eli5',
      position: 'tab',
      format: 'text',
      tabName: 'ELI5',
    },
  },
];

/**
 * Default plugin state configuration
 */
export const DEFAULT_PLUGIN_STATES: Record<string, { enabled: boolean; config: any }> = {
  'tag-generator': {
    enabled: true,
    config: {},
  },
  'summary-generator': {
    enabled: true,
    config: {},
  },
  'insights': {
    enabled: true,
    config: {},
  },
  'eli5': {
    enabled: true,
    config: {},
  },
};
