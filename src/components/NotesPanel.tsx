import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Trash2, ExternalLink, Calendar, Tag, Expand } from 'lucide-react';
import { getAllNotes, deleteNote } from '../lib/local-notes';
import type { LocalNote } from '../lib/types';
import { formatRelativeDate } from '../lib/date-utils';
import { truncateText } from '../lib/text-utils';

export function NotesPanel() {
  const [notes, setNotes] = useState<LocalNote[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  // Load notes on mount
  useEffect(() => {
    loadNotes();
  }, []);

  // Filter notes using useMemo for better performance
  const filteredNotes = useMemo(() => {
    let filtered = notes;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = notes.filter((note) =>
        note.title.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query) ||
        note.domain.toLowerCase().includes(query) ||
        (note.reason && note.reason.toLowerCase().includes(query))
      );
    }

    // Apply tag filter
    if (selectedTag) {
      filtered = filtered.filter((note) =>
        Array.isArray(note.pluginData?.['tag-generator']) &&
        note.pluginData['tag-generator'].includes(selectedTag)
      );
    }

    return filtered;
  }, [searchQuery, selectedTag, notes]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const allNotes = await getAllNotes();
      setNotes(allNotes);

      // Extract all unique tags from plugin data
      const tagsSet = new Set<string>();
      allNotes.forEach((note) => {
        const tags = note.pluginData?.['tag-generator'];
        if (Array.isArray(tags)) {
          tags.forEach((tag: string) => tagsSet.add(tag));
        }
      });
      setAllTags(Array.from(tagsSet).sort());
    } catch (error) {
      console.error('[NotesPanel] Failed to load notes:', error);
    } finally {
      setLoading(false);
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
        // Remove from state (filteredNotes will update automatically via useMemo)
        setNotes((prev) => prev.filter((n) => n.id !== noteId));

        // Close expanded card if it was the deleted note
        if (expandedNoteId === noteId) {
          setExpandedNoteId(null);
        }
      }
    } catch (error) {
      console.error('[NotesPanel] Failed to delete note:', error);
      alert('Failed to delete note. Please try again.');
    } finally {
      setDeletingNoteId(null);
    }
  };

  const toggleExpanded = (noteId: string) => {
    setExpandedNoteId((prev) => (prev === noteId ? null : noteId));
  };

  const openFullPage = () => {
    chrome.tabs.create({
      url: chrome.runtime.getURL('src/notes/notes.html'),
    });
  };

  return (
    <div className="notes-panel">
      {/* Header */}
      <div className="notes-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>Saved Notes</h1>
            <p className="notes-count">
              {filteredNotes.length} {filteredNotes.length === 1 ? 'note' : 'notes'}
              {searchQuery && ` matching "${searchQuery}"`}
            </p>
          </div>
          <button
            onClick={openFullPage}
            className="btn btn-accent btn-sm flex items-center gap-2"
            title="Open notes in full page"
          >
            <Expand size={18} />
            Full View
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="search-bar">
        <Search size={18} className="search-icon" />
        <input
          type="text"
          placeholder="Search notes by title, content, domain..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="search-clear"
            title="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {/* Tag Filter Bar */}
      {allTags.length > 0 && (
        <div className="tag-filter-bar">
          <div className="tag-filter-label">
            <Tag size={14} />
            Filter by tag:
          </div>
          <div className="tag-filter-pills">
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`tag-pill ${selectedTag === tag ? 'active' : ''}`}
              >
                {tag}
              </button>
            ))}
          </div>
          {selectedTag && (
            <button
              onClick={() => setSelectedTag(null)}
              className="tag-filter-clear"
              title="Clear tag filter"
            >
              Clear filter
            </button>
          )}
        </div>
      )}

      {/* Notes List */}
      <div className="notes-list">
        {loading ? (
          <div className="notes-empty">
            <p>Loading notes...</p>
          </div>
        ) : filteredNotes.length === 0 && searchQuery ? (
          <div className="notes-empty">
            <p>No notes found</p>
            <p className="notes-empty-hint">
              Try a different search term or{' '}
              <button
                onClick={() => setSearchQuery('')}
                className="link-button"
              >
                clear search
              </button>
            </p>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="notes-empty">
            <p>No notes yet</p>
            <p className="notes-empty-hint">
              Save your first note by clicking "Save as Note" while browsing any webpage
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {filteredNotes.map((note) => {
              const isExpanded = expandedNoteId === note.id;
              const isDeleting = deletingNoteId === note.id;

              return (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`note-card ${isExpanded ? 'expanded' : ''}`}
                >
                  {/* Note Header - Always Visible */}
                  <div
                    className="note-card-header"
                    onClick={() => toggleExpanded(note.id)}
                  >
                    <div className="note-card-title-row">
                      <h3 className="note-card-title">{note.title}</h3>
                      <span className="note-card-date">
                        <Calendar size={14} />
                        {formatRelativeDate(note.updatedAt)}
                      </span>
                    </div>

                    <div className="note-card-meta">
                      <span className="note-card-domain">{note.domain}</span>
                      {note.reason && (
                        <span className="note-card-reason" title={note.reason}>
                          <Tag size={14} />
                          {truncateText(note.reason, 50)}
                        </span>
                      )}
                    </div>

                    {note.pluginData?.['tag-generator'] && Array.isArray(note.pluginData['tag-generator']) && note.pluginData['tag-generator'].length > 0 && (
                      <div className="note-card-tags">
                        {note.pluginData['tag-generator'].map((tag: string) => (
                          <span
                            key={tag}
                            className="note-tag-badge"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTag(tag);
                            }}
                            title={`Filter by ${tag}`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {!isExpanded && (
                      <p className="note-card-preview">
                        {note.pluginData?.['summary-generator'] || truncateText(note.content, 120)}
                      </p>
                    )}
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="note-card-body"
                    >
                      {note.reason && (
                        <div className="note-reason-full">
                          <strong>Why saved:</strong> {note.reason}
                        </div>
                      )}

                      <div className="note-content">
                        {note.content}
                      </div>

                      <div className="note-card-actions">
                        <a
                          href={note.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-secondary btn-sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink size={16} />
                          Open Original
                        </a>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(note.id, note.title);
                          }}
                          disabled={isDeleting}
                          className="btn btn-danger btn-sm"
                        >
                          <Trash2 size={16} />
                          {isDeleting ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
