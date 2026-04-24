import React from 'react';
import { RADIUS, TYPOGRAPHY } from '../../styles/theme';

/** Pickleball shot types available via "/" command in comments. */
export const SHOT_LIST = [
  'Serve', 'Return', 'Drive', 'Forehand Drive', 'Backhand Drive',
  'Volley', 'Forehand Volley', 'Backhand Volley', 'Punch Volley', 'Block Volley', 'Roll Volley', 'Volley Dink',
  'Dink', 'Forehand Dink', 'Backhand Dink', 'Cross-Court Dink', 'Straight Dink', 'Dead Dink',
  'Slice Dink', 'Topspin Dink', 'Attack Dink', 'Drop', 'Third Shot Drop', 'Transition',
  'Third Shot Drive', 'Hybrid Drop', 'Reset', 'Smash', 'Put-Away', 'Backhand Overhead',
  'Jump Smash', 'Lob', 'Offensive Lob', 'Defensive Lob', 'Topspin Lob', 'Backspin Lob',
  'Block', 'Counter', 'Erne', 'Bert', 'ATP', 'Tweener', 'Flick', 'Speed-Up', 'Fake Speed-Up',
  'Chicken Wing', 'Pancake Shot',
  'Footwork', 'Shot Selection', 'Positioning',
] as const;

/** Reference UI primary (Training Session Detail screen). */
export const REFERENCE_PRIMARY = '#8FB9A8';

export const SHOT_PILL_STYLE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  margin: '0 2px',
  padding: '2px 8px',
  borderRadius: RADIUS.sm,
  border: '1px solid rgba(148, 163, 184, 0.5)',
  backgroundColor: '#f1f5f9',
  color: '#475569',
  ...TYPOGRAPHY.label,
  fontWeight: 600,
};

export const MENTION_PILL_STYLE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  margin: '0 2px',
  padding: '2px 8px',
  borderRadius: RADIUS.sm,
  border: `1px solid ${REFERENCE_PRIMARY}40`,
  backgroundColor: `${REFERENCE_PRIMARY}1A`,
  color: REFERENCE_PRIMARY,
  ...TYPOGRAPHY.label,
  fontWeight: 600,
};

export const ERROR_LABEL_OPTIONS = [
  { key: 'unforced', label: 'Unforced Error' },
  { key: 'forced', label: 'Forced Error' },
] as const;

export const ERROR_PILL_STYLE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  margin: '0 2px',
  padding: '2px 8px',
  borderRadius: RADIUS.sm,
  border: '1px solid rgba(239, 68, 68, 0.35)',
  backgroundColor: 'rgba(239, 68, 68, 0.12)',
  color: '#b91c1c',
  ...TYPOGRAPHY.label,
  fontWeight: 600,
};
