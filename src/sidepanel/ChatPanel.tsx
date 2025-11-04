import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Library, PlusCircle, Loader2, Check, FileText, ExternalLink } from 'lucide-react';
import { captureCurrentPage, saveCurrentPageAsNote, canCapturePage } from '../lib/page-capture';
import { SaveNoteDialog } from '../components/SaveNoteDialog';
import { ThemeToggle } from '../components/ThemeToggle';
import { initTheme, listenToThemeChanges, getTheme, type Theme } from '../lib/theme';
import type { VeniceMessage } from '../lib/venice-client';
import type { ClaudeMessage } from '../lib/claude-client';
import {
  createAIClient,
  type AIProvider,
  getProviderDisplayName,
  getStorageKeyForApiKey,
  getStorageKeyForModel,
  DEFAULT_OLLAMA_ENDPOINT,
  DEFAULT_MODELS,
} from '../lib/ai-client';
import type { Message, PageContext } from '../lib/types';
import { saveConversation, getConversationByNoteId } from '../lib/conversation-storage';
import { getNote } from '../lib/local-notes';
import { markdownToHtml } from '../lib/markdown';
import { decryptValue, migrateToEncrypted } from '../lib/crypto';

/**
 * Abbreviate provider name for compact display
 */
function getAbbreviatedProvider(provider: AIProvider): string {
  const displayName = getProviderDisplayName(provider);
  // Remove ".ai" suffix or domain-like endings
  return displayName.replace(/\.ai$|\.com$/i, '');
}

/**
 * Abbreviate model name for compact display
 */
function getAbbreviatedModel(modelId: string): string {
  if (!modelId) return 'No model';

  // Handle Claude models: "claude-3-5-sonnet-20241022" -> "3.5 Sonnet"
  if (modelId.includes('claude')) {
    const match = modelId.match(/claude-(\d+-?\d*)-(\w+)/i);
    if (match) {
      const version = match[1].replace('-', '.');
      const variant = match[2].charAt(0).toUpperCase() + match[2].slice(1);
      return `${version} ${variant}`;
    }
  }

  // Handle Llama models: "llama-3.3-70b" -> "Llama 3.3"
  if (modelId.toLowerCase().includes('llama')) {
    const match = modelId.match(/llama[^\d]*(\d+\.?\d*)/i);
    if (match) {
      return `Llama ${match[1]}`;
    }
  }

  // Handle Ollama or other models: try to extract version numbers or first meaningful part
  const versionMatch = modelId.match(/(\w+)[:\-]?(\d+\.?\d*)/i);
  if (versionMatch) {
    const name = versionMatch[1].charAt(0).toUpperCase() + versionMatch[1].slice(1);
    return `${name} ${versionMatch[2]}`;
  }

  // Fallback: capitalize first word and take first 20 chars
  const cleaned = modelId.replace(/[-_]/g, ' ');
  const firstWord = cleaned.split(' ')[0];
  const capitalized = firstWord.charAt(0).toUpperCase() + firstWord.slice(1);
  return cleaned.length > 20 ? capitalized + '...' : cleaned;
}

/**
 * Build a chat prompt with optional page context and master prompts
 */
function buildChatPrompt(userInput: string, context?: PageContext, masterPrompts?: string): string {
  let prompt = '';

  // Prepend master prompts if they exist
  if (masterPrompts) {
    prompt += `${masterPrompts}\n\n---\n\n`;
  }

  // Add context if available
  if (context) {
    prompt += `Context from webpage:
Title: ${context.title}
URL: ${context.url}
Content:
${context.content.mainText}

---

`;
  }

  prompt += context ? `User question: ${userInput}` : userInput;

  return prompt;
}

