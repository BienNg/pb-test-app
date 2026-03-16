import React from 'react';
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../styles/theme';
import { Card, Badge } from './BaseComponents';
import { IconUser, IconPlay, IconCheck, IconClock, IconCalendar, IconCalendarDays, IconGraduationCap, IconMapPin, IconUsers } from './Icons';
import { getYoutubeVideoId as getYoutubeIdFromUrl } from '@/lib/youtube';

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

const YOUTUBE_VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

/** Get thumbnail URL: use thumbnail if it's a URL, else derive from YouTube videoUrl (full URL or bare video ID). */
function getThumbnailUrl(thumbnail?: string, videoUrl?: string): string | null {
  if (thumbnail?.startsWith('http://') || thumbnail?.startsWith('https://')) return thumbnail;
  if (!videoUrl?.trim()) return null;
  const trimmed = videoUrl.trim();
  const id = getYoutubeIdFromUrl(trimmed) ?? (YOUTUBE_VIDEO_ID_REGEX.test(trimmed) ? trimmed : null);
  if (id) return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
  return null;
}

interface LessonCardProps {
  title: string;
  category: string;
  thumbnail?: string;
  videoUrl?: string;
  progress?: number;
  isVOD?: boolean;
  isCompleted?: boolean;
  onClick?: () => void;
  /** Unique shot names from comments for this session (displayed as pills). */
  shots?: string[];
  dateLabel?: string;
  /** 'grid' = desktop library (play on hover, pill category); 'list' = mobile (Watch Now button) */
  variant?: 'grid' | 'list';
}

export const LessonCard: React.FC<LessonCardProps> = ({
  title: _title,
  category,
  thumbnail,
  videoUrl,
  progress = 0,
  isCompleted = false,
  onClick,
  shots,
  dateLabel,
  variant = 'grid',
}) => {
  const [pressed, setPressed] = React.useState(false);
  const thumbnailUrl = getThumbnailUrl(thumbnail, videoUrl);

  const isList = variant === 'list';
  const useLibraryColors = variant === 'grid' || variant === 'list';
  const accent = useLibraryColors ? COLORS.libraryPrimary : COLORS.primary;
  const accentLight = useLibraryColors ? COLORS.libraryPrimaryLight : COLORS.primaryLight;

  return (
    <div
      onClick={onClick}
      onPointerDown={onClick ? () => setPressed(true) : undefined}
      onPointerUp={onClick ? () => setPressed(false) : undefined}
      onPointerLeave={onClick ? () => setPressed(false) : undefined}
      role={onClick ? 'button' : undefined}
      className={isList ? undefined : 'lesson-card-grid'}
      style={{
        backgroundColor: COLORS.white,
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: isList ? SHADOWS.light : '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        border: `1px solid ${isList ? '#e2e8f0' : '#e1e9e7'}`,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s, box-shadow 0.2s',
        transform: pressed && onClick ? 'scale(0.98)' : undefined,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* Thumbnail — background image so YouTube thumbnail shows even before img loads */}
      <div
        className="lesson-card-thumb"
        style={{
          width: '100%',
          aspectRatio: '16/9',
          backgroundColor: '#e2e8f0',
          backgroundImage: thumbnailUrl ? `url(${thumbnailUrl})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt=""
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : null}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.2)',
            opacity: isList ? 1 : 0,
            transition: 'opacity 0.2s',
          }}
          className="lesson-card-thumb-overlay"
          aria-hidden
        />
        {/* Play icon - grid: white circle + primary icon (ref); list: primary circle + white icon */}
        <div
          className="lesson-card-play"
          style={{
            width: isList ? 48 : 56,
            height: isList ? 48 : 56,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: useLibraryColors && !isList ? 'rgba(255,255,255,0.9)' : accent,
            color: useLibraryColors && !isList ? accent : COLORS.white,
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            opacity: isList ? 0 : 1,
            transition: 'opacity 0.2s',
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <IconPlay size={isList ? 24 : 28} />
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
              color: COLORS.white,
            }}
          >
            <IconCheck size={40} />
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <span
              style={{
                display: 'inline-block',
                padding: '2px 8px',
                borderRadius: 4,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                backgroundColor: accentLight,
                color: accent,
                marginBottom: 6,
              }}
            >
              {category}
            </span>
            {dateLabel && (
              <p style={{ fontSize: 14, color: COLORS.textSecondary, margin: '4px 0 0' }}>
                {dateLabel}
              </p>
            )}
          </div>
          {isList && (
            <span
              style={{
                color: COLORS.textMuted,
                fontSize: 18,
                flexShrink: 0,
              }}
              onClick={(e) => e.stopPropagation()}
              role="button"
              aria-label="More options"
            >
              ⋮
            </span>
          )}
        </div>

        {isList && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: COLORS.textSecondary }}>
            <span>{category}</span>
            <span style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: COLORS.textMuted }} />
            <span>Intermediate</span>
          </div>
        )}

        {isList && onClick && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            style={{
              width: '100%',
              padding: '10px 16px',
              marginTop: 4,
              borderRadius: 8,
              border: 'none',
              backgroundColor: accentLight,
              color: accent,
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Watch Now
          </button>
        )}

        {/* Progress & shots - only when not list variant; flow right below date, do not stick to bottom */}
        {!isList && (progress > 0 || (shots && shots.length > 0)) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {progress > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: COLORS.textSecondary }}>Progress</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textPrimary }}>{progress}%</span>
                </div>
                <div
                  style={{
                    width: '100%',
                    height: 6,
                    backgroundColor: '#e1e9e7',
                    borderRadius: 4,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${progress}%`,
                      height: '100%',
                      backgroundColor: accent,
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>
            )}
            {shots && shots.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {shots.map((name) => (
                  <span
                    key={name}
                    style={{
                      padding: '6px 14px',
                      backgroundColor: '#ECF5EF',
                      color: '#588E6E',
                      fontSize: 12,
                      fontWeight: 600,
                      borderRadius: 9999,
                    }}
                  >
                    {name}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <style>{`
        .lesson-card-grid:hover { box-shadow: 0 12px 24px rgba(0,0,0,0.08); }
        .lesson-card-grid:hover .lesson-card-play { opacity: 1; }
        .lesson-card-grid:hover .lesson-card-thumb-overlay { opacity: 0; }
        .lesson-card-thumb:hover .lesson-card-play { opacity: 1; }
        .lesson-card-thumb:hover .lesson-card-thumb-overlay { opacity: 0; }
      `}</style>
    </div>
  );
};

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
