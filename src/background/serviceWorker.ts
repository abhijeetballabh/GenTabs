import { getAllTabs } from '../api/tabs.api';
import { filterTabs, prepareTabs } from '../core/sweep';
import { createGroup } from '../core/group';
import { saveGroup } from '../api/storage.api';

const handleSaveSession = async () => {
  try {
    console.log('1. get tabs (current window only)');
    const allTabs = await getAllTabs();
    if (!allTabs || allTabs.length === 0) {
      console.log('No tabs found in current window.');
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
    const newGroup = createGroup(customTabs);

    console.log('5. save group');
    await saveGroup(newGroup);

    console.log('6. DO NOT close tabs - operation complete.');
  } catch (error) {
    console.error('Error during save session operation:', error);
  }
};

chrome.runtime.onMessage.addListener((message: any, _sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
  if (message?.type === 'SAVE_SESSION') {
    console.log('Received SAVE_SESSION message');
    handleSaveSession()
      .then(() => sendResponse({ success: true }))
      .catch((err) => {
        console.error('Save session failed:', err);
        sendResponse({ success: false, error: String(err) });
      });
    return true; // Keep message channel open for async response
  }
});
