import { motion, AnimatePresence } from 'framer-motion';

interface OllamaSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OllamaSetupModal({ isOpen, onClose }: OllamaSetupModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="rounded-lg shadow-lg w-full max-w-2xl mx-4 overflow-hidden"
            style={{
              backgroundColor: 'hsl(var(--card))',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
              <h2 className="text-lg font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                Ollama Setup Instructions
              </h2>
              <p className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                Follow these steps to configure Ollama for use with this extension
              </p>
            </div>

            {/* Content */}
            <div
              className="px-6 py-4 space-y-6"
              style={{
                overflowY: 'auto',
                flex: 1,
                minHeight: 0
              }}
            >
              {/* Security Warning */}
              <div
                className="p-4 rounded-md"
                style={{
                  backgroundColor: 'hsl(var(--destructive) / 0.1)',
                  border: '2px solid hsl(var(--destructive))',
                }}
              >
                <div className="text-sm font-semibold mb-2" style={{ color: 'hsl(var(--destructive))' }}>
                  ⚠️ Important Security Information
                </div>
                <p className="text-sm" style={{ color: 'hsl(var(--foreground))', lineHeight: '1.5' }}>
                  Ollama runs locally on your machine and requires CORS configuration. We provide two options below:
                  a <strong>secure option</strong> (recommended) that only allows this extension, and a
                  <strong> permissive option</strong> that allows all applications. Choose based on your security needs.
                </p>
              </div>

              {/* Step 1: Enable CORS */}
              <div>
                <h3 className="text-base font-semibold mb-3" style={{ color: 'hsl(var(--foreground))' }}>
                  Step 1: Enable CORS for Browser Extension
                </h3>
                <p className="text-sm mb-3" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  Ollama needs to allow requests from browser extensions. Choose one of the following options:
                </p>

                {/* Option A: Secure (Recommended) */}
                <div className="mb-4 p-3 rounded-md" style={{ backgroundColor: 'hsl(var(--accent))', border: '1px solid hsl(var(--border))' }}>
                  <div className="text-sm font-semibold mb-2" style={{ color: 'hsl(var(--foreground))' }}>
                    ✅ Option A: Secure (Recommended)
                  </div>
                  <p className="text-sm mb-2" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Only allow this extension to access Ollama:
                  </p>

                  {/* macOS/Linux */}
                  <div className="mb-2">
                    <div className="text-xs font-medium mb-1" style={{ color: 'hsl(var(--foreground))' }}>
                      macOS / Linux:
                    </div>
                    <code
                      className="block text-xs px-3 py-2 rounded-md font-mono break-all"
                      style={{
                        color: 'hsl(var(--foreground))',
                        backgroundColor: 'hsl(var(--muted))',
                        border: '1px solid hsl(var(--border))',
                      }}
                    >
                      export OLLAMA_ORIGINS="chrome-extension://{chrome.runtime.id}"
                    </code>
                  </div>

                  {/* Windows */}
                  <div>
                    <div className="text-xs font-medium mb-1" style={{ color: 'hsl(var(--foreground))' }}>
                      Windows (PowerShell):
                    </div>
                    <code
                      className="block text-xs px-3 py-2 rounded-md font-mono break-all"
                      style={{
                        color: 'hsl(var(--foreground))',
                        backgroundColor: 'hsl(var(--muted))',
                        border: '1px solid hsl(var(--border))',
                      }}
                    >
                      $env:OLLAMA_ORIGINS="chrome-extension://{chrome.runtime.id}"
                    </code>
                  </div>
                </div>

                {/* Option B: Permissive */}
                <div className="mb-3 p-3 rounded-md" style={{ backgroundColor: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))' }}>
                  <div className="text-sm font-semibold mb-2" style={{ color: 'hsl(var(--foreground))' }}>
                    ⚡ Option B: Permissive (Easier but less secure)
                  </div>
                  <p className="text-sm mb-2" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Allow all applications to access Ollama (simpler but allows any app on your computer):
                  </p>

                  {/* macOS/Linux */}
                  <div className="mb-2">
                    <div className="text-xs font-medium mb-1" style={{ color: 'hsl(var(--foreground))' }}>
                      macOS / Linux:
                    </div>
                    <code
                      className="block text-xs px-3 py-2 rounded-md font-mono"
                      style={{
                        color: 'hsl(var(--foreground))',
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                      }}
                    >
                      export OLLAMA_ORIGINS="*"
                    </code>
                  </div>

                  {/* Windows */}
                  <div>
                    <div className="text-xs font-medium mb-1" style={{ color: 'hsl(var(--foreground))' }}>
                      Windows (PowerShell):
                    </div>
                    <code
                      className="block text-xs px-3 py-2 rounded-md font-mono"
                      style={{
                        color: 'hsl(var(--foreground))',
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                      }}
                    >
                      $env:OLLAMA_ORIGINS="*"
                    </code>
                  </div>

                  <p className="text-xs mt-2" style={{ color: 'hsl(var(--muted-foreground))', fontStyle: 'italic' }}>
                    ⚠️ With this option, any website or app on your computer can send requests to Ollama. This is generally safe for localhost-only Ollama, but Option A is more secure.
                  </p>
                </div>
              </div>

              {/* Step 2: Start Ollama */}
              <div>
                <h3 className="text-base font-semibold mb-3" style={{ color: 'hsl(var(--foreground))' }}>
                  Step 2: Start Ollama Server
                </h3>
                <p className="text-sm mb-3" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  After setting the environment variable, start the Ollama server on the default port (11434):
                </p>
                <code
                  className="block text-sm px-3 py-2 rounded-md font-mono mb-2"
                  style={{
                    color: 'hsl(var(--foreground))',
                    backgroundColor: 'hsl(var(--muted))',
                    border: '1px solid hsl(var(--border))',
                  }}
                >
                  ollama serve
                </code>
                <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  <strong>Note:</strong> This extension requires Ollama to run on port 11434 for security reasons. Do not change the port using OLLAMA_HOST.
                </p>
              </div>

              {/* Step 3: Install Models */}
              <div>
                <h3 className="text-base font-semibold mb-3" style={{ color: 'hsl(var(--foreground))' }}>
                  Step 3: Install a Model
                </h3>
                <p className="text-sm mb-3" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  If you haven't already, install a model to use:
                </p>
                <code
                  className="block text-sm px-3 py-2 rounded-md font-mono mb-3"
                  style={{
                    color: 'hsl(var(--foreground))',
                    backgroundColor: 'hsl(var(--muted))',
                    border: '1px solid hsl(var(--border))',
                  }}
                >
                  ollama pull llama3.2
                </code>
                <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  Browse more models at{' '}
                  <a
                    href="https://ollama.com/library"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'hsl(var(--primary))', textDecoration: 'underline' }}
                  >
                    ollama.com/library
                  </a>
                </p>
              </div>

              {/* Tip: Make it Permanent */}
              <div
                className="p-4 rounded-md"
                style={{
                  backgroundColor: 'hsl(var(--accent))',
                  border: '1px solid hsl(var(--border))',
                }}
              >
                <div className="text-sm font-semibold mb-2" style={{ color: 'hsl(var(--foreground))' }}>
                  💡 Tip: Make it Permanent
                </div>
                <p className="text-sm mb-2" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  To avoid setting <code style={{ backgroundColor: 'hsl(var(--muted))', padding: '2px 4px', borderRadius: '4px' }}>OLLAMA_ORIGINS</code> every time, add it to your shell profile.
                  Choose the command that matches your chosen option above:
                </p>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs font-medium mb-1" style={{ color: 'hsl(var(--foreground))' }}>
                      For Option A (Secure - Recommended):
                    </p>
                    <code
                      className="block text-xs px-3 py-2 rounded-md font-mono break-all"
                      style={{
                        color: 'hsl(var(--foreground))',
                        backgroundColor: 'hsl(var(--muted))',
                        border: '1px solid hsl(var(--border))',
                      }}
                    >
                      echo 'export OLLAMA_ORIGINS="chrome-extension://{chrome.runtime.id}"' &gt;&gt; ~/.zshrc
                    </code>
                  </div>
                  <div>
                    <p className="text-xs font-medium mb-1" style={{ color: 'hsl(var(--foreground))' }}>
                      For Option B (Permissive):
                    </p>
                    <code
                      className="block text-xs px-3 py-2 rounded-md font-mono"
                      style={{
                        color: 'hsl(var(--foreground))',
                        backgroundColor: 'hsl(var(--muted))',
                        border: '1px solid hsl(var(--border))',
                      }}
                    >
                      echo 'export OLLAMA_ORIGINS="*"' &gt;&gt; ~/.zshrc
                    </code>
                  </div>
                  <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))', fontStyle: 'italic' }}>
                    Note: If you use a different shell (bash, fish, etc.), replace <code style={{ backgroundColor: 'hsl(var(--muted))', padding: '2px 4px', borderRadius: '4px' }}>~/.zshrc</code> with your shell's config file.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 flex justify-end" style={{ borderTop: '1px solid hsl(var(--border))' }}>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium rounded-md transition-colors"
                style={{
                  color: 'hsl(var(--primary-foreground))',
                  backgroundColor: 'hsl(var(--primary))',
                }}
              >
                Got it
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
