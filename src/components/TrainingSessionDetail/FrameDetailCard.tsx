import React from 'react';
import { COLORS, RADIUS, SPACING } from '../../styles/theme';
import { REFERENCE_PRIMARY } from './constants';

export interface FrameDetailCardProps {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export const FrameDetailCard: React.FC<FrameDetailCardProps> = ({ children, onClick }) => (
  <div
    style={{
      marginTop: SPACING.sm,
      marginLeft: 24,
      borderRadius: RADIUS.md,
      borderTopLeftRadius: 0,
      borderBottomLeftRadius: 0,
      borderLeft: `3px solid ${REFERENCE_PRIMARY}`,
      backgroundColor: COLORS.cardBg,
      padding: `${SPACING.sm}px ${SPACING.sm}px ${SPACING.sm}px ${SPACING.md}px`,
    }}
    onClick={onClick}
  >
    {children}
  </div>
);
