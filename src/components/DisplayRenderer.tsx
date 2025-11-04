/**
 * DisplayRenderer Component
 * Renders plugin output based on display rules
 */

import { Tag, ChevronDown, ChevronRight } from 'lucide-react';
import type { DisplayRule, ConfigPlugin } from '../plugins/plugin-types';
import { markdownToHtml } from '../lib/markdown';
import { Component, type ReactNode, type ErrorInfo, useState } from 'react';

interface DisplayRendererProps {
  display: DisplayRule;
  data: any;
  pluginName?: string;  // For header title
  position?: 'header' | 'tab';  // Rendering position context
  plugin?: ConfigPlugin;  // Full plugin config (needed for blocks)
}

// Type guards for plugin outputs
function isTextOutput(output: any): output is string {
  return typeof output === 'string';
}

function isTagsOutput(output: any): output is string[] {
  return Array.isArray(output) && output.every(item => typeof item === 'string');
}

function isBlocksOutput(output: any): output is Record<string, string> {
  if (typeof output !== 'object' || output === null || Array.isArray(output)) {
    return false;
  }

  return Object.entries(output).every(([key, val]) =>
    typeof key === 'string' && typeof val === 'string'
  );
}

/**
 * Error Boundary for catching rendering errors in plugins
 */
class DisplayErrorBoundary extends Component<
  { children: ReactNode; pluginName: string; dataSource: string },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; pluginName: string; dataSource: string }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[DisplayRenderer] Error rendering plugin ${this.props.dataSource}:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '1rem',
          backgroundColor: 'hsl(var(--destructive) / 0.1)',
          border: '1px solid hsl(var(--destructive))',
          borderRadius: '0.375rem',
          marginTop: '1rem'
        }}>
          <p style={{ color: 'hsl(var(--destructive))', fontWeight: 500 }}>
            Failed to render plugin: {this.props.pluginName || this.props.dataSource}
          </p>
          <p style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))', marginTop: '0.5rem' }}>
            {this.state.error?.message || 'Unknown error'}
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * DisplayRenderer Component
 * Renders plugin output in the appropriate format
 */
function DisplayRendererInner({ display, data, pluginName, position = 'header', plugin }: DisplayRendererProps) {
  // Early return for invalid/missing data
  if (!data) return null;

  // Validate format matches data type
  if (display.format === 'tags' && !isTagsOutput(data)) return null;
  if (display.format === 'blocks' && !isBlocksOutput(data)) return null;
  if (display.format === 'text' && !isTextOutput(data)) return null;

  // Render tags format
  if (display.format === 'tags' && isTagsOutput(data) && data.length > 0) {
    return (
      <div className="meta-item meta-tags" style={{ display: 'flex', marginTop: '2rem' }}>
        <div className="tag-list">
          {data.map((tag, i) => (
            <span key={i} className="tag-badge">{tag}</span>
          ))}
        </div>
      </div>
    );
  }

  // Render text format
  if (display.format === 'text' && isTextOutput(data)) {
    // Tab position: Use same styling as original tab (markdown-content)
    if (position === 'tab') {
      return (
        <div
          className="markdown-content"
          dangerouslySetInnerHTML={{
            __html: markdownToHtml(data)
          }}
        />
      );
    }

    // Header position: Use summary styling with title and box
    return (
      <div className="note-detail-summary">
        <div
          className="summary-content"
          dangerouslySetInnerHTML={{
            __html: markdownToHtml(data)
          }}
        />
      </div>
    );
  }

  // Render blocks format (accordion style)
  if (display.format === 'blocks' && isBlocksOutput(data)) {
    return <BlocksAccordion data={data} plugin={plugin} />;
  }

  return null;
}

/**
 * Blocks Accordion Component
 * Renders blocks as collapsible accordion sections
 * Displays blocks in the order defined in the plugin (first block on top)
 */
function BlocksAccordion({ data, plugin }: { data: Record<string, string>; plugin?: ConfigPlugin }) {
  const [expandedBlocks, setExpandedBlocks] = useState<Record<string, boolean>>(() => {
    // Collapse all blocks by default
    const initial: Record<string, boolean> = {};
    Object.keys(data).forEach(blockId => {
      initial[blockId] = false;
    });
    return initial;
  });

  const toggleBlock = (blockId: string) => {
    setExpandedBlocks(prev => ({
      ...prev,
      [blockId]: !prev[blockId]
    }));
  };

  // If plugin blocks definition is not available, fall back to Object.entries
  // This should rarely happen for blocks format, but provides graceful degradation
  if (!plugin?.blocks || plugin.blocks.length === 0) {
    return (
      <div className="blocks-accordion" style={{ marginTop: '1rem' }}>
        {Object.entries(data).map(([blockId, content]) => {
          const isExpanded = expandedBlocks[blockId];
          const blockName = `Block ${blockId}`;

          return (
            <div
              key={blockId}
              className="accordion-block"
              style={{
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.5rem',
                marginBottom: '0.75rem',
                overflow: 'hidden',
              }}
            >
              <button
                onClick={() => toggleBlock(blockId)}
                className="accordion-header"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: 'hsl(var(--muted) / 0.3)',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.9375rem',
                  fontWeight: 500,
                  color: 'hsl(var(--foreground))',
                  textAlign: 'left',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'hsl(var(--muted) / 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'hsl(var(--muted) / 0.3)';
                }}
              >
                {isExpanded ? (
                  <ChevronDown size={16} style={{ flexShrink: 0 }} />
                ) : (
                  <ChevronRight size={16} style={{ flexShrink: 0 }} />
                )}
                <span>{blockName}</span>
              </button>

              {isExpanded && (
                <div
                  className="accordion-content markdown-content"
                  style={{
                    padding: '1rem',
                    backgroundColor: 'hsl(var(--background))',
                  }}
                  dangerouslySetInnerHTML={{
                    __html: markdownToHtml(content)
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Iterate over plugin.blocks array to maintain correct order (first block on top)
  return (
    <div className="blocks-accordion" style={{ marginTop: '1rem' }}>
      {plugin.blocks.map((block) => {
        const blockId = block.id;
        if (!blockId) return null; // Skip blocks without IDs

        const content = data[blockId];
        if (!content) return null; // Skip blocks with no content

        const isExpanded = expandedBlocks[blockId];
        const blockName = block.name;

        return (
          <div
            key={blockId}
            className="accordion-block"
            style={{
              border: '1px solid hsl(var(--border))',
              borderRadius: '0.5rem',
              marginBottom: '0.75rem',
              overflow: 'hidden',
            }}
          >
            <button
              onClick={() => toggleBlock(blockId)}
              className="accordion-header"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: 'hsl(var(--muted) / 0.3)',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.9375rem',
                fontWeight: 500,
                color: 'hsl(var(--foreground))',
                textAlign: 'left',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'hsl(var(--muted) / 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'hsl(var(--muted) / 0.3)';
              }}
            >
              {isExpanded ? (
                <ChevronDown size={16} style={{ flexShrink: 0 }} />
              ) : (
                <ChevronRight size={16} style={{ flexShrink: 0 }} />
              )}
              <span>{blockName}</span>
            </button>

            {isExpanded && (
              <div
                className="accordion-content markdown-content"
                style={{
                  padding: '1rem',
                  backgroundColor: 'hsl(var(--background))',
                }}
                dangerouslySetInnerHTML={{
                  __html: markdownToHtml(content)
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * DisplayRenderer with Error Boundary
 * Wraps the renderer to catch and handle rendering errors gracefully
 */
export function DisplayRenderer(props: DisplayRendererProps) {
  return (
    <DisplayErrorBoundary
      pluginName={props.pluginName || props.display.dataSource}
      dataSource={props.display.dataSource}
    >
      <DisplayRendererInner {...props} />
    </DisplayErrorBoundary>
  );
}
