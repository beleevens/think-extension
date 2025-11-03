import { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Loader2, Check } from 'lucide-react';
import {
  createAIClient,
  type AIProvider,
  getProviderDisplayName,
  getStorageKeyForApiKey,
  getStorageKeyForModel,
  DEFAULT_OLLAMA_ENDPOINT,
  DEFAULT_MODELS,
} from '../lib/ai-client';
import { getNoteCount, getStorageUsage, exportNotes, importNotes, clearAllNotes, exportNotesAsMarkdown, getStorageBreakdown, type StorageBreakdown } from '../lib/local-notes';
import { ThemeToggle } from '../components/ThemeToggle';
import { OllamaSetupModal } from '../components/OllamaSetupModal';
import { initTheme, listenToThemeChanges } from '../lib/theme';
import { registerBuiltInPlugins, listenToPluginChanges } from '../plugins/registry';
import { PluginsSection } from './PluginsSection';
import { VariablesSection } from './VariablesSection';
import { MasterPromptsSection } from './MasterPromptsSection';
import './settings.css';

type ConnectionStatus = 'unknown' | 'testing' | 'available' | 'unavailable';

// Wrapper component for plugin-dependent sections
function InitGuard({
  isInitialized,
  error,
  children
}: {
  isInitialized: boolean;
  error: string | null;
  children: React.ReactNode;
}) {
  if (!isInitialized) {
    return (
      <section className="settings-section">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '2rem' }}>
          <Loader2 size={20} className="spin" />
          <span>Initializing...</span>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="settings-section">
        <div style={{ padding: '2rem', color: 'hsl(var(--destructive))' }}>
          <strong>Initialization error:</strong> {error}
        </div>
      </section>
    );
  }

  return <>{children}</>;
}

