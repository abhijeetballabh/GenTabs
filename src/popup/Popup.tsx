import React, { useState, useEffect } from 'react';

export const Popup: React.FC = () => {
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    chrome.storage.local.get(['theme'], (result) => {
      if (result.theme) {
        const savedTheme = result.theme as 'light' | 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
      }
    });
  }, []);

  const handleSaveSession = (type: string) => {
    setStatus('Saving...');
    chrome.runtime.sendMessage({ type }, (response: any) => {
      if (chrome.runtime.lastError) {
        setStatus('Error');
        return;
      }
      if (response?.success) {
        setStatus('Saved!');
        setTimeout(() => setStatus(''), 2000);
      } else {
        setStatus('Error');
      }
    });
  };

  const handleOpenDashboard = () => {
    chrome.tabs.create({ url: "dashboard.html" });
  };

  return (
    <div className="popup-container">
      <div className="popup-header">
        <div className="logo">
          <div className="logo-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-primary)' }}>
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
          </div>
          <div className="logo-text">GenTabs</div>
        </div>
        {status && <div className={`status-tag ${status.includes('Error') ? 'error' : 'success'}`}>{status}</div>}
      </div>

      <div className="popup-actions">
        <button className="card-btn primary" onClick={() => handleSaveSession("SAVE_CURRENT_SESSION")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          Save Window
        </button>
        
        <button className="card-btn" onClick={() => handleSaveSession("SAVE_ALL_SESSION")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/></svg>
          Save All Windows
        </button>

        <button className="card-btn" onClick={handleOpenDashboard}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
          Open Dashboard
        </button>
      </div>
    </div>
  );
};
