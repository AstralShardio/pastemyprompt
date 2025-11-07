// Service worker for PasteMyPrompt
// Currently minimal - can be extended for future sync features

chrome.runtime.onInstalled.addListener(() => {
  console.log('PasteMyPrompt extension installed');
});

// Listen for storage changes if needed in the future
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local') {
    // Future: sync to cloud or handle changes
    console.log('Storage changed:', changes);
  }
});

