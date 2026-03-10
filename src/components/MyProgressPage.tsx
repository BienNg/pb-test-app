import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../styles/theme';
import { LessonCard } from './Cards';
import { Card } from './BaseComponents';
import { createClient } from '@/lib/supabase/client';
import { fetchSessionComments, mapDbCommentToSessionComment } from '@/lib/sessionComments';
import { parseCommentTextWithShots } from './TrainingSessionDetail';
import { IconUser } from './Icons';
import { useAuth } from './providers/AuthProvider';

export interface MyProgressPageProps {
  /** Override page title (e.g. "Alex's Progress" when coach views a student) */
  title?: string;
  /** When set, show a back button (e.g. in coach view) */
  onBack?: () => void;
  /** Optional controlled value for which segment is selected. When omitted, component manages its own state. */
  selectedSegment?: 'videos' | 'duprCoach';
  /** Called when the selected segment changes (used with controlled selectedSegment). */
  onSelectedSegmentChange?: (segment: 'videos' | 'duprCoach') => void;
  /** When set, open a full-screen training session view instead of inline modal */
  onOpenSession?: (sessionId: string) => void;
  /** Sessions to display (e.g. from DB for a student). Required; when empty, no sessions are shown. */
  sessions: TrainingSession[];
}

export interface TrainingSession {
  id: string;
  dateKey: string;
  dateLabel: string;
  time: string;
  thumbnail: string;
  duration: string;
  title: string;
  focus: string;
  videoUrl: string;
}

export interface SessionComment {
  id: number | string;
  author: string;
  role: 'Coach' | 'You' | string;
  createdAt: string;
  text: string;
  /** Timestamp in seconds - clicking jumps video to this point (Frame.io style) */
  timestampSeconds?: number;
  /** ISO date string when from DB (optional) */
  createdAtIso?: string;
  /** Tagged/mentioned users when from DB */
  taggedUsers?: { id: string; name: string }[];
  /** Filename of an attached shot-example GIF (e.g. "shot-example-Dink-Volley.gif") */
  exampleGif?: string;
}

