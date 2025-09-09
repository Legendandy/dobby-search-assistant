// Background script for handling extension lifecycle and API calls

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    
    chrome.runtime.openOptionsPage();
    
    
    await chrome.storage.sync.set({ firstInstall: true });
  }
});


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openOptions') {
    chrome.runtime.openOptionsPage();
  }
  
  return true;
});

chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});