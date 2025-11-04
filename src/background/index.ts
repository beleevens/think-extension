import { captureCurrentPage, captureSelection, canCapturePage } from '../lib/page-capture';

// Security: Rate limiting for message processing
const messageRateLimiter = new Map<string, { count: number; resetTime: number }>();
const MAX_MESSAGES_PER_MINUTE = 60;
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute

// Security: Content size limits
const MAX_SELECTION_SIZE = 100 * 1024; // 100KB
const MAX_MESSAGE_SIZE = 200 * 1024; // 200KB

/**
 * Check if a sender is from this extension
 */
function isTrustedSender(sender: chrome.runtime.MessageSender): boolean {
  // Allow messages from within the extension
  if (sender.id === chrome.runtime.id) {
    return true;
  }

  // Allow messages from extension contexts (background, popup, sidepanel, etc.)
  if (sender.origin === `chrome-extension://${chrome.runtime.id}`) {
    return true;
  }

  return false;
}

/**
 * Check rate limit for a sender
 */
function checkRateLimit(senderId: string): boolean {
  const now = Date.now();
  const senderData = messageRateLimiter.get(senderId);

  if (!senderData || now > senderData.resetTime) {
    // Reset or create new entry
    messageRateLimiter.set(senderId, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS
    });
    return true;
  }

  if (senderData.count >= MAX_MESSAGES_PER_MINUTE) {
    console.warn(`[Background] Rate limit exceeded for sender: ${senderId}`);
    return false;
  }

  senderData.count++;
  return true;
}

/**
 * Validate message structure and content
 */
function validateMessage(message: any): { valid: boolean; error?: string } {
  if (!message || typeof message !== 'object') {
    return { valid: false, error: 'Invalid message format' };
  }

  if (typeof message.type !== 'string') {
    return { valid: false, error: 'Message must have a type' };
  }

  // Check message size
  const messageSize = JSON.stringify(message).length;
  if (messageSize > MAX_MESSAGE_SIZE) {
    return { valid: false, error: `Message too large: ${messageSize} bytes (max ${MAX_MESSAGE_SIZE})` };
  }

  // Validate specific message types
  if (message.type === 'offscreen.send') {
    if (!message.message || typeof message.message !== 'object') {
      return { valid: false, error: 'offscreen.send requires message object' };
    }
  }

  return { valid: true };
}

/**
 * Sanitize selection text to prevent XSS and limit size
 */
function sanitizeSelectionText(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // Limit size
  if (text.length > MAX_SELECTION_SIZE) {
    console.warn(`[Background] Selection text truncated from ${text.length} to ${MAX_SELECTION_SIZE} bytes`);
    return text.substring(0, MAX_SELECTION_SIZE) + '... [truncated]';
  }

  // Remove null bytes and other problematic characters
  return text.replace(/\0/g, '').trim();
}

chrome.runtime.onStartup.addListener(() => {});

try {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
} catch (error) {
  console.error('[Background] Side panel setup failed:', error);
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'share-selection',
      title: 'Share with Think',
      contexts: ['selection'],
    });

    chrome.contextMenus.create({
      id: 'share-page',
      title: 'Share Page with Think',
      contexts: ['page'],
    });

    chrome.contextMenus.create({
      id: 'open-notes',
      title: 'Open My Notes',
      contexts: ['page', 'action'],
    });
  });

  try {
    chrome.sidePanel.setOptions({
      path: 'src/sidepanel/index.html',
      enabled: true,
    });
  } catch (error) {
    console.error('[Background] Side panel options failed:', error);
  }
});

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.windowId) return;

  try {
    await chrome.sidePanel.open({ windowId: tab.windowId });
  } catch (error) {
    console.error('[Background] Failed to open side panel:', error);
  }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;

  try {
    if (info.menuItemId === 'share-selection' && info.selectionText) {
      // Security: Sanitize and limit selection text size
      const sanitizedText = sanitizeSelectionText(info.selectionText);

      if (!sanitizedText) {
        console.error('[Background] Selection text is empty after sanitization');
        return;
      }

      await chrome.runtime.sendMessage({
        type: 'offscreen.send',
        message: {
          type: 'chat.message',
          id: `sel-${Date.now()}`,
          content: `Selected text:\n\n${sanitizedText}`,
          timestamp: Date.now(),
        },
      });

      chrome.sidePanel.open({ tabId: tab.id });
    }

    if (info.menuItemId === 'share-page') {
      // Check if the current page can be captured
      const currentTab = await chrome.tabs.get(tab.id);
      if (!canCapturePage(currentTab.url)) {
        return;
      }

      const pageData = await captureCurrentPage();

      await chrome.runtime.sendMessage({
        type: 'offscreen.send',
        message: {
          type: 'page.share',
          id: `page-${Date.now()}`,
          pageData,
          action: 'chat',
          timestamp: Date.now(),
        },
      });

      chrome.sidePanel.open({ tabId: tab.id });
    }

    if (info.menuItemId === 'open-notes') {
      chrome.tabs.create({
        url: chrome.runtime.getURL('src/notes/notes.html'),
      });
    }
  } catch (error) {
    console.error('[Background] Context menu action failed:', error);
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Security: Verify sender is from this extension
  if (!isTrustedSender(sender)) {
    console.error('[Background] Untrusted message sender:', sender);
    sendResponse({ error: 'Unauthorized sender' });
    return false;
  }

  // Security: Validate message format and size
  const validation = validateMessage(request);
  if (!validation.valid) {
    console.error('[Background] Invalid message:', validation.error);
    sendResponse({ error: validation.error });
    return false;
  }

  // Security: Check rate limit
  const senderId = sender.id || sender.origin || 'unknown';
  if (!checkRateLimit(senderId)) {
    sendResponse({ error: 'Rate limit exceeded. Please try again later.' });
    return false;
  }

  // Handle different message types
  if (request.type === 'capture-page') {
    captureCurrentPage()
      .then(sendResponse)
      .catch(error => {
        console.error('[Background] Page capture error:', error);
        sendResponse({ error: error.message });
      });
    return true; // Async response
  }

  if (request.type === 'capture-selection') {
    captureSelection()
      .then(sendResponse)
      .catch(error => {
        console.error('[Background] Selection capture error:', error);
        sendResponse({ error: error.message });
      });
    return true; // Async response
  }

  if (request.type === 'ping') {
    sendResponse({ pong: true });
    return false;
  }

  // Unknown message type
  console.warn('[Background] Unknown message type:', request.type);
  sendResponse({ error: 'Unknown message type' });
  return false;
});
