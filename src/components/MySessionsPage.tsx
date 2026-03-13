import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from '../styles/theme';
import { LessonCard } from './Cards';
import { Card } from './BaseComponents';
import { createClient } from '@/lib/supabase/client';
import { fetchSessionComments, mapDbCommentToSessionComment } from '@/lib/sessionComments';
import { parseCommentTextWithShots } from './TrainingSessionDetail';
import { IconUser } from './Icons';
import { useAuth } from './providers/AuthProvider';

export interface MySessionsPageProps {
  /** Override page title (e.g. "Alex's Sessions" when coach views a student) */
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
  session_type?: string;
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

/** A reply to a session comment (stored as a subcomment in the DB). */
export interface SessionCommentReply extends Omit<SessionComment, 'id'> {
  /** Database id for the reply (always a UUID string). */
  id: string;
  /** Parent comment this reply belongs to. */
  parentCommentId: string;
  /** Frame marker position/size (0–100 percent for x/y, px for radius). When set, shown when viewing this reply. */
  markerXPercent?: number;
  markerYPercent?: number;
  markerRadiusX?: number;
  markerRadiusY?: number;
}

export const MySessionsPage: React.FC<MySessionsPageProps> = ({
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
        backgroundColor: '#f6f8f8',
        padding: '24px',
        width: '100%',
        boxSizing: 'border-box',
        overflowX: 'hidden',
        color: '#2d3a38',
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
        <div>
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
              marginBottom: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: SPACING.md,
            }}
          >
            <h1
              style={{
                fontSize: 24,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: '#2d3a38',
                margin: 0,
              }}
            >
              {title ?? 'My Sessions'}
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
                  border: '1px solid rgba(143, 185, 168, 0.3)',
                  background: 'rgba(143, 185, 168, 0.2)',
                  color: '#2d3a38',
                  cursor: 'pointer',
                  overflow: 'hidden',
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
              gap: '32px',
              borderBottom: '1px solid #e1e9e7',
              marginBottom: '24px',
            }}
          >
            <button
              type="button"
              onClick={() => setSelectedSegment('videos')}
              style={{
                paddingBottom: '12px',
                border: 'none',
                borderBottom: `3px solid ${selectedSegment === 'videos' ? '#6a9a95' : 'transparent'}`,
                borderRadius: 0,
                backgroundColor: 'transparent',
                color: selectedSegment === 'videos' ? '#333333' : '#6a9a95',
                fontSize: 14,
                fontWeight: selectedSegment === 'videos' ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Your Sessions
            </button>
            <button
              type="button"
              onClick={() => setSelectedSegment('duprCoach')}
              style={{
                paddingBottom: '12px',
                border: 'none',
                borderBottom: `3px solid ${selectedSegment === 'duprCoach' ? '#6a9a95' : 'transparent'}`,
                borderRadius: 0,
                backgroundColor: 'transparent',
                color: selectedSegment === 'duprCoach' ? '#333333' : '#6a9a95',
                fontSize: 14,
                fontWeight: selectedSegment === 'duprCoach' ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              DUPR Coach
            </button>
          </div>
        </div>

        {/* Content based on selected segment */}
        {selectedSegment === 'videos' && (
          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '24px',
              }}
            >
              {sessions.map((session) => (
                <div key={session.id} id={`session-${session.id}`}>
                  <LessonCard
                    title={session.title || session.focus || 'Training Session'}
                    dateLabel={session.time === '—' ? session.dateLabel : `${session.dateLabel} • ${session.time}`}
                    category={session.session_type ? session.session_type.replace('_', ' ') : 'Training Session'}
                    thumbnail={session.thumbnail}
                    videoUrl={session.videoUrl}
                    shots={shotsBySession[session.id]}
                    isVOD
                    onClick={() =>
                      onOpenSession ? onOpenSession(session.id) : console.log(`Open video for training session ${session.id}`)
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedSegment === 'duprCoach' && (
          <div style={{ marginBottom: SPACING.xl }}>
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