export const MyProgressPage: React.FC<MyProgressPageProps> = ({
  title,
  onBack,
  selectedSegment: selectedSegmentProp,
  onSelectedSegmentChange,
  onOpenSession,
  sessions: sessionsProp,
}) => {
  const { signOut } = useAuth();
  const router = useRouter();
  const sessions = sessionsProp ?? [];
  const [internalSelectedSegment, setInternalSelectedSegment] = useState<'videos' | 'duprCoach'>('videos');
  const selectedSegment = selectedSegmentProp ?? internalSelectedSegment;
  const setSelectedSegment = onSelectedSegmentChange ?? setInternalSelectedSegment;
  const [shotsBySession, setShotsBySession] = useState<Record<string, string[]>>({});
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  // For DB-backed sessions, load comments and derive unique shots from their texts
  useEffect(() => {
    if (!sessionsProp || sessionsProp.length === 0) return;
    const supabase = createClient();
    if (!supabase) return;

    const load = async () => {
      const result: Record<string, string[]> = {};
      for (const s of sessionsProp) {
        const rows = await fetchSessionComments(supabase, s.id);
        if (!rows || rows.length === 0) continue;
        const comments = rows.map((r) => mapDbCommentToSessionComment(r, null));
        const shotSet = new Set<string>();
        comments.forEach((c) => {
          parseCommentTextWithShots(c.text).forEach((seg) => {
            if (seg.type === 'shot') {
              shotSet.add(seg.name);
            }
          });
        });
        if (shotSet.size > 0) {
          result[s.id] = Array.from(shotSet).sort((a, b) => a.localeCompare(b));
        }
      }
      setShotsBySession(result);
    };

    void load();
  }, [sessionsProp]);

  useEffect(() => {
    if (!profileMenuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileMenuOpen]);

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        minHeight: '100vh',
        padding: `${SPACING.md}px`,
        width: '100%',
        boxSizing: 'border-box',
        overflowX: 'hidden',
      }}
    >
      <div
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: SPACING.xl }}>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                marginBottom: SPACING.md,
                display: 'flex',
                alignItems: 'center',
                gap: SPACING.xs,
                color: COLORS.textSecondary,
                ...TYPOGRAPHY.bodySmall,
                cursor: 'pointer',
              }}
            >
              ← Back
            </button>
          )}
          <div
            style={{
              margin: 0,
              marginBottom: SPACING.xl,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: SPACING.md,
            }}
          >
            <h1
              style={{
                ...TYPOGRAPHY.h1,
                color: COLORS.textPrimary,
                margin: 0,
              }}
            >
              {title ?? 'My Progress'}
            </h1>
            <div style={{ position: 'relative', flexShrink: 0 }} ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setProfileMenuOpen((o) => !o)}
                aria-label="Profile menu"
                aria-expanded={profileMenuOpen}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  border: 'none',
                  background: COLORS.backgroundLight,
                  color: COLORS.textPrimary,
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                }}
              >
                <IconUser size={22} />
              </button>
              {profileMenuOpen && (
                <div
                  role="menu"
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '100%',
                    marginTop: 4,
                    minWidth: 140,
                    padding: 4,
                    background: COLORS.white,
                    borderRadius: 8,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                    zIndex: 10,
                  }}
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={async () => {
                      setProfileMenuOpen(false);
                      await signOut();
                      router.replace('/login');
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: 'none',
                      borderRadius: 6,
                      background: 'transparent',
                      color: COLORS.textPrimary,
                      ...TYPOGRAPHY.body,
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = COLORS.backgroundLight;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Segmented Control */}
          <div
            style={{
              display: 'flex',
              background: `linear-gradient(135deg, ${COLORS.backgroundLight} 0%, ${COLORS.iconBg} 100%)`,
              borderRadius: 999,
              padding: 2,
              gap: 2,
              marginBottom: SPACING.xl,
              boxShadow: 'inset 0px 1px 2px rgba(0, 0, 0, 0.04), 0px 1px 3px rgba(0, 0, 0, 0.06)',
              border: `1px solid rgba(0, 0, 0, 0.04)`,
              position: 'relative',
              overflow: 'hidden',
              maxWidth: 480,
              width: '100%',
              margin: '0 auto',
            }}
          >
            {/* Subtle shimmer overlay */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.3) 0%, transparent 50%)',
                pointerEvents: 'none',
              }}
            />
            <button
              type="button"
              onClick={() => setSelectedSegment('videos')}
              style={{
                flex: 1,
                padding: `${SPACING.sm}px ${SPACING.md}px`,
                borderRadius: 999,
                border: 'none',
                backgroundColor: selectedSegment === 'videos' ? COLORS.white : 'transparent',
                color: selectedSegment === 'videos' ? COLORS.textPrimary : COLORS.textSecondary,
                ...TYPOGRAPHY.bodySmall,
                fontWeight: selectedSegment === 'videos' ? 600 : 500,
                cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: selectedSegment === 'videos' 
                  ? '0px 2px 8px rgba(0, 0, 0, 0.08), 0px 1px 2px rgba(0, 0, 0, 0.04)' 
                  : 'none',
                transform: selectedSegment === 'videos' ? 'translateY(-1px)' : 'translateY(0)',
                position: 'relative',
                zIndex: selectedSegment === 'videos' ? 1 : 0,
              }}
              onMouseEnter={(e) => {
                if (selectedSegment !== 'videos') {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedSegment !== 'videos') {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              Your Sessions
            </button>
            <button
              type="button"
              onClick={() => setSelectedSegment('duprCoach')}
              style={{
                flex: 1,
                padding: `${SPACING.sm}px ${SPACING.md}px`,
                borderRadius: 999,
                border: 'none',
                backgroundColor: selectedSegment === 'duprCoach' ? COLORS.white : 'transparent',
                color: selectedSegment === 'duprCoach' ? COLORS.textPrimary : COLORS.textSecondary,
                ...TYPOGRAPHY.bodySmall,
                fontWeight: selectedSegment === 'duprCoach' ? 600 : 500,
                cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: selectedSegment === 'duprCoach' 
                  ? '0px 2px 8px rgba(0, 0, 0, 0.08), 0px 1px 2px rgba(0, 0, 0, 0.04)' 
                  : 'none',
                transform: selectedSegment === 'duprCoach' ? 'translateY(-1px)' : 'translateY(0)',
                position: 'relative',
                zIndex: selectedSegment === 'duprCoach' ? 1 : 0,
              }}
              onMouseEnter={(e) => {
                if (selectedSegment !== 'duprCoach') {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedSegment !== 'duprCoach') {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              DUPR Coach
            </button>
          </div>
        </div>

        {/* Content based on selected segment */}
        {selectedSegment === 'videos' && (
          <div style={{ marginBottom: SPACING.xl }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: `${SPACING.lg}px`,
              }}
            >
              {sessions.map((session) => (
                <div
                  key={session.id}
                  id={`session-${session.id}`}
                >
                  <LessonCard
                    title={session.time === '—' ? session.dateLabel : `${session.dateLabel} • ${session.time}`}
                    category="Training Session"
                    duration={session.duration}
                    thumbnail={session.thumbnail}
                    videoUrl={session.videoUrl}
                    shots={shotsBySession[session.id]}
                    isVOD
                    onClick={() =>
                      onOpenSession
                        ? onOpenSession(session.id)
                        : console.log(`Open video for training session ${session.id}`)
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedSegment === 'duprCoach' && (
          <div style={{ marginBottom: SPACING.xl }}>
            {/* User Profile Section */}
            <div
              style={{
                position: 'relative',
                borderRadius: RADIUS.lg,
                overflow: 'hidden',
                marginBottom: SPACING.xl,
                background: `linear-gradient(135deg, #9B7ED6 0%, #7B5FB8 50%, #6B4FA8 100%)`,
                padding: `${SPACING.xxl * 2}px ${SPACING.xl}px ${SPACING.xl}px`,
                boxShadow: SHADOWS.md,
              }}
            >
              {/* Dark overlay for better contrast */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.15)',
                }}
              />
              
              {/* Background blur effect */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Crect width=\'100\' height=\'100\' fill=\'%23D6C9FF\'/%3E%3C/svg%3E")',
                  opacity: 0.2,
                  filter: 'blur(20px)',
                }}
              />
              
              {/* Content */}
              <div style={{ position: 'relative', zIndex: 1 }}>
                {/* Avatar */}
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    backgroundColor: COLORS.white,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto',
                    marginBottom: SPACING.md,
                    color: COLORS.purple,
                    ...TYPOGRAPHY.h2,
                    fontWeight: 700,
                  }}
                >
                  BN
                </div>

                {/* Name */}
                <h2
                  style={{
                    ...TYPOGRAPHY.h2,
                    color: COLORS.white,
                    textAlign: 'center',
                    margin: 0,
                    marginBottom: SPACING.xl,
                    fontWeight: 700,
                  }}
                >
                  BIEN
                </h2>

                {/* DUPR Metrics */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: SPACING.md,
                    marginBottom: SPACING.xl,
                  }}
                >
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ ...TYPOGRAPHY.label, color: COLORS.white, opacity: 0.8, marginBottom: SPACING.xs }}>
                      DUPR
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: SPACING.xs,
                        marginBottom: SPACING.xs,
                      }}
                    >
                      <span style={{ ...TYPOGRAPHY.h3, color: COLORS.white, fontWeight: 700 }}>
                        NR
                      </span>
                      <span style={{ color: COLORS.white, fontSize: '16px' }}>+</span>
                    </div>
                    <div style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.white, opacity: 0.9 }}>
                      Not Rated
                    </div>
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <div style={{ ...TYPOGRAPHY.label, color: COLORS.white, opacity: 0.8, marginBottom: SPACING.xs }}>
                      Your DUPR Goal
                    </div>
                    <div
                      style={{
                        ...TYPOGRAPHY.h3,
                        color: COLORS.white,
                        fontWeight: 700,
                        marginBottom: SPACING.xs,
                      }}
                    >
                      NR
                    </div>
                    <div style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.white, opacity: 0.9 }}>
                      Not Rated
                    </div>
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <div style={{ ...TYPOGRAPHY.label, color: COLORS.white, opacity: 0.8, marginBottom: SPACING.xs }}>
                      DUPR Coach
                    </div>
                    <div
                      style={{
                        ...TYPOGRAPHY.h3,
                        color: COLORS.white,
                        fontWeight: 700,
                        marginBottom: SPACING.xs,
                      }}
                    >
                      David
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div
                  style={{
                    display: 'flex',
                    gap: SPACING.md,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => console.log('Subscribe clicked')}
                    style={{
                      flex: 1,
                      padding: `${SPACING.md}px ${SPACING.lg}px`,
                      borderRadius: RADIUS.md,
                      border: 'none',
                      backgroundColor: COLORS.purple,
                      color: COLORS.white,
                      ...TYPOGRAPHY.bodySmall,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    SUBSCRIBE
                  </button>
                  <button
                    type="button"
                    onClick={() => console.log('View Roadmap clicked')}
                    style={{
                      flex: 1,
                      padding: `${SPACING.md}px ${SPACING.lg}px`,
                      borderRadius: RADIUS.md,
                      border: `2px solid ${COLORS.white}`,
                      backgroundColor: 'transparent',
                      color: COLORS.white,
                      ...TYPOGRAPHY.bodySmall,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    VIEW ROADMAP
                  </button>
                </div>
              </div>
            </div>

            {/* DUPR Skills Section */}
            <div>
              <h2
                style={{
                  ...TYPOGRAPHY.h3,
                  color: COLORS.textPrimary,
                  fontWeight: 700,
                  textAlign: 'center',
                  marginBottom: SPACING.md,
                  textTransform: 'uppercase',
                }}
              >
                DUPR SKILLS
              </h2>
              
              <p
                style={{
                  ...TYPOGRAPHY.body,
                  color: COLORS.textSecondary,
                  marginBottom: SPACING.xl,
                  textAlign: 'left',
                }}
              >
                See below your scores for your game areas. Your coach has rated each area on a DUPR scale of 2 to 8.
              </p>

              {/* Skill Cards Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: SPACING.md,
                }}
              >
                {[
                  'Serve',
                  'Return',
                  'Non Bounce Volley',
                  'Dinking',
                  '3rd Shot Drop',
                  'Kitchen Readiness',
                  'Court Position',
                  'Partner Chemistry',
                ].map((skill) => (
                  <Card
                    key={skill}
                    padding={SPACING.lg}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div
                      style={{
                        ...TYPOGRAPHY.bodySmall,
                        color: COLORS.textPrimary,
                        fontWeight: 500,
                        flex: 1,
                      }}
                    >
                      {skill}
                    </div>
                    <div
                      style={{
                        backgroundColor: COLORS.iconBg,
                        borderRadius: RADIUS.full,
                        padding: `${SPACING.xs}px ${SPACING.md}px`,
                        ...TYPOGRAPHY.h3,
                        color: COLORS.textPrimary,
                        fontWeight: 700,
                        minWidth: '50px',
                        textAlign: 'center',
                      }}
                    >
                      0.0
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

