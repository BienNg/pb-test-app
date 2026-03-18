import React from 'react';
import { COLORS, RADIUS, SPACING } from '../../styles/theme';
import { REFERENCE_PRIMARY } from './constants';

export interface FrameDetailCardProps {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  /** When true, use a lighter tint of the parent's highlight (e.g. when parent comment is focused). */
  highlighted?: boolean;
}

export const FrameDetailCard: React.FC<FrameDetailCardProps> = ({ children, onClick, highlighted }) => (
  <div
    style={{
      marginTop: SPACING.sm,
      marginLeft: 24,
      borderRadius: RADIUS.md,
      borderTopLeftRadius: 0,
      borderBottomLeftRadius: 0,
      borderLeft: `3px solid ${REFERENCE_PRIMARY}`,
      backgroundColor: highlighted ? `${REFERENCE_PRIMARY}0D` : COLORS.cardBg,
      padding: `${SPACING.sm}px ${SPACING.sm}px ${SPACING.sm}px ${SPACING.md}px`,
    }}
    onClick={onClick}
  >
    {children}
  </div>
);
