import React, { useState, useEffect, useMemo } from 'react';
import { DEFAULT_HOUSE_CONFIGS, createInactiveHouseData } from '../config/farmConfigs';

const NODE_RED_BASE_URL = `http://${window.location.hostname || 'localhost'}:1880`;
const NODE_RED_HOUSES_URL = `${NODE_RED_BASE_URL}/api/houses`;

// Blueprint layout positions across the grid canvas
const BLUEPRINT_SLOTS = [
  { zone: 'Sector A', x: 25, y: 30 },
  { zone: 'Sector B', x: 65, y: 25 },
  { zone: 'Sector C', x: 40, y: 68 },
  { zone: 'Sector D', x: 75, y: 70 },
  { zone: 'Sector E', x: 18, y: 55 },
  { zone: 'Sector F', x: 50, y: 50 }
];

export default function FarmMap({ latestData = {}, onSelectHouse }) {
  const [houses, setHouses] = useState(() => {
    const saved = localStorage.getItem('farmHousesV1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_HOUSE_CONFIGS;
      }
    }
    return DEFAULT_HOUSE_CONFIGS;
  });

  const [selectedId, setSelectedId] = useState('house1');

  useEffect(() => {
    fetch(NODE_RED_HOUSES_URL)
      .then((res) => (res.ok ? res.json() : null))
      .then((dbHouses) => {
        if (dbHouses && Object.keys(dbHouses).length > 0) {
          setHouses(dbHouses);
          localStorage.setItem('farmHousesV1', JSON.stringify(dbHouses));
        }
      })
      .catch(() => {});
  }, []);

  const houseList = useMemo(() => {
    const fallback = createInactiveHouseData();
    return Object.values(houses).map((h, idx) => {
      const slot = BLUEPRINT_SLOTS[idx % BLUEPRINT_SLOTS.length];
      const telemetry = h.isLive ? latestData : fallback;

      const nh3 = Number(telemetry?.mq137_ammonia ?? 0);
      const co2 = Number(telemetry?.scd_co2 ?? 0);
      const temp = Number(telemetry?.sht_temperature ?? 0);
      const hum = Number(telemetry?.sht_humidity ?? 0);
      const air = Number(telemetry?.sn_airflow ?? 0);

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
        zone: slot.zone,
        x: slot.x,
        y: slot.y,
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
          Multi-Farm System Interface · {houseList.filter((h) => h.isLive).length} Active / {houseList.length} Total Registered Houses in SQLite
        </span>
      </div>

      {/* Main Header */}
      <div className="barn-header-row" style={{ marginBottom: '16px' }}>
        <div className="barn-title-group">
          <h1 className="barn-main-title">Farm Houses System Overview</h1>
        </div>
      </div>

      {/* SCROLLABLE HORIZONTAL BARN CARD STRIP */}
      <div
        style={{
          display: 'flex',
          gap: '16px',
          overflowX: 'auto',
          paddingBottom: '12px',
          marginBottom: '24px',
          scrollbarWidth: 'thin'
        }}
      >
        {houseList.map((farm) => {
          const isSelected = farm.id === activeFarm?.id;
          return (
            <div
              key={farm.id}
              onClick={() => setSelectedId(farm.id)}
              style={{
                minWidth: '280px',
                flex: '0 0 auto',
                background: '#FFFFFF',
                borderRadius: '16px',
                padding: '16px',
                cursor: 'pointer',
                border: isSelected ? '2.5px solid #032B5E' : '1px solid #E2E8F0',
                boxShadow: isSelected
                  ? '0 8px 20px rgba(3, 43, 94, 0.12)'
                  : '0 2px 6px rgba(0,0,0,0.04)',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                  HOUSE {farm.index} · {farm.zone}
                </span>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    backgroundColor: farm.statusBg,
                    color: farm.statusColor
                  }}
                >
                  ● {farm.healthStatus}
                </span>
              </div>

              <h3 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', color: '#0F172A' }}>
                {farm.name}
              </h3>

              <div style={{ fontSize: '0.76rem', color: '#64748B', marginBottom: '12px', fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                MQTT: {farm.mqttTopic}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '6px',
                  background: '#F8FAFC',
                  padding: '8px',
                  borderRadius: '10px',
                  textAlign: 'center'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#64748B' }}>Temp</div>
                  <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.85rem' }}>
                    {farm.isLive ? `${farm.temp.toFixed(1)}°C` : '--'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#64748B' }}>Humidity</div>
                  <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.85rem' }}>
                    {farm.isLive ? `${farm.hum.toFixed(0)}%` : '--'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#64748B' }}>NH3</div>
                  <div style={{ fontWeight: 700, color: '#DC2626', fontSize: '0.85rem' }}>
                    {farm.isLive ? `${farm.nh3.toFixed(1)}p` : '--'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#64748B' }}>CO2</div>
                  <div style={{ fontWeight: 700, color: '#1E293B', fontSize: '0.85rem' }}>
                    {farm.isLive ? `${farm.co2.toFixed(0)}` : '--'}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MAP BACKGROUND CANVAS + INSPECTOR SPLIT VIEW */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 2fr) minmax(300px, 1fr)',
          gap: '20px',
          alignItems: 'start'
        }}
      >
        {/* LEFT: LIGHT GREEN GRID BLUEPRINT BACKGROUND */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '18px',
            border: '1px solid #CBD5E1',
            overflow: 'hidden',
            boxShadow: '0 6px 16px rgba(0,0,0,0.06)'
          }}
        >
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '520px',
              backgroundColor: '#D9F99D',
              overflow: 'hidden'
            }}
          >
            {/* SVG GRID AND ROAD PATTERN */}
            <svg
              width="100%"
              height="100%"
              style={{ position: 'absolute', inset: 0 }}
              preserveAspectRatio="none"
              viewBox="0 0 1000 600"
            >
              <defs>
                <pattern id="gridPattern" width="50" height="50" patternUnits="userSpaceOnUse">
                  <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#BEF264" strokeWidth="1.5" />
                </pattern>
              </defs>
              <rect width="1000" height="600" fill="url(#gridPattern)" />

              {/* Compound Access Roads with Dashed Center Markings */}
              <path d="M 0 300 L 1000 300" stroke="#C5E1A5" strokeWidth="60" fill="none" />
              <path d="M 0 300 L 1000 300" stroke="#9E9E9E" strokeWidth="4" strokeDasharray="16,12" fill="none" />

              <path d="M 500 0 L 500 600" stroke="#C5E1A5" strokeWidth="50" fill="none" />
              <path d="M 500 0 L 500 600" stroke="#9E9E9E" strokeWidth="4" strokeDasharray="16,12" fill="none" />
            </svg>

            {/* Top Badge */}
            <div
              style={{
                position: 'absolute',
                top: '14px',
                left: '16px',
                background: 'rgba(15, 23, 42, 0.88)',
                color: '#FFF',
                padding: '8px 14px',
                borderRadius: '10px',
                fontSize: '0.78rem',
                fontWeight: 600,
                zIndex: 2,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
              }}
            >
              📐 Compound Blueprint Grid · Wildcard: `yeaw_fyp_farm/+/telemetry`
            </div>

            {/* Plot Registered Barn Houses as Interactive Nodes */}
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
                      : '0 6px 16px rgba(0,0,0,0.15)',
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

                  <div style={{ fontSize: '0.74rem', color: '#475569', marginBottom: '6px' }}>
                    Node ID: <strong>{farm.mqttTopic.split('/')[1] || farm.id}</strong> · {farm.zone}
                  </div>

                  {farm.isLive ? (
                    <div style={{ display: 'flex', gap: '6px', fontSize: '0.74rem', fontWeight: 700 }}>
                      <span style={{ background: '#FEE2E2', color: '#B91C1C', padding: '2px 5px', borderRadius: '5px' }}>
                        🌡️ {farm.temp.toFixed(1)}°C
                      </span>
                      <span style={{ background: '#DBEAFE', color: '#1D4ED8', padding: '2px 5px', borderRadius: '5px' }}>
                        💧 {farm.hum.toFixed(0)}%
                      </span>
                      <span style={{ background: '#FEF3C7', color: '#B45309', padding: '2px 5px', borderRadius: '5px' }}>
                        🧪 {farm.nh3.toFixed(1)}p
                      </span>
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.74rem', color: '#94A3B8', fontStyle: 'italic' }}>
                      ⏸ Hardware Node Offline
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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
              Location: {activeFarm.zone}
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
                <span>SN3000 Air Velocity</span>
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