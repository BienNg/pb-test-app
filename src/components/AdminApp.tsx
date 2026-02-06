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
];

// Aggregate stats for overview
const OVERVIEW_STATS = {
  totalStudents: MOCK_ALL_STUDENTS.length,
  totalCoaches: MOCK_COACHES.length,
  totalSessions: 35,
  totalLessons: 8,
  totalLessonCompletions: MOCK_ALL_STUDENTS.reduce((sum, s) => sum + (s.lessonsCompleted ?? 0), 0),
};

function AdminOverviewPage({ isDesktop }: { isDesktop: boolean }) {
  return (
    <div
      style={{
        backgroundColor: COLORS.background,
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
            <h3 style={{ ...TYPOGRAPHY.h3, color: COLORS.textPrimary, margin: 0, marginBottom: SPACING.sm }}>
              Quick links
            </h3>
            <p style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, margin: 0 }}>
              Use the tabs below to view and manage all students and coaches. Student and coach apps are available at{' '}
              <code style={{ background: COLORS.backgroundLight, padding: '2px 6px', borderRadius: RADIUS.sm }}>/</code> and{' '}
              <code style={{ background: COLORS.backgroundLight, padding: '2px 6px', borderRadius: RADIUS.sm }}>/coach</code>.
            </p>
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
        backgroundColor: COLORS.background,
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
        backgroundColor: COLORS.background,
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
          <p style={{ ...TYPOGRAPHY.body, color: COLORS.textSecondary, margin: 0 }}>
            {MOCK_COACHES.length} coaches on the platform.
          </p>
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
        backgroundColor: COLORS.background,
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
            Requested Sessions
          </h1>
          <p style={{ ...TYPOGRAPHY.body, color: COLORS.textSecondary, margin: 0 }}>
            {requests.length} session request{requests.length !== 1 ? 's' : ''} from students. Review, edit details, then confirm or reject.
          </p>
        </div>

        {requests.length === 0 ? (
          <Card padding={SPACING.xl}>
            <p style={{ ...TYPOGRAPHY.body, color: COLORS.textSecondary, margin: 0, textAlign: 'center' }}>
              No pending session requests.
            </p>
          </Card>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: isDesktop ? SPACING.lg : SPACING.md,
            }}
          >
            {requests.map((req) => (
              <Card
                key={req.id}
                padding={SPACING.lg}
                onClick={() => setEditing({ ...req })}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: SPACING.sm }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ ...TYPOGRAPHY.h3, color: COLORS.textPrimary, margin: 0, marginBottom: SPACING.xs }}>
                      {req.studentName}
                    </p>
                    <p style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, margin: 0, marginBottom: SPACING.xs }}>
                      with {req.coachName}
                    </p>
                    <p style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textMuted, margin: 0 }}>
                      {req.dateLabel} · {req.time} · {req.type} · {req.durationMinutes} min
                    </p>
                    {req.requestedAt && (
                      <p style={{ ...TYPOGRAPHY.label, color: COLORS.textMuted, margin: 0, marginTop: SPACING.sm }}>
                        Requested {req.requestedAt}
                      </p>
                    )}
                  </div>
                  <span style={{ color: COLORS.textMuted, fontSize: 18, flexShrink: 0 }}>›</span>
                </div>
              </Card>
            ))}
          </div>
        )}

        {editing && (
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
            onClick={() => setEditing(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: 480, width: '100%', maxHeight: '90vh', overflow: 'auto' }}
            >
              <Card padding={SPACING.xl} style={{ width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
                <h3 style={{ ...TYPOGRAPHY.h3, color: COLORS.textPrimary, margin: 0, marginBottom: SPACING.sm }}>
                  Review session request
                </h3>
                <p style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, margin: 0, marginBottom: SPACING.lg }}>
                  Edit any details, add address/court to confirm, or reject the request.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.md }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: SPACING.xs }}>
                    <span style={{ ...TYPOGRAPHY.label, color: COLORS.textSecondary }}>Student</span>
                    <input
                      type="text"
                      value={editing.studentName}
                      onChange={(e) => updateEditing({ studentName: e.target.value })}
                      style={{
                        padding: SPACING.sm,
                        borderRadius: RADIUS.sm,
                        border: `1px solid ${COLORS.textMuted}`,
                        ...TYPOGRAPHY.body,
                      }}
                    />
                  </label>
                  {editing.studentEmail != null && (
                    <label style={{ display: 'flex', flexDirection: 'column', gap: SPACING.xs }}>
                      <span style={{ ...TYPOGRAPHY.label, color: COLORS.textSecondary }}>Student email</span>
                      <input
                        type="email"
                        value={editing.studentEmail}
                        onChange={(e) => updateEditing({ studentEmail: e.target.value })}
                        style={{
                          padding: SPACING.sm,
                          borderRadius: RADIUS.sm,
                          border: `1px solid ${COLORS.textMuted}`,
                          ...TYPOGRAPHY.body,
                        }}
                      />
                    </label>
                  )}
                  <label style={{ display: 'flex', flexDirection: 'column', gap: SPACING.xs }}>
                    <span style={{ ...TYPOGRAPHY.label, color: COLORS.textSecondary }}>Coach</span>
                    <input
                      type="text"
                      value={editing.coachName}
                      onChange={(e) => updateEditing({ coachName: e.target.value })}
                      style={{
                        padding: SPACING.sm,
                        borderRadius: RADIUS.sm,
                        border: `1px solid ${COLORS.textMuted}`,
                        ...TYPOGRAPHY.body,
                      }}
                    />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: SPACING.xs }}>
                    <span style={{ ...TYPOGRAPHY.label, color: COLORS.textSecondary }}>Date</span>
                    <input
                      type="date"
                      value={editing.dateKey}
                      onChange={(e) => updateEditing({ dateKey: e.target.value, dateLabel: formatDateLabel(e.target.value) })}
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
                      value={editing.time}
                      onChange={(e) => updateEditing({ time: e.target.value })}
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
                      value={editing.type}
                      onChange={(e) => updateEditing({ type: e.target.value as 'Private' | 'Group' })}
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
                      value={editing.durationMinutes}
                      onChange={(e) => updateEditing({ durationMinutes: Number(e.target.value) || 60 })}
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
                      Address / Court <span style={{ color: COLORS.coral }}>* for confirm</span>
                    </span>
                    <input
                      type="text"
                      value={editing.address ?? ''}
                      onChange={(e) => updateEditing({ address: e.target.value || undefined })}
                      placeholder="e.g. 123 Sunset Blvd, San Diego, CA — Court 3"
                      style={{
                        padding: SPACING.sm,
                        borderRadius: RADIUS.sm,
                        border: `1px solid ${COLORS.textMuted}`,
                        ...TYPOGRAPHY.body,
                      }}
                    />
                    {(!editing.address || !editing.address.trim()) && (
                      <span style={{ ...TYPOGRAPHY.label, color: COLORS.textMuted }}>
                        Required to confirm the session
                      </span>
                    )}
                  </label>
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: SPACING.md,
                    marginTop: SPACING.xl,
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                  }}
                >
                  <button
                    type="button"
                    onClick={handleReject}
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
                    onClick={handleConfirm}
                    disabled={!editing.address?.trim()}
                    style={{
                      padding: `${SPACING.sm}px ${SPACING.lg}px`,
                      borderRadius: RADIUS.sm,
                      border: 'none',
                      backgroundColor: (editing.address?.trim() ? COLORS.primary : COLORS.textMuted) as string,
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
        return <AdminOverviewPage isDesktop={isDesktop} />;
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
        return <AdminOverviewPage isDesktop={isDesktop} />;
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
            {tabs.map((tab) => tabButton(tab))}
          </div>
        </nav>
      )}
    </main>
  );
};
