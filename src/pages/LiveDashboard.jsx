import React, { useState, useEffect, useRef, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import SensorCard from '../components/SensorCard';
import Header from '../components/Header';

// CONFIGURATIONS
const GAUGE_CONFIG = {
  sht_temp: { title: 'SHT31 Temp', key: 'sht_temperature', unit: '°C', min: 0, max: 50, thresholds: { warning: 28, danger: 35 }, statusKey: 'sht_status' },
  bmp_temp: { title: 'BMP390 Temp', key: 'bmp_temperature', unit: '°C', min: 0, max: 50, thresholds: { warning: 28, danger: 35 }, statusKey: 'bmp_status' },
  scd_temp: { title: 'SCD41 Temp', key: 'scd_temperature', unit: '°C', min: 0, max: 50, thresholds: { warning: 28, danger: 35 }, statusKey: 'scd_status' },
  sht_hum: { title: 'SHT31 Hum', key: 'sht_humidity', unit: '%', min: 0, max: 100, thresholds: { warning: 65, danger: 80 }, statusKey: 'sht_status' },
  scd_hum: { title: 'SCD41 Hum', key: 'scd_humidity', unit: '%', min: 0, max: 100, thresholds: { warning: 65, danger: 80 }, statusKey: 'scd_status' },
  ammonia: { title: 'Ammonia (NH3)', key: 'mq137_ammonia', unit: 'ppm', min: 0, max: 30, thresholds: { warning: 10, danger: 20 }, statusKey: 'mq_status' },
  co2: { title: 'Carbon Dioxide', key: 'scd_co2', unit: 'ppm', min: 400, max: 5000, thresholds: { warning: 1500, danger: 3000 }, statusKey: 'scd_status' },
  pressure: { title: 'Air Pressure', key: 'bmp_pressure', unit: 'hPa', min: 900, max: 1100, thresholds: null, statusKey: 'bmp_status' },
  airflow: { title: 'Air Velocity', key: 'fs_air_velocity', unit: 'm/s', min: 0, max: 7.5, thresholds: null, statusKey: 'fs_status' }
};

const CHART_WIDGETS = {
  temp: { title: 'Temperature Comparison (°C)', lines: [{ key: 'sht_temperature', color: '#e74c3c', name: 'SHT31 Temp' }, { key: 'bmp_temperature', color: '#8e44ad', name: 'BMP390 Temp' }, { key: 'scd_temperature', color: '#f39c12', name: 'SCD41 Temp' }] },
  hum: { title: 'Humidity Comparison (%)', lines: [{ key: 'sht_humidity', color: '#3498db', name: 'SHT31 Hum' }, { key: 'scd_humidity', color: '#1abc9c', name: 'SCD41 Hum' }] },
  co2: { title: 'Carbon Dioxide - CO2 (ppm)', lines: [{ key: 'scd_co2', color: '#2c3e50', name: 'CO2 Levels' }] },
  ammonia: { title: 'Ammonia Gas - NH3 (ppm)', lines: [{ key: 'mq137_ammonia', color: '#e74c3c', name: 'Ammonia Levels' }] },
  airflow: { title: 'Air Velocity (m/s)', lines: [{ key: 'fs_air_velocity', color: '#1abc9c', name: 'Air Speed' }] },
  pressure: { title: 'Air Pressure (hPa)', lines: [{ key: 'bmp_pressure', color: '#34495e', name: 'Pressure' }] }
};

// 👇 1. Updated the props here to use unreadAlerts and onClearNotifications
export default function LiveDashboard({ latestData, dataHistory, unreadAlerts, onClearNotifications }) {
  const [isCustomizing, setIsCustomizing] = useState(false);

  // MATRIX DRAG REFS
  const dragType = useRef(null); 
  const dragGaugeItem = useRef(null);
  const dragGaugeOverItem = useRef(null);
  const dragChartItem = useRef(null);
  const dragChartOverItem = useRef(null);

  // VISIBILITY LAYOUTS
  const [dashboardLayout, setDashboardLayout] = useState(() => {
    const saved = localStorage.getItem('farmDashboardLayoutV3');
    return saved ? JSON.parse(saved) : {
      gauge_sht_temp: true, gauge_bmp_temp: true, gauge_scd_temp: true,
      gauge_sht_hum: true, gauge_scd_hum: true, gauge_ammonia: true,
      gauge_co2: true, gauge_pressure: true, gauge_airflow: true,
      chart_temp: true, chart_hum: true, chart_co2: true,
      chart_ammonia: true, chart_airflow: true, chart_pressure: true
    };
  });

  const [gaugeSlots, setGaugeSlots] = useState(() => {
    const saved = localStorage.getItem('farmGaugeMatrixSlotsV3');
    return saved ? JSON.parse(saved) : [
      'sht_hum', 'sht_temp', 'scd_temp', 'co2', 'bmp_temp', 'scd_hum', 'ammonia', 
      'airflow', 'pressure', null, null, null, null, null                       
    ];
  });

  const [chartOrder, setChartOrder] = useState(() => {
    const saved = localStorage.getItem('farmChartOrderMatrixV3');
    return saved ? JSON.parse(saved) : Object.keys(CHART_WIDGETS);
  });

  useEffect(() => {
    localStorage.setItem('farmDashboardLayoutV3', JSON.stringify(dashboardLayout));
    localStorage.setItem('farmGaugeMatrixSlotsV3', JSON.stringify(gaugeSlots));
    localStorage.setItem('farmChartOrderMatrixV3', JSON.stringify(chartOrder));
  }, [dashboardLayout, gaugeSlots, chartOrder]);

  const dragGaugeStart = (e, position) => { 
    dragType.current = 'gauge';
    dragGaugeItem.current = position; 
    e.target.style.opacity = 0.5; 
  };
  
  const dragGaugeEnter = (e, position) => { 
    if (dragType.current !== 'gauge') return; 
    dragGaugeOverItem.current = position; 
  };
  
  const dropGauge = (e) => {
    e.preventDefault();
    if (dragType.current !== 'gauge' || dragGaugeItem.current === null || dragGaugeOverItem.current === null) return;
    
    const copySlots = [...gaugeSlots];
    const sourceData = copySlots[dragGaugeItem.current];
    
    copySlots[dragGaugeItem.current] = copySlots[dragGaugeOverItem.current];
    copySlots[dragGaugeOverItem.current] = sourceData;
    
    setGaugeSlots(copySlots);
    resetDragState();
  };

  const dragChartStart = (e, position) => { 
    dragType.current = 'chart'; 
    dragChartItem.current = position; 
    e.target.style.opacity = 0.5; 
  };
  
  const dragChartEnter = (e, position) => { 
    if (dragType.current !== 'chart') return;
    dragChartOverItem.current = position; 
  };
  
  const dropChart = (e) => {
    e.preventDefault();
    if (dragType.current !== 'chart' || dragChartItem.current === null || dragChartOverItem.current === null) return;
    
    const copyCharts = [...chartOrder];
    const dragData = copyCharts[dragChartItem.current];
    
    copyCharts.splice(dragChartItem.current, 1);
    copyCharts.splice(dragChartOverItem.current, 0, dragData);
    
    setChartOrder(copyCharts);
    resetDragState();
  };

  const resetDragState = () => {
    dragType.current = null;
    dragGaugeItem.current = null;
    dragGaugeOverItem.current = null;
    dragChartItem.current = null;
    dragChartOverItem.current = null;
  };

  const handleLayoutToggle = (key) => setDashboardLayout(prev => ({ ...prev, [key]: !prev[key] }));

  const quickStats = useMemo(() => {
    if (!dataHistory || dataHistory.length === 0) return { maxT: '0.00', minT: '0.00', avgAir: '0.00' };
    const temps = dataHistory.map(d => d.sht_temperature).filter(t => t > 0);
    const airflows = dataHistory.map(d => d.fs_air_velocity);
    return {
      maxT: temps.length ? Math.max(...temps).toFixed(2) : '0.00',
      minT: temps.length ? Math.min(...temps).toFixed(2) : '0.00',
      avgAir: airflows.length ? (airflows.reduce((a, b) => a + b, 0) / airflows.length).toFixed(2) : '0.00'
    };
  }, [dataHistory]);

  return (
    <div className="dashboard-container" style={{ padding: '20px', backgroundColor: '#f8f9fa' }}>
      
      {/* 👇 2. Updated the Header component to pass the new props and enable the bell! */}
      <Header 
        title="Live Telemetry" 
        subtitle="Farm data" 
        alerts={unreadAlerts} 
        onClearNotifications={onClearNotifications} 
        showBell={true} 
        actionButton={
          <button onClick={() => setIsCustomizing(!isCustomizing)} style={{ backgroundColor: isCustomizing ? '#e74c3c' : '#3498db', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
            {isCustomizing ? '❌ Lock Layout' : '⚙️ Customize Dashboard'}
          </button>
        } 
      />

      <div style={{ display: 'flex', gap: '15px', marginBottom: '25px' }}>
        <div style={{ flex: 1, background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', padding: '15px', borderRadius: '8px', color: '#b71540', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
          <span>Recent Peak Temp:</span> <span>{quickStats.maxT} °C</span>
        </div>
        <div style={{ flex: 1, background: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)', padding: '15px', borderRadius: '8px', color: '#0c2461', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
          <span>Recent Lowest Temp:</span> <span>{quickStats.minT} °C</span>
        </div>
        <div style={{ flex: 1, background: 'linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)', padding: '15px', borderRadius: '8px', color: '#006266', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
          <span>Average Airflow:</span> <span>{quickStats.avgAir} m/s</span>
        </div>
      </div>

      {isCustomizing && (
        <div style={{ background: '#ecf0f1', padding: '20px', borderRadius: '10px', marginBottom: '25px', border: '1px solid #bdc3c7' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
            <div>
              <h4 style={{ margin: '0 0 12px 0', color: '#2c3e50', borderBottom: '2px solid #3498db', paddingBottom: '5px' }}>Toggle Gauge Blocks:</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {Object.keys(GAUGE_CONFIG).map((key) => (
                  <label key={key} style={{ background: 'white', padding: '8px 12px', borderRadius: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', fontSize: '0.9rem' }}>
                    <input type="checkbox" checked={dashboardLayout[`gauge_${key}`]} onChange={() => handleLayoutToggle(`gauge_${key}`)} style={{ marginRight: '8px' }} />
                    {GAUGE_CONFIG[key].title}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <h4 style={{ margin: '0 0 12px 0', color: '#2c3e50', borderBottom: '2px solid #e67e22', paddingBottom: '5px' }}>Toggle Historical Charts:</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                {Object.keys(CHART_WIDGETS).map((key) => (
                  <label key={key} style={{ background: 'white', padding: '8px 12px', borderRadius: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', fontSize: '0.9rem' }}>
                    <input type="checkbox" checked={dashboardLayout[`chart_${key}`]} onChange={() => handleLayoutToggle(`chart_${key}`)} style={{ marginRight: '8px' }} />
                    {CHART_WIDGETS[key].title.split(' (')[0]}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <h3 style={{ color: '#2c3e50', marginBottom: '15px', fontSize: '1.2rem' }}>Sensor Telemetry Blocks</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginBottom: '10px' }}>
        {gaugeSlots.map((gaugeKey, index) => {
          if (gaugeKey) {
            if (!dashboardLayout[`gauge_${gaugeKey}`]) return null;
            const config = GAUGE_CONFIG[gaugeKey];
            
            return (
              <div key={gaugeKey}
                draggable={isCustomizing}
                onDragStart={(e) => dragGaugeStart(e, index)}
                onDragEnter={(e) => dragGaugeEnter(e, index)}
                onDragEnd={(e) => { e.target.style.opacity = 1; resetDragState(); }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={dropGauge}
                style={{
                  background: 'white', border: isCustomizing ? '2px dashed #3498db' : '1px solid #e2e8f0',
                  borderRadius: '10px', padding: '15px 10px', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', height: '170px', cursor: isCustomizing ? 'grab' : 'default',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.02)', boxSizing: 'border-box',
                  minWidth: 0, minHeight: 0, overflow: 'hidden'
                }}
              >
                <SensorCard title={config.title} value={latestData?.[config.key]} unit={config.unit} min={config.min} max={config.max} thresholds={config.thresholds} status={latestData?.[config.statusKey]} isCustomizing={isCustomizing} />
              </div>
            );
          } else {
            return (
              <div key={`empty_${index}`}
                onDragEnter={(e) => dragGaugeEnter(e, index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={dropGauge}
                style={{
                  height: '170px', borderRadius: '10px',
                  border: isCustomizing ? '2px dashed #cbd5e1' : '2px solid transparent',
                  background: isCustomizing ? '#f1f5f9' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#94a3b8', fontSize: '1.5rem', fontWeight: 'bold'
                }}
              >
                {isCustomizing ? '＋' : ''}
              </div>
            );
          }
        })}
      </div>

      <h3 style={{ color: '#2c3e50', marginBottom: '15px', fontSize: '1.2rem' }}>Historical Analysis Charts</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
        {chartOrder.map((chartKey, index) => {
          const config = CHART_WIDGETS[chartKey];
          if (!dashboardLayout[`chart_${chartKey}`]) return null;

          return (
            <div key={chartKey}
              draggable={isCustomizing}
              onDragStart={(e) => dragChartStart(e, index)}
              onDragEnter={(e) => dragChartEnter(e, index)}
              onDragEnd={(e) => { e.target.style.opacity = 1; resetDragState(); }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={dropChart}
              style={{
                background: 'white', padding: '20px', borderRadius: '12px',
                boxShadow: '0 4px 8px rgba(0,0,0,0.04)', height: '340px',
                border: isCustomizing ? '2px dashed #e67e22' : '1px solid #e2e8f0',
                cursor: isCustomizing ? 'grab' : 'default', display: 'flex', flexDirection: 'column',
                minWidth: 0, minHeight: 0, overflow: 'hidden'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#334155' }}>{config.title}</h3>
                {isCustomizing && <span style={{ color: '#e67e22', fontWeight: 'bold', fontSize: '0.9rem' }}>⠿ Drag Chart</span>}
              </div>
              <div style={{ flex: 1, minHeight: 0, minWidth: 0, width: '100%', overflow: 'hidden' }}>
                <ResponsiveContainer width="99%" height="99%">
                  <LineChart data={dataHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <Tooltip isAnimationActive={false} />
                    <Legend wrapperStyle={{ fontSize: '12px', marginTop: '5px' }} />
                    {config.lines.map((line) => <Line key={line.key} type="monotone" dataKey={line.key} stroke={line.color} name={line.name} strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false} />)}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}