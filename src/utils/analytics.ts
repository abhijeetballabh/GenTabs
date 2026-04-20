export interface AnalyticsData {
  domainVisits: Record<string, number>;
  dailyTabCounts: Record<string, number>;
  peakTabCount: number;
  workspaceOpenCounts: Record<string, number>;
}

const ANALYTICS_KEY = 'gentabs_analytics';

export const getAnalytics = async (): Promise<AnalyticsData> => {
  try {
    const result = await chrome.storage.local.get(ANALYTICS_KEY);
  return (result[ANALYTICS_KEY] as AnalyticsData) || {
    domainVisits: {},
    dailyTabCounts: {},
    peakTabCount: 0,
    workspaceOpenCounts: {}
  };
  } catch (error) {
    console.error('Failed to get analytics:', error);
    return { domainVisits: {}, dailyTabCounts: {}, peakTabCount: 0, workspaceOpenCounts: {} };
  }
};

export const saveAnalytics = async (data: AnalyticsData): Promise<void> => {
  try {
    await chrome.storage.local.set({ [ANALYTICS_KEY]: data });
  } catch (error) {
    console.error('Failed to save analytics:', error);
  }
};

export const trackDomainVisit = async (domain: string) => {
  if (!domain || domain === 'unknown' || domain === 'newtab') return;
  const data = await getAnalytics();
  data.domainVisits[domain] = (data.domainVisits[domain] || 0) + 1;
  await saveAnalytics(data);
};

export const trackDailyTabCount = async (count: number) => {
  const data = await getAnalytics();
  const today = new Date().toISOString().split('T')[0];
  data.dailyTabCounts[today] = Math.max(data.dailyTabCounts[today] || 0, count);
  if (count > data.peakTabCount) {
    data.peakTabCount = count;
  }
  
  // Prune history to 30 days
  const keys = Object.keys(data.dailyTabCounts).sort();
  if (keys.length > 30) {
    const keysToRemove = keys.slice(0, keys.length - 30);
    keysToRemove.forEach(k => delete data.dailyTabCounts[k]);
  }
  
  await saveAnalytics(data);
};

export const trackWorkspaceOpen = async (groupId: string) => {
  const data = await getAnalytics();
  data.workspaceOpenCounts[groupId] = (data.workspaceOpenCounts[groupId] || 0) + 1;
  await saveAnalytics(data);
};

export const resetAnalytics = async () => {
  await chrome.storage.local.remove(ANALYTICS_KEY);
};
