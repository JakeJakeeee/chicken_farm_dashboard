import React from 'react';

export default function Sidebar({ activeTab, setActiveTab, handleLogout }) {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>🐔 Farm IoT</h2>
      </div>
      <div className="sidebar-menu">
        <button className={`menu-btn ${activeTab === 'live' ? 'active' : ''}`} onClick={() => setActiveTab('live')}>
          🔴 Live Dashboard
        </button>
        <button className={`menu-btn ${activeTab === 'explorer' ? 'active' : ''}`} onClick={() => setActiveTab('explorer')}>
          📊 History Explorer
        </button>
        <button className={`menu-btn ${activeTab === 'diagnostics' ? 'active' : ''}`} onClick={() => setActiveTab('diagnostics')}>
          🛠️ Hardware Status
        </button>
        {/* NEW ALERTS TAB */}
        <button className={`menu-btn ${activeTab === 'alerts' ? 'active' : ''}`} onClick={() => setActiveTab('alerts')}>
          🚨 System Alerts
        </button>
      </div>
      <button onClick={handleLogout} className="logout-btn">Log Out</button>
    </div>
  );
}