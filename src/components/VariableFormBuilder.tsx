/**
 * Variable Form Builder
 * Form for creating/editing static variables
 */

import { useState } from 'react';
import { Save } from 'lucide-react';
import type { StaticVariable } from '../plugins/plugin-types';
import '../plugins/plugins.css';

interface VariableFormBuilderProps {
  onCancel: () => void;
  onSave: (variable: StaticVariable) => void;
  initialVariable?: StaticVariable;
}

export function VariableFormBuilder({ onCancel, onSave, initialVariable }: VariableFormBuilderProps) {
  const [id, setId] = useState(initialVariable?.id || '');
  const [title, setTitle] = useState(initialVariable?.title || '');
  const [content, setContent] = useState(initialVariable?.content || '');
  const [error, setError] = useState<string | null>(null);

  const validateId = (value: string): boolean => {
    // Allow alphanumeric, hyphens, and underscores
    const validFormat = /^[a-z0-9_-]+$/i.test(value);
    return validFormat && value.length >= 2 && value.length <= 50;
  };

  const handleSave = async () => {
    setError(null);

    // Validation
    if (!id.trim()) {
      setError('Variable ID is required');
      return;
    }

    if (!validateId(id.trim())) {
      setError('Variable ID must be 2-50 characters and contain only letters, numbers, hyphens, and underscores');
      return;
    }

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (!content.trim()) {
      setError('Content is required');
      return;
    }

    // Check for ID collision when creating new variable
    if (!initialVariable) {
      try {
        const result = await chrome.storage.local.get('staticVariables');
        const existing = (result.staticVariables || []) as StaticVariable[];
        const duplicate = existing.find(v => v.id.toLowerCase() === id.trim().toLowerCase());

        if (duplicate) {
          setError(`A variable with ID "${id.trim()}" already exists. Please use a different ID.`);
          return;
        }
      } catch (error) {
        console.error('Failed to check for duplicate variable ID:', error);
        setError('Failed to validate variable ID. Please try again.');
        return;
      }
    }

    const variable: StaticVariable = {
      id: id.trim(),
      title: title.trim(),
      content: content.trim(),
    };

    onSave(variable);
  };

  return (
    <div className="form-builder-container">
      <div className="form-builder-header">
        <h2 className="form-builder-title">
          {initialVariable ? 'Edit Variable' : 'Create Variable'}
        </h2>
        <p className="form-builder-subtitle">
          Define a reusable text snippet that can be used across all plugins using {'{{variableId}}'} syntax.
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="form-builder-error">
          {error}
        </div>
      )}

      {/* Variable Form */}
      <section className="form-builder-section">
        <div className="plugin-form-group">
          <label className="plugin-form-label">Variable ID *</label>
          <input
            type="text"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="e.g., myproduct, company_name, target_goal"
            className="plugin-form-input"
            disabled={!!initialVariable}
          />
          <p className="plugin-form-hint">
            {id.trim() ? (
              <>Used in templates as <code style={{ fontSize: '0.85em', padding: '0.1rem 0.3rem', backgroundColor: 'hsl(var(--muted))', borderRadius: '0.25rem' }}>{'{{' + id.trim() + '}}'}</code></>
            ) : (
              'Used in templates as {{variableId}}'
            )}
          </p>
          {initialVariable && (
            <p className="plugin-form-hint" style={{ color: 'hsl(var(--muted-foreground))' }}>
              Variable ID cannot be changed when editing
            </p>
          )}
        </div>

        <div className="plugin-form-group">
          <label className="plugin-form-label">Title/Label *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Product Name, Company Name, Analysis Goal"
            className="plugin-form-input"
          />
          <p className="plugin-form-hint">
            A human-readable label to help you identify this variable
          </p>
        </div>

        <div className="plugin-form-group">
          <label className="plugin-form-label">Content *</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="The text that will replace {{variableId}} in plugin prompts..."
            className="plugin-form-textarea"
            rows={6}
            style={{ resize: 'vertical' }}
          />
          <p className="plugin-form-hint">
            This text will be inserted when the variable is used in a plugin prompt
          </p>
        </div>

        {/* Preview */}
        {id.trim() && content.trim() && (
          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            backgroundColor: 'hsl(var(--muted))',
            borderRadius: '0.5rem',
            border: '1px solid hsl(var(--border))',
          }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
              Preview
            </h4>
            <p style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))', marginBottom: '0.5rem' }}>
              When you use <code style={{ fontSize: '0.85em', padding: '0.1rem 0.3rem', backgroundColor: 'hsl(var(--background))', borderRadius: '0.25rem' }}>{'{{' + id.trim() + '}}'}</code> in a plugin prompt, it will be replaced with:
            </p>
            <div style={{
              padding: '0.75rem',
              backgroundColor: 'hsl(var(--background))',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {content.trim()}
            </div>
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
          {initialVariable ? 'Update Variable' : 'Save Variable'}
        </button>
        <button onClick={onCancel} className="btn btn-secondary">
          Cancel
        </button>
      </div>
    </div>
  );
}
