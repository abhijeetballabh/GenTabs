import React, { useState } from 'react';

export const Popup: React.FC = () => {
  const [status, setStatus] = useState<string>('');

  const handleSaveSession = (type: string) => {
    setStatus('Saving...');
    chrome.runtime.sendMessage({ type }, (response: any) => {
      console.log("Save response:", response);
      if (chrome.runtime.lastError) {
        setStatus('Error: ' + chrome.runtime.lastError.message);
        return;
      }
      if (response?.success) {
        setStatus('Saved!');
        setTimeout(() => setStatus(''), 2000);
      } else {
        setStatus('Error: ' + (response?.error || 'Unknown'));
      }
    });
  };

  const handleOpenDashboard = () => {
    chrome.tabs.create({ url: "dashboard.html" });
  };

  return (
    <div style={{ padding: '20px', minWidth: '220px', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h2 style={{ marginTop: 0, marginBottom: '20px', color: '#202124' }}>GenTabs</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {status && <div style={{ fontSize: '13px', fontWeight: 'bold', color: status.includes('Error') ? '#d93025' : '#1e8e3e', marginBottom: '4px' }}>{status}</div>}
        
        <button 
          onClick={() => handleSaveSession("SAVE_CURRENT_SESSION")}
          style={btnStyle('#4285f4', '#fff')}
        >
          Save Current Window
        </button>

        <button 
          onClick={() => handleSaveSession("SAVE_ALL_SESSION")}
          style={btnStyle('#34a853', '#fff')}
        >
          Save All Windows
        </button>
        
        <button 
          onClick={handleOpenDashboard}
          style={btnStyle('#fff', '#444', '1px solid #ddd')}
        >
          Open Dashboard
        </button>
      </div>
    </div>
  );
};

const btnStyle = (bg: string, color: string, border: string = 'none') => ({
  padding: '10px 20px',
  backgroundColor: bg,
  color,
  border,
  borderRadius: '4px',
  cursor: 'pointer',
  fontWeight: 'bold' as const,
  transition: 'opacity 0.2s',
});
