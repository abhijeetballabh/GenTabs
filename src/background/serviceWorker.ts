import { getAllTabs } from '../api/tabs.api';
import { filterTabs, prepareTabs } from '../core/sweep';
import { createGroup } from '../core/group';
import { saveGroup } from '../api/storage.api';

const handleSaveSession = async (scope: 'current' | 'all') => {
  try {
    console.log(`1. get tabs (${scope} windows)`);
    const allTabs = await getAllTabs(scope === 'current');
    if (!allTabs || allTabs.length === 0) {
      console.log('No tabs found.');
      return;
    }

    console.log('2. filter tabs');
    const tabsToSweep = filterTabs(allTabs);
    if (tabsToSweep.length === 0) {
      console.log('No eligible tabs to save.');
      return;
    }

    console.log('3. transform tabs');
    const customTabs = prepareTabs(tabsToSweep);

    console.log('4. create group');
    const newGroup = createGroup(customTabs, scope);

    console.log('5. save group');
    await saveGroup(newGroup);

    console.log('6. DO NOT close tabs - operation complete.');
  } catch (error) {
    console.error('Error during save session operation:', error);
    throw error;
  }
};

chrome.runtime.onMessage.addListener((message: any, _sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
  if (message?.type === 'SAVE_CURRENT_SESSION' || message?.type === 'SAVE_ALL_SESSION') {
    console.log(`Received ${message.type} message`);
    const scope = message.type === 'SAVE_CURRENT_SESSION' ? 'current' : 'all';
    
    handleSaveSession(scope)
      .then(() => sendResponse({ success: true }))
      .catch((err) => {
        console.error('Save session failed:', err);
        sendResponse({ success: false, error: String(err) });
      });
    return true; // Keep message channel open for async response
  }
});
