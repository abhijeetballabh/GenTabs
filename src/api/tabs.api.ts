import type { Tab } from '../types/tab';

export const getAllTabs = async (currentWindowOnly: boolean = true): Promise<chrome.tabs.Tab[]> => {
  try {
    const query = currentWindowOnly ? { currentWindow: true } : {};
    return await chrome.tabs.query(query);
  } catch (error) {
    console.error('Error fetching tabs:', error);
    return [];
  }
};

export const closeTabs = async (tabIds: number[]): Promise<void> => {
  try {
    if (tabIds.length > 0) {
      await chrome.tabs.remove(tabIds);
    }
  } catch (error) {
    console.error('Error closing tabs:', error);
  }
};

export const mapChromeTabToTab = (tab: chrome.tabs.Tab): Tab => {
  const url = tab.url || tab.pendingUrl || '';
  const title = tab.title || 'Untitled Tab';
  
  let domain = 'unknown';
  try {
    if (url) {
      const urlObj = new URL(url);
      domain = urlObj.hostname.replace(/^www\./, '');
    }
  } catch (e) {
    console.warn(`Failed to parse domain for url: ${url}`);
  }

  // Google favicon service fallback
  const fallbackFavicon = url ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : '';
  const favicon = tab.favIconUrl || fallbackFavicon;

  return {
    url,
    title,
    favicon,
    domain,
    lastAccessed: tab.lastAccessed
  };
};
