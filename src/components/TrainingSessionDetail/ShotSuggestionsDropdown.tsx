import React from 'react';
import {
  COLORS,
  RADIUS,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from '../../styles/theme';

export interface ShotSuggestionsDropdownProps {
  shotMenu: { query: string; slashStart: number; highlightIndex: number };
  filteredShots: string[];
  inlineMenuTop: number | null;
  onSelectShot: (shot: string) => void;
}

export const ShotSuggestionsDropdown: React.FC<ShotSuggestionsDropdownProps> = ({
  shotMenu,
  filteredShots,
  inlineMenuTop,
  onSelectShot,
}) => (
  <div
    role="listbox"
    aria-label="Shot type"
    style={{
      position: 'absolute',
      left: 0,
      right: 0,
      top: inlineMenuTop != null ? inlineMenuTop : '100%',
      marginTop: inlineMenuTop != null ? 0 : 4,
      maxHeight: 220,
      overflowY: 'auto',
      backgroundColor: COLORS.cardBg,
      border: `1px solid ${COLORS.backgroundLight}`,
      borderRadius: RADIUS.sm,
      boxShadow: SHADOWS.light,
      zIndex: 20,
    }}
  >
    {filteredShots.length === 0 ? (
      <div style={{ padding: SPACING.sm, ...TYPOGRAPHY.bodySmall, color: COLORS.textMuted }}>
        No matching shot
      </div>
    ) : (
      filteredShots.map((shot, i) => (
        <button
          key={shot}
          type="button"
          role="option"
          aria-selected={i === shotMenu.highlightIndex}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelectShot(shot);
          }}
          style={{
            display: 'block',
            width: '100%',
            padding: `${SPACING.sm}px ${SPACING.md}px`,
            border: 'none',
            background: i === shotMenu.highlightIndex ? COLORS.backgroundLight : 'transparent',
            textAlign: 'left',
            ...TYPOGRAPHY.bodySmall,
            color: COLORS.textPrimary,
            cursor: 'pointer',
          }}
        >
          {shot}
        </button>
      ))
    )}
  </div>
);
