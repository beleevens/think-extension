/**
 * Claude API Client for browser extension
 * Simple streaming chat client using Anthropic's Claude API
 */

import type { AIMessage, AIClient } from './ai-client';

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeStreamChunk {
  chunk: string;
  done: boolean;
}

export type ClaudeStreamCallback = (chunk: ClaudeStreamChunk) => void;

/**
 * Simple Claude API client
 */
export class ClaudeClient implements AIClient {
  private apiKey: string;
  private baseUrl = 'https://api.anthropic.com/v1';
  private apiVersion = '2023-06-01';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Convert AIMessage[] to ClaudeMessage[] and extract system messages
   * Claude's API uses a separate 'system' parameter, not system role in messages
   *
   * @returns Object with system parameter string and filtered messages array
   */
  private convertMessages(messages: AIMessage[]): {
    system: string | undefined;
    messages: ClaudeMessage[];
  } {
    // Extract and combine all system messages
    const systemMessages = messages
      .filter(msg => msg.role === 'system')
      .map(msg => msg.content);

    const system = systemMessages.length > 0
      ? systemMessages.join('\n\n')
      : undefined;

    // Filter to only user and assistant messages
    const claudeMessages = messages
      .filter(msg => msg.role !== 'system')
      .map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));

    return { system, messages: claudeMessages };
  }

  /**
   * Stream chat completion from Claude
   */
  async streamChat(
    messages: AIMessage[],
    onChunk: ClaudeStreamCallback,
    model: string = 'claude-3-5-sonnet-20241022'
  ): Promise<void> {
    // Convert AIMessage[] to ClaudeMessage[] with system message handling
    const { system, messages: claudeMessages } = this.convertMessages(messages);

    // Build request body with optional system parameter
    const requestBody: any = {
      model,
      messages: claudeMessages,
      stream: true,
      max_tokens: 4096,
    };

    // Add system parameter if system messages exist
    if (system) {
      requestBody.system = system;
    }

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': this.apiVersion,
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API error: ${response.status} - ${errorText}`);
    }

    if (!response.body) {
      throw new Error('No response body from Claude API');
    }

    // Read the streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          onChunk({ chunk: '', done: true });
          break;
        }

        // Decode and accumulate chunks
        buffer += decoder.decode(value, { stream: true });

        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          const trimmed = line.trim();

          // Skip empty lines and comments
          if (!trimmed || trimmed.startsWith(':')) {
            continue;
          }

          // Parse SSE data line
          if (trimmed.startsWith('data: ')) {
            const data = trimmed.slice(6); // Remove 'data: ' prefix

            // Check for stream end marker
            if (data === '[DONE]') {
              onChunk({ chunk: '', done: true });
              return;
            }

            try {
              const json = JSON.parse(data);

              // Claude streaming format:
              // - content_block_delta events contain the text chunks
              // - message_stop event signals completion
              if (json.type === 'content_block_delta') {
                const content = json.delta?.text;
                if (content) {
                  onChunk({ chunk: content, done: false });
                }
              } else if (json.type === 'message_stop') {
                onChunk({ chunk: '', done: true });
                return;
              } else if (json.type === 'error') {
                throw new Error(`Claude API error: ${json.error?.message || 'Unknown error'}`);
              }
            } catch (e) {
              // Re-throw error events, warn for parsing failures
              if (e instanceof Error && e.message.includes('Claude API error')) {
                throw e;
              }
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Check if API key is valid by making a simple request
   */
  async checkHealth(): Promise<boolean> {
    try {
      // Make a minimal request to test the API key
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': this.apiVersion,
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 1,
        }),
      });

      // Accept both 200 and rate limit responses as valid
      // (429 means the key is valid but rate limited)
      return response.ok || response.status === 429;
    } catch {
      return false;
    }
  }

  /**
   * Get list of available models
   */
  async getModels(): Promise<Array<{ id: string; name: string }>> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': this.apiVersion,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status}`);
      }

      const data = await response.json();

      // Claude API returns { data: [...models...] }
      // Each model has id, display_name, created_at, type
      const models = data.data || [];

      return models.map((model: any) => ({
        id: model.id,
        name: model.display_name || model.id,
      }));
    } catch (error) {
      console.error('[Claude] Failed to fetch models:', error);
      // Return default models as fallback
      return [
        { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
        { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
        { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
      ];
    }
  }
}
