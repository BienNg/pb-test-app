import React from 'react';

interface SegmentSwitcherProps {
  selectedSegment: 'videos' | 'roadmap';
  onSelect: (segment: 'videos' | 'roadmap') => void;
}

const SEGMENTS = [
  { key: 'videos', label: 'Your Game Analytics' },
  { key: 'roadmap', label: 'Your Roadmap' },
] as const;

export function SegmentSwitcher({ selectedSegment, onSelect }: SegmentSwitcherProps) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '32px',
        borderBottom: '1px solid #e1e9e7',
        marginBottom: '24px',
      }}
    >
      {SEGMENTS.map(({ key, label }) => {
        const active = selectedSegment === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            style={{
              paddingBottom: '12px',
              border: 'none',
              borderBottom: `3px solid ${active ? '#6a9a95' : 'transparent'}`,
              borderRadius: 0,
              backgroundColor: 'transparent',
              color: active ? '#333333' : '#6a9a95',
              fontSize: 14,
              fontWeight: active ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
