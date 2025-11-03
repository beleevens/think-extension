/**
 * Venice.ai API Client for browser extension
 * Simple streaming chat client using Venice API
 */

import type { AIMessage, AIClient } from './ai-client';

export interface VeniceMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface VeniceStreamChunk {
  chunk: string;
  done: boolean;
}

export type VeniceStreamCallback = (chunk: VeniceStreamChunk) => void;

/**
 * Simple Venice.ai API client
 */
export class VeniceClient implements AIClient {
  private apiKey: string;
  private baseUrl = 'https://api.venice.ai/api/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Convert AIMessage[] to VeniceMessage[]
   * Venice supports all message types including system, so this is a straightforward mapping
   */
  private convertMessages(messages: AIMessage[]): VeniceMessage[] {
    return messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  /**
   * Stream chat completion from Venice.ai
   */
  async streamChat(
    messages: AIMessage[],
    onChunk: VeniceStreamCallback,
    model: string = 'llama-3.3-70b'
  ): Promise<void> {
    // Convert AIMessage[] to VeniceMessage[]
    const veniceMessages = this.convertMessages(messages);
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: veniceMessages,
        stream: true,
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Venice API error: ${response.status} - ${errorText}`);
    }

    if (!response.body) {
      throw new Error('No response body from Venice API');
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
              const content = json.choices?.[0]?.delta?.content;

              if (content) {
                onChunk({ chunk: content, done: false });
              }
            } catch (e) {
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
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });
      return response.ok;
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
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status}`);
      }

      const data = await response.json();

      // Venice API returns { data: [...models...] }
      // Each model has id, name, and other properties
      const models = data.data || [];

      return models.map((model: any) => ({
        id: model.id,
        name: model.name || model.id,
      }));
    } catch (error) {
      console.error('[Venice] Failed to fetch models:', error);
      // Return default model as fallback
      return [{ id: 'llama-3.3-70b', name: 'Llama 3.3 70B' }];
    }
  }
}
