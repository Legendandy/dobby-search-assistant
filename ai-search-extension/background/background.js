// Background script for handling extension lifecycle and API calls

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    // Open options page on first install
    chrome.runtime.openOptionsPage();
    
    // Set first install flag
    await chrome.storage.sync.set({ firstInstall: true });
  }
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openOptions') {
    chrome.runtime.openOptionsPage();
  }
  
  return true;
});

// Optional: Handle extension icon click
chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});