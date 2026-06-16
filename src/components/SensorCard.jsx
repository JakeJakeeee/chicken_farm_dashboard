import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function SensorCard({ title, value, unit, min, max, thresholds, status, isCustomizing }) {
  if (value === undefined || value === null) return null;

  // NUCLEAR FIX: Added constraints to prevent Recharts from bursting the flex container
  const innerContainerStyle = {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxSizing: 'border-box',
    minWidth: 0,
    minHeight: 0,
    overflow: 'hidden'
  };

  if (status === 0) {
    return (
      <div style={innerContainerStyle}>
        <div style={{ textAlign: 'center', fontSize: '0.85rem', fontWeight: 'bold', color: '#c0392b', minHeight: '34px', display: 'flex', alignItems: 'center' }}>
          {title}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#e74c3c' }}>⚠️ OFFLINE</span>
          <span style={{ fontSize: '0.75rem', color: '#95a5a6', marginTop: '2px' }}>Check Node</span>
        </div>
      </div>
    );
  }

  const normalizedValue = Math.max(0, value - min);
  const normalizedMax = max - min;
  let displayValue = normalizedValue > normalizedMax ? normalizedMax : normalizedValue;

  let gaugeColor = "#3498db"; 
  if (thresholds) {
    gaugeColor = "#2ecc71"; 
    if (value >= thresholds.warning) gaugeColor = "#f1c40f"; 
    if (value >= thresholds.danger) gaugeColor = "#e74c3c"; 
  }

  const data = [{ name: title, value: displayValue }, { name: "Empty", value: normalizedMax - displayValue }];

  return (
    <div style={innerContainerStyle}>
      <div style={{ textAlign: 'center', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
        {isCustomizing && <span style={{ color: '#3498db' }}>⠿</span>} {title}
      </div>
      
      <div style={{ position: 'relative', width: '100%', height: '110px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
        {/* 99% Hack eliminates float-pixel rounding loops */}
        <ResponsiveContainer width="99%" height="99%">
          <PieChart>
            <Pie 
              data={data} 
              cx="50%" 
              cy="100%" 
              startAngle={180} 
              endAngle={0} 
              innerRadius={52}  
              outerRadius={78}  
              dataKey="value" 
              stroke="none" 
              isAnimationActive={false} // Leave False. It prevents freezing on fast data updates.
            >
              <Cell fill={gaugeColor} />
              <Cell fill="#f1f5f9" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        
        <div style={{ position: 'absolute', bottom: '-4px', textAlign: 'center', width: '100%' }}>
          <span style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#1e293b' }}>{value}</span>
          <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '2px', fontWeight: '600' }}>{unit}</span>
        </div>
      </div>
    </div>
  );
}