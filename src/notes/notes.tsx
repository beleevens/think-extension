import { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { getAllNotes, deleteNote } from '../lib/local-notes';
import { initTheme, listenToThemeChanges, getTheme, type Theme } from '../lib/theme';
import type { LocalNote } from '../lib/types';
import { NotesSidebar } from '../components/NotesSidebar';
import { NoteDetailViewer } from '../components/NoteDetailViewer';
import { filterNotes, sortNotes, type SortBy } from '../lib/note-utils';
import { registerBuiltInPlugins, listenToPluginChanges } from '../plugins/registry';
import { getConversationByNoteId, deleteConversation } from '../lib/conversation-storage';
import './notes.css';

// Initialize plugin system
registerBuiltInPlugins().then(() => {

  // Listen for plugin changes (hot-reload)
  listenToPluginChanges(() => {
  });
}).catch((err) => {
  console.error('[Notes] Failed to initialize plugin system:', err);
});

function NotesPage() {
  const [notes, setNotes] = useState<LocalNote[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('date-desc');
  const [loading, setLoading] = useState(true);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [autoOpenEnabled, setAutoOpenEnabled] = useState(true); // Cache auto-open setting
  // Theme state for conditional icon rendering - check synchronously to avoid flash
  const [theme, setTheme] = useState<Theme>(() => {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  });

  // Filter and sort notes using useMemo for better performance
  const filteredNotes = useMemo(() => {
    const filtered = filterNotes(notes, searchQuery);
    return sortNotes(filtered, sortBy);
  }, [notes, searchQuery, sortBy]);

  // Helper function to check auto-open setting and open conversation if enabled
  const checkAndAutoOpenConversation = async (note: LocalNote) => {
    if (autoOpenEnabled) {
      await handleOpenConversation(note);
    }
  };

  useEffect(() => {
    const init = async () => {
      initTheme(); // Initialize dark mode on mount

      // Load auto-open setting once
      try {
        const result = await chrome.storage.local.get('autoOpenNoteConversation');
        const autoOpen = result.autoOpenNoteConversation ?? true; // Default: true
        setAutoOpenEnabled(autoOpen);
      } catch (error) {
        console.error('[NotesPage] Failed to load auto-open setting:', error);
      }

      // Check for deep-link hash parameter (e.g., #note=abc-123)
      const hash = window.location.hash;
      let deepLinkNoteId: string | null = null;
      if (hash.startsWith('#note=')) {
        deepLinkNoteId = hash.substring(6); // Remove '#note='
        setSelectedNoteId(deepLinkNoteId);
      }

      // Load notes
      const allNotes = await loadNotes();

      // If deep-linking and auto-open is enabled, open the conversation
      if (deepLinkNoteId) {
        try {
          const note = allNotes.find(n => n.id === deepLinkNoteId);
          if (note) {
            await checkAndAutoOpenConversation(note);
          }
        } catch (error) {
          console.error('[NotesPage] Failed to auto-open deep-linked conversation:', error);
        }
      }
    };

    init();

    // Load initial theme
    getTheme().then(setTheme);

    // Listen for theme changes from other pages
    const cleanup = listenToThemeChanges((newTheme) => {
      setTheme(newTheme);
    });
    return cleanup;
  }, []);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const allNotes = await getAllNotes();
      setNotes(allNotes);

      // Auto-select first note if available and no note is already selected
      // (preserves deep-link selection from URL hash)
      if (allNotes.length > 0 && !selectedNoteId) {
        const firstNoteId = allNotes[0].id;
        setSelectedNoteId(firstNoteId);
        // Set first note as context when auto-selecting
        try {
          await chrome.storage.local.set({ pendingNoteId: firstNoteId });
        } catch (error) {
          console.error('[NotesPage] Failed to set initial note context:', error);
        }
      }

      return allNotes;
    } catch (error) {
      console.error('[NotesPage] Failed to load notes:', error);
      showMessage('error', 'Failed to load notes');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const handleNoteSelect = async (noteId: string) => {
    setSelectedNoteId(noteId);

    // Set note as context in chat panel
    try {
      await chrome.storage.local.set({ pendingNoteId: noteId });
    } catch (error) {
      console.error('[NotesPage] Failed to set note context:', error);
    }

    // Auto-open conversation if enabled
    try {
      const note = notes.find(n => n.id === noteId);
      if (note) {
        await checkAndAutoOpenConversation(note);
      }
    } catch (error) {
      console.error('[NotesPage] Failed to auto-open conversation:', error);
    }
  };

  const handleDelete = async (noteId: string, noteTitle: string) => {
    const confirmed = confirm(
      `Delete note "${noteTitle}"?\n\nThis cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setDeletingNoteId(noteId);
      const success = await deleteNote(noteId);

      if (success) {
        // Clean up associated conversation
        const conversation = await getConversationByNoteId(noteId);
        if (conversation) {
          await deleteConversation(conversation.id);
        }

        setNotes((prev) => prev.filter((n) => n.id !== noteId));

        // If deleted note was selected, select another note
        if (selectedNoteId === noteId) {
          const remainingNotes = notes.filter((n) => n.id !== noteId);
          setSelectedNoteId(remainingNotes.length > 0 ? remainingNotes[0].id : null);
        }

        showMessage('success', 'Note deleted successfully');
      }
    } catch (error) {
      console.error('[NotesPage] Failed to delete note:', error);
      showMessage('error', 'Failed to delete note');
    } finally {
      setDeletingNoteId(null);
    }
  };

  const handleNoteUpdate = (updatedNote: LocalNote) => {
    // Update the note in the notes array
    setNotes((prev) => prev.map((n) => n.id === updatedNote.id ? updatedNote : n));
  };

  const handleOpenConversation = async (note: LocalNote) => {
    try {
      // Store noteId for chat panel to pick up and load conversation
      await chrome.storage.local.set({ pendingNoteId: note.id });

      // Try to open sidepanel (Chrome 114+)
      try {
        await chrome.sidePanel.open({ windowId: (await chrome.windows.getCurrent()).id });
      } catch (e) {
        // Sidepanel API not available or failed, open sidepanel manually
      }
    } catch (error) {
      console.error('[NotesPage] Failed to open conversation:', error);
      showMessage('error', 'Failed to open conversation');
    }
  };

  const openSettings = () => {
    chrome.runtime.openOptionsPage();
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // Cloud-only extension: No sync functionality needed

  const selectedNote = selectedNoteId ? notes.find(n => n.id === selectedNoteId) || null : null;

  if (loading) {
    return (
      <div className="notes-page-loading">
        <p>Loading notes...</p>
      </div>
    );
  }

  return (
    <div className="notes-page">
      {/* Message Toast */}
      {message && (
        <div className={`toast-message toast-${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Full-width header */}
      <div className="notes-header-full">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <img 
            src={chrome.runtime.getURL(theme === 'light' ? 'branding/Think_OS_Full_Word_Mark-lightmode.svg' : 'branding/Think_OS_Full_Word_Mark.svg')} 
            alt="Think OS" 
            style={{ height: '20px' }} 
          />
          <h2 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 'normal', lineHeight: '1.5' }}>My Notes</h2>
        </div>
      </div>

      {/* Two-pane layout */}
      <div className="notes-layout">
        <NotesSidebar
          notes={filteredNotes}
          selectedNoteId={selectedNoteId}
          searchQuery={searchQuery}
          sortBy={sortBy}
          onSearchChange={setSearchQuery}
          onSortChange={setSortBy}
          onNoteSelect={handleNoteSelect}
          onOpenSettings={openSettings}
        />

        <NoteDetailViewer
          note={selectedNote}
          onDelete={handleDelete}
          deleting={deletingNoteId === selectedNoteId}
          onSendToChat={handleOpenConversation}
          onNoteUpdate={handleNoteUpdate}
        />
      </div>
    </div>
  );
}

// Render the notes page
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<NotesPage />);
}
