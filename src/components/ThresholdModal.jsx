import React from 'react';

export default function ThresholdModal({
  isOpen,
  onClose,
  sensorConfigs,
  onUpdateSensor,
  emailConfig,
  onUpdateEmailConfig,
  onTestEmail
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-header">
          <h3 className="metric-heading" style={{ fontSize: '1.35rem', margin: 0 }}>
            Alert Thresholds & Ranges
          </h3>
          <button onClick={onClose} className="modal-close-btn" aria-label="Close modal">
            ✕
          </button>
        </div>

        {/* EMAIL NOTIFICATION SETTINGS (Option B: Synced to Node-RED) */}
        <div className="email-alert-config-box">
          <div className="email-config-top">
            <label className="toggle-label" style={{ fontWeight: 700, color: '#032B5E' }}>
              <input
                type="checkbox"
                checked={emailConfig.enabled}
                onChange={(e) => onUpdateEmailConfig({ ...emailConfig, enabled: e.target.checked })}
              />
              Enable Email Alerts in Node-RED
            </label>
            <button
              type="button"
              className="secondary-pill-btn"
              onClick={onTestEmail}
              style={{ padding: '4px 12px', fontSize: '0.78rem' }}
            >
              ✉ Send Test Email
            </button>
          </div>

          {emailConfig.enabled && (
            <div className="email-config-inputs">
              <div className="email-field">
                <span>Recipient Email:</span>
                <input
                  type="email"
                  placeholder="farmer@example.com"
                  value={emailConfig.email}
                  onChange={(e) => onUpdateEmailConfig({ ...emailConfig, email: e.target.value })}
                  className="thresh-text-input"
                />
              </div>
              <div className="email-field">
                <span>Node-RED Sync URL:</span>
                <input
                  type="text"
                  placeholder="http://localhost:1880/api/update-thresholds"
                  value={emailConfig.syncUrl}
                  onChange={(e) => onUpdateEmailConfig({ ...emailConfig, syncUrl: e.target.value })}
                  className="thresh-text-input"
                />
              </div>
            </div>
          )}
        </div>

        {/* SENSOR LIST */}
        <div className="threshold-list-scroll">
          {Object.keys(sensorConfigs).map((k) => {
            const cfg = sensorConfigs[k];
            return (
              <div key={k} className="threshold-row">
                <div className="threshold-sensor-info">
                  <div className="chip-label">{cfg.sensor}</div>
                  <strong>{cfg.title} ({cfg.unit})</strong>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '4px' }}>
                    Scale: {cfg.min} to {cfg.max} {cfg.unit}
                  </div>
                </div>

                {/* 2x2 Grid for Min/Max Range & Warning/Emergency Thresholds */}
                <div className="thresh-controls-grid">
                  <label className="thresh-label range-label">
                    <span>Min Scale:</span>
                    <input
                      type="number"
                      step="0.1"
                      className="thresh-input"
                      value={cfg.min}
                      onChange={(e) => onUpdateSensor(k, 'min', e.target.value)}
                    />
                  </label>

                  <label className="thresh-label range-label">
                    <span>Max Scale:</span>
                    <input
                      type="number"
                      step="0.1"
                      className="thresh-input"
                      value={cfg.max}
                      onChange={(e) => onUpdateSensor(k, 'max', e.target.value)}
                    />
                  </label>

                  <label className="thresh-label warn-label">
                    <span>Warning (Yellow):</span>
                    <input
                      type="number"
                      step="0.1"
                      className="thresh-input"
                      value={cfg.thresholds.warning}
                      onChange={(e) => onUpdateSensor(k, 'warning', e.target.value)}
                    />
                  </label>

                  <label className="thresh-label danger-label">
                    <span>Emergency (Red):</span>
                    <input
                      type="number"
                      step="0.1"
                      className="thresh-input"
                      value={cfg.thresholds.danger}
                      onChange={(e) => onUpdateSensor(k, 'danger', e.target.value)}
                    />
                  </label>
                </div>
              </div>
            );
          })}
        </div>

        <div className="modal-footer">
          <button className="primary-pill-btn" onClick={onClose}>
            Save & Sync to Node-RED
          </button>
        </div>
      </div>
    </div>
  );
}