import React, { useMemo, useState } from 'react';
import { COLORS, SPACING, TYPOGRAPHY } from '../styles/theme';
import { Card } from './BaseComponents';
import { Calendar } from './Calendar';

const formatDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;

// Mock: coach's scheduled sessions (confirmed vs requested). Address shown only for confirmed. durationMinutes for hours stats.
const MOCK_COACH_SESSIONS = [
  { id: 1, dateKey: '2026-02-06', dateLabel: 'Thu, Feb 6', time: '10:00 AM', studentName: 'Alex Chen', type: 'Private', status: 'confirmed' as const, address: '123 Sunset Blvd, San Diego, CA — Court 3', durationMinutes: 60 },
  { id: 2, dateKey: '2026-02-06', dateLabel: 'Thu, Feb 6', time: '11:00 AM', studentName: 'Jamie Lee', type: 'Private', status: 'requested' as const, durationMinutes: 60 },
  { id: 3, dateKey: '2026-02-06', dateLabel: 'Thu, Feb 6', time: '2:00 PM', studentName: 'Morgan Taylor', type: 'Group', status: 'confirmed' as const, address: '456 Ocean Dr, San Diego, CA — Court 1', durationMinutes: 90 },
  { id: 4, dateKey: '2026-02-07', dateLabel: 'Fri, Feb 7', time: '9:00 AM', studentName: 'Alex Chen', type: 'Private', status: 'confirmed' as const, address: '123 Sunset Blvd, San Diego, CA — Court 3', durationMinutes: 60 },
  { id: 5, dateKey: '2026-02-07', dateLabel: 'Fri, Feb 7', time: '3:00 PM', studentName: 'Riley Smith', type: 'Private', status: 'requested' as const, durationMinutes: 45 },
  { id: 6, dateKey: '2026-02-08', dateLabel: 'Sat, Feb 8', time: '10:00 AM', studentName: 'Jamie Lee', type: 'Group', status: 'requested' as const, durationMinutes: 90 },
  { id: 7, dateKey: '2026-02-08', dateLabel: 'Sat, Feb 8', time: '2:00 PM', studentName: 'Morgan Taylor', type: 'Private', status: 'confirmed' as const, address: '789 Park Ave, San Diego, CA — Court 2', durationMinutes: 60 },
  { id: 8, dateKey: '2026-02-09', dateLabel: 'Sun, Feb 9', time: '11:00 AM', studentName: 'Alex Chen', type: 'Private', status: 'confirmed' as const, address: '123 Sunset Blvd, San Diego, CA — Court 3', durationMinutes: 60 },
];

// Past sessions for "total" stats (all time)
const MOCK_PAST_SESSIONS = [
  { dateKey: '2026-01-15', studentName: 'Alex Chen', durationMinutes: 60 },
  { dateKey: '2026-01-18', studentName: 'Jamie Lee', durationMinutes: 60 },
  { dateKey: '2026-01-20', studentName: 'Morgan Taylor', durationMinutes: 90 },
  { dateKey: '2026-01-22', studentName: 'Alex Chen', durationMinutes: 60 },
  { dateKey: '2026-01-25', studentName: 'Riley Smith', durationMinutes: 45 },
  { dateKey: '2025-12-10', studentName: 'Jordan Kim', durationMinutes: 60 },
  { dateKey: '2025-12-14', studentName: 'Alex Chen', durationMinutes: 60 },
];

const ALL_SESSIONS = [
  ...MOCK_COACH_SESSIONS.map((s) => ({ dateKey: s.dateKey, studentName: s.studentName, durationMinutes: s.durationMinutes })),
  ...MOCK_PAST_SESSIONS,
];

const sessionDateKeys = [...new Set(MOCK_COACH_SESSIONS.map((s) => s.dateKey))];

function buildDayDots(
  sessions: Array<{ dateKey: string; status: 'confirmed' | 'requested' }>
): Record<string, { confirmed: number; requested: number }> {
  const out: Record<string, { confirmed: number; requested: number }> = {};
  for (const s of sessions) {
    if (!out[s.dateKey]) out[s.dateKey] = { confirmed: 0, requested: 0 };
    if (s.status === 'confirmed') out[s.dateKey].confirmed += 1;
    else out[s.dateKey].requested += 1;
  }
  return out;
}

const dayDots = buildDayDots(MOCK_COACH_SESSIONS);

