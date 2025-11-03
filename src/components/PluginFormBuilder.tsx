/**
 * Plugin Form Builder
 * Visual form for creating custom config plugins without writing JSON
 */

import { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, Download, Save } from 'lucide-react';
import type { ConfigPlugin } from '../plugins/plugin-types';
import { pluginManager } from '../plugins/registry';
import { validateConfigPlugin } from '../lib/plugin-validation';
import '../plugins/plugins.css';

interface PluginFormBuilderProps {
  onCancel: () => void;
  onSave: (plugin: ConfigPlugin) => void;
  initialPlugin?: ConfigPlugin;
}

interface BlockInput {
  id: string;  // Required for block chaining
  name: string;
  prompt: string;
}

export function PluginFormBuilder({ onCancel, onSave, initialPlugin }: PluginFormBuilderProps) {
  // Basic info
  const [name, setName] = useState(initialPlugin?.name || '');
  const [description, setDescription] = useState(initialPlugin?.description || '');
  const [icon, setIcon] = useState(initialPlugin?.icon || '🔌');

  // Behavior
  const [outputType, setOutputType] = useState<'text' | 'tags' | 'blocks'>(initialPlugin?.outputType || 'text');
  const [prompt, setPrompt] = useState(initialPlugin?.prompt || '');

  // Display
  const [position, setPosition] = useState<'header' | 'tab'>(initialPlugin?.display.position || 'header');
  const [tabName, setTabName] = useState(initialPlugin?.display.tabName || '');

  // Blocks (for blocks type)
  const [blocks, setBlocks] = useState<BlockInput[]>(
    initialPlugin?.blocks?.map(b => ({ id: b.id, name: b.name, prompt: b.prompt })) || [{ id: crypto.randomUUID(), name: '', prompt: '' }]
  );

  // Global variables (loaded from storage, read-only in this component)
  const [globalVariableIds, setGlobalVariableIds] = useState<string[]>([]);

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [activePromptField, setActivePromptField] = useState<'main' | number | null>(null);

  // Refs for textarea insertion
  const mainPromptRef = useRef<HTMLTextAreaElement>(null);
  const blockPromptRefs = useRef<Map<number, HTMLTextAreaElement>>(new Map());

  // Available plugins for variable suggestions
  const [availablePlugins, setAvailablePlugins] = useState<Array<{ id: string; name: string }>>([]);

  // Load available plugins and global variables
  useEffect(() => {
    const plugins = pluginManager.getAll();
    setAvailablePlugins(plugins.map(p => ({ id: p.id, name: p.name })));

    // Load global variables
    chrome.storage.local.get('staticVariables').then((result) => {
      const variables = result.staticVariables || [];
      setGlobalVariableIds(variables.map((v: any) => v.id));
    });
  }, []);

  // Auto-generate ID from name (or use existing ID if editing)
  const generateId = (pluginName: string): string => {
    return pluginName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const pluginId = initialPlugin?.id || generateId(name);

  // Insert variable at cursor position
  const insertVariable = (variable: string, fieldType: 'main' | number) => {
    const textarea = fieldType === 'main'
      ? mainPromptRef.current
      : blockPromptRefs.current.get(fieldType);

    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end);
    const newText = before + variable + after;

    if (fieldType === 'main') {
      setPrompt(newText);
    } else {
      const newBlocks = [...blocks];
      newBlocks[fieldType].prompt = newText;
      setBlocks(newBlocks);
    }

    // Restore focus and cursor position
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + variable.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // Add block
  const addBlock = () => {
    setBlocks([...blocks, { id: crypto.randomUUID(), name: '', prompt: '' }]);
  };

  // Remove block
  const removeBlock = (index: number) => {
    if (blocks.length === 1) {
      setError('Blocks type requires at least one block');
      return;
    }
    const newBlocks = blocks.filter((_, i) => i !== index);
    setBlocks(newBlocks);
  };

  // Update block
  const updateBlock = (index: number, field: 'name' | 'prompt', value: string) => {
    const newBlocks = [...blocks];
    newBlocks[index][field] = value;
    setBlocks(newBlocks);
  };


  // Validate form
  const validate = (): string | null => {
    const plugin = buildPlugin();
    const validation = validateConfigPlugin(plugin);
    return validation.valid ? null : validation.error!;
  };

  // Build plugin object
  const buildPlugin = (): ConfigPlugin => {
    const plugin: ConfigPlugin = {
      type: 'config',
      id: pluginId,
      name: name.trim(),
      description: description.trim(),
      icon: icon || '🔌',
      prompt: outputType === 'blocks' ? '' : prompt.trim(),
      outputType,
      display: {
        dataSource: pluginId,
        position,
        format: outputType,
        ...(position === 'tab' && { tabName: tabName.trim() }),
      },
    };

    // Add blocks
    if (outputType === 'blocks') {
      plugin.blocks = blocks.map(b => ({
        id: b.id,  // IDs are always generated when blocks are created
        name: b.name.trim(),
        prompt: b.prompt.trim(),
      }));
    }

    return plugin;
  };

  // Handle save
  const handleSave = async () => {
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    // Check for ID collision when creating new plugin
    if (!initialPlugin) {
      try {
        const result = await chrome.storage.local.get('configPlugins');
        const existing = (result.configPlugins || []) as ConfigPlugin[];
        const duplicate = existing.find(p => p.id === pluginId);

        if (duplicate) {
          setError(`A plugin with ID "${pluginId}" already exists. Please use a different name.`);
          return;
        }
      } catch (error) {
        console.error('Failed to check for duplicate plugin ID:', error);
        setError('Failed to validate plugin ID. Please try again.');
        return;
      }
    }

    const plugin = buildPlugin();
    onSave(plugin);
  };

  // Handle download JSON
  const handleDownload = () => {
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const plugin = buildPlugin();
    const blob = new Blob([JSON.stringify(plugin, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${plugin.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="form-builder-container">
      <div className="form-builder-header">
        <h2 className="form-builder-title">
          {initialPlugin ? 'Edit Custom Plugin' : 'Create Custom Plugin'}
        </h2>
        <p className="form-builder-subtitle">
          Build a custom plugin using a visual form. Click variable chips to insert them into prompts.
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="form-builder-error">
          {error}
        </div>
      )}

      {/* Basic Info */}
      <section className="form-builder-section">
        <h3 className="form-builder-section-title">
          Basic Information
        </h3>

        <div className="plugin-form-group">
          <label className="plugin-form-label">Plugin Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Key Insights Extractor"
            className="plugin-form-input"
            disabled={!!initialPlugin}
          />
          {pluginId && (
            <p className="plugin-form-hint">ID: {pluginId}</p>
          )}
          {initialPlugin && (
            <p className="plugin-form-hint" style={{ color: 'hsl(var(--muted-foreground))' }}>
              Plugin name cannot be changed when editing (ID: {pluginId})
            </p>
          )}
        </div>

        <div className="plugin-form-group">
          <label className="plugin-form-label">Description *</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this plugin does..."
            className="plugin-form-textarea"
            rows={3}
          />
        </div>

        <div className="plugin-form-group">
          <label className="plugin-form-label">Icon (emoji)</label>
          <input
            type="text"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            placeholder="🔌"
            className="plugin-form-input"
            style={{ width: '100px' }}
            maxLength={2}
          />
        </div>
      </section>

      {/* Behavior */}
      <section className="form-builder-section">
        <h3 className="form-builder-section-title">
          Plugin Behavior
        </h3>

        <div className="plugin-form-group">
          <label className="plugin-form-label">Output Type *</label>
          <div className="form-builder-radio-group">
            <label className="form-builder-radio-label">
              <input
                type="radio"
                value="text"
                checked={outputType === 'text'}
                onChange={(e) => setOutputType(e.target.value as any)}
              />
              <span>Text</span>
            </label>
            <label className="form-builder-radio-label">
              <input
                type="radio"
                value="tags"
                checked={outputType === 'tags'}
                onChange={(e) => setOutputType(e.target.value as any)}
              />
              <span>Tags</span>
            </label>
            <label className="form-builder-radio-label">
              <input
                type="radio"
                value="blocks"
                checked={outputType === 'blocks'}
                onChange={(e) => setOutputType(e.target.value as any)}
              />
              <span>Blocks</span>
            </label>
          </div>
          <p className="plugin-form-hint">
            Text: Single paragraph/summary • Tags: Array of keywords • Blocks: Multiple named sections
          </p>
        </div>

        {outputType !== 'blocks' && (
          <div className="plugin-form-group">
            <label className="plugin-form-label">Prompt Template *</label>
            <div className="form-builder-prompt-container">
              <textarea
                ref={mainPromptRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onFocus={() => setActivePromptField('main')}
                placeholder="Your prompt here... Click variable chips below to insert them."
                className="plugin-form-textarea form-builder-prompt-textarea"
                rows={8}
              />
              <VariableHelper
                onInsert={(variable) => insertVariable(variable, 'main')}
                availablePlugins={availablePlugins}
                variableIds={globalVariableIds}
                active={activePromptField === 'main'}
                currentPlugin={{ id: pluginId, outputType, savedBlocks: initialPlugin?.blocks }}
                currentBlockIndex={undefined}
                currentBlocks={blocks}
              />
            </div>
          </div>
        )}
      </section>

      {/* Blocks Section */}
      {outputType === 'blocks' && (
        <section className="form-builder-section">
          <div className="form-builder-section-header">
            <h3>Blocks</h3>
            <button
              onClick={addBlock}
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Plus size={16} />
              Add Block
            </button>
          </div>

          <div className="plugin-blocks-list">
            {blocks.map((block, index) => (
              <div key={index} className="plugin-block-card">
                <div className="plugin-block-header">
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 500, margin: 0 }}>
                    Block {index + 1}
                  </h4>
                  {blocks.length > 1 && (
                    <button
                      onClick={() => removeBlock(index)}
                      className="plugin-block-delete"
                      title="Remove block"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                <div className="plugin-form-group" style={{ marginTop: '1rem' }}>
                  <label className="plugin-form-label">Block Name *</label>
                  <input
                    type="text"
                    value={block.name}
                    onChange={(e) => updateBlock(index, 'name', e.target.value)}
                    placeholder="e.g., Key Insights"
                    className="plugin-form-input"
                  />
                </div>

                <div className="plugin-form-group">
                  <label className="plugin-form-label">Block Prompt *</label>
                  <div className="form-builder-prompt-container">
                    <textarea
                      ref={(el) => {
                        if (el) blockPromptRefs.current.set(index, el);
                      }}
                      value={block.prompt}
                      onChange={(e) => updateBlock(index, 'prompt', e.target.value)}
                      onFocus={() => setActivePromptField(index)}
                      placeholder="Prompt for this block..."
                      className="plugin-form-textarea form-builder-prompt-textarea"
                      rows={6}
                    />
                    <VariableHelper
                      onInsert={(variable) => insertVariable(variable, index)}
                      availablePlugins={availablePlugins}
                      variableIds={globalVariableIds}
                      active={activePromptField === index}
                      currentPlugin={{ id: pluginId, outputType, savedBlocks: initialPlugin?.blocks }}
                      currentBlockIndex={index}
                      currentBlocks={blocks}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Display Configuration */}
      <section className="form-builder-section">
        <h3 className="form-builder-section-title">
          Display Configuration
        </h3>

        <div className="plugin-form-group">
          <label className="plugin-form-label">Position *</label>
          <div className="form-builder-radio-group">
            <label className="form-builder-radio-label">
              <input
                type="radio"
                value="header"
                checked={position === 'header'}
                onChange={(e) => setPosition(e.target.value as any)}
              />
              <span>Header</span>
            </label>
            <label className="form-builder-radio-label">
              <input
                type="radio"
                value="tab"
                checked={position === 'tab'}
                onChange={(e) => setPosition(e.target.value as any)}
              />
              <span>Tab</span>
            </label>
          </div>
          <p className="plugin-form-hint">
            Header: Shows in note header • Tab: Shows in separate tab
          </p>
        </div>

        {position === 'tab' && (
          <div className="plugin-form-group">
            <label className="plugin-form-label">Tab Name *</label>
            <input
              type="text"
              value={tabName}
              onChange={(e) => setTabName(e.target.value)}
              placeholder="e.g., Insights"
              className="plugin-form-input"
            />
          </div>
        )}
      </section>

      {/* Actions */}
      <div className="form-builder-actions">
        <button
          onClick={handleSave}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Save size={16} />
          {initialPlugin ? 'Update Plugin' : 'Save Plugin'}
        </button>
        <button
          onClick={handleDownload}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Download size={16} />
          Download JSON
        </button>
        <button onClick={onCancel} className="btn btn-secondary">
          Cancel
        </button>
      </div>
    </div>
  );
}

/**
 * Variable Helper Panel
 * Shows clickable variable chips organized by category
 */
interface VariableHelperProps {
  onInsert: (variable: string) => void;
  availablePlugins: Array<{ id: string; name: string }>;
  variableIds: string[];
  active: boolean;
  currentPlugin?: {
    id: string;
    outputType: string;
    savedBlocks?: Array<{ id: string; name: string; prompt: string }>; // Blocks from saved plugin (with IDs - now required)
  };
  currentBlockIndex?: number; // Which block is being edited (undefined = main prompt)
  currentBlocks?: BlockInput[]; // Current blocks being edited in the form
}

function VariableHelper({ onInsert, availablePlugins, variableIds, active, currentPlugin, currentBlockIndex, currentBlocks }: VariableHelperProps) {
  const [accordionState, setAccordionState] = useState({
    staticVariables: false,
    noteData: false,
    appContext: false,
    pluginOutputs: false,
    blockOutputs: false,
  });

  const toggleAccordion = (section: keyof typeof accordionState) => {
    setAccordionState(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className={`variable-helper ${active ? 'active' : ''}`}>
      <div className="variable-helper-header">
        <h4 className="variable-helper-title">Variables</h4>
      </div>

      <div className="variable-helper-content">
        {/* Static Variables */}
        <div className="variable-category-accordion">
          <div
            className="variable-category-header"
            onClick={() => toggleAccordion('staticVariables')}
          >
            <span className="variable-category-title">Static Variables (Global)</span>
            {accordionState.staticVariables ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>
          {accordionState.staticVariables && (
            <div className="variable-category-content">
              {variableIds.length > 0 ? (
                <div className="variable-helper-chips">
                  {variableIds.map((id) => {
                    const variable = `{{${id}}}`;
                    return (
                      <button
                        key={id}
                        onClick={() => onInsert(variable)}
                        className="variable-chip"
                        title={`Global variable: ${id}`}
                      >
                        {variable}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="variable-category-empty">
                  No variables defined. Add variables in Settings → Variables section.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Note Data */}
        <div className="variable-category-accordion">
          <div
            className="variable-category-header"
            onClick={() => toggleAccordion('noteData')}
          >
            <span className="variable-category-title">Note Data</span>
            {accordionState.noteData ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>
          {accordionState.noteData && (
            <div className="variable-category-content">
              <div className="variable-helper-chips">
                {['{{title}}', '{{content}}', '{{url}}', '{{domain}}'].map((variable) => (
                  <button
                    key={variable}
                    onClick={() => onInsert(variable)}
                    className="variable-chip"
                  >
                    {variable}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* App Context */}
        <div className="variable-category-accordion">
          <div
            className="variable-category-header"
            onClick={() => toggleAccordion('appContext')}
          >
            <span className="variable-category-title">App Context</span>
            {accordionState.appContext ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>
          {accordionState.appContext && (
            <div className="variable-category-content">
              <div className="variable-helper-chips">
                {['{{existingTags}}', '{{noteCount}}'].map((variable) => (
                  <button
                    key={variable}
                    onClick={() => onInsert(variable)}
                    className="variable-chip"
                  >
                    {variable}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Available Plugins */}
        {availablePlugins.length > 0 && (
          <div className="variable-category-accordion">
            <div
              className="variable-category-header"
              onClick={() => toggleAccordion('pluginOutputs')}
            >
              <span className="variable-category-title">Plugin Outputs</span>
              {accordionState.pluginOutputs ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
            {accordionState.pluginOutputs && (
              <div className="variable-category-content">
                <div className="variable-helper-chips">
                  {availablePlugins.map((plugin) => {
                    const variable = `{{plugins.${plugin.id}}}`;
                    return (
                      <button
                        key={plugin.id}
                        onClick={() => onInsert(variable)}
                        className="variable-chip plugin"
                        title={plugin.name}
                      >
                        {variable}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Block Outputs (This Plugin) */}
        {currentPlugin && currentPlugin.outputType === 'blocks' && (currentBlocks || currentPlugin.savedBlocks) && (
          <div className="variable-category-accordion">
            <div
              className="variable-category-header"
              onClick={() => toggleAccordion('blockOutputs')}
            >
              <span className="variable-category-title">Block Outputs (This Plugin)</span>
              {accordionState.blockOutputs ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
            {accordionState.blockOutputs && (
              <div className="variable-category-content">
                {(() => {
                  // Use currentBlocks (live form state) if available, otherwise use savedBlocks
                  const blocksToShow = (currentBlocks || currentPlugin.savedBlocks || [])
                    .map((block, index) => ({ block, index }))
                    .filter(({ block, index }) => {
                      // Only show blocks that have IDs
                      if (!block.id) return false;
                      // Only show blocks that come before the current block being edited
                      if (currentBlockIndex !== undefined && index >= currentBlockIndex) return false;
                      return true;
                    });

                  if (blocksToShow.length === 0) {
                    return (
                      <p className="variable-category-empty">
                        {currentBlockIndex === 0
                          ? "This is the first block. No prior blocks available."
                          : "No prior blocks available with saved names yet."}
                      </p>
                    );
                  }

                  return (
                    <div className="variable-helper-chips">
                      {blocksToShow.map(({ block, index }) => {
                        const blockId = block.id!;
                        const variable = `{{blocks.${blockId}}}`;
                        const displayName = block.name.trim() || `Block ${index + 1}`;
                        return (
                          <button
                            key={blockId}
                            onClick={() => onInsert(variable)}
                            className="variable-chip block"
                            title={`Block output: ${displayName}\nID: ${blockId}\nSyntax: ${variable}`}
                          >
                            {displayName}
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        <p className="variable-helper-footer">
          Click to insert at cursor
        </p>
      </div>
    </div>
  );
}
