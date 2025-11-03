/**
 * Text utility functions
 */

/**
 * Strip HTML tags and normalize whitespace
 * @param content Content with potential HTML
 * @param maxLength Maximum length to truncate to (default: 2000)
 * @returns Cleaned text
 */
export function stripHtml(content: string, maxLength: number = 2000): string {
  return content
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/**
 * Truncate text with ellipsis
 * @param text Text to truncate
 * @param maxLength Maximum length (default: 100)
 * @returns Truncated text with ellipsis if needed
 */
export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}
