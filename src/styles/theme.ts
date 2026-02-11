/**
 * Design System & Theme
 * Mobile-first PB Academy Training App
 */

export const COLORS = {
  // Background — warm off-white base for gradient; use transparent on full-bleed pages so body gradient shows
  background: '#F7F8FA',
  backgroundLight: '#F0F2F5',
  
  // Cards & Surfaces
  white: '#FFFFFF',
  cardBg: '#FFFFFF',
  
  // Text
  textPrimary: '#1C1C1E',
  textSecondary: '#8E8E93',
  textMuted: '#C7C7CC',
  
  // Primary (add button green) – main accent across the app
  primary: '#9BE15D',
  primaryLight: 'rgba(155, 225, 93, 0.25)',

  // Accents
  lavender: '#D6C9FF',
  green: '#9BE15D', // same as primary
  coral: '#FF8A80',
  red: '#FF6B6B',
  purple: '#D6C9FF',
  blue: '#87CEEB',

  // Icon backgrounds
  iconBg: '#F3F4F6',

  // Stat card icons — muted, premium (not playful)
  statIconMuted: '#E8ECF1',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 22,
  circle: '50%',
};

export const SHADOWS = {
  subtle: '0px 8px 24px rgba(0, 0, 0, 0.06)',
  light: '0px 4px 12px rgba(0, 0, 0, 0.04)',
  md: '0px 12px 32px rgba(0, 0, 0, 0.08)',
};

export const TYPOGRAPHY = {
  h1: {
    fontSize: '32px',
    fontWeight: 700,
    lineHeight: '40px',
  },
  h2: {
    fontSize: '28px',
    fontWeight: 700,
    lineHeight: '36px',
  },
  h3: {
    fontSize: '24px',
    fontWeight: 600,
    lineHeight: '32px',
  },
  body: {
    fontSize: '16px',
    fontWeight: 400,
    lineHeight: '24px',
  },
  bodySmall: {
    fontSize: '14px',
    fontWeight: 400,
    lineHeight: '20px',
  },
  label: {
    fontSize: '12px',
    fontWeight: 500,
    lineHeight: '16px',
  },
  labelMed: {
    fontSize: '13px',
    fontWeight: 600,
    lineHeight: '18px',
  },
};

export const BREAKPOINTS = {
  mobile: 375,
  tablet: 768,
  desktop: 1024,
};
