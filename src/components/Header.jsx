import React, { useState } from 'react';

export default function Header({ title, subtitle, alerts, setAlerts, actionButton }) {
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  return (
    <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {actionButton && actionButton}
        
        {/* ALERT BELL ICON */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setIsAlertOpen(!isAlertOpen)} style={{ background: 'none', border: 'none', fontSize: '1.8rem', cursor: 'pointer', position: 'relative' }}>
            🔔
            {alerts && alerts.length > 0 && (
              <span style={{ position: 'absolute', top: 0, right: 0, background: '#e74c3c', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '0.7rem', fontWeight: 'bold', transform: 'translate(20%, -20%)' }}>
                {alerts.length}
              </span>
            )}
          </button>

          {/* DROPDOWN ALERT MENU */}
          {isAlertOpen && (
            <div style={{ position: 'absolute', top: '120%', right: 0, width: '300px', background: 'white', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', zIndex: 1000, overflow: 'hidden', border: '1px solid #ecf0f1' }}>
              <div style={{ background: '#34495e', color: 'white', padding: '10px 15px', fontWeight: 'bold', fontSize: '0.9rem' }}>Recent System Alerts</div>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {!alerts || alerts.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#7f8c8d', fontSize: '0.9rem' }}>No active alerts. System stable.</div>
                ) : (
                  alerts.map(alert => (
                    <div key={alert.id} style={{ padding: '12px 15px', borderBottom: '1px solid #ecf0f1', display: 'flex', flexDirection: 'column', gap: '4px', background: alert.type === 'fault' ? '#fff5f5' : 'white' }}>
                      <span style={{ fontSize: '0.8rem', color: '#95a5a6' }}>{alert.time}</span>
                      <span style={{ fontSize: '0.9rem', color: alert.type === 'danger' ? '#c0392b' : alert.type === 'fault' ? '#e67e22' : '#2c3e50', fontWeight: 'bold' }}>{alert.msg}</span>
                    </div>
                  ))
                )}
              </div>
              {alerts && alerts.length > 0 && (
                <button onClick={() => setAlerts([])} style={{ width: '100%', padding: '10px', background: '#ecf0f1', border: 'none', cursor: 'pointer', fontWeight: 'bold', color: '#7f8c8d' }}>Clear All Alerts</button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}