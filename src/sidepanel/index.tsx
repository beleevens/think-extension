import React from 'react';
import ReactDOM from 'react-dom/client';
import { ChatPanel } from './ChatPanel';
import { registerBuiltInPlugins, listenToPluginChanges } from '../plugins/registry';
import './styles.css';

// Initialize plugin system (async)
registerBuiltInPlugins().then(() => {

  // Listen for plugin changes (hot-reload)
  listenToPluginChanges(() => {
  });
}).catch((err) => {
  console.error('[Sidepanel] Failed to initialize plugin system:', err);
});

function App() {
  return (
    <div className="app-container">
      <ChatPanel />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
