import React from 'react';
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../styles/theme';
import { Card, Badge } from './BaseComponents';
import { IconUser, IconPlay, IconCheck, IconClock, IconCalendar, IconCalendarDays, IconGraduationCap, IconMapPin, IconUsers } from './Icons';

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
          backgroundColor: COLORS.primary,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '32px',
          overflow: 'hidden',
        }}
      >
        {avatar || <IconUser size={32} />}
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
      {/* Play icon overlay */}
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
          color: '#FFFFFF',
        }}
      >
        <IconPlay size={32} />
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
            color: '#FFFFFF',
          }}
        >
          <IconCheck size={40} />
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
                backgroundColor: COLORS.primary,
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
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}>
        <IconClock size={16} /> {duration}
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
  /** Coach profile picture URL (transparent PNG) */
  profilePicture?: string;
  onClick?: () => void;
}

export const UpcomingLessonCard: React.FC<UpcomingLessonCardProps> = ({
  coachName,
  date,
  timeRange,
  address,
  courtName,
  otherParticipants,
  profilePicture,
  onClick,
}) => (
  <div
    onClick={onClick}
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    style={{
      position: 'relative',
      overflow: 'hidden',
      borderRadius: 24,
      padding: `${SPACING.md}px`,
      paddingLeft: `${SPACING.md + 6}px`,
      background: 'linear-gradient(145deg, #FFFFFF 0%, #FAFBFC 100%)',
      border: '1px solid rgba(0, 0, 0, 0.05)',
      boxShadow: `
        ${SHADOWS.subtle},
        0 0 0 1px rgba(255, 255, 255, 0.8) inset,
        0 2px 4px rgba(0, 0, 0, 0.02)
      `,
      cursor: onClick ? 'pointer' : 'default',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    }}
    onMouseDown={onClick ? (e) => ((e.currentTarget as HTMLElement).style.transform = 'scale(0.99)') : undefined}
    onMouseUp={onClick ? (e) => ((e.currentTarget as HTMLElement).style.transform = 'scale(1)') : undefined}
    onMouseLeave={onClick ? (e) => ((e.currentTarget as HTMLElement).style.transform = 'scale(1)') : undefined}
  >
    {/* Left accent bar */}
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 4,
        background: `linear-gradient(180deg, ${COLORS.primary} 0%, #19a000 100%)`,
        borderRadius: '4px 0 0 4px',
      }}
    />
    <div
      style={{
        display: 'flex',
        alignItems: 'stretch',
        gap: SPACING.lg,
        minHeight: 100,
      }}
    >
      {/* Left: All info */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: SPACING.sm }}>
        <div style={{ marginBottom: 2 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: 1.2,
              color: COLORS.primary,
              textTransform: 'uppercase',
            }}
          >
            Upcoming
          </span>
          <h3
            style={{
              fontSize: 20,
              fontWeight: 700,
              lineHeight: '24px',
              color: COLORS.textPrimary,
              margin: 0,
              marginTop: 1,
              letterSpacing: '-0.02em',
            }}
          >
            Lesson
          </h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              backgroundColor: 'rgba(49, 203, 0, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <IconGraduationCap size={12} style={{ color: COLORS.primary }} />
          </div>
          <span style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textPrimary, fontWeight: 600 }}>{coachName}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm }}>
            <IconCalendarDays size={14} style={{ color: COLORS.textSecondary, flexShrink: 0, opacity: 0.8 }} />
            <span style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textPrimary }}>{date}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm }}>
            <IconClock size={14} style={{ color: COLORS.textSecondary, flexShrink: 0, opacity: 0.8 }} />
            <span style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textPrimary }}>{timeRange}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: SPACING.sm }}>
            <IconMapPin size={14} style={{ color: COLORS.textSecondary, flexShrink: 0, opacity: 0.8, marginTop: 2 }} />
            <div>
              <span style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textPrimary }}>{address}</span>
              <span style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, fontWeight: 500 }}>
                {' '}— {courtName}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: SPACING.sm }}>
            <IconUsers size={14} style={{ color: COLORS.textSecondary, flexShrink: 0, opacity: 0.8, marginTop: 2 }} />
            <div>
              <span style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textPrimary, fontWeight: 500 }}>You</span>
              {otherParticipants && otherParticipants.length > 0 && (
                <span style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary }}>
                  {' '}· Also: {otherParticipants.join(', ')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Right: Profile picture - fills width */}
      <div
        style={{
          width: 120,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'stretch',
          alignSelf: 'stretch',
        }}
      >
        {profilePicture ? (
          <img
            src={profilePicture}
            alt={coachName}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              objectPosition: 'center right',
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              minHeight: 80,
              borderRadius: RADIUS.circle,
              background: `linear-gradient(145deg, ${COLORS.primary} 0%, #19a000 100%)`,
              color: COLORS.textPrimary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconCalendar size={32} />
          </div>
        )}
      </div>
    </div>
  </div>
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
    upcoming: COLORS.primaryLight,
    'in-progress': COLORS.primary,
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
          color: COLORS.textPrimary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          {status === 'in-progress' ? <IconPlay size={24} /> : status === 'completed' ? <IconCheck size={24} /> : <IconCalendar size={24} />}
        </div>
      </div>
    </Card>
  );
};
