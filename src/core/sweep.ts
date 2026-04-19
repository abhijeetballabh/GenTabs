import type { Tab } from '../types/tab';
import { mapChromeTabToTab } from '../api/tabs.api';

export const filterTabs = (tabs: chrome.tabs.Tab[]): chrome.tabs.Tab[] => {
  return tabs.filter(tab => !tab.pinned && !tab.active && !tab.audible);
};

export const prepareTabs = (tabs: chrome.tabs.Tab[]): Tab[] => {
  return tabs.map(mapChromeTabToTab);
};
