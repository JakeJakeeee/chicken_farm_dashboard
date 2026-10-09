import React from 'react';
import Header from '../components/Header';

// 👇 Note the new props!
export default function Alerts({ alerts, unreadAlerts, onClearNotifications }) {
  return (
    <div className="alerts-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      <Header 
        title="System Alerts & Logs" 
        //subtitle=".." 
        alerts={unreadAlerts} // 👈 Header only gets unread notifications!
        onClearNotifications={onClearNotifications} // 👈 Pass the clear function!
      />

      <div style={{ background: 'white', padding: '25px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #ecf0f1', paddingBottom: '15px', marginBottom: '15px' }}>
          <h2 style={{ margin: 0, color: '#2c3e50' }}>Permanent Incident History</h2>
        </div>

        {/* 👇 The main page still maps the FULL 'alerts' array! */}
        {alerts.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', background: '#f8f9fa', borderRadius: '8px', border: '1px dashed #bdc3c7' }}>
            <span style={{ fontSize: '3rem' }}>🛡️</span>
            <h3 style={{ color: '#2c3e50', marginTop: '10px' }}>No Active Alerts</h3>
            <p style={{ color: '#7f8c8d' }}>The system is currently stable.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {alerts.map((alert) => {
              let bgColor = '#fff';
              let borderColor = '#ecf0f1';
              let icon = '⚠️';
              let titleColor = '#2c3e50';

              if (alert.type === 'danger') {
                bgColor = '#fff5f5'; borderColor = '#ff7675'; icon = ''; titleColor = '#d63031';
              } else if (alert.type === 'fault') {
                bgColor = '#fff3e0'; borderColor = '#fdcb6e'; icon = ''; titleColor = '#e17055';
              } else if (alert.type === 'warning') {
                bgColor = '#fef9e7'; borderColor = '#ffeaa7'; icon = ''; titleColor = '#f39c12';
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