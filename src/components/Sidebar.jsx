import React from 'react';

export default function Sidebar({ activeTab, setActiveTab, handleLogout, isOpen, toggleSidebar, alertCount = 0 }) {
  return (
    <div className={`sidebar ${!isOpen ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-brand-text">
          <h2>Farm IoT</h2>
          <div className="sidebar-subtitle">Barn air monitor</div>
        </div>
        {/* Button to hide the sidebar */}
        <button 
          className="sidebar-toggle-btn" 
          onClick={toggleSidebar} 
          title="Hide Sidebar"
        >
          ◀
        </button>
      </div>

      <div className="sidebar-menu">
        <button 
          className={`menu-btn ${activeTab === 'live' ? 'active' : ''}`} 
          onClick={() => setActiveTab('live')}
        >
          <span>Live Dashboard</span>
        </button>

        <button 
          className={`menu-btn ${activeTab === 'explorer' ? 'active' : ''}`} 
          onClick={() => setActiveTab('explorer')}
        >
          <span>History Explorer</span>
        </button>

        <button 
          className={`menu-btn ${activeTab === 'diagnostics' ? 'active' : ''}`} 
          onClick={() => setActiveTab('diagnostics')}
        >
          <span>Hardware Status</span>
        </button>
        
        <button 
          className={`menu-btn ${activeTab === 'alerts' ? 'active' : ''}`} 
          onClick={() => setActiveTab('alerts')}
        >
          <span>System Alerts</span>
          {alertCount > 0 && <span className="alert-count-badge">{alertCount}</span>}
        </button>
      </div>

      <button onClick={handleLogout} className="logout-btn">
        Log out
      </button>
    </div>
  );
}