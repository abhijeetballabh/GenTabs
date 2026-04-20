import type { Tab } from '../types/tab';
import type { Group } from '../types/group';

export const createGroup = (tabs: Tab[], windowScope?: 'current' | 'all'): Group => {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    name: "Session " + now,
    createdAt: now,
    tabs: tabs,
    windowScope
  };
};
