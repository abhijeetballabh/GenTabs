export interface Tab {
  url: string;
  title: string;
  favicon: string;
  domain: string;
  lastAccessed?: number;
  note?: string;
  readTime?: number;
}
