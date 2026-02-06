import React from 'react';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../styles/theme';
import { Card, Badge } from './BaseComponents';

interface TrainerCardProps {
  name: string;
  age: number;
  bio: string;
  avatar?: string;
}

export const TrainerCard: React.FC<TrainerCardProps> = ({
  name,
  age,
  bio,
  avatar,
}) => (
  <Card padding={SPACING.lg}>
    <div style={{
      display: 'flex',
      gap: SPACING.lg,
      alignItems: 'flex-start',
    }}>
      {/* Avatar */}
      <div
        style={{
          width: '80px',
          height: '80px',
          borderRadius: RADIUS.circle,
          backgroundColor: COLORS.lavender,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '32px',
          overflow: 'hidden',
        }}
      >
        {avatar || '👤'}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3 style={{
          ...TYPOGRAPHY.h3,
          color: COLORS.textPrimary,
          margin: 0,
          marginBottom: SPACING.xs,
        }}>
          {name}
        </h3>
        <p style={{
          ...TYPOGRAPHY.bodySmall,
          color: COLORS.textSecondary,
          margin: 0,
          marginBottom: SPACING.sm,
        }}>
          {age} years old
        </p>
        <p style={{
          ...TYPOGRAPHY.bodySmall,
          color: COLORS.textSecondary,
          margin: 0,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {bio}
        </p>
      </div>
    </div>
  </Card>
);

interface LessonCardProps {
  title: string;
  category: string;
  duration: string;
  thumbnail?: string;
  progress?: number;
  isVOD?: boolean;
  isCompleted?: boolean;
  onClick?: () => void;
}

export const LessonCard: React.FC<LessonCardProps> = ({
  title,
  category,
  duration,
  progress = 0,
  isCompleted = false,
  onClick,
}) => (
  <Card
    onClick={onClick}
    style={{
      overflow: 'hidden',
      transition: 'transform 0.2s, box-shadow 0.2s',
    }}
    padding={0}
  >
    {/* Thumbnail */}
    <div
      style={{
        width: '100%',
        aspectRatio: '16/9',
      backgroundColor: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* YouTube-style play icon */}
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          border: '2px solid rgba(255, 255, 255, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.35)',
        }}
      >
        <span
          style={{
            fontSize: 32,
            color: '#FFFFFF',
            marginLeft: 3,
          }}
        >
          ▶
        </span>
      </div>
      {isCompleted && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '40px',
          }}
        >
          ✓
        </div>
      )}
    </div>

    {/* Content */}
    <div style={{ padding: SPACING.lg }}>
      <div style={{
        ...TYPOGRAPHY.label,
        color: COLORS.textSecondary,
        marginBottom: SPACING.xs,
        textTransform: 'uppercase',
      }}>
        {category}
      </div>
      <h3 style={{
        ...TYPOGRAPHY.bodySmall,
        color: COLORS.textPrimary,
        fontWeight: 600,
        margin: 0,
        marginBottom: SPACING.md,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        {title}
      </h3>

      {/* Progress Bar */}
      {progress > 0 && (
        <div style={{ marginBottom: SPACING.md }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: SPACING.xs,
          }}>
            <span style={{
              ...TYPOGRAPHY.label,
              color: COLORS.textSecondary,
            }}>
              Progress
            </span>
            <span style={{
              ...TYPOGRAPHY.label,
              color: COLORS.textPrimary,
              fontWeight: 600,
            }}>
              {progress}%
            </span>
          </div>
          <div style={{
            width: '100%',
            height: '6px',
            backgroundColor: COLORS.iconBg,
            borderRadius: RADIUS.sm,
            overflow: 'hidden',
          }}>
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                backgroundColor: COLORS.lavender,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>
      )}

      {/* Duration */}
      <div style={{
        ...TYPOGRAPHY.label,
        color: COLORS.textSecondary,
      }}>
        ⏱️ {duration}
      </div>
    </div>
  </Card>
);

interface UpcomingLessonCardProps {
  coachName: string;
  date: string;
  timeRange: string;
  address: string;
  courtName: string;
  /** Other students in this session (account holder is always in) */
  otherParticipants?: string[];
  onClick?: () => void;
}

export const UpcomingLessonCard: React.FC<UpcomingLessonCardProps> = ({
  coachName,
  date,
  timeRange,
  address,
  courtName,
  otherParticipants,
  onClick,
}) => (
  <Card onClick={onClick} padding={SPACING.lg}>
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: SPACING.lg }}>
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: RADIUS.circle,
          backgroundColor: COLORS.lavender,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
        }}
      >
        📅
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3 style={{
          ...TYPOGRAPHY.h3,
          color: COLORS.textPrimary,
          margin: 0,
          marginBottom: SPACING.md,
        }}>
          Upcoming Lesson
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.sm }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm }}>
            <span style={{ ...TYPOGRAPHY.label, color: COLORS.textSecondary }}>👩‍🏫</span>
            <span style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textPrimary }}>{coachName}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm }}>
            <span style={{ ...TYPOGRAPHY.label, color: COLORS.textSecondary }}>📆</span>
            <span style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textPrimary }}>{date}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm }}>
            <span style={{ ...TYPOGRAPHY.label, color: COLORS.textSecondary }}>🕐</span>
            <span style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textPrimary }}>{timeRange}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: SPACING.sm }}>
            <span style={{ ...TYPOGRAPHY.label, color: COLORS.textSecondary }}>📍</span>
            <div>
              <span style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textPrimary }}>{address}</span>
              <span style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, fontWeight: 600 }}>
                {' '}— {courtName}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: SPACING.sm }}>
            <span style={{ ...TYPOGRAPHY.label, color: COLORS.textSecondary }}>👥</span>
            <div>
              <span style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textPrimary }}>You</span>
              {otherParticipants && otherParticipants.length > 0 && (
                <span style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary }}>
                  {' '}· Also: {otherParticipants.join(', ')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  </Card>
);

interface UpcomingSessionProps {
  trainerName: string;
  date: string;
  time: string;
  type: 'live' | 'vod';
  status?: 'upcoming' | 'in-progress' | 'completed';
  onClick?: () => void;
}

export const UpcomingSessionCard: React.FC<UpcomingSessionProps> = ({
  trainerName,
  date,
  time,
  type,
  status = 'upcoming',
  onClick,
}) => {
  const statusColors = {
    upcoming: COLORS.lavender,
    'in-progress': COLORS.green,
    completed: COLORS.iconBg,
  };

  return (
    <Card onClick={onClick}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: SPACING.lg,
      }}>
        <div>
          <h3 style={{
            ...TYPOGRAPHY.bodySmall,
            fontWeight: 600,
            color: COLORS.textPrimary,
            margin: 0,
            marginBottom: SPACING.xs,
          }}>
            {trainerName}
          </h3>
          <p style={{
            ...TYPOGRAPHY.label,
            color: COLORS.textSecondary,
            margin: 0,
            marginBottom: SPACING.md,
          }}>
            {date} • {time}
          </p>
          <div style={{
            display: 'flex',
            gap: SPACING.sm,
          }}>
            <Badge
              label={type.toUpperCase()}
              status={type === 'live' ? 'warning' : 'info'}
            />
            <Badge
              label={status.replace('-', ' ').toUpperCase()}
              status={status === 'completed' ? 'success' : 'info'}
            />
          </div>
        </div>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: RADIUS.circle,
          backgroundColor: statusColors[status],
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          flexShrink: 0,
        }}>
          {status === 'in-progress' ? '▶️' : status === 'completed' ? '✓' : '📅'}
        </div>
      </div>
    </Card>
  );
};
