import type { LocalNote, NotesIndex } from './types';
import { pluginManager } from '../plugins/registry';
import JSZip from 'jszip';

/**
 * Local Notes Storage Manager
 * Handles all local note operations using chrome.storage.local
 * Following the local-first architecture pattern
 */

const STORAGE_KEY_NOTES = 'notes';
const STORAGE_KEY_INDEX = 'notesIndex';

/**
 * Generate a UUID v4 using native Web Crypto API
 * UUID v4 collision probability is negligible (~2^-122), so no collision detection needed
 */
function generateUUID(): string {
  return crypto.randomUUID();
}


// Note: Summary generation, tag generation, and ELI blocks are now handled by the plugin system

/**
 * Get all notes from storage
 */
async function getAllNotesMap(): Promise<Record<string, LocalNote>> {
  const result = await chrome.storage.local.get(STORAGE_KEY_NOTES);
  return result[STORAGE_KEY_NOTES] || {};
}

/**
 * Get notes index from storage
 */
async function getNotesIndex(): Promise<NotesIndex> {
  const result = await chrome.storage.local.get(STORAGE_KEY_INDEX);
  return result[STORAGE_KEY_INDEX] || { lastModified: 0, count: 0 };
}

/**
 * Update notes index
 */
async function updateNotesIndex(notes: Record<string, LocalNote>): Promise<void> {
  const count = Object.keys(notes).length;
  const index: NotesIndex = {
    lastModified: Date.now(),
    count,
  };
  await chrome.storage.local.set({ [STORAGE_KEY_INDEX]: index });
}

/**
 * Save a note to local storage
 * @param noteData Note data (without id if creating new note)
 * @returns The saved note with generated ID
 */
export async function saveNote(noteData: Omit<LocalNote, 'id' | 'timestamp' | 'updatedAt'> & { id?: string }): Promise<LocalNote> {
  const notes = await getAllNotesMap();

  const id = noteData.id || generateUUID();
  const now = Date.now();
  const isNewNote = !noteData.id || !notes[id];

  // Process content through plugin system (only for new notes)
  let pluginData: Record<string, any> | undefined;
  if (isNewNote && noteData.content?.trim()) {

    try {
      pluginData = await pluginManager.processNote({
        title: noteData.title,
        content: noteData.content,
        url: noteData.url,
        domain: noteData.domain,
        ogImage: noteData.ogImage,
      });

      // Only include pluginData if we got results
      if (pluginData && Object.keys(pluginData).length === 0) {
        pluginData = undefined;
      }
    } catch (error) {
      console.error('[LocalNotes] Plugin processing failed:', error);
      pluginData = undefined;
    }
  }

  const note: LocalNote = {
    ...noteData,
    pluginData,
    id,
    timestamp: noteData.id && notes[id] ? notes[id].timestamp : now, // Keep original timestamp if updating
    updatedAt: now,
  };

  notes[id] = note;

  await chrome.storage.local.set({ [STORAGE_KEY_NOTES]: notes });
  await updateNotesIndex(notes);


  return note;
}

/**
 * Get all notes as an array, sorted by updatedAt (newest first)
 */
