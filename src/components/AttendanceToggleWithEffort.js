import React from 'react';
import AttendanceToggle from './AttendanceToggle';

function AttendanceToggleWithEffort({
  value,
  onChange,
  effortValue,
  onEffortChange,
  coachMode
}) {
  const normalizedEffort = effortValue == null ? '' : String(effortValue);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <AttendanceToggle value={value} onChange={onChange} />
      {coachMode ? (
        <select
          value={normalizedEffort}
          onChange={(event) => {
            const next = event.target.value;
            onEffortChange(next === '' ? null : Number(next));
          }}
          style={{ fontSize: 13 }}
        >
          <option value="">–</option>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
          <option value="5">5</option>
        </select>
      ) : (
        normalizedEffort && (
          <span style={{ fontSize: 12, color: '#555' }}>Pingutus: {normalizedEffort}</span>
        )
      )}
    </div>
  );
}

export default AttendanceToggleWithEffort;