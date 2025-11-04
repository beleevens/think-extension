import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SaveNoteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  pageTitle: string;
  pageUrl: string;
  isSaving?: boolean;
  savedNoteId?: string;
}

type DialogState = 'form' | 'saving' | 'success';

export function SaveNoteDialog({
  isOpen,
  onClose,
  onSave,
  pageTitle,
  pageUrl,
  isSaving = false,
  savedNoteId,
}: SaveNoteDialogProps) {
  const [dialogState, setDialogState] = useState<DialogState>('form');

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setDialogState('form');
    }
  }, [isOpen]);

  // Update dialog state based on isSaving prop
  useEffect(() => {
    if (isSaving) {
      setDialogState('saving');
    } else if (dialogState === 'saving') {
      // Transition to success state
      setDialogState('success');
      // Auto-close after showing success animation
      const timer = setTimeout(() => {
        setDialogState('form');
        onClose();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isSaving, dialogState, onClose]);

  const handleSave = () => {
    onSave();
  };

  const handleCancel = () => {
    onClose();
  };

  const handleViewNote = async () => {
    if (savedNoteId) {
      const notesUrl = chrome.runtime.getURL(`src/notes/notes.html#note=${savedNoteId}`);
      const tabs = await chrome.tabs.query({ url: chrome.runtime.getURL('src/notes/notes.html') });
      if (tabs.length > 0 && tabs[0].id) {
        await chrome.tabs.update(tabs[0].id, { url: notesUrl, active: true });
        await chrome.windows.update(tabs[0].windowId!, { focused: true });
      } else {
        await chrome.tabs.create({ url: notesUrl });
      }
      onClose();
    }
  };

  // Ripple effect component
  const RippleEffect = () => (
    <motion.div
      initial={{ scale: 0, opacity: 0.8 }}
      animate={{ scale: 3, opacity: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="absolute inset-0 rounded-lg bg-gradient-to-r from-indigo-500/20 to-purple-500/20"
      style={{ transformOrigin: 'center' }}
    />
  );

  // Unified clipboard transition with seamless content morphing
  const ClipboardTransition = ({ isSuccess }: { isSuccess: boolean }) => (
    <motion.div className="relative">
      {/* Persistent clipboard with smooth color transition */}
      <motion.div
        animate={{
          color: isSuccess ? 'hsl(var(--primary))' : 'hsl(var(--primary))', // Keep primary for consistency
        }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <motion.svg
          xmlns="http://www.w3.org/2000/svg"
          width={64}
          height={64}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Clipboard base - always visible */}
          <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />

          {/* List items - fade out with stagger when success */}
          <AnimatePresence>
            {!isSuccess && (
              <>
                <motion.path
                  d="M8 11h.01"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    pathLength: { duration: 0.3, delay: 0.2 },
                    opacity: { duration: 0.3 },
                    exit: { duration: 0.15 },
                  }}
                />
                <motion.path
                  d="M12 11h4"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    pathLength: { duration: 0.3, delay: 0.4 },
                    opacity: { duration: 0.3 },
                    exit: { duration: 0.15, delay: 0.1 },
                  }}
                />
                <motion.path
                  d="M8 16h.01"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    pathLength: { duration: 0.3, delay: 0.6 },
                    opacity: { duration: 0.3 },
                    exit: { duration: 0.15, delay: 0.2 },
                  }}
                />
                <motion.path
                  d="M12 16h4"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    pathLength: { duration: 0.3, delay: 0.8 },
                    opacity: { duration: 0.3 },
                    exit: { duration: 0.15, delay: 0.3 },
                  }}
                />
              </>
            )}
          </AnimatePresence>

          {/* Checkmark - draws in after list exits */}
          <AnimatePresence>
            {isSuccess && (
              <motion.path
                d="m9 14 2 2 4-4"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{
                  pathLength: { duration: 0.6, delay: 0.5 },
                  opacity: { duration: 0.3, delay: 0.5 },
                }}
              />
            )}
          </AnimatePresence>
        </motion.svg>
      </motion.div>

      {/* Success ripple rings */}
      <AnimatePresence>
        {isSuccess && (
          <>
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, opacity: 0.6 }}
                animate={{ scale: 2 + i, opacity: 0 }}
                transition={{ delay: 0.8 + i * 0.15, duration: 0.8 }}
                className="absolute inset-0 border-2 border-emerald-400 rounded-full"
                style={{ transformOrigin: 'center' }}
              />
            ))}
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );

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
          onClick={handleCancel}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{
              opacity: 1,
              scale: dialogState === 'success' ? 1.05 : 1,
              y: 0
            }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`rounded-lg shadow-lg w-full max-w-lg mx-4 overflow-hidden relative ${
              dialogState === 'success' ? 'save-dialog-success-glow' : ''
            }`}
            style={{ backgroundColor: 'hsl(var(--card))' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ripple effect overlay */}
            <AnimatePresence>
              {dialogState === 'saving' && <RippleEffect />}
            </AnimatePresence>

            {/* Form Content */}
            <AnimatePresence mode="wait">
              {dialogState === 'form' && (
                <motion.div
                  key="form"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Header */}
                  <div className="px-6 py-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    <h2 className="text-lg font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Save Page as Note</h2>
                    <p className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>Save this page to your notes collection</p>
                  </div>

                  {/* Content */}
                  <div className="px-6 py-4 space-y-4">
                    {/* Page Title Preview */}
                    <div>
                      <label className="text-sm font-medium block mb-1" style={{ color: 'hsl(var(--foreground))' }}>
                        Page Title
                      </label>
                      <div className="text-sm px-3 py-2 rounded-md" style={{
                        color: 'hsl(var(--foreground))',
                        backgroundColor: 'hsl(var(--muted))',
                        border: '1px solid hsl(var(--border))'
                      }}>
                        {pageTitle || 'Untitled Page'}
                      </div>
                    </div>

                    {/* URL Preview */}
                    <div>
                      <label className="text-sm font-medium block mb-1" style={{ color: 'hsl(var(--foreground))' }}>
                        URL
                      </label>
                      <div className="text-sm px-3 py-2 rounded-md truncate" style={{
                        color: 'hsl(var(--muted-foreground))',
                        backgroundColor: 'hsl(var(--muted))',
                        border: '1px solid hsl(var(--border))'
                      }} title={pageUrl}>
                        {pageUrl}
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-6 py-4 flex justify-end gap-2" style={{ borderTop: '1px solid hsl(var(--border))' }}>
                    <button
                      onClick={handleCancel}
                      className="px-4 py-2 text-sm font-medium rounded-md transition-colors"
                      style={{
                        color: 'hsl(var(--foreground))',
                        backgroundColor: 'hsl(var(--secondary))',
                        border: '1px solid hsl(var(--border))'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      className="px-4 py-2 text-sm font-medium rounded-md transition-colors"
                      style={{
                        color: 'hsl(var(--primary-foreground))',
                        backgroundColor: 'hsl(var(--primary))'
                      }}
                    >
                      Save Note
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Unified Clipboard Animation for both saving and success */}
              {(dialogState === 'saving' || dialogState === 'success') && (
                <motion.div
                  key="clipboard-animation"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col items-center justify-center py-8 px-6"
                >
                  <ClipboardTransition isSuccess={dialogState === 'success'} />

                  <motion.p
                    key={dialogState}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="mt-6 text-lg font-medium"
                    style={{ color: 'hsl(var(--foreground))' }}
                  >
                    {dialogState === 'saving' ? 'Saving your note...' : 'Note saved successfully!'}
                  </motion.p>

                  {/* Reserve button space in both states for consistent height */}
                  <div className="mt-4 h-10 flex items-center justify-center">
                    {dialogState === 'success' && savedNoteId && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                      >
                        <button
                          onClick={handleViewNote}
                          className="btn btn-secondary"
                        >
                          View note
                        </button>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
