import type { Tab } from '../types/tab';
import type { Group } from '../types/group';

export const createGroup = (tabs: Tab[], windowScope?: 'current' | 'all'): Group => {
  const now = Date.now();
  
  let name = "Session " + now;
  if (tabs.length > 0) {
    const domainCounts = new Map<string, number>();
    tabs.forEach(t => {
      const d = t.domain.replace(/^www\./, '');
      if (d && d !== 'unknown') {
        domainCounts.set(d, (domainCounts.get(d) || 0) + 1);
      }
    });
    
    if (domainCounts.size > 0) {
      const sortedDomains = Array.from(domainCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(e => e[0]);
        
      const dateStr = new Date(now).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      if (sortedDomains.length === 1) {
        name = `${sortedDomains[0]} — ${tabs.length} tabs — ${dateStr}`;
      } else {
        const topDomains = sortedDomains.slice(0, 3).join(' · ');
        name = `${topDomains} — ${dateStr}`;
      }
    }
  }

  return {
    id: crypto.randomUUID(),
    name,
    createdAt: now,
    tabs: tabs,
    windowScope
  };
};
