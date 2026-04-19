export interface Tab {
  url: string;
  title: string;
  favicon: string;
  domain: string;
}

export interface Group {
  id: string;
  name: string;
  createdAt: number;
  tabs: Tab[];
}
