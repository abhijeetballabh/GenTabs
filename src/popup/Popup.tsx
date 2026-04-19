import React, { useState } from 'react';

export const Popup: React.FC = () => {
  const [status, setStatus] = useState<string>('');

  const handleSaveSession = () => {
    setStatus('Saving...');
    chrome.runtime.sendMessage({ type: "SAVE_SESSION" }, (response: any) => {
      console.log("Save response:", response);
      if (response?.success) {
        setStatus('Saved!');
        setTimeout(() => setStatus(''), 2000);
      } else {
        setStatus('Error!');
      }
    });
  };

  const handleOpenDashboard = () => {
    chrome.tabs.create({ url: "dashboard.html" });
  };

  return (
    <div style={{ padding: '20px', minWidth: '220px', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h2 style={{ marginTop: 0 }}>GenTabs</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button 
          onClick={handleSaveSession}
          style={{
            padding: '10px 20px',
            backgroundColor: '#4285f4',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          {status ? status : 'Save Session'}
        </button>
        
        <button 
          onClick={handleOpenDashboard}
          style={{
            padding: '10px 20px',
            backgroundColor: '#fff',
            color: '#444',
            border: '1px solid #ddd',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Open Dashboard
        </button>
      </div>
    </div>
  );
};
