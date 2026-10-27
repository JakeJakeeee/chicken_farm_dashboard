import React, { useState, useEffect, useMemo } from 'react';
import { DEFAULT_HOUSE_CONFIGS, createInactiveHouseData } from '../config/farmConfigs';

const NODE_RED_BASE_URL = `http://${window.location.hostname || 'localhost'}:1880`;
const NODE_RED_HOUSES_URL = `${NODE_RED_BASE_URL}/api/houses`;

// Default GPS & Blueprint coordinates for Farm 1, Farm 2, Farm 3, etc.
const DEFAULT_LOCATIONS = [
  { lat: 2.9927, lng: 101.7909, zone: 'North Sector A', x: 18, y: 28, capacity: '12,000 Birds' },
  { lat: 2.9935, lng: 101.7921, zone: 'Central Sector B', x: 52, y: 28, capacity: '10,500 Birds' },
  { lat: 2.9918, lng: 101.7932, zone: 'South Sector C', x: 35, y: 66, capacity: '15,000 Birds' },
  { lat: 2.9942, lng: 101.7940, zone: 'East Sector D', x: 74, y: 62, capacity: '8,000 Birds' },
  { lat: 2.9910, lng: 101.7898, zone: 'West Sector E', x: 16, y: 70, capacity: '10,000 Birds' }
];

