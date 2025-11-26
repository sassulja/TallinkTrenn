import React from 'react';

function AttendanceToggle({ value, onChange }) {
  const isPresent = value === 'Jah';
  return (
    <button
      type="button"
      onClick={() => onChange(isPresent ? 'Ei' : 'Jah')}
      style={{
        background: isPresent ? '#b8ffc9' : '#ffb1b1',
        color: isPresent ? '#0a4' : '#a00',
        border: '1px solid #ccc',
        borderRadius: 6,
        padding: '2px 14px',
        fontWeight: 600,
        cursor: 'pointer',
        minWidth: 44,
        transition: 'background 0.2s, color 0.2s'
      }}
    >
      {isPresent ? 'Jah' : 'Ei'}
    </button>
  );
}

export default AttendanceToggle;