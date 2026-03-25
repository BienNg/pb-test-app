'use client';

import React, { type ReactNode, useState, useEffect, useRef } from 'react';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, RADIUS, BREAKPOINTS } from '../styles/theme';
import { Card } from './BaseComponents';
import { IconCircle, IconChevronLeft, IconChevronRight } from './Icons';
import { CoachStudentsPage, type StudentInfo } from './CoachStudentsPage';
import { LessonsPage } from './LessonsPage';
import { GameAnalyticsPage, type TrainingSession } from './GameAnalyticsPage';
import { TrainingSessionDetail } from './TrainingSessionDetail';
import { createClient } from '@/lib/supabase/client';
import { fetchSessionCountsForStudentIds, fetchLastSessionDateForStudentIds } from '@/lib/studentSessions';
import { fetchSessionsForStudent } from '@/lib/studentSessions';
import { insertShotVideo } from '@/lib/shotVideos';

type AdminTabId = 'students' | 'coaches' | 'library';

async function fetchSignupDatesForStudentIds(studentIds: string[]): Promise<Record<string, string>> {
  if (studentIds.length === 0) return {};
  try {
    const res = await fetch('/api/coach/student-signup-dates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentIds }),
    });
    if (!res.ok) return {};
    const data = (await res.json()) as { signupDates?: Record<string, string> };
    return data.signupDates ?? {};
  } catch {
    return {};
  }
}

const DESKTOP_MIN = BREAKPOINTS.desktop; // 1024px
const SIDEBAR_WIDTH = 220;
const SIDEBAR_COLLAPSED_WIDTH = 72;

function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${DESKTOP_MIN}px)`);
    const handler = () => setIsDesktop(mq.matches);
    const id = requestAnimationFrame(() => handler());
    mq.addEventListener('change', handler);
    return () => {
      cancelAnimationFrame(id);
      mq.removeEventListener('change', handler);
    };
  }, []);
  return isDesktop;
}

export type { CoachInfo } from '../data/mockCoaches';
import { MOCK_COACHES } from '../data/mockCoaches';

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
  // More sessions on Feb 8 for richer mock data
  { id: 'req-5', dateKey: '2026-02-08', dateLabel: 'Sat, Feb 8', time: '12:00 PM', studentName: 'Alex Chen', studentEmail: 'alex@example.com', coachId: 'c2', coachName: 'Mike Johnson', type: 'Private', durationMinutes: 60, requestedAt: 'Feb 6, 2026' },
  { id: 'req-6', dateKey: '2026-02-08', dateLabel: 'Sat, Feb 8', time: '2:00 PM', studentName: 'Morgan Taylor', studentEmail: 'morgan@example.com', coachId: 'c1', coachName: 'Sarah Martinez', type: 'Private', durationMinutes: 45, requestedAt: 'Feb 6, 2026' },
  { id: 'req-7', dateKey: '2026-02-08', dateLabel: 'Sat, Feb 8', time: '3:30 PM', studentName: 'Riley Smith', studentEmail: 'riley@example.com', coachId: 'c3', coachName: 'Emma Wilson', type: 'Group', durationMinutes: 90, requestedAt: 'Feb 5, 2026' },
  { id: 'req-8', dateKey: '2026-02-08', dateLabel: 'Sat, Feb 8', time: '5:00 PM', studentName: 'Casey Brown', studentEmail: 'casey@example.com', coachId: 'c2', coachName: 'Mike Johnson', type: 'Private', durationMinutes: 60, requestedAt: 'Feb 7, 2026' },
  { id: 'req-9', dateKey: '2026-02-08', dateLabel: 'Sat, Feb 8', time: '6:30 PM', studentName: 'Sam Davis', studentEmail: 'sam@example.com', coachId: 'c1', coachName: 'Sarah Martinez', type: 'Private', durationMinutes: 45, requestedAt: 'Feb 7, 2026' },
];

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

function AdminStudentsPage({
  isDesktop,
  onBreadcrumbTailChange,
  onShotSessionViewChange,
}: {
  isDesktop: boolean;
  onBreadcrumbTailChange?: (segments: string[]) => void;
  onShotSessionViewChange?: (isInShotSession: boolean) => void;
}) {
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<StudentInfo | null>(null);
  const [studentSegment, setStudentSegment] = useState<'videos' | 'roadmap'>('videos');
  const [openShotTitle, setOpenShotTitle] = useState<string | null>(null);
  const [activeTrainingSessionId, setActiveTrainingSessionId] = useState<string | null>(null);
  const [overrideSession, setOverrideSession] = useState<TrainingSession | null>(null);
  const [sessionsForStudent, setSessionsForStudent] = useState<TrainingSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  useEffect(() => {
    onBreadcrumbTailChange?.(selectedStudent ? ['Students', selectedStudent.name] : []);
  }, [selectedStudent, onBreadcrumbTailChange]);

  useEffect(() => {
    onShotSessionViewChange?.(activeTrainingSessionId != null);
    return () => onShotSessionViewChange?.(false);
  }, [activeTrainingSessionId, onShotSessionViewChange]);

  const reloadStudents = React.useCallback(async () => {
    const supabase = createClient();
    if (!supabase) {
      setError('Supabase not configured');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.from('profiles').select('id, email, full_name, role');
      if (error) {
        setError(error.message);
        setStudents([]);
        return;
      }
      const rows = (data ?? []) as {
        id: string;
        email: string | null;
        full_name: string | null;
        role: string | null;
      }[];
      const filtered = rows.filter((r) => r.role === 'student' || !r.role);
      const studentIds = filtered.map((r) => r.id);
      const sessionCounts = await fetchSessionCountsForStudentIds(supabase, studentIds);
      const lastSessionDates = await fetchLastSessionDateForStudentIds(supabase, studentIds);
      const signupDates = await fetchSignupDatesForStudentIds(studentIds);
      
      setStudents(
        filtered.map((r) => {
          const signupDate = signupDates[r.id];
          const lastSessionDate = lastSessionDates[r.id];
          let joinedDate = '—';
          if (lastSessionDate) {
            const d = new Date(lastSessionDate + 'T12:00:00');
            joinedDate = d.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
          }
          let signupDateLabel = '—';
          if (signupDate) {
            const d = new Date(signupDate);
            if (!Number.isNaN(d.getTime())) {
              signupDateLabel = d.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });
            }
          }
          return {
            id: r.id,
            name: r.full_name?.trim() || r.email || r.id,
            email: r.email ?? '',
            lessonsCompleted: sessionCounts[r.id] ?? 0,
            lastActive: joinedDate,
            joinedDate: joinedDate,
            signupDate: signupDateLabel,
          };
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load students');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const reloadSelectedStudentSessions = React.useCallback(async () => {
    if (!selectedStudent) {
      setSessionsForStudent([]);
      return;
    }
    setLoadingSessions(true);
    try {
      const sessions = await fetchSessionsForStudent(createClient(), selectedStudent.id);
      setSessionsForStudent(sessions);
    } finally {
      setLoadingSessions(false);
    }
  }, [selectedStudent]);

  useEffect(() => {
    void reloadStudents();
  }, [reloadStudents]);

  // When a student is selected, fetch their sessions from DB (session_students -> sessions)
  useEffect(() => {
    if (!selectedStudent) {
      queueMicrotask(() => setSessionsForStudent([]));
      return;
    }
    void reloadSelectedStudentSessions();
  }, [selectedStudent, selectedStudent?.id, reloadSelectedStudentSessions]);

  const handleSessionUpdated = React.useCallback(async () => {
    await Promise.all([reloadStudents(), reloadSelectedStudentSessions()]);
  }, [reloadStudents, reloadSelectedStudentSessions]);

  const handleSaveVideoUrl = async (sid: string, youtubeUrl: string) => {
    const supabase = createClient();
    if (!supabase) throw new Error('Supabase not configured');
    const { error } = await supabase
      .from('sessions')
      .update({ youtube_url: youtubeUrl })
      .eq('id', sid);
    if (error) throw new Error(error.message);
    if (selectedStudent) {
      const next = await fetchSessionsForStudent(supabase, selectedStudent.id);
      setSessionsForStudent(next);
    }
  };

  // When viewing a training session detail (from progress page or shot video), show full-screen overlay
  if (activeTrainingSessionId != null) {
    const sessionsToUse = overrideSession ? [overrideSession] : sessionsForStudent;
    const breadcrumbFromRoadmap =
      overrideSession && selectedStudent
        ? { studentName: selectedStudent.name, shotTitle: overrideSession.title }
        : undefined;
    return (
      <div style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', backgroundColor: COLORS.backgroundLibrary }}>
        <TrainingSessionDetail
          sessionId={activeTrainingSessionId}
          onBack={() => {
            const wasFromRoadmap = breadcrumbFromRoadmap != null;
            setActiveTrainingSessionId(null);
            setOverrideSession(null);
            if (wasFromRoadmap) {
              setStudentSegment('roadmap');
            }
          }}
          sessions={sessionsToUse.length > 0 ? sessionsToUse : undefined}
          onSaveVideoUrl={overrideSession ? undefined : handleSaveVideoUrl}
          onSessionUpdated={handleSessionUpdated}
          onDeleteSession={overrideSession ? undefined : handleSessionUpdated}
          breadcrumbFromRoadmap={breadcrumbFromRoadmap}
          onBreadcrumbShotClick={(shotTitle) => {
            setOpenShotTitle(shotTitle);
            setActiveTrainingSessionId(null);
            setOverrideSession(null);
            setStudentSegment('roadmap');
          }}
          isAdminView
        />
      </div>
    );
  }

  // When viewing a student's sessions, show the same sessions page with DB-backed sessions
  if (selectedStudent) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: COLORS.backgroundLibrary }}>
        <GameAnalyticsPage
          title={`${selectedStudent.name}'s Game Analytics`}
          studentName={selectedStudent.name}
          studentId={selectedStudent.id}
          selectedSegment={studentSegment}
          onSelectedSegmentChange={setStudentSegment}
          onBack={() => setSelectedStudent(null)}
          onOpenSession={(sessionId) => {
            setOverrideSession(null);
            setActiveTrainingSessionId(sessionId);
          }}
          onOpenShotVideo={(session) => {
            setOverrideSession(session);
            setActiveTrainingSessionId(session.id);
          }}
          sessions={loadingSessions ? [] : sessionsForStudent}
          onAddSession={async (youtubeUrl, context) => {
            if (!context) return;
            const result = await insertShotVideo(createClient(), {
              videoUrl: youtubeUrl,
              studentId: context.studentId,
              shotId: context.shotId,
              shotTitle: context.shotTitle,
            });
            if ('error' in result) throw new Error(result.error);
            await reloadSelectedStudentSessions();
          }}
          openShotTitle={openShotTitle}
          onOpenShotTitleConsumed={() => setOpenShotTitle(null)}
          hideShotAnalyticsTab
        />
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: COLORS.backgroundLibrary,
        minHeight: '100vh',
        padding: isDesktop ? SPACING.xl : SPACING.md,
        width: '100%',
        boxSizing: 'border-box',
        overflowX: 'hidden',
      }}
    >
      {error && (
        <div style={{ padding: SPACING.lg, marginBottom: SPACING.lg, background: 'rgba(255,107,107,0.1)', borderRadius: RADIUS.md, color: COLORS.red, margin: SPACING.md }}>
          {error}
        </div>
      )}
      {loading ? (
        <div style={{ padding: SPACING.xl, textAlign: 'center', color: COLORS.textSecondary }}>Loading students…</div>
      ) : (
        <CoachStudentsPage
          title="Student Sessions"
          students={students}
          onSelectStudent={setSelectedStudent}
          onDeleteStudent={async (student) => {
            try {
              const res = await fetch('/api/admin/delete-student', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: student.id }),
              });
              const data = await res.json().catch(() => ({}));
              if (!res.ok) {
                setError(data.error ?? `Failed to delete student (${res.status})`);
                return;
              }
              setError(null);
              setSelectedStudent((prev) => (prev?.id === student.id ? null : prev));
              await reloadStudents();
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Failed to delete student');
            }
          }}
          showGameAnalyticsTab={false}
        />
      )}
    </div>
  );
}

