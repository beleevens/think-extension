/**
 * AI Client Utilities
 * Centralized provider and client creation to eliminate duplication
 */

import { VeniceClient } from './venice-client';
import { ClaudeClient } from './claude-client';
import { OllamaClient } from './ollama-client';

export type AIProvider = 'venice' | 'claude' | 'ollama';

/**
 * Common message format accepted by all AI providers
 * Each provider will internally convert these to their specific format
 *
 * System Message Handling:
 * - Venice: System messages are supported natively in the messages array
 * - Claude: System messages are extracted and sent via the 'system' parameter
 *           (Claude's API doesn't support system role in the messages array)
 *
 * @property role - The message role: 'user' for user input, 'assistant' for AI responses, 'system' for instructions
 * @property content - The message text content
 */
export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Common interface that all AI clients must implement
 */
export interface AIClient {
  streamChat(
    messages: AIMessage[],
    callback: (chunk: { done: boolean; chunk?: string }) => void,
    model: string
  ): Promise<void>;
  checkHealth(): Promise<boolean>;
  getModels(): Promise<Array<{ id: string; name: string }>>;
}

export interface ProviderConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
  endpoint?: string; // For Ollama endpoint URL
}

/**
 * Constants for default values
 */
export const DEFAULT_OLLAMA_ENDPOINT = 'http://localhost:11434';

export const DEFAULT_MODELS: Record<AIProvider, string> = {
  venice: 'llama-3.3-70b',
  claude: 'claude-3-5-sonnet-20241022',
  ollama: 'llama3.2',
};

/**
 * Helper function to get provider display name
 */
export function getProviderDisplayName(provider: AIProvider): string {
  const names: Record<AIProvider, string> = {
    venice: 'Venice.ai',
    claude: 'Claude',
    ollama: 'Ollama',
  };
  return names[provider];
}

/**
 * Helper function to get storage key for API keys
 */
export function getStorageKeyForApiKey(provider: AIProvider): string {
  const keys: Record<AIProvider, string> = {
    venice: 'veniceApiKey',
    claude: 'claudeApiKey',
    ollama: '', // Ollama doesn't use API keys
  };
  return keys[provider];
}

/**
 * Helper function to get storage key for models
 */
export function getStorageKeyForModel(provider: AIProvider): string {
  const keys: Record<AIProvider, string> = {
    venice: 'veniceModel',
    claude: 'claudeModel',
    ollama: 'ollamaModel',
  };
  return keys[provider];
}

/**
 * Load provider settings from Chrome storage
 * Returns provider, API key, and selected model
 */
export async function loadProviderSettings(): Promise<ProviderConfig | null> {
  const result = await chrome.storage.local.get([
    'activeProvider',
    'veniceApiKey',
    'claudeApiKey',
    'veniceModel',
    'claudeModel',
    'ollamaEndpoint',
    'ollamaModel',
  ]);

  const provider = (result.activeProvider || 'venice') as AIProvider;

  // Get API key for the provider
  const apiKeyStorageKey = getStorageKeyForApiKey(provider);
  const apiKey = apiKeyStorageKey ? result[apiKeyStorageKey] || '' : '';

  // Get model for the provider
  const modelStorageKey = getStorageKeyForModel(provider);
  const model = result[modelStorageKey] || DEFAULT_MODELS[provider];

  // Get endpoint for Ollama
  const endpoint = provider === 'ollama'
    ? result.ollamaEndpoint || DEFAULT_OLLAMA_ENDPOINT
    : undefined;

  // Ollama doesn't need an API key, so only check for other providers
  if (provider !== 'ollama' && !apiKey) {
    return null;
  }

  return { provider, apiKey, model, endpoint };
}

/**
 * Create an AI client instance based on provider type
 * Uses exhaustive switch for compile-time type safety
 */
export function createAIClient(provider: AIProvider, apiKey: string, endpoint?: string): AIClient {
  switch (provider) {
    case 'venice':
      return new VeniceClient(apiKey);
    case 'claude':
      return new ClaudeClient(apiKey);
    case 'ollama':
      return new OllamaClient(endpoint || DEFAULT_OLLAMA_ENDPOINT);
    default:
      // TypeScript will error if a new provider is added but not handled
      const _exhaustiveCheck: never = provider;
      throw new Error(`Unknown provider: ${_exhaustiveCheck}`);
  }
}