export async function getAllNotes(): Promise<LocalNote[]> {
  const notesMap = await getAllNotesMap();
  const notes = Object.values(notesMap);
  return notes.sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * Get a single note by ID
 * @param id Note UUID
 * @returns The note or null if not found
 */
export async function getNote(id: string): Promise<LocalNote | null> {
  const notes = await getAllNotesMap();
  return notes[id] || null;
}

/**
 * Delete a note by ID
 * @param id Note UUID
 * @returns True if deleted, false if not found
 */
export async function deleteNote(id: string): Promise<boolean> {
  const notes = await getAllNotesMap();

  if (!notes[id]) {
    return false;
  }

  delete notes[id];

  await chrome.storage.local.set({ [STORAGE_KEY_NOTES]: notes });
  await updateNotesIndex(notes);

  return true;
}

/**
 * Search notes by query string (searches in title and content)
 * @param query Search string (case-insensitive)
 * @returns Array of matching notes, sorted by relevance
 */
export async function searchNotes(query: string): Promise<LocalNote[]> {
  if (!query.trim()) {
    return getAllNotes();
  }

  const notes = await getAllNotes();
  const lowerQuery = query.toLowerCase();

  return notes.filter((note) => {
    const titleMatch = note.title.toLowerCase().includes(lowerQuery);
    const contentMatch = note.content.toLowerCase().includes(lowerQuery);
    const domainMatch = note.domain.toLowerCase().includes(lowerQuery);
    const reasonMatch = note.reason?.toLowerCase().includes(lowerQuery);

    return titleMatch || contentMatch || domainMatch || reasonMatch;
  });
}

/**
 * Get total count of notes
 */
export async function getNoteCount(): Promise<number> {
  const index = await getNotesIndex();
  return index.count;
}

/**
 * Get storage usage in bytes (approximate)
 */
export async function getStorageUsage(): Promise<number> {
  const result = await chrome.storage.local.get(); // Get all data
  const json = JSON.stringify(result);
  return new Blob([json]).size;
}

/**
 * Storage breakdown by category
 */
export interface StorageBreakdown {
  notes: { size: number; count: number; percentage: number };
  conversations: { size: number; count: number; percentage: number };
  settings: { size: number; percentage: number };
  plugins: { size: number; percentage: number };
  other: { size: number; percentage: number };
  total: { size: number };
}

/**
 * Get detailed storage breakdown by category
 */
export async function getStorageBreakdown(): Promise<StorageBreakdown> {
  const result = await chrome.storage.local.get();

  // Helper to calculate size of data
  const getSize = (data: any): number => {
    return new Blob([JSON.stringify(data)]).size;
  };

  // Notes data
  const notes = result[STORAGE_KEY_NOTES] || {};
  const notesIndex = result[STORAGE_KEY_INDEX] || {};
  const notesSize = getSize({ notes, notesIndex });
  const notesCount = Object.keys(notes).length;

  // Conversations data
  const conversations = result['conversations'] || {};
  const conversationsSize = getSize(conversations);
  const conversationsCount = Object.keys(conversations).length;

  // Settings data (API keys, models, preferences)
  const settingsKeys: string[] = [
    'veniceApiKey', 'claudeApiKey', 'activeProvider',
    'veniceModel', 'claudeModel', 'autoOpenNoteConversation'
  ];
  const settingsData: Record<string, any> = {};
  for (const key of settingsKeys) {
    if (result[key] !== undefined) {
      settingsData[key] = result[key];
    }
  }
  const settingsSize = getSize(settingsData);

  // Plugins data (plugins, configPlugins, staticVariables, masterPrompts)
  const pluginsKeys: string[] = ['plugins', 'configPlugins', 'staticVariables', 'masterPrompts'];
  const pluginsData: Record<string, any> = {};
  for (const key of pluginsKeys) {
    if (result[key] !== undefined) {
      pluginsData[key] = result[key];
    }
  }
  const pluginsSize = getSize(pluginsData);

  // Other data (theme, pendingNoteId, etc.)
  const accountedKeys = new Set([
    STORAGE_KEY_NOTES, STORAGE_KEY_INDEX, 'conversations',
    ...settingsKeys, ...pluginsKeys
  ]);
  const otherData: Record<string, any> = {};
  for (const key in result) {
    if (!accountedKeys.has(key)) {
      otherData[key] = result[key];
    }
  }
  const otherSize = getSize(otherData);

  // Total
  const totalSize = getSize(result);

  // Calculate percentages (avoid division by zero)
  const calculatePercentage = (size: number): number => {
    return totalSize > 0 ? Math.round((size / totalSize) * 100 * 10) / 10 : 0;
  };

  return {
    notes: { size: notesSize, count: notesCount, percentage: calculatePercentage(notesSize) },
    conversations: { size: conversationsSize, count: conversationsCount, percentage: calculatePercentage(conversationsSize) },
    settings: { size: settingsSize, percentage: calculatePercentage(settingsSize) },
    plugins: { size: pluginsSize, percentage: calculatePercentage(pluginsSize) },
    other: { size: otherSize, percentage: calculatePercentage(otherSize) },
    total: { size: totalSize }
  };
}

/**
 * Export all notes as JSON
 */
export async function exportNotes(): Promise<string> {
  const notes = await getAllNotes();
  return JSON.stringify(notes, null, 2);
}

/**
 * Import notes from JSON
 * @param json JSON string containing notes array
 * @param merge If true, merge with existing notes; if false, replace all notes
 * @returns Number of notes imported
 */
export async function importNotes(json: string, merge: boolean = true): Promise<number> {
  try {
    const importedNotes = JSON.parse(json) as LocalNote[];

    if (!Array.isArray(importedNotes)) {
      throw new Error('Invalid format: expected array of notes');
    }

    const notes = merge ? await getAllNotesMap() : {};
    let importCount = 0;

    for (const note of importedNotes) {
      // Validate required fields
      if (!note.title || !note.content || !note.url) {
        continue;
      }

      // Skip if note with same ID already exists (prevents duplicates on re-import)
      if (note.id && notes[note.id]) {
        continue;
      }

      // Generate new ID if missing
      const id = note.id || generateUUID();

      notes[id] = {
        ...note,
        id,
        timestamp: note.timestamp || Date.now(),
        updatedAt: Date.now(),
      };

      importCount++;
    }

    await chrome.storage.local.set({ [STORAGE_KEY_NOTES]: notes });
    await updateNotesIndex(notes);

    return importCount;
  } catch (error) {
    console.error('[LocalNotes] Failed to import notes:', error);
    throw new Error('Failed to import notes: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

/**
 * Update note content (used for cleanup feature)
 * @param noteId Note UUID
 * @param newContent New content to set
 * @param originalContent Optional original content to store for undo
 * @returns Updated note or null if not found
 */
export async function updateNoteContent(
  noteId: string,
  newContent: string,
  originalContent?: string
): Promise<LocalNote | null> {
  const notes = await getAllNotesMap();
  const note = notes[noteId];

  if (!note) {
    return null;
  }

  // Update the note
  const updatedNote: LocalNote = {
    ...note,
    content: newContent,
    originalContent: originalContent,
    updatedAt: Date.now(),
  };

  notes[noteId] = updatedNote;

  await chrome.storage.local.set({ [STORAGE_KEY_NOTES]: notes });
  await updateNotesIndex(notes);

  return updatedNote;
}

/**
 * Clear all notes (use with caution!)
 * @returns Number of notes deleted
 */
export async function clearAllNotes(): Promise<number> {
  const notes = await getAllNotesMap();
  const count = Object.keys(notes).length;

  await chrome.storage.local.set({
    [STORAGE_KEY_NOTES]: {},
    [STORAGE_KEY_INDEX]: { lastModified: Date.now(), count: 0 }
  });

  return count;
}

/**
 * Export all notes as individual markdown files in a zip
 * @returns Blob containing the zip file
 */
export async function exportNotesAsMarkdown(): Promise<Blob> {
  const notes = await getAllNotes();
  const zip = new JSZip();

  for (const note of notes) {
    // Create frontmatter metadata
    const metadata = {
      id: note.id,
      title: note.title,
      url: note.url,
      domain: note.domain,
      created: new Date(note.timestamp).toISOString(),
      updated: new Date(note.updatedAt).toISOString(),
      ...(note.reason && { reason: note.reason }),
      ...(note.ogImage && { ogImage: note.ogImage }),
      ...(note.pluginData && Object.keys(note.pluginData).length > 0 && { pluginData: note.pluginData })
    };

    // Build YAML frontmatter
    const frontmatter = Object.entries(metadata)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return `${key}: [${value.map(v => `"${v}"`).join(', ')}]`;
        }
        return `${key}: "${value}"`;
      })
      .join('\n');

    // Create markdown content
    const markdownContent = `---\n${frontmatter}\n---\n\n${note.content}`;

    // Sanitize filename (remove invalid characters)
    const sanitizedTitle = note.title
      .replace(/[<>:"/\\|?*]/g, '-')
      .replace(/\s+/g, '-')
      .substring(0, 100); // Limit length

    const filename = `${sanitizedTitle}-${note.id.substring(0, 8)}.md`;
    zip.file(filename, markdownContent);
  }

  return await zip.generateAsync({ type: 'blob' });
}

