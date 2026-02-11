import React, { useState } from 'react';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../styles/theme';
import { LessonCard } from './Cards';
import { Card } from './BaseComponents';

export interface MyProgressPageProps {
  /** Override page title (e.g. "Alex's Progress" when coach views a student) */
  title?: string;
  /** When set, show a back button (e.g. in coach view) */
  onBack?: () => void;
  /** When set, open a full-screen training session view instead of inline modal */
  onOpenSession?: (sessionId: number) => void;
}

export interface TrainingSession {
  id: number;
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
  id: number;
  author: string;
  role: 'Coach' | 'You';
  createdAt: string;
  text: string;
  /** Timestamp in seconds - clicking jumps video to this point (Frame.io style) */
  timestampSeconds?: number;
}

export const TRAINING_SESSIONS: TrainingSession[] = [
  {
    id: 1,
    dateKey: '2026-02-02',
    dateLabel: 'Mon, Feb 2, 2026',
    time: '6:00 PM',
    thumbnail: '🎾',
    duration: '28:30',
    title: 'Match Play + Net Game',
    focus: 'Transition game and third-shot drops.',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  },
  {
    id: 2,
    dateKey: '2026-02-01',
    dateLabel: 'Sun, Feb 1, 2026',
    time: '4:30 PM',
    thumbnail: '🏓',
    duration: '24:10',
    title: 'Serve & Return Focus',
    focus: 'Depth on returns and targeting open space.',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  },
  {
    id: 3,
    dateKey: '2026-01-30',
    dateLabel: 'Fri, Jan 30, 2026',
    time: '7:15 PM',
    thumbnail: '📍',
    duration: '32:45',
    title: 'Defensive Scramble Drills',
    focus: 'Resetting from off-balance positions.',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  },
  {
    id: 4,
    dateKey: '2026-01-28',
    dateLabel: 'Wed, Jan 28, 2026',
    time: '5:00 PM',
    thumbnail: '🏆',
    duration: '26:05',
    title: 'Dinking & Soft Game',
    focus: 'Consistency and patience at the kitchen.',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  },
  {
    id: 5,
    dateKey: '2026-01-26',
    dateLabel: 'Mon, Jan 26, 2026',
    time: '6:30 PM',
    thumbnail: '💪',
    duration: '30:20',
    title: 'Power vs. Control',
    focus: 'Blending pace with precise placement.',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  },
  {
    id: 6,
    dateKey: '2026-01-24',
    dateLabel: 'Sat, Jan 24, 2026',
    time: '10:00 AM',
    thumbnail: '🎥',
    duration: '22:15',
    title: 'Footwork Foundations',
    focus: 'Split step timing and recovery steps.',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  },
  {
    id: 7,
    dateKey: '2026-01-22',
    dateLabel: 'Thu, Jan 22, 2026',
    time: '7:45 PM',
    thumbnail: '🎬',
    duration: '29:40',
    title: 'Transition Zone Tactics',
    focus: 'Moving safely from baseline to kitchen.',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  },
  {
    id: 8,
    dateKey: '2026-01-20',
    dateLabel: 'Tue, Jan 20, 2026',
    time: '5:30 PM',
    thumbnail: '📹',
    duration: '25:50',
    title: 'Shot Selection Review',
    focus: 'Choosing the highest-percentage option.',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  },
];

export const MyProgressPage: React.FC<MyProgressPageProps> = ({ title, onBack, onOpenSession }) => {
  const sessions = TRAINING_SESSIONS;
  const [selectedSegment, setSelectedSegment] = useState<'videos' | 'duprCoach'>('videos');

  return (
    <div
      style={{
        backgroundColor: 'transparent',
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
          <h1
            style={{
              ...TYPOGRAPHY.h1,
              color: COLORS.textPrimary,
              margin: 0,
              marginBottom: SPACING.xl,
            }}
          >
            {title ?? 'My Progress'}
          </h1>

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
                    title={`${session.dateLabel} • ${session.time}`}
                    category="Training Session"
                    duration={session.duration}
                    thumbnail={session.thumbnail}
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

