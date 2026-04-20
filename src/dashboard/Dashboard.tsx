import React, { useEffect, useState, useRef } from 'react';
import type { DragEvent } from 'react';
import { 
  getAllGroups, 
  deleteGroup, 
  getCustomGroups, 
  saveCustomGroup, 
  updateCustomGroup, 
  deleteCustomGroup,
  updateGroup
} from '../api/storage.api';
import type { Group } from '../types/group';
import type { Tab } from '../types/tab';
import { showToast } from '../utils/toast';
import { getAnalytics } from '../utils/analytics';
import type { AnalyticsData } from '../utils/analytics';

export const Dashboard: React.FC = () => {
  const [sessions, setSessions] = useState<Group[]>([]);
  const [customGroups, setCustomGroups] = useState<Group[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'most_tabs' | 'least_tabs'>('newest');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const [expandedSessions, setExpandedSessions] = useState<Record<string, boolean>>({});
  const [expandedCustom, setExpandedCustom] = useState<Record<string, boolean>>({});
  const [initialExpandedSet, setInitialExpandedSet] = useState(false);

  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);

  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingSessionName, setEditingSessionName] = useState('');

  const [floatingEditorGroup, setFloatingEditorGroup] = useState<Group | null>(null);
  const [dragOverEditor, setDragOverEditor] = useState(false);

  // Floating panel drag & resize state
  const [panelPos, setPanelPos] = useState({ x: 100, y: 100 });
  const [panelSize, setPanelSize] = useState({ w: 480, h: 520 });
  const [isDraggingPanel, setIsDraggingPanel] = useState(false);
  const [isResizingPanel, setIsResizingPanel] = useState<'right' | 'bottom' | 'bottom-right' | null>(null);
  
  const dragStartPos = useRef({ x: 0, y: 0 });
  const resizeStartPos = useRef({ x: 0, y: 0, w: 0, h: 0 });

  const [selectedTabs, setSelectedTabs] = useState<Set<string>>(new Set());
  const [lastSelectedTabId, setLastSelectedTabId] = useState<string | null>(null);

  const [activeDropdownTabId, setActiveDropdownTabId] = useState<string | null>(null);

  useEffect(() => {
    const closeDropdown = () => setActiveDropdownTabId(null);
    document.addEventListener('click', closeDropdown);
    return () => document.removeEventListener('click', closeDropdown);
  }, []);

  const EMOJIS = ['🧑‍💻','📚','🛒','🎨','💼','🔬','🎮','✈️','💰','📝','🏠','🔧','⭐','🔥','🚀','💡','🎯','📌','📅','📊','🎵','🎬','📸','🍔','☕','🌈','🏆','⚡','🌍','❤️'];

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const [addingNoteToTabId, setAddingNoteToTabId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  const [duplicateTabs, setDuplicateTabs] = useState<Record<string, chrome.tabs.Tab[]>>({});
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [playingTabsModal, setPlayingTabsModal] = useState<chrome.tabs.Tab[] | null>(null);


  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [commandSelectedIndex, setCommandSelectedIndex] = useState(0);
  const commandInputRef = useRef<HTMLInputElement>(null);

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
        setTimeout(() => commandInputRef.current?.focus(), 10);
      }
    };
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  useEffect(() => {
    chrome.storage.local.get(['theme'], (result) => {
      if (result.theme) {
        const savedTheme = result.theme as 'light' | 'dark';
        setTheme(savedTheme);
        document.documentElement.setAttribute('data-theme', savedTheme);
      }
    });
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    chrome.storage.local.set({ theme: next });
  };

  useEffect(() => {
    if (sessions.length > 0 || customGroups.length > 0) {
      const elements = document.querySelectorAll('.top-bar, .action-card, .group-card, .session-card');
      elements.forEach((el, i) => {
        (el as HTMLElement).style.opacity = '0';
        (el as HTMLElement).style.transform = 'translateY(10px)';
        (el as HTMLElement).style.transition = 'none';
        setTimeout(() => {
          (el as HTMLElement).style.transition = `opacity 300ms ease, transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1)`;
          (el as HTMLElement).style.opacity = '1';
          (el as HTMLElement).style.transform = 'translateY(0)';
        }, 60 + i * 35);
      });
    }
  }, [sessions, customGroups]);

  useEffect(() => {
    loadData();
  }, []);

  // Handle global mouse events for draggable & resizable panel
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingPanel) {
        const newX = e.clientX - dragStartPos.current.x;
        const newY = e.clientY - dragStartPos.current.y;
        
        setPanelPos({
          x: Math.max(0, Math.min(newX, window.innerWidth - panelSize.w)),
          y: Math.max(0, Math.min(newY, window.innerHeight - panelSize.h))
        });
      } else if (isResizingPanel) {
        let newW = resizeStartPos.current.w;
        let newH = resizeStartPos.current.h;
        
        if (isResizingPanel === 'right' || isResizingPanel === 'bottom-right') {
          newW = resizeStartPos.current.w + (e.clientX - resizeStartPos.current.x);
        }
        if (isResizingPanel === 'bottom' || isResizingPanel === 'bottom-right') {
          newH = resizeStartPos.current.h + (e.clientY - resizeStartPos.current.y);
        }
        
        newW = Math.max(350, Math.min(newW, window.innerWidth - panelPos.x));
        newH = Math.max(300, Math.min(newH, window.innerHeight - panelPos.y));
        
        setPanelSize({ w: newW, h: newH });
      }
    };

    const handleMouseUp = () => {
      setIsDraggingPanel(false);
      setIsResizingPanel(null);
    };
    
    if (isDraggingPanel || isResizingPanel) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.userSelect = '';
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
    };
  }, [isDraggingPanel, isResizingPanel, panelPos.x, panelPos.y, panelSize.w, panelSize.h]);

  const loadData = async () => {
    try {
      const s = await getAllGroups();
      setSessions(s); 
      if (!initialExpandedSet && s.length > 0) {
        const allSorted = [...s].sort((a, b) => b.createdAt - a.createdAt);
        setExpandedSessions({ [allSorted[0].id]: true });
        setInitialExpandedSet(true);
      }
      const cg = await getCustomGroups();
      setCustomGroups(cg); 
      const a = await getAnalytics();
      setAnalytics(a);
    } catch (error) {
      console.error('Failed to load data', error);
    }
  };

  const handleDashboardSave = (type: string) => {
    showToast(type === 'SAVE_CURRENT_SESSION' ? 'Saving Window...' : 'Saving All...', 'info');
    chrome.runtime.sendMessage({ type }, async (response) => {
      if (response?.success) {
        showToast('Saved session successfully!', 'success');
        await loadData();
      } else {
        showToast('Error saving session!', 'warning');
      }
    });
  };

  // QUICK ACTIONS
  const handleFindPlayingTabs = async () => {
    const tabs = await chrome.tabs.query({ audible: true });
    if (tabs.length === 0) {
      showToast('No playing tabs found.', 'info');
    } else {
      setPlayingTabsModal(tabs);
    }
  };

  const handleMuteAll = async () => {
    const tabs = await chrome.tabs.query({ audible: true });
    let count = 0;
    for (const t of tabs) {
      if (t.id) { await chrome.tabs.update(t.id, { muted: true }); count++; }
    }
    showToast(`Muted ${count} playing tabs.`, 'success');
  };

  const handleUnmuteAll = async () => {
    const tabs = await chrome.tabs.query({ muted: true });
    let count = 0;
    for (const t of tabs) {
      if (t.id) { await chrome.tabs.update(t.id, { muted: false }); count++; }
    }
    showToast(`Unmuted ${count} tabs.`, 'success');
  };

  const handleRestoreLast = () => {
    const allSorted = [...sessions].sort((a,b)=>b.createdAt - a.createdAt);
    if (allSorted.length > 0) {
      handleOpenTabs(allSorted[0]);
      showToast('Restored latest session!', 'success');
    } else {
      showToast('No sessions to restore.', 'warning');
    }
  };

  const handleCloseAll = async () => {
    const tabs = await chrome.tabs.query({ currentWindow: true, active: false });
    const ids = tabs.map(t => t.id).filter(id => id !== undefined) as number[];
    await chrome.tabs.remove(ids);
    showToast(`Closed ${ids.length} tabs.`, 'success');
  };

  const handleFindDupes = async () => {
    console.log('Finding duplicates...');
    try {
      const tabs = await chrome.tabs.query({});
      const groups: Record<string, chrome.tabs.Tab[]> = {};
      tabs.forEach(t => {
        let u = t.url || t.pendingUrl;
        if (!u) return;
        u = u.replace(/\/$/, '').toLowerCase().split('#')[0];
        if (!groups[u]) groups[u] = [];
        groups[u].push(t);
      });
      
      const dupes: Record<string, chrome.tabs.Tab[]> = {};
      Object.keys(groups).forEach(k => {
        if (groups[k].length > 1) dupes[k] = groups[k];
      });
      
      const dupeCount = Object.keys(dupes).length;
      if (dupeCount === 0) {
        showToast('No duplicate tabs found.', 'info');
      } else {
        setDuplicateTabs(dupes);
        setShowDuplicateModal(true);
      }
    } catch (err) {
      console.error('Failed to find duplicates:', err);
      showToast('Error scanning tabs', 'warning');
    }
  };


  const quickActions = [
    { icon: '🎵', title: 'Find Playing', action: handleFindPlayingTabs },
    { icon: '🔇', title: 'Mute All', action: handleMuteAll },
    { icon: '🔊', title: 'Unmute All', action: handleUnmuteAll },
    { icon: '❌', title: 'Close All Tabs', action: handleCloseAll },
    { icon: '🔄', title: 'Restore Latest', action: handleRestoreLast },
    { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="14" height="14" rx="2"/><rect x="7" y="7" width="14" height="14" rx="2"/></svg>, title: 'Find Dupes', action: handleFindDupes },
  ];

  const handleOpenTabs = (group: Group) => {
    try {
      if (!group.tabs || group.tabs.length === 0) return;
      const urls = group.tabs.map(t => t.url).filter(url => !!url);
      if (urls.length === 0) return;
      chrome.windows.create({ url: urls, focused: true });
    } catch (error) {
      console.error('Failed to open tabs', error);
    }
  };

  const handleDeleteSession = async (id: string) => {
    await deleteGroup(id);
    await loadData();
  };

  const toggleSession = (id: string) => setExpandedSessions(prev => ({...prev, [id]: !prev[id]}));
  const toggleCustom = (id: string) => setExpandedCustom(prev => ({...prev, [id]: !prev[id]}));

  const handleRemoveTab = async (groupId: string, tabUrl: string) => {
    try {
      const group = customGroups.find(g => g.id === groupId);
      if (!group) return;
      const updatedTabs = group.tabs.filter(t => t.url !== tabUrl);
      await updateCustomGroup({ ...group, tabs: updatedTabs });
      await loadData();
    } catch (e) {
      console.error('Failed to remove tab', e);
    }
  };

  const handleAddTabToGroup = async (targetGroupId: string, tab: Tab) => {
    const targetGroup = customGroups.find(g => g.id === targetGroupId);
    if (!targetGroup) return;
    if (targetGroup.tabs.some(t => t.url === tab.url)) return;
    await updateCustomGroup({ ...targetGroup, tabs: [...targetGroup.tabs, tab] });
    await loadData();
    setExpandedCustom(prev => ({...prev, [targetGroup.id]: true}));
  };

  const handleSaveNote = async (groupId: string, isCustom: boolean, tabUrl: string, note: string) => {
    try {
      if (isCustom) {
        const group = customGroups.find(g => g.id === groupId);
        if (group) {
          const updatedTabs = group.tabs.map(t => t.url === tabUrl ? { ...t, note } : t);
          await updateCustomGroup({ ...group, tabs: updatedTabs });
        }
      } else {
        const session = sessions.find(g => g.id === groupId);
        if (session) {
          const updatedTabs = session.tabs.map(t => t.url === tabUrl ? { ...t, note } : t);
          await updateGroup({ ...session, tabs: updatedTabs });
        }
      }
      setAddingNoteToTabId(null);
      await loadData();
    } catch(e) { console.error(e); }
  };

  const handleDeleteCustom = async (id: string) => {
    await deleteCustomGroup(id);
    await loadData();
  };

  const handleBulkOpen = () => {
    const urlsToOpen = new Set<string>();
    selectedTabs.forEach(id => { const [, , url] = id.split('|'); urlsToOpen.add(url); });
    if (urlsToOpen.size > 0) chrome.windows.create({ url: Array.from(urlsToOpen), focused: true });
    setSelectedTabs(new Set());
  };

  const handleBulkRemove = async () => {
    let cg = await getCustomGroups();
    const removalsByGroup: Record<string, string[]> = {};
    selectedTabs.forEach(id => {
      const [groupId, isCustomStr, url] = id.split('|');
      if (isCustomStr === 'true') {
        if (!removalsByGroup[groupId]) removalsByGroup[groupId] = [];
        removalsByGroup[groupId].push(url);
      }
    });

    for (const groupId in removalsByGroup) {
      const group = cg.find(g => g.id === groupId);
      if (group) {
        const urlsToRemove = new Set(removalsByGroup[groupId]);
        const newTabs = group.tabs.filter(t => !urlsToRemove.has(t.url));
        await updateCustomGroup({ ...group, tabs: newTabs });
      }
    }
    
    const newSet = new Set(selectedTabs);
    selectedTabs.forEach(id => { if (id.includes('|true|')) newSet.delete(id); });
    setSelectedTabs(newSet);
    await loadData();
  };

  const handleBulkMoveToGroup = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const targetGroupId = e.target.value;
    if (!targetGroupId) return;
    const tabsToAdd: Tab[] = [];
    const allGroups = [...sessions, ...customGroups];

    selectedTabs.forEach(id => {
      const [groupId, , url] = id.split('|');
      const group = allGroups.find(g => g.id === groupId);
      if (group) {
        const tab = group.tabs.find(t => t.url === url);
        if (tab && !tabsToAdd.some(t => t.url === tab.url)) tabsToAdd.push(tab);
      }
    });

    const targetGroup = customGroups.find(g => g.id === targetGroupId);
    if (!targetGroup) return;

    const uniqueTabs = [...targetGroup.tabs];
    tabsToAdd.forEach(t => { if (!uniqueTabs.some(existing => existing.url === t.url)) uniqueTabs.push(t); });

    await updateCustomGroup({ ...targetGroup, tabs: uniqueTabs });
    setSelectedTabs(new Set());
    e.target.value = ""; 
    await loadData();
  };

  const handleOpenCreateEditor = () => {
    openFloatingEditor({ id: crypto.randomUUID(), name: 'New Workspace', createdAt: Date.now(), tabs: [], isPinned: false });
  };

  const handlePanelDragStart = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Left click only
    setIsDraggingPanel(true);
    dragStartPos.current = { x: e.clientX - panelPos.x, y: e.clientY - panelPos.y };
  };

  const handleAddToReadLater = async (tab: Tab) => {
    try {
      let cg = await getCustomGroups();
      let readLater = cg.find(g => g.id === 'read-later');
      if (!readLater) {
        readLater = { id: 'read-later', name: 'Read Later', createdAt: Date.now(), tabs: [], emoji: '🔖', color: '#EAF3DE' };
        await saveCustomGroup(readLater);
      }
      
      if (!readLater.tabs.some(t => t.url === tab.url)) {
        readLater.tabs.push({ ...tab, lastAccessed: Date.now() });
        await updateCustomGroup(readLater);
      }

      showToast('Saved to Read Later', 'success');
      
      const openTabs = await chrome.tabs.query({});
      const target = openTabs.find(t => t.url === tab.url);
      if (target && target.id) {
        await chrome.tabs.remove(target.id);
      }
      
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleTabClick = (e: React.MouseEvent, uniqueId: string) => {
    e.stopPropagation();
    const newSet = new Set(selectedTabs);
    if (e.shiftKey && lastSelectedTabId) {
      const nodes = Array.from(document.querySelectorAll('.tab-card'));
      const ids = nodes.map(n => n.getAttribute('data-id'));
      const idx1 = ids.indexOf(lastSelectedTabId);
      const idx2 = ids.indexOf(uniqueId);
      if (idx1 !== -1 && idx2 !== -1) {
        const start = Math.min(idx1, idx2);
        const end = Math.max(idx1, idx2);
        for(let i=start; i<=end; i++) { if (ids[i]) newSet.add(ids[i]!); }
      } else { newSet.add(uniqueId); }
    } else {
      if (newSet.has(uniqueId)) newSet.delete(uniqueId);
      else newSet.add(uniqueId);
    }
    setSelectedTabs(newSet);
    setLastSelectedTabId(uniqueId);
  };

  const handleDragStart = (e: DragEvent<HTMLDivElement>, tab: Tab, uniqueId: string) => {
    let tabsToDrag: Tab[] = [];
    if (selectedTabs.has(uniqueId)) {
      const allGroups = [...sessions, ...customGroups];
      selectedTabs.forEach(id => {
        const [groupId, , url] = id.split('|');
        const group = allGroups.find(g => g.id === groupId);
        if (group) {
          const t = group.tabs.find(x => x.url === url);
          if (t && !tabsToDrag.some(x => x.url === t.url)) tabsToDrag.push(t);
        }
      });
    } else {
      tabsToDrag = [tab];
    }
    e.dataTransfer.setData('application/json', JSON.stringify(tabsToDrag));
    e.dataTransfer.effectAllowed = 'copy';
    
    if (tabsToDrag.length > 1) {
      const el = document.createElement('div');
      el.textContent = `${tabsToDrag.length} tabs`;
      el.style.background = '#1a73e8';
      el.style.color = '#fff';
      el.style.padding = '6px 12px';
      el.style.borderRadius = '20px';
      el.style.position = 'absolute';
      el.style.top = '-1000px';
      el.style.fontSize = '14px';
      el.style.fontWeight = 'bold';
      document.body.appendChild(el);
      e.dataTransfer.setDragImage(el, 0, 0);
      setTimeout(() => document.body.removeChild(el), 0);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, groupId: string) => {
    e.preventDefault(); e.dataTransfer.dropEffect = 'copy';
    if (dragOverGroupId !== groupId) setDragOverGroupId(groupId);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setDragOverGroupId(null);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>, targetGroup: Group) => {
    e.preventDefault(); setDragOverGroupId(null);
    try {
      const data = e.dataTransfer.getData('application/json');
      if (!data) return;
      const tabsToAdd = JSON.parse(data) as Tab[];
      const uniqueTabs = [...targetGroup.tabs];
      tabsToAdd.forEach(tab => { if (!uniqueTabs.some(t => t.url === tab.url)) uniqueTabs.push(tab); });
      await updateCustomGroup({ ...targetGroup, tabs: uniqueTabs });
      await loadData();
      setExpandedCustom(prev => ({...prev, [targetGroup.id]: true}));
    } catch (err) { console.error('Drop failed:', err); }
  };

  const handleStartRenameSession = (group: Group, e: React.MouseEvent) => {
    e.stopPropagation(); setEditingSessionId(group.id); setEditingSessionName(group.name);
  };

  const handleFinishRenameSession = async (group: Group) => {
    if (!editingSessionId) return;
    const name = editingSessionName.trim() || group.name;
    await updateGroup({ ...group, name });
    setEditingSessionId(null); await loadData();
  };

  const handleTogglePin = async (group: Group, e: React.MouseEvent) => {
    e.stopPropagation();
    await updateCustomGroup({ ...group, isPinned: !group.isPinned });
    await loadData();
  };

  // FLOATING EDITOR HANDLERS
  const openFloatingEditor = (group: Group) => {
    setFloatingEditorGroup(group);
    const w = 480;
    const h = 520;
    setPanelSize({ w, h });
    setPanelPos({ x: Math.max(20, (window.innerWidth - w) / 2), y: Math.max(20, (window.innerHeight - h) / 2) });
  };

  const handleEditCustomGroup = (group: Group, e: React.MouseEvent) => {
    e.stopPropagation(); 
    openFloatingEditor(group);
  };

  const handleSaveFloatingGroup = async () => {
    if (!floatingEditorGroup) return;
    const name = floatingEditorGroup.name.trim() || 'Untitled Group';
    const groupToSave = { ...floatingEditorGroup, name };
    const exists = customGroups.some(g => g.id === groupToSave.id);
    if (exists) await updateCustomGroup(groupToSave);
    else await saveCustomGroup(groupToSave);
    setFloatingEditorGroup(null);
    await loadData();
  };

  const handleDropToEditor = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setDragOverEditor(false);
    if (!floatingEditorGroup) return;
    try {
      const data = e.dataTransfer.getData('application/json');
      if (!data) return;
      const tabsToAdd = JSON.parse(data) as Tab[];
      const newTabs = [...floatingEditorGroup.tabs];
      tabsToAdd.forEach(t => { if (!newTabs.some(x => x.url === t.url)) newTabs.push(t); });
      setFloatingEditorGroup({ ...floatingEditorGroup, tabs: newTabs });
    } catch(err) { console.error(err); }
  };

  const sortAndPinGroups = (groups: Group[], isCustom: boolean) => {
    return [...groups].sort((a, b) => {
      if (isCustom) {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
      }
      switch (sortBy) {
        case 'newest': return b.createdAt - a.createdAt;
        case 'oldest': return a.createdAt - b.createdAt;
        case 'most_tabs': return b.tabs.length - a.tabs.length;
        case 'least_tabs': return a.tabs.length - b.tabs.length;
        default: return 0;
      }
    });
  };

  const matchesSearch = (g: Group) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    if (g.name.toLowerCase().includes(q)) return true;
    return g.tabs.some(t => t.title.toLowerCase().includes(q) || t.domain.toLowerCase().includes(q) || (t.url && t.url.toLowerCase().includes(q)));
  };

  const getCommandResults = () => {
    if (!commandQuery) return [];
    const q = commandQuery.toLowerCase();
    const fuzzyMatch = (query: string, str: string) => {
      let qi = 0;
      for (let i = 0; i < str.length && qi < query.length; i++) {
        if (str[i].toLowerCase() === query[qi].toLowerCase()) qi++;
      }
      return qi === query.length;
    };

    let results: any[] = [];
    quickActions.forEach(qa => {
      if (fuzzyMatch(q, qa.title)) results.push({ type: 'action', label: qa.title, action: () => { qa.action(); setShowCommandPalette(false); } });
    });
    customGroups.forEach(g => {
      if (fuzzyMatch(q, g.name)) results.push({ type: 'group', label: g.name, sublabel: `${g.tabs.length} tabs`, action: () => { toggleCustom(g.id); setShowCommandPalette(false); } });
    });
    sessions.forEach(s => {
      if (fuzzyMatch(q, s.name)) results.push({ type: 'session', label: s.name, sublabel: `${new Date(s.createdAt).toLocaleDateString()} • ${s.tabs.length} tabs`, action: () => { toggleSession(s.id); setShowCommandPalette(false); } });
    });
    const allGroups = [...customGroups, ...sessions];
    allGroups.forEach(g => {
      g.tabs.forEach(t => {
        if (fuzzyMatch(q, t.title) || fuzzyMatch(q, t.domain) || (t.note && fuzzyMatch(q, t.note))) {
          results.push({ type: 'tab', label: t.title, sublabel: t.domain, action: () => { chrome.tabs.create({ url: t.url }); setShowCommandPalette(false); } });
        }
      });
    });
    return results.slice(0, 8);
  };

  const commandResults = getCommandResults();

  const handleCommandKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCommandSelectedIndex(prev => (prev + 1) % commandResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCommandSelectedIndex(prev => (prev - 1 + commandResults.length) % commandResults.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (commandResults[commandSelectedIndex]) {
        commandResults[commandSelectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      setShowCommandPalette(false);
    }
  };

  useEffect(() => {
    if (!analytics || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    
    const w = canvasRef.current.width;
    const h = canvasRef.current.height;
    ctx.clearRect(0, 0, w, h);
    
    const entries = Object.entries(analytics.dailyTabCounts).sort((a,b) => a[0].localeCompare(b[0])).slice(-7);
    if (entries.length === 0) return;
    
    const maxVal = Math.max(...entries.map(e => e[1]), 10);
    const padding = 20;
    const barW = (w - padding*2) / entries.length - 10;
    
    ctx.fillStyle = '#1a73e8';
    entries.forEach(([date, count], i) => {
      const barH = (count / maxVal) * (h - padding * 2);
      const x = padding + i * (barW + 10);
      const y = h - padding - barH;
      ctx.fillRect(x, y, barW, barH);
      
      ctx.fillStyle = '#5f6368';
      ctx.font = '10px system-ui';
      ctx.fillText(date.slice(-5), x, h - 5);
      ctx.fillStyle = '#1a73e8';
    });
  }, [analytics]);

  const filteredCustomGroups = sortAndPinGroups(customGroups.filter(matchesSearch), true);
  const allFilteredSessions = sortAndPinGroups(sessions.filter(matchesSearch), false);
  const allSessionsSortedByDate = [...sessions].sort((a, b) => b.createdAt - a.createdAt);
  const rawLatestSession = allSessionsSortedByDate.length > 0 ? allSessionsSortedByDate[0] : null;
  const latestSessionToShow = rawLatestSession && matchesSearch(rawLatestSession) ? rawLatestSession : null;
  const remainingSessionsToShow = allFilteredSessions.filter(s => s.id !== latestSessionToShow?.id);

  const getTabAgeElement = (lastAccessed?: number) => {
    if (!lastAccessed) return null;
    const hours = (Date.now() - lastAccessed) / (1000 * 60 * 60);
    if (hours < 1) return null;
    if (hours < 24) return <span className="tab-age">{Math.floor(hours)}h ago</span>;
    const days = Math.floor(hours / 24);
    if (days < 3) return <span className="tab-age old">{days}d</span>;
    return <span className="tab-age stale">{days}d</span>;
  };

  const renderTabCard = (tab: Tab, draggable: boolean, groupId: string, isCustom: boolean) => {
    const uniqueId = `${groupId}|${isCustom}|${tab.url}`;
    const isChecked = selectedTabs.has(uniqueId);
    
    return (
      <div 
        className={`tab-row ${isChecked ? 'selected' : ''}`} 
        data-id={uniqueId} 
        key={tab.url} 
        draggable={draggable} 
        onDragStart={draggable ? (e) => handleDragStart(e, tab, uniqueId) : undefined} 
        onClick={(e) => handleTabClick(e, uniqueId)}
      >
        <input 
          type="checkbox" 
          className="tab-checkbox"
          checked={isChecked} 
          onChange={() => {}} 
          onClick={e => e.stopPropagation()}
        />
        
        <img 
          className="tab-favicon"
          src={tab.favicon || `https://www.google.com/s2/favicons?domain=${tab.domain}&sz=64`} 
          alt="" 
        />
        
        <div className="tab-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {tab.title}
            {tab.note && <div className="tab-note-dot" title={tab.note}></div>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{tab.domain}</span>
            {getTabAgeElement(tab.lastAccessed)}
          </div>
        </div>
        
        <div className="tab-actions" onClick={e => e.stopPropagation()}>
          <button className="tab-action-btn" onClick={() => chrome.tabs.create({ url: tab.url, active: false })} title="Open Tab">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </button>
          <button className="tab-action-btn" onClick={() => navigator.clipboard.writeText(tab.url)} title="Copy URL">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
          <div style={{ position: 'relative' }}>
            <button className="tab-action-btn" onClick={() => setActiveDropdownTabId(activeDropdownTabId === uniqueId ? null : uniqueId)} title="Actions">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
            {activeDropdownTabId === uniqueId && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', zIndex: 50, padding: '6px', minWidth: '160px' }}>
                <div className="card-btn" style={{ width: '100%', border: 'none' }} onClick={(e) => { e.stopPropagation(); handleAddToReadLater(tab); setActiveDropdownTabId(null); }}>Save to Read Later</div>
                <div className="card-btn" style={{ width: '100%', border: 'none' }} onClick={(e) => { e.stopPropagation(); setAddingNoteToTabId(uniqueId); setNoteText(tab.note || ''); setActiveDropdownTabId(null); }}>Add Note</div>
                <div className="palette-section-label">Add to Group</div>
                {customGroups.length === 0 && <div style={{ padding: '6px 8px', fontSize: '11px', color: 'var(--text-tertiary)' }}>No groups</div>}
                {customGroups.map(g => ( <div key={g.id} className="card-btn" style={{ width: '100%', border: 'none' }} onClick={(e) => { e.stopPropagation(); handleAddTabToGroup(g.id, tab); setActiveDropdownTabId(null); }}>{g.name}</div> ))}
              </div>
            )}
          </div>
          {isCustom && (
            <button className="tab-action-btn" onClick={() => handleRemoveTab(groupId, tab.url)} title="Remove from Group">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          )}
        </div>
        {addingNoteToTabId === uniqueId && (
          <div style={{ padding: '0 12px 12px 12px' }} onClick={e => e.stopPropagation()}>
            <textarea
              autoFocus
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSaveNote(groupId, isCustom, tab.url, noteText);
                }
              }}
              style={{ width: '100%', maxHeight: '80px', fontSize: '13px', border: '0.5px solid #ddd', borderRadius: '6px', padding: '6px 8px', resize: 'none', boxSizing: 'border-box' }}
              placeholder="Add a note... (Press Enter to save)"
            />
          </div>
        )}
      </div>
    );
  };

  const renderSessionGroup = (session: Group) => {
    const isExpanded = expandedSessions[session.id];
    return (
      <div key={session.id} className="session-card">
        <div className="card-header" onClick={() => toggleSession(session.id)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            <div style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.2s', color: 'var(--text-tertiary)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
            <div>
              {editingSessionId === session.id ? (
                <input autoFocus value={editingSessionName} onChange={e => setEditingSessionName(e.target.value)} onBlur={() => handleFinishRenameSession(session)} onKeyDown={e => e.key === 'Enter' && handleFinishRenameSession(session)} onClick={e => e.stopPropagation()} style={{ fontSize: '15px', fontWeight: 600, padding: '4px 8px', border: '1px solid var(--accent-primary)', borderRadius: '4px', background: 'var(--bg-base)', color: 'var(--text-primary)' }} />
              ) : (
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{session.name}</h3>
              )}
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                {new Date(session.createdAt).toLocaleDateString()} • {session.tabs.length} tabs
              </div>
            </div>
          </div>
          <div className="card-actions" onClick={e => e.stopPropagation()}>
            <button className="card-btn" onClick={(e) => handleStartRenameSession(session, e)} title="Rename">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button className="card-btn primary" onClick={() => handleOpenTabs(session)}>Restore</button>
            <button className="card-btn" onClick={() => handleDeleteSession(session.id)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>
          </div>
        </div>
        {isExpanded && (
          <div className="card-body">
            <div className="tab-grid">
              {session.tabs.map(tab => renderTabCard(tab, true, session.id, false))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (sessions.length === 0 && customGroups.length === 0 && !searchQuery && !floatingEditorGroup) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📂</div>
        <h2>No sessions saved yet</h2>
        <p>Start by saving your current tabs to organize your workspace.</p>
        <button onClick={() => handleDashboardSave("SAVE_CURRENT_SESSION")} className="card-btn primary" style={{ padding: '12px 24px' }}>
          Save Current Window
        </button>
      </div>
    );
  }
  return (
    <>
      <div className="dashboard-layout">
        {/* TOP BAR */}
        <header className="top-bar">
          <div className="logo">
            <div className="logo-icon">G</div>
            <div className="logo-text">GenTabs</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="search-wrap">
              <div className="search-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </div>
              <input 
                type="text" 
                className="search-input" 
                placeholder="Search tabs..." 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
              />
            </div>

            <button className="tab-action-btn" onClick={toggleTheme} title="Toggle Theme">
              {theme === 'dark' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              )}
            </button>

            <button className="card-btn primary" onClick={() => handleDashboardSave("SAVE_CURRENT_SESSION")}>Save Session</button>
          </div>
        </header>

        {/* QUICK ACTIONS */}
        <section style={{ marginBottom: '40px' }}>
          <div className="section-header">
            <h2 className="section-title">Quick Actions</h2>
          </div>
          <div className="quick-actions">
            {quickActions.map(qa => (
              <div key={qa.title} className="action-card" onClick={qa.action}>
                <div className="action-icon">{qa.icon}</div>
                <div className="action-label">{qa.title}</div>
              </div>
            ))}
          </div>
        </section>

        {/* LATEST SESSION */}
        {latestSessionToShow && (
          <section style={{ marginBottom: '40px' }}>
            <div className="section-header">
              <h2 className="section-title">Latest Session</h2>
            </div>
            {renderSessionGroup(latestSessionToShow)}
          </section>
        )}

        {/* WORKSPACES */}
        <section style={{ marginBottom: '40px' }}>
          <div className="section-header">
            <h2 className="section-title">Workspaces</h2>
            <div style={{ display: 'flex', gap: '12px' }}>
              <select className="sort-select" value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="most_tabs">Size</option>
              </select>
              <button className="card-btn primary" onClick={handleOpenCreateEditor}>+ New Group</button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredCustomGroups.map(group => (
              <div 
                key={group.id} 
                className={`group-card ${dragOverGroupId === group.id ? 'drag-over' : ''}`}
                onDragOver={e => handleDragOver(e, group.id)} 
                onDragLeave={handleDragLeave} 
                onDrop={e => handleDrop(e, group)}
              >
                <div className="card-header" onClick={() => toggleCustom(group.id)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    <div style={{ transform: expandedCustom[group.id] ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.2s', color: 'var(--text-tertiary)' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </div>
                    <div className="group-emoji">{group.emoji || '📂'}</div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {group.name} {group.isPinned && <span style={{ color: 'var(--accent-primary)' }}>★</span>}
                      </h3>
                      <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>{group.tabs.length} tabs</div>
                    </div>
                  </div>
                  <div className="card-actions" onClick={e => e.stopPropagation()}>
                    <button className="card-btn" onClick={(e) => handleTogglePin(group, e)}>{group.isPinned ? '★' : '☆'}</button>
                    <button className="card-btn" onClick={(e) => handleEditCustomGroup(group, e)}>Edit</button>
                    <button className="card-btn primary" onClick={() => handleOpenTabs(group)}>Restore</button>
                    <button className="card-btn" onClick={() => handleDeleteCustom(group.id)}>Delete</button>
                  </div>
                </div>
                {expandedCustom[group.id] && (
                  <div className="card-body">
                    {group.tabs.length === 0 ? (
                      <div className="empty-state" style={{ padding: '24px' }}><p>No tabs in this group. Drag tabs here!</p></div>
                    ) : (
                      <div className="tab-grid">{group.tabs.map(tab => renderTabCard(tab, false, group.id, true))}</div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ALL SESSIONS */}
        {remainingSessionsToShow.length > 0 && (
          <section style={{ marginBottom: '40px' }}>
            <div className="section-header"><h2 className="section-title">All Sessions</h2></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>{remainingSessionsToShow.map(session => renderSessionGroup(session))}</div>
          </section>
        )}

        {/* INSIGHTS */}
        <section className="insights-section">
          <div className="section-header"><h2 className="section-title">Insights & Analytics</h2></div>
          <div className="insights-grid">
            <div className="insight-card">
              <div className="insight-header"><div className="insight-label">Tab Volume (Last 7 Days)</div></div>
              <div className="insight-body"><canvas ref={canvasRef} width={400} height={180} style={{ width: '100%' }}></canvas></div>
            </div>
            <div className="insight-card">
              <div className="insight-header"><div className="insight-label">Top Domains</div></div>
              <div className="insight-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {analytics && Object.keys(analytics.domainVisits).length > 0 ? (
                    Object.entries(analytics.domainVisits).sort((a,b) => b[1] - a[1]).slice(0, 5).map(([dom, count], idx) => (
                      <div key={dom} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ color: 'var(--text-tertiary)', fontWeight: 600, width: '18px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>{idx + 1}</span>
                          <img src={`https://www.google.com/s2/favicons?domain=${dom}&sz=32`} style={{ width: '16px', height: '16px', borderRadius: '2px' }} />
                          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{dom}</span>
                        </div>
                        <span className="count-badge">{count}</span>
                      </div>
                    ))
                  ) : <div className="empty-state" style={{ padding: '20px 0' }}>Not enough data yet.</div>}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* FLOATING EDITOR */}
      {floatingEditorGroup && (
        <div className="floating-panel" style={{ top: panelPos.y, left: panelPos.x, width: `${panelSize.w}px`, height: `${panelSize.h}px` }}>
          <div onMouseDown={(e) => { e.preventDefault(); setIsResizingPanel('right'); resizeStartPos.current = { x: e.clientX, y: e.clientY, w: panelSize.w, h: panelSize.h }; }} style={{ position: 'absolute', right: 0, top: 0, bottom: '15px', width: '6px', cursor: 'ew-resize', zIndex: 10 }} />
          <div onMouseDown={(e) => { e.preventDefault(); setIsResizingPanel('bottom'); resizeStartPos.current = { x: e.clientX, y: e.clientY, w: panelSize.w, h: panelSize.h }; }} style={{ position: 'absolute', bottom: 0, left: 0, right: '15px', height: '6px', cursor: 'ns-resize', zIndex: 10 }} />
          <div onMouseDown={(e) => { e.preventDefault(); setIsResizingPanel('bottom-right'); resizeStartPos.current = { x: e.clientX, y: e.clientY, w: panelSize.w, h: panelSize.h }; }} style={{ position: 'absolute', bottom: 0, right: 0, width: '15px', height: '15px', cursor: 'nwse-resize', zIndex: 11, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', padding: '4px' }}>
            <svg width="8" height="8" viewBox="0 0 10 10" style={{ fill: 'var(--border-default)' }}><path d="M 8 10 L 10 10 L 10 8 Z M 4 10 L 10 4 L 10 6 L 6 10 Z M 0 10 L 10 0 L 10 2 L 2 10 Z"/></svg>
          </div>
          <div className="panel-header" onMouseDown={handlePanelDragStart}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
              <button className="tab-action-btn" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>{floatingEditorGroup.emoji || '📂'}</button>
              {showEmojiPicker && (
                <div style={{ position: 'absolute', top: '100%', left: '20px', width: '220px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '10px', display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px', zIndex: 100, boxShadow: 'var(--shadow-lg)' }}>
                  {EMOJIS.map(e => <div key={e} onClick={() => { setFloatingEditorGroup({...floatingEditorGroup, emoji: e}); setShowEmojiPicker(false); }} style={{ cursor: 'pointer', textAlign: 'center', padding: '6px' }}>{e}</div>)}
                </div>
              )}
              <input className="palette-input" style={{ border: 'none', background: 'transparent' }} value={floatingEditorGroup.name} onChange={e => setFloatingEditorGroup({...floatingEditorGroup, name: e.target.value})} onMouseDown={e => e.stopPropagation()} placeholder="Workspace Name" />
            </div>
            <button className="tab-action-btn" onClick={() => setFloatingEditorGroup(null)} onMouseDown={e => e.stopPropagation()}>×</button>
          </div>
          <div className="panel-body" onDragOver={e => { e.preventDefault(); setDragOverEditor(true); }} onDragLeave={() => setDragOverEditor(false)} onDrop={handleDropToEditor} style={{ background: dragOverEditor ? 'var(--bg-base)' : 'transparent' }}>
            {floatingEditorGroup.tabs.length === 0 ? <div className="empty-state">Drag tabs here</div> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {floatingEditorGroup.tabs.map(tab => (
                  <div key={tab.url} className="tab-row" style={{ padding: '8px 12px' }}>
                    <img src={tab.favicon || `https://www.google.com/s2/favicons?domain=${tab.domain}`} style={{ width: '14px', height: '14px' }} />
                    <div className="tab-title" style={{ fontSize: '12px' }}>{tab.title}</div>
                    <button className="tab-action-btn" onClick={() => setFloatingEditorGroup({...floatingEditorGroup, tabs: floatingEditorGroup.tabs.filter(x => x.url !== tab.url)})}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="palette-footer">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
              <input type="checkbox" checked={floatingEditorGroup.schedule?.onLaunch || false} onChange={e => setFloatingEditorGroup({...floatingEditorGroup, schedule: { ...floatingEditorGroup.schedule, onLaunch: e.target.checked }})} /> Auto-open
            </label>
            <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
              <button className="card-btn" onClick={() => setFloatingEditorGroup(null)}>Cancel</button>
              <button className="card-btn primary" onClick={handleSaveFloatingGroup}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* BULK ACTION BAR */}
      {selectedTabs.size > 0 && (
        <div style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-lg)', padding: '12px 24px', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '24px', zIndex: 100 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontWeight: 600, color: 'var(--accent-primary)', fontSize: '14px' }}>{selectedTabs.size} selected</div>
            <button onClick={() => setSelectedTabs(new Set())} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '13px' }}>Clear</button>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <select className="sort-select" style={{ height: '32px', padding: '0 12px' }} onChange={handleBulkMoveToGroup} value="">
              <option value="" disabled>Add to Group...</option>
              {customGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <button className="card-btn" onClick={handleBulkRemove}>Remove</button>
            <button className="card-btn primary" onClick={handleBulkOpen}>Restore All</button>
          </div>
        </div>
      )}

      {/* MODALS */}
      {showDuplicateModal && (
        <div className="palette-overlay" onClick={() => setShowDuplicateModal(false)}>
          <div className="palette-content" onClick={e => e.stopPropagation()} style={{ width: '640px' }}>
            <div className="palette-header">
              <div className="palette-section-label">Duplicate Management</div>
              <div className="tab-action-btn" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowDuplicateModal(false); }} title="Close">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </div>
            </div>
            <div className="palette-list" style={{ padding: '20px' }}>
              {Object.keys(duplicateTabs).length === 0 ? <div className="empty-state">No duplicates found.</div> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{Object.keys(duplicateTabs).length} unique duplicate URLs.</div>
                    <button className="card-btn primary" onClick={async () => {
                      let closed = 0;
                      for (const url of Object.keys(duplicateTabs)) {
                        const tabs = duplicateTabs[url];
                        const toClose = tabs.slice(1).map(t => t.id as number);
                        await chrome.tabs.remove(toClose);
                        closed += toClose.length;
                      }
                      showToast(`Closed ${closed} duplicates`, 'success');
                      setShowDuplicateModal(false);
                    }}>Close All</button>
                  </div>
                  {Object.entries(duplicateTabs).map(([url, tabs]) => (
                    <div key={url} className="group-card" style={{ padding: '0', border: '1px solid var(--border-default)', overflow: 'hidden' }}>
                      <div style={{ padding: '12px 16px', background: 'var(--bg-base)', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img src={tabs[0].favIconUrl || ''} style={{ width: '16px', height: '16px' }} />
                          <div style={{ fontSize: '13px', fontWeight: 600 }}>{tabs[0].title}</div>
                        </div>
                        <button className="card-btn danger" onClick={async () => {
                          const toClose = tabs.slice(1).map(t => t.id as number);
                          await chrome.tabs.remove(toClose);
                          const newD = {...duplicateTabs}; delete newD[url]; setDuplicateTabs(newD);
                        }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                          Close {tabs.length - 1}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {playingTabsModal && (
        <div className="palette-overlay" onClick={() => setPlayingTabsModal(null)}>
          <div className="palette-content" onClick={e => e.stopPropagation()} style={{ width: '450px' }}>
            <div className="palette-header">
              <div className="palette-section-label">Playing Audio</div>
              <div className="tab-action-btn" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPlayingTabsModal(null); }} title="Close">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </div>
            </div>
            <div className="palette-list" style={{ padding: '16px' }}>
              {playingTabsModal.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid var(--border-default)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img src={t.favIconUrl} style={{ width: '16px', height: '16px' }} />
                    <div style={{ fontSize: '13px' }}>{t.title}</div>
                  </div>
                  <button className="card-btn primary" onClick={() => { if(t.id) chrome.tabs.update(t.id, { active: true }); }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                    Go
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showCommandPalette && (
        <div className="palette-overlay" onClick={() => setShowCommandPalette(false)}>
          <div className="palette-content" onClick={e => e.stopPropagation()}>
            <div className="palette-input-wrap">
              <input 
                ref={commandInputRef} 
                className="palette-input" 
                value={commandQuery} 
                onChange={e => { setCommandQuery(e.target.value); setCommandSelectedIndex(0); }} 
                onKeyDown={handleCommandKeyDown}
                placeholder="Search tabs..." 
                autoFocus 
              />
            </div>
            <div className="palette-list">
              {commandResults.map((r, idx) => (
                <div key={idx} className={`palette-item ${commandSelectedIndex === idx ? 'active' : ''}`} onClick={r.action}>{r.label}</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
