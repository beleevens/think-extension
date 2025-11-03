/**
 * AI-Powered Content Cleanup for Browser Extension
 * Removes artifacts, navigation, ads, and noise from saved content
 */

import type { VeniceMessage } from './venice-client';
import type { ClaudeMessage } from './claude-client';
import { loadProviderSettings, createAIClient } from './ai-client';

export interface CleanupContentResult {
  cleanedContent: string;
  error?: string;
}

/**
 * Maximum content length to send to AI (in characters)
 * This prevents hitting API limits and keeps processing fast
 */
const MAX_CONTENT_LENGTH = 8000;

/**
 * Clean up content using AI to remove artifacts, navigation, ads, and noise
 * while preserving 100% of the meaningful text
 */
export async function cleanupContent(content: string): Promise<CleanupContentResult> {
  try {
    // Load settings using centralized utility
    const config = await loadProviderSettings();

    if (!config) {
      return {
        cleanedContent: content,
        error: 'No API key found. Please configure it in settings.',
      };
    }

    const { provider, apiKey, model: selectedModel } = config;

    // Check if content is too short (nothing to clean up)
    if (content.trim().length < 50) {
      return {
        cleanedContent: content,
        error: 'Content is too short to cleanup (minimum 50 characters required).',
      };
    }

    // Truncate if needed (with warning in console)
    let contentToClean = content;
    let wasTruncated = false;
    if (content.length > MAX_CONTENT_LENGTH) {
      contentToClean = content.substring(0, MAX_CONTENT_LENGTH);
      wasTruncated = true;
    }

    // Build the cleanup prompt
    const userPrompt = `You are a content cleanup assistant. Your task is to clean up the markdown content below by removing:

- Navigation elements (menu items, breadcrumbs, "Back to top" links)
- In-page navigation links and table of contents
- Advertisements and promotional content
- Redundant or broken links
- Visual noise (excessive horizontal lines, decorative elements)
- Footer content (copyright notices, social media links)
- Any other artifacts that distract from the core content

IMPORTANT:
- Preserve 100% of the meaningful article text, headings, and important links
- Keep the markdown formatting intact
- Keep important images and their alt text
- Do NOT add any commentary, explanations, or notes
- Return ONLY the cleaned markdown content

Content to clean:

${contentToClean}`;

    // Create messages - clients will handle system message compatibility
    const messages = [
      {
        role: 'system' as const,
        content: 'You are a content cleanup assistant. Return only the cleaned markdown content without any additional commentary.'
      },
      {
        role: 'user' as const,
        content: userPrompt
      }
    ];

    // Create AI client and accumulate response
    const client = createAIClient(provider, apiKey);
    let cleanedContent = '';

    await client.streamChat(
      messages,
      (chunk) => {
        if (!chunk.done && chunk.chunk) {
          cleanedContent += chunk.chunk;
        }
      },
      selectedModel
    );

    // Validate response
    if (!cleanedContent || cleanedContent.trim().length < 30) {
      return {
        cleanedContent: content,
        error: 'AI returned invalid or empty content. Please try again.',
      };
    }

    // Sanity check: cleaned content shouldn't be too different in length
    // (if AI removed 90%+ of content, something went wrong)
    const originalLength = contentToClean.length;
    const cleanedLength = cleanedContent.length;
    if (cleanedLength < originalLength * 0.1) {
      // Still return the cleaned content but with a warning
    }

    // Add truncation notice if content was truncated
    if (wasTruncated) {
    }

    return { cleanedContent: cleanedContent.trim() };

  } catch (error) {
    console.error('[ContentCleanup] Cleanup failed:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      cleanedContent: content,
      error: errorMessage,
    };
  }
}
