import React, { useState, useMemo, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import SensorCard from '../components/SensorCard';

const DEFAULT_GAUGE_CONFIG = {
  ammonia:  { sensor: 'MQ137',  title: 'Ammonia (NH3)',  key: 'mq137_ammonia',   unit: 'ppm', min: 0,   max: 20,   thresholds: { warning: 10,   danger: 20 },   statusKey: 'mq_status',  category: 'Gases',               color: '#DC2626' },
  airflow:  { sensor: 'FS3000', title: 'Air Velocity',   key: 'fs_airflow',      unit: 'm/s', min: 0.1, max: 2.5,  thresholds: { warning: 2.0,  danger: 2.5 },  statusKey: 'fs_status',  category: 'Air flow & pressure', color: '#0284C7' },
  sht_temp: { sensor: 'SHT31',  title: 'Temperature',    key: 'sht_temperature', unit: '°C',  min: 18,  max: 30,   thresholds: { warning: 28,   danger: 32 },   statusKey: 'sht_status', category: 'Temperature',         color: '#E11D48' },
  bmp_temp: { sensor: 'BMP390', title: 'Temperature',    key: 'bmp_temperature', unit: '°C',  min: 18,  max: 30,   thresholds: { warning: 28,   danger: 32 },   statusKey: 'bmp_status', category: 'Temperature',         color: '#7C3AED' },
  scd_temp: { sensor: 'SCD41',  title: 'Temperature',    key: 'scd_temperature', unit: '°C',  min: 18,  max: 30,   thresholds: { warning: 28,   danger: 32 },   statusKey: 'scd_status', category: 'Temperature',         color: '#D97706' },
  sht_hum:  { sensor: 'SHT31',  title: 'Humidity',       key: 'sht_humidity',    unit: '%',   min: 40,  max: 70,   thresholds: { warning: 65,   danger: 80 },   statusKey: 'sht_status', category: 'Humidity',            color: '#2563EB' },
  scd_hum:  { sensor: 'SCD41',  title: 'Humidity',       key: 'scd_humidity',    unit: '%',   min: 40,  max: 70,   thresholds: { warning: 65,   danger: 80 },   statusKey: 'scd_status', category: 'Humidity',            color: '#0D9488' },
  co2:      { sensor: 'SCD41',  title: 'Carbon Dioxide', key: 'scd_co2',         unit: 'ppm', min: 400, max: 2500, thresholds: { warning: 1500, danger: 2500 }, statusKey: 'scd_status', category: 'Gases',               color: '#1E293B' },
  pressure: { sensor: 'BMP390', title: 'Air Pressure',   key: 'bmp_pressure',    unit: 'hPa', min: 990, max: 1025, thresholds: { warning: 1020, danger: 1030 }, statusKey: 'bmp_status', category: 'Air flow & pressure', color: '#475569' }
};

// Helper: Parse row timestamp into milliseconds
function parseRowTimestampMs(row) {
  if (!row) return null;

  if (row.timestamp_ms != null) {
    const num = Number(row.timestamp_ms);
    if (!isNaN(num) && num > 0) return num;
  }

  if (row.timestamp) {
    if (typeof row.timestamp === 'number') {
      return row.timestamp < 1e12 ? row.timestamp * 1000 : row.timestamp;
    }

    const ts = String(row.timestamp).trim().toLowerCase();
    const regex = /^(\d{1,2})\/(\d{1,2})\/(\d{4}),\s*(\d{1,2}):(\d{2}):(\d{2})\s*(am|pm)$/;
    const match = ts.match(regex);

    if (match) {
      const [, day, month, year, hour, minute, second, ampm] = match;
      let h = parseInt(hour, 10);
      if (ampm === 'pm' && h < 12) h += 12;
      if (ampm === 'am' && h === 12) h = 0;
      return new Date(
        parseInt(year, 10),
        parseInt(month, 10) - 1,
        parseInt(day, 10),
        h,
        parseInt(minute, 10),
        parseInt(second, 10)
      ).getTime();
    }

    const parsed = Date.parse(row.timestamp);
    return isNaN(parsed) ? null : parsed;
  }

  return null;
}

// Format millisecond timestamp to readable time label for chart XAxis
function formatBucketTime(ms) {
  const d = new Date(ms);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getDiagnosticMessage(sensorKey, val) {
  if (sensorKey === 'ammonia') return "Ammonia rising — increase ventilation and check bedding.";
  if (sensorKey === 'co2') return "High CO2 levels — increase fresh air intake immediately.";
  if (sensorKey === 'airflow') {
    if (val < 0.5) return "Low air flow — check that the fans are running.";
    return "High air flow — check fan settings to prevent chilling.";
  }
  if (sensorKey.includes('temp')) return "Temperature out of bounds — check heaters or cooling pads.";
  if (sensorKey.includes('hum')) return "Humidity abnormal — inspect water lines for leaks or adjust ventilation.";
  return "Reading out of safe range — please inspect equipment.";
}

export default function LiveDashboard({ latestData, dataHistory = [] }) {
  const [activeCategory, setActiveCategory] = useState('All readings');
  const [timeWindow, setTimeWindow] = useState('Live'); // 'Live', '0.5h', '1h', 'Custom'
  const [customHours, setCustomHours] = useState(2);    // Default custom moving average = 2 hours
  const [showThresholdModal, setShowThresholdModal] = useState(false);
  const [isCustomizingTab, setIsCustomizingTab] = useState(false);
  const [filterAttentionOnly, setFilterAttentionOnly] = useState(false);

  const [sensorConfigs, setSensorConfigs] = useState(() => {
    const saved = localStorage.getItem('farmThresholdsV7');
    return saved ? JSON.parse(saved) : DEFAULT_GAUGE_CONFIG;
  });

  const [visibleMultiSensors, setVisibleMultiSensors] = useState({
    sht_temp: true, bmp_temp: true, scd_temp: true, sht_hum: true, scd_hum: true
  });

  useEffect(() => {
    localStorage.setItem('farmThresholdsV7', JSON.stringify(sensorConfigs));
  }, [sensorConfigs]);

  // Ensure chronological order (oldest -> newest)
  const sortedHistory = useMemo(() => {
    if (!Array.isArray(dataHistory) || dataHistory.length === 0) {
      return latestData ? [latestData] : [];
    }
    const copy = [...dataHistory];
    copy.sort((a, b) => (parseRowTimestampMs(a) || 0) - (parseRowTimestampMs(b) || 0));
    return copy;
  }, [dataHistory, latestData]);

  // 1. CALCULATE INTERVAL BUCKET AVERAGES (Every 0.5h, Every 1h, or Every Custom Hours)
  const bucketedSeries = useMemo(() => {
    if (sortedHistory.length === 0) return [];

    // In 'Live' mode, return the raw readings directly (last 60 raw points for smooth live chart)
    if (timeWindow === 'Live') {
      return sortedHistory.slice(-60);
    }

    // Determine bucket duration in milliseconds
    let intervalHours = 0.5;
    if (timeWindow === '0.5h') intervalHours = 0.5;
    else if (timeWindow === '1h') intervalHours = 1;
    else if (timeWindow === 'Custom') intervalHours = Math.max(0.05, Number(customHours) || 1);

    const bucketMs = intervalHours * 60 * 60 * 1000;
    const sensorKeys = Object.values(sensorConfigs).map(c => c.key);

    // Group readings into discrete time intervals (e.g., every 30 mins or every 1 hour)
    const bucketsMap = new Map();

    sortedHistory.forEach((row, idx) => {
      const tMs = parseRowTimestampMs(row);
      // Fallback if timestamp is missing: group by sample count (20s per reading -> 180 samples/hr)
      // Get the timestamp of the very first record to use as our anchor point
    const absoluteFirstMs = sortedHistory.length > 0 ? parseRowTimestampMs(sortedHistory[0]) || 0 : 0;

    const bucketId = tMs && absoluteFirstMs
  ? Math.floor((tMs - absoluteFirstMs) / bucketMs) * bucketMs + absoluteFirstMs
  : Math.floor(idx / Math.max(1, Math.round(intervalHours * 180)));

      if (!bucketsMap.has(bucketId)) {
        bucketsMap.set(bucketId, {
          bucketId,
          rows: [],
          firstMs: tMs,
          lastMs: tMs
        });
      }
      const b = bucketsMap.get(bucketId);
      b.rows.push(row);
      if (tMs) b.lastMs = tMs;
    });

    // Calculate 1 average value per interval bucket
    const averagedBuckets = [];
    bucketsMap.forEach((bucket) => {
      const avgRow = {
        sampleCount: bucket.rows.length,
        timestamp_ms: bucket.lastMs || bucket.bucketId,
        time: bucket.lastMs
          ? formatBucketTime(bucket.lastMs)
          : (bucket.rows[bucket.rows.length - 1]?.time || `Window ${averagedBuckets.length + 1}`)
      };

      sensorKeys.forEach((sKey) => {
        const vals = bucket.rows
          .map(r => Number(r[sKey]))
          .filter(v => !isNaN(v));
        avgRow[sKey] = vals.length > 0
          ? vals.reduce((sum, v) => sum + v, 0) / vals.length
          : 0;
      });

      averagedBuckets.push(avgRow);
    });

    return averagedBuckets;
  }, [sortedHistory, timeWindow, customHours, sensorConfigs]);

  // 2. CURRENT DISPLAYED CARD VALUE:
  // - In 'Live' mode: shows the newest raw reading from latestData
  // - In '0.5h' / '1h' / 'Custom' mode: shows the latest interval's moving average
  // 2. TRUE TRAILING MOVING AVERAGE FOR CARDS & AQS
  // When '0.5h' or '1h' is selected, this averages ALL points backward from the latest reading.
  const currentCardData = useMemo(() => {
    if (timeWindow === 'Live') {
      return latestData || sortedHistory[sortedHistory.length - 1] || {};
    }

    if (sortedHistory.length === 0) return latestData || {};

    // Determine window size in milliseconds
    let windowMs = 30 * 60 * 1000; // default 0.5h
    if (timeWindow === '0.5h') windowMs = 30 * 60 * 1000;
    else if (timeWindow === '1h') windowMs = 60 * 60 * 1000;
    else if (timeWindow === 'Custom') windowMs = Math.max(0.05, Number(customHours) || 1) * 60 * 60 * 1000;

    const latestMs = parseRowTimestampMs(sortedHistory[sortedHistory.length - 1]);
    if (!latestMs) return latestData || sortedHistory[sortedHistory.length - 1] || {};

    const cutoff = latestMs - windowMs;

    // Grab ALL historical rows that fall strictly within the trailing window [cutoff, latestMs]
    const windowRows = sortedHistory.filter(r => {
      const t = parseRowTimestampMs(r);
      return t ? t >= cutoff && t <= latestMs : false;
    });

    if (windowRows.length === 0) return latestData || sortedHistory[sortedHistory.length - 1] || {};

    // Compute the true arithmetic mean across all rows in this trailing window
    const averagedResult = { ...latestData };
    Object.values(sensorConfigs).forEach(cfg => {
      const validNums = windowRows
        .map(row => Number(row[cfg.key]))
        .filter(val => !isNaN(val));

      if (validNums.length > 0) {
        averagedResult[cfg.key] = validNums.reduce((sum, v) => sum + v, 0) / validNums.length;
      }
    });

    return averagedResult;
  }, [sortedHistory, timeWindow, customHours, sensorConfigs, latestData]);

  // 3. POULTRY BARN AIR QUALITY SCORE (0 - 100)
  const airQuality = useMemo(() => {
    const nh3 = Number(currentCardData?.mq137_ammonia ?? 0);
    const co2 = Number(currentCardData?.scd_co2 ?? 400);
    const temp = Number(currentCardData?.sht_temperature ?? 25);
    const hum = Number(currentCardData?.sht_humidity ?? 50);
    const air = Number(currentCardData?.fs_airflow ?? 1.0);

    const clamp = (val) => Math.max(0, Math.min(100, val));

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
    let color = '#16A34A';
    let ringColor = '#16A34A';

    if (score < 50) {
      label = 'Emergency';
      color = '#DC2626';
      ringColor = '#DC2626';
    } else if (score < 75) {
      label = 'Fair';
      color = '#D4A017';
      ringColor = '#D4A017';
    }

    return { score, label, color, ringColor };
  }, [currentCardData, sensorConfigs]);

  // 4. DETECT SENSORS THAT NEED ATTENTION
  const attentionItems = useMemo(() => {
    const issues = [];
    Object.keys(sensorConfigs).forEach(k => {
      const cfg = sensorConfigs[k];
      const val = Number(currentCardData?.[cfg.key]);
      if (!isNaN(val)) {
        if (val >= cfg.thresholds.warning || (k === 'airflow' && val < 0.5)) {
          issues.push({
            key: k,
            title: `${cfg.sensor} ${cfg.title}`,
            message: getDiagnosticMessage(k, val)
          });
        }
      }
    });
    return issues;
  }, [currentCardData, sensorConfigs]);

  const categories = ['All readings', 'Temperature', 'Humidity', 'Gases', 'Air flow & pressure'];

  const displayedSensorKeys = Object.keys(sensorConfigs).filter(k => {
    const cfg = sensorConfigs[k];

    if (filterAttentionOnly) {
      const hasIssue = attentionItems.some(issue => issue.key === k);
      if (!hasIssue) return false;
    }

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
  const activeWindowLabel = timeWindow === 'Custom' ? `${customHours}h Avg` : timeWindow;

  return (
    <div className="live-dashboard-wrapper">
      {/* Top Live Status Line */}
      <div className="live-meta-line">
        <span className="live-blue-dot"></span>
        <span>
          Live · updates every 3s · Latest: {latestData?.timestamp || latestData?.time || new Date().toLocaleTimeString()}
          {timeWindow !== 'Live' && ` · Showing ${activeWindowLabel} Moving Average (${bucketedSeries.length} intervals plotted)`}
        </span>
      </div>

      {/* MAIN HEADER ROW */}
      <div className="barn-header-row">
        <div className="barn-title-group">
          <h1 className="barn-main-title">Chicken Farm</h1>
        </div>

        <div className="header-actions">
          {isMultiSensorTab && (
            <button
              className="secondary-pill-btn"
              onClick={() => setIsCustomizingTab(!isCustomizingTab)}
            >
              {isCustomizingTab ? '✓ Done Customizing' : `⚙ Customize ${activeCategory}`}
            </button>
          )}

          <button className="primary-pill-btn" onClick={() => setShowThresholdModal(true)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
              <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
              <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
              <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" />
              <line x1="17" y1="16" x2="23" y2="16" />
            </svg>
            Alert thresholds
          </button>
        </div>
      </div>

      {/* SUMMARY ROW (Attention Banner on Left + Air Quality Score Card on Right) */}
      <div className="dashboard-summary-row">
        {attentionItems.length > 0 ? (
          <div className="attention-banner">
            <div className="attention-header">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18h6" /><path d="M10 22h4" />
                <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
              </svg>
              {attentionItems.length} reading{attentionItems.length > 1 ? 's' : ''} need attention
            </div>

            <ul className="attention-list">
              {attentionItems.map((issue, idx) => (
                <li key={idx}>
                  <strong>{issue.title}:</strong> {issue.message}
                </li>
              ))}
            </ul>

            <button
              className="show-only-btn"
              onClick={() => setFilterAttentionOnly(!filterAttentionOnly)}
            >
              {filterAttentionOnly ? 'Show all sensors' : 'Show only these'}
            </button>
          </div>
        ) : (
          <div className="attention-banner" style={{ backgroundColor: '#DCFCE7', borderColor: '#BBF7D0' }}>
            <div className="attention-header" style={{ color: '#15803D', marginBottom: 0 }}>
              <span style={{ fontSize: '1.2rem', marginRight: '8px' }}>✓</span> All readings are currently within safe limits.
            </div>
          </div>
        )}

        <div className="aqs-card">
          <div className="aqi-ring" style={{ borderColor: airQuality.ringColor }}>
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

      {/* CATEGORY TABS & MOVING AVERAGE SELECTOR ('Live', '0.5h', '1h', 'Custom') */}
      <div className="filter-bar-row">
        <div className="pill-group">
          {categories.map(cat => (
            <button
              key={cat}
              className={`pill-tab-btn ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => {
                setActiveCategory(cat);
                setIsCustomizingTab(false);
                setFilterAttentionOnly(false);
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div className="pill-group">
            {['Live', '0.5h', '1h', 'Custom'].map(win => (
              <button
                key={win}
                className={`pill-tab-btn ${timeWindow === win ? 'active' : ''}`}
                onClick={() => setTimeWindow(win)}
              >
                {win === 'Custom' ? '⚙ Custom Avg' : win}
              </button>
            ))}
          </div>

          {/* Custom Moving Average Input Box when 'Custom' tab is clicked */}
          {timeWindow === 'Custom' && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: '#FFFFFF',
              padding: '6px 14px',
              borderRadius: '999px',
              border: '1.5px solid #0055B8',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: '#032B5E'
            }}>
              <span>Every</span>
              <input
                type="number"
                min="0.1"
                step="0.5"
                value={customHours}
                onChange={(e) => setCustomHours(e.target.value)}
                style={{
                  width: '58px',
                  padding: '4px 6px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  textAlign: 'center',
                  fontWeight: 700
                }}
              />
              <span>Hours</span>
            </div>
          )}
        </div>
      </div>

      {/* Customize Drawer */}
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

      {/* SENSOR CARDS GRID */}
      <div className="sensor-cards-grid">
        {displayedSensorKeys.map(k => {
          const cfg = sensorConfigs[k];
          // Plot the bucketed moving average series on each card's sparkline
          const series = bucketedSeries.map(r => Number(r[cfg.key])).filter(v => !isNaN(v));

          return (
            <SensorCard
              key={k}
              sensorName={cfg.sensor}
              title={cfg.title}
              value={currentCardData?.[cfg.key]}
              unit={cfg.unit}
              min={cfg.min}
              max={cfg.max}
              thresholds={cfg.thresholds}
              status={latestData?.[cfg.statusKey]}
              historyValues={series}
              showInlineChart={activeCategory === 'All readings'}
              windowLabel={activeWindowLabel}
            />
          );
        })}
      </div>

      {/* SEPARATE LINE CHARTS (Plots bucketed moving averages when 0.5h, 1h, or Custom is selected) */}
      {activeCategory !== 'All readings' && (
        <div>
          {isMultiSensorTab ? (
            <div className="separate-chart-card">
              <h3 className="metric-heading" style={{ marginBottom: '16px' }}>
                {activeCategory} Comparison Chart — ({activeWindowLabel} Moving Average)
              </h3>
              <div style={{ width: '100%', height: '340px' }}>
                <ResponsiveContainer width="99%" height="99%">
                  <LineChart data={bucketedSeries}>
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
                          dot={{ r: 3 }}
                          isAnimationActive={false}
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
              {displayedSensorKeys.map(k => {
                const cfg = sensorConfigs[k];
                return (
                  <div key={k} className="separate-chart-card">
                    <h3 className="metric-heading" style={{ marginBottom: '16px' }}>
                      {cfg.sensor} {cfg.title} ({cfg.unit}) — ({activeWindowLabel})
                    </h3>
                    <div style={{ width: '100%', height: '300px' }}>
                      <ResponsiveContainer width="99%" height="99%">
                        <LineChart data={bucketedSeries}>
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
                            dot={{ r: 3 }}
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

      {/* MOVING AVERAGE INTERVAL LOG TABLE (Shows every 30-min, 1-hr, or Custom interval average) */}
      {timeWindow !== 'Live' && bucketedSeries.length > 0 && (
        <div className="separate-chart-card" style={{ marginTop: '24px' }}>
          <h3 className="metric-heading" style={{ marginBottom: '12px' }}>
            Calculated Moving Average Intervals (Every {timeWindow === 'Custom' ? `${customHours}h` : timeWindow})
          </h3>
          <div style={{ overflowX: 'auto', maxHeight: '320px' }}>
            <table className="history-table">
              <thead>
                <tr>
                  <th>Interval Time</th>
                  <th>Samples Averaged</th>
                  {displayedSensorKeys.map(k => (
                    <th key={k}>{sensorConfigs[k].sensor} {sensorConfigs[k].title} ({sensorConfigs[k].unit})</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...bucketedSeries].reverse().map((row, idx) => (
                  <tr key={idx}>
                    <td><strong>{row.time}</strong></td>
                    <td>{row.sampleCount || 1} readings</td>
                    {displayedSensorKeys.map(k => {
                      const cfg = sensorConfigs[k];
                      const decimals = cfg.unit === 'ppm' && cfg.max > 500 ? 0 : 2;
                      return (
                        <td key={k}>
                          {Number(row[cfg.key] ?? 0).toFixed(decimals)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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