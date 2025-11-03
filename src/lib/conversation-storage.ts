import type { Conversation } from './types';

/**
 * Conversation Storage Manager
 * Handles conversation persistence using chrome.storage.local
 * Each note can have one continuous conversation
 */

const STORAGE_KEY_CONVERSATIONS = 'conversations';

/**
 * Generate a UUID v4 using native Web Crypto API
 */
function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Get all conversations from storage
 */
async function getAllConversationsMap(): Promise<Record<string, Conversation>> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY_CONVERSATIONS);
    return result[STORAGE_KEY_CONVERSATIONS] || {};
  } catch (error) {
    console.error('[ConversationStorage] Failed to get conversations:', error);
    throw error;
  }
}

/**
 * Save a conversation to storage
 * @param conversationData Conversation data (id optional for new conversations)
 * @returns The saved conversation with generated ID
 */
export async function saveConversation(
  conversationData: Omit<Conversation, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<Conversation> {
  const conversations = await getAllConversationsMap();

  const id = conversationData.id || generateUUID();
  const now = Date.now();
  const isNew = !conversationData.id || !conversations[id];

  const conversation: Conversation = {
    ...conversationData,
    id,
    createdAt: isNew ? now : conversations[id]?.createdAt || now,
    updatedAt: now,
  };

  conversations[id] = conversation;

  try {
    await chrome.storage.local.set({ [STORAGE_KEY_CONVERSATIONS]: conversations });
  } catch (error) {
    console.error('[ConversationStorage] Failed to save conversation:', error);
    throw error;
  }

  return conversation;
}

/**
 * Get a conversation by ID
 * @param id Conversation UUID
 * @returns The conversation or null if not found
 */
export async function getConversation(id: string): Promise<Conversation | null> {
  const conversations = await getAllConversationsMap();
  return conversations[id] || null;
}

/**
 * Get conversation associated with a note
 * @param noteId Note UUID
 * @returns The conversation or null if not found
 */
export async function getConversationByNoteId(noteId: string): Promise<Conversation | null> {
  const conversations = await getAllConversationsMap();
  const conversation = Object.values(conversations).find(c => c.noteId === noteId);
  return conversation || null;
}

/**
 * Get all conversations as an array, sorted by updatedAt (newest first)
 */
export async function getAllConversations(): Promise<Conversation[]> {
  const conversationsMap = await getAllConversationsMap();
  const conversations = Object.values(conversationsMap);
  return conversations.sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * Delete a conversation by ID
 * @param id Conversation UUID
 * @returns True if deleted, false if not found
 */
export async function deleteConversation(id: string): Promise<boolean> {
  const conversations = await getAllConversationsMap();

  if (!conversations[id]) {
    return false;
  }

  delete conversations[id];

  try {
    await chrome.storage.local.set({ [STORAGE_KEY_CONVERSATIONS]: conversations });
  } catch (error) {
    console.error('[ConversationStorage] Failed to delete conversation:', error);
    throw error;
  }

  return true;
}

/**
 * Get total count of conversations
 */
export async function getConversationCount(): Promise<number> {
  const conversationsMap = await getAllConversationsMap();
  return Object.keys(conversationsMap).length;
}
