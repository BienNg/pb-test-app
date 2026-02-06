import React from 'react';
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../styles/theme';

interface CardProps {
  children: React.ReactNode;
  padding?: number;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  padding = SPACING.lg,
  onClick,
  style 
}) => (
  <div
    onClick={onClick}
    style={{
      backgroundColor: COLORS.white,
      borderRadius: RADIUS.full,
      padding: `${padding}px`,
      boxShadow: SHADOWS.subtle,
      cursor: onClick ? 'pointer' : 'default',
      transition: 'transform 0.2s, box-shadow 0.2s',
      ...style,
    }}
    onMouseDown={(e) => {
      if (onClick) {
        (e.currentTarget as HTMLElement).style.transform = 'scale(0.98)';
      }
    }}
    onMouseUp={(e) => {
      (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
    }}
    onMouseLeave={(e) => {
      (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
    }}
  >
    {children}
  </div>
);

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon?: string;
  accentColor?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  unit,
  icon,
  accentColor,
  onClick,
}) => (
  <Card onClick={onClick}>
    <div
      style={{
        position: 'relative',
        paddingBottom: onClick ? SPACING.lg : 0,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{
            ...TYPOGRAPHY.label,
            color: COLORS.textSecondary,
            marginBottom: SPACING.md,
          }}>
            {title}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: SPACING.md }}>
            <div style={{
              ...TYPOGRAPHY.h2,
              color: COLORS.textPrimary,
            }}>
              {value}
            </div>
            {unit && (
              <div style={{
                ...TYPOGRAPHY.bodySmall,
                color: COLORS.textSecondary,
              }}>
                {unit}
              </div>
            )}
          </div>
        </div>
        {icon && (
          <div style={{
            fontSize: '24px',
            backgroundColor: accentColor ?? COLORS.iconBg,
            width: '48px',
            height: '48px',
            borderRadius: RADIUS.circle,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {icon}
          </div>
        )}
      </div>
      {onClick && (
        <span
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            fontSize: '20px',
            color: COLORS.textSecondary,
            cursor: 'pointer',
          }}
          aria-label="Navigate"
        >
          →
        </span>
      )}
    </div>
  </Card>
);

interface CircularProgressProps {
  percentage: number;
  value: string | number;
  label: string;
  color: string;
  size?: number;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  percentage,
  value,
  label,
  color,
  size = 140,
}) => {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: SPACING.md }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={COLORS.textMuted}
          strokeWidth="10"
          opacity="0.2"
        />
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 0.6s ease',
          }}
        />
      </svg>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          ...TYPOGRAPHY.h3,
          color: COLORS.textPrimary,
        }}>
          {value}
        </div>
        <div style={{
          ...TYPOGRAPHY.bodySmall,
          color: COLORS.textSecondary,
          marginTop: SPACING.xs,
        }}>
          {label}
        </div>
      </div>
    </div>
  );
};

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'minimal';
  size?: 'sm' | 'md' | 'lg';
  style?: React.CSSProperties;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  style,
}) => {
  const sizes = {
    sm: { padding: `${SPACING.sm}px ${SPACING.md}px`, fontSize: '12px' },
    md: { padding: `${SPACING.md}px ${SPACING.lg}px`, fontSize: '14px' },
    lg: { padding: `${SPACING.lg}px ${SPACING.xl}px`, fontSize: '16px' },
  };

  const variants = {
    primary: {
      backgroundColor: COLORS.primary,
      color: COLORS.textPrimary,
      border: 'none',
    },
    secondary: {
      backgroundColor: COLORS.iconBg,
      color: COLORS.textPrimary,
      border: 'none',
    },
    minimal: {
      backgroundColor: 'transparent',
      color: COLORS.textPrimary,
      border: `1px solid ${COLORS.textMuted}`,
    },
  };

  return (
    <button
      onClick={onClick}
      style={{
        borderRadius: RADIUS.md,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.2s',
        ...sizes[size],
        ...variants[variant],
        ...style,
      }}
      onMouseDown={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'scale(0.98)';
      }}
      onMouseUp={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
      }}
    >
      {children}
    </button>
  );
};

interface ActivityButtonProps {
  icon: string;
  label: string;
  onClick?: () => void;
}

export const ActivityButton: React.FC<ActivityButtonProps> = ({ icon, label, onClick }) => (
  <button
    onClick={onClick}
    style={{
      width: '56px',
      height: '56px',
      borderRadius: RADIUS.circle,
      backgroundColor: COLORS.white,
      border: 'none',
      boxShadow: SHADOWS.light,
      fontSize: '24px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s',
    }}
    onMouseDown={(e) => {
      (e.currentTarget as HTMLElement).style.transform = 'scale(0.92)';
    }}
    onMouseUp={(e) => {
      (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
    }}
    onMouseLeave={(e) => {
      (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
    }}
    title={label}
  >
    {icon}
  </button>
);

interface ChipProps {
  label: string;
  color?: 'green' | 'blue' | 'lavender';
  onClick?: () => void;
}

export const Chip: React.FC<ChipProps> = ({ label, color = 'blue', onClick }) => {
  const colors = {
    green: COLORS.green,
    blue: COLORS.blue,
    lavender: COLORS.lavender,
  };

  return (
    <div
      onClick={onClick}
      style={{
        display: 'inline-block',
        padding: `${SPACING.xs}px ${SPACING.md}px`,
        backgroundColor: colors[color],
        color: COLORS.textPrimary,
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: 500,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {label}
    </div>
  );
};

interface BadgeProps {
  label: string;
  status?: 'success' | 'warning' | 'info';
}

export const Badge: React.FC<BadgeProps> = ({ label, status = 'info' }) => {
  const statusColors = {
    success: COLORS.primary,
    warning: COLORS.coral,
    info: COLORS.primary,
  };

  return (
    <div
      style={{
        display: 'inline-block',
        padding: `${SPACING.xs}px ${SPACING.md}px`,
        backgroundColor: statusColors[status],
        color: COLORS.textPrimary,
        borderRadius: '8px',
        fontSize: '11px',
        fontWeight: 600,
      }}
    >
      {label}
    </div>
  );
};
