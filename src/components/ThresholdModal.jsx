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

        {/* EMAIL & SYSTEM ALERT SETTINGS */}
        <div className="email-alert-config-box">
          <div className="email-config-top">
            <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap' }}>
              <label className="toggle-label" style={{ fontWeight: 700, color: '#032B5E' }}>
                <input
                  type="checkbox"
                  checked={emailConfig.enabled}
                  onChange={(e) => onUpdateEmailConfig({ ...emailConfig, enabled: e.target.checked })}
                />
                Enable Email Alerts
              </label>

              <label className="toggle-label" style={{ fontWeight: 700, color: '#032B5E' }}>
                <input
                  type="checkbox"
                  checked={emailConfig.systemAlertsEnabled !== false}
                  onChange={(e) => onUpdateEmailConfig({ ...emailConfig, systemAlertsEnabled: e.target.checked })}
                />
                Enable System Alerts (Log to DB)
              </label>
            </div>

            <button
              type="button"
              className="secondary-pill-btn"
              onClick={onTestEmail}
              style={{ padding: '4px 12px', fontSize: '0.78rem' }}
            >
              ✉ Send Test Alert
            </button>
          </div>

          <div className="email-config-inputs" style={{ marginTop: '12px' }}>
            {emailConfig.enabled && (
              <div className="email-field">
                <span>Recipient Email:</span>
                <input
                  type="email"
                  placeholder="farmaircondition@gmail.com"
                  value={emailConfig.email}
                  onChange={(e) => onUpdateEmailConfig({ ...emailConfig, email: e.target.value })}
                  className="thresh-text-input"
                />
              </div>
            )}

            <div className="email-field">
              <span>Cooldown Between Alerts (Minutes):</span>
              <input
                type="number"
                min="1"
                step="1"
                value={emailConfig.cooldownMinutes ?? 15}
                onChange={(e) => onUpdateEmailConfig({ ...emailConfig, cooldownMinutes: Number(e.target.value) })}
                className="thresh-text-input"
                style={{ width: '110px' }}
              />
            </div>
          </div>
        </div>

        {/* SENSOR LIST */}
        <div className="threshold-list-scroll">
          {Object.keys(sensorConfigs).map((k) => {
            const cfg = sensorConfigs[k];
            // Default alertTrigger to warning threshold if not explicitly set yet
            const alertTriggerVal = cfg.thresholds.alertTrigger ?? cfg.thresholds.warning;

            return (
              <div key={k} className="threshold-row">
                <div className="threshold-sensor-info">
                  <div className="chip-label">{cfg.sensor}</div>
                  <strong>{cfg.title} ({cfg.unit})</strong>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '4px' }}>
                    Scale: {cfg.min} to {cfg.max} {cfg.unit}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#004799', fontWeight: 600, marginTop: '4px' }}>
                    🔔 Triggers Alert at: &ge; {alertTriggerVal} {cfg.unit}
                  </div>
                </div>

                {/* Controls Grid: Min, Max, Warning, Emergency, and Alert Trigger */}
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

                  {/* NEW: Custom Threshold Value that Triggers Email & System Alert */}
                  <label
                    className="thresh-label"
                    style={{
                      gridColumn: '1 / -1',
                      width: '100%',
                      backgroundColor: '#EFF6FF',
                      border: '1px solid #ebecee',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      color: '#1E40AF',
                      marginTop: '4px'
                    }}
                  >
                    <span>🔔 Email & System Alert Trigger ({cfg.unit}):</span>
                    <input
                      type="number"
                      step="0.1"
                      className="thresh-input"
                      style={{ borderColor: '#032261', color: '#3e4f7a', backgroundColor: '#FFFFFF' }}
                      value={alertTriggerVal}
                      onChange={(e) => onUpdateSensor(k, 'alertTrigger', e.target.value)}
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