/**
 * Master Prompts Settings Section
 * Manages system-level prompts that get attached to every AI request
 */

import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Eye, EyeOff } from 'lucide-react';
import type { MasterPrompt } from '../plugins/plugin-types';

export function MasterPromptsSection() {
  const [prompts, setPrompts] = useState<MasterPrompt[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<MasterPrompt | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formId, setFormId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPrompt, setFormPrompt] = useState('');
  const [formEnabled, setFormEnabled] = useState(true);

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      const result = await chrome.storage.local.get('masterPrompts');
      const storedPrompts = result.masterPrompts || [];
      setPrompts(storedPrompts);
    } catch (error) {
      console.error('Failed to load master prompts:', error);
      setError('Failed to load master prompts');
    }
  };

  const resetForm = () => {
    setFormId('');
    setFormTitle('');
    setFormDescription('');
    setFormPrompt('');
    setFormEnabled(true);
    setEditingPrompt(null);
    setShowForm(false);
  };

  const handleCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const handleEdit = (prompt: MasterPrompt) => {
    setFormId(prompt.id);
    setFormTitle(prompt.title);
    setFormDescription(prompt.description);
    setFormPrompt(prompt.prompt);
    setFormEnabled(prompt.enabled);
    setEditingPrompt(prompt);
    setShowForm(true);
  };

  const handleSave = async () => {
    try {
      setError(null);
      setSuccessMessage(null);

      // Validation
      if (!formId.trim() || !formTitle.trim() || !formPrompt.trim()) {
        setError('ID, title, and prompt are required');
        return;
      }

      // Validate ID format (lowercase, alphanumeric with hyphens)
      const idPattern = /^[a-z0-9-]+$/;
      if (!idPattern.test(formId)) {
        setError('ID must be lowercase letters, numbers, and hyphens only');
        return;
      }

      // Validate prompt length (max 5000 characters)
      if (formPrompt.trim().length > 5000) {
        setError('Prompt is too long (maximum 5000 characters)');
        return;
      }

      // Validate title length
      if (formTitle.trim().length > 100) {
        setError('Title is too long (maximum 100 characters)');
        return;
      }

      // Load current prompts
      const result = await chrome.storage.local.get('masterPrompts');
      const existing = (result.masterPrompts || []) as MasterPrompt[];

      const newPrompt: MasterPrompt = {
        id: formId.trim(),
        title: formTitle.trim(),
        description: formDescription.trim(),
        prompt: formPrompt.trim(),
        enabled: formEnabled,
      };

      // Check for duplicates (when creating new)
      if (!editingPrompt) {
        const duplicate = existing.find(p => p.id.toLowerCase() === newPrompt.id.toLowerCase());
        if (duplicate) {
          setError(`Prompt with ID "${newPrompt.id}" already exists`);
          return;
        }
        existing.push(newPrompt);
      } else {
        // Update existing prompt
        const index = existing.findIndex(p => p.id === editingPrompt.id);
        if (index !== -1) {
          existing[index] = newPrompt;
        }
      }

      // Save to storage
      await chrome.storage.local.set({ masterPrompts: existing });

      setSuccessMessage(`Prompt "${newPrompt.title}" ${editingPrompt ? 'updated' : 'created'} successfully`);
      resetForm();
      loadPrompts();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Save failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to save prompt');
    }
  };

  const handleDelete = async (prompt: MasterPrompt) => {
    if (!confirm(`Delete master prompt "${prompt.title}"? This cannot be undone.`)) {
      return;
    }

    try {
      const result = await chrome.storage.local.get('masterPrompts');
      const existing = (result.masterPrompts || []) as MasterPrompt[];
      const filtered = existing.filter(p => p.id !== prompt.id);

      await chrome.storage.local.set({ masterPrompts: filtered });

      setSuccessMessage(`Prompt "${prompt.title}" deleted`);
      loadPrompts();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Delete failed:', error);
      setError('Failed to delete prompt');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleToggleEnabled = async (prompt: MasterPrompt) => {
    try {
      const result = await chrome.storage.local.get('masterPrompts');
      const existing = (result.masterPrompts || []) as MasterPrompt[];
      const index = existing.findIndex(p => p.id === prompt.id);

      if (index !== -1) {
        existing[index] = { ...existing[index], enabled: !existing[index].enabled };
        await chrome.storage.local.set({ masterPrompts: existing });
        loadPrompts();
      }
    } catch (error) {
      console.error('Toggle failed:', error);
      setError('Failed to toggle prompt');
      setTimeout(() => setError(null), 3000);
    }
  };

  return (
    <section className="settings-section" id="master-prompts">
      <div className="plugin-manager-header">
        <h2 className="plugin-manager-title">Master Prompts</h2>
        <p className="plugin-manager-subtitle">
          Define system-level prompts that get attached to every single AI request (chat & plugins).
        </p>

        {/* Security Warning */}
        <div style={{
          padding: '1rem',
          backgroundColor: 'hsl(48 96% 89%)',
          border: '2px solid hsl(48 96% 53%)',
          borderRadius: '0.5rem',
          marginTop: '1rem',
          marginBottom: '1rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>⚠️</span>
            <div style={{ fontSize: '0.875rem', color: 'hsl(48 96% 20%)' }}>
              <strong>Security Notice:</strong> Master prompts have significant power over AI behavior.
              Only create prompts you understand and trust. Malicious or poorly-crafted prompts may
              cause unexpected behavior or expose sensitive information.
            </div>
          </div>
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

        {/* Create Button */}
        {!showForm && (
          <div className="plugin-manager-add-section">
            <h3 className="plugin-manager-add-title">
              <Plus size={18} />
              Add Master Prompt
            </h3>
            <div className="plugin-manager-add-buttons">
              <button
                onClick={handleCreate}
                className="btn-primary btn-flex"
              >
                <Plus size={16} />
                Create Master Prompt
              </button>
            </div>
          </div>
        )}

        {/* Form */}
        {showForm && (
          <div style={{
            padding: '1.5rem',
            border: '2px solid hsl(var(--border))',
            borderRadius: '0.5rem',
            backgroundColor: 'hsl(var(--muted))',
            marginTop: '1.5rem',
          }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 500, marginBottom: '1rem' }}>
              {editingPrompt ? 'Edit Master Prompt' : 'Create Master Prompt'}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* ID */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
                  ID <span style={{ color: 'hsl(var(--destructive))' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formId}
                  onChange={(e) => setFormId(e.target.value)}
                  placeholder="e.g., personality, formatting"
                  disabled={!!editingPrompt}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    fontSize: '0.875rem',
                    border: '2px solid hsl(var(--border))',
                    borderRadius: '0.5rem',
                    backgroundColor: editingPrompt ? 'hsl(var(--muted))' : 'hsl(var(--background))',
                    color: 'hsl(var(--foreground))',
                  }}
                />
                <p style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', marginTop: '0.25rem' }}>
                  Lowercase letters, numbers, and hyphens only
                </p>
              </div>

              {/* Title */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
                  Title <span style={{ color: 'hsl(var(--destructive))' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g., Agent Personality, Output Format"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    fontSize: '0.875rem',
                    border: '2px solid hsl(var(--border))',
                    borderRadius: '0.5rem',
                    backgroundColor: 'hsl(var(--background))',
                    color: 'hsl(var(--foreground))',
                  }}
                />
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
                  Description
                </label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Explain what this prompt does"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    fontSize: '0.875rem',
                    border: '2px solid hsl(var(--border))',
                    borderRadius: '0.5rem',
                    backgroundColor: 'hsl(var(--background))',
                    color: 'hsl(var(--foreground))',
                  }}
                />
              </div>

              {/* Prompt */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
                  Prompt <span style={{ color: 'hsl(var(--destructive))' }}>*</span>
                </label>
                <textarea
                  value={formPrompt}
                  onChange={(e) => setFormPrompt(e.target.value)}
                  placeholder="Enter the system prompt that will be attached to every request..."
                  rows={6}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    fontSize: '0.875rem',
                    border: '2px solid hsl(var(--border))',
                    borderRadius: '0.5rem',
                    backgroundColor: 'hsl(var(--background))',
                    color: 'hsl(var(--foreground))',
                    fontFamily: 'monospace',
                    resize: 'vertical',
                  }}
                />
                <p style={{
                  fontSize: '0.75rem',
                  color: formPrompt.length > 5000 ? 'hsl(var(--destructive))' : 'hsl(var(--muted-foreground))',
                  marginTop: '0.25rem',
                  textAlign: 'right',
                }}>
                  {formPrompt.length} / 5000 characters
                </p>
              </div>

              {/* Enabled */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="prompt-enabled"
                  checked={formEnabled}
                  onChange={(e) => setFormEnabled(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="prompt-enabled" style={{ cursor: 'pointer', fontSize: '0.875rem' }}>
                  Enabled (attach to all requests)
                </label>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  onClick={handleSave}
                  className="btn-primary"
                  style={{ padding: '0.75rem 1.5rem' }}
                >
                  {editingPrompt ? 'Update' : 'Create'}
                </button>
                <button
                  onClick={resetForm}
                  className="btn-secondary"
                  style={{ padding: '0.75rem 1.5rem' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Prompts List */}
      {!showForm && (
        <div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 500, marginBottom: '1rem' }}>
            All Master Prompts ({prompts.length})
          </h3>

          {prompts.length === 0 ? (
            <div style={{
              padding: '3rem',
              textAlign: 'center',
              color: 'hsl(var(--muted-foreground))',
              backgroundColor: 'hsl(var(--muted))',
              borderRadius: '0.5rem'
            }}>
              <Plus size={48} style={{ margin: '0 auto 1rem' }} />
              <p>No master prompts defined yet.</p>
              <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                Create a master prompt to attach instructions to every AI request.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {prompts.map((prompt) => (
                <div
                  key={prompt.id}
                  style={{
                    padding: '1.5rem',
                    border: `2px solid ${prompt.enabled ? 'hsl(var(--primary))' : 'hsl(var(--border))'}`,
                    borderRadius: '0.5rem',
                    backgroundColor: 'hsl(var(--card))',
                    opacity: prompt.enabled ? 1 : 0.6,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <span>{prompt.title}</span>
                        {prompt.enabled ? (
                          <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', backgroundColor: 'hsl(142 76% 36% / 0.2)', color: 'hsl(142 76% 36%)', borderRadius: '0.375rem' }}>
                            Active
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', backgroundColor: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))', borderRadius: '0.375rem' }}>
                            Disabled
                          </span>
                        )}
                      </h4>
                      {prompt.description && (
                        <p style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))', marginTop: '0.5rem' }}>
                          {prompt.description}
                        </p>
                      )}
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
                        fontFamily: 'monospace',
                        backgroundColor: 'hsl(var(--muted))',
                        padding: '0.5rem',
                        borderRadius: '0.375rem',
                      }}>
                        {prompt.prompt}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <button
                        onClick={() => handleToggleEnabled(prompt)}
                        style={{
                          padding: '0.5rem',
                          backgroundColor: prompt.enabled ? 'hsl(142 76% 36%)' : 'hsl(var(--muted))',
                          color: prompt.enabled ? 'white' : 'hsl(var(--muted-foreground))',
                          border: 'none',
                          borderRadius: '0.375rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                        }}
                        title={prompt.enabled ? 'Disable prompt' : 'Enable prompt'}
                      >
                        {prompt.enabled ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                      <button
                        onClick={() => handleEdit(prompt)}
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
                        title="Edit prompt"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(prompt)}
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
                        title="Delete prompt"
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
      )}

      {/* Documentation Section */}
      {!showForm && (
        <div style={{
          marginTop: '3rem',
          padding: '1.5rem',
          backgroundColor: 'hsl(var(--muted))',
          borderRadius: '0.5rem',
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '1rem' }}>
            How Master Prompts Work
          </h3>
          <ul style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))', paddingLeft: '1.5rem', margin: 0 }}>
            <li style={{ marginBottom: '0.5rem' }}>
              Master prompts are automatically attached to <strong>every AI request</strong> (chat and plugins)
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              Use them to define agent personality, output formatting, or general instructions
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              Only enabled prompts are included in requests
            </li>
            <li>
              Example: Create a "formatting" prompt with "Always return responses in markdown format"
            </li>
          </ul>
        </div>
      )}
    </section>
  );
}
