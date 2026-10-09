import React from 'react';
import Header from '../components/Header';

export default function Diagnostics({ latestData, alerts, setAlerts }) {
  return (
    <div className="diagnostics-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Header 
        title="Hardware Status" 
        //subtitle="..." 
        alerts={alerts} 
        setAlerts={setAlerts} 
      />

      <div style={{ background: 'white', padding: '25px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        <h2 style={{ borderBottom: '2px solid #ecf0f1', paddingBottom: '10px', marginTop: 0 }}>System Architecture</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '15px' }}>
          <div><strong>Controller:</strong> LilyGO T-A7670G R2 (ESP32)</div>
          <div><strong>Network:</strong> 4G LTE (xox)</div>
          <div><strong>RTOS Core 0:</strong> Network & MQTT Publishing Task</div>
          <div><strong>RTOS Core 1:</strong> Sensor Task</div>
          <div><strong>Last Sync:</strong> {latestData?.time || 'Pending...'}</div>
        </div>
      </div>

      <div style={{ background: 'white', padding: '25px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        <h2 style={{ borderBottom: '2px solid #ecf0f1', paddingBottom: '10px', marginTop: 0 }}>Live I2C & Analog Bus Health</h2>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', marginTop: '15px' }}>
          <thead>
            <tr style={{ background: '#f8f9fa' }}>
              <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6' }}>Sensor Module</th>
              <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6' }}>Protocol</th>
              <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6' }}>Address / Pin</th>
              <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6' }}>Current Hardware Status</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #ecf0f1' }}>
              <td style={{ padding: '12px', fontWeight: 'bold' }}>SHT31 (Temp/Hum)</td><td>I2C</td><td>0x44</td>
              <td style={{ color: latestData?.sht_status === 1 ? '#27ae60' : '#e74c3c', fontWeight: 'bold' }}>{latestData?.sht_status === 1 ? '✅ ONLINE' : '❌ OFFLINE (Check Wiring)'}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #ecf0f1' }}>
              <td style={{ padding: '12px', fontWeight: 'bold' }}>BMP390 (Pressure)</td><td>I2C</td><td>0x77</td>
              <td style={{ color: latestData?.bmp_status === 1 ? '#27ae60' : '#e74c3c', fontWeight: 'bold' }}>{latestData?.bmp_status === 1 ? '✅ ONLINE' : '❌ OFFLINE (Check Wiring)'}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #ecf0f1' }}>
              <td style={{ padding: '12px', fontWeight: 'bold' }}>SCD41 (CO2)</td><td>I2C</td><td>0x62</td>
              <td style={{ color: latestData?.scd_status === 1 ? '#27ae60' : '#e74c3c', fontWeight: 'bold' }}>{latestData?.scd_status === 1 ? '✅ ONLINE' : '❌ OFFLINE (Check 5V Power)'}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #ecf0f1' }}>
              <td style={{ padding: '12px', fontWeight: 'bold' }}>FS3000 (Airflow)</td><td>I2C</td><td>0x28</td>
              <td style={{ color: latestData?.fs_status === 1 ? '#27ae60' : '#e74c3c', fontWeight: 'bold' }}>{latestData?.fs_status === 1 ? '✅ ONLINE' : '❌ OFFLINE (Check Wiring)'}</td>
            </tr>
            <tr>
              <td style={{ padding: '12px', fontWeight: 'bold' }}>MQ137 (Ammonia)</td><td>Analog (ADC)</td><td>Pin 34</td>
              <td style={{ color: latestData?.mq_status === 1 ? '#27ae60' : '#e74c3c', fontWeight: 'bold' }}>{latestData?.mq_status === 1 ? '✅ ONLINE' : '❌ FAULT (ADC Read Error)'}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}