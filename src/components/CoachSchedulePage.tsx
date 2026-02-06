import React, { useMemo, useState } from 'react';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../styles/theme';
import { Card } from './BaseComponents';
import { Calendar } from './Calendar';

const formatDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;

const formatDateLabel = (dateKey: string) => {
  const d = new Date(dateKey + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

type Session = {
  id: number;
  dateKey: string;
  dateLabel: string;
  time: string;
  studentName: string;
  type: 'Private' | 'Group';
  status: 'confirmed' | 'requested';
  address?: string;
  durationMinutes: number;
};

// Mock: coach's scheduled sessions (confirmed vs requested). Address shown only for confirmed. durationMinutes for hours stats.
const MOCK_COACH_SESSIONS: Session[] = [
  { id: 1, dateKey: '2026-02-06', dateLabel: 'Thu, Feb 6', time: '10:00 AM', studentName: 'Alex Chen', type: 'Private', status: 'confirmed', address: '123 Sunset Blvd, San Diego, CA — Court 3', durationMinutes: 60 },
  { id: 2, dateKey: '2026-02-06', dateLabel: 'Thu, Feb 6', time: '11:00 AM', studentName: 'Jamie Lee', type: 'Private', status: 'requested', durationMinutes: 60 },
  { id: 3, dateKey: '2026-02-06', dateLabel: 'Thu, Feb 6', time: '2:00 PM', studentName: 'Morgan Taylor', type: 'Group', status: 'confirmed', address: '456 Ocean Dr, San Diego, CA — Court 1', durationMinutes: 90 },
  { id: 4, dateKey: '2026-02-07', dateLabel: 'Fri, Feb 7', time: '9:00 AM', studentName: 'Alex Chen', type: 'Private', status: 'confirmed', address: '123 Sunset Blvd, San Diego, CA — Court 3', durationMinutes: 60 },
  { id: 5, dateKey: '2026-02-07', dateLabel: 'Fri, Feb 7', time: '3:00 PM', studentName: 'Riley Smith', type: 'Private', status: 'requested', durationMinutes: 45 },
  { id: 6, dateKey: '2026-02-08', dateLabel: 'Sat, Feb 8', time: '10:00 AM', studentName: 'Jamie Lee', type: 'Group', status: 'requested', durationMinutes: 90 },
  { id: 7, dateKey: '2026-02-08', dateLabel: 'Sat, Feb 8', time: '2:00 PM', studentName: 'Morgan Taylor', type: 'Private', status: 'confirmed', address: '789 Park Ave, San Diego, CA — Court 2', durationMinutes: 60 },
  { id: 8, dateKey: '2026-02-09', dateLabel: 'Sun, Feb 9', time: '11:00 AM', studentName: 'Alex Chen', type: 'Private', status: 'confirmed', address: '123 Sunset Blvd, San Diego, CA — Court 3', durationMinutes: 60 },
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

function buildDayDots(
  sessionList: Array<{ dateKey: string; status: 'confirmed' | 'requested' }>
): Record<string, { confirmed: number; requested: number }> {
  const out: Record<string, { confirmed: number; requested: number }> = {};
  for (const s of sessionList) {
    if (!out[s.dateKey]) out[s.dateKey] = { confirmed: 0, requested: 0 };
    if (s.status === 'confirmed') out[s.dateKey].confirmed += 1;
    else out[s.dateKey].requested += 1;
  }
  return out;
}

export const CoachSchedulePage: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>(MOCK_COACH_SESSIONS);
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date(2026, 1, 6));
  const [editingSession, setEditingSession] = useState<Session | null>(null);

  const selectedKey = useMemo(
    () => formatDateKey(selectedDate),
    [selectedDate]
  );

  const sessionDateKeys = useMemo(() => [...new Set(sessions.map((s) => s.dateKey))], [sessions]);
  const dayDots = useMemo(() => buildDayDots(sessions), [sessions]);

  const sessionsForDay = useMemo(
    () => sessions.filter((s) => s.dateKey === selectedKey).sort(
      (a, b) => a.time.localeCompare(b.time)
    ),
    [sessions, selectedKey]
  );

  const allSessionsForStats = useMemo(
    () => [
      ...sessions.map((s) => ({ dateKey: s.dateKey, studentName: s.studentName, durationMinutes: s.durationMinutes })),
      ...MOCK_PAST_SESSIONS,
    ],
    [sessions]
  );

  // Calendar month for "this month" stats (match calendar view: Feb 2026)
  const calendarMonthKey = useMemo(() => {
    const d = selectedDate;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, [selectedDate]);

  const stats = useMemo(() => {
    const thisMonthSessions = allSessionsForStats.filter((s) => s.dateKey.startsWith(calendarMonthKey));
    const thisMonthMinutes = thisMonthSessions.reduce((sum, s) => sum + s.durationMinutes, 0);
    const thisMonthStudents = new Set(thisMonthSessions.map((s) => s.studentName)).size;
    const totalMinutes = allSessionsForStats.reduce((sum, s) => sum + s.durationMinutes, 0);
    const totalStudents = new Set(allSessionsForStats.map((s) => s.studentName)).size;
    return {
      sessionsThisMonth: thisMonthSessions.length,
      hoursThisMonth: Math.round((thisMonthMinutes / 60) * 10) / 10,
      studentsThisMonth: thisMonthStudents,
      totalSessions: allSessionsForStats.length,
      totalHours: Math.round((totalMinutes / 60) * 10) / 10,
      totalStudents,
    };
  }, [calendarMonthKey, allSessionsForStats]);

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const handleConfirmSession = () => {
    const address = editingSession?.address?.trim();
    if (!editingSession || !address) return;
    setSessions((prev) =>
      prev.map((s) =>
        s.id === editingSession.id
          ? {
              ...editingSession,
              dateLabel: formatDateLabel(editingSession.dateKey),
              status: 'confirmed' as const,
              address,
            }
          : s
      )
    );
    setEditingSession(null);
  };

  const handleRejectRequest = () => {
    if (!editingSession) return;
    setSessions((prev) => prev.filter((s) => s.id !== editingSession.id));
    setEditingSession(null);
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
                      {(session.address != null && session.address !== '') && (
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm }}>
                      {session.status === 'requested' && (
                        <button
                          type="button"
                          onClick={() => setEditingSession({ ...session })}
                          style={{
                            padding: `${SPACING.sm}px ${SPACING.md}px`,
                            borderRadius: RADIUS.sm,
                            border: 'none',
                            backgroundColor: COLORS.lavender,
                            color: COLORS.textPrimary,
                            ...TYPOGRAPHY.bodySmall,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Confirm session
                        </button>
                      )}
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

        {/* Confirm / reject requested session modal */}
        {editingSession && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: SPACING.lg,
              boxSizing: 'border-box',
            }}
            onClick={() => setEditingSession(null)}
          >
            <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400, width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
            <Card padding={SPACING.xl} style={{ width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
              <h3 style={{ ...TYPOGRAPHY.h3, color: COLORS.textPrimary, margin: 0, marginBottom: SPACING.sm }}>
                Session request
              </h3>
              <p style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, margin: 0, marginBottom: SPACING.lg }}>
                Edit details and add a court/address to confirm, or reject the request.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.md }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: SPACING.xs }}>
                  <span style={{ ...TYPOGRAPHY.label, color: COLORS.textSecondary }}>Student</span>
                  <input
                    type="text"
                    value={editingSession.studentName}
                    onChange={(e) => setEditingSession((prev) => (prev ? { ...prev, studentName: e.target.value } : null))}
                    style={{
                      padding: SPACING.sm,
                      borderRadius: RADIUS.sm,
                      border: `1px solid ${COLORS.textMuted}`,
                      ...TYPOGRAPHY.body,
                    }}
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: SPACING.xs }}>
                  <span style={{ ...TYPOGRAPHY.label, color: COLORS.textSecondary }}>
                    Address / Court <span style={{ color: COLORS.coral }}>*</span>
                  </span>
                  <input
                    type="text"
                    value={editingSession.address ?? ''}
                    onChange={(e) => setEditingSession((prev) => (prev ? { ...prev, address: e.target.value || undefined } : null))}
                    placeholder="e.g. 123 Sunset Blvd, San Diego, CA — Court 3"
                    style={{
                      padding: SPACING.sm,
                      borderRadius: RADIUS.sm,
                      border: `1px solid ${COLORS.textMuted}`,
                      ...TYPOGRAPHY.body,
                    }}
                  />
                  {(!editingSession.address || !editingSession.address.trim()) && (
                    <span style={{ ...TYPOGRAPHY.label, color: COLORS.textMuted }}>
                      Required to confirm the session
                    </span>
                  )}
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: SPACING.xs }}>
                  <span style={{ ...TYPOGRAPHY.label, color: COLORS.textSecondary }}>Date</span>
                  <input
                    type="date"
                    value={editingSession.dateKey}
                    onChange={(e) => setEditingSession((prev) => (prev ? { ...prev, dateKey: e.target.value, dateLabel: formatDateLabel(e.target.value) } : null))}
                    style={{
                      padding: SPACING.sm,
                      borderRadius: RADIUS.sm,
                      border: `1px solid ${COLORS.textMuted}`,
                      ...TYPOGRAPHY.body,
                    }}
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: SPACING.xs }}>
                  <span style={{ ...TYPOGRAPHY.label, color: COLORS.textSecondary }}>Time</span>
                  <input
                    type="text"
                    value={editingSession.time}
                    onChange={(e) => setEditingSession((prev) => (prev ? { ...prev, time: e.target.value } : null))}
                    placeholder="e.g. 11:00 AM"
                    style={{
                      padding: SPACING.sm,
                      borderRadius: RADIUS.sm,
                      border: `1px solid ${COLORS.textMuted}`,
                      ...TYPOGRAPHY.body,
                    }}
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: SPACING.xs }}>
                  <span style={{ ...TYPOGRAPHY.label, color: COLORS.textSecondary }}>Type</span>
                  <select
                    value={editingSession.type}
                    onChange={(e) => setEditingSession((prev) => (prev ? { ...prev, type: e.target.value as 'Private' | 'Group' } : null))}
                    style={{
                      padding: SPACING.sm,
                      borderRadius: RADIUS.sm,
                      border: `1px solid ${COLORS.textMuted}`,
                      ...TYPOGRAPHY.body,
                    }}
                  >
                    <option value="Private">Private</option>
                    <option value="Group">Group</option>
                  </select>
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: SPACING.xs }}>
                  <span style={{ ...TYPOGRAPHY.label, color: COLORS.textSecondary }}>Duration (minutes)</span>
                  <input
                    type="number"
                    min={15}
                    step={15}
                    value={editingSession.durationMinutes}
                    onChange={(e) => setEditingSession((prev) => (prev ? { ...prev, durationMinutes: Number(e.target.value) || 60 } : null))}
                    style={{
                      padding: SPACING.sm,
                      borderRadius: RADIUS.sm,
                      border: `1px solid ${COLORS.textMuted}`,
                      ...TYPOGRAPHY.body,
                    }}
                  />
                </label>
              </div>
              <div style={{ display: 'flex', gap: SPACING.md, marginTop: SPACING.xl, justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleRejectRequest}
                  style={{
                    padding: `${SPACING.sm}px ${SPACING.lg}px`,
                    borderRadius: RADIUS.sm,
                    border: `1px solid ${COLORS.coral}`,
                    backgroundColor: 'transparent',
                    color: COLORS.coral,
                    ...TYPOGRAPHY.bodySmall,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSession}
                  disabled={!editingSession.address?.trim()}
                  style={{
                    padding: `${SPACING.sm}px ${SPACING.lg}px`,
                    borderRadius: RADIUS.sm,
                    border: 'none',
                    backgroundColor: (editingSession.address?.trim() ? COLORS.green : COLORS.textMuted) as string,
                    color: COLORS.textPrimary,
                    ...TYPOGRAPHY.bodySmall,
                    fontWeight: 600,
                    cursor: editingSession.address?.trim() ? 'pointer' : 'not-allowed',
                    opacity: editingSession.address?.trim() ? 1 : 0.7,
                  }}
                >
                  Confirm session
                </button>
              </div>
            </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
