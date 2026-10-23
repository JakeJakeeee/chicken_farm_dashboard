import React from 'react';

export default function Sidebar({ activeTab, setActiveTab, handleLogout, isOpen, toggleSidebar, alertCount = 0 }) {
  return (
    <div className={`sidebar ${!isOpen ? 'collapsed' : ''}`}>
      {/* Brand Header (Yellow logo stays visible when collapsed) */}
      <div className="sidebar-header">
        <div className="sidebar-logo">🌱</div>
        {isOpen && (
          <div className="sidebar-brand-text">
            <h2>Farm IoT</h2>
            <div className="sidebar-subtitle">Barn air monitor</div>
          </div>
        )}
      </div>

      {/* Navigation Menu */}
      <div className="sidebar-menu">
        <button 
          className={`menu-btn ${activeTab === 'live' ? 'active' : ''}`} 
          onClick={() => setActiveTab('live')}
          title="Live Dashboard"
        >
          <span className="menu-icon">📈</span>
          {isOpen && <span>Live Dashboard</span>}
        </button>

        <button 
          className={`menu-btn ${activeTab === 'explorer' ? 'active' : ''}`} 
          onClick={() => setActiveTab('explorer')}
          title="History Explorer"
        >
          <span className="menu-icon">📊</span>
          {isOpen && <span>History Explorer</span>}
        </button>

        <button 
          className={`menu-btn ${activeTab === 'diagnostics' ? 'active' : ''}`} 
          onClick={() => setActiveTab('diagnostics')}
          title="Hardware Status"
        >
          <span className="menu-icon">🎛️</span>
          {isOpen && <span>Hardware Status</span>}
        </button>
        
        <button 
          className={`menu-btn ${activeTab === 'alerts' ? 'active' : ''}`} 
          onClick={() => setActiveTab('alerts')}
          title="System Alerts"
        >
          <span className="menu-icon">🔔</span>
          {isOpen && <span>System Alerts</span>}
          {alertCount > 0 && (
            <span className={`alert-count-badge ${!isOpen ? 'dot-only' : ''}`}>
              {isOpen ? alertCount : ''}
            </span>
          )}
        </button>
      </div>

      {/* Optional Logout Button */}
      {handleLogout && (
        <button onClick={handleLogout} className="logout-btn" title="Log out">
          <span className="menu-icon">🚪</span>
          {isOpen && <span>Log out</span>}
        </button>
      )}

      {/* Middle Floating Arrow Button */}
      <button 
        className="sidebar-middle-toggle" 
        onClick={toggleSidebar} 
        title={isOpen ? "Collapse Sidebar" : "Expand Sidebar"}
      >
        {isOpen ? '‹' : '›'}
      </button>
    </div>
  );
}