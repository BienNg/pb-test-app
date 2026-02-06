import React from 'react';
import { COLORS, SPACING, TYPOGRAPHY } from '../styles/theme';
import { Calendar } from './Calendar';
import { LessonCard } from './Cards';

const formatDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;

export interface MyProgressPageProps {
  /** Override page title (e.g. "Alex's Progress" when coach views a student) */
  title?: string;
  /** When set, show a back button (e.g. in coach view) */
  onBack?: () => void;
}

export const MyProgressPage: React.FC<MyProgressPageProps> = ({ title, onBack }) => {
  const sessions = [
    {
      id: 1,
      dateKey: '2026-02-02',
      dateLabel: 'Mon, Feb 2, 2026',
      time: '6:00 PM',
      thumbnail: '🎾',
      duration: '28:30',
    },
    {
      id: 2,
      dateKey: '2026-02-01',
      dateLabel: 'Sun, Feb 1, 2026',
      time: '4:30 PM',
      thumbnail: '🏓',
      duration: '24:10',
    },
    {
      id: 3,
      dateKey: '2026-01-30',
      dateLabel: 'Fri, Jan 30, 2026',
      time: '7:15 PM',
      thumbnail: '📍',
      duration: '32:45',
    },
    {
      id: 4,
      dateKey: '2026-01-28',
      dateLabel: 'Wed, Jan 28, 2026',
      time: '5:00 PM',
      thumbnail: '🏆',
      duration: '26:05',
    },
    {
      id: 5,
      dateKey: '2026-01-26',
      dateLabel: 'Mon, Jan 26, 2026',
      time: '6:30 PM',
      thumbnail: '💪',
      duration: '30:20',
    },
    {
      id: 6,
      dateKey: '2026-01-24',
      dateLabel: 'Sat, Jan 24, 2026',
      time: '10:00 AM',
      thumbnail: '🎥',
      duration: '22:15',
    },
    {
      id: 7,
      dateKey: '2026-01-22',
      dateLabel: 'Thu, Jan 22, 2026',
      time: '7:45 PM',
      thumbnail: '🎬',
      duration: '29:40',
    },
    {
      id: 8,
      dateKey: '2026-01-20',
      dateLabel: 'Tue, Jan 20, 2026',
      time: '5:30 PM',
      thumbnail: '📹',
      duration: '25:50',
    },
  ];

  const handleDateSelect = (date: Date) => {
    const key = formatDateKey(date);
    const session = sessions.find((s) => s.dateKey === key);
    if (!session) return;

    const el = document.getElementById(`session-${session.id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div
      style={{
        backgroundColor: COLORS.background,
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
              marginBottom: SPACING.md,
            }}
          >
            {title ?? 'My Progress'}
          </h1>
          <p
            style={{
              ...TYPOGRAPHY.body,
              color: COLORS.textSecondary,
              margin: 0,
            }}
          >
            Track how your pickleball skills are improving over time.
          </p>
        </div>

        {/* Schedule */}
        <div style={{ marginBottom: SPACING.xl }}>
          <h2
            style={{
              ...TYPOGRAPHY.bodySmall,
              fontWeight: 600,
              color: COLORS.textSecondary,
              textTransform: 'uppercase',
              marginBottom: SPACING.md,
            }}
          >
            Schedule
          </h2>
          <Calendar
            onDateSelect={handleDateSelect}
            activeDateKeys={sessions.map((s) => s.dateKey)}
          />
        </div>

        {/* Training Session Videos */}
        <div style={{ marginBottom: SPACING.xl }}>
          <h2
            style={{
              ...TYPOGRAPHY.bodySmall,
              fontWeight: 600,
              color: COLORS.textSecondary,
              textTransform: 'uppercase',
              marginBottom: SPACING.md,
            }}
          >
            Training Session Videos
          </h2>
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
                    console.log(`Open video for training session ${session.id}`)
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

