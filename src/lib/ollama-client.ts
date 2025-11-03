/**
 * Ollama API Client for browser extension
 * Simple streaming chat client for local Ollama instance
 */

import type { AIMessage, AIClient } from './ai-client';

export interface OllamaMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface OllamaStreamChunk {
  chunk: string;
  done: boolean;
}

export type OllamaStreamCallback = (chunk: OllamaStreamChunk) => void;

export interface OllamaModelResponse {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: {
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

export interface OllamaModelsResponse {
  models: OllamaModelResponse[];
}

/**
 * Simple Ollama API client for local instances
 */
export class OllamaClient implements AIClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:11434') {
    // Strict localhost validation for security
    this.validateLocalhostUrl(baseUrl);

    // Remove trailing slash if present
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  /**
   * Validate that the URL is a local localhost endpoint
   * This prevents the extension from connecting to remote Ollama instances
   */
  private validateLocalhostUrl(url: string): void {
    try {
      const parsed = new URL(url);

      // Must use HTTP (not HTTPS) for localhost
      if (parsed.protocol !== 'http:') {
        throw new Error(
          `Invalid protocol: ${parsed.protocol}. Ollama must use http:// (not https://) for localhost.`
        );
      }

      // Must be localhost or 127.0.0.1
      const validHosts = ['localhost', '127.0.0.1', '[::1]'];
      if (!validHosts.includes(parsed.hostname.toLowerCase())) {
        throw new Error(
          `Invalid hostname: ${parsed.hostname}. Ollama must run on localhost, 127.0.0.1, or [::1] for security reasons.`
        );
      }

      // Recommended port is 11434 (warn if different)
      if (parsed.port && parsed.port !== '11434') {
        console.warn(
          `[Ollama] Non-standard port detected: ${parsed.port}. Default Ollama port is 11434.`
        );
      }

      // No path allowed (except root)
      if (parsed.pathname && parsed.pathname !== '/') {
        throw new Error(
          `Invalid URL: ${url}. Base URL should not include a path (e.g., use http://localhost:11434, not http://localhost:11434/api).`
        );
      }
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error(`Invalid URL format: ${url}. Expected format: http://localhost:11434`);
      }
      throw error;
    }
  }

  /**
   * Convert AIMessage[] to OllamaMessage[]
   * Ollama supports all message types including system
   */
  private convertMessages(messages: AIMessage[]): OllamaMessage[] {
    return messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  /**
   * Stream chat completion from Ollama
   */
  async streamChat(
    messages: AIMessage[],
    onChunk: OllamaStreamCallback,
    model: string = 'llama3.2'
  ): Promise<void> {
    // Convert AIMessage[] to OllamaMessage[]
    const ollamaMessages = this.convertMessages(messages);
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: ollamaMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
    }

    if (!response.body) {
      throw new Error('No response body from Ollama API');
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

        // Process complete lines (Ollama sends one JSON per line)
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          const trimmed = line.trim();

          // Skip empty lines
          if (!trimmed) {
            continue;
          }

          try {
            const json = JSON.parse(trimmed);

            // Ollama response format: { message: { content: "..." }, done: false }
            const content = json.message?.content;
            const isDone = json.done === true;

            if (content) {
              onChunk({ chunk: content, done: false });
            }

            if (isDone) {
              onChunk({ chunk: '', done: true });
              return;
            }
          } catch (e) {
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Check if Ollama is running and accessible
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get list of installed Ollama models
   */
  async getModels(): Promise<Array<{ id: string; name: string }>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status}`);
      }

      const data: OllamaModelsResponse = await response.json();

      // Ollama API returns { models: [...] }
      // Each model has name, size, modified_at, etc.
      const models = data.models || [];

      if (models.length === 0) {
        return [];
      }

      return models.map((model: OllamaModelResponse) => ({
        id: model.name,
        name: model.name,
      }));
    } catch (error) {
      console.error('[Ollama] Failed to fetch models:', error);
      return [];
    }
  }
}
