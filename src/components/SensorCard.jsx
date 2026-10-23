import React from 'react';

export default function SensorCard({
  sensorName,
  title,
  value,
  unit,
  min,
  max,
  thresholds,
  status,
  historyValues = [],
  showInlineChart = true,
  windowLabel = 'Live'
}) {
  // Default to 0 if value is missing so the card never disappears
  const numericValue = value !== undefined && value !== null && !isNaN(Number(value))
    ? Number(value)
    : 0;

  // Green = Normal, Yellow = Warning, Red = Emergency
  let healthState = 'normal';
  let stateText = status === 0 ? 'Check Sensor' : 'Normal';
  let accentColor = '#16A34A'; // Green
  let areaFill = 'rgba(22, 163, 74, 0.12)';

  if (thresholds) {
    if (numericValue >= thresholds.danger) {
      healthState = 'emergency';
      stateText = 'Emergency';
      accentColor = '#DC2626'; // Red
      areaFill = 'rgba(220, 38, 38, 0.14)';
    } else if (numericValue >= thresholds.warning) {
      healthState = 'warning';
      stateText = 'Warning';
      accentColor = '#D4A017'; // Yellow
      areaFill = 'rgba(212, 160, 23, 0.15)';
    }
  }

  const pts = historyValues.length >= 2 ? historyValues : [numericValue, numericValue];
  const prevVal = pts[pts.length - 2];
  const diff = numericValue - prevVal;
  let deltaText = '— Steady';
  if (Math.abs(diff) >= 0.01) {
    const arrow = diff > 0 ? '↑' : '↓';
    deltaText = `${arrow} ${Math.abs(diff).toFixed(unit === 'ppm' && max > 500 ? 0 : 2)} ${unit}`;
  }

  const span = max - min <= 0 ? 1 : max - min;
  const pct = Math.min(100, Math.max(0, ((numericValue - min) / span) * 100));

  const svgW = 300;
  const svgH = 60;
  const minPt = Math.min(...pts);
  const maxPt = Math.max(...pts);
  const ptRange = maxPt - minPt === 0 ? 1 : maxPt - minPt;

  const coords = pts.map((v, idx) => [
    (idx / (pts.length - 1)) * svgW,
    svgH - ((v - minPt) / ptRange) * (svgH - 12) - 6
  ]);
  const linePath = coords.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${svgW} ${svgH} L 0 ${svgH} Z`;

  const decimals = unit === 'ppm' && max > 500 ? 0 : 2;

  return (
    <div className={`barn-card state-${healthState}`}>
      <div>
        <div className="barn-card-top">
          <div>
            <div className="chip-label">
              {sensorName} {status === 0 && <span style={{ color: '#DC2626' }}>(Status: 0)</span>}
            </div>
            <h3 className="metric-heading">{title}</h3>
          </div>
          <span className={`state-badge ${healthState}`}>{stateText}</span>
        </div>

        <div className="barn-value-row">
          <div>
            <span className="barn-number">{numericValue.toFixed(decimals)}</span>
            <span className="barn-unit">{unit}</span>
          </div>
          <span className="barn-delta">{deltaText}</span>
        </div>

        <div className="barn-track">
          <div
            className="barn-track-fill"
            style={{ width: `${pct}%`, backgroundColor: accentColor }}
          />
          <div
            className="barn-track-dot"
            style={{ left: `${pct}%`, backgroundColor: accentColor }}
          />
        </div>
      </div>

      {showInlineChart && (
        <div>
          <div className="sparkline-box">
            <svg viewBox={`0 0 ${svgW} ${svgH}`} width="100%" height="100%" preserveAspectRatio="none">
              <path d={areaPath} fill={areaFill} />
              <path d={linePath} fill="none" stroke={accentColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="barn-card-footer">
            Safe range {min}–{thresholds ? thresholds.warning : max} {unit} · Mode: {windowLabel} ({pts.length} pts)
          </div>
        </div>
      )}

      {!showInlineChart && (
        <div className="barn-card-footer">
          Warning: {thresholds?.warning ?? '--'} {unit} · Emergency: {thresholds?.danger ?? '--'} {unit} ({windowLabel})
        </div>
      )}
    </div>
  );
}