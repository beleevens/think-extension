/**
 * Variables Settings Section
 * Manages global static variables accessible by all plugins
 */

import { useState, useEffect } from 'react';
import { Plus, Trash2, Download, Upload, Edit } from 'lucide-react';
import type { StaticVariable } from '../plugins/plugin-types';
import { VariableFormBuilder } from '../components/VariableFormBuilder';

export function VariablesSection() {
  const [variables, setVariables] = useState<StaticVariable[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showFormBuilder, setShowFormBuilder] = useState(false);
  const [editingVariable, setEditingVariable] = useState<StaticVariable | null>(null);

  useEffect(() => {
    loadVariables();
  }, []);

  const loadVariables = async () => {
    try {
      const result = await chrome.storage.local.get('staticVariables');
      const storedVariables = result.staticVariables || [];
      setVariables(storedVariables);
    } catch (error) {
      console.error('Failed to load variables:', error);
      setError('Failed to load variables');
    }
  };

  const handleSaveFromBuilder = async (variable: StaticVariable) => {
    try {
      setError(null);
      setSuccessMessage(null);

      // Load current variables
      const result = await chrome.storage.local.get('staticVariables');
      const existing = (result.staticVariables || []) as StaticVariable[];

      // Check for duplicates (when creating new)
      if (!editingVariable) {
        const duplicate = existing.find(v => v.id.toLowerCase() === variable.id.toLowerCase());
        if (duplicate) {
          setError(`Variable with ID "${variable.id}" already exists`);
          return;
        }
        existing.push(variable);
      } else {
        // Update existing variable
        const index = existing.findIndex(v => v.id === editingVariable.id);
        if (index !== -1) {
          existing[index] = variable;
        }
      }

      // Save to storage
      await chrome.storage.local.set({ staticVariables: existing });

      setSuccessMessage(`Variable "${variable.title}" ${editingVariable ? 'updated' : 'created'} successfully`);
      setShowFormBuilder(false);
      setEditingVariable(null);
      loadVariables();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Save failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to save variable');
    }
  };

  const handleEdit = (variable: StaticVariable) => {
    setEditingVariable(variable);
    setShowFormBuilder(true);
  };

  const handleDelete = async (variable: StaticVariable) => {
    if (!confirm(`Delete variable "${variable.title}" ({{${variable.id}}})? This cannot be undone.`)) {
      return;
    }

    try {
      const result = await chrome.storage.local.get('staticVariables');
      const existing = (result.staticVariables || []) as StaticVariable[];
      const filtered = existing.filter(v => v.id !== variable.id);

      await chrome.storage.local.set({ staticVariables: filtered });

      setSuccessMessage(`Variable "${variable.title}" deleted`);
      loadVariables();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Delete failed:', error);
      setError('Failed to delete variable');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleExport = () => {
    try {
      const blob = new Blob([JSON.stringify(variables, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const timestamp = new Date().toISOString().split('T')[0];
      a.download = `static-variables-${timestamp}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setSuccessMessage(`Exported ${variables.length} variable(s) successfully`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Export failed:', error);
      setError('Failed to export variables');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccessMessage(null);

    try {
      const text = await file.text();
      const imported = JSON.parse(text);

      if (!Array.isArray(imported)) {
        throw new Error('Invalid format: expected an array of variables');
      }

      // Validate structure
      for (const variable of imported) {
        if (!variable.id || !variable.title || !variable.content) {
          throw new Error('Invalid variable structure: id, title, and content are required');
        }
      }

      await chrome.storage.local.set({ staticVariables: imported });
      loadVariables();
      setSuccessMessage(`Imported ${imported.length} variable(s) successfully`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Import failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to import variables');
      setTimeout(() => setError(null), 3000);
    } finally {
      event.target.value = '';
    }
  };

  // Show form builder if active
  if (showFormBuilder) {
    return (
      <section className="settings-section" id="variables">
        <VariableFormBuilder
          onCancel={() => {
            setShowFormBuilder(false);
            setEditingVariable(null);
          }}
          onSave={handleSaveFromBuilder}
          initialVariable={editingVariable || undefined}
        />
      </section>
    );
  }

  return (
    <section className="settings-section" id="variables">
      <div className="plugin-manager-header">
        <h2 className="plugin-manager-title">Static Variables</h2>
        <p className="plugin-manager-subtitle">
          Define reusable text snippets that can be used across all plugins using {'{{variableId}}'} syntax.
        </p>

        {/* Create/Import Section */}
        <div className="plugin-manager-add-section">
          <h3 className="plugin-manager-add-title">
            <Plus size={18} />
            Add Variable
          </h3>
          <div className="plugin-manager-add-buttons">
            <button
              onClick={() => setShowFormBuilder(true)}
              className="btn-primary btn-flex"
            >
              <Plus size={16} />
              Create Variable
            </button>
            <button
              onClick={handleExport}
              disabled={variables.length === 0}
              className="btn-secondary btn-flex"
            >
              <Download size={16} />
              Export
            </button>
            <label
              className="btn-secondary btn-flex"
              style={{ cursor: 'pointer' }}
            >
              <Upload size={16} />
              Import
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden-input"
              />
            </label>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))', marginTop: '0.75rem' }}>
            Variables are global and automatically available to all plugins.
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div className="plugin-manager-error">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="plugin-manager-success">
            {successMessage}
          </div>
        )}
      </div>

      {/* Variables List */}
      <div>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 500, marginBottom: '1rem' }}>
          All Variables ({variables.length})
        </h3>

        {variables.length === 0 ? (
          <div style={{
            padding: '3rem',
            textAlign: 'center',
            color: 'hsl(var(--muted-foreground))',
            backgroundColor: 'hsl(var(--muted))',
            borderRadius: '0.5rem'
          }}>
            <Plus size={48} style={{ margin: '0 auto 1rem' }} />
            <p>No variables defined yet.</p>
            <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
              Create a variable to reuse text snippets across all plugins.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {variables.map((variable) => (
              <div
                key={variable.id}
                style={{
                  padding: '1.5rem',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.5rem',
                  backgroundColor: 'hsl(var(--card))',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <code style={{
                        fontSize: '0.9rem',
                        padding: '0.25rem 0.5rem',
                        backgroundColor: 'hsl(var(--muted))',
                        borderRadius: '0.375rem',
                        fontFamily: 'monospace'
                      }}>
                        {'{{' + variable.id + '}}'}
                      </code>
                      <span style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.9rem' }}>
                        {variable.title}
                      </span>
                    </h4>
                    <p style={{
                      fontSize: '0.875rem',
                      color: 'hsl(var(--muted-foreground))',
                      marginTop: '0.75rem',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      maxHeight: '4.5rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                    }}>
                      {variable.content}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button
                      onClick={() => handleEdit(variable)}
                      style={{
                        padding: '0.5rem',
                        backgroundColor: 'hsl(var(--primary))',
                        color: 'hsl(var(--primary-foreground))',
                        border: 'none',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                      }}
                      title="Edit variable"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(variable)}
                      style={{
                        padding: '0.5rem',
                        backgroundColor: 'hsl(var(--destructive))',
                        color: 'hsl(var(--destructive-foreground))',
                        border: 'none',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                      }}
                      title="Delete variable"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Documentation Section */}
      <div style={{
        marginTop: '3rem',
        padding: '1.5rem',
        backgroundColor: 'hsl(var(--muted))',
        borderRadius: '0.5rem',
      }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '1rem' }}>
          How to Use Variables
        </h3>
        <ul style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))', padding: 0, margin: 0 }}>
          <li style={{ marginBottom: '0.5rem' }}>
            Create variables with an ID (e.g., <code>myproduct</code>), title, and content
          </li>
          <li style={{ marginBottom: '0.5rem' }}>
            Use them in any plugin prompt by typing <code>{'{{variableId}}'}</code>
          </li>
          <li style={{ marginBottom: '0.5rem' }}>
            Example: <code>{'{{myproduct}}'}</code> will be replaced with the variable's content
          </li>
          <li>
            Variables are global and automatically available to all plugins
          </li>
        </ul>
      </div>
    </section>
  );
}
