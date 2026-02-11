import React, { useEffect, useState } from 'react';
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
  const [comments, setComments] = useState<SessionComment[]>(() => {
    if (!session) return [];

    if (session.id === 1) {
      return [
        {
          id: 1,
          author: 'Coach Riley',
          role: 'Coach',
          createdAt: '2h ago',
          text: 'Great use of your split step on wide balls. Watch the clip at 08:12 for a perfect example.',
        },
        {
          id: 2,
          author: 'You',
          role: 'You',
          createdAt: '1h ago',
          text: 'I can feel how much smoother my transitions are. Next time I want to focus on staying lower.',
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
        },
      ];
    }

    return [];
  });

  if (!session) {
    return null;
  }

  const handleAddComment = () => {
    if (!commentDraft.trim()) return;

    const newComment: SessionComment = {
      id: Date.now(),
      author: 'You',
      role: 'You',
      createdAt: 'Just now',
      text: commentDraft.trim(),
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
              {!isVideoPlaying && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                  }}
                >
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
                </div>
              )}
              <video
                controls
                style={{
                  width: '100%',
                  display: 'block',
                  aspectRatio: '16 / 9',
                  objectFit: 'cover',
                }}
                onPlay={() => setIsVideoPlaying(true)}
                onPause={() => setIsVideoPlaying(false)}
                onEnded={() => setIsVideoPlaying(false)}
              >
                <source src={session.videoUrl} type="video/mp4" />
              </video>
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
              <label
                htmlFor="session-comment-input"
                style={{
                  ...TYPOGRAPHY.label,
                  textTransform: 'uppercase',
                  color: COLORS.textSecondary,
                  display: 'block',
                  marginBottom: SPACING.xs,
                }}
              >
                Reflection
              </label>
              <p
                style={{
                  ...TYPOGRAPHY.bodySmall,
                  color: COLORS.textPrimary,
                  fontWeight: 500,
                  margin: `0 0 ${SPACING.xs}px`,
                }}
              >
                What did you notice in this session?
              </p>
              <p
                style={{
                  ...TYPOGRAPHY.bodySmall,
                  color: COLORS.textSecondary,
                  margin: `0 0 ${SPACING.sm}px`,
                }}
              >
                Where did you feel challenged, or what do you want to focus on next time?
              </p>
              <textarea
                id="session-comment-input"
                rows={3}
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                placeholder="Capture a quick note for future you..."
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
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: SPACING.sm,
                }}
              >
                <span
                  style={{
                    ...TYPOGRAPHY.label,
                    color: COLORS.textSecondary,
                  }}
                >
                  Visible to you and your coach.
                </span>
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
            <p
              style={{
                ...TYPOGRAPHY.bodySmall,
                color: COLORS.textSecondary,
                marginTop: SPACING.sm,
              }}
            >
              Set one focus you want to carry into your next session.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