function SettingsPage() {
  const [activeProvider, setActiveProvider] = useState<AIProvider>('venice');
  const [pluginsInitialized, setPluginsInitialized] = useState(false);
  const [pluginInitError, setPluginInitError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Ollama-specific settings
  const [ollamaEndpoint, setOllamaEndpoint] = useState(DEFAULT_OLLAMA_ENDPOINT);

  // Connection status
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('unknown');

  // Local Notes statistics
  const [notesCount, setNotesCount] = useState<number>(0);
  const [storageBreakdown, setStorageBreakdown] = useState<StorageBreakdown | null>(null);
  const [loadingNotes, setLoadingNotes] = useState(false);

  // Model selection
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [availableModels, setAvailableModels] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  // Behavior settings
  const [autoOpenNoteConversation, setAutoOpenNoteConversation] = useState<boolean>(true);

  // Modal state
  const [showOllamaSetup, setShowOllamaSetup] = useState<boolean>(false);

  useEffect(() => {
    initTheme(); // Initialize dark mode on mount
    loadSettings();
    loadNotesStatistics();

    // Initialize plugin system (MUST await to prevent race conditions)
    registerBuiltInPlugins()
      .then(() => {
        setPluginsInitialized(true);
      })
      .catch(err => {
        console.error('[Settings] Failed to initialize plugin system:', err);
        setPluginInitError(err.message || 'Failed to initialize plugin system');
        setPluginsInitialized(true);
      });

    // Listen for theme changes from other pages
    const themeCleanup = listenToThemeChanges();

    // Listen for plugin changes (hot-reload)
    const pluginCleanup = listenToPluginChanges(() => {
    });

    return () => {
      themeCleanup();
      pluginCleanup();
    };
  }, []);

  // Scroll to section if hash is present in URL
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const id = hash.substring(1);
      const element = document.getElementById(id);
      if (element) {
        setTimeout(() => {
          const scrollContainer = document.querySelector('.settings-main');
          if (scrollContainer && element) {
            const elementTop = element.offsetTop;
            scrollContainer.scrollTo({
              top: elementTop - 80,
              behavior: 'smooth'
            });
          }
        }, 100);
      }
    }
  }, []);

  const loadSettings = async () => {
    const result = await chrome.storage.local.get([
      'activeProvider',
      'veniceApiKey',
      'claudeApiKey',
      'veniceModel',
      'claudeModel',
      'ollamaEndpoint',
      'ollamaModel',
      'eliBlocks',
      'autoOpenNoteConversation',
    ]);

    // Load active provider (default to venice)
    const provider = (result.activeProvider || 'venice') as AIProvider;
    setActiveProvider(provider);

    // Load API key for the active provider
    if (provider === 'ollama') {
      // Ollama doesn't use API keys
      setApiKey('');
      const endpoint = result.ollamaEndpoint || DEFAULT_OLLAMA_ENDPOINT;
      setOllamaEndpoint(endpoint);
      testConnection('', provider, endpoint);
    } else {
      const apiKeyStorageKey = getStorageKeyForApiKey(provider);
      const key = apiKeyStorageKey ? result[apiKeyStorageKey] : null;
      if (key) {
        setApiKey(key);
        testConnection(key, provider);
      }
    }

    // Load selected model for the active provider
    const modelStorageKey = getStorageKeyForModel(provider);
    const model = result[modelStorageKey] || DEFAULT_MODELS[provider] || '';

    setSelectedModel(model);

    // Load behavior settings
    setAutoOpenNoteConversation(result.autoOpenNoteConversation ?? true);
  };

  const testConnection = async (key?: string, provider?: AIProvider, endpoint?: string) => {
    const apiKeyToTest = key || apiKey;
    const providerToTest = provider || activeProvider;
    const endpointToTest = endpoint || ollamaEndpoint;

    // Ollama doesn't require API key
    if (providerToTest !== 'ollama' && !apiKeyToTest) {
      setConnectionStatus('unavailable');
      return;
    }

    setConnectionStatus('testing');

    try {
      const client = createAIClient(providerToTest, apiKeyToTest, endpointToTest);
      const isValid = await client.checkHealth();
      setConnectionStatus(isValid ? 'available' : 'unavailable');

      // If connection is valid, fetch available models
      if (isValid) {
        fetchModels(apiKeyToTest, providerToTest, endpointToTest);
      }
    } catch (error) {
      setConnectionStatus('unavailable');
    }
  };

  const fetchModels = async (key?: string, provider?: AIProvider, endpoint?: string) => {
    const apiKeyToUse = key || apiKey;
    const providerToUse = provider || activeProvider;
    const endpointToUse = endpoint || ollamaEndpoint;

    // Ollama doesn't require API key
    if (providerToUse !== 'ollama' && !apiKeyToUse) {
      return;
    }

    setLoadingModels(true);

    try {
      const client = createAIClient(providerToUse, apiKeyToUse, endpointToUse);
      const models = await client.getModels();
      setAvailableModels(models);

      // If no model is selected yet, set to first model or current default
      if (!selectedModel && models.length > 0) {
        const defaultModel = DEFAULT_MODELS[providerToUse];
        const modelExists = models.find((m) => m.id === defaultModel);
        const modelToSelect = modelExists ? defaultModel : models[0].id;

        if (modelToSelect) {
          setSelectedModel(modelToSelect);

          // Save to storage to trigger side panel update
          const storageKey = getStorageKeyForModel(providerToUse);
          await chrome.storage.local.set({ [storageKey]: modelToSelect });
        }
      }
    } catch (error) {
      console.error('[Settings] Failed to fetch models:', error);
      // Set default models on error (not for Ollama)
      if (providerToUse === 'venice') {
        setAvailableModels([{ id: 'llama-3.3-70b', name: 'Llama 3.3 70B' }]);
      } else if (providerToUse === 'claude') {
        setAvailableModels([
          { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
          { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
        ]);
      } else if (providerToUse === 'ollama') {
        // For Ollama, empty array means no models installed
        setAvailableModels([]);
      }
    } finally {
      setLoadingModels(false);
    }
  };

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      setSaveMessage({ type: 'error', text: 'Please enter an API key' });
      return;
    }

    setSaving(true);
    setSaveMessage(null);

    try {
      // Save to the appropriate storage key based on active provider
      const storageKey = getStorageKeyForApiKey(activeProvider);
      if (!storageKey) {
        throw new Error(`No API key storage for provider: ${activeProvider}`);
      }
      await chrome.storage.local.set({
        [storageKey]: apiKey.trim(),
        activeProvider: activeProvider,
      });
      setSaveMessage({ type: 'success', text: 'API key saved successfully' });
      setTimeout(() => setSaveMessage(null), 3000);

      testConnection();
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'Failed to save API key' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveOllamaSettings = async () => {
    setSaving(true);
    setSaveMessage(null);

    try {
      await chrome.storage.local.set({
        ollamaEndpoint: DEFAULT_OLLAMA_ENDPOINT,
        activeProvider: 'ollama',
      });
      setSaveMessage({ type: 'success', text: 'Connected to Ollama successfully' });
      setTimeout(() => setSaveMessage(null), 3000);

      testConnection('', 'ollama', DEFAULT_OLLAMA_ENDPOINT);
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'Failed to connect to Ollama' });
    } finally {
      setSaving(false);
    }
  };

  const handleClearApiKey = async () => {
    if (confirm('Are you sure you want to clear the API key?')) {
      const storageKey = getStorageKeyForApiKey(activeProvider);
      if (storageKey) {
        await chrome.storage.local.remove(storageKey);
      }
      setApiKey('');
      setConnectionStatus('unavailable');
      setSaveMessage({ type: 'success', text: 'API key cleared' });
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const handleProviderChange = async (newProvider: AIProvider) => {
    setActiveProvider(newProvider);

    if (newProvider === 'ollama') {
      // Load Ollama settings
      const result = await chrome.storage.local.get(['ollamaEndpoint', 'ollamaModel']);
      const endpoint = result.ollamaEndpoint || DEFAULT_OLLAMA_ENDPOINT;
      const model = result.ollamaModel || '';

      setOllamaEndpoint(endpoint);
      setApiKey(''); // Ollama doesn't use API keys
      setSelectedModel(model);

      testConnection('', newProvider, endpoint);
    } else {
      // Load API key and model for Venice or Claude
      const apiKeyStorageKey = getStorageKeyForApiKey(newProvider);
      const modelStorageKey = getStorageKeyForModel(newProvider);

      const result = await chrome.storage.local.get([apiKeyStorageKey, modelStorageKey]);
      const key = apiKeyStorageKey ? result[apiKeyStorageKey] : null;
      const model = result[modelStorageKey];

      if (key) {
        setApiKey(key);
        testConnection(key, newProvider);
      } else {
        setApiKey('');
        setConnectionStatus('unknown');
        setAvailableModels([]);
      }

      // Load selected model or set to default
      setSelectedModel(model || DEFAULT_MODELS[newProvider]);
    }

    // Save active provider
    await chrome.storage.local.set({ activeProvider: newProvider });
  };

  const loadNotesStatistics = async () => {
    setLoadingNotes(true);
    try {
      const count = await getNoteCount();
      const breakdown = await getStorageBreakdown();
      setNotesCount(count);
      setStorageBreakdown(breakdown);
    } catch (error) {
      console.error('Failed to load notes statistics:', error);
    } finally {
      setLoadingNotes(false);
    }
  };

  const handleExportNotes = async () => {
    try {
      const json = await exportNotes();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      a.download = `think-better-notes-${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSaveMessage({ type: 'success', text: `Exported ${notesCount} notes successfully` });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'Failed to export notes' });
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const handleExportNotesAsMarkdown = async () => {
    try {
      const blob = await exportNotesAsMarkdown();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      a.download = `think-better-notes-markdown-${timestamp}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSaveMessage({ type: 'success', text: `Exported ${notesCount} notes as markdown` });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'Failed to export notes as markdown' });
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const handleImportNotes = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const count = await importNotes(text, true); // merge by default
      await loadNotesStatistics(); // Refresh statistics
      setSaveMessage({ type: 'success', text: `Imported ${count} notes successfully` });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'Failed to import notes: ' + (error instanceof Error ? error.message : 'Invalid file') });
      setTimeout(() => setSaveMessage(null), 3000);
    }
    // Reset file input
    event.target.value = '';
  };

  const handleClearAllNotes = async () => {
    if (!confirm(`Are you sure you want to delete all ${notesCount} notes? This action cannot be undone.`)) {
      return;
    }

    try {
      const count = await clearAllNotes();
      await loadNotesStatistics(); // Refresh statistics
      setSaveMessage({ type: 'success', text: `Cleared ${count} notes successfully` });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'Failed to clear notes' });
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const handleModelChange = async (newModel: string) => {
    setSelectedModel(newModel);

    try {
      // Save to the appropriate storage key based on active provider
      const storageKey = getStorageKeyForModel(activeProvider);
      if (!storageKey) {
        throw new Error(`No model storage key for provider: ${activeProvider}`);
      }

      await chrome.storage.local.set({ [storageKey]: newModel });

      setSaveMessage({ type: 'success', text: `Model updated to ${newModel}` });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'Failed to save model selection' });
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const formatStorageSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const openNotesPage = () => {
    chrome.tabs.create({
      url: chrome.runtime.getURL('src/notes/notes.html'),
    });
  };

  const getStatusBadge = (status: ConnectionStatus) => {
    switch (status) {
      case 'testing':
        return (
          <span className="status-badge testing" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Loader2 size={14} className="spin" />
            Testing...
          </span>
        );
      case 'available':
        // Get the display name for the model
        const modelDisplayName = availableModels.find((m) => m.id === selectedModel)?.name || selectedModel;
        const providerDisplayName = getProviderDisplayName(activeProvider);

        return (
          <span className="status-badge available" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '10px' }}>🟢</span>
            {providerDisplayName} - {modelDisplayName || 'No model selected'}
          </span>
        );
      case 'unavailable':
        return <span className="status-badge unavailable">❌ Not Connected</span>;
      default:
        return <span className="status-badge unknown">⚪ Unknown</span>;
    }
  };

  return (
    <>
      <OllamaSetupModal isOpen={showOllamaSetup} onClose={() => setShowOllamaSetup(false)} />

      <div className="settings-container">
        <header className="settings-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <img src={chrome.runtime.getURL('branding/Think_OS_Full_Word_Mark.svg')} alt="Think OS" style={{ height: '20px' }} />
            <h2 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 'normal', lineHeight: '1.5' }}>Settings</h2>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="settings-main">
        {/* AI Provider Selection */}
        <section className="settings-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h2 style={{ margin: 0 }}>AI Provider</h2>
            {getStatusBadge(connectionStatus)}
          </div>
          <p className="help-text">
            Choose your AI provider for chat and auto-tagging features.
          </p>

          <div className="input-group" style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="provider-select" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
              Select Provider
            </label>
            <select
              id="provider-select"
              value={activeProvider}
              onChange={(e) => handleProviderChange(e.target.value as AIProvider)}
              className="api-key-input"
              style={{ cursor: 'pointer' }}
            >
              <option value="venice">Venice.ai</option>
              <option value="claude">Claude (Anthropic)</option>
              <option value="ollama">Ollama (Local)</option>
            </select>
          </div>

          {/* Advanced Setup Warning - Only for Ollama */}
          {activeProvider === 'ollama' && (
            <div
              className="p-4 rounded-md"
              style={{
                backgroundColor: 'hsl(var(--muted))',
                border: '1px solid hsl(var(--border))',
                marginTop: '1rem',
                marginBottom: '1rem'
              }}
            >
              <div className="text-sm font-semibold mb-2" style={{ color: 'hsl(var(--foreground))' }}>
                ⚠️ Advanced Setup Required
              </div>
              <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                Ollama requires terminal/command line configuration. If you're not comfortable with this,
                we recommend using <strong>Venice.ai</strong> or <strong>Claude</strong> instead (cloud-based, no setup needed).
              </p>
            </div>
          )}