export function ChatPanel() {
  // Provider settings (AI service configuration)
  const [activeProvider, setActiveProvider] = useState<AIProvider>('venice');
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODELS.venice);
  const [ollamaEndpoint, setOllamaEndpoint] = useState<string>(DEFAULT_OLLAMA_ENDPOINT);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Chat state (conversation messages and input)
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);

  // Context state (page context for conversation)
  const [activeContext, setActiveContext] = useState<PageContext | null>(null);
  const [contextAddedAtIndex, setContextAddedAtIndex] = useState<number | null>(null);

  // Note/conversation state (linking chat to notes)
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [noteId, setNoteId] = useState<string | undefined>(undefined);
  const [noteTitle, setNoteTitle] = useState<string | undefined>(undefined);
  const [savedNoteId, setSavedNoteId] = useState<string | undefined>(undefined);

  // UI state (dialogs and loading indicators)
  const [savingNote, setSavingNote] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [pendingPageData, setPendingPageData] = useState<PageContext | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const loadingConversationRef = useRef(false);

  // Theme state for conditional icon rendering - check synchronously to avoid flash
  const [theme, setTheme] = useState<Theme>(() => {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  });

  useEffect(() => {
    initTheme(); // Initialize dark mode on mount
    loadProviderSettings();

    // Load initial theme (in case it differs from class)
    getTheme().then(setTheme);

    // Listen for theme changes from other pages
    const cleanup = listenToThemeChanges((newTheme) => {
      setTheme(newTheme);
    });
    return cleanup;
  }, []);

  useEffect(() => {
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.activeProvider || changes.veniceApiKey || changes.claudeApiKey ||
          changes.veniceModel || changes.claudeModel ||
          changes.ollamaEndpoint || changes.ollamaModel) {
        loadProviderSettings();
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  const loadProviderSettings = async () => {
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
    setActiveProvider(provider);

    if (provider === 'ollama') {
      // Ollama doesn't use API keys
      setApiKey('');
      const endpoint = result.ollamaEndpoint || DEFAULT_OLLAMA_ENDPOINT;
      setOllamaEndpoint(endpoint);
      const model = result.ollamaModel || '';
      setSelectedModel(model);
    } else {
      const apiKeyStorageKey = getStorageKeyForApiKey(provider);
      const encryptedKey = apiKeyStorageKey ? result[apiKeyStorageKey] : null;

      let decryptedKey = null;
      if (encryptedKey) {
        try {
          // Decrypt the API key
          decryptedKey = await decryptValue(encryptedKey);
        } catch (error) {
          console.error('[ChatPanel] Failed to decrypt API key:', error);
          decryptedKey = null;
        }
      }

      setApiKey(decryptedKey);

      // Load selected model for active provider
      const modelStorageKey = getStorageKeyForModel(provider);
      const model = result[modelStorageKey] || DEFAULT_MODELS[provider];
      setSelectedModel(model);
    }
    setSettingsLoaded(true);
  };

  useEffect(() => {
    // Use instant scroll when loading conversation, smooth scroll during active chat
    const behavior = loadingConversationRef.current ? 'auto' : 'smooth';
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, [messages]);

  // Keep input height consistent across states
  // (auto-resize disabled per design)

  // Check for pending context/actions from notes page or context menus
  useEffect(() => {
    const checkPendingActions = async () => {
      try {
        const result = await chrome.storage.local.get([
          'pendingChatContext',
          'pendingSelectionText',
          'pendingPageShare',
        ]);

        // Handle pending note context
        if (result.pendingChatContext) {
          const context = result.pendingChatContext as PageContext;
          setActiveContext(context);
          setMessages(prev => [
            ...prev,
            {
              id: `sys-${Date.now()}`,
              role: 'system',
              content: `Memory added to context: ${context.title}`,
              timestamp: Date.now(),
            },
          ]);
          await chrome.storage.local.remove('pendingChatContext');
        }

        // Handle pending selection text
        if (result.pendingSelectionText) {
          const selectionText = result.pendingSelectionText as string;
          const messageId = `sel-${Date.now()}`;
          const userMessage: Message = {
            id: messageId,
            role: 'user',
            content: `Selected text:\n\n${selectionText}`,
            timestamp: Date.now(),
          };
          setMessages(prev => [...prev, userMessage]);
          await chrome.storage.local.remove('pendingSelectionText');
        }

        // Handle pending page share
        if (result.pendingPageShare) {
          const pageData = result.pendingPageShare as PageContext;
          setActiveContext(pageData);
          setMessages(prev => {
            setContextAddedAtIndex(prev.length);
            return [
              ...prev,
              {
                id: `sys-${Date.now()}`,
                role: 'system',
                content: `Context: ${pageData.title}`,
                timestamp: Date.now(),
              },
            ];
          });
          await chrome.storage.local.remove('pendingPageShare');
        }
      } catch (error) {
        console.error('[ChatPanel] Failed to load pending actions:', error);
      }
    };

    checkPendingActions();
  }, []);

  // Listen for storage changes (in case context is added while panel is open)
  useEffect(() => {
    const handleStorageChange = async (changes: { [key: string]: chrome.storage.StorageChange }) => {
      // Handle pending note context
      if (changes.pendingChatContext && changes.pendingChatContext.newValue) {
        const context = changes.pendingChatContext.newValue as PageContext;
        setActiveContext(context);
        setMessages(prev => [
          ...prev,
          {
            id: `sys-${Date.now()}`,
            role: 'system',
            content: `Memory added to context: ${context.title}`,
            timestamp: Date.now(),
          },
        ]);
        await chrome.storage.local.remove('pendingChatContext');
      }

      // Handle selection text from context menu
      if (changes.pendingSelectionText && changes.pendingSelectionText.newValue) {
        const selectionText = changes.pendingSelectionText.newValue as string;
        const messageId = `sel-${Date.now()}`;
        const userMessage: Message = {
          id: messageId,
          role: 'user',
          content: `Selected text:\n\n${selectionText}`,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, userMessage]);
        await chrome.storage.local.remove('pendingSelectionText');
      }

      // Handle page share from context menu
      if (changes.pendingPageShare && changes.pendingPageShare.newValue) {
        const pageData = changes.pendingPageShare.newValue as PageContext;
        setActiveContext(pageData);
        setMessages(prev => {
          setContextAddedAtIndex(prev.length);
          return [
            ...prev,
            {
              id: `sys-${Date.now()}`,
              role: 'system',
              content: `Context: ${pageData.title}`,
              timestamp: Date.now(),
            },
          ];
        });
        await chrome.storage.local.remove('pendingPageShare');
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  // Shared function to load a note's conversation
  const loadNoteConversation = async (pendingNoteId: string, shouldClearIfMissing: boolean) => {
    try {
      loadingConversationRef.current = true;
      setNoteId(pendingNoteId);

      // Load the note as context
      const note = await getNote(pendingNoteId);
      if (note) {
        setNoteTitle(note.title);
        const context: PageContext = {
          url: note.url,
          title: note.title,
          domain: note.domain,
          ogImage: note.ogImage,
          content: {
            mainText: note.content,
            headings: [],
            links: [],
          },
          timestamp: note.timestamp,
        };
        setActiveContext(context);
      }

      // Load existing conversation or prepare for new one
      const conversation = await getConversationByNoteId(pendingNoteId);
      if (conversation) {
        setConversationId(conversation.id);
        setMessages(conversation.messages);
      } else if (shouldClearIfMissing) {
        // Clear messages for new conversation (only when switching notes)
        setMessages([]);
        setConversationId(undefined);
      }

      // Clear pending noteId
      await chrome.storage.local.remove('pendingNoteId');
      loadingConversationRef.current = false;
    } catch (error) {
      console.error('[ChatPanel] Failed to load conversation:', error);
      loadingConversationRef.current = false;
    }
  };

  // Load conversation when noteId is provided (on mount)
  useEffect(() => {
    const init = async () => {
      const result = await chrome.storage.local.get('pendingNoteId');
      if (result.pendingNoteId) {
        await loadNoteConversation(result.pendingNoteId as string, false);
      }
    };

    init();
  }, []);

  // Listen for storage changes to load conversation when side panel is already open
  useEffect(() => {
    const handleStorageChange = async (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.pendingNoteId && changes.pendingNoteId.newValue) {
        await loadNoteConversation(changes.pendingNoteId.newValue as string, true);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  // Auto-save conversation when messages change
  useEffect(() => {
    const autoSave = async () => {
      // Skip auto-save while loading conversation to prevent race conditions
      if (loadingConversationRef.current) return;
      if (messages.length === 0) return;

      try {
        const savedConversation = await saveConversation({
          id: conversationId,
          noteId: noteId,
          messages: messages,
        });

        // Update conversationId if this was the first save
        if (!conversationId) {
          setConversationId(savedConversation.id);
        }
      } catch (error) {
        console.error('[ChatPanel] Failed to save conversation:', error);
      }
    };

    autoSave();
  }, [messages, noteId, conversationId]);

  // Helper: Load enabled master prompts from storage
  const loadMasterPrompts = async (): Promise<string> => {
    const result = await chrome.storage.local.get('masterPrompts');
    const prompts = result.masterPrompts || [];
    return prompts
      .filter((p: any) => p.enabled)
      .map((p: any) => p.prompt)
      .join('\n\n');
  };

  // Helper: Build conversation history for AI
  const buildConversationHistory = (
    currentMessages: Message[],
    userPrompt: string,
    enabledPrompts: string
  ) => {
    const conversationMessages = currentMessages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }));

    const finalPrompt = buildChatPrompt(userPrompt, activeContext || undefined, enabledPrompts || undefined);
    conversationMessages.push({
      role: 'user',
      content: finalPrompt
    });

    return conversationMessages;
  };

  // Helper: Create streaming callback for AI response
  const createStreamCallback = (messageId: string, modelDisplayName: string) => {
    return (chunk: { done: boolean; chunk?: string }) => {
      if (chunk.done) {
        setStreaming(false);
      } else if (chunk.chunk) {
        setMessages((prev: Message[]) => {
          const lastMessage = prev[prev.length - 1];
          const assistantId = `${messageId}-assistant`;

          if (lastMessage?.role === 'assistant' && lastMessage.id === assistantId) {
            return [
              ...prev.slice(0, -1),
              { ...lastMessage, content: lastMessage.content + chunk.chunk },
            ];
          } else {
            return [
              ...prev,
              {
                id: assistantId,
                role: 'assistant',
                content: chunk.chunk,
                timestamp: Date.now(),
                model: modelDisplayName,
              },
            ];
          }
        });
      }
    };
  };

  const sendMessage = async () => {
    // Allow Ollama without API key
    if (!input.trim() || (activeProvider !== 'ollama' && !apiKey)) return;

    const messageId = `msg-${Date.now()}`;
    const userMessage: Message = {
      id: messageId,
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    const userPrompt = input.trim();
    setInput('');
    setStreaming(true);

    try {
      // Load master prompts and build conversation history
      const enabledPrompts = await loadMasterPrompts();
      const conversationMessages = buildConversationHistory(messages, userPrompt, enabledPrompts);

      // Create AI client and stream response
      const client = createAIClient(activeProvider, apiKey || '', ollamaEndpoint);
      const modelDisplayName = getProviderDisplayName(activeProvider);
      const streamCallback = createStreamCallback(messageId, modelDisplayName);

      await client.streamChat(conversationMessages, streamCallback, selectedModel);
    } catch (error) {
      console.error('[ChatPanel] Failed to send message:', error);
      setMessages(prev => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'system',
          content: `Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: Date.now(),
        },
      ]);
      setStreaming(false);
    }
  };

  const shareCurrentPage = async () => {
    try {
      // Check if the current page can be captured before attempting
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!canCapturePage(tab?.url)) {
        setMessages(prev => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: 'system',
            content: 'Cannot capture this page. Extension pages and browser pages cannot be captured.',
            timestamp: Date.now(),
          },
        ]);
        return;
      }

      const pageData = await captureCurrentPage();

      setActiveContext(pageData);

      // Track where context was added (before system message)
      setContextAddedAtIndex(messages.length);

      setMessages(prev => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          role: 'system',
          content: `Context: ${pageData.title}`,
          timestamp: Date.now(),
        },
      ]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Only log as error if it's not the expected "cannot capture" message
      if (errorMessage.includes('Cannot capture this page')) {
      } else {
        console.error('[ChatPanel] Failed to share page:', error);
      }

      setMessages(prev => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'system',
          content: errorMessage,
          timestamp: Date.now(),
        },
      ]);
    }
  };

  const clearContext = () => {
    setActiveContext(null);
    setContextAddedAtIndex(null); // Reset tracking
    setMessages(prev => [
      ...prev,
      {
        id: `sys-${Date.now()}`,
        role: 'system',
        content: 'Context cleared',
        timestamp: Date.now(),
      },
    ]);
  };

  const closeNoteConversation = () => {
    setNoteId(undefined);
    setNoteTitle(undefined);
    setActiveContext(null);
    setConversationId(undefined);
    setMessages([]);
    setContextAddedAtIndex(null); // Reset tracking
  };

  const clearAllContext = () => {
    if (messages.length === 0 && !activeContext) return;

    if (messages.length > 0 || activeContext) {
      if (confirm('Clear all messages and context? This cannot be undone.')) {
        setMessages([]);
        setActiveContext(null);
        setNoteId(undefined);
        setNoteTitle(undefined);
        setConversationId(undefined);
        setContextAddedAtIndex(null); // Reset tracking
      }
    }
  };

  const savePageAsNote = async () => {
    if (savingNote) return;

    try {
      const pageData = await captureCurrentPage();
      setPendingPageData(pageData);
      setShowSaveDialog(true);
    } catch (error) {
      console.error('[ChatPanel] Failed to capture page:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setMessages(prev => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'system',
          content: errorMessage,
          timestamp: Date.now(),
        },
      ]);
    }
  };

  const openNote = (noteId: string) => {
    chrome.tabs.create({
      url: chrome.runtime.getURL(`src/notes/notes.html#note=${noteId}`),
    });
  };

  const transferConversationToNote = async (noteId: string, noteTitle: string) => {
    // Get messages since context was added
    const messagesToTransfer = messages.slice(contextAddedAtIndex!);

    // Filter to user/assistant only (no system messages)
    const conversationMessages = messagesToTransfer.filter(
      m => m.role === 'user' || m.role === 'assistant'
    );

    if (conversationMessages.length > 0) {
      // Save as conversation linked to the note
      await saveConversation({
        noteId: noteId,
        messages: conversationMessages,
      });
    }

    // Load the note conversation (seamless transition)
    setNoteId(noteId);
    setNoteTitle(noteTitle);
    setConversationId(undefined); // Will be set by auto-save

    // Set context to the note
    const note = await getNote(noteId);
    if (note) {
      const context: PageContext = {
        url: note.url,
        title: note.title,
        domain: note.domain,
        ogImage: note.ogImage,
        content: {
          mainText: note.content,
          headings: [],
          links: [],
        },
        timestamp: note.timestamp,
      };
      setActiveContext(context);
    }

    // Update messages to only show transferred ones
    setMessages(conversationMessages);

    // Reset context tracking
    setContextAddedAtIndex(null);
  };

  const handleSaveWithReason = async () => {
    // Don't close the dialog - let the animation component handle closing
    if (!pendingPageData) return;

    const noteTitle = pendingPageData.title;
    setSavingNote(true);

    try {
      const result = await saveCurrentPageAsNote();

      if (result.success) {
        setSavedNoteId(result.noteId);

        // Transfer conversation history to note if context was added
        if (contextAddedAtIndex !== null && result.noteId) {
          await transferConversationToNote(result.noteId, noteTitle);
        } else {
          // No context was added, keep existing behavior
          setMessages(prev => [
            ...prev,
            {
              id: `sys-${Date.now()}`,
              role: 'system',
              content: `Memory saved: "${noteTitle}"`,
              timestamp: Date.now(),
              noteId: result.noteId,
              noteTitle: noteTitle,
            },
          ]);
        }
      } else {
        // On error, close dialog and show error
        setShowSaveDialog(false);
        setMessages(prev => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: 'system',
            content: `Failed to save memory: ${result.error || 'Unknown error'}`,
            timestamp: Date.now(),
          },
        ]);
      }
    } catch (error) {
      console.error('[ChatPanel] Failed to save page as note:', error);
      setShowSaveDialog(false);
      setMessages(prev => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'system',
          content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setSavingNote(false);
      setPendingPageData(null);
    }
  };

  const handleCancelSave = () => {
    setShowSaveDialog(false);
    setPendingPageData(null);
    setSavedNoteId(undefined);
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const isConnected = activeProvider === 'ollama' || !!apiKey;
  const providerName = getProviderDisplayName(activeProvider);
  
  // Determine connection status: unknown if settings haven't loaded, otherwise based on connection
  const connectionStatus = !settingsLoaded ? 'unknown' : (isConnected ? 'connected' : 'disconnected');
  const statusTitle = connectionStatus === 'unknown' ? 'Unknown' : (connectionStatus === 'connected' ? 'Connected' : 'Disconnected');

  return (
    <>
      <SaveNoteDialog
        isOpen={showSaveDialog}
        onClose={handleCancelSave}
        onSave={handleSaveWithReason}
        pageTitle={pendingPageData?.title || ''}
        pageUrl={pendingPageData?.url || ''}
        isSaving={savingNote}
        savedNoteId={savedNoteId}
      />

      <div className="chat-panel">
        {/* Header */}
        <div className="header">
          <div className="header-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
              <img 
                src={chrome.runtime.getURL(theme === 'light' ? 'icons/think-os-agent-lightmode.svg' : 'icons/think-os-agent.png')} 
                alt="Think OS Agent" 
                style={{ height: '24px' }} 
              />
              {/* status dot to the right of the icon */}
              <span
                title={statusTitle}
                className={`status-dot ${connectionStatus}`}
                style={{
                  marginLeft: 6
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="settings-button"
                onClick={async () => {
                  const notesUrl = chrome.runtime.getURL('src/notes/notes.html');
                  const tabs = await chrome.tabs.query({ url: notesUrl });
                  if (tabs.length > 0 && tabs[0].id) {
                    await chrome.tabs.update(tabs[0].id, { active: true });
                    await chrome.windows.update(tabs[0].windowId!, { focused: true });
                  } else {
                    await chrome.tabs.create({ url: notesUrl });
                  }
                }}
                title="My Memories"
                aria-label="Open memories"
              >
                <Library size={18} />
              </button>
              <ThemeToggle />
              <button
                className="settings-button"
                onClick={async () => {
                  const settingsUrl = chrome.runtime.getURL('src/settings/settings.html');
                  const tabs = await chrome.tabs.query({ url: settingsUrl });
                  if (tabs.length > 0 && tabs[0].id) {
                    await chrome.tabs.update(tabs[0].id, { active: true });
                    await chrome.windows.update(tabs[0].windowId!, { focused: true });
                  } else {
                    await chrome.runtime.openOptionsPage();
                  }
                }}
                title="Settings"
                aria-label="Open settings"
              >
                <Settings size={18} />
              </button>
            </div>
          </div>

          {/* status text hidden; dot below icon is sufficient */}
        </div>

      {/* Messages */}
      <div className="messages">
        {!isConnected && (
          <div className="empty-state">
            <p>No AI connection</p>
            <p className="hint">Add your API key to start chatting</p>
            <button
              onClick={() => chrome.runtime.openOptionsPage()}
              className="btn btn-primary mt-4"
            >
              Add API Key
            </button>
          </div>
        )}

        {isConnected && messages.length === 0 && (
          <div className="empty-state">
            <img 
              src={chrome.runtime.getURL('icons/think-os-agent-grey-blue.svg')} 
              alt="Think OS Agent" 
              className="empty-state-icon"
            />
          </div>
        )}

        <AnimatePresence>
          {messages.map(msg => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className={`message ${msg.role} ${msg.noteId ? 'interactive' : ''}`}
            >
              <div
                className="message-bubble"
                onClick={msg.noteId ? () => openNote(msg.noteId!) : undefined}
              >
                {msg.noteId && msg.noteTitle ? (
                  <div className="note-card-message">
                    <div className="note-card-message-content">
                      <div className="note-card-message-header">
                        <Check size={16} className="note-card-message-icon" />
                        <span className="note-card-message-label">Memory Saved</span>
                      </div>
                      <div className="note-card-message-title">"{msg.noteTitle}"</div>
                    </div>
                    <ExternalLink size={16} className="note-card-message-action" />
                  </div>
                ) : msg.role === 'assistant' ? (
                  <div
                    className="message-markdown"
                    dangerouslySetInnerHTML={{ __html: markdownToHtml(msg.content) }}
                  />
                ) : (
                  msg.content
                )}
              </div>
              {!msg.noteId && (
                <div className="flex items-center gap-2">
                  <span className="message-time">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                  {msg.model && (
                    <span className="message-model">
                      {msg.model}
                    </span>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {streaming && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
          <div className="streaming-indicator">
            <span>Thinking</span>
            <div className="streaming-dots">
              <div className="streaming-dot" />
              <div className="streaming-dot" />
              <div className="streaming-dot" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Note Context Badge - positioned above input area */}
      {noteTitle && (
        <div className="note-context-badge">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            flex: 1,
            minWidth: 0
          }}>
            <FileText size={16} style={{ flexShrink: 0 }} />
            <span style={{
              fontSize: '0.875rem',
              fontWeight: '500',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              Discussing: {noteTitle}
            </span>
          </div>
          <button
            onClick={closeNoteConversation}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '0.25rem',
              color: 'inherit',
              opacity: 0.7,
              flexShrink: 0
            }}
            onMouseOver={(e) => (e.currentTarget.style.opacity = '1')}
            onMouseOut={(e) => (e.currentTarget.style.opacity = '0.7')}
            title="Close memory conversation"
            aria-label="Close memory conversation"
          >
            ✕
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className="input-area">
        {activeContext && !noteTitle && (
          <div className="context-badge">
            <div className="context-badge-content">
              <FileText size={16} className="context-badge-icon" />
              <span className="context-title">
                Context: {activeContext.title}
              </span>
            </div>
            <button
              onClick={clearContext}
              className="context-clear"
              title="Clear context"
            >
              ✕
            </button>
          </div>
        )}

        <div className="flex gap-2 mb-2">
          <button
            onClick={shareCurrentPage}
            className="btn btn-secondary btn-sm"
            title="Add current page as context for chat"
          >
            Add Page to Context
          </button>
          <button
            onClick={savePageAsNote}
            disabled={savingNote}
            className="btn btn-accent btn-sm gap-1.5"
            title="Save current page as memory (stored locally in extension)"
          >
            {savingNote ? <Loader2 size={18} className="spin" /> : <PlusCircle size={18} />}
            {savingNote ? 'Saving...' : 'Save as Memory'}
          </button>
        </div>

        <div className="input-controls">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isConnected ? 'Ask me anything...' : 'Add API key to chat'}
            disabled={!isConnected || streaming}
            className="input-textarea"
            rows={1}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || !isConnected || streaming}
            className="btn btn-primary"
          >
            Send
          </button>
        </div>
      </div>
      </div>
    </>
  );
}
