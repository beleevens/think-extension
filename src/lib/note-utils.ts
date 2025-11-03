/**
 * Note utility functions
 */

import type { LocalNote } from './types';

export type SortBy = 'date-desc' | 'date-asc' | 'title-asc' | 'title-desc' | 'domain';

/**
 * Sort notes by the specified criteria
 * @param notes Array of notes to sort
 * @param sortBy Sorting criteria
 * @returns Sorted array (does not mutate original)
 */
export function sortNotes(notes: LocalNote[], sortBy: SortBy): LocalNote[] {
  return [...notes].sort((a, b) => {
    switch (sortBy) {
      case 'date-desc':
        return b.updatedAt - a.updatedAt;
      case 'date-asc':
        return a.updatedAt - b.updatedAt;
      case 'title-asc':
        return a.title.localeCompare(b.title);
      case 'title-desc':
        return b.title.localeCompare(a.title);
      case 'domain':
        return a.domain.localeCompare(b.domain);
      default:
        return 0;
    }
  });
}

/**
 * Filter notes by search query
 * @param notes Array of notes to filter
 * @param query Search query (case-insensitive)
 * @returns Filtered array
 */
export function filterNotes(notes: LocalNote[], query: string): LocalNote[] {
  if (!query.trim()) {
    return notes;
  }

  const lowerQuery = query.toLowerCase();
  return notes.filter((note) =>
    note.title.toLowerCase().includes(lowerQuery) ||
    note.content.toLowerCase().includes(lowerQuery) ||
    note.domain.toLowerCase().includes(lowerQuery) ||
    (note.reason && note.reason.toLowerCase().includes(lowerQuery))
  );
}