export const CoachSchedulePage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date(2026, 1, 6));

  const selectedKey = useMemo(
    () => formatDateKey(selectedDate),
    [selectedDate]
  );

  const sessionsForDay = useMemo(
    () => MOCK_COACH_SESSIONS.filter((s) => s.dateKey === selectedKey).sort(
      (a, b) => a.time.localeCompare(b.time)
    ),
    [selectedKey]
  );

  // Calendar month for "this month" stats (match calendar view: Feb 2026)
  const calendarMonthKey = useMemo(() => {
    const d = selectedDate;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, [selectedDate]);

  const stats = useMemo(() => {
    const thisMonthSessions = ALL_SESSIONS.filter((s) => s.dateKey.startsWith(calendarMonthKey));
    const thisMonthMinutes = thisMonthSessions.reduce((sum, s) => sum + s.durationMinutes, 0);
    const thisMonthStudents = new Set(thisMonthSessions.map((s) => s.studentName)).size;
    const totalMinutes = ALL_SESSIONS.reduce((sum, s) => sum + s.durationMinutes, 0);
    const totalStudents = new Set(ALL_SESSIONS.map((s) => s.studentName)).size;
    return {
      sessionsThisMonth: thisMonthSessions.length,
      hoursThisMonth: Math.round((thisMonthMinutes / 60) * 10) / 10,
      studentsThisMonth: thisMonthStudents,
      totalSessions: ALL_SESSIONS.length,
      totalHours: Math.round((totalMinutes / 60) * 10) / 10,
      totalStudents,
    };
  }, [calendarMonthKey]);

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  return (
    <div
      style={{
        backgroundColor: COLORS.background,
        minHeight: '100vh',
        padding: SPACING.md,
        width: '100%',
        boxSizing: 'border-box',
        overflowX: 'hidden',
      }}
    >
      <div style={{ maxWidth: 1400, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ marginBottom: SPACING.xl }}>
          <h1 style={{ ...TYPOGRAPHY.h1, color: COLORS.textPrimary, margin: 0, marginBottom: SPACING.sm }}>
            My Schedule
          </h1>
          <p style={{ ...TYPOGRAPHY.body, color: COLORS.textSecondary, margin: 0 }}>
            Your upcoming lessons and sessions.
          </p>
        </div>

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
            Calendar
          </h2>
          <Calendar
            onDateSelect={handleDateSelect}
            activeDateKeys={sessionDateKeys}
            dayDots={dayDots}
          />
        </div>

        <div>
          <h2
            style={{
              ...TYPOGRAPHY.bodySmall,
              fontWeight: 600,
              color: COLORS.textSecondary,
              textTransform: 'uppercase',
              marginBottom: SPACING.md,
            }}
          >
            {sessionsForDay.length > 0
              ? `Sessions on ${sessionsForDay[0].dateLabel}`
              : 'No sessions on this day'}
          </h2>
          {sessionsForDay.length === 0 ? (
            <Card padding={SPACING.xl}>
              <p style={{ ...TYPOGRAPHY.body, color: COLORS.textSecondary, margin: 0, textAlign: 'center' }}>
                No sessions scheduled for this date.
              </p>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.md }}>
              {sessionsForDay.map((session) => (
                <Card key={session.id} padding={SPACING.lg}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: SPACING.sm,
                    }}
                  >
                    <div>
                      <p style={{ ...TYPOGRAPHY.h3, color: COLORS.textPrimary, margin: 0, marginBottom: SPACING.xs }}>
                        {session.studentName}
                      </p>
                      <p style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, margin: 0 }}>
                        {session.time} · {session.type}
                        {session.status === 'requested' && (
                          <span style={{ color: COLORS.textMuted, marginLeft: 4 }}>· Requested</span>
                        )}
                      </p>
                      {session.status === 'confirmed' && session.address && (
                        <p
                          style={{
                            ...TYPOGRAPHY.bodySmall,
                            color: COLORS.textSecondary,
                            margin: 0,
                            marginTop: SPACING.sm,
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: SPACING.xs,
                          }}
                        >
                          <span>📍</span>
                          <span>{session.address}</span>
                        </p>
                      )}
                    </div>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        backgroundColor: COLORS.lavender,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 20,
                      }}
                    >
                      📅
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Stats */}
        <div style={{ marginTop: SPACING.xxl, paddingBottom: SPACING.xxl }}>
          <h2
            style={{
              ...TYPOGRAPHY.bodySmall,
              fontWeight: 600,
              color: COLORS.textSecondary,
              textTransform: 'uppercase',
              marginBottom: SPACING.md,
            }}
          >
            Stats
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: SPACING.md,
            }}
          >
            <Card padding={SPACING.lg}>
              <p style={{ ...TYPOGRAPHY.label, color: COLORS.textSecondary, margin: 0, marginBottom: SPACING.xs }}>
                Sessions this month
              </p>
              <p style={{ ...TYPOGRAPHY.h2, color: COLORS.textPrimary, margin: 0 }}>{stats.sessionsThisMonth}</p>
            </Card>
            <Card padding={SPACING.lg}>
              <p style={{ ...TYPOGRAPHY.label, color: COLORS.textSecondary, margin: 0, marginBottom: SPACING.xs }}>
                Hours this month
              </p>
              <p style={{ ...TYPOGRAPHY.h2, color: COLORS.textPrimary, margin: 0 }}>{stats.hoursThisMonth} hrs</p>
            </Card>
            <Card padding={SPACING.lg}>
              <p style={{ ...TYPOGRAPHY.label, color: COLORS.textSecondary, margin: 0, marginBottom: SPACING.xs }}>
                Students this month
              </p>
              <p style={{ ...TYPOGRAPHY.h2, color: COLORS.textPrimary, margin: 0 }}>{stats.studentsThisMonth}</p>
            </Card>
            <Card padding={SPACING.lg}>
              <p style={{ ...TYPOGRAPHY.label, color: COLORS.textSecondary, margin: 0, marginBottom: SPACING.xs }}>
                Total sessions
              </p>
              <p style={{ ...TYPOGRAPHY.h2, color: COLORS.textPrimary, margin: 0 }}>{stats.totalSessions}</p>
            </Card>
            <Card padding={SPACING.lg}>
              <p style={{ ...TYPOGRAPHY.label, color: COLORS.textSecondary, margin: 0, marginBottom: SPACING.xs }}>
                Total hours
              </p>
              <p style={{ ...TYPOGRAPHY.h2, color: COLORS.textPrimary, margin: 0 }}>{stats.totalHours} hrs</p>
            </Card>
            <Card padding={SPACING.lg}>
              <p style={{ ...TYPOGRAPHY.label, color: COLORS.textSecondary, margin: 0, marginBottom: SPACING.xs }}>
                Total students
              </p>
              <p style={{ ...TYPOGRAPHY.h2, color: COLORS.textPrimary, margin: 0 }}>{stats.totalStudents}</p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
