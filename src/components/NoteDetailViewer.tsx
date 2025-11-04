import { ExternalLink, Calendar, Globe, MessageSquare, Sparkles, Loader2, Undo2, Trash2 } from 'lucide-react';
import type { LocalNote } from '../lib/types';
import type { Plugin, DisplayRule } from '../plugins/plugin-types';
import { markdownToHtml } from '../lib/markdown';
import { formatFullDate, formatRelativeDateLong } from '../lib/date-utils';
import { useState, useEffect } from 'react';
import { cleanupContent } from '../lib/content-cleanup';
import { updateNoteContent } from '../lib/local-notes';
import { DisplayRenderer } from './DisplayRenderer';
import { pluginManager } from '../plugins/registry';

interface NoteDetailViewerProps {
  note: LocalNote | null;
  onDelete: (noteId: string, noteTitle: string) => void;
  deleting: boolean;
  onSendToChat?: (note: LocalNote) => void;
  onNoteUpdate?: (updatedNote: LocalNote) => void;
}

interface PluginDisplay {
  pluginId: string;
  pluginName: string;
  display: DisplayRule;
  data: any;
  plugin: Plugin;
}

export function NoteDetailViewer({ note, onDelete, deleting, onSendToChat, onNoteUpdate }: NoteDetailViewerProps) {
  const [headerDisplays, setHeaderDisplays] = useState<PluginDisplay[]>([]);
  const [tabDisplays, setTabDisplays] = useState<PluginDisplay[]>([]);
  const [activeTab, setActiveTab] = useState<string>('original');
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [cleanupError, setCleanupError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    // Load plugin displays from registered plugins
    const loadPluginDisplays = () => {
      if (!note?.pluginData) {
        setHeaderDisplays([]);
        setTabDisplays([]);
        return;
      }

      const allPlugins = pluginManager.getAll();
      const headerItems: PluginDisplay[] = [];
      const tabItems: PluginDisplay[] = [];

      for (const plugin of allPlugins) {
        const data = note.pluginData[plugin.id];
        if (!data) continue;

        const display: PluginDisplay = {
          pluginId: plugin.id,
          pluginName: plugin.name,
          display: plugin.display,
          data,
          plugin,
        };

        if (plugin.display.position === 'header') {
          headerItems.push(display);
        } else if (plugin.display.position === 'tab') {
          tabItems.push(display);
        }
      }

      setHeaderDisplays(headerItems);
      setTabDisplays(tabItems);
    };

    // Check if API key is configured
    const checkApiKey = async () => {
      try {
        const result = await chrome.storage.local.get(['activeProvider', 'veniceApiKey', 'claudeApiKey']);
        const provider = result.activeProvider || 'venice';
        const apiKey = provider === 'venice' ? result.veniceApiKey : result.claudeApiKey;
        setHasApiKey(!!apiKey);
      } catch (error) {
        console.error('Failed to check API key:', error);
        setHasApiKey(false);
      }
    };

    loadPluginDisplays();
    checkApiKey();
  }, [note]);

  // Reset to original tab and clear cleanup error when note changes
  useEffect(() => {
    setActiveTab('original');
    setCleanupError(null);
    setIsCleaningUp(false);
  }, [note?.id]);

  const handleCleanup = async () => {
    if (!note) return;

    setIsCleaningUp(true);
    setCleanupError(null);

    try {
      // Call the cleanup function
      const result = await cleanupContent(note.content);

      if (result.error) {
        setCleanupError(result.error);
        setIsCleaningUp(false);
        return;
      }

      // Update the note with cleaned content, storing original for undo
      const updatedNote = await updateNoteContent(
        note.id,
        result.cleanedContent,
        note.content // Store current content as original
      );

      if (updatedNote && onNoteUpdate) {
        onNoteUpdate(updatedNote);
      }

      setIsCleaningUp(false);
    } catch (error) {
      console.error('[NoteDetailViewer] Cleanup failed:', error);
      setCleanupError(error instanceof Error ? error.message : 'Cleanup failed');
      setIsCleaningUp(false);
    }
  };

  const handleUndoCleanup = async () => {
    if (!note || !note.originalContent) return;

    setIsCleaningUp(true);
    setCleanupError(null);

    try {
      // Restore original content and clear the backup
      const updatedNote = await updateNoteContent(
        note.id,
        note.originalContent,
        undefined // Clear originalContent
      );

      if (updatedNote && onNoteUpdate) {
        onNoteUpdate(updatedNote);
      }

      setIsCleaningUp(false);
    } catch (error) {
      console.error('[NoteDetailViewer] Undo cleanup failed:', error);
      setCleanupError(error instanceof Error ? error.message : 'Undo failed');
      setIsCleaningUp(false);
    }
  };

  if (!note) {
    return (
      <div className="note-detail-empty">
        <div className="empty-icon">📝</div>
        <h2>No note selected</h2>
        <p>Select a note from the sidebar to view its content</p>
      </div>
    );
  }

  return (
    <div className="note-detail-viewer">
      {/* OG Image */}
      {note.ogImage && (
        <div 
          className="note-detail-image"
          style={{
            '--hero-bg-image': `url(${note.ogImage})`
          } as React.CSSProperties}
        >
          <img
            src={note.ogImage}
            alt={note.title}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}

      {/* Header */}
      <div className="note-detail-header">
        <h1 className="note-detail-title">{note.title}</h1>

        {/* Metadata */}
        <div className="note-detail-meta">
          <div className="meta-item">
            <Globe size={14} />
            <a
              href={note.url}
              target="_blank"
              rel="noopener noreferrer"
              className="meta-link"
            >
              {note.domain}
            </a>
          </div>
          <div className="meta-item">
            <Calendar size={14} />
            <span title={formatFullDate(note.updatedAt)}>
              {formatRelativeDateLong(note.updatedAt)}
            </span>
          </div>
        </div>

        {/* Dynamic Plugin Header Displays */}
        {headerDisplays.map(item => (
          <DisplayRenderer
            key={item.pluginId}
            display={item.display}
            data={item.data}
            pluginName={item.pluginName}
            position="header"
            plugin={item.plugin}
          />
        ))}

        {/* Action Buttons */}
        <div className="note-detail-header-actions">
          <a
            href={note.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            <ExternalLink size={16} />
            Open Original Page
          </a>
          {onSendToChat && (
            <button
              onClick={() => onSendToChat(note)}
              className="btn btn-secondary"
            >
              <MessageSquare size={16} />
              Open Conversation
            </button>
          )}
          <button
            onClick={() => onDelete(note.id, note.title)}
            disabled={deleting}
            className="btn btn-danger"
          >
            <Trash2 size={16} />
            {deleting ? 'Deleting...' : 'Delete Note'}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="note-tabs">
        <button
          onClick={() => setActiveTab('original')}
          className={activeTab === 'original' ? 'active' : ''}
        >
          Original
        </button>
        {/* Dynamic Plugin Tabs */}
        {tabDisplays.map(item => (
          <button
            key={item.pluginId}
            onClick={() => setActiveTab(item.pluginId)}
            className={activeTab === item.pluginId ? 'active' : ''}
          >
            {item.display.tabName || item.pluginName}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="note-tab-content">
        {activeTab === 'original' && (
          <>
            {/* Cleanup Button - shown above original content */}
            <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid hsl(var(--border))' }}>
              {note.originalContent ? (
                // Show Undo button if content has been cleaned
                <button
                  onClick={handleUndoCleanup}
                  disabled={isCleaningUp}
                  className="btn btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  {isCleaningUp ? (
                    <>
                      <Loader2 size={16} className="spin" />
                      Restoring...
                    </>
                  ) : (
                    <>
                      <Undo2 size={16} />
                      Undo Cleanup
                    </>
                  )}
                </button>
              ) : (
                // Show Cleanup button if content hasn't been cleaned
                <button
                  onClick={handleCleanup}
                  disabled={isCleaningUp || !hasApiKey}
                  className="btn btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  title={hasApiKey ? "Remove artifacts, navigation, ads, and noise using AI" : "Configure API key in settings to use cleanup"}
                >
                  {isCleaningUp ? (
                    <>
                      <Loader2 size={16} className="spin" />
                      Cleaning...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      Cleanup Content
                    </>
                  )}
                </button>
              )}
              {!hasApiKey && !note.originalContent && (
                <p style={{
                  marginTop: '0.5rem',
                  fontSize: '0.875rem',
                  color: 'hsl(var(--muted-foreground))',
                  fontStyle: 'italic'
                }}>
                  Configure your API key in{' '}
                  <a
                    href={chrome.runtime.getURL('src/settings/settings.html')}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'hsl(var(--primary))', textDecoration: 'underline' }}
                  >
                    settings
                  </a>
                  {' '}to use AI cleanup
                </p>
              )}
              {cleanupError && (
                <div style={{
                  marginTop: '0.5rem',
                  padding: '0.5rem',
                  backgroundColor: 'hsl(var(--destructive) / 0.1)',
                  color: 'hsl(var(--destructive))',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}>
                  {cleanupError}
                </div>
              )}
            </div>

            {/* Original Content */}
            <div
              className="markdown-content"
              dangerouslySetInnerHTML={{
                __html: markdownToHtml(note.content)
              }}
            />
          </>
        )}

        {/* Dynamic Plugin Tab Content */}
        {tabDisplays.map(item => {
          if (activeTab !== item.pluginId) return null;
          return (
            <DisplayRenderer
              key={item.pluginId}
              display={item.display}
              data={item.data}
              pluginName={item.pluginName}
              position="tab"
              plugin={item.plugin}
            />
          );
        })}
      </div>
    </div>
  );
}
