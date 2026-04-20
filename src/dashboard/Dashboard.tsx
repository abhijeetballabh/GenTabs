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
import { getAllTabs } from '../api/tabs.api';
import { prepareTabs } from '../core/sweep';
import type { Group } from '../types/group';
import type { Tab } from '../types/tab';

export const Dashboard: React.FC = () => {
  const [sessions, setSessions] = useState<Group[]>([]);
  const [customGroups, setCustomGroups] = useState<Group[]>([]);
  const [domainSuggestions, setDomainSuggestions] = useState<{domain: string, count: number, favicon: string, tabs: Tab[]}[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'most_tabs' | 'least_tabs'>('newest');

  const [expandedSessions, setExpandedSessions] = useState<Record<string, boolean>>({});
  const [expandedCustom, setExpandedCustom] = useState<Record<string, boolean>>({});
  const [initialExpandedSet, setInitialExpandedSet] = useState(false);

  const [hoveredTabId, setHoveredTabId] = useState<string | null>(null);
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);

  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingSessionName, setEditingSessionName] = useState('');

  const [floatingEditorGroup, setFloatingEditorGroup] = useState<Group | null>(null);
  const [dragOverEditor, setDragOverEditor] = useState(false);

  // Floating panel drag & resize state
  const [panelPos, setPanelPos] = useState({ x: 100, y: 100 });
  const [panelSize, setPanelSize] = useState({ w: 450, h: 600 });
  const [isDraggingPanel, setIsDraggingPanel] = useState(false);
  const [isResizingPanel, setIsResizingPanel] = useState<'right' | 'bottom' | 'bottom-right' | null>(null);
  
  const dragStartPos = useRef({ x: 0, y: 0 });
  const resizeStartPos = useRef({ x: 0, y: 0, w: 0, h: 0 });

  const [selectedTabs, setSelectedTabs] = useState<Set<string>>(new Set());
  const [lastSelectedTabId, setLastSelectedTabId] = useState<string | null>(null);

  const [saveStatus, setSaveStatus] = useState<string>('');
  const [activeDropdownTabId, setActiveDropdownTabId] = useState<string | null>(null);

  const [playingTabsModal, setPlayingTabsModal] = useState<chrome.tabs.Tab[] | null>(null);

  useEffect(() => {
    const closeDropdown = () => setActiveDropdownTabId(null);
    document.addEventListener('click', closeDropdown);
    return () => document.removeEventListener('click', closeDropdown);
  }, []);

  useEffect(() => {
    loadData();
    loadDomainSuggestions();
  }, []);

  // Handle global mouse events for draggable & resizable panel
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingPanel) {
        setPanelPos({
          x: e.clientX - dragStartPos.current.x,
          y: e.clientY - dragStartPos.current.y
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
        
        newW = Math.max(350, Math.min(newW, window.innerWidth - panelPos.x - 20));
        newH = Math.max(300, Math.min(newH, window.innerHeight - panelPos.y - 20));
        
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
  }, [isDraggingPanel, isResizingPanel, panelPos.x, panelPos.y]);

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
    } catch (error) {
      console.error('Failed to load data', error);
    }
  };

  const loadDomainSuggestions = async () => {
    try {
      const chromeTabs = await getAllTabs(true);
      const customTabs = prepareTabs(chromeTabs);
      const domainMap = new Map<string, {count: number, favicon: string, tabs: Tab[]}>();
      customTabs.forEach(t => {
        if (!t.domain || t.domain === 'unknown') return;
        const entry = domainMap.get(t.domain) || { count: 0, favicon: t.favicon, tabs: [] };
        entry.count += 1;
        entry.tabs.push(t);
        if (!entry.favicon && t.favicon) entry.favicon = t.favicon;
        domainMap.set(t.domain, entry);
      });
      const suggestions = Array.from(domainMap.entries()).map(([domain, data]) => ({ domain, ...data })).sort((a, b) => b.count - a.count);
      setDomainSuggestions(suggestions);
    } catch (e) {
      console.error('Failed to load domain suggestions', e);
    }
  };

  const notifyStatus = (msg: string) => {
    setSaveStatus(msg);
    setTimeout(() => setSaveStatus(''), 3000);
  };

  const handleDashboardSave = (type: string) => {
    notifyStatus(type === 'SAVE_CURRENT_SESSION' ? 'Saving Window...' : 'Saving All...');
    chrome.runtime.sendMessage({ type }, async (response) => {
      if (response?.success) {
        notifyStatus('Saved session successfully!');
        await loadData();
      } else {
        notifyStatus('Error saving session!');
      }
    });
  };

  // QUICK ACTIONS
  const handleFindPlayingTabs = async () => {
    const tabs = await chrome.tabs.query({ audible: true });
    setPlayingTabsModal(tabs);
    if (tabs.length === 0) notifyStatus('No playing tabs found.');
  };

  const handleMuteAll = async () => {
    const tabs = await chrome.tabs.query({ audible: true });
    let count = 0;
    for (const t of tabs) {
      if (t.id) { await chrome.tabs.update(t.id, { muted: true }); count++; }
    }
    notifyStatus(`Muted ${count} playing tabs.`);
  };

  const handleUnmuteAll = async () => {
    const tabs = await chrome.tabs.query({ muted: true });
    let count = 0;
    for (const t of tabs) {
      if (t.id) { await chrome.tabs.update(t.id, { muted: false }); count++; }
    }
    notifyStatus(`Unmuted ${count} tabs.`);
  };

  const handleRestoreLast = () => {
    const allSorted = [...sessions].sort((a,b)=>b.createdAt - a.createdAt);
    if (allSorted.length > 0) {
      handleOpenTabs(allSorted[0]);
      notifyStatus('Restored latest session!');
    } else {
      notifyStatus('No sessions to restore.');
    }
  };

  const handleCloseAll = async () => {
    const tabs = await chrome.tabs.query({ currentWindow: true, active: false });
    const ids = tabs.map(t => t.id).filter(id => id !== undefined) as number[];
    await chrome.tabs.remove(ids);
    notifyStatus(`Closed ${ids.length} tabs.`);
  };

  const quickActions = [
    { icon: '🎵', title: 'Find Playing', action: handleFindPlayingTabs },
    { icon: '🔇', title: 'Mute All', action: handleMuteAll },
    { icon: '🔊', title: 'Unmute All', action: handleUnmuteAll },
    { icon: '❌', title: 'Close All Tabs', action: handleCloseAll },
    { icon: '🔄', title: 'Restore Latest', action: handleRestoreLast },
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

  const handleDeleteCustom = async (id: string) => {
    await deleteCustomGroup(id);
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

  // FLOATING EDITOR HANDLERS
  const openFloatingEditor = (group: Group) => {
    setFloatingEditorGroup(group);
    setPanelSize({ w: 450, h: 600 });
    setPanelPos({ x: Math.max(20, (window.innerWidth - 450) / 2), y: Math.max(20, (window.innerHeight - 600) / 2) });
  };

  const handleOpenCreateEditor = () => {
    openFloatingEditor({ id: crypto.randomUUID(), name: 'New Workspace', createdAt: Date.now(), tabs: [], isPinned: false });
  };

  const handleEditCustomGroup = (group: Group, e: React.MouseEvent) => {
    e.stopPropagation(); 
    openFloatingEditor(group);
  };

  const handlePanelDragStart = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Left click only
    setIsDraggingPanel(true);
    dragStartPos.current = { x: e.clientX - panelPos.x, y: e.clientY - panelPos.y };
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

  const filteredCustomGroups = sortAndPinGroups(customGroups.filter(matchesSearch), true);
  const allFilteredSessions = sortAndPinGroups(sessions.filter(matchesSearch), false);
  const allSessionsSortedByDate = [...sessions].sort((a, b) => b.createdAt - a.createdAt);
  const rawLatestSession = allSessionsSortedByDate.length > 0 ? allSessionsSortedByDate[0] : null;
  const latestSessionToShow = rawLatestSession && matchesSearch(rawLatestSession) ? rawLatestSession : null;
  const remainingSessionsToShow = allFilteredSessions.filter(s => s.id !== latestSessionToShow?.id);

  const btnStyle = (bg: string, color: string, border: string) => ({
    padding: '8px 16px', backgroundColor: bg, color, border, borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', transition: 'all 0.2s', whiteSpace: 'nowrap' as const
  });

  const iconBtnStyle = {
    background: '#f1f3f4', border: '1px solid #dadce0', cursor: 'pointer', padding: '4px 6px', fontSize: '12px', color: '#5f6368', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s ease'
  };

  const renderFaviconStrip = (tabs: Tab[]) => {
    const previewTabs = tabs.slice(0, 5);
    const extraCount = tabs.length - 5;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {previewTabs.map((t, idx) => ( <img key={`${t.url}-${idx}`} src={t.favicon || `https://www.google.com/s2/favicons?domain=${t.domain}&sz=64`} alt="" title={t.title} style={{ width: '20px', height: '20px', borderRadius: '3px', border: '1px solid #eee', objectFit: 'cover' }} /> ))}
        {extraCount > 0 && <div style={{ fontSize: '11px', color: '#5f6368', fontWeight: 600, padding: '2px 6px', backgroundColor: '#f1f3f4', borderRadius: '10px' }}>+{extraCount}</div>}
      </div>
    );
  };

  const renderTabCard = (tab: Tab, draggable: boolean, groupId: string, isCustom: boolean) => {
    const uniqueId = `${groupId}|${isCustom}|${tab.url}`;
    const isHovered = hoveredTabId === uniqueId;
    const isChecked = selectedTabs.has(uniqueId);
    
    return (
      <div className="tab-card" data-id={uniqueId} key={tab.url} draggable={draggable} onDragStart={draggable ? (e) => handleDragStart(e, tab, uniqueId) : undefined} onMouseEnter={() => setHoveredTabId(uniqueId)} onMouseLeave={() => setHoveredTabId(null)} onClick={(e) => handleTabClick(e, uniqueId)}
        style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', backgroundColor: isChecked ? '#f4f8fe' : '#fff', border: `1px solid ${isChecked ? '#1a73e8' : '#eaeaea'}`, borderRadius: '8px', boxShadow: isHovered ? '0 4px 8px rgba(0,0,0,0.06)' : '0 1px 2px rgba(0,0,0,0.02)', cursor: draggable ? 'grab' : 'pointer', transform: isHovered ? 'translateY(-2px)' : 'none', transition: 'all 0.15s ease', height: '52px', boxSizing: 'border-box', userSelect: 'none' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden', flex: 1, paddingRight: '10px' }}>
          <input type="checkbox" checked={isChecked} onChange={() => {}} style={{ marginRight: '10px', cursor: 'pointer', pointerEvents: 'none' }} />
          <img src={tab.favicon || `https://www.google.com/s2/favicons?domain=${tab.domain}&sz=64`} alt="" style={{ width: '20px', height: '20px', marginRight: '12px', flexShrink: 0, borderRadius: '4px' }} />
          <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
            <div style={{ fontWeight: 600, fontSize: '13px', textOverflow: 'ellipsis', overflow: 'hidden', color: '#202124' }}>{tab.title}</div>
            <div style={{ fontSize: '11px', color: '#80868b', textOverflow: 'ellipsis', overflow: 'hidden', marginTop: '2px' }}>{tab.domain}</div>
          </div>
        </div>
        
        {(isHovered || activeDropdownTabId === uniqueId) && (
          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
            <button onClick={() => chrome.tabs.create({ url: tab.url, active: false })} title="Open Tab" style={iconBtnStyle}>↗️</button>
            <button onClick={() => navigator.clipboard.writeText(tab.url)} title="Copy URL" style={iconBtnStyle}>📋</button>
            <div style={{ position: 'relative' }}>
              <button onClick={() => setActiveDropdownTabId(activeDropdownTabId === uniqueId ? null : uniqueId)} title="Add to Group" style={iconBtnStyle}>➕</button>
              {activeDropdownTabId === uniqueId && (
                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px', background: '#fff', border: '1px solid #dadce0', borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', zIndex: 50, padding: '6px', minWidth: '160px' }}>
                  <div style={{ fontSize: '11px', color: '#80868b', padding: '4px 8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Add to Group</div>
                  {customGroups.length === 0 && <div style={{ padding: '6px 8px', fontSize: '12px', color: '#888' }}>No custom groups yet</div>}
                  {customGroups.map(g => ( <div key={g.id} onClick={(e) => { e.stopPropagation(); handleAddTabToGroup(g.id, tab); setActiveDropdownTabId(null); }} style={{ padding: '8px', fontSize: '13px', cursor: 'pointer', borderRadius: '6px', color: '#202124', fontWeight: 500 }} onMouseEnter={e => e.currentTarget.style.background = '#f1f3f4'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>{g.name}</div> ))}
                </div>
              )}
            </div>
            {isCustom && <button onClick={() => handleRemoveTab(groupId, tab.url)} title="Remove from Group" style={iconBtnStyle}>✕</button>}
          </div>
        )}
      </div>
    );
  };

  const renderSessionGroup = (session: Group) => {
    const isExpanded = expandedSessions[session.id];
    return (
      <div key={session.id} style={{ border: '1px solid #dadce0', borderRadius: '12px', backgroundColor: '#fff', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', marginBottom: '16px' }}>
        <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div onClick={() => toggleSession(session.id)} style={{ flex: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '14px', color: '#5f6368', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>▶</span>
            <div>
              {editingSessionId === session.id ? (
                <input autoFocus value={editingSessionName} onChange={e => setEditingSessionName(e.target.value)} onBlur={() => handleFinishRenameSession(session)} onKeyDown={e => e.key === 'Enter' && handleFinishRenameSession(session)} onClick={e => e.stopPropagation()} style={{ fontSize: '16px', fontWeight: 600, padding: '4px 8px', border: '1px solid #1a73e8', borderRadius: '4px', margin: '0 0 4px 0' }} />
              ) : (
                <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 600 }}>{session.name}</h3>
              )}
              <div style={{ fontSize: '13px', color: '#80868b' }}>{new Date(session.createdAt).toLocaleString()} • {session.tabs.length} tabs {session.windowScope === 'all' ? '• (All Windows)' : ''}</div>
            </div>
            {!isExpanded && session.tabs.length > 0 && <div style={{ marginLeft: '24px' }}>{renderFaviconStrip(session.tabs)}</div>}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={(e) => handleStartRenameSession(session, e)} style={iconBtnStyle} title="Rename">✏️</button>
            <button onClick={() => handleOpenTabs(session)} style={btnStyle('#fff', '#1a73e8', '1px solid #dadce0')}>Open Tabs</button>
            <button onClick={() => handleDeleteSession(session.id)} style={btnStyle('#fff', '#d93025', '1px solid #dadce0')}>Delete</button>
          </div>
        </div>
        {isExpanded && (
          <div style={{ padding: '0 20px 20px 20px', borderTop: '1px solid #f1f3f4', paddingTop: '16px', backgroundColor: '#fafbfc' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
              {session.tabs.map(tab => renderTabCard(tab, true, session.id, false))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (sessions.length === 0 && customGroups.length === 0 && !searchQuery && !floatingEditorGroup) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'system-ui' }}>
        <h1 style={{ fontSize: '24px', color: '#202124', marginBottom: '8px' }}>No sessions saved yet</h1>
        <p style={{ color: '#5f6368', marginBottom: '24px' }}>Start by saving your current tabs</p>
        <button onClick={() => handleDashboardSave("SAVE_CURRENT_SESSION")} style={{ ...btnStyle('#1a73e8', '#fff', 'none'), padding: '12px 24px', fontSize: '15px' }}>
          {saveStatus || 'Save Current Window'}
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '950px', margin: '0 auto', padding: '40px 20px', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#202124', paddingBottom: selectedTabs.size > 0 ? '100px' : '40px' }}>
      
      {/* PLAYING TABS MODAL (Keeps overlay because it's purely view-only) */}
      {playingTabsModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '450px', backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 24px 48px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', maxHeight: '70vh' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fafbfc' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Playing Tabs</h3>
              <button onClick={() => setPlayingTabsModal(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#5f6368' }}>✕</button>
            </div>
            <div style={{ padding: '20px', overflowY: 'auto' }}>
              {playingTabsModal.length === 0 ? (
                <p style={{ color: '#888', textAlign: 'center', margin: 0 }}>No tabs playing audio right now.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {playingTabsModal.map(t => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', border: '1px solid #eee', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
                        <img src={t.favIconUrl || 'https://www.google.com/s2/favicons?domain=google.com'} style={{ width: '16px', height: '16px', marginRight: '12px', borderRadius: '2px' }} />
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '13px', fontWeight: 500 }}>{t.title}</div>
                      </div>
                      <button onClick={() => { if(t.id) chrome.tabs.update(t.id, { active: true }); }} style={btnStyle('#f1f3f4', '#202124', '1px solid #dadce0')}>Go</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FULLY DRAGGABLE & RESIZABLE FLOATING GROUP EDITOR PANEL */}
      {floatingEditorGroup && (
        <div 
          style={{ 
            position: 'fixed', 
            top: panelPos.y, 
            left: panelPos.x, 
            width: `${panelSize.w}px`, 
            height: `${panelSize.h}px`, 
            backgroundColor: '#fff', 
            borderRadius: '16px', 
            boxShadow: '0 24px 48px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05)', 
            display: 'flex', 
            flexDirection: 'column', 
            zIndex: 9999,
            overflow: 'hidden' // Replaced native resize with custom handlers below
          }}
        >
          {/* CUSTOM RESIZE HANDLES */}
          <div onMouseDown={(e) => { e.preventDefault(); setIsResizingPanel('right'); resizeStartPos.current = { x: e.clientX, y: e.clientY, w: panelSize.w, h: panelSize.h }; }} style={{ position: 'absolute', right: 0, top: 0, bottom: '15px', width: '8px', cursor: 'ew-resize', zIndex: 10 }} />
          <div onMouseDown={(e) => { e.preventDefault(); setIsResizingPanel('bottom'); resizeStartPos.current = { x: e.clientX, y: e.clientY, w: panelSize.w, h: panelSize.h }; }} style={{ position: 'absolute', bottom: 0, left: 0, right: '15px', height: '8px', cursor: 'ns-resize', zIndex: 10 }} />
          <div onMouseDown={(e) => { e.preventDefault(); setIsResizingPanel('bottom-right'); resizeStartPos.current = { x: e.clientX, y: e.clientY, w: panelSize.w, h: panelSize.h }; }} style={{ position: 'absolute', bottom: 0, right: 0, width: '15px', height: '15px', cursor: 'nwse-resize', zIndex: 11, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', padding: '4px' }}>
            <svg width="8" height="8" viewBox="0 0 10 10" style={{ fill: '#dadce0' }}><path d="M 8 10 L 10 10 L 10 8 Z M 4 10 L 10 4 L 10 6 L 6 10 Z M 0 10 L 10 0 L 10 2 L 2 10 Z"/></svg>
          </div>

          <div 
            onMouseDown={handlePanelDragStart}
            style={{ 
              padding: '20px', 
              borderBottom: '1px solid #eee', 
              backgroundColor: '#fafbfc',
              cursor: isDraggingPanel ? 'grabbing' : 'grab',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              userSelect: 'none'
            }}
          >
            <input 
              value={floatingEditorGroup.name} 
              onChange={e => setFloatingEditorGroup({...floatingEditorGroup, name: e.target.value})} 
              onMouseDown={e => e.stopPropagation()} 
              style={{ flex: 1, fontSize: '20px', fontWeight: 700, border: 'none', outline: 'none', backgroundColor: 'transparent', color: '#202124' }} 
              placeholder="Workspace Name" 
              autoFocus 
            />
            <button 
              onClick={() => setFloatingEditorGroup(null)} 
              onMouseDown={e => e.stopPropagation()}
              style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#5f6368', padding: '0 4px', lineHeight: 1 }}
            >
              ✕
            </button>
          </div>
          
          <div 
            onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setDragOverEditor(true); }} 
            onDragLeave={() => setDragOverEditor(false)} 
            onDrop={handleDropToEditor} 
            style={{ flex: 1, overflowY: 'auto', padding: '20px', backgroundColor: dragOverEditor ? '#f4f8fe' : '#fff', transition: 'background-color 0.2s' }}
          >
            {floatingEditorGroup.tabs.length === 0 && domainSuggestions.length > 0 && (
              <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f8f9fa', border: '1px solid #e8eaed', borderRadius: '8px' }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#202124' }}>💡 Group by Domain</h4>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {domainSuggestions.map(ds => (
                    <button key={ds.domain} onClick={() => {
                      const newTabs = [...floatingEditorGroup.tabs];
                      ds.tabs.forEach(t => { if (!newTabs.some(x => x.url === t.url)) newTabs.push(t); });
                      setFloatingEditorGroup({...floatingEditorGroup, tabs: newTabs});
                    }} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: '#fff', border: '1px solid #dadce0', borderRadius: '16px', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}>
                      <img src={ds.favicon || `https://www.google.com/s2/favicons?domain=${ds.domain}`} alt="" style={{width: '14px', height: '14px'}} />
                      {ds.domain} <span style={{color: '#80868b'}}>{ds.count}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <h4 style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#5f6368', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tabs in Group ({floatingEditorGroup.tabs.length})</h4>
            {floatingEditorGroup.tabs.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#80868b', border: '2px dashed #dadce0', borderRadius: '8px', fontSize: '14px' }}>Drag & drop tabs here from your dashboard to add them.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {floatingEditorGroup.tabs.map(tab => (
                  <div key={tab.url} style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', background: '#fff', border: '1px solid #eee', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                    <img src={tab.favicon || `https://www.google.com/s2/favicons?domain=${tab.domain}&sz=64`} style={{ width: '16px', height: '16px', marginRight: '12px', borderRadius: '2px' }} />
                    <div style={{ flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', fontSize: '13px', fontWeight: 500, color: '#3c4043' }}>{tab.title}</div>
                    <button onClick={() => setFloatingEditorGroup({...floatingEditorGroup, tabs: floatingEditorGroup.tabs.filter(x => x.url !== tab.url)})} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d93025', fontSize: '14px', padding: '4px' }}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div style={{ padding: '16px 20px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: '12px', backgroundColor: '#fafbfc', paddingRight: '32px' }}>
            <button onClick={() => setFloatingEditorGroup(null)} style={btnStyle('#fff', '#5f6368', '1px solid #dadce0')}>Cancel</button>
            <button onClick={handleSaveFloatingGroup} style={btnStyle('#1a73e8', '#fff', 'none')}>Save Group</button>
          </div>
        </div>
      )}
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ margin: '0 0 4px 0', fontSize: '28px', fontWeight: 700 }}>GenTabs</h1>
          <p style={{ color: '#5f6368', margin: 0, fontSize: '14px' }}>Dashboard & Workspace Manager</p>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {saveStatus && <span style={{ fontSize: '13px', color: '#1a73e8', fontWeight: 600 }}>{saveStatus}</span>}
            <button onClick={() => handleDashboardSave("SAVE_CURRENT_SESSION")} style={btnStyle('#fff', '#1a73e8', '1px solid #dadce0')}>+ Save Current</button>
            <button onClick={() => handleDashboardSave("SAVE_ALL_SESSION")} style={btnStyle('#1a73e8', '#fff', 'none')}>+ Save All</button>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #dadce0', fontSize: '14px', outline: 'none', backgroundColor: '#fff', cursor: 'pointer' }}>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="most_tabs">Most Tabs</option>
              <option value="least_tabs">Least Tabs</option>
            </select>
            <div style={{ position: 'relative', width: '280px' }}>
              <input type="text" placeholder="Search tabs, groups, domains..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '10px 16px 10px 36px', borderRadius: '8px', border: '1px solid #dadce0', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
              <span style={{ position: 'absolute', left: '12px', top: '9px', color: '#80868b', fontSize: '16px' }}>🔍</span>
            </div>
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS GRID */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '14px', color: '#5f6368', fontWeight: 700, marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Quick Actions</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
          {quickActions.map(qa => (
            <button 
              key={qa.title} 
              onClick={qa.action} 
              style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', backgroundColor: '#fff', border: '1px solid #e8eaed', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', textAlign: 'left' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.05)'; e.currentTarget.style.borderColor = '#dadce0'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)'; e.currentTarget.style.borderColor = '#e8eaed'; }}
            >
              <div style={{ fontSize: '20px', backgroundColor: '#f1f3f4', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{qa.icon}</div>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#3c4043' }}>{qa.title}</span>
            </button>
          ))}
        </div>
      </div>
      
      {/* LATEST SESSION SECTION */}
      {latestSessionToShow && (
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '20px', paddingBottom: '12px', marginBottom: '16px', color: '#202124', fontWeight: 600, borderBottom: '1px solid #f1f3f4' }}>Latest Session</h2>
          {renderSessionGroup(latestSessionToShow)}
        </div>
      )}

      {/* CUSTOM GROUPS SECTION */}
      <div style={{ marginBottom: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', marginBottom: '16px', borderBottom: '1px solid #f1f3f4' }}>
          <h2 style={{ fontSize: '20px', color: '#202124', fontWeight: 600, margin: 0 }}>Custom Groups</h2>
          <button onClick={handleOpenCreateEditor} style={btnStyle('#1a73e8', '#fff', 'none')}>+ Create Group</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredCustomGroups.length === 0 ? (
            <p style={{ color: '#80868b', fontSize: '14px', marginTop: 0 }}>No custom groups match.</p>
          ) : (
            filteredCustomGroups.map(group => {
              const isExpanded = expandedCustom[group.id];
              const isDragOver = dragOverGroupId === group.id;

              return (
                <div key={group.id} onDragOver={e => handleDragOver(e, group.id)} onDragLeave={handleDragLeave} onDrop={e => handleDrop(e, group)} style={{ border: isDragOver ? '2px dashed #1a73e8' : '1px solid #dadce0', borderRadius: '12px', backgroundColor: isDragOver ? '#f4f8fe' : '#fff', transition: 'all 0.2s ease', overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div onClick={() => toggleCustom(group.id)} style={{ flex: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '14px', color: '#5f6368', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>▶</span>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {group.name}
                        {group.isPinned && <span title="Pinned" style={{color: '#fbbc04'}}>⭐</span>}
                      </h3>
                      <span style={{ backgroundColor: '#f1f3f4', padding: '4px 10px', borderRadius: '16px', fontSize: '12px', color: '#5f6368', fontWeight: 600 }}>{group.tabs.length} tabs</span>
                      {!isExpanded && group.tabs.length > 0 && <div style={{ marginLeft: '16px' }}>{renderFaviconStrip(group.tabs)}</div>}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={(e) => handleTogglePin(group, e)} style={iconBtnStyle} title={group.isPinned ? "Unpin" : "Pin"}>{group.isPinned ? '★' : '☆'}</button>
                      <button onClick={(e) => handleEditCustomGroup(group, e)} style={iconBtnStyle} title="Edit Group">⚙️</button>
                      <button onClick={() => handleOpenTabs(group)} style={btnStyle('#fff', '#1a73e8', '1px solid #dadce0')}>Open Tabs</button>
                      <button onClick={() => handleDeleteCustom(group.id)} style={btnStyle('#fff', '#d93025', '1px solid #dadce0')}>Delete</button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ padding: '0 20px 20px 20px', backgroundColor: '#fafbfc', borderTop: '1px solid #f1f3f4', paddingTop: '16px' }}>
                      {group.tabs.length === 0 ? (
                        <div style={{ padding: '24px', textAlign: 'center', border: '2px dashed #dadce0', borderRadius: '8px', color: '#80868b', fontSize: '14px', backgroundColor: '#fff' }}>Click ⚙️ Edit to add tabs using Domain grouping, or drag tabs here!</div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                          {group.tabs.map(tab => renderTabCard(tab, false, group.id, true))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ALL SESSIONS SECTION */}
      {remainingSessionsToShow.length > 0 && (
        <div>
          <h2 style={{ fontSize: '20px', paddingBottom: '12px', marginBottom: '16px', color: '#202124', fontWeight: 600, borderBottom: '1px solid #f1f3f4' }}>
            All Sessions
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {remainingSessionsToShow.map(session => renderSessionGroup(session))}
          </div>
        </div>
      )}

      {/* BULK ACTION BAR */}
      {selectedTabs.size > 0 && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTop: '1px solid #dadce0', boxShadow: '0 -4px 12px rgba(0,0,0,0.08)', padding: '16px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 100 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ fontWeight: 600, color: '#1a73e8', fontSize: '15px' }}>
              {selectedTabs.size} tab{selectedTabs.size > 1 ? 's' : ''} selected
            </div>
            <button onClick={() => setSelectedTabs(new Set())} style={{ background: 'none', border: 'none', color: '#5f6368', cursor: 'pointer', textDecoration: 'underline', fontSize: '13px' }}>Clear</button>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <select onChange={handleBulkMoveToGroup} value="" style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #dadce0', backgroundColor: '#f8f9fa', cursor: 'pointer', fontSize: '14px', outline: 'none' }}>
              <option value="" disabled>Copy to Group...</option>
              {customGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <button onClick={handleBulkRemove} style={btnStyle('#fff', '#d93025', '1px solid #dadce0')}>Remove from Custom Groups</button>
            <button onClick={handleBulkOpen} style={btnStyle('#1a73e8', '#fff', 'none')}>Open Selected</button>
          </div>
        </div>
      )}

    </div>
  );
};