export default function FarmMap({ latestData = {}, onSelectHouse }) {
  const [houses, setHouses] = useState(() => {
    const saved = localStorage.getItem('farmHousesV1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure Farm 3 is visible if only 2 exist
        if (Object.keys(parsed).length < 3 && !parsed.house3) {
          parsed.house3 = {
            id: 'house3',
            name: 'House 3 - Breeders',
            mqttTopic: 'yeaw_fyp_farm/node3/telemetry',
            isLive: false
          };
        }
        return parsed;
      } catch (e) {
        return DEFAULT_HOUSE_CONFIGS;
      }
    }
    return {
      ...DEFAULT_HOUSE_CONFIGS,
      house3: {
        id: 'house3',
        name: 'House 3 - Breeders',
        mqttTopic: 'yeaw_fyp_farm/node3/telemetry',
        isLive: false
      }
    };
  });

  const [selectedId, setSelectedId] = useState('house1');
  const [viewMode, setViewMode] = useState('blueprint'); // 'blueprint' | 'satellite'

  // Sync latest house list from SQLite (/api/houses)
  useEffect(() => {
    fetch(NODE_RED_HOUSES_URL)
      .then((res) => (res.ok ? res.json() : null))
      .then((dbHouses) => {
        if (dbHouses && Object.keys(dbHouses).length > 0) {
          const merged = { ...dbHouses };
          // Automatically include House 3 if the user hasn't added it yet
          if (Object.keys(merged).length < 3 && !merged.house3) {
            merged.house3 = {
              id: 'house3',
              name: 'House 3 - Breeders',
              mqttTopic: 'yeaw_fyp_farm/node3/telemetry',
              isLive: false
            };
          }
          setHouses(merged);
        }
      })
      .catch(() => {});
  }, []);

  const houseList = useMemo(() => {
    const fallback = createInactiveHouseData();
    return Object.values(houses).map((h, idx) => {
      const loc = DEFAULT_LOCATIONS[idx % DEFAULT_LOCATIONS.length];
      const telemetry = h.isLive ? latestData : fallback;

      const nh3 = Number(telemetry?.mq137_ammonia ?? 0);
      const co2 = Number(telemetry?.scd_co2 ?? 0);
      const temp = Number(telemetry?.sht_temperature ?? 0);
      const hum = Number(telemetry?.sht_humidity ?? 0);
      const air = Number(telemetry?.fs_airflow ?? 0);

      let healthStatus = 'INACTIVE';
      let statusColor = '#64748B';
      let statusBg = '#F1F5F9';

      if (h.isLive) {
        if (nh3 >= 20 || co2 >= 2500 || temp >= 32) {
          healthStatus = 'CRITICAL';
          statusColor = '#DC2626';
          statusBg = '#FEE2E2';
        } else if (nh3 >= 10 || co2 >= 1500 || temp >= 28) {
          healthStatus = 'WARNING';
          statusColor = '#D97706';
          statusBg = '#FEF3C7';
        } else {
          healthStatus = 'OPTIMAL';
          statusColor = '#16A34A';
          statusBg = '#DCFCE7';
        }
      }

      return {
        ...h,
        index: idx + 1,
        lat: loc.lat,
        lng: loc.lng,
        zone: loc.zone,
        x: loc.x,
        y: loc.y,
        capacity: loc.capacity,
        nh3,
        co2,
        temp,
        hum,
        air,
        healthStatus,
        statusColor,
        statusBg,
        timestamp: h.isLive ? (telemetry?.timestamp || 'Live now') : 'Offline'
      };
    });
  }, [houses, latestData]);

  const activeFarm = houseList.find((h) => h.id === selectedId) || houseList[0];

  return (
    <div className="live-dashboard-wrapper" style={{ paddingBottom: '40px' }}>
      {/* Top Meta Bar */}
      <div className="live-meta-line">
        <span className="live-blue-dot" style={{ backgroundColor: '#2563EB' }}></span>
        <span>
          Multi-Farm GIS & Telemetry Map · {houseList.filter((h) => h.isLive).length} Active / {houseList.length} Total Registered Houses in SQLite
        </span>
      </div>

      {/* Main Header */}
      <div className="barn-header-row" style={{ marginBottom: '20px' }}>
        <div className="barn-title-group">
          <h1 className="barn-main-title">Poultry Farm Site Map</h1>
        </div>

        <div className="header-actions">
          <div className="pill-group">
            <button
              className={`pill-tab-btn ${viewMode === 'blueprint' ? 'active' : ''}`}
              onClick={() => setViewMode('blueprint')}
            >
              🗺️ Interactive Site Blueprint
            </button>
            <button
              className={`pill-tab-btn ${viewMode === 'satellite' ? 'active' : ''}`}
              onClick={() => setViewMode('satellite')}
            >
              🌍 GPS Street / Satellite Map
            </button>
          </div>
        </div>
      </div>

      {/* Quick Summary Cards for Farm 1, Farm 2, Farm 3 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}
      >
        {houseList.map((farm) => {
          const isSelected = farm.id === activeFarm?.id;
          return (
            <div
              key={farm.id}
              onClick={() => setSelectedId(farm.id)}
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                padding: '18px',
                cursor: 'pointer',
                border: isSelected ? '2.5px solid #032B5E' : '1px solid #E2E8F0',
                boxShadow: isSelected
                  ? '0 8px 20px rgba(3, 43, 94, 0.12)'
                  : '0 2px 6px rgba(0,0,0,0.04)',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                  FARM {farm.index} · {farm.zone}
                </span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: '999px',
                    backgroundColor: farm.statusBg,
                    color: farm.statusColor
                  }}
                >
                  ● {farm.healthStatus}
                </span>
              </div>

              <h3 style={{ margin: '0 0 6px 0', fontSize: '1.15rem', color: '#0F172A' }}>
                {farm.name}
              </h3>

              <div style={{ fontSize: '0.8rem', color: '#64748B', marginBottom: '14px', fontFamily: 'monospace' }}>
                MQTT: {farm.mqttTopic}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '8px',
                  background: '#F8FAFC',
                  padding: '10px',
                  borderRadius: '10px',
                  textAlign: 'center'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#64748B' }}>Temp</div>
                  <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.9rem' }}>
                    {farm.isLive ? `${farm.temp.toFixed(1)}°C` : '--'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#64748B' }}>Humidity</div>
                  <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.9rem' }}>
                    {farm.isLive ? `${farm.hum.toFixed(0)}%` : '--'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#64748B' }}>NH3</div>
                  <div style={{ fontWeight: 700, color: '#DC2626', fontSize: '0.9rem' }}>
                    {farm.isLive ? `${farm.nh3.toFixed(1)}ppm` : '--'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#64748B' }}>CO2</div>
                  <div style={{ fontWeight: 700, color: '#1E293B', fontSize: '0.9rem' }}>
                    {farm.isLive ? `${farm.co2.toFixed(0)}ppm` : '--'}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MAP + INSPECTOR SPLIT VIEW */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 2fr) minmax(300px, 1fr)',
          gap: '20px',
          alignItems: 'start'
        }}
      >
        {/* LEFT: MAP CANVAS */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '18px',
            border: '1px solid #E2E8F0',
            overflow: 'hidden',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
          }}
        >
          {viewMode === 'blueprint' ? (
            /* 2D INTERACTIVE FARM COMPOUND BLUEPRINT */
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: '480px',
                background: 'linear-gradient(135deg, #ECFCCB 0%, #D9F99D 45%, #BEF264 100%)',
                overflow: 'hidden'
              }}
            >
              {/* Decorative Farm Roads & Perimeter Grid */}
              <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.45 }}>
                <defs>
                  <pattern id="farmGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#65A30D" strokeWidth="0.7" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#farmGrid)" />
                {/* Main Access Road */}
                <path d="M 0 240 L 900 240" stroke="#94A3B8" strokeWidth="28" strokeDasharray="12,8" />
                <path d="M 420 0 L 420 500" stroke="#94A3B8" strokeWidth="22" />
              </svg>

              {/* Central Gateway Node Marker */}
              <div
                style={{
                  position: 'absolute',
                  top: '14px',
                  left: '16px',
                  background: 'rgba(15, 23, 42, 0.85)',
                  color: '#FFF',
                  padding: '8px 14px',
                  borderRadius: '10px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  zIndex: 2
                }}
              >
                📡 Central EMQX & SQLite Server (`farm.db`) · Wildcard: `yeaw_fyp_farm/+/telemetry`
              </div>

              {/* Plot Farm 1, Farm 2, Farm 3 Nodes */}
              {houseList.map((farm) => {
                const isSelected = farm.id === activeFarm?.id;
                return (
                  <div
                    key={farm.id}
                    onClick={() => setSelectedId(farm.id)}
                    style={{
                      position: 'absolute',
                      left: `${farm.x}%`,
                      top: `${farm.y}%`,
                      transform: 'translate(-50%, -50%)',
                      background: '#FFFFFF',
                      border: isSelected ? '3px solid #032B5E' : `2px solid ${farm.statusColor}`,
                      borderRadius: '14px',
                      padding: '12px 16px',
                      minWidth: '210px',
                      cursor: 'pointer',
                      boxShadow: isSelected
                        ? '0 14px 28px rgba(3, 43, 94, 0.28)'
                        : '0 6px 16px rgba(0,0,0,0.12)',
                      zIndex: isSelected ? 10 : 5,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <strong style={{ fontSize: '0.92rem', color: '#0F172A' }}>
                        🏠 {farm.name}
                      </strong>
                      <span
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: farm.statusColor,
                          display: 'inline-block',
                          boxShadow: farm.isLive ? `0 0 8px ${farm.statusColor}` : 'none'
                        }}
                      />
                    </div>

                    <div style={{ fontSize: '0.75rem', color: '#475569', marginBottom: '6px' }}>
                      Node ID: <strong>{farm.mqttTopic.split('/')[1] || farm.id}</strong> · {farm.capacity}
                    </div>

                    {farm.isLive ? (
                      <div style={{ display: 'flex', gap: '8px', fontSize: '0.76rem', fontWeight: 700 }}>
                        <span style={{ background: '#FEE2E2', color: '#B91C1C', padding: '2px 6px', borderRadius: '6px' }}>
                          🌡️ {farm.temp.toFixed(1)}°C
                        </span>
                        <span style={{ background: '#DBEAFE', color: '#1D4ED8', padding: '2px 6px', borderRadius: '6px' }}>
                          💧 {farm.hum.toFixed(0)}%
                        </span>
                        <span style={{ background: '#FEF3C7', color: '#B45309', padding: '2px 6px', borderRadius: '6px' }}>
                          🧪 {farm.nh3.toFixed(1)}ppm
                        </span>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontStyle: 'italic' }}>
                        ⏸ Hardware Node Offline
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* REAL OPENSTREETMAP GPS EMBED FOR SELECTED FARM */
            <div style={{ position: 'relative', width: '100%', height: '480px' }}>
              <iframe
                title="Farm GPS Location"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${activeFarm.lng - 0.005}%2C${activeFarm.lat - 0.003}%2C${activeFarm.lng + 0.005}%2C${activeFarm.lat + 0.003}&layer=mapnik&marker=${activeFarm.lat}%2C${activeFarm.lng}`}
              />
            </div>
          )}
        </div>

        {/* RIGHT: SELECTED FARM TELEMETRY & SYSTEM INSPECTOR */}
        {activeFarm && (
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '18px',
              border: '1px solid #E2E8F0',
              padding: '22px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B' }}>
                SELECTED NODE DETAILS
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '999px',
                  backgroundColor: activeFarm.statusBg,
                  color: activeFarm.statusColor
                }}
              >
                {activeFarm.healthStatus}
              </span>
            </div>

            <h2 style={{ margin: '0 0 4px 0', fontSize: '1.35rem', color: '#0F172A' }}>
              {activeFarm.name}
            </h2>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.84rem', color: '#64748B' }}>
              Zone: {activeFarm.zone} · GPS: {activeFarm.lat.toFixed(4)}° N, {activeFarm.lng.toFixed(4)}° E
            </p>

            <div
              style={{
                background: '#F8FAFC',
                borderRadius: '12px',
                padding: '14px',
                marginBottom: '16px',
                fontSize: '0.84rem'
              }}
            >
              <div style={{ marginBottom: '6px' }}>
                <strong>Hardware Controller:</strong> LilyGO T-A7670G ESP32
              </div>
              <div style={{ marginBottom: '6px' }}>
                <strong>MQTT Topic:</strong> <code>{activeFarm.mqttTopic}</code>
              </div>
              <div style={{ marginBottom: '6px' }}>
                <strong>SQLite `house_id`:</strong> <code>{activeFarm.mqttTopic.split('/')[1] || activeFarm.id}</code>
              </div>
              <div>
                <strong>Last Packet:</strong> {activeFarm.timestamp}
              </div>
            </div>

            <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#0F172A' }}>
              Live Sensor Array Breakdown
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', padding: '8px 12px', background: '#F8FAFC', borderRadius: '8px' }}>
                <span>MQ137 Ammonia (NH3)</span>
                <strong>{activeFarm.isLive ? `${activeFarm.nh3.toFixed(2)} ppm` : 'Offline'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', padding: '8px 12px', background: '#F8FAFC', borderRadius: '8px' }}>
                <span>SCD41 Carbon Dioxide (CO2)</span>
                <strong>{activeFarm.isLive ? `${activeFarm.co2.toFixed(0)} ppm` : 'Offline'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', padding: '8px 12px', background: '#F8FAFC', borderRadius: '8px' }}>
                <span>SHT31 Temperature</span>
                <strong>{activeFarm.isLive ? `${activeFarm.temp.toFixed(2)} °C` : 'Offline'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', padding: '8px 12px', background: '#F8FAFC', borderRadius: '8px' }}>
                <span>SHT31 Humidity</span>
                <strong>{activeFarm.isLive ? `${activeFarm.hum.toFixed(1)} %` : 'Offline'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', padding: '8px 12px', background: '#F8FAFC', borderRadius: '8px' }}>
                <span>FS3000 Air Velocity</span>
                <strong>{activeFarm.isLive ? `${activeFarm.air.toFixed(2)} m/s` : 'Offline'}</strong>
              </div>
            </div>

            {onSelectHouse && (
              <button
                className="primary-pill-btn"
                style={{ width: '100%', justifyContent: 'center', padding: '10px 16px' }}
                onClick={() => onSelectHouse(activeFarm.id)}
              >
                Open {activeFarm.name} Live Charts →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}