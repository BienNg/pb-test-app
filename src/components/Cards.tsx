import React from 'react';
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../styles/theme';
import { Card, Badge } from './BaseComponents';
import { IconUser, IconPlay, IconCheck, IconClock, IconCalendar, IconCalendarDays, IconGraduationCap, IconMapPin, IconUsers, IconChevronDown } from './Icons';
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
  /** Technique checklist items NOT checked, grouped by subcategory. */
  techniquePointsToImproveBySubcategory?: { subcategoryLabel: string; items: string[] }[];
}

export const LessonCard: React.FC<LessonCardProps> = ({
  title,
  category,
  thumbnail,
  videoUrl,
  progress = 0,
  isCompleted = false,
  onClick,
  shots,
  dateLabel,
  variant = 'grid',
  techniquePointsToImproveBySubcategory,
}) => {
  const [pressed, setPressed] = React.useState(false);
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(new Set());
  const thumbnailUrl = getThumbnailUrl(thumbnail, videoUrl);

  const isList = variant === 'list';
  const isGrid = variant === 'grid';
  const useLibraryColors = variant === 'grid' || variant === 'list';
  const accent = useLibraryColors ? COLORS.libraryPrimary : COLORS.primary;
  const accentLight = useLibraryColors ? COLORS.libraryPrimaryLight : COLORS.primaryLight;

  const hasTechniqueItems =
    techniquePointsToImproveBySubcategory?.some((g) => g.items.length > 0) ?? false;
  const hasShotVideoExtras = hasTechniqueItems;

  const isShotVideo = ['shot video', 'game'].includes(category.toLowerCase());

  const CROSS_ICON_SVG = `url('data:image/svg+xml;utf8,<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 5L15 15M15 5L5 15" stroke="%23dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>')`;
  const CHECK_ICON_SVG = CROSS_ICON_SVG; // alias for backwards compatibility

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
        borderRadius: isGrid ? 24 : 12,
        overflow: 'hidden',
        padding: isGrid ? 20 : 0,
        boxShadow: isList ? SHADOWS.light : isGrid ? '0 20px 50px rgba(0,0,0,0.06)' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        border: `1px solid ${isList ? '#e2e8f0' : isGrid ? '#f3f4f6' : '#e1e9e7'}`,
        cursor: onClick ? 'pointer' : 'default',
        transition: isGrid ? 'all 0.5s ease' : 'transform 0.2s, box-shadow 0.2s',
        transform: pressed && onClick ? 'scale(0.98)' : undefined,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        height: hasShotVideoExtras ? undefined : '100%',
        alignSelf: hasShotVideoExtras ? 'flex-start' : undefined,
        ...(isGrid && !hasShotVideoExtras ? { flex: 1, minHeight: 0 } : {}),
      }}
    >
      {/* Thumbnail — glass-v3: 16/9 like video thumbnails (not square), Watch pill bottom-right; else: 16/9, center play */}
      <div
        className="lesson-card-thumb"
        style={{
          width: '100%',
          aspectRatio: '16/9',
          height: undefined,
          borderRadius: isGrid ? 16 : 0,
          backgroundColor: '#e2e8f0',
          backgroundImage: thumbnailUrl ? `url(${thumbnailUrl})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: isGrid ? '0 8px 24px rgba(0,0,0,0.08)' : undefined,
          marginBottom: isGrid ? 24 : 0,
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
            opacity: isList ? 1 : isGrid ? 0 : 0,
            transition: 'opacity 0.2s',
          }}
          className="lesson-card-thumb-overlay"
          aria-hidden
        />
        {/* Play: grid = Watch pill bottom-right; list = center circle */}
        <div
          className="lesson-card-play"
          style={{
            width: isList ? 48 : isGrid ? undefined : 56,
            height: isList ? 48 : isGrid ? undefined : 56,
            borderRadius: isGrid ? 16 : '50%',
            padding: isGrid ? '10px 20px' : undefined,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: isGrid ? 8 : 0,
            backgroundColor: isGrid ? 'rgba(255,255,255,0.9)' : useLibraryColors && !isList ? 'rgba(255,255,255,0.9)' : accent,
            color: isGrid ? accent : useLibraryColors && !isList ? accent : COLORS.white,
            boxShadow: isGrid ? '0 4px 12px rgba(0,0,0,0.1)' : '0 4px 12px rgba(0,0,0,0.2)',
            backdropFilter: isGrid ? 'blur(12px)' : undefined,
            border: isGrid ? '1px solid rgba(255,255,255,1)' : undefined,
            opacity: isList ? 0 : 1,
            transition: 'opacity 0.2s',
            position: 'absolute',
            ...(isGrid
              ? { bottom: 16, right: 16, left: undefined, top: undefined, transform: undefined }
              : { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }
            ),
          }}
        >
          <IconPlay size={isGrid ? 18 : isList ? 24 : 28} />
          {isGrid && <span style={{ fontSize: 13, fontWeight: 600 }}>Watch</span>}
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

      {/* Content — glass-v3: meta-top, title, improve-box; else: original layout */}
      <div
        style={{
          padding: isGrid ? '0 12px 12px' : 16,
          display: 'flex',
          flexDirection: 'column',
          gap: isGrid ? 0 : 12,
          flex: 1,
        }}
      >
        {isGrid ? (
          <>
            {/* glass-v3 meta-top: badge + date */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 12,
              }}
            >
              <span
                style={{
                  background: isShotVideo ? accent : accentLight,
                  color: isShotVideo ? '#fff' : accent,
                  fontSize: 11,
                  padding: '4px 12px',
                  borderRadius: 20,
                  fontWeight: 600,
                }}
              >
                {category.toUpperCase()}
              </span>
              {dateLabel && (
                <span style={{ fontSize: 13, color: '#71717a', fontWeight: 500 }}>
                  {dateLabel}
                </span>
              )}
            </div>
            {/* glass-v3 title */}
            <h3
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: '#18181b',
                fontFamily: "'SF Pro Display', -apple-system, sans-serif",
                marginBottom: hasShotVideoExtras ? 24 : 0,
                letterSpacing: '-0.02em',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {title}
            </h3>
          </>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              {!isShotVideo && (
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
              )}
              <p
                style={{
                  ...TYPOGRAPHY.body,
                  fontWeight: 600,
                  color: COLORS.textPrimary,
                  margin: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {title}
              </p>
              {dateLabel && (
                <p style={{ fontSize: 14, color: COLORS.textSecondary, margin: '4px 0 0' }}>
                  {dateLabel}
                </p>
              )}
            </div>
            {(isShotVideo || isList) && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flexShrink: 0 }}>
                {isShotVideo && (
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      backgroundColor: accent,
                      color: COLORS.white,
                    }}
                  >
                    {category.toUpperCase()}
                  </span>
                )}
                {isList && (
                  <span
                    style={{
                      color: COLORS.textMuted,
                      fontSize: 18,
                    }}
                    onClick={(e) => e.stopPropagation()}
                    role="button"
                    aria-label="More options"
                  >
                    ⋮
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Technique points — glass-v3: nested improve-box; else: original */}
        {techniquePointsToImproveBySubcategory?.map(
          (group) =>
            group.items.length > 0 && (
              <div key={group.subcategoryLabel} style={{ flexShrink: 0 }}>
                {isGrid ? (
                  <div
                    style={{
                      background: '#f8fafc',
                      borderRadius: 20,
                      padding: 20,
                      border: '1px solid #e5e7eb',
                    }}
                  >
                    <div
                      style={{
                        marginBottom: 12,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span style={{ fontSize: 16, color: '#18181b', fontWeight: 600 }}>
                        {group.subcategoryLabel}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          color: accent,
                          background: 'rgba(143, 185, 168, 0.15)',
                          padding: '4px 10px',
                          borderRadius: 10,
                          fontWeight: 700,
                        }}
                      >
                        TO IMPROVE
                      </span>
                    </div>
                    <ul
                      style={{
                        listStyle: 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                        margin: 0,
                        padding: 0,
                      }}
                    >
                      {(expandedGroups.has(group.subcategoryLabel)
                        ? group.items
                        : group.items.slice(0, 4)
                      ).map((item) => (
                        <li
                          key={item}
                          style={{
                            fontSize: 14,
                            color: '#52525b',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 10,
                          }}
                        >
                          <span
                            style={{
                              width: 16,
                              height: 16,
                              minWidth: 16,
                              background: CHECK_ICON_SVG,
                              backgroundSize: 'contain',
                              backgroundRepeat: 'no-repeat',
                              backgroundPosition: 'center',
                              flexShrink: 0,
                              marginTop: 2,
                            }}
                            aria-hidden
                          />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    {group.items.length > 4 && !expandedGroups.has(group.subcategoryLabel) && (
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedGroups((prev) => new Set(prev).add(group.subcategoryLabel));
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            setExpandedGroups((prev) => new Set(prev).add(group.subcategoryLabel));
                          }
                        }}
                        style={{
                          fontSize: 11,
                          color: accent,
                          fontStyle: 'italic',
                          paddingLeft: 22,
                          cursor: 'pointer',
                          alignSelf: 'flex-start',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          textDecoration: 'underline',
                        }}
                        aria-label={`Show ${group.items.length - 4} more items`}
                      >
                        <IconChevronDown size={12} />
                        +{group.items.length - 4} more
                      </div>
                    )}
                    {group.items.length > 4 && expandedGroups.has(group.subcategoryLabel) && (
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedGroups((prev) => {
                            const next = new Set(prev);
                            next.delete(group.subcategoryLabel);
                            return next;
                          });
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            setExpandedGroups((prev) => {
                              const next = new Set(prev);
                              next.delete(group.subcategoryLabel);
                              return next;
                            });
                          }
                        }}
                        style={{
                          fontSize: 11,
                          color: accent,
                          fontStyle: 'italic',
                          paddingLeft: 22,
                          cursor: 'pointer',
                          alignSelf: 'flex-start',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          textDecoration: 'underline',
                        }}
                        aria-label="Show fewer items"
                      >
                        <IconChevronDown size={12} style={{ transform: 'rotate(180deg)' }} />
                        Show less
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                        marginBottom: 6,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                          color: COLORS.textMuted,
                          backgroundColor: '#f1f5f9',
                          padding: '2px 6px',
                          borderRadius: 4,
                          alignSelf: 'flex-start',
                        }}
                      >
                        To improve
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: accent,
                        }}
                      >
                        {group.subcategoryLabel}
                      </span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                        paddingLeft: 10,
                        borderLeft: `2px solid ${accentLight}`,
                      }}
                    >
                      {(expandedGroups.has(group.subcategoryLabel)
                        ? group.items
                        : group.items.slice(0, 4)
                      ).map((item) => (
                        <div
                          key={item}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            fontSize: 12,
                            color: COLORS.textSecondary,
                            lineHeight: 1.35,
                          }}
                        >
                          <span
                            style={{
                              width: 14,
                              height: 14,
                              minWidth: 14,
                              borderRadius: '50%',
                              border: '1px solid rgba(199, 199, 204, 0.5)',
                              flexShrink: 0,
                            }}
                            aria-hidden
                          />
                          <span>{item}</span>
                        </div>
                      ))}
                      {group.items.length > 4 && !expandedGroups.has(group.subcategoryLabel) && (
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedGroups((prev) => new Set(prev).add(group.subcategoryLabel));
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              e.stopPropagation();
                              setExpandedGroups((prev) => new Set(prev).add(group.subcategoryLabel));
                            }
                          }}
                          style={{
                            fontSize: 11,
                            color: accent,
                            fontStyle: 'italic',
                            paddingLeft: 22,
                            cursor: 'pointer',
                            alignSelf: 'flex-start',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            textDecoration: 'underline',
                          }}
                          aria-label={`Show ${group.items.length - 4} more items`}
                        >
                          <IconChevronDown size={12} />
                          +{group.items.length - 4} more
                        </div>
                      )}
                      {group.items.length > 4 && expandedGroups.has(group.subcategoryLabel) && (
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedGroups((prev) => {
                              const next = new Set(prev);
                              next.delete(group.subcategoryLabel);
                              return next;
                            });
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              e.stopPropagation();
                              setExpandedGroups((prev) => {
                                const next = new Set(prev);
                                next.delete(group.subcategoryLabel);
                                return next;
                              });
                            }
                          }}
                          style={{
                            fontSize: 11,
                            color: accent,
                            fontStyle: 'italic',
                            paddingLeft: 22,
                            cursor: 'pointer',
                            alignSelf: 'flex-start',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            textDecoration: 'underline',
                          }}
                          aria-label="Show fewer items"
                        >
                          <IconChevronDown size={12} style={{ transform: 'rotate(180deg)' }} />
                          Show less
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
        )}

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
        .lesson-card-grid:hover { transform: translateY(-8px); box-shadow: 0 30px 60px rgba(0,0,0,0.08); }
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
      borderRadius: 16,
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
