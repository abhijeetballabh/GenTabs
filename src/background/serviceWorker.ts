import { getAllTabs } from '../api/tabs.api';
import { filterTabs, prepareTabs } from '../core/sweep';
import { createGroup } from '../core/group';
import { saveGroup, getCustomGroups } from '../api/storage.api';
import { trackDomainVisit, trackDailyTabCount } from '../utils/analytics';

const handleSaveSession = async (scope: 'current' | 'all') => {
  try {
    const allTabs = await getAllTabs(scope === 'current');
    if (!allTabs || allTabs.length === 0) return;
    const tabsToSweep = filterTabs(allTabs);
    if (tabsToSweep.length === 0) return;
    const customTabs = prepareTabs(tabsToSweep);
    const newGroup = createGroup(customTabs, scope);
    await saveGroup(newGroup);
  } catch (error) {
    console.error('Error during save session operation:', error);
    throw error;
  }
};

chrome.runtime.onMessage.addListener((message: any, _sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
  if (message?.type === 'SAVE_CURRENT_SESSION' || message?.type === 'SAVE_ALL_SESSION') {
    const scope = message.type === 'SAVE_CURRENT_SESSION' ? 'current' : 'all';
    handleSaveSession(scope)
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: String(err) }));
    return true; 
  }
});

// Analytics Tracking
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url) {
      const urlObj = new URL(tab.url);
      const domain = urlObj.hostname.replace(/^www\./, '');
      await trackDomainVisit(domain);
    }
  } catch (e) {
    // ignore
  }
});

chrome.tabs.onRemoved.addListener(async () => {
  try {
    const tabs = await chrome.tabs.query({});
    await trackDailyTabCount(tabs.length);
    updateBadge(tabs.length);
  } catch(e) {
    // ignore
  }
});

chrome.tabs.onCreated.addListener(async () => {
  try {
    const tabs = await chrome.tabs.query({});
    await trackDailyTabCount(tabs.length);
    updateBadge(tabs.length);
  } catch(e) {
    // ignore
  }
});

const updateBadge = (count: number) => {
  try {
    chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
    chrome.action.setBadgeBackgroundColor({ color: count > 20 ? '#ef4444' : '#2563eb' });
  } catch (e) { /* ignore */ }
};

// Set badge on extension startup
chrome.runtime.onInstalled.addListener(async () => {
  try {
    const tabs = await chrome.tabs.query({});
    updateBadge(tabs.length);
  } catch(e) { /* ignore */ }
});

// Scheduled Workspace Restore on Startup
chrome.runtime.onStartup.addListener(async () => {
  try {
    const customGroups = await getCustomGroups();
    for (const group of customGroups) {
      if (group.schedule?.onLaunch && group.tabs.length > 0) {
        const urls = group.tabs.map(t => t.url).filter(Boolean);
        if (urls.length > 0) {
          await chrome.windows.create({ url: urls, focused: false });
        }
      }
    }
  } catch (error) {
    console.error('Startup schedule check failed', error);
  }
});

// Alarms for Read Later and Time-based Schedules
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('daily-read-later-check', { periodInMinutes: 1440 });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'daily-read-later-check') {
    try {
      const groups = await getCustomGroups();
      const readLater = groups.find(g => g.id === 'read-later');
      if (readLater && readLater.tabs.length > 0) {
        let oldItems = 0;
        const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);
        readLater.tabs.forEach(t => {
          if (t.lastAccessed && t.lastAccessed < threeDaysAgo) {
            oldItems++;
          }
        });
        
        if (oldItems > 0) {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icon-128.png', // Fallback, assumed to exist or use default
            title: 'GenTabs',
            message: `You have ${readLater.tabs.length} unread items in Read Later. ${oldItems} are older than 3 days.`,
            priority: 1
          });
        }
      }
    } catch(e) {
      console.error(e);
    }
  } else if (alarm.name.startsWith('scheduled-restore-')) {
    const groupId = alarm.name.replace('scheduled-restore-', '');
    try {
      const groups = await getCustomGroups();
      const group = groups.find(g => g.id === groupId);
      if (group && group.tabs.length > 0) {
        const urls = group.tabs.map(t => t.url).filter(Boolean);
        if (urls.length > 0) {
          await chrome.windows.create({ url: urls, focused: true });
        }
      }
    } catch(e) {
      console.error(e);
    }
  }
});
