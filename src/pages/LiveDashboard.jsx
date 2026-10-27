import React, { useState, useMemo, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import SensorCard from '../components/SensorCard';
import ThresholdModal from '../components/ThresholdModal';
import { HOUSE_CONFIGS } from '../config/farmConfigs';

const DEFAULT_GAUGE_CONFIG = {
  ammonia:  { sensor: 'MQ137',  title: 'Ammonia (NH3)',  key: 'mq137_ammonia',   unit: 'ppm', min: 0,   max: 30,   thresholds: { warning: 10,   danger: 20,   lowTrigger: 0,   highTrigger: 10 },   statusKey: 'mq_status',  category: 'Gases',               color: '#DC2626' },
  airflow:  { sensor: 'FS3000', title: 'Air Velocity',   key: 'fs_airflow',      unit: 'm/s', min: 0.1, max: 2.5,  thresholds: { warning: 2.0,  danger: 2.5,  lowTrigger: 0.5, highTrigger: 2.0 },  statusKey: 'fs_status',  category: 'Air flow & pressure', color: '#0284C7' },
  sht_temp: { sensor: 'SHT31',  title: 'Temperature',    key: 'sht_temperature', unit: '°C',  min: 18,  max: 35,   thresholds: { warning: 28,   danger: 32,   lowTrigger: 20,  highTrigger: 28 },   statusKey: 'sht_status', category: 'Temperature',         color: '#E11D48' },
  bmp_temp: { sensor: 'BMP390', title: 'Temperature',    key: 'bmp_temperature', unit: '°C',  min: 18,  max: 35,   thresholds: { warning: 28,   danger: 32,   lowTrigger: 20,  highTrigger: 28 },   statusKey: 'bmp_status', category: 'Temperature',         color: '#7C3AED' },
  scd_temp: { sensor: 'SCD41',  title: 'Temperature',    key: 'scd_temperature', unit: '°C',  min: 18,  max: 35,   thresholds: { warning: 28,   danger: 32,   lowTrigger: 20,  highTrigger: 28 },   statusKey: 'scd_status', category: 'Temperature',         color: '#D97706' },
  sht_hum:  { sensor: 'SHT31',  title: 'Humidity',       key: 'sht_humidity',    unit: '%',   min: 40,  max: 90,   thresholds: { warning: 65,   danger: 80,   lowTrigger: 45,  highTrigger: 65 },   statusKey: 'sht_status', category: 'Humidity',            color: '#2563EB' },
  scd_hum:  { sensor: 'SCD41',  title: 'Humidity',       key: 'scd_humidity',    unit: '%',   min: 40,  max: 90,   thresholds: { warning: 65,   danger: 80,   lowTrigger: 45,  highTrigger: 65 },   statusKey: 'scd_status', category: 'Humidity',            color: '#0D9488' },
  co2:      { sensor: 'SCD41',  title: 'Carbon Dioxide', key: 'scd_co2',         unit: 'ppm', min: 400, max: 2500, thresholds: { warning: 1500, danger: 2500, lowTrigger: 400, highTrigger: 1500 }, statusKey: 'scd_status', category: 'Gases',               color: '#1E293B' },
  pressure: { sensor: 'BMP390', title: 'Air Pressure',   key: 'bmp_pressure',    unit: 'hPa', min: 990, max: 1035, thresholds: { warning: 1020, danger: 1030, lowTrigger: 995, highTrigger: 1020 }, statusKey: 'bmp_status', category: 'Air flow & pressure', color: '#475569' }
};

// Automatically points to port 1880 on whatever machine/IP you open the dashboard from
const NODE_RED_SYNC_URL = `http://${window.location.hostname || 'localhost'}:1880/api/update-thresholds`;

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

function formatTimeRange(startMs, endMs) {
  const start = new Date(startMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const end = new Date(endMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${start} – ${end}`;
}

function formatBootAndUptime(bootMs, currentMs) {
  const bMs = Number(bootMs);
  if (!bMs || isNaN(bMs) || bMs < 1e11) return null;

  const bootDateStr = new Date(bMs).toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  const nowMs = Number(currentMs) || Date.now();
  const diffSec = Math.max(0, Math.floor((nowMs - bMs) / 1000));
  const hrs = Math.floor(diffSec / 3600);
  const mins = Math.floor((diffSec % 3600) / 60);
  const secs = diffSec % 60;

  const uptimeStr = hrs > 0 ? `${hrs}h ${mins}m ${secs}s` : `${mins}m ${secs}s`;
  return `Powered On: ${bootDateStr} (Uptime: ${uptimeStr})`;
}

function getDiagnosticMessage(sensorKey, val) {
  if (sensorKey === 'ammonia') return "Ammonia out of range — increase ventilation and check bedding.";
  if (sensorKey === 'co2') return "CO2 out of range — increase fresh air intake immediately.";
  if (sensorKey === 'airflow') {
    if (val < 0.5) return "Low air flow — check that the fans are running.";
    return "High air flow — check fan settings to prevent chilling.";
  }
  if (sensorKey.includes('temp')) return "Temperature out of bounds — check heaters or cooling pads.";
  if (sensorKey.includes('hum')) return "Humidity abnormal — inspect water lines for leaks or adjust ventilation.";
  return "Reading out of safe range — please inspect equipment.";
}

export default function LiveDashboard({ latestData, dataHistory = [] }) {
  const [selectedHouseId, setSelectedHouseId] = useState('house1');
  const [activeCategory, setActiveCategory] = useState('All readings');
  const [timeWindow, setTimeWindow] = useState('Live'); // 'Live', '0.5h', '1h', 'Custom'
  const [customHours, setCustomHours] = useState(2);
  const [showThresholdModal, setShowThresholdModal] = useState(false);
  const [isCustomizingTab, setIsCustomizingTab] = useState(false);
  const [filterAttentionOnly, setFilterAttentionOnly] = useState(false);

  const currentHouse = HOUSE_CONFIGS[selectedHouseId] || HOUSE_CONFIGS.house1;
  const activeLatestData = currentHouse.isLive ? latestData : currentHouse.latestData;
  const activeDataHistory = currentHouse.isLive ? dataHistory : currentHouse.dataHistory;

  const [sensorConfigs, setSensorConfigs] = useState(() => {
    const saved = localStorage.getItem('farmThresholdsV10');
    return saved ? JSON.parse(saved) : DEFAULT_GAUGE_CONFIG;
  });

  const [visibleSensors, setVisibleSensors] = useState(() => {
    const saved = localStorage.getItem('farmVisibleSensorsV1');
    if (saved) return JSON.parse(saved);
    return Object.keys(DEFAULT_GAUGE_CONFIG).reduce((acc, k) => ({ ...acc, [k]: true }), {});
  });

  const [emailConfig, setEmailConfig] = useState(() => {
    const saved = localStorage.getItem('farmEmailConfigV3');
    return saved ? JSON.parse(saved) : {
      enabled: true,
      systemAlertsEnabled: true,
      email: 'farmaircondition@gmail.com',
      cooldownMinutes: 15,
      syncUrl: NODE_RED_SYNC_URL
    };
  });

  useEffect(() => {
    localStorage.setItem('farmThresholdsV10', JSON.stringify(sensorConfigs));
  }, [sensorConfigs]);

  useEffect(() => {
    localStorage.setItem('farmVisibleSensorsV1', JSON.stringify(visibleSensors));
  }, [visibleSensors]);

  useEffect(() => {
    localStorage.setItem('farmEmailConfigV3', JSON.stringify(emailConfig));
  }, [emailConfig]);

  // Helper function to sync directly to Node-RED
  const syncToNodeRed = async (customThresholds, customEmailCfg, isTest = false) => {
    const targetUrl = customEmailCfg?.syncUrl || NODE_RED_SYNC_URL;
    try {
      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testEmail: isTest,
          thresholds: customThresholds,
          emailConfig: customEmailCfg
        })
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      console.log('Synced thresholds to Node-RED:', customThresholds);
      if (isTest) {
        alert(`Test alert sent to Node-RED for ${customEmailCfg.email || 'default email'}!`);
      }
    } catch (err) {
      console.error('Failed to sync thresholds to Node-RED:', err);
      alert(`Could not sync to Node-RED at ${targetUrl}.\nMake sure Node-RED is running and deployed!`);
    }
  };

  // Sync saved thresholds to Node-RED once when dashboard loads
  useEffect(() => {
    const targetUrl = emailConfig?.syncUrl || NODE_RED_SYNC_URL;
    fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        thresholds: sensorConfigs,
        emailConfig: emailConfig
      })
    }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Chronological order (oldest -> newest)
  const sortedHistory = useMemo(() => {
    if (!currentHouse.isLive) return [];
    if (!Array.isArray(activeDataHistory) || activeDataHistory.length === 0) {
      return activeLatestData ? [activeLatestData] : [];
    }
    const copy = [...activeDataHistory];
    copy.sort((a, b) => (parseRowTimestampMs(a) || 0) - (parseRowTimestampMs(b) || 0));
    return copy;
  }, [activeDataHistory, activeLatestData, currentHouse.isLive]);

  // 1. CALCULATE START-ANCHORED INTERVAL BUCKET AVERAGES
  const bucketedSeries = useMemo(() => {
    if (!currentHouse.isLive || sortedHistory.length === 0) return [];

    if (timeWindow === 'Live') {
      return sortedHistory.slice(-60);
    }

    let intervalHours = 0.5;
    if (timeWindow === '0.5h') intervalHours = 0.5;
    else if (timeWindow === '1h') intervalHours = 1;
    else if (timeWindow === 'Custom') intervalHours = Math.max(0.05, Number(customHours) || 1);

    const bucketMs = intervalHours * 60 * 60 * 1000;
    const sensorKeys = Object.values(sensorConfigs).map(c => c.key);
    const bucketsMap = new Map();

    const absoluteFirstMs = sortedHistory.length > 0 ? parseRowTimestampMs(sortedHistory[0]) || 0 : 0;

    sortedHistory.forEach((row, idx) => {
      const tMs = parseRowTimestampMs(row);
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

    const averagedBuckets = [];
    bucketsMap.forEach((bucket) => {
      const startTimeMs = bucket.bucketId;
      const endTimeMs = bucket.bucketId + bucketMs;

      const avgRow = {
        sampleCount: bucket.rows.length,
        timestamp_ms: bucket.lastMs || startTimeMs,
        time: startTimeMs > 1e11
          ? formatTimeRange(startTimeMs, endTimeMs)
          : `Window ${averagedBuckets.length + 1}`
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
  }, [sortedHistory, timeWindow, customHours, sensorConfigs, currentHouse.isLive]);

  // 2. TRUE TRAILING MOVING AVERAGE FOR CARDS & AQS
  const currentCardData = useMemo(() => {
    if (!currentHouse.isLive) {
      return activeLatestData || {};
    }

    if (timeWindow === 'Live') {
      return activeLatestData || sortedHistory[sortedHistory.length - 1] || {};
    }

    if (sortedHistory.length === 0) return activeLatestData || {};

    let windowMs = 30 * 60 * 1000;
    if (timeWindow === '0.5h') windowMs = 30 * 60 * 1000;
    else if (timeWindow === '1h') windowMs = 60 * 60 * 1000;
    else if (timeWindow === 'Custom') windowMs = Math.max(0.05, Number(customHours) || 1) * 60 * 60 * 1000;

    const latestMs = parseRowTimestampMs(sortedHistory[sortedHistory.length - 1]);
    if (!latestMs) return activeLatestData || sortedHistory[sortedHistory.length - 1] || {};

    const cutoff = latestMs - windowMs;

    const windowRows = sortedHistory.filter(r => {
      const t = parseRowTimestampMs(r);
      return t ? t >= cutoff && t <= latestMs : false;
    });

    if (windowRows.length === 0) return activeLatestData || sortedHistory[sortedHistory.length - 1] || {};

    const averagedResult = { ...activeLatestData };
    Object.values(sensorConfigs).forEach(cfg => {
      const validNums = windowRows
        .map(row => Number(row[cfg.key]))
        .filter(val => !isNaN(val));

      if (validNums.length > 0) {
        averagedResult[cfg.key] = validNums.reduce((sum, v) => sum + v, 0) / validNums.length;
      }
    });

    return averagedResult;
  }, [sortedHistory, timeWindow, customHours, sensorConfigs, activeLatestData, currentHouse.isLive]);

  // 3. POULTRY BARN AIR QUALITY SCORE (0 - 100)
  const airQuality = useMemo(() => {
    if (!currentHouse.isLive) {
      return { score: 0, label: 'Inactive' };
    }

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
    if (score < 50) label = 'Poor';
    else if (score < 75) label = 'Fair';

    return { score, label };
  }, [currentCardData, sensorConfigs, currentHouse.isLive]);

  // 4. DETECT SENSORS THAT NEED ATTENTION (Checks both Low and High Triggers)
  const attentionItems = useMemo(() => {
    if (!currentHouse.isLive) return [];

    const issues = [];
    Object.keys(sensorConfigs).forEach(k => {
      const cfg = sensorConfigs[k];
      const rawVal = currentCardData?.[cfg.key];
      if (rawVal === null || rawVal === undefined) return;

      const val = Number(rawVal);
      if (!isNaN(val)) {
        const lowLimit = cfg.thresholds.lowTrigger ?? cfg.min;
        const highLimit = cfg.thresholds.highTrigger ?? cfg.thresholds.warning;

        if (val < lowLimit || val >= highLimit) {
          const isDanger = val >= cfg.thresholds.danger;
          issues.push({
            key: k,
            level: isDanger ? 'EMERGENCY' : 'WARNING',
            value: val.toFixed(2),
            unit: cfg.unit,
            threshold: val < lowLimit ? lowLimit : highLimit,
            title: `${cfg.sensor} ${cfg.title}`,
            message: getDiagnosticMessage(k, val)
          });
        }
      }
    });
    return issues;
  }, [currentCardData, sensorConfigs, currentHouse.isLive]);

  // 5. SYNC THRESHOLDS TO NODE-RED WHEN SAVING MODAL
  const handleCloseModalAndSync = () => {
    setShowThresholdModal(false);
    syncToNodeRed(sensorConfigs, emailConfig, false);
  };

  // Send a test request to Node-RED
  const handleSendTestEmail = () => {
    syncToNodeRed(sensorConfigs, emailConfig, true);
  };

  // Update min, max, warning, danger, lowTrigger, or highTrigger
  const handleSensorUpdate = (sensorKey, field, newVal) => {
    const numVal = newVal === '' ? '' : Number(newVal);
    setSensorConfigs(prev => {
      const current = prev[sensorKey];
      if (field === 'min' || field === 'max') {
        return {
          ...prev,
          [sensorKey]: { ...current, [field]: numVal }
        };
      }
      return {
        ...prev,
        [sensorKey]: {
          ...current,
          thresholds: { ...current.thresholds, [field]: numVal }
        }
      };
    });
  };

  const categories = ['All readings', 'Temperature', 'Humidity', 'Gases', 'Air flow & pressure'];
  const isCustomizableCategory = ['All readings', 'Temperature', 'Humidity'].includes(activeCategory);

  const displayedSensorKeys = Object.keys(sensorConfigs).filter(k => {
    const cfg = sensorConfigs[k];

    if (filterAttentionOnly) {
      const hasIssue = attentionItems.some(issue => issue.key === k);
      if (!hasIssue) return false;
    }

    if (activeCategory !== 'All readings' && cfg.category !== activeCategory) return false;

    if (isCustomizableCategory && visibleSensors[k] === false) {
      return false;
    }

    return true;
  });

  const isMultiSensorTab = activeCategory === 'Temperature' || activeCategory === 'Humidity';
  const activeWindowLabel = timeWindow === 'Custom' ? `${customHours}h Avg` : timeWindow;

  return (
    <div className="live-dashboard-wrapper">
      {/* Top Live Status Line */}
      <div className="live-meta-line">
        <span
          className="live-blue-dot"
          style={{ backgroundColor: currentHouse.isLive ? '#2563EB' : '#9CA3AF' }}
        ></span>
        {currentHouse.isLive ? (
          <span>
            {currentHouse.name} · Live · updates every 20s · Latest: {activeLatestData?.timestamp || new Date().toLocaleTimeString()}
            {Number(activeLatestData?.boot_ms) > 0 && ` · ⚡ ${formatBootAndUptime(activeLatestData.boot_ms, activeLatestData.timestamp_ms)}`}
            {timeWindow !== 'Live' && ` · Showing ${activeWindowLabel} Moving Average (${bucketedSeries.length} intervals plotted)`}
          </span>
        ) : (
          <span>
            {currentHouse.name} · Status: <strong>Inactive</strong> (Sensor Node Not Deployed)
          </span>
        )}
      </div>

      {/* MAIN HEADER ROW */}
      <div className="barn-header-row">
        <div className="barn-title-group">
          <h1 className="barn-main-title">Chicken Farm</h1>
        </div>

        <div className="header-actions">
          {/* HOUSE SELECTION PILL DROPDOWN */}
          <select
            value={selectedHouseId}
            onChange={(e) => {
              setSelectedHouseId(e.target.value);
              setFilterAttentionOnly(false);
            }}
            className="secondary-pill-btn"
            style={{
              appearance: 'none',
              WebkitAppearance: 'none',
              MozAppearance: 'none',
              paddingRight: '32px',
              backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23032B5E' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3e%3Cpolyline points='6 9 12 15 18 9'%3e%3C/polyline%3E%3C/svg%3e")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 12px center',
              backgroundSize: '14px',
              cursor: 'pointer'
            }}
          >
            {Object.values(HOUSE_CONFIGS).map((house) => (
              <option key={house.id} value={house.id}>
                {house.name}
              </option>
            ))}
          </select>

          {isCustomizableCategory && (
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

      {/* SUMMARY ROW */}
      <div className="dashboard-summary-row">
        {!currentHouse.isLive ? (
          <div className="attention-banner" style={{ backgroundColor: '#F1F5F9', borderColor: '#CBD5E1' }}>
            <div className="attention-header" style={{ color: '#475569', marginBottom: 0 }}>
              <span style={{ fontSize: '1.1rem', marginRight: '8px' }}>⏸</span>
              {currentHouse.name} is currently <strong>Inactive</strong>. All sensors are offline awaiting hardware deployment.
            </div>
          </div>
        ) : attentionItems.length > 0 ? (
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
                  <strong>{issue.title} ({issue.value} {issue.unit}):</strong> {issue.message}
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

        {/* HORIZONTAL BAR AIR QUALITY SCORE CARD */}
        <div className="aqs-bar-card">
          <div className="aqs-score-top">
            <span className="aqs-big-num">{currentHouse.isLive ? airQuality.score : '--'}</span>
            <span className="aqs-out-of">/100</span>
          </div>

          <div className="aqs-gradient-track" style={{ opacity: currentHouse.isLive ? 1 : 0.4 }}>
            <div
              className="aqs-slider-dot"
              style={{ left: `${currentHouse.isLive ? Math.max(3, Math.min(97, airQuality.score)) : 3}%` }}
            />
          </div>

          <div className="aqs-scale-labels">
            <span>Poor</span>
            <span>Fair</span>
            <span>Good</span>
          </div>
        </div>
      </div>

      {/* CATEGORY TABS & MOVING AVERAGE SELECTOR */}
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

        <div className="window-selector-wrap">
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

          {timeWindow === 'Custom' && (
            <div className="custom-hours-pill">
              <span>Every</span>
              <input
                type="number"
                min="0.1"
                step="0.5"
                value={customHours}
                onChange={(e) => setCustomHours(e.target.value)}
              />
              <span>Hours</span>
            </div>
          )}
        </div>
      </div>

      {/* Customize Drawer */}
      {isCustomizableCategory && isCustomizingTab && (
        <div className="customize-drawer">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '6px' }}>
            <strong style={{ fontSize: '0.9rem', color: '#032B5E' }}>
              Select {activeCategory} Sensors to Display:
            </strong>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="secondary-pill-btn"
                style={{ padding: '3px 10px', fontSize: '0.75rem' }}
                onClick={() => {
                  const updated = { ...visibleSensors };
                  Object.keys(sensorConfigs)
                    .filter(k => activeCategory === 'All readings' || sensorConfigs[k].category === activeCategory)
                    .forEach(k => { updated[k] = true; });
                  setVisibleSensors(updated);
                }}
              >
                Select All
              </button>
            </div>
          </div>

          <div className="customize-checkbox-list">
            {Object.keys(sensorConfigs)
              .filter(k => activeCategory === 'All readings' || sensorConfigs[k].category === activeCategory)
              .map(k => (
                <label key={k} className="toggle-label">
                  <input
                    type="checkbox"
                    checked={visibleSensors[k] !== false}
                    onChange={() =>
                      setVisibleSensors(prev => ({ ...prev, [k]: !prev[k] }))
                    }
                  />
                  {sensorConfigs[k].sensor} {sensorConfigs[k].title}
                </label>
              ))}
          </div>
        </div>
      )}

      {/* SENSOR CARDS GRID */}
      <div className="sensor-cards-grid">
        {displayedSensorKeys.map(k => {
          const cfg = sensorConfigs[k];
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
              status={activeLatestData?.[cfg.statusKey] ?? 0}
              historyValues={series}
              showInlineChart={activeCategory === 'All readings'}
              windowLabel={activeWindowLabel}
            />
          );
        })}
      </div>

      {/* SEPARATE LINE CHARTS */}
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
            <div className="single-charts-grid">
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

      {/* MOVING AVERAGE INTERVAL LOG TABLE */}
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

      {/* EXTRACTED ALERT THRESHOLDS MODAL */}
      <ThresholdModal
        isOpen={showThresholdModal}
        onClose={handleCloseModalAndSync}
        sensorConfigs={sensorConfigs}
        onUpdateSensor={handleSensorUpdate}
        emailConfig={emailConfig}
        onUpdateEmailConfig={setEmailConfig}
        onTestEmail={handleSendTestEmail}
      />
    </div>
  );
}