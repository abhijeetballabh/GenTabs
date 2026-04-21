import type { Tab } from '../types/tab';
import { mapChromeTabToTab } from '../api/tabs.api';

export const filterTabs = (tabs: chrome.tabs.Tab[]): chrome.tabs.Tab[] => {
  return tabs.filter(tab => {
    const url = tab.url || tab.pendingUrl || '';
    if (!url) return false;
    if (url.startsWith('chrome-extension://')) return false;
    if (url.startsWith('chrome://')) return false;
    if (url.startsWith('about:')) return false;
    if (url === 'chrome://newtab/' || url === 'about:newtab') return false;
    return true;
  });
};


export const prepareTabs = (tabs: chrome.tabs.Tab[]): Tab[] => {
  return tabs.map(mapChromeTabToTab);
};
