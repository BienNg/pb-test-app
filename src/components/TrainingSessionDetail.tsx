import React, { useState } from 'react';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, RADIUS } from '../styles/theme';
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
        backgroundColor: COLORS.background,
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
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: SPACING.md,
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
              textAlign: 'right',
              flex: 1,
            }}
          >
            <h1
              style={{
                ...TYPOGRAPHY.h3,
                margin: 0,
                color: COLORS.textPrimary,
              }}
            >
              Training Session
            </h1>
            <p
              style={{
                ...TYPOGRAPHY.bodySmall,
                margin: `${SPACING.xs}px 0 0`,
                color: COLORS.textSecondary,
              }}
            >
              {session.dateLabel} • {session.time} • ⏱️ {session.duration}
            </p>
          </div>
        </div>

        {/* Main content */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 7fr) minmax(0, 5fr)',
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
                  'radial-gradient(circle at 10% 20%, #9BE15D 0%, #1C1C1E 45%, #000000 100%)',
                boxShadow: SHADOWS.subtle,
                marginBottom: SPACING.md,
              }}
            >
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
                      borderTop: '11px solid transparent',
                      borderBottom: '11px solid transparent',
                      borderLeft: '18px solid #FFFFFF',
                    }}
                  />
                </div>
              </div>
              <video
                controls
                style={{
                  width: '100%',
                  display: 'block',
                  aspectRatio: '16 / 9',
                  objectFit: 'cover',
                }}
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
              {session.title}
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
                  backgroundColor: COLORS.white,
                  boxShadow: SHADOWS.light,
                  ...TYPOGRAPHY.label,
                  color: COLORS.textSecondary,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: SPACING.xs,
                }}
              >
                <span>{session.thumbnail}</span>
                <span>Training session</span>
              </div>
              <div
                style={{
                  padding: `${SPACING.xs}px ${SPACING.sm}px`,
                  borderRadius: 999,
                  backgroundColor: COLORS.white,
                  boxShadow: SHADOWS.light,
                  ...TYPOGRAPHY.label,
                  color: COLORS.textSecondary,
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
              maxHeight: 520,
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
                comments.map((comment) => (
                  <div
                    key={comment.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: SPACING.sm,
                      padding: `${SPACING.sm}px 0`,
                      borderBottom: `1px solid ${COLORS.backgroundLight}`,
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        backgroundColor:
                          comment.role === 'Coach' ? COLORS.primaryLight : COLORS.iconBg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 16,
                      }}
                    >
                      {comment.role === 'Coach' ? '🎓' : '🙂'}
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
                              fontWeight: 600,
                              color: COLORS.textPrimary,
                            }}
                          >
                            {comment.author}
                          </span>
                          <span
                            style={{
                              ...TYPOGRAPHY.label,
                              textTransform: 'uppercase',
                              color: COLORS.textSecondary,
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
                ))
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
                Add a comment
              </label>
              <textarea
                id="session-comment-input"
                rows={3}
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                placeholder="Share what you noticed, where you felt challenged, or what you want to focus on next session."
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
                      ? '0 6px 14px rgba(155, 225, 93, 0.45)'
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

