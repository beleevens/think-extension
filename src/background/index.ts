import { captureCurrentPage, captureSelection, canCapturePage } from '../lib/page-capture';

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
      await chrome.runtime.sendMessage({
        type: 'offscreen.send',
        message: {
          type: 'chat.message',
          id: `sel-${Date.now()}`,
          content: `Selected text:\n\n${info.selectionText}`,
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

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type === 'capture-page') {
    captureCurrentPage()
      .then(sendResponse)
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }

  if (request.type === 'capture-selection') {
    captureSelection()
      .then(sendResponse)
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }

  if (request.type === 'ping') {
    sendResponse({ pong: true });
    return false;
  }

  return false;
});
