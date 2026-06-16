import React from 'react';
import Header from '../components/Header';

export default function Alerts({ alerts, setAlerts }) {
  return (
    <div className="alerts-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Header 
        title="System Alerts & Audit Log" 
        subtitle="Master Node 01 | Putrajaya Farm" 
        alerts={alerts} 
        setAlerts={setAlerts} 
      />

      <div style={{ background: 'white', padding: '25px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #ecf0f1', paddingBottom: '15px', marginBottom: '15px' }}>
          <h2 style={{ margin: 0, color: '#2c3e50' }}>Incident History</h2>
          <button 
            onClick={() => setAlerts([])} 
            disabled={alerts.length === 0}
            style={{ backgroundColor: alerts.length === 0 ? '#bdc3c7' : '#e74c3c', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '5px', cursor: alerts.length === 0 ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
          >
            🗑️ Clear All Logs
          </button>
        </div>

        {alerts.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', background: '#f8f9fa', borderRadius: '8px', border: '1px dashed #bdc3c7' }}>
            <span style={{ fontSize: '3rem' }}>🛡️</span>
            <h3 style={{ color: '#2c3e50', marginTop: '10px' }}>No Active Alerts</h3>
            <p style={{ color: '#7f8c8d' }}>The system is currently stable. All environmental thresholds and hardware diagnostics are normal.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {alerts.map((alert) => {
              // Determine styles based on the type of alert
              let bgColor = '#fff';
              let borderColor = '#ecf0f1';
              let icon = '⚠️';
              let titleColor = '#2c3e50';

              if (alert.type === 'danger') {
                bgColor = '#fff5f5'; borderColor = '#ff7675'; icon = '🔥'; titleColor = '#d63031';
              } else if (alert.type === 'fault') {
                bgColor = '#fff3e0'; borderColor = '#fdcb6e'; icon = '🔌'; titleColor = '#e17055';
              } else if (alert.type === 'warning') {
                bgColor = '#fef9e7'; borderColor = '#ffeaa7'; icon = '☁️'; titleColor = '#f39c12';
              }

              return (
                <div key={alert.id} style={{ display: 'flex', alignItems: 'center', padding: '15px 20px', background: bgColor, borderLeft: `5px solid ${borderColor}`, borderRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <div style={{ fontSize: '1.5rem', marginRight: '20px' }}>{icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', color: titleColor, fontSize: '1.1rem', marginBottom: '4px' }}>{alert.msg}</div>
                    <div style={{ color: '#7f8c8d', fontSize: '0.85rem' }}>Recorded at: {alert.time}</div>
                  </div>
                  <div style={{ color: '#bdc3c7', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    {alert.type}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}