import type { Tab } from './tab';

export interface Group {
  id: string;
  name: string;
  createdAt: number;
  tabs: Tab[];
  windowScope?: 'current' | 'all';
  isPinned?: boolean;
}
