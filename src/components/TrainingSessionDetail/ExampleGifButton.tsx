import React from 'react';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../styles/theme';
import { REFERENCE_PRIMARY } from './constants';

export interface ExampleGifButtonProps {
  gifFileName: string | null;
  shotExampleGifs: { key: string; src: string; title: string }[];
  onClick: (gif: { src: string; title: string }) => void;
  stopPropagation?: boolean;
  style?: React.CSSProperties;
}

export const ExampleGifButton: React.FC<ExampleGifButtonProps> = ({
  gifFileName,
  shotExampleGifs,
  onClick,
  stopPropagation = false,
  style,
}) => {
  if (!gifFileName) return null;
  const gif = shotExampleGifs.find(
    (g) => g.key === `./${gifFileName}` || g.key === gifFileName
  );
  return (
    <button
      type="button"
      onClick={(e) => {
        if (stopPropagation) e.stopPropagation();
        if (gif) {
          onClick({ src: gif.src, title: gif.title });
        }
      }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: `${SPACING.xs}px ${SPACING.sm}px`,
        borderRadius: RADIUS.sm,
        border: `1px solid ${REFERENCE_PRIMARY}40`,
        backgroundColor: `${REFERENCE_PRIMARY}1A`,
        color: REFERENCE_PRIMARY,
        ...TYPOGRAPHY.label,
        fontWeight: 600,
        cursor: 'pointer',
        ...(style ?? {}),
      }}
    >
      Show example
    </button>
  );
};
