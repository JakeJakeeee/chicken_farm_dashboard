import React, { useState, useMemo, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import SensorCard from '../components/SensorCard';

const DEFAULT_GAUGE_CONFIG = {
  ammonia:  { sensor: 'MQ137',      title: 'Ammonia (NH3)',  key: 'mq137_ammonia',   unit: 'ppm', min: 0,   max: 20,   thresholds: { warning: 10,   danger: 20 },   statusKey: 'mq_status',  category: 'Gases',               color: '#DC2626' },
  airflow:  { sensor: 'FS3000',     title: 'Air Velocity',   key: 'fs_airflow',      unit: 'm/s', min: 0.1, max: 2.5,  thresholds: { warning: 2.0,  danger: 2.5 },  statusKey: 'fs_status',  category: 'Air flow & pressure', color: '#0284C7' },
  sht_temp: { sensor: 'SHT31',      title: 'Temperature',    key: 'sht_temperature', unit: '°C',  min: 18,  max: 30,   thresholds: { warning: 28,   danger: 32 },   statusKey: 'sht_status', category: 'Temperature',         color: '#E11D48' },
  bmp_temp: { sensor: 'BMP390',     title: 'Temperature',    key: 'bmp_temperature', unit: '°C',  min: 18,  max: 30,   thresholds: { warning: 28,   danger: 32 },   statusKey: 'bmp_status', category: 'Temperature',         color: '#7C3AED' },
  scd_temp: { sensor: 'SCD41',      title: 'Temperature',    key: 'scd_temperature', unit: '°C',  min: 18,  max: 30,   thresholds: { warning: 28,   danger: 32 },   statusKey: 'scd_status', category: 'Temperature',         color: '#D97706' },
  sht_hum:  { sensor: 'SHT31',      title: 'Humidity',       key: 'sht_humidity',    unit: '%',   min: 40,  max: 70,   thresholds: { warning: 65,   danger: 80 },   statusKey: 'sht_status', category: 'Humidity',            color: '#2563EB' },
  scd_hum:  { sensor: 'SCD41',      title: 'Humidity',       key: 'scd_humidity',    unit: '%',   min: 40,  max: 70,   thresholds: { warning: 65,   danger: 80 },   statusKey: 'scd_status', category: 'Humidity',            color: '#0D9488' },
  co2:      { sensor: 'SCD41',      title: 'Carbon Dioxide', key: 'scd_co2',         unit: 'ppm', min: 400, max: 2500, thresholds: { warning: 1500, danger: 2500 }, statusKey: 'scd_status', category: 'Gases',               color: '#1E293B' },
  pressure: { sensor: 'BMP390',     title: 'Air Pressure',   key: 'bmp_pressure',    unit: 'hPa', min: 990, max: 1025, thresholds: { warning: 1020, danger: 1030 }, statusKey: 'bmp_status', category: 'Air flow & pressure', color: '#475569' }
};

// Helper: Parse row timestamp into milliseconds
function parseRowTimestampMs(row) {
  if (!row || !row.timestamp) return null;
  if (typeof row.timestamp === 'number') {
    return row.timestamp < 1e12 ? row.timestamp * 1000 : row.timestamp;
  }
  const parsed = Date.parse(row.timestamp);
  return isNaN(parsed) ? null : parsed;
}

export default function LiveDashboard({ latestData, dataHistory = [] }) {
  const [activeCategory, setActiveCategory] = useState('All readings');
  const [timeWindow, setTimeWindow] = useState('0.5h'); // '0.5h' (30 mins) or '1h' (60 mins)
  const [showThresholdModal, setShowThresholdModal] = useState(false);
  const [isCustomizingTab, setIsCustomizingTab] = useState(false);

  // Load customizable thresholds from localStorage
  const [sensorConfigs, setSensorConfigs] = useState(() => {
    const saved = localStorage.getItem('farmThresholdsV7');
    return saved ? JSON.parse(saved) : DEFAULT_GAUGE_CONFIG;
  });

  // Visibility toggles for multiple sensors in Temperature & Humidity tabs
  const [visibleMultiSensors, setVisibleMultiSensors] = useState({
    sht_temp: true,
    bmp_temp: true,
    scd_temp: true,
    sht_hum: true,
    scd_hum: true
  });

  useEffect(() => {
    localStorage.setItem('farmThresholdsV7', JSON.stringify(sensorConfigs));
  }, [sensorConfigs]);

  // 1. FILTER DATA HISTORY BY 0.5h (30 min) OR 1h (60 min) WINDOW
  const windowedHistory = useMemo(() => {
    if (!dataHistory || dataHistory.length === 0) return [];
    const windowMs = timeWindow === '0.5h' ? 30 * 60 * 1000 : 60 * 60 * 1000;
    const latestMs = parseRowTimestampMs(dataHistory[dataHistory.length - 1]);

    if (latestMs) {
      const cutoff = latestMs - windowMs;
      const filtered = dataHistory.filter(r => {
        const t = parseRowTimestampMs(r);
        return t ? t >= cutoff : true;
      });
      if (filtered.length > 0) return filtered;
    }

    // Fallback by sample count (at 20s per sample: 0.5h = 90 samples, 1h = 180 samples)
    const maxSamples = timeWindow === '0.5h' ? 90 : 180;
    return dataHistory.slice(-maxSamples);
  }, [dataHistory, timeWindow]);

  // 2. FORMULA: CALCULATE AVERAGE READING FOR ALL SENSORS IN SELECTED TIME RANGE (0.5h / 1h)
  const averagedData = useMemo(() => {
    if (!windowedHistory.length) return latestData || {};
    const result = { ...latestData };

    Object.values(sensorConfigs).forEach(cfg => {
      const validNums = windowedHistory
        .map(row => Number(row[cfg.key]))
        .filter(val => !isNaN(val));

      if (validNums.length > 0) {
        const sum = validNums.reduce((acc, curr) => acc + curr, 0);
        result[cfg.key] = sum / validNums.length;
      }
    });
    return result;
  }, [windowedHistory, latestData, sensorConfigs]);

  // 3. FORMULA: CALCULATE POULTRY BARN AIR QUALITY SCORE (0 - 100)
  const airQuality = useMemo(() => {
    const nh3 = Number(averagedData?.mq137_ammonia ?? 0);
    const co2 = Number(averagedData?.scd_co2 ?? 400);
    const temp = Number(averagedData?.sht_temperature ?? 25);
    const hum = Number(averagedData?.sht_humidity ?? 50);
    const air = Number(averagedData?.fs_airflow ?? 1.0);

    const clamp = (val) => Math.max(0, Math.min(100, val));

    // Sub-index calculations (100 = ideal, 0 = at or beyond danger threshold)
    const sNh3  = clamp(100 - (nh3 / (sensorConfigs.ammonia.thresholds.danger || 20)) * 100);
    const sCo2  = clamp(100 - (Math.max(0, co2 - 400) / ((sensorConfigs.co2.thresholds.danger || 2500) - 400)) * 100);
    const sTemp = clamp(100 - (Math.abs(temp - 24) / 10) * 100);
    const sHum  = clamp(100 - (Math.abs(hum - 55) / 30) * 100);
    const sAir  = clamp((air / 1.5) * 100);

    const score = Math.round(
      0.35 * sNh3 +
      0.25 * sCo2 +
      0.20 * sTemp +
      0.10 * sHum +
      0.10 * sAir
    );

    let label = 'Good';
    let color = '#16A34A'; // Green
    if (score < 50) {
      label = 'Emergency';
      color = '#DC2626'; // Red
    } else if (score < 75) {
      label = 'Fair';
      color = '#D4A017'; // Yellow
    }

    return { score, label, color };
  }, [averagedData, sensorConfigs]);

  const categories = ['All readings', 'Temperature', 'Humidity', 'Gases', 'Air flow & pressure'];

  // Filter sensors by active tab + multi-sensor customize checkboxes
  const displayedSensorKeys = Object.keys(sensorConfigs).filter(k => {
    const cfg = sensorConfigs[k];
    if (activeCategory !== 'All readings' && cfg.category !== activeCategory) return false;
    if ((activeCategory === 'Temperature' || activeCategory === 'Humidity') && visibleMultiSensors[k] === false) {
      return false;
    }
    return true;
  });

  const handleThresholdEdit = (sensorKey, level, newVal) => {
    setSensorConfigs(prev => ({
      ...prev,
      [sensorKey]: {
        ...prev[sensorKey],
        thresholds: {
          ...prev[sensorKey].thresholds,
          [level]: Number(newVal)
        }
      }
    }));
  };

  const isMultiSensorTab = activeCategory === 'Temperature' || activeCategory === 'Humidity';

  return (
    <div className="live-dashboard-wrapper">
      {/* Top Live Status Line */}
      <div className="live-meta-line">
        <span>
          
        </span>
      </div>

      {/* Main Header Row */}
      <div className="barn-header-row">
        <div className="barn-title-group">
          <h1 className="barn-main-title">Barn air today</h1>

          {/* Air Quality Score Badge */}
          <div className="aqi-widget">
            <div className="aqi-ring" style={{ borderColor: airQuality.color }}>
              {airQuality.score}
            </div>
            <div className="aqi-meta">
              <span className="aqi-caption">AIR QUALITY SCORE</span>
              <span className="aqi-status-text" style={{ color: airQuality.color }}>
                {airQuality.label}
              </span>
            </div>
          </div>
        </div>

        <div className="header-actions">
          {/* Show Customize Button inside Temperature & Humidity tabs */}
          {isMultiSensorTab && (
            <button
              className="secondary-pill-btn"
              onClick={() => setIsCustomizingTab(!isCustomizingTab)}
            >
              {isCustomizingTab ? '✓ Done Customizing' : `⚙ Customize ${activeCategory} Sensors`}
            </button>
          )}

          <button className="primary-pill-btn" onClick={() => setShowThresholdModal(true)}>
            <span> slider</span> Alert thresholds
          </button>
        </div>
      </div>

      {/* Category Tabs (Left) & 0.5h / 1h Average Selector (Right) */}
      <div className="filter-bar-row">
        <div className="pill-group">
          {categories.map(cat => (
            <button
              key={cat}
              className={`pill-tab-btn ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => {
                setActiveCategory(cat);
                setIsCustomizingTab(false);
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 0.5h and 1h Average Time Range Selector */}
        <div className="pill-group">
          {['0.5h', '1h'].map(win => (
            <button
              key={win}
              className={`pill-tab-btn ${timeWindow === win ? 'active' : ''}`}
              onClick={() => setTimeWindow(win)}
            >
              {win}
            </button>
          ))}
        </div>
      </div>

      {/* Customize Drawer for Temperature & Humidity Multi-Sensor Toggles */}
      {isMultiSensorTab && isCustomizingTab && (
        <div className="customize-drawer">
          <strong style={{ fontSize: '0.9rem', color: '#032B5E' }}>
            Select {activeCategory} Sensors to Display:
          </strong>
          {Object.keys(sensorConfigs)
            .filter(k => sensorConfigs[k].category === activeCategory)
            .map(k => (
              <label key={k} className="toggle-label">
                <input
                  type="checkbox"
                  checked={visibleMultiSensors[k] !== false}
                  onChange={() =>
                    setVisibleMultiSensors(prev => ({ ...prev, [k]: !prev[k] }))
                  }
                />
                {sensorConfigs[k].sensor} {sensorConfigs[k].title}
              </label>
            ))}
        </div>
      )}

      {/* Sensor Cards Grid */}
      <div className="sensor-cards-grid">
        {displayedSensorKeys.map(k => {
          const cfg = sensorConfigs[k];
          const series = windowedHistory
            .map(r => Number(r[cfg.key]))
            .filter(v => !isNaN(v));

          return (
            <SensorCard
              key={k}
              sensorName={cfg.sensor}
              title={cfg.title}
              value={averagedData?.[cfg.key]}
              unit={cfg.unit}
              min={cfg.min}
              max={cfg.max}
              thresholds={cfg.thresholds}
              status={latestData?.[cfg.statusKey]}
              historyValues={series}
              showInlineChart={activeCategory === 'All readings'}
              windowLabel={timeWindow}
            />
          );
        })}
      </div>

      {/* SEPARATE LINE CHARTS WITH TIMESTAMPS (Shown only in specific category tabs) */}
      {activeCategory !== 'All readings' && (
        <div>
          {/* Combined Comparison Chart for Temperature or Humidity */}
          {isMultiSensorTab ? (
            <div className="separate-chart-card">
              <h3 className="metric-heading" style={{ marginBottom: '16px' }}>
                {activeCategory} Comparison Chart — Timestamped ({timeWindow} Window)
              </h3>
              <div style={{ width: '100%', height: '340px' }}>
                <ResponsiveContainer width="99%" height="99%">
                  <LineChart data={windowedHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EAE6DA" />
                    <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="#6B7280" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#6B7280" />
                    <Tooltip isAnimationActive={false} />
                    <Legend />
                    {displayedSensorKeys.map(k => {
                      const cfg = sensorConfigs[k];
                      return (
                        <Line
                          key={k}
                          type="monotone"
                          dataKey={cfg.key}
                          name={`${cfg.sensor} ${cfg.title} (${cfg.unit})`}
                          stroke={cfg.color}
                          strokeWidth={2.5}
                          dot={{ r: 2 }}
                          isAnimationActive={false}
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            /* Individual Timestamped Charts for Gases and Air flow & pressure */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
              {displayedSensorKeys.map(k => {
                const cfg = sensorConfigs[k];
                return (
                  <div key={k} className="separate-chart-card">
                    <h3 className="metric-heading" style={{ marginBottom: '16px' }}>
                      {cfg.sensor} {cfg.title} ({cfg.unit}) — Timestamped ({timeWindow})
                    </h3>
                    <div style={{ width: '100%', height: '300px' }}>
                      <ResponsiveContainer width="99%" height="99%">
                        <LineChart data={windowedHistory}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#EAE6DA" />
                          <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="#6B7280" />
                          <YAxis tick={{ fontSize: 11 }} stroke="#6B7280" />
                          <Tooltip isAnimationActive={false} />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey={cfg.key}
                            name={`${cfg.sensor} ${cfg.title}`}
                            stroke={cfg.color}
                            strokeWidth={2.5}
                            dot={{ r: 2 }}
                            isAnimationActive={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ALERT THRESHOLDS MODAL */}
      {showThresholdModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 className="metric-heading" style={{ fontSize: '1.4rem' }}>
                Alert Thresholds (Green / Yellow / Red)
              </h3>
              <button
                onClick={() => setShowThresholdModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {Object.keys(sensorConfigs).map(k => {
              const cfg = sensorConfigs[k];
              return (
                <div key={k} className="threshold-row">
                  <div>
                    <div className="chip-label">{cfg.sensor}</div>
                    <strong>{cfg.title} ({cfg.unit})</strong>
                  </div>

                  <div className="thresh-input-group">
                    <label style={{ color: '#B45309', fontWeight: 600 }}>
                      Warning (Yellow):
                      <input
                        type="number"
                        step="0.1"
                        className="thresh-input"
                        style={{ marginLeft: '6px' }}
                        value={cfg.thresholds.warning}
                        onChange={e => handleThresholdEdit(k, 'warning', e.target.value)}
                      />
                    </label>

                    <label style={{ color: '#B91C1C', fontWeight: 600 }}>
                      Emergency (Red):
                      <input
                        type="number"
                        step="0.1"
                        className="thresh-input"
                        style={{ marginLeft: '6px' }}
                        value={cfg.thresholds.danger}
                        onChange={e => handleThresholdEdit(k, 'danger', e.target.value)}
                      />
                    </label>
                  </div>
                </div>
              );
            })}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '18px' }}>
              <button className="primary-pill-btn" onClick={() => setShowThresholdModal(false)}>
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}