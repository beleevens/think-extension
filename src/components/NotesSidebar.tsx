import { Search, Calendar, ExternalLink } from 'lucide-react';
import type { LocalNote } from '../lib/types';
import { formatRelativeDate } from '../lib/date-utils';
import { truncateText } from '../lib/text-utils';

type SortBy = 'date-desc' | 'date-asc' | 'title-asc' | 'title-desc' | 'domain';

interface NotesSidebarProps {
  notes: LocalNote[];
  selectedNoteId: string | null;
  searchQuery: string;
  sortBy: SortBy;
  onSearchChange: (query: string) => void;
  onSortChange: (sort: SortBy) => void;
  onNoteSelect: (noteId: string) => void;
  onOpenSettings: () => void;
}

export function NotesSidebar({
  notes,
  selectedNoteId,
  searchQuery,
  sortBy,
  onSearchChange,
  onSortChange,
  onNoteSelect,
  onOpenSettings,
}: NotesSidebarProps) {
  return (
    <div className="notes-sidebar">
      {/* Search and Sort */}
      <div className="sidebar-controls">
        <div className="search-container">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="search-clear"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as SortBy)}
          className="sort-select"
        >
          <option value="date-desc">Newest First</option>
          <option value="date-asc">Oldest First</option>
          <option value="title-asc">Title A-Z</option>
          <option value="title-desc">Title Z-A</option>
          <option value="domain">Domain</option>
        </select>
      </div>

      {/* Notes Count */}
      <div className="sidebar-count">
        {notes.length} {notes.length === 1 ? 'note' : 'notes'}
        {searchQuery && ` matching "${searchQuery}"`}
      </div>

      {/* Notes List */}
      <div className="sidebar-notes-list">
        {notes.length === 0 && searchQuery ? (
          <div className="sidebar-empty">
            <p>No notes found</p>
            <p className="hint">Try a different search term</p>
          </div>
        ) : notes.length === 0 ? (
          <div className="sidebar-empty">
            <p>No notes yet</p>
            <p className="hint">Save your first note while browsing</p>
          </div>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              onClick={() => onNoteSelect(note.id)}
              className={`sidebar-note-card ${selectedNoteId === note.id ? 'selected' : ''}`}
            >
              <div className="note-card-header">
                <h3 className="note-card-title">{note.title}</h3>
                <span className="note-card-date">
                  <Calendar size={14} />
                  {formatRelativeDate(note.updatedAt)}
                </span>
              </div>

              <div className="note-card-domain">
                <ExternalLink size={14} />
                {note.domain}
              </div>

              <p className="note-card-preview">
                {note.pluginData?.['summary-generator'] || truncateText(note.content, 80)}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