{activeProvider === 'ollama' ? (
            // Ollama-specific UI
            <>
              <h3 style={{ marginBottom: '0.75rem' }}>Ollama Endpoint</h3>
              <p className="help-text">
                Ollama must run on <code>http://localhost:11434</code> (fixed for security).{' '}
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowOllamaSetup(true);
                  }}
                  style={{ textDecoration: 'underline', cursor: 'pointer' }}
                >
                  Setup instructions
                </a>
                {' '}|{' '}
                <a href="https://ollama.com/download" target="_blank" rel="noopener noreferrer">
                  Download Ollama
                </a>
              </p>

              <div className="input-group">
                <input
                  type="text"
                  value={ollamaEndpoint}
                  readOnly
                  disabled
                  placeholder="http://localhost:11434"
                  className="api-key-input"
                  style={{ opacity: 0.7, cursor: 'not-allowed' }}
                />
              </div>

              <div className="button-group">
                <button
                  onClick={handleSaveOllamaSettings}
                  disabled={saving}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}
                >
                  {saving && <Loader2 size={16} className="spin" />}
                  {saving ? 'Connecting...' : 'Connect'}
                </button>
                <button
                  onClick={() => testConnection('', 'ollama', DEFAULT_OLLAMA_ENDPOINT)}
                  disabled={connectionStatus === 'testing'}
                  className="btn btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}
                >
                  {connectionStatus === 'testing' && <Loader2 size={16} className="spin" />}
                  {connectionStatus === 'testing' ? 'Testing...' : 'Test Connection'}
                </button>
              </div>
            </>
          ) : (
            // Venice/Claude API key UI
            <>
              <h3 style={{ marginBottom: '0.75rem' }}>
                {activeProvider === 'venice' ? 'Venice.ai API Key' : 'Claude API Key'}
              </h3>
              <p className="help-text">
                {activeProvider === 'venice' ? (
                  <>
                    Get your free API key from{' '}
                    <a href="https://docs.venice.ai/overview/guides/generating-api-key" target="_blank" rel="noopener noreferrer">
                      Venice.ai API documentation
                    </a>
                  </>
                ) : (
                  <>
                    Get your API key from{' '}
                    <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer">
                      Anthropic Console
                    </a>
                  </>
                )}
              </p>

              <div className="input-group">
                <div className="input-wrapper">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your API key"
                    className="api-key-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="toggle-visibility-btn"
                    title={showApiKey ? 'Hide API key' : 'Show API key'}
                  >
                    {showApiKey ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <div className="button-group">
                <button
                  onClick={handleSaveApiKey}
                  disabled={saving || !apiKey.trim()}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}
                >
                  {saving && <Loader2 size={16} className="spin" />}
                  {saving ? 'Saving...' : 'Save API Key'}
                </button>
                <button
                  onClick={() => testConnection()}
                  disabled={!apiKey || connectionStatus === 'testing'}
                  className="btn btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}
                >
                  {connectionStatus === 'testing' && <Loader2 size={16} className="spin" />}
                  {connectionStatus === 'testing' ? 'Testing...' : 'Test Connection'}
                </button>
                <button
                  onClick={handleClearApiKey}
                  disabled={!apiKey}
                  className="btn btn-danger"
                >
                  Clear
                </button>
              </div>
            </>
          )}

          {saveMessage && (
            <div className={`message ${saveMessage.type}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {saveMessage.type === 'success' && <Check size={16} />}
              {saveMessage.text}
            </div>
          )}

          {/* Model Selection */}
          {connectionStatus === 'available' && (
            <div className="input-group" style={{ marginTop: '1.5rem' }}>
              <label htmlFor="model-select" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Select Model
              </label>
              {loadingModels ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem' }}>
                  <Loader2 size={16} className="spin" />
                  <span>Loading available models...</span>
                </div>
              ) : availableModels.length === 0 && activeProvider === 'ollama' ? (
                // Show helpful message for Ollama when no models are installed
                <div className="ollama-help-box">
                  <p style={{ margin: '0 0 0.75rem 0', fontWeight: 500 }}>No Ollama models installed</p>
                  <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.875rem' }}>
                    To use Ollama, you need to install at least one model. Here's how:
                  </p>
                  <ol style={{ margin: '0 0 0.75rem 1.25rem', fontSize: '0.875rem', lineHeight: '1.6' }}>
                    <li>
                      <a href="https://ollama.com/download" target="_blank" rel="noopener noreferrer">
                        Download and install Ollama
                      </a>
                    </li>
                    <li>
                      Browse and install a model from the{' '}
                      <a href="https://ollama.com/library" target="_blank" rel="noopener noreferrer">
                        Ollama model library
                      </a>
                    </li>
                    <li>Run <code className="ollama-help-code">ollama pull llama3.2</code> in your terminal</li>
                    <li>Click "Test Connection" above to refresh the model list</li>
                  </ol>
                </div>
              ) : (
                <>
                  <select
                    id="model-select"
                    value={selectedModel}
                    onChange={(e) => handleModelChange(e.target.value)}
                    className="api-key-input"
                    style={{ cursor: 'pointer' }}
                    disabled={availableModels.length === 0}
                  >
                    {availableModels.length > 0 ? (
                      availableModels.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name}
                        </option>
                      ))
                    ) : (
                      <option value={selectedModel}>{selectedModel}</option>
                    )}
                  </select>
                  <p className="help-text" style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
                    Select the AI model to use for chat and auto-tagging. Different models have different capabilities and costs.
                  </p>
                </>
              )}
            </div>
          )}

          <p className="help-text" style={{ marginTop: '1rem', fontSize: '0.875rem', fontStyle: 'italic' }}>
            <strong>Privacy Note:</strong>{' '}
            {activeProvider === 'ollama' ? (
              'Ollama runs locally on your machine. All data stays on your device and no API keys are required.'
            ) : (
              <>
                Your API key is stored locally in Chrome storage and only used to communicate with{' '}
                {activeProvider === 'venice' ? 'Venice.ai' : 'Anthropic\'s Claude API'}.
                We never see or store your API key.
              </>
            )}
          </p>
        </section>

        {/* Behavior Settings Section */}
        <section id="behavior" className="settings-section">
          <h2>Behavior Settings</h2>
          <div style={{ marginTop: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={autoOpenNoteConversation}
                onChange={async (e) => {
                  const newValue = e.target.checked;
                  setAutoOpenNoteConversation(newValue);
                  try {
                    await chrome.storage.local.set({ autoOpenNoteConversation: newValue });
                    setSaveMessage({ type: 'success', text: 'Setting saved' });
                    setTimeout(() => setSaveMessage(null), 3000);
                  } catch (error) {
                    console.error('[Settings] Failed to save setting:', error);
                    setSaveMessage({ type: 'error', text: 'Failed to save setting' });
                    setTimeout(() => setSaveMessage(null), 3000);
                  }
                }}
                style={{ marginTop: '0.25rem', cursor: 'pointer' }}
              />
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: '500', display: 'block', marginBottom: '0.25rem' }}>
                  Auto-open conversation when clicking a note
                </span>
                <p className="help-text" style={{ margin: 0, fontSize: '0.875rem' }}>
                  When enabled, clicking a note will automatically open its conversation in the side panel.
                  When disabled, you'll need to click the "Open Conversation" button to view a note's chat history.
                </p>
              </div>
            </label>
          </div>
        </section>

        {/* Plugins Section */}
        <InitGuard isInitialized={pluginsInitialized} error={pluginInitError}>
          <PluginsSection />
        </InitGuard>

        {/* Variables Section */}
        <InitGuard isInitialized={pluginsInitialized} error={pluginInitError}>
          <VariablesSection />
        </InitGuard>

        {/* Master Prompts Section */}
        <InitGuard isInitialized={pluginsInitialized} error={pluginInitError}>
          <MasterPromptsSection />
        </InitGuard>

        {/* Info Section */}
        <section className="settings-section info-section">
          <h2>About Privacy & Storage</h2>
          <ul className="info-list">
            <li><strong>Local-First:</strong> All your notes are stored in Chrome's local storage on your device.</li>
            <li><strong>No Account Required:</strong> No sign-up, no login, no cloud sync.</li>
            <li><strong>AI Processing:</strong> When using AI features, note content is sent to your selected AI provider for processing.</li>
            <li><strong>Backup:</strong> Export your notes regularly to prevent data loss if browser data is cleared.</li>
            <li><strong>Privacy:</strong> We don't collect any data. Your API key and notes stay on your device.</li>
          </ul>
        </section>

        {/* Local Storage Section */}
        <section className="settings-section">
          <h2>Local Storage & Data</h2>
          <p className="help-text">
            All your data is stored locally in your browser using Chrome storage. This includes notes, conversations, settings, plugins, and variables. Your data never leaves your device unless you explicitly export it.
          </p>

          {/* Storage Statistics - Category Breakdown */}
          <div className="storage-categories-grid">
            <div className="stat-card category-card">
              <div className="stat-label">Notes</div>
              <div className="stat-value">
                {loadingNotes ? '...' : (
                  <>
                    {notesCount} items<br />
                    <span style={{ fontSize: '0.875rem', opacity: 0.8 }}>
                      {formatStorageSize(storageBreakdown?.notes.size || 0)}
                    </span>
                  </>
                )}
              </div>
              {!loadingNotes && storageBreakdown && (
                <div className="category-percentage">
                  {storageBreakdown.notes.percentage}% of total
                </div>
              )}
            </div>
            <div className="stat-card category-card">
              <div className="stat-label">Conversations</div>
              <div className="stat-value">
                {loadingNotes ? '...' : (
                  <>
                    {storageBreakdown?.conversations.count || 0} items<br />
                    <span style={{ fontSize: '0.875rem', opacity: 0.8 }}>
                      {formatStorageSize(storageBreakdown?.conversations.size || 0)}
                    </span>
                  </>
                )}
              </div>
              {!loadingNotes && storageBreakdown && (
                <div className="category-percentage">
                  {storageBreakdown.conversations.percentage}% of total
                </div>
              )}
            </div>
            <div className="stat-card category-card">
              <div className="stat-label">Settings</div>
              <div className="stat-value">
                {loadingNotes ? '...' : formatStorageSize(storageBreakdown?.settings.size || 0)}
              </div>
              {!loadingNotes && storageBreakdown && (
                <div className="category-percentage">
                  {storageBreakdown.settings.percentage}% of total
                </div>
              )}
            </div>
            <div className="stat-card category-card">
              <div className="stat-label">Plugins/Variables</div>
              <div className="stat-value">
                {loadingNotes ? '...' : formatStorageSize(storageBreakdown?.plugins.size || 0)}
              </div>
              {!loadingNotes && storageBreakdown && (
                <div className="category-percentage">
                  {storageBreakdown.plugins.percentage}% of total
                </div>
              )}
            </div>
          </div>

          {/* Storage Total - Separated */}
          <div className="storage-separator">
            <span>=</span>
            <span className="separator-label">Total Storage</span>
            <span>=</span>
          </div>

          <div className="storage-total-card">
            <div className="total-size">
              {loadingNotes ? '...' : formatStorageSize(storageBreakdown?.total.size || 0)}
            </div>
            {!loadingNotes && storageBreakdown && (
              <div className="total-breakdown">
                Notes {storageBreakdown.notes.percentage}% •
                Conversations {storageBreakdown.conversations.percentage}% •
                Settings {storageBreakdown.settings.percentage}% •
                Plugins {storageBreakdown.plugins.percentage}%
                {storageBreakdown.other.percentage > 0 && ` • Other ${storageBreakdown.other.percentage}%`}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="notes-actions">
            <div className="notes-action-group">
              <h3>Backup & Restore</h3>
              <p className="help-text" style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
                <strong>Export:</strong> Download all your notes as JSON (for backup/restore) or as individual markdown files (for portability). Markdown export creates a zip file with one .md file per note including metadata.
                <br /><br />
                <strong>Import:</strong> Upload a previously exported JSON file to restore notes. When importing, notes are merged with existing notes. Duplicate notes (same ID) are skipped, ensuring you can safely re-import the same file without creating duplicates.
              </p>
              <div className="button-group">
                <button
                  onClick={handleExportNotes}
                  disabled={notesCount === 0 || loadingNotes}
                  className="btn btn-primary"
                  title="Download all notes as JSON file"
                >
                  Export All Notes
                </button>
                <button
                  onClick={handleExportNotesAsMarkdown}
                  disabled={notesCount === 0 || loadingNotes}
                  className="btn btn-primary"
                  title="Download all notes as individual markdown files in a zip"
                >
                  Export as Markdown
                </button>
                <label className="btn btn-primary" style={{ margin: 0 }}>
                  Import Notes
                  <input
                    type="file"
                    accept="application/json,.json"
                    onChange={handleImportNotes}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            </div>

            <div className="notes-action-group">
              <h3>Delete All Notes</h3>
              <button
                onClick={handleClearAllNotes}
                disabled={notesCount === 0 || loadingNotes}
                className="btn btn-danger"
                title="Permanently delete all notes"
              >
                Clear All Notes
              </button>
              <p className="help-text" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                Warning: This will permanently delete all {notesCount} notes. Export first to backup!
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
    </>
  );
}

// Render the settings page
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<SettingsPage />);
}
