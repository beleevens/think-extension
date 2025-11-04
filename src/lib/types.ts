/**
 * Types for Think Extension (Standalone)
 * Cloud-only version with Venice.ai and Chrome local storage
 */

// ============ Page Context ============
export interface PageContext {
  url: string;
  title: string;
  domain: string;
  ogImage?: string;
  content: {
    mainText: string; // Markdown-formatted content extracted from the page
    headings: string[];
    links: Array<{
      text: string;
      href: string;
    }>;
  };
  timestamp: number;
}

// ============ UI State ============

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  model?: string;
  noteId?: string; // For system messages about saved notes
  noteTitle?: string; // Title of the saved note
}

export interface Conversation {
  id: string;              // UUID v4
  noteId?: string;         // Optional - links to a note, undefined for standalone chats
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

// ============ Local Notes Storage ============

export interface LocalNote {
  id: string;              // UUID v4
  title: string;
  content: string;         // Markdown content
  url: string;
  domain: string;
  ogImage?: string;
  timestamp: number;       // Created timestamp
  updatedAt: number;       // Last modified timestamp
  reason?: string;         // Why the user saved this page
  originalContent?: string; // Backup of content before cleanup (for undo)

  // Plugin-generated data (all plugins are now config-based)
  pluginData?: {
    [pluginId: string]: any;
    // Examples of default plugins:
    // "tag-generator": ["ai", "productivity", "browser-extension"]
    // "summary-generator": "This article discusses..."
    // "insights": "- Key insight 1\n- Key insight 2..."
    // "eli5": "This is like when you..."
  };
}

export interface NotesIndex {
  lastModified: number;
  count: number;
}

export interface NotesStorage {
  notes: Record<string, LocalNote>;  // Key: note UUID, Value: LocalNote
  notesIndex: NotesIndex;
}

// ============ Venice AI ============

export interface VeniceMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface VeniceAPIConfig {
  apiKey: string;
  model?: string;
}

// ============ Chrome Storage ============

export interface ChromeStorage {
  // AI Provider configuration
  activeProvider?: 'venice' | 'claude';
  veniceApiKey?: string;
  claudeApiKey?: string;
  veniceModel?: string;
  claudeModel?: string;

  // Behavior settings
  autoOpenNoteConversation?: boolean;  // Default: true - auto-open conversation when clicking a note

  // Plugin system
  plugins?: {
    [pluginId: string]: {
      enabled: boolean;
      config: any;  // Plugin-specific configuration
    };
  };
}
