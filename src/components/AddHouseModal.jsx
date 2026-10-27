// src/components/AddHouseModal.jsx
import React, { useState } from 'react';
import { createInactiveHouseData } from '../config/farmConfigs';

export default function AddHouseModal({
  isOpen,
  onClose,
  houses,
  onAddHouse,
  onDeleteHouse,
  onToggleHouseLive
}) {
  const existingCount = Object.keys(houses || {}).length;
  const nextNum = existingCount + 1;

  const [houseName, setHouseName] = useState('');
  const [mqttTopic, setMqttTopic] = useState('');
  const [isLive, setIsLive] = useState(false);

  if (!isOpen) return null;

  const suggestedName = `House ${nextNum} - Barn`;
  const suggestedTopic = `yeaw_fyp_farm/node${nextNum}/telemetry`;

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalName = houseName.trim() || suggestedName;
    const finalTopic = mqttTopic.trim() || suggestedTopic;
    const id = `house_${Date.now()}`;

    const newHouse = {
      id,
      name: finalName,
      mqttTopic: finalTopic,
      isLive,
      latestData: createInactiveHouseData(),
      dataHistory: []
    };

    onAddHouse(newHouse);
    setHouseName('');
    setMqttTopic('');
    setIsLive(false);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          width: '100%',
          maxWidth: '500px',
          padding: '24px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
          color: '#0F172A'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#032B5E' }}>
            Manage & Add Farm Houses
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.3rem',
              cursor: 'pointer',
              color: '#64748B'
            }}
          >
            ✕
          </button>
        </div>

        {/* Add New House Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: '#334155' }}>
              Farm / House Name
            </label>
            <input
              type="text"
              placeholder={`e.g. ${suggestedName}`}
              value={houseName}
              onChange={(e) => setHouseName(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '0.9rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: '#334155' }}>
              MQTT Telemetry Topic
            </label>
            <input
              type="text"
              placeholder={suggestedTopic}
              value={mqttTopic}
              onChange={(e) => setMqttTopic(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '0.9rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer', color: '#334155' }}>
              <input
                type="checkbox"
                checked={isLive}
                onChange={(e) => setIsLive(e.target.checked)}
              />
              Hardware node is deployed and streaming live data
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '20px' }}>
            <button
              type="button"
              className="secondary-pill-btn"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="primary-pill-btn"
            >
              + Add Farm House
            </button>
          </div>
        </form>

        {/* Registered Houses List */}
        <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '14px' }}>
          <strong style={{ display: 'block', fontSize: '0.85rem', color: '#475569', marginBottom: '10px' }}>
            Registered Farm Houses ({existingCount})
          </strong>
          <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {Object.values(houses).map((h) => (
              <div
                key={h.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  fontSize: '0.85rem'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: '#0F172A' }}>{h.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{h.mqttTopic}</div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => onToggleHouseLive(h.id)}
                    style={{
                      padding: '3px 8px',
                      borderRadius: '999px',
                      border: '1px solid #CBD5E1',
                      backgroundColor: h.isLive ? '#DCFCE7' : '#F1F5F9',
                      color: h.isLive ? '#15803D' : '#475569',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                    title="Click to toggle Live / Inactive status"
                  >
                    {h.isLive ? '● Live' : '○ Inactive'}
                  </button>

                  {h.id !== 'house1' && (
                    <button
                      type="button"
                      onClick={() => onDeleteHouse(h.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#DC2626',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: 600
                      }}
                      title="Remove House"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}