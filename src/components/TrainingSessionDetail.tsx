import React, { useEffect, useState, useRef, useCallback } from 'react';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, RADIUS } from '../styles/theme';
import { IconCalendar, IconClock } from './Icons';
import { TRAINING_SESSIONS, type SessionComment } from './MyProgressPage';

export interface TrainingSessionDetailProps {
  sessionId: number;
  onBack: () => void;
}

export const TrainingSessionDetail: React.FC<TrainingSessionDetailProps> = ({
  sessionId,
  onBack,
}) => {
  const session = TRAINING_SESSIONS.find((s) => s.id === sessionId);
  const videoRef = useRef<HTMLVideoElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [isNarrow, setIsNarrow] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  useEffect(() => {
    const updateLayout = () => {
      if (typeof window === 'undefined') return;
      setIsNarrow(window.innerWidth < 768);
    };

    updateLayout();
    window.addEventListener('resize', updateLayout);

    return () => {
      window.removeEventListener('resize', updateLayout);
    };
  }, []);

  const [commentDraft, setCommentDraft] = useState('');
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [comments, setComments] = useState<SessionComment[]>(() => {
    if (!session) return [];

    if (session.id === 1) {
      return [
        {
          id: 1,
          author: 'Coach Riley',
          role: 'Coach',
          createdAt: '2h ago',
          text: 'Great use of your split step on wide balls.',
          timestampSeconds: 492, // 08:12
        },
        {
          id: 2,
          author: 'You',
          role: 'You',
          createdAt: '1h ago',
          text: 'I can feel how much smoother my transitions are. Next time I want to focus on staying lower.',
          timestampSeconds: 145, // 02:25
        },
      ];
    }

    if (session.id === 2) {
      return [
        {
          id: 3,
          author: 'Coach Riley',
          role: 'Coach',
          createdAt: 'Yesterday',
          text: 'Your returns are landing much deeper. Let’s keep targeting the backhand corner.',
          timestampSeconds: 89,
        },
      ];
    }

    return [];
  });

  if (!session) {
    return null;
  }

  const seekTo = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = seconds;
    video.play().catch(() => {});
  }, []);

  const formatTimestamp = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(1, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const insertTimestampAtCursor = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    const ts = formatTimestamp(currentVideoTime);
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const before = commentDraft.slice(0, start);
    const after = commentDraft.slice(end);
    setCommentDraft(before + ts + after);
    setTimeout(() => {
      el.focus();
      const newPos = start + ts.length;
      el.setSelectionRange(newPos, newPos);
    }, 0);
  }, [commentDraft, currentVideoTime]);

  const handleAddComment = () => {
    if (!commentDraft.trim()) return;

    const currentTime = videoRef.current?.currentTime ?? 0;

    const newComment: SessionComment = {
      id: Date.now(),
      author: 'You',
      role: 'You',
      createdAt: 'Just now',
      text: commentDraft.trim(),
      timestampSeconds: Math.round(currentTime),
    };

    setComments((prev) => [...prev, newComment]);
    setCommentDraft('');
  };

  return (
    <div
      style={{
        backgroundColor: 'transparent',
        minHeight: '100vh',
        padding: `${SPACING.md}px`,
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {/* Header */}
        <div
          style={{
            marginBottom: SPACING.lg,
            display: 'flex',
            flexDirection: 'column',
            gap: SPACING.sm,
          }}
        >
          <button
            type="button"
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              gap: SPACING.xs,
              color: COLORS.textSecondary,
              ...TYPOGRAPHY.bodySmall,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            ← Back to My Progress
          </button>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: SPACING.xs,
            }}
          >
            <div
              style={{
                padding: `${SPACING.xs}px ${SPACING.sm}px`,
                borderRadius: 999,
                backgroundColor: COLORS.backgroundLight,
                ...TYPOGRAPHY.label,
                textTransform: 'uppercase',
                color: COLORS.textSecondary,
                opacity: 0.9,
              }}
            >
              Training session
            </div>
            <h1
              style={{
                ...TYPOGRAPHY.h2,
                margin: 0,
                color: COLORS.textPrimary,
              }}
            >
              {session.title}
            </h1>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: SPACING.md,
                marginTop: SPACING.xs,
                color: COLORS.textSecondary,
                ...TYPOGRAPHY.bodySmall,
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span role="img" aria-label="calendar">
                  <IconCalendar size={16} />
                </span>
                <span>{session.dateLabel}</span>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span role="img" aria-label="time">
                  <IconClock size={16} />
                </span>
                <span>{session.time}</span>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span role="img" aria-label="duration">
                  <IconClock size={16} />
                </span>
                <span>{session.duration}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isNarrow
              ? 'minmax(0, 1fr)'
              : 'minmax(0, 7fr) minmax(0, 5fr)',
            gap: SPACING.lg,
          }}
        >
          {/* Video + session info */}
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                position: 'relative',
                width: '100%',
                borderRadius: RADIUS.lg,
                overflow: 'hidden',
                background:
                  'radial-gradient(circle at 10% 20%, #31cb00 0%, #1C1C1E 45%, #000000 100%)',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.28)',
                marginBottom: SPACING.md,
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 1,
                }}
                onClick={() => {
                  const v = videoRef.current;
                  if (!v) return;
                  v.paused ? v.play() : v.pause();
                }}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    const v = videoRef.current;
                    if (!v) return;
                    v.paused ? v.play() : v.pause();
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={isVideoPlaying ? 'Pause video' : 'Play video'}
              >
              {!isVideoPlaying && (
                  <div
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: '50%',
                      backgroundColor: 'rgba(0, 0, 0, 0.55)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid rgba(255, 255, 255, 0.4)',
                      backdropFilter: 'blur(6px)',
                    }}
                  >
                    <div
                      style={{
                        marginLeft: 4,
                        width: 0,
                        height: 0,
                        borderTop: '12px solid transparent',
                        borderBottom: '12px solid transparent',
                        borderLeft: '20px solid #FFFFFF',
                      }}
                    />
                  </div>
              )}
              </div>
              <video
                ref={videoRef}
                style={{
                  width: '100%',
                  display: 'block',
                  aspectRatio: '16 / 9',
                  objectFit: 'cover',
                }}
                onPlay={() => setIsVideoPlaying(true)}
                onPause={() => setIsVideoPlaying(false)}
                onEnded={() => setIsVideoPlaying(false)}
                onTimeUpdate={(e) =>
                  setCurrentVideoTime((e.target as HTMLVideoElement).currentTime)
                }
                onLoadedMetadata={(e) =>
                  setVideoDuration((e.target as HTMLVideoElement).duration)
                }
              >
                <source src={session.videoUrl} type="video/mp4" />
              </video>

              {/* Frame.io-style timeline with comment markers */}
              {videoDuration > 0 && (
                <div
                  style={{
                    padding: `${SPACING.sm}px ${SPACING.md}px`,
                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: SPACING.sm,
                    marginBottom: SPACING.xs,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      const v = videoRef.current;
                      if (!v) return;
                      v.paused ? v.play() : v.pause();
                    }}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: RADIUS.sm,
                      border: 'none',
                      backgroundColor: COLORS.primary,
                      color: COLORS.textPrimary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                    aria-label={isVideoPlaying ? 'Pause' : 'Play'}
                  >
                    {isVideoPlaying ? (
                      <span style={{ fontSize: 14 }}>⏸</span>
                    ) : (
                      <span style={{ marginLeft: 2, fontSize: 12 }}>▶</span>
                    )}
                  </button>
                  <span
                    style={{
                      ...TYPOGRAPHY.label,
                      color: 'rgba(255, 255, 255, 0.9)',
                      minWidth: 36,
                    }}
                  >
                    {formatTimestamp(currentVideoTime)}
                  </span>
                    <div
                      style={{
                        flex: 1,
                        position: 'relative',
                        height: 24,
                        cursor: 'pointer',
                        borderRadius: RADIUS.sm,
                        overflow: 'visible',
                      }}
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const pct = Math.max(0, Math.min(1, x / rect.width));
                        const time = pct * videoDuration;
                        seekTo(time);
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          backgroundColor: 'rgba(255, 255, 255, 0.15)',
                          borderRadius: RADIUS.sm,
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: `${(currentVideoTime / videoDuration) * 100}%`,
                          backgroundColor: COLORS.primary,
                          borderRadius: RADIUS.sm,
                          transition: 'width 0.1s linear',
                        }}
                      />
                      {comments
                        .filter((c) => c.timestampSeconds != null)
                        .map((c) => {
                          const left =
                            ((c.timestampSeconds ?? 0) / videoDuration) * 100;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                seekTo(c.timestampSeconds!);
                              }}
                              style={{
                                position: 'absolute',
                                left: `calc(${left}% - 5px)`,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                backgroundColor: COLORS.primary,
                                border: '2px solid white',
                                boxShadow: '0 0 0 1px rgba(0,0,0,0.3)',
                                cursor: 'pointer',
                                padding: 0,
                              }}
                              title={`${c.author}: ${c.text.length > 45 ? c.text.slice(0, 45) + '…' : c.text}`}
                            />
                          );
                        })}
                    </div>
                    <span
                      style={{
                        ...TYPOGRAPHY.label,
                        color: 'rgba(255, 255, 255, 0.7)',
                        minWidth: 36,
                      }}
                    >
                      {formatTimestamp(videoDuration)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <h2
              style={{
                ...TYPOGRAPHY.h3,
                margin: 0,
                marginBottom: SPACING.xs,
                color: COLORS.textPrimary,
              }}
            >
              Session overview
            </h2>
            <p
              style={{
                ...TYPOGRAPHY.bodySmall,
                margin: 0,
                marginBottom: SPACING.md,
                color: COLORS.textSecondary,
              }}
            >
              Session focus: {session.focus}
            </p>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: SPACING.sm,
              }}
            >
              <div
                style={{
                  padding: `${SPACING.xs}px ${SPACING.sm}px`,
                  borderRadius: 999,
                  backgroundColor: COLORS.backgroundLight,
                  ...TYPOGRAPHY.label,
                  color: COLORS.textSecondary,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: SPACING.xs,
                  opacity: 0.9,
                }}
              >
                <span>{session.thumbnail}</span>
                <span>Training session</span>
              </div>
              <div
                style={{
                  padding: `${SPACING.xs}px ${SPACING.sm}px`,
                  borderRadius: 999,
                  backgroundColor: COLORS.backgroundLight,
                  ...TYPOGRAPHY.label,
                  color: COLORS.textSecondary,
                  opacity: 0.8,
                }}
              >
                Saved to My Progress
              </div>
            </div>
          </div>

          {/* Comments column */}
          <div
            style={{
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              maxHeight: isNarrow ? 'none' : 520,
            }}
          >
            <h3
              style={{
                ...TYPOGRAPHY.bodySmall,
                fontWeight: 600,
                textTransform: 'uppercase',
                color: COLORS.textSecondary,
                margin: 0,
                marginBottom: SPACING.sm,
              }}
            >
              Comments
            </h3>

            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                paddingRight: SPACING.sm,
                marginBottom: SPACING.md,
              }}
            >
              {comments.length === 0 ? (
                <p
                  style={{
                    ...TYPOGRAPHY.bodySmall,
                    color: COLORS.textSecondary,
                    margin: 0,
                  }}
                >
                  No comments yet. Be the first to leave a note about this session.
                </p>
              ) : (
                comments.map((comment) => {
                  const isCoach = comment.role === 'Coach';

                  return (
                    <div
                      key={comment.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: SPACING.sm,
                        padding: `${SPACING.sm}px ${SPACING.sm}px`,
                        margin: `0 -${SPACING.xs}px`,
                        borderBottom: `1px solid ${COLORS.backgroundLight}`,
                        backgroundColor: isCoach ? COLORS.backgroundLight : 'transparent',
                        borderLeft: isCoach
                          ? `3px solid ${COLORS.primaryLight}`
                          : `3px solid transparent`,
                        borderRadius: RADIUS.sm,
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          backgroundColor: isCoach ? COLORS.primaryLight : COLORS.iconBg,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 16,
                        }}
                      >
                        {isCoach ? '🎓' : '🙂'}
                      </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          justifyContent: 'space-between',
                          gap: SPACING.sm,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <span
                            style={{
                              ...TYPOGRAPHY.bodySmall,
                              fontWeight: isCoach ? 700 : 600,
                              color: COLORS.textPrimary,
                            }}
                          >
                            {comment.author}
                          </span>
                          <span
                            style={{
                              ...TYPOGRAPHY.label,
                              textTransform: 'uppercase',
                              color: isCoach ? COLORS.textPrimary : COLORS.textSecondary,
                              opacity: isCoach ? 0.9 : 0.8,
                            }}
                          >
                            {comment.role}
                          </span>
                        </div>
                        <span
                          style={{
                            ...TYPOGRAPHY.label,
                            color: COLORS.textMuted,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {comment.createdAt}
                        </span>
                      </div>
                      {comment.timestampSeconds != null && (
                        <button
                          type="button"
                          onClick={() => seekTo(comment.timestampSeconds!)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            marginTop: SPACING.xs,
                            padding: `${SPACING.xs}px ${SPACING.sm}px`,
                            borderRadius: RADIUS.sm,
                            border: `1px solid ${COLORS.primaryLight}`,
                            backgroundColor: 'rgba(49, 203, 0, 0.12)',
                            color: COLORS.primary,
                            ...TYPOGRAPHY.label,
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'background-color 0.15s, transform 0.1s',
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor =
                              'rgba(49, 203, 0, 0.22)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor =
                              'rgba(49, 203, 0, 0.12)';
                          }}
                        >
                          <span style={{ opacity: 0.9 }}>▶</span>
                          {formatTimestamp(comment.timestampSeconds)}
                        </button>
                      )}
                      <p
                        style={{
                          ...TYPOGRAPHY.bodySmall,
                          margin: `${SPACING.xs}px 0 0`,
                          color: COLORS.textPrimary,
                        }}
                      >
                        {comment.text}
                      </p>
                    </div>
                  </div>
                  );
                })
              )}
            </div>

            <div
              style={{
                borderRadius: RADIUS.md,
                border: `1px solid ${COLORS.backgroundLight}`,
                padding: SPACING.sm,
                backgroundColor: COLORS.cardBg,
                boxShadow: SHADOWS.light,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: SPACING.sm,
                  marginBottom: SPACING.xs,
                }}
              >
                <label
                  htmlFor="session-comment-input"
                  style={{
                    ...TYPOGRAPHY.label,
                    textTransform: 'uppercase',
                    color: COLORS.textSecondary,
                  }}
                >
                  Comment
                </label>
                <button
                  type="button"
                  onClick={insertTimestampAtCursor}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: `${SPACING.xs}px ${SPACING.sm}px`,
                    borderRadius: RADIUS.sm,
                    border: `1px solid ${COLORS.primaryLight}`,
                    backgroundColor: 'rgba(49, 203, 0, 0.1)',
                    color: COLORS.primary,
                    ...TYPOGRAPHY.label,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <IconClock size={14} />
                  {formatTimestamp(currentVideoTime)}
                </button>
              </div>
              <textarea
                ref={textareaRef}
                id="session-comment-input"
                rows={3}
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                placeholder="Add a note..."
                style={{
                  width: '100%',
                  resize: 'none',
                  border: 'none',
                  outline: 'none',
                  ...TYPOGRAPHY.bodySmall,
                  color: COLORS.textPrimary,
                  background: 'transparent',
                  marginBottom: SPACING.sm,
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={handleAddComment}
                  disabled={!commentDraft.trim()}
                  style={{
                    padding: `${SPACING.xs + 2}px ${SPACING.lg}px`,
                    borderRadius: 999,
                    border: 'none',
                    cursor: commentDraft.trim() ? 'pointer' : 'default',
                    ...TYPOGRAPHY.labelMed,
                    textTransform: 'uppercase',
                    letterSpacing: 0.4,
                    backgroundColor: commentDraft.trim()
                      ? COLORS.primary
                      : COLORS.primaryLight,
                    color: COLORS.textPrimary,
                    boxShadow: commentDraft.trim()
                      ? '0 6px 14px rgba(49, 203, 0, 0.45)'
                      : 'none',
                    transition:
                      'background-color 0.15s ease-out, box-shadow 0.15s ease-out, transform 0.1s ease-out',
                  }}
                >
                  Post
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

