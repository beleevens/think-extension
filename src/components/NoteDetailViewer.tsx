import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Globe, Sparkles, Loader2, Undo2, Trash2 } from 'lucide-react';
import type { LocalNote } from '../lib/types';
import type { Plugin, DisplayRule } from '../plugins/plugin-types';
import { markdownToHtml } from '../lib/markdown';
import { formatFullDate, formatRelativeDateLong } from '../lib/date-utils';
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
  const [heroImageError, setHeroImageError] = useState(false);
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 });
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const originalTabRef = useRef<HTMLButtonElement>(null);
  const tabRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

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
    setHeroImageError(false); // Reset hero image error when note changes
  }, [note?.id]);

  // Update indicator position when active tab changes
  useEffect(() => {
    const updateIndicator = () => {
      let activeTabElement: HTMLButtonElement | null = null;
      if (activeTab === 'original') {
        activeTabElement = originalTabRef.current;
      } else {
        activeTabElement = tabRefs.current[activeTab] || null;
      }

      const container = tabsContainerRef.current;
      if (activeTabElement && container) {
        const tabRect = activeTabElement.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        setIndicatorStyle({
          left: tabRect.left - containerRect.left,
          width: tabRect.width,
        });
      }
    };

    updateIndicator();
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [activeTab, tabDisplays]);

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
        <h2>No memory selected</h2>
        <p>Select a memory from the sidebar to view its content</p>
      </div>
    );
  }

  const heroImage = note.ogImage;

  return (
    <div className="note-detail-viewer">
      {/* Hero Image - only show if ogImage exists and hasn't errored */}
      {heroImage && !heroImageError && (
        <div 
          className="note-detail-image"
          style={{
            '--hero-bg-image': `url(${heroImage})`
          } as React.CSSProperties}
        >
          <img
            src={heroImage}
            alt={note.title}
            onError={() => {
              setHeroImageError(true);
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
              {note.domain.replace(/^www\./i, '')}
            </a>
          </div>
          <div className="meta-item">
            <Calendar size={14} />
            <span title={formatFullDate(note.updatedAt)}>
              {formatRelativeDateLong(note.updatedAt)}
            </span>
          </div>
          <div className="meta-item">
            <Trash2 size={14} />
            <button
              onClick={() => onDelete(note.id, note.title)}
              disabled={deleting}
              className="meta-link meta-link-button"
              style={{ background: 'none', border: 'none', padding: 0, cursor: deleting ? 'not-allowed' : 'pointer' }}
            >
              {deleting ? 'Deleting...' : 'Delete Memory'}
            </button>
          </div>
        </div>

        {/* Dynamic Plugin Header Displays (non-tags) */}
        {headerDisplays
          .filter(item => item.display.format !== 'tags')
          .map(item => (
            <DisplayRenderer
              key={item.pluginId}
              display={item.display}
              data={item.data}
              pluginName={item.pluginName}
              position="header"
              plugin={item.plugin}
            />
          ))}
      </div>

      {/* Tab Navigation */}
      <div className="note-tabs-container" ref={tabsContainerRef}>
        <div className="note-tabs">
          <button
            ref={originalTabRef}
            onClick={() => setActiveTab('original')}
            className={`note-tab ${activeTab === 'original' ? 'note-tab-active' : ''}`}
            role="tab"
            aria-selected={activeTab === 'original'}
          >
            Original
          </button>
          {/* Dynamic Plugin Tabs */}
          {tabDisplays.map(item => (
            <button
              key={item.pluginId}
              ref={(el) => {
                tabRefs.current[item.pluginId] = el;
              }}
              onClick={() => setActiveTab(item.pluginId)}
              className={`note-tab ${activeTab === item.pluginId ? 'note-tab-active' : ''}`}
              role="tab"
              aria-selected={activeTab === item.pluginId}
            >
              {item.display.tabName || item.pluginName}
            </button>
          ))}
        </div>
        <div className="note-tab-indicator" style={{ left: `${indicatorStyle.left}px`, width: `${indicatorStyle.width}px` }}></div>
        {activeTab === 'original' && (
          <div className="note-tabs-right">
            {note.originalContent ? (
              // Show Undo button if content has been cleaned
              <div className="meta-item" style={{ display: 'inline-flex' }}>
                {isCleaningUp ? (
                  <>
                    <Loader2 size={14} className="spin" />
                    <button
                      onClick={handleUndoCleanup}
                      disabled={isCleaningUp}
                      className="meta-link meta-link-button"
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                    >
                      Restoring...
                    </button>
                  </>
                ) : (
                  <>
                    <Undo2 size={14} />
                    <button
                      onClick={handleUndoCleanup}
                      disabled={isCleaningUp}
                      className="meta-link meta-link-button"
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                    >
                      Undo Cleanup
                    </button>
                  </>
                )}
              </div>
            ) : (
              // Show Cleanup button if content hasn't been cleaned
              <div className="meta-item" style={{ display: 'inline-flex' }}>
                {isCleaningUp ? (
                  <>
                    <Loader2 size={14} className="spin" />
                    <button
                      onClick={handleCleanup}
                      disabled={isCleaningUp || !hasApiKey}
                      className="meta-link meta-link-button"
                      style={{ background: 'none', border: 'none', padding: 0, cursor: isCleaningUp || !hasApiKey ? 'not-allowed' : 'pointer' }}
                      title={hasApiKey ? "Remove artifacts, navigation, ads, and noise using AI" : "Configure API key in settings to use cleanup"}
                    >
                      Cleaning...
                    </button>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    <button
                      onClick={handleCleanup}
                      disabled={isCleaningUp || !hasApiKey}
                      className="meta-link meta-link-button"
                      style={{ background: 'none', border: 'none', padding: 0, cursor: isCleaningUp || !hasApiKey ? 'not-allowed' : 'pointer' }}
                      title={hasApiKey ? "Remove artifacts, navigation, ads, and noise using AI" : "Configure API key in settings to use cleanup"}
                    >
                      Cleanup Content
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tab Content */}
      <div className="note-tab-content">
        {activeTab === 'original' && (
          <>
            {!hasApiKey && !note.originalContent && (
              <p style={{
                marginBottom: '1rem',
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
                marginBottom: '1rem',
                padding: '0.5rem',
                backgroundColor: 'hsl(var(--destructive) / 0.1)',
                color: 'hsl(var(--destructive))',
                borderRadius: '0.375rem',
                fontSize: '0.875rem'
              }}>
                {cleanupError}
              </div>
            )}

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

        {/* Tags below tab content */}
        {headerDisplays
          .filter(item => item.display.format === 'tags')
          .map(item => (
            <DisplayRenderer
              key={item.pluginId}
              display={item.display}
              data={item.data}
              pluginName={item.pluginName}
              position="header"
              plugin={item.plugin}
            />
          ))}
      </div>
    </div>
  );
}
