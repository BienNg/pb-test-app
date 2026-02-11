import React, { type ReactNode, useState, useEffect } from 'react';
import { globalStyles } from '../styles/globals';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, RADIUS, BREAKPOINTS } from '../styles/theme';
import { Card, StatCard } from './BaseComponents';
import type { StudentInfo } from './CoachStudentsPage';

type AdminTabId = 'overview' | 'students' | 'coaches' | 'requests';

const DESKTOP_MIN = BREAKPOINTS.desktop; // 1024px
const formatDateLabel = (dateKey: string) => {
  const d = new Date(dateKey + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};
const SIDEBAR_WIDTH = 220;

function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= DESKTOP_MIN);
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${DESKTOP_MIN}px)`);
    const handler = () => setIsDesktop(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isDesktop;
}

export interface CoachInfo {
  id: string;
  name: string;
  email: string;
  studentCount: number;
  sessionCount: number;
  lastActive?: string;
}

// Platform-wide mock data (admin sees all)
const MOCK_ALL_STUDENTS: StudentInfo[] = [
  { id: '1', name: 'Alex Chen', email: 'alex@example.com', lessonsCompleted: 12, lastActive: 'Feb 5, 2026' },
  { id: '2', name: 'Jamie Lee', email: 'jamie@example.com', lessonsCompleted: 8, lastActive: 'Feb 4, 2026' },
  { id: '3', name: 'Morgan Taylor', email: 'morgan@example.com', lessonsCompleted: 15, lastActive: 'Feb 6, 2026' },
  { id: '4', name: 'Riley Smith', email: 'riley@example.com', lessonsCompleted: 5, lastActive: 'Feb 2, 2026' },
  { id: '5', name: 'Jordan Kim', email: 'jordan@example.com', lessonsCompleted: 3, lastActive: 'Jan 28, 2026' },
  { id: '6', name: 'Sam Davis', email: 'sam@example.com', lessonsCompleted: 7, lastActive: 'Feb 1, 2026' },
  { id: '7', name: 'Casey Brown', email: 'casey@example.com', lessonsCompleted: 11, lastActive: 'Feb 3, 2026' },
];

const MOCK_COACHES: CoachInfo[] = [
  { id: 'c1', name: 'Sarah Martinez', email: 'sarah@pbacademy.com', studentCount: 5, sessionCount: 15, lastActive: 'Feb 6, 2026' },
  { id: 'c2', name: 'Mike Johnson', email: 'mike@pbacademy.com', studentCount: 3, sessionCount: 8, lastActive: 'Feb 5, 2026' },
  { id: 'c3', name: 'Emma Wilson', email: 'emma@pbacademy.com', studentCount: 4, sessionCount: 12, lastActive: 'Feb 4, 2026' },
];

export interface RequestedSession {
  id: string;
  dateKey: string;
  dateLabel: string;
  time: string;
  studentName: string;
  studentEmail?: string;
  coachId: string;
  coachName: string;
  type: 'Private' | 'Group';
  durationMinutes: number;
  address?: string;
  requestedAt?: string;
}

// Platform-wide requested sessions (students requested, awaiting admin/coach confirm)
const MOCK_REQUESTED_SESSIONS_INITIAL: RequestedSession[] = [
  { id: 'req-1', dateKey: '2026-02-06', dateLabel: 'Thu, Feb 6', time: '11:00 AM', studentName: 'Jamie Lee', studentEmail: 'jamie@example.com', coachId: 'c1', coachName: 'Sarah Martinez', type: 'Private', durationMinutes: 60, requestedAt: 'Feb 4, 2026' },
  { id: 'req-2', dateKey: '2026-02-07', dateLabel: 'Fri, Feb 7', time: '3:00 PM', studentName: 'Riley Smith', studentEmail: 'riley@example.com', coachId: 'c1', coachName: 'Sarah Martinez', type: 'Private', durationMinutes: 45, requestedAt: 'Feb 3, 2026' },
  { id: 'req-3', dateKey: '2026-02-08', dateLabel: 'Sat, Feb 8', time: '10:00 AM', studentName: 'Jamie Lee', studentEmail: 'jamie@example.com', coachId: 'c1', coachName: 'Sarah Martinez', type: 'Group', durationMinutes: 90, requestedAt: 'Feb 5, 2026' },
  { id: 'req-4', dateKey: '2026-02-10', dateLabel: 'Mon, Feb 10', time: '2:00 PM', studentName: 'Jordan Kim', studentEmail: 'jordan@example.com', coachId: 'c2', coachName: 'Mike Johnson', type: 'Private', durationMinutes: 60, requestedAt: 'Feb 5, 2026' },
  // More sessions today (Feb 8) for the overview list
  { id: 'req-5', dateKey: '2026-02-08', dateLabel: 'Sat, Feb 8', time: '12:00 PM', studentName: 'Alex Chen', studentEmail: 'alex@example.com', coachId: 'c2', coachName: 'Mike Johnson', type: 'Private', durationMinutes: 60, requestedAt: 'Feb 6, 2026' },
  { id: 'req-6', dateKey: '2026-02-08', dateLabel: 'Sat, Feb 8', time: '2:00 PM', studentName: 'Morgan Taylor', studentEmail: 'morgan@example.com', coachId: 'c1', coachName: 'Sarah Martinez', type: 'Private', durationMinutes: 45, requestedAt: 'Feb 6, 2026' },
  { id: 'req-7', dateKey: '2026-02-08', dateLabel: 'Sat, Feb 8', time: '3:30 PM', studentName: 'Riley Smith', studentEmail: 'riley@example.com', coachId: 'c3', coachName: 'Emma Wilson', type: 'Group', durationMinutes: 90, requestedAt: 'Feb 5, 2026' },
  { id: 'req-8', dateKey: '2026-02-08', dateLabel: 'Sat, Feb 8', time: '5:00 PM', studentName: 'Casey Brown', studentEmail: 'casey@example.com', coachId: 'c2', coachName: 'Mike Johnson', type: 'Private', durationMinutes: 60, requestedAt: 'Feb 7, 2026' },
  { id: 'req-9', dateKey: '2026-02-08', dateLabel: 'Sat, Feb 8', time: '6:30 PM', studentName: 'Sam Davis', studentEmail: 'sam@example.com', coachId: 'c1', coachName: 'Sarah Martinez', type: 'Private', durationMinutes: 45, requestedAt: 'Feb 7, 2026' },
];

// Aggregate stats for overview
const OVERVIEW_STATS = {
  totalStudents: MOCK_ALL_STUDENTS.length,
  totalCoaches: MOCK_COACHES.length,
  totalSessions: 35,
  totalLessons: 8,
  totalLessonCompletions: MOCK_ALL_STUDENTS.reduce((sum, s) => sum + (s.lessonsCompleted ?? 0), 0),
};

const COACHES_STATS = (() => {
  const totalCoaches = MOCK_COACHES.length;
  const totalCoachStudents = MOCK_COACHES.reduce((sum, c) => sum + c.studentCount, 0);
  const totalCoachSessions = MOCK_COACHES.reduce((sum, c) => sum + c.sessionCount, 0);

  const avgStudentsPerCoach =
    totalCoaches > 0 ? Number((totalCoachStudents / totalCoaches).toFixed(1)) : 0;
  const avgSessionsPerCoach =
    totalCoaches > 0 ? Number((totalCoachSessions / totalCoaches).toFixed(1)) : 0;

  const currentMonthKey = new Date().toISOString().slice(0, 7); // e.g. "2026-02"
  const sessionsThisMonth = MOCK_REQUESTED_SESSIONS_INITIAL.filter((req) =>
    req.dateKey.startsWith(currentMonthKey),
  );
  const totalSessionsThisMonth = sessionsThisMonth.length;
  const totalHoursThisMonth = Number(
    (sessionsThisMonth.reduce((sum, req) => sum + req.durationMinutes, 0) / 60).toFixed(1),
  );

  return {
    totalCoaches,
    totalCoachStudents,
    totalCoachSessions,
    avgStudentsPerCoach,
    avgSessionsPerCoach,
    totalSessionsThisMonth,
    totalHoursThisMonth,
  };
})();

function todayDateKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseTimeToMinutes(timeStr: string): number {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return 0;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (match[3].toUpperCase() === 'PM' && h !== 12) h += 12;
  if (match[3].toUpperCase() === 'AM' && h === 12) h = 0;
  return h * 60 + m;
}

function AdminOverviewPage({
  isDesktop,
  sessionsToday,
  onViewAllRequests,
}: {
  isDesktop: boolean;
  sessionsToday: RequestedSession[];
  onViewAllRequests: () => void;
}) {
  const todayKey = todayDateKey();
  const nextToday = sessionsToday
    .filter((s) => s.dateKey === todayKey)
    .sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));

  return (
    <div
      style={{
        backgroundColor: 'transparent',
        minHeight: '100vh',
        padding: isDesktop ? SPACING.xl : SPACING.md,
        width: '100%',
        boxSizing: 'border-box',
        overflowX: 'hidden',
      }}
    >
      <div style={{ maxWidth: 1400, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ marginBottom: SPACING.xl }}>
          <h1 style={{ ...TYPOGRAPHY.h1, color: COLORS.textPrimary, margin: 0, marginBottom: SPACING.sm }}>
            Admin Overview
          </h1>
          <p style={{ ...TYPOGRAPHY.body, color: COLORS.textSecondary, margin: 0 }}>
            Platform-wide stats and management.
          </p>
        </div>

        <div
          style={{
            marginBottom: SPACING.xl,
            background: `linear-gradient(145deg, ${COLORS.textPrimary} 0%, #2C2C2E 100%)`,
            borderRadius: RADIUS.lg,
            padding: SPACING.xl,
            color: COLORS.white,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p
              style={{
                ...TYPOGRAPHY.label,
                color: COLORS.primary,
                margin: 0,
                marginBottom: SPACING.md,
                fontWeight: 600,
              }}
            >
              Platform stats
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: SPACING.xl,
              }}
            >
              <div>
                <span style={{ ...TYPOGRAPHY.bodySmall, color: 'rgba(255,255,255,0.7)' }}>Students</span>
                <div style={{ ...TYPOGRAPHY.h2, color: COLORS.white, margin: 0 }}>{OVERVIEW_STATS.totalStudents}</div>
              </div>
              <div>
                <span style={{ ...TYPOGRAPHY.bodySmall, color: 'rgba(255,255,255,0.7)' }}>Coaches</span>
                <div style={{ ...TYPOGRAPHY.h2, color: COLORS.white, margin: 0 }}>{OVERVIEW_STATS.totalCoaches}</div>
              </div>
              <div>
                <span style={{ ...TYPOGRAPHY.bodySmall, color: 'rgba(255,255,255,0.7)' }}>Sessions</span>
                <div style={{ ...TYPOGRAPHY.h2, color: COLORS.white, margin: 0 }}>{OVERVIEW_STATS.totalSessions}</div>
              </div>
              <div>
                <span style={{ ...TYPOGRAPHY.bodySmall, color: 'rgba(255,255,255,0.7)' }}>VOD lessons</span>
                <div style={{ ...TYPOGRAPHY.h2, color: COLORS.white, margin: 0 }}>{OVERVIEW_STATS.totalLessons}</div>
              </div>
              <div>
                <span style={{ ...TYPOGRAPHY.bodySmall, color: 'rgba(255,255,255,0.7)' }}>Completions</span>
                <div style={{ ...TYPOGRAPHY.h2, color: COLORS.white, margin: 0 }}>{OVERVIEW_STATS.totalLessonCompletions}</div>
              </div>
            </div>
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: -30,
              right: -30,
              width: 120,
              height: 120,
              borderRadius: '50%',
              background: 'rgba(155, 225, 93, 0.12)',
              pointerEvents: 'none',
            }}
          />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: SPACING.lg,
          }}
        >
          <StatCard
            title="Students"
            value={OVERVIEW_STATS.totalStudents}
            unit="total"
            icon="👥"
            accentColor={COLORS.lavender}
          />
          <StatCard
            title="Coaches"
            value={OVERVIEW_STATS.totalCoaches}
            unit="active"
            icon="🎾"
            accentColor={COLORS.primary}
          />
          <StatCard
            title="Sessions"
            value={OVERVIEW_STATS.totalSessions}
            unit="all time"
            icon="📅"
            accentColor={COLORS.blue}
          />
          <StatCard
            title="Lesson completions"
            value={OVERVIEW_STATS.totalLessonCompletions}
            unit="VOD"
            icon="✓"
            accentColor={COLORS.green}
          />
        </div>

        <div style={{ marginTop: SPACING.xl }}>
          <Card padding={SPACING.lg}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: SPACING.md, marginBottom: SPACING.lg }}>
              <h3 style={{ ...TYPOGRAPHY.h3, color: COLORS.textPrimary, margin: 0 }}>
                Next sessions today
              </h3>
              <button
                type="button"
                onClick={onViewAllRequests}
                style={{
                  ...TYPOGRAPHY.bodySmall,
                  fontWeight: 600,
                  color: COLORS.textPrimary,
                  background: COLORS.iconBg,
                  border: `1px solid ${COLORS.textMuted}`,
                  padding: `${SPACING.sm} ${SPACING.lg}`,
                  cursor: 'pointer',
                  borderRadius: RADIUS.md,
                }}
              >
                View all
              </button>
            </div>
            {nextToday.length === 0 ? (
              <p style={{ ...TYPOGRAPHY.body, color: COLORS.textSecondary, margin: 0, padding: SPACING.lg }}>
                No sessions scheduled for today.
              </p>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {nextToday.map((s, i) => (
                  <li
                    key={s.id}
                    style={{
                      padding: `${SPACING.lg} 0`,
                      borderBottom: i < nextToday.length - 1 ? '1px solid rgba(0,0,0,0.08)' : 'none',
                      display: 'flex',
                      gap: SPACING.lg,
                      alignItems: 'flex-start',
                    }}
                  >
                    <div
                      style={{
                        flexShrink: 0,
                        width: 52,
                        textAlign: 'center',
                        padding: `${SPACING.xs} 0`,
                        ...TYPOGRAPHY.label,
                        color: COLORS.textSecondary,
                        fontWeight: 600,
                      }}
                    >
                      {s.time}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ ...TYPOGRAPHY.body, fontWeight: 600, color: COLORS.textPrimary, marginBottom: 2 }}>
                        {s.studentName}
                      </div>
                      <div style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, marginBottom: 2 }}>
                        with {s.coachName}
                      </div>
                      <div style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textMuted, fontSize: 13 }}>
                        {s.type} · {s.durationMinutes} min
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function AdminStudentsPage({ isDesktop }: { isDesktop: boolean }) {
  return (
    <div
      style={{
        backgroundColor: 'transparent',
        minHeight: '100vh',
        padding: isDesktop ? SPACING.xl : SPACING.md,
        width: '100%',
        boxSizing: 'border-box',
        overflowX: 'hidden',
      }}
    >
      <div style={{ maxWidth: 1400, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ marginBottom: SPACING.xl }}>
          <h1 style={{ ...TYPOGRAPHY.h1, color: COLORS.textPrimary, margin: 0, marginBottom: SPACING.sm }}>
            All Students
          </h1>
          <p style={{ ...TYPOGRAPHY.body, color: COLORS.textSecondary, margin: 0 }}>
            {MOCK_ALL_STUDENTS.length} students on the platform.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: isDesktop ? SPACING.lg : SPACING.md,
          }}
        >
          {MOCK_ALL_STUDENTS.map((student) => (
            <Card key={student.id} padding={SPACING.lg}>
              <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.lg }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: RADIUS.circle,
                    backgroundColor: COLORS.lavender,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                  }}
                >
                  {student.avatar ?? '👤'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ ...TYPOGRAPHY.h3, color: COLORS.textPrimary, margin: 0, marginBottom: SPACING.xs }}>
                    {student.name}
                  </h3>
                  {student.email && (
                    <p style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, margin: 0, marginBottom: SPACING.xs }}>
                      {student.email}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: SPACING.lg, marginTop: SPACING.sm }}>
                    {student.lessonsCompleted != null && (
                      <span style={{ ...TYPOGRAPHY.label, color: COLORS.textSecondary }}>
                        {student.lessonsCompleted} lessons
                      </span>
                    )}
                    {student.lastActive && (
                      <span style={{ ...TYPOGRAPHY.label, color: COLORS.textMuted }}>
                        Last active: {student.lastActive}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminCoachesPage({ isDesktop }: { isDesktop: boolean }) {
  return (
    <div
      style={{
        backgroundColor: 'transparent',
        minHeight: '100vh',
        padding: isDesktop ? SPACING.xl : SPACING.md,
        width: '100%',
        boxSizing: 'border-box',
        overflowX: 'hidden',
      }}
    >
      <div style={{ maxWidth: 1400, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ marginBottom: SPACING.xl }}>
          <h1 style={{ ...TYPOGRAPHY.h1, color: COLORS.textPrimary, margin: 0, marginBottom: SPACING.sm }}>
            All Coaches
          </h1>
        </div>

        <div
          style={{
            marginBottom: SPACING.xl,
            background: 'linear-gradient(135deg, #3AAED8 0%, #2D8DB3 40%, #1E607C 75%, #123849 100%)',
            borderRadius: RADIUS.lg,
            padding: SPACING.xl,
            color: COLORS.white,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p
              style={{
                ...TYPOGRAPHY.label,
                color: COLORS.primary,
                margin: 0,
                marginBottom: SPACING.md,
                fontWeight: 600,
              }}
            >
              Coach stats
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: SPACING.xl,
              }}
            >
              <div>
                <span style={{ ...TYPOGRAPHY.bodySmall, color: 'rgba(255,255,255,0.7)' }}>Coaches</span>
                <div style={{ ...TYPOGRAPHY.h2, color: COLORS.white, margin: 0 }}>{COACHES_STATS.totalCoaches}</div>
              </div>
              <div>
                <span style={{ ...TYPOGRAPHY.bodySmall, color: 'rgba(255,255,255,0.7)' }}>Assigned students</span>
                <div style={{ ...TYPOGRAPHY.h2, color: COLORS.white, margin: 0 }}>{COACHES_STATS.totalCoachStudents}</div>
              </div>
              <div>
                <span style={{ ...TYPOGRAPHY.bodySmall, color: 'rgba(255,255,255,0.7)' }}>Total sessions</span>
                <div style={{ ...TYPOGRAPHY.h2, color: COLORS.white, margin: 0 }}>{COACHES_STATS.totalCoachSessions}</div>
              </div>
              <div>
                <span style={{ ...TYPOGRAPHY.bodySmall, color: 'rgba(255,255,255,0.7)' }}>Avg students / coach</span>
                <div style={{ ...TYPOGRAPHY.h2, color: COLORS.white, margin: 0 }}>{COACHES_STATS.avgStudentsPerCoach}</div>
              </div>
              <div>
                <span style={{ ...TYPOGRAPHY.bodySmall, color: 'rgba(255,255,255,0.7)' }}>Avg sessions / coach</span>
                <div style={{ ...TYPOGRAPHY.h2, color: COLORS.white, margin: 0 }}>{COACHES_STATS.avgSessionsPerCoach}</div>
              </div>
              <div>
                <span style={{ ...TYPOGRAPHY.bodySmall, color: 'rgba(255,255,255,0.7)' }}>Sessions this month</span>
                <div style={{ ...TYPOGRAPHY.h2, color: COLORS.white, margin: 0 }}>{COACHES_STATS.totalSessionsThisMonth}</div>
              </div>
              <div>
                <span style={{ ...TYPOGRAPHY.bodySmall, color: 'rgba(255,255,255,0.7)' }}>Hours this month</span>
                <div style={{ ...TYPOGRAPHY.h2, color: COLORS.white, margin: 0 }}>{COACHES_STATS.totalHoursThisMonth}</div>
              </div>
            </div>
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: -30,
              right: -30,
              width: 120,
              height: 120,
              borderRadius: '50%',
              background: 'rgba(155, 225, 93, 0.12)',
              pointerEvents: 'none',
            }}
          />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: isDesktop ? SPACING.lg : SPACING.md,
          }}
        >
          {MOCK_COACHES.map((coach) => (
            <Card key={coach.id} padding={SPACING.lg}>
              <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.lg }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: RADIUS.circle,
                    backgroundColor: COLORS.primary,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                  }}
                >
                  🎾
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ ...TYPOGRAPHY.h3, color: COLORS.textPrimary, margin: 0, marginBottom: SPACING.xs }}>
                    {coach.name}
                  </h3>
                  <p style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, margin: 0, marginBottom: SPACING.xs }}>
                    {coach.email}
                  </p>
                  <div style={{ display: 'flex', gap: SPACING.lg, marginTop: SPACING.sm, flexWrap: 'wrap' }}>
                    <span style={{ ...TYPOGRAPHY.label, color: COLORS.textSecondary }}>
                      {coach.studentCount} students
                    </span>
                    <span style={{ ...TYPOGRAPHY.label, color: COLORS.textSecondary }}>
                      {coach.sessionCount} sessions
                    </span>
                    {coach.lastActive && (
                      <span style={{ ...TYPOGRAPHY.label, color: COLORS.textMuted }}>
                        Last active: {coach.lastActive}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// Helpers for Requests tab
const getInitials = (name: string) =>
  name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

const inputBase = {
  padding: `${SPACING.sm}px ${SPACING.md}px`,
  borderRadius: RADIUS.sm,
  border: `1px solid ${COLORS.textMuted}`,
  ...TYPOGRAPHY.body,
  width: '100%',
  boxSizing: 'border-box' as const,
};

function AdminRequestsPage({
  isDesktop,
  requests,
  setRequests,
}: {
  isDesktop: boolean;
  requests: RequestedSession[];
  setRequests: React.Dispatch<React.SetStateAction<RequestedSession[]>>;
}) {
  const [editing, setEditing] = useState<RequestedSession | null>(null);

  const handleConfirm = () => {
    if (!editing) return;
    const address = editing.address?.trim();
    if (!address) return;
    setRequests((prev) => prev.filter((r) => r.id !== editing.id));
    setEditing(null);
  };

  const handleReject = () => {
    if (!editing) return;
    setRequests((prev) => prev.filter((r) => r.id !== editing.id));
    setEditing(null);
  };

  const updateEditing = (updates: Partial<RequestedSession>) => {
    setEditing((prev) => (prev ? { ...prev, ...updates } : null));
  };

  return (
    <div
      style={{
        backgroundColor: 'transparent',
        minHeight: '100vh',
        padding: isDesktop ? SPACING.xl : SPACING.md,
        width: '100%',
        boxSizing: 'border-box',
        overflowX: 'hidden',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: SPACING.md,
            marginBottom: SPACING.xxl,
          }}
        >
          <div>
            <h1 style={{ ...TYPOGRAPHY.h1, color: COLORS.textPrimary, margin: 0, marginBottom: SPACING.xs }}>
              Requests
            </h1>
            <p style={{ ...TYPOGRAPHY.body, color: COLORS.textSecondary, margin: 0 }}>
              Review and approve session requests
            </p>
          </div>
          {requests.length > 0 && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: SPACING.sm,
                padding: `${SPACING.sm}px ${SPACING.lg}px`,
                borderRadius: RADIUS.full,
                backgroundColor: COLORS.white,
                boxShadow: SHADOWS.light,
                ...TYPOGRAPHY.labelMed,
                color: COLORS.textPrimary,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: COLORS.primary,
                }}
              />
              {requests.length} pending
            </div>
          )}
        </div>

        {/* Dashboard strip — distinct background from Overview / Coaches */}
        <div
          style={{
            marginBottom: SPACING.xl,
            background: 'linear-gradient(145deg, #1a365d 0%, #2c5282 50%, #2d3748 100%)',
            borderRadius: RADIUS.lg,
            padding: SPACING.xl,
            color: COLORS.white,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p
              style={{
                ...TYPOGRAPHY.label,
                color: COLORS.primary,
                margin: 0,
                marginBottom: SPACING.md,
                fontWeight: 600,
              }}
            >
              Request stats
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: SPACING.xl,
              }}
            >
              <div>
                <span style={{ ...TYPOGRAPHY.bodySmall, color: 'rgba(255,255,255,0.75)' }}>Pending</span>
                <div style={{ ...TYPOGRAPHY.h2, color: COLORS.white, margin: 0 }}>{requests.length}</div>
              </div>
              <div>
                <span style={{ ...TYPOGRAPHY.bodySmall, color: 'rgba(255,255,255,0.75)' }}>Private</span>
                <div style={{ ...TYPOGRAPHY.h2, color: COLORS.white, margin: 0 }}>
                  {requests.filter((r) => r.type === 'Private').length}
                </div>
              </div>
              <div>
                <span style={{ ...TYPOGRAPHY.bodySmall, color: 'rgba(255,255,255,0.75)' }}>Group</span>
                <div style={{ ...TYPOGRAPHY.h2, color: COLORS.white, margin: 0 }}>
                  {requests.filter((r) => r.type === 'Group').length}
                </div>
              </div>
              <div>
                <span style={{ ...TYPOGRAPHY.bodySmall, color: 'rgba(255,255,255,0.75)' }}>Hours requested</span>
                <div style={{ ...TYPOGRAPHY.h2, color: COLORS.white, margin: 0 }}>
                  {Math.round(requests.reduce((sum, r) => sum + r.durationMinutes, 0) / 60)}
                </div>
              </div>
            </div>
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: -30,
              right: -30,
              width: 120,
              height: 120,
              borderRadius: '50%',
              background: 'rgba(135, 206, 235, 0.15)',
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* Content */}
        {requests.length === 0 ? (
          <Card padding={SPACING.xxl * 2} style={{ textAlign: 'center' }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: RADIUS.lg,
                backgroundColor: COLORS.backgroundLight,
                margin: '0 auto',
                marginBottom: SPACING.lg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                ...TYPOGRAPHY.h2,
                color: COLORS.textMuted,
              }}
            >
              ✓
            </div>
            <p style={{ ...TYPOGRAPHY.h3, color: COLORS.textPrimary, margin: 0, marginBottom: SPACING.sm }}>
              All caught up
            </p>
            <p style={{ ...TYPOGRAPHY.body, color: COLORS.textSecondary, margin: 0 }}>
              No pending session requests. New requests will appear here.
            </p>
          </Card>
        ) : isDesktop ? (
          /* Desktop: table-style list inside one card */
          <Card padding={0} style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
                <thead>
                  <tr style={{ backgroundColor: COLORS.backgroundLight }}>
                    <th
                      style={{
                        ...TYPOGRAPHY.label,
                        color: COLORS.textSecondary,
                        textAlign: 'left',
                        padding: SPACING.md,
                        fontWeight: 600,
                        borderBottom: `1px solid ${COLORS.textMuted}`,
                      }}
                    >
                      Session
                    </th>
                    <th
                      style={{
                        ...TYPOGRAPHY.label,
                        color: COLORS.textSecondary,
                        textAlign: 'left',
                        padding: SPACING.md,
                        fontWeight: 600,
                        borderBottom: `1px solid ${COLORS.textMuted}`,
                      }}
                    >
                      Coach
                    </th>
                    <th
                      style={{
                        ...TYPOGRAPHY.label,
                        color: COLORS.textSecondary,
                        textAlign: 'left',
                        padding: SPACING.md,
                        fontWeight: 600,
                        borderBottom: `1px solid ${COLORS.textMuted}`,
                      }}
                    >
                      Date & time
                    </th>
                    <th
                      style={{
                        ...TYPOGRAPHY.label,
                        color: COLORS.textSecondary,
                        textAlign: 'left',
                        padding: SPACING.md,
                        fontWeight: 600,
                        borderBottom: `1px solid ${COLORS.textMuted}`,
                      }}
                    >
                      Type
                    </th>
                    <th
                      style={{
                        ...TYPOGRAPHY.label,
                        color: COLORS.textSecondary,
                        textAlign: 'right',
                        padding: SPACING.md,
                        fontWeight: 600,
                        borderBottom: `1px solid ${COLORS.textMuted}`,
                      }}
                    >
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req, i) => (
                    <tr
                      key={req.id}
                      style={{
                        borderBottom:
                          i < requests.length - 1 ? `1px solid ${COLORS.backgroundLight}` : 'none',
                        cursor: 'pointer',
                      }}
                      onClick={() => setEditing({ ...req })}
                    >
                      <td style={{ padding: SPACING.md, verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.md }}>
                          <div
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: RADIUS.full,
                              backgroundColor: COLORS.primaryLight,
                              color: COLORS.textPrimary,
                              ...TYPOGRAPHY.labelMed,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {getInitials(req.studentName)}
                          </div>
                          <div>
                            <div style={{ ...TYPOGRAPHY.body, fontWeight: 600, color: COLORS.textPrimary }}>
                              {req.studentName}
                            </div>
                            {req.requestedAt && (
                              <div style={{ ...TYPOGRAPHY.label, color: COLORS.textMuted }}>
                                Requested {req.requestedAt}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: SPACING.md, ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary }}>
                        {req.coachName}
                      </td>
                      <td style={{ padding: SPACING.md }}>
                        <div style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textPrimary }}>
                          {req.dateLabel}
                        </div>
                        <div style={{ ...TYPOGRAPHY.label, color: COLORS.textSecondary, fontVariantNumeric: 'tabular-nums' }}>
                          {req.time} · {req.durationMinutes} min
                        </div>
                      </td>
                      <td style={{ padding: SPACING.md }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: `${SPACING.xs}px ${SPACING.sm}px`,
                            borderRadius: RADIUS.sm,
                            ...TYPOGRAPHY.label,
                            fontWeight: 600,
                            backgroundColor: req.type === 'Private' ? COLORS.primaryLight : 'rgba(214, 201, 255, 0.4)',
                            color: req.type === 'Private' ? '#5a7a2a' : '#5a4a7a',
                          }}
                        >
                          {req.type}
                        </span>
                      </td>
                      <td style={{ padding: SPACING.md, textAlign: 'right', verticalAlign: 'middle' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditing({ ...req });
                          }}
                          style={{
                            padding: `${SPACING.sm}px ${SPACING.lg}px`,
                            borderRadius: RADIUS.sm,
                            border: 'none',
                            backgroundColor: COLORS.primary,
                            color: COLORS.textPrimary,
                            ...TYPOGRAPHY.labelMed,
                            cursor: 'pointer',
                          }}
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          /* Mobile: stacked cards */
          <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.md }}>
            {requests.map((req) => (
              <Card
                key={req.id}
                padding={SPACING.lg}
                onClick={() => setEditing({ ...req })}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: SPACING.md }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: RADIUS.full,
                      backgroundColor: COLORS.primaryLight,
                      color: COLORS.textPrimary,
                      ...TYPOGRAPHY.labelMed,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {getInitials(req.studentName)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ ...TYPOGRAPHY.body, fontWeight: 600, color: COLORS.textPrimary, margin: 0 }}>
                      {req.studentName}
                    </p>
                    <p style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, margin: 0, marginTop: 2 }}>
                      {req.coachName}
                    </p>
                    <div
                      style={{
                        marginTop: SPACING.sm,
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: SPACING.sm,
                      }}
                    >
                      <span
                        style={{
                          padding: `${SPACING.xs}px ${SPACING.sm}px`,
                          borderRadius: RADIUS.sm,
                          ...TYPOGRAPHY.label,
                          fontWeight: 600,
                          backgroundColor: req.type === 'Private' ? COLORS.primaryLight : 'rgba(214, 201, 255, 0.4)',
                          color: req.type === 'Private' ? '#5a7a2a' : '#5a4a7a',
                        }}
                      >
                        {req.type}
                      </span>
                      <span style={{ ...TYPOGRAPHY.label, color: COLORS.textMuted }}>
                        {req.dateLabel} · {req.time}
                      </span>
                      <span style={{ ...TYPOGRAPHY.label, color: COLORS.textMuted }}>{req.durationMinutes} min</span>
                    </div>
                    {req.requestedAt && (
                      <p style={{ ...TYPOGRAPHY.label, color: COLORS.textMuted, margin: 0, marginTop: SPACING.xs }}>
                        Requested {req.requestedAt}
                      </p>
                    )}
                  </div>
                  <span style={{ color: COLORS.textMuted, fontSize: 20, flexShrink: 0 }}>›</span>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Review modal */}
        {editing && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: SPACING.lg,
              boxSizing: 'border-box',
            }}
            onClick={() => setEditing(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: 440, width: '100%', maxHeight: '90vh', overflow: 'auto' }}
            >
              <Card padding={SPACING.xxl} style={{ width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    marginBottom: SPACING.lg,
                  }}
                >
                  <div>
                    <h3 style={{ ...TYPOGRAPHY.h3, color: COLORS.textPrimary, margin: 0, marginBottom: SPACING.xs }}>
                      Review request
                    </h3>
                    <p style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, margin: 0 }}>
                      Edit details, add location, then confirm or reject.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    style={{
                      padding: SPACING.xs,
                      border: 'none',
                      background: 'none',
                      color: COLORS.textMuted,
                      cursor: 'pointer',
                      fontSize: 20,
                      lineHeight: 1,
                    }}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.lg }}>
                  <div>
                    <div style={{ ...TYPOGRAPHY.label, color: COLORS.textSecondary, marginBottom: SPACING.sm }}>
                      Session details
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: SPACING.md,
                        padding: SPACING.md,
                        borderRadius: RADIUS.sm,
                        backgroundColor: COLORS.backgroundLight,
                      }}
                    >
                      <label style={{ display: 'flex', flexDirection: 'column', gap: SPACING.xs, gridColumn: '1 / -1' }}>
                        <span style={{ ...TYPOGRAPHY.label, color: COLORS.textSecondary }}>Student</span>
                        <input
                          type="text"
                          value={editing.studentName}
                          onChange={(e) => updateEditing({ studentName: e.target.value })}
                          style={inputBase}
                        />
                      </label>
                      {editing.studentEmail != null && (
                        <label style={{ display: 'flex', flexDirection: 'column', gap: SPACING.xs, gridColumn: '1 / -1' }}>
                          <span style={{ ...TYPOGRAPHY.label, color: COLORS.textSecondary }}>Email</span>
                          <input
                            type="email"
                            value={editing.studentEmail}
                            onChange={(e) => updateEditing({ studentEmail: e.target.value })}
                            style={inputBase}
                          />
                        </label>
                      )}
                      <label style={{ display: 'flex', flexDirection: 'column', gap: SPACING.xs }}>
                        <span style={{ ...TYPOGRAPHY.label, color: COLORS.textSecondary }}>Coach</span>
                        <input
                          type="text"
                          value={editing.coachName}
                          onChange={(e) => updateEditing({ coachName: e.target.value })}
                          style={inputBase}
                        />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: SPACING.xs }}>
                        <span style={{ ...TYPOGRAPHY.label, color: COLORS.textSecondary }}>Date</span>
                        <input
                          type="date"
                          value={editing.dateKey}
                          onChange={(e) =>
                            updateEditing({ dateKey: e.target.value, dateLabel: formatDateLabel(e.target.value) })
                          }
                          style={inputBase}
                        />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: SPACING.xs }}>
                        <span style={{ ...TYPOGRAPHY.label, color: COLORS.textSecondary }}>Time</span>
                        <input
                          type="text"
                          value={editing.time}
                          onChange={(e) => updateEditing({ time: e.target.value })}
                          placeholder="11:00 AM"
                          style={inputBase}
                        />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: SPACING.xs }}>
                        <span style={{ ...TYPOGRAPHY.label, color: COLORS.textSecondary }}>Type</span>
                        <select
                          value={editing.type}
                          onChange={(e) => updateEditing({ type: e.target.value as 'Private' | 'Group' })}
                          style={inputBase}
                        >
                          <option value="Private">Private</option>
                          <option value="Group">Group</option>
                        </select>
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: SPACING.xs }}>
                        <span style={{ ...TYPOGRAPHY.label, color: COLORS.textSecondary }}>Duration (min)</span>
                        <input
                          type="number"
                          min={15}
                          step={15}
                          value={editing.durationMinutes}
                          onChange={(e) =>
                            updateEditing({ durationMinutes: Number(e.target.value) || 60 })
                          }
                          style={inputBase}
                        />
                      </label>
                    </div>
                  </div>

                  <div>
                    <div style={{ ...TYPOGRAPHY.label, color: COLORS.textSecondary, marginBottom: SPACING.sm }}>
                      Location <span style={{ color: COLORS.coral }}>required to confirm</span>
                    </div>
                    <input
                      type="text"
                      value={editing.address ?? ''}
                      onChange={(e) => updateEditing({ address: e.target.value || undefined })}
                      placeholder="Address or court name"
                      style={inputBase}
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: SPACING.md,
                    marginTop: SPACING.xl,
                    justifyContent: 'flex-end',
                    flexWrap: 'wrap',
                  }}
                >
                  <button
                    type="button"
                    onClick={handleReject}
                    style={{
                      padding: `${SPACING.md}px ${SPACING.lg}px`,
                      borderRadius: RADIUS.sm,
                      border: `1px solid ${COLORS.textMuted}`,
                      backgroundColor: 'transparent',
                      color: COLORS.textSecondary,
                      ...TYPOGRAPHY.bodySmall,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={!editing.address?.trim()}
                    style={{
                      padding: `${SPACING.md}px ${SPACING.lg}px`,
                      borderRadius: RADIUS.sm,
                      border: 'none',
                      backgroundColor: (editing.address?.trim()
                        ? COLORS.primary
                        : COLORS.textMuted) as string,
                      color: COLORS.textPrimary,
                      ...TYPOGRAPHY.bodySmall,
                      fontWeight: 600,
                      cursor: editing.address?.trim() ? 'pointer' : 'not-allowed',
                      opacity: editing.address?.trim() ? 1 : 0.7,
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
}

export const AdminApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTabId>('overview');
  const [requestedSessions, setRequestedSessions] = useState<RequestedSession[]>(() => [...MOCK_REQUESTED_SESSIONS_INITIAL]);
  const isDesktop = useIsDesktop();

  useEffect(() => {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = globalStyles;
    document.head.appendChild(styleSheet);
    return () => {
      document.head.removeChild(styleSheet);
    };
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <AdminOverviewPage
            isDesktop={isDesktop}
            sessionsToday={requestedSessions}
            onViewAllRequests={() => setActiveTab('requests')}
          />
        );
      case 'students':
        return <AdminStudentsPage isDesktop={isDesktop} />;
      case 'coaches':
        return <AdminCoachesPage isDesktop={isDesktop} />;
      case 'requests':
        return (
          <AdminRequestsPage
            isDesktop={isDesktop}
            requests={requestedSessions}
            setRequests={setRequestedSessions}
          />
        );
      default:
        return (
          <AdminOverviewPage
            isDesktop={isDesktop}
            sessionsToday={requestedSessions}
            onViewAllRequests={() => setActiveTab('requests')}
          />
        );
    }
  };

  const tabs: { id: AdminTabId; label: string; icon: ReactNode }[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      ),
    },
    {
      id: 'students',
      label: 'Students',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      id: 'coaches',
      label: 'Coaches',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
    {
      id: 'requests',
      label: 'Requests',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
    },
  ];

  const pendingRequestsCount = requestedSessions.length;

  const tabButton = (tab: (typeof tabs)[0]) => {
    const isActive = tab.id === activeTab;
    const showRequestsBadge = tab.id === 'requests' && pendingRequestsCount > 0;
    return (
      <button
        key={tab.id}
        type="button"
        onClick={() => setActiveTab(tab.id)}
        style={{
          width: isDesktop ? '100%' : undefined,
          flex: isDesktop ? undefined : 1,
          background: isActive && isDesktop ? COLORS.primaryLight : 'none',
          border: 'none',
          outline: 'none',
          padding: isDesktop ? SPACING.md : SPACING.xs,
          display: 'flex',
          flexDirection: isDesktop ? 'row' : 'column',
          alignItems: 'center',
          gap: isDesktop ? SPACING.md : 4,
          color: isActive ? COLORS.textPrimary : COLORS.textSecondary,
          borderRadius: isDesktop ? RADIUS.md : 0,
          cursor: 'pointer',
          position: 'relative',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative' }}>
          {tab.icon}
          {showRequestsBadge && !isDesktop && (
            <span
              style={{
                position: 'absolute',
                top: -4,
                right: -4,
                minWidth: 18,
                height: 18,
                paddingLeft: 4,
                paddingRight: 4,
                borderRadius: 9,
                backgroundColor: COLORS.red,
                color: COLORS.white,
                fontSize: 11,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {pendingRequestsCount > 99 ? '99+' : pendingRequestsCount}
            </span>
          )}
        </span>
        <span
          style={{
            ...TYPOGRAPHY.label,
            fontWeight: isActive ? 600 : 500,
            color: isActive ? COLORS.textPrimary : COLORS.textSecondary,
            display: 'flex',
            alignItems: 'center',
            gap: SPACING.xs,
          }}
        >
          {tab.label}
          {showRequestsBadge && isDesktop && (
            <span
              style={{
                minWidth: 18,
                height: 18,
                paddingLeft: 4,
                paddingRight: 4,
                borderRadius: 9,
                backgroundColor: COLORS.red,
                color: COLORS.white,
                fontSize: 11,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {pendingRequestsCount > 99 ? '99+' : pendingRequestsCount}
            </span>
          )}
        </span>
        {!isDesktop && (
          <div style={{ height: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isActive && (
              <div
                style={{
                  width: 20,
                  height: 2,
                  borderRadius: 999,
                  backgroundColor: COLORS.primary,
                }}
              />
            )}
          </div>
        )}
      </button>
    );
  };

  return (
    <main
      style={{
        width: '100%',
        minHeight: '100vh',
        paddingBottom: isDesktop ? SPACING.xl : 80,
        paddingLeft: isDesktop ? SIDEBAR_WIDTH : 0,
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      {isDesktop && (
        <aside
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            width: SIDEBAR_WIDTH,
            backgroundColor: COLORS.white,
            boxShadow: SHADOWS.md,
            zIndex: 100,
            padding: SPACING.lg,
            display: 'flex',
            flexDirection: 'column',
            gap: SPACING.xs,
          }}
        >
          <div
            style={{
              ...TYPOGRAPHY.h3,
              color: COLORS.textPrimary,
              marginBottom: SPACING.md,
              paddingLeft: SPACING.sm,
            }}
          >
            Admin
          </div>
          {tabs.map((tab) => tabButton(tab))}
        </aside>
      )}

      <div style={{ width: '100%', minHeight: '100vh' }}>{renderContent()}</div>

      {!isDesktop && (
        <nav
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: COLORS.white,
            boxShadow: SHADOWS.md,
            padding: `${SPACING.sm}px ${SPACING.lg}px`,
            zIndex: 100,
          }}
        >
          <div
            style={{
              maxWidth: 600,
              margin: '0 auto',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: SPACING.xs,
            }}
          >
            {tabs.slice(0, 2).map((tab) => tabButton(tab))}
            <div style={{ flex: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => {}}
                aria-label="Add"
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  backgroundColor: COLORS.primary,
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(155, 225, 93, 0.4)',
                  cursor: 'default',
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1C1C1E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>
            {tabs.slice(2).map((tab) => tabButton(tab))}
          </div>
        </nav>
      )}
    </main>
  );
};