function AdminCoachesPage({ isDesktop }: { isDesktop: boolean }) {
  return (
    <div
      style={{
        backgroundColor: COLORS.backgroundLibrary,
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
              background: 'rgba(49, 203, 0, 0.12)',
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
                    color: COLORS.textPrimary,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <IconCircle size={24} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ ...TYPOGRAPHY.h3, color: COLORS.textPrimary, margin: 0, marginBottom: SPACING.xs }}>
                    {coach.name}
                  </h3>
                  <p style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, margin: 0, marginBottom: SPACING.xs }}>
                    {coach.email}
                  </p>
                  <div style={{ display: 'flex', gap: SPACING.sm, marginTop: SPACING.xs, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span
                      style={{
                        ...TYPOGRAPHY.label,
                        color: COLORS.primary,
                        backgroundColor: COLORS.primaryLight,
                        padding: `${SPACING.xs}px ${SPACING.sm}px`,
                        borderRadius: RADIUS.sm,
                        fontWeight: 600,
                      }}
                    >
                      {coach.tier}
                    </span>
                    <span style={{ ...TYPOGRAPHY.label, color: COLORS.textPrimary, fontWeight: 600 }}>
                      ${coach.hourlyRate}/hr
                    </span>
                  </div>
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

const SHEET_TRANSITION_MS = 300;

export const AdminApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTabId>('students');
  const [_breadcrumbTail, setBreadcrumbTail] = useState<string[]>([]);
  const [isInShotSessionView, setIsInShotSessionView] = useState(false);
  const isDesktop = useIsDesktop();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Add session bottom sheet
  const [showAddSessionSheet, setShowAddSessionSheet] = useState(false);
  const [addSessionSheetAnimatedIn, setAddSessionSheetAnimatedIn] = useState(false);
  const addSessionSheetCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [newSessionDate, setNewSessionDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [newSessionYoutubeUrl, setNewSessionYoutubeUrl] = useState('');
  const [newSessionStudentIds, setNewSessionStudentIds] = useState<string[]>([]);
  const [newSessionCoachId, setNewSessionCoachId] = useState<string>('');
  const [newSessionType, setNewSessionType] = useState<'game' | 'drill' | ''>('');

  // Students from Supabase (profiles table; expected columns: id, email, full_name, role?)
  const [supabaseStudents, setSupabaseStudents] = useState<{ id: string; name: string; email: string }[]>([]);
  const [supabaseStudentsLoading, setSupabaseStudentsLoading] = useState(false);
  const [supabaseStudentsError, setSupabaseStudentsError] = useState<string | null>(null);
  const [addSessionSaving, setAddSessionSaving] = useState(false);
  const [addSessionError, setAddSessionError] = useState<string | null>(null);

  useEffect(() => {
    if (showAddSessionSheet) {
      setAddSessionError(null);
      setAddSessionSheetAnimatedIn(false);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setAddSessionSheetAnimatedIn(true));
      });
      return () => cancelAnimationFrame(id);
    } else {
      setAddSessionSheetAnimatedIn(false);
    }
  }, [showAddSessionSheet]);

  useEffect(() => {
    return () => {
      if (addSessionSheetCloseTimeoutRef.current) clearTimeout(addSessionSheetCloseTimeoutRef.current);
    };
  }, []);

  const closeAddSessionSheet = () => {
    if (addSessionSheetCloseTimeoutRef.current) return;
    setAddSessionSheetAnimatedIn(false);
    addSessionSheetCloseTimeoutRef.current = setTimeout(() => {
      addSessionSheetCloseTimeoutRef.current = null;
      setShowAddSessionSheet(false);
    }, SHEET_TRANSITION_MS);
  };

  const toggleStudentForNewSession = (id: string) => {
    setNewSessionStudentIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleAddSession = async () => {
    if (!canAddSession) return;
    const supabase = createClient();
    if (!supabase) {
      setAddSessionError('Supabase not configured');
      return;
    }
    setAddSessionSaving(true);
    setAddSessionError(null);
    try {
      const { data: sessionRow, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          date: newSessionDate,
          youtube_url: newSessionYoutubeUrl.trim() || null,
          coach_id: newSessionCoachId || null,
          session_type: newSessionType || null,
        })
        .select('id')
        .single();
      if (sessionError) {
        setAddSessionError(sessionError.message);
        return;
      }
      const sessionId = sessionRow?.id;
      if (!sessionId) {
        setAddSessionError('Failed to create session');
        return;
      }
      if (newSessionStudentIds.length > 0) {
        const { error: studentsError } = await supabase.from('session_students').insert(
          newSessionStudentIds.map((student_id) => ({ session_id: sessionId, student_id }))
        );
        if (studentsError) {
          setAddSessionError(studentsError.message);
          return;
        }
      }
      setNewSessionDate(new Date().toISOString().slice(0, 10));
      setNewSessionYoutubeUrl('');
      setNewSessionStudentIds([]);
      setNewSessionCoachId('');
      setNewSessionType('');
      closeAddSessionSheet();
    } catch (err) {
      setAddSessionError(err instanceof Error ? err.message : 'Failed to add session');
    } finally {
      setAddSessionSaving(false);
    }
  };

  // Fetch students from Supabase profiles when add-session sheet opens
  useEffect(() => {
    if (!showAddSessionSheet) return;
    const supabase = createClient();
    if (!supabase) {
      setSupabaseStudentsError('Supabase not configured');
      setSupabaseStudents([]);
      return;
    }
    setSupabaseStudentsLoading(true);
    setSupabaseStudentsError(null);
    void supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .then(({ data, error }) => {
        setSupabaseStudentsLoading(false);
        if (error) {
          setSupabaseStudentsError(error.message);
          setSupabaseStudents([]);
          return;
        }
        const rows = (data ?? []) as { id: string; email: string | null; full_name: string | null; role: string | null }[];
        const filtered = rows.filter((r) => r.role === 'student' || !r.role);
        setSupabaseStudents(
          filtered.map((r) => ({
            id: r.id,
            name: r.full_name?.trim() || r.email || r.id,
            email: r.email ?? '',
          }))
        );
      })
      .then(undefined, (err: unknown) => {
        setSupabaseStudentsLoading(false);
        setSupabaseStudentsError(err instanceof Error ? err.message : 'Failed to load students');
        setSupabaseStudents([]);
      });
  }, [showAddSessionSheet]);

  const renderContent = () => {
    switch (activeTab) {
      case 'students':
        return (
          <AdminStudentsPage
            isDesktop={isDesktop}
            onBreadcrumbTailChange={setBreadcrumbTail}
            onShotSessionViewChange={setIsInShotSessionView}
          />
        );
      case 'coaches':
        return <AdminCoachesPage isDesktop={isDesktop} />;
      case 'library':
        return <LessonsPage isAdmin />;
      default:
        return <AdminStudentsPage isDesktop={isDesktop} onBreadcrumbTailChange={setBreadcrumbTail} onShotSessionViewChange={setIsInShotSessionView} />;
    }
  };

  const tabs: { id: AdminTabId; label: string; icon: ReactNode }[] = [
    {
      id: 'students',
      label: 'Students',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
    {
      id: 'library',
      label: 'Library',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
      ),
    },
  ];

  const canAddSession =
    !!newSessionDate &&
    newSessionStudentIds.length > 0;

  const sidebarCollapsed = isDesktop && !sidebarOpen;

  useEffect(() => {
    if (activeTab !== 'students') setBreadcrumbTail([]);
  }, [activeTab]);

  const tabButton = (tab: (typeof tabs)[0]) => {
    const isActive = tab.id === activeTab;
    const iconOnly = sidebarCollapsed;
    return (
      <button
        key={tab.id}
        type="button"
        onClick={() => setActiveTab(tab.id)}
        title={iconOnly ? tab.label : undefined}
        style={{
          width: isDesktop ? '100%' : undefined,
          flex: isDesktop ? undefined : 1,
          background: isActive && isDesktop ? COLORS.libraryPrimaryLight : 'none',
          border: 'none',
          outline: 'none',
          padding: isDesktop ? (iconOnly ? SPACING.sm : SPACING.md) : SPACING.xs,
          display: 'flex',
          flexDirection: isDesktop ? 'row' : 'column',
          alignItems: 'center',
          justifyContent: isDesktop && iconOnly ? 'center' : undefined,
          gap: isDesktop ? SPACING.md : 4,
          color: isActive ? COLORS.textPrimary : COLORS.textSecondary,
          borderRadius: isDesktop ? RADIUS.md : 0,
          cursor: 'pointer',
          position: 'relative',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative' }}>
          {tab.icon}
        </span>
        {(!iconOnly || !isDesktop) && (
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
          </span>
        )}
          {!isDesktop && (
          <div style={{ height: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isActive && (
              <div
                style={{
                  width: 20,
                  height: 2,
                  borderRadius: 999,
                  backgroundColor: COLORS.libraryPrimary,
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
        paddingBottom: isDesktop ? SPACING.xl : isInShotSessionView ? 0 : 80,
        paddingLeft: isDesktop ? (sidebarOpen ? SIDEBAR_WIDTH : SIDEBAR_COLLAPSED_WIDTH) : 0,
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
            width: sidebarOpen ? SIDEBAR_WIDTH : SIDEBAR_COLLAPSED_WIDTH,
            backgroundColor: COLORS.white,
            boxShadow: 'none',
            borderRight: '1px solid rgba(143, 185, 168, 0.25)',
            zIndex: 100,
            padding: SPACING.lg,
            display: 'flex',
            flexDirection: 'column',
            gap: SPACING.xs,
            transition: 'width 0.2s ease',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: sidebarOpen ? 'space-between' : 'center',
              marginBottom: SPACING.md,
              minHeight: 32,
            }}
          >
            {sidebarOpen && (
              <div
                style={{
                  ...TYPOGRAPHY.h3,
                  color: COLORS.textPrimary,
                  paddingLeft: SPACING.sm,
                }}
              >
                Admin
              </div>
            )}
            <button
              type="button"
              aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              onClick={() => setSidebarOpen((o) => !o)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                borderRadius: RADIUS.md,
                backgroundColor: 'transparent',
                color: COLORS.textPrimary,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              {sidebarOpen ? (
                <IconChevronLeft size={18} />
              ) : (
                <IconChevronRight size={18} />
              )}
            </button>
          </div>
          {tabs.map((tab) => tabButton(tab))}
          <button
            type="button"
            aria-label="Add session"
            title="Add session"
            onClick={() => setShowAddSessionSheet(true)}
            style={{
              marginTop: 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: sidebarOpen ? SPACING.sm : 0,
              padding: sidebarOpen ? SPACING.md : SPACING.sm,
              borderRadius: RADIUS.md,
              backgroundColor: COLORS.libraryPrimary,
              color: COLORS.white,
              border: 'none',
              ...TYPOGRAPHY.label,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(143, 185, 168, 0.3)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {sidebarOpen && 'Add session'}
          </button>
        </aside>
      )}

      <div style={{ width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, minHeight: 0 }}>{renderContent()}</div>
      </div>

      {!isDesktop && !isInShotSessionView && (
        <nav
          aria-label="Admin navigation"
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: COLORS.white,
            boxShadow: SHADOWS.md,
            padding: '5px 16px 10px',
            zIndex: 100,
            overflow: 'visible',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
          }}
        >
          <div
            style={{
              maxWidth: 600,
              margin: '0 auto',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 0,
              position: 'relative',
              minHeight: 60,
            }}
          >
            {tabs.slice(0, 2).map((tab) => {
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    flex: 1,
                    background: 'none',
                    border: 'none',
                    outline: 'none',
                    padding: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2,
                    color: isActive ? COLORS.textPrimary : COLORS.textSecondary,
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    {tab.icon}
                  </span>
                  <span
                    style={{
                      ...TYPOGRAPHY.label,
                      fontSize: 11,
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? COLORS.textPrimary : COLORS.textSecondary,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {tab.label}
                  </span>
                  <div style={{ height: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isActive && (
                      <div
                        style={{
                          width: 18,
                          height: 2,
                          borderRadius: 999,
                          backgroundColor: COLORS.libraryPrimary,
                        }}
                      />
                    )}
                  </div>
                </button>
              );
            })}
            <div
              style={{
                flex: 1,
                position: 'relative',
                height: 1,
                display: 'flex',
                justifyContent: 'center',
                alignSelf: 'flex-start',
              }}
            >
              <button
                type="button"
                aria-label="Add"
                onClick={() => setShowAddSessionSheet(true)}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: 0,
                  transform: 'translate(-50%, -38%)',
                  width: 58,
                  height: 58,
                  borderRadius: '50%',
                  backgroundColor: COLORS.libraryPrimary,
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(143, 185, 168, 0.4)',
                  cursor: 'pointer',
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>
            {tabs.slice(2).map((tab) => {
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    flex: 1,
                    background: 'none',
                    border: 'none',
                    outline: 'none',
                    padding: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2,
                    color: isActive ? COLORS.textPrimary : COLORS.textSecondary,
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    {tab.icon}
                  </span>
                  <span
                    style={{
                      ...TYPOGRAPHY.label,
                      fontSize: 11,
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? COLORS.textPrimary : COLORS.textSecondary,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {tab.label}
                  </span>
                  <div style={{ height: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isActive && (
                      <div
                        style={{
                          width: 18,
                          height: 2,
                          borderRadius: 999,
                          backgroundColor: COLORS.libraryPrimary,
                        }}
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* Add session bottom sheet */}
      {showAddSessionSheet && (
        <div
          role="presentation"
          onClick={closeAddSessionSheet}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            backgroundColor: 'rgba(0,0,0,0.4)',
            opacity: addSessionSheetAnimatedIn ? 1 : 0,
            transition: `opacity ${SHEET_TRANSITION_MS}ms ease-out`,
          }}
        >
          <div
            role="dialog"
            aria-label="Add new session"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              maxHeight: '85vh',
              overflow: 'auto',
              backgroundColor: COLORS.white,
              borderTopLeftRadius: RADIUS.xl,
              borderTopRightRadius: RADIUS.xl,
              padding: SPACING.xxl,
              paddingBottom: `calc(${SPACING.xxl}px + env(safe-area-inset-bottom, 0px))`,
              boxShadow: '0 -4px 24px rgba(0,0,0,0.12)',
              transform: addSessionSheetAnimatedIn ? 'translateY(0)' : 'translateY(100%)',
              transition: `transform ${SHEET_TRANSITION_MS}ms ease-out`,
            }}
          >
            <div
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: COLORS.textMuted,
                marginBottom: SPACING.xl,
                marginLeft: 'auto',
                marginRight: 'auto',
              }}
            />
            <h3 style={{ ...TYPOGRAPHY.h3, color: COLORS.textPrimary, margin: `0 0 ${SPACING.xl}px` }}>
              Add session
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.lg }}>
              <div>
                <label
                  htmlFor="add-session-date"
                  style={{
                    display: 'block',
                    ...TYPOGRAPHY.label,
                    color: COLORS.textSecondary,
                    marginBottom: SPACING.xs,
                  }}
                >
                  Date
                </label>
                <input
                  id="add-session-date"
                  type="date"
                  value={newSessionDate}
                  onChange={(e) => setNewSessionDate(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: SPACING.sm,
                    borderRadius: RADIUS.md,
                    border: `1px solid ${COLORS.textMuted}`,
                    ...TYPOGRAPHY.body,
                    color: COLORS.textPrimary,
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="add-session-youtube"
                  style={{
                    display: 'block',
                    ...TYPOGRAPHY.label,
                    color: COLORS.textSecondary,
                    marginBottom: SPACING.xs,
                  }}
                >
                  YouTube URL
                </label>
                <input
                  id="add-session-youtube"
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={newSessionYoutubeUrl}
                  onChange={(e) => setNewSessionYoutubeUrl(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: SPACING.sm,
                    borderRadius: RADIUS.md,
                    border: `1px solid ${COLORS.textMuted}`,
                    ...TYPOGRAPHY.body,
                    color: COLORS.textPrimary,
                  }}
                />
              </div>

              <div>
                <span
                  style={{
                    display: 'block',
                    ...TYPOGRAPHY.label,
                    color: COLORS.textSecondary,
                    marginBottom: SPACING.xs,
                  }}
                >
                  Coach
                </span>
                <select
                  value={newSessionCoachId}
                  onChange={(e) => setNewSessionCoachId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: SPACING.sm,
                    borderRadius: RADIUS.md,
                    border: `1px solid ${COLORS.textMuted}`,
                    ...TYPOGRAPHY.body,
                    color: COLORS.textPrimary,
                    backgroundColor: COLORS.white,
                  }}
                >
                  <option value="">Select coach</option>
                  {MOCK_COACHES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span
                  style={{
                    display: 'block',
                    ...TYPOGRAPHY.label,
                    color: COLORS.textSecondary,
                    marginBottom: SPACING.xs,
                  }}
                >
                  Session type
                </span>
                <div style={{ display: 'flex', gap: SPACING.sm }}>
                  <label
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: SPACING.xs,
                      padding: SPACING.sm,
                      borderRadius: RADIUS.md,
                      border: `2px solid ${newSessionType === 'game' ? COLORS.primary : COLORS.textMuted}`,
                      backgroundColor: newSessionType === 'game' ? COLORS.primaryLight : COLORS.white,
                      cursor: 'pointer',
                      ...TYPOGRAPHY.body,
                      color: COLORS.textPrimary,
                    }}
                  >
                    <input
                      type="radio"
                      name="add-session-type"
                      value="game"
                      checked={newSessionType === 'game'}
                      onChange={() => setNewSessionType('game')}
                      style={{ width: 18, height: 18, accentColor: COLORS.primary }}
                    />
                    Game
                  </label>
                  <label
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: SPACING.xs,
                      padding: SPACING.sm,
                      borderRadius: RADIUS.md,
                      border: `2px solid ${newSessionType === 'drill' ? COLORS.primary : COLORS.textMuted}`,
                      backgroundColor: newSessionType === 'drill' ? COLORS.primaryLight : COLORS.white,
                      cursor: 'pointer',
                      ...TYPOGRAPHY.body,
                      color: COLORS.textPrimary,
                    }}
                  >
                    <input
                      type="radio"
                      name="add-session-type"
                      value="drill"
                      checked={newSessionType === 'drill'}
                      onChange={() => setNewSessionType('drill')}
                      style={{ width: 18, height: 18, accentColor: COLORS.primary }}
                    />
                    Drill
                  </label>
                </div>
              </div>

              <div>
                <span
                  style={{
                    display: 'block',
                    ...TYPOGRAPHY.label,
                    color: COLORS.textSecondary,
                    marginBottom: SPACING.sm,
                  }}
                >
                  Students
                </span>
                <div
                  style={{
                    maxHeight: 160,
                    overflow: 'auto',
                    border: `1px solid ${COLORS.textMuted}`,
                    borderRadius: RADIUS.md,
                    padding: SPACING.xs,
                  }}
                >
                  {supabaseStudentsLoading && (
                    <div style={{ padding: SPACING.lg, ...TYPOGRAPHY.body, color: COLORS.textSecondary }}>
                      Loading students…
                    </div>
                  )}
                  {!supabaseStudentsLoading && supabaseStudentsError && (
                    <div style={{ padding: SPACING.lg, ...TYPOGRAPHY.bodySmall, color: COLORS.red }}>
                      {supabaseStudentsError}
                    </div>
                  )}
                  {!supabaseStudentsLoading && !supabaseStudentsError && supabaseStudents.length === 0 && (
                    <div style={{ padding: SPACING.lg, ...TYPOGRAPHY.body, color: COLORS.textSecondary }}>
                      No students in database. Add accounts in Supabase Auth and a profiles row per user.
                    </div>
                  )}
                  {!supabaseStudentsLoading && !supabaseStudentsError && supabaseStudents.map((s) => (
                    <label
                      key={s.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: SPACING.sm,
                        padding: SPACING.sm,
                        cursor: 'pointer',
                        borderRadius: RADIUS.sm,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={newSessionStudentIds.includes(s.id)}
                        onChange={() => toggleStudentForNewSession(s.id)}
                        style={{ width: 18, height: 18, accentColor: COLORS.primary }}
                      />
                      <span style={{ ...TYPOGRAPHY.body, color: COLORS.textPrimary }}>{s.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {addSessionError && (
              <div
                style={{
                  marginTop: SPACING.lg,
                  padding: SPACING.md,
                  borderRadius: RADIUS.md,
                  backgroundColor: 'rgba(255,107,107,0.1)',
                  color: COLORS.red,
                  ...TYPOGRAPHY.bodySmall,
                }}
              >
                {addSessionError}
              </div>
            )}
            <div
              style={{
                display: 'flex',
                gap: SPACING.md,
                marginTop: SPACING.xxl,
              }}
            >
              <button
                type="button"
                onClick={closeAddSessionSheet}
                disabled={addSessionSaving}
                style={{
                  flex: 1,
                  padding: `${SPACING.sm}px ${SPACING.lg}px`,
                  borderRadius: 9999,
                  border: `1px solid ${COLORS.textMuted}`,
                  backgroundColor: COLORS.white,
                  color: COLORS.textSecondary,
                  ...TYPOGRAPHY.bodySmall,
                  fontWeight: 600,
                  cursor: addSessionSaving ? 'not-allowed' : 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!canAddSession || addSessionSaving}
                onClick={handleAddSession}
                style={{
                  flex: 1,
                  padding: `${SPACING.sm}px ${SPACING.lg}px`,
                  borderRadius: 9999,
                  border: 'none',
                  backgroundColor: canAddSession && !addSessionSaving ? COLORS.primary : COLORS.textMuted,
                  color: '#fff',
                  ...TYPOGRAPHY.bodySmall,
                  fontWeight: 600,
                  cursor: canAddSession && !addSessionSaving ? 'pointer' : 'not-allowed',
                  boxShadow: canAddSession && !addSessionSaving ? '0 4px 12px rgba(49, 203, 0, 0.4)' : 'none',
                  opacity: canAddSession && !addSessionSaving ? 1 : 0.7,
                }}
              >
                {addSessionSaving ? 'Saving…' : 'Add session'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
