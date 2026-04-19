import React, { useEffect, useState } from 'react';
import { getAllGroups, deleteGroup } from '../api/storage.api';
import type { Group } from '../types/group';

export const Dashboard: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);

  const loadGroups = async () => {
    try {
      const data = await getAllGroups();
      setGroups([...data].reverse());
    } catch (error) {
      console.error('Failed to load groups', error);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const handleOpenTabs = (group: Group) => {
    try {
      if (!group.tabs || group.tabs.length === 0) {
        console.warn('Group has no tabs');
        return;
      }
      
      const urls = group.tabs.map(t => t.url).filter(url => !!url);
      if (urls.length === 0) return;

      chrome.windows.create({ url: urls, focused: true });
    } catch (error) {
      console.error('Failed to open tabs', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteGroup(id);
      loadGroups();
    } catch (error) {
      console.error('Failed to delete group', error);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px', fontFamily: 'sans-serif' }}>
      <h1>GenTabs Dashboard</h1>
      <p style={{ color: '#666' }}>Manage your saved tab sessions below.</p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '30px' }}>
        {groups.length === 0 ? (
          <p>No saved sessions yet.</p>
        ) : (
          groups.map((group) => (
            <div key={group.id} style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', backgroundColor: '#fafafa' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <div>
                  <h2 style={{ margin: '0 0 5px 0', fontSize: '18px' }}>{group.name}</h2>
                  <span style={{ color: '#888', fontSize: '14px' }}>
                    {new Date(group.createdAt).toLocaleString()} • {group.tabs.length} tabs
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={() => handleOpenTabs(group)}
                  style={{ padding: '8px 16px', backgroundColor: '#4285f4', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Open Tabs
                </button>
                <button 
                  onClick={() => handleDelete(group.id)}
                  style={{ padding: '8px 16px', backgroundColor: '#ff4d4d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
