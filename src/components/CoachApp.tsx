'use client';

import React, { type ReactNode, useState, useEffect, useCallback } from 'react';
import { COLORS, TYPOGRAPHY, SHADOWS } from '../styles/theme';
import { CoachSchedulePage } from './CoachSchedulePage';
import { CoachStudentsPage } from './CoachStudentsPage';
import { LessonsPage } from './LessonsPage';
import { GameAnalyticsPage } from './GameAnalyticsPage';
import { TrainingSessionDetail } from './TrainingSessionDetail';
import type { StudentInfo } from './CoachStudentsPage';
import type { TrainingSession } from './GameAnalyticsPage';
import { createClient } from '@/lib/supabase/client';
import { fetchSessionsForStudent, fetchSessionCountsForStudentIds, fetchFirstSessionDateForStudentIds } from '@/lib/studentSessions';
import { insertShotVideo } from '@/lib/shotVideos';

type CoachTabId = 'schedule' | 'students' | 'library';

export const CoachApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<CoachTabId>('schedule');
  const [selectedStudent, setSelectedStudent] = useState<StudentInfo | null>(null);
  const [studentSegment, setStudentSegment] = useState<'videos' | 'roadmap'>('videos');
  const [openShotTitle, setOpenShotTitle] = useState<string | null>(null);
  const [activeTrainingSessionId, setActiveTrainingSessionId] = useState<string | null>(null);
  const [overrideSession, setOverrideSession] = useState<TrainingSession | null>(null);
  const [sessionsForStudent, setSessionsForStudent] = useState<TrainingSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [, setLoadingStudents] = useState(false);

  const reloadSelectedStudentSessions = useCallback(async () => {
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

  const reloadStudents = useCallback(async () => {
    setLoadingStudents(true);
    try {
      const supabase = createClient();
      if (!supabase) {
        console.error('Supabase client is not configured.');
        setStudents([]);
        return;
      }
      const { data, error } = await supabase.from('profiles').select('id, email, full_name, role');
      if (error) {
        console.error('Error loading students:', error);
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
      const firstSessionDates = await fetchFirstSessionDateForStudentIds(supabase, studentIds);
      
      setStudents(
        filtered.map((r) => {
          const firstSessionDate = firstSessionDates[r.id];
          let joinedDate = '—';
          if (firstSessionDate) {
            const d = new Date(firstSessionDate + 'T12:00:00');
            joinedDate = d.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
          }
          return {
            id: r.id,
            name: r.full_name?.trim() || r.email || r.id,
            email: r.email ?? '',
            lessonsCompleted: sessionCounts[r.id] ?? 0,
            lastActive: joinedDate,
            joinedDate: joinedDate,
          };
        })
      );
    } catch (err) {
      console.error('Failed to load students:', err);
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'students') {
      void reloadStudents();
    }
  }, [activeTab, reloadStudents]);

  useEffect(() => {
    if (!selectedStudent) {
      queueMicrotask(() => setSessionsForStudent([]));
      return;
    }
    void reloadSelectedStudentSessions();
  }, [selectedStudent, selectedStudent?.id, reloadSelectedStudentSessions]);

  // When viewing a training session detail (or shot video), show full-screen overlay
  if (activeTrainingSessionId != null) {
    const sessionsToUse = overrideSession ? [overrideSession] : sessionsForStudent;
    const breadcrumbFromRoadmap =
      overrideSession && selectedStudent
        ? { studentName: selectedStudent.name, shotTitle: overrideSession.title }
        : undefined;
    return (
      <div style={{ height: 'calc(100vh - 80px)', overflow: 'hidden', display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff' }}>
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
          onSessionUpdated={reloadSelectedStudentSessions}
          onDeleteSession={overrideSession ? undefined : async () => { await reloadSelectedStudentSessions(); }}
          breadcrumbFromRoadmap={breadcrumbFromRoadmap}
          onBreadcrumbShotClick={(shotTitle) => {
            setOpenShotTitle(shotTitle);
            setActiveTrainingSessionId(null);
            setOverrideSession(null);
            setStudentSegment('roadmap');
          }}
        />
      </div>
    );
  }

  // When viewing a student's progress, show full-screen overlay (sessions from DB)
  if (selectedStudent) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#ffffff' }}>
        <GameAnalyticsPage
          title={`${selectedStudent.name}'s Game Analytics`}
          studentName={selectedStudent.name}
          studentId={selectedStudent.id}
          selectedSegment={studentSegment}
          onSelectedSegmentChange={setStudentSegment}
          onBack={() => setSelectedStudent(null)}
          onOpenSession={(sessionId: string) => {
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
        />
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'schedule':
        return <CoachSchedulePage />;
      case 'students':
        return (
          <CoachStudentsPage
            students={students}
            onSelectStudent={setSelectedStudent}
            onOpenSession={(sessionId: string) => setActiveTrainingSessionId(sessionId)}
          />
        );
      case 'library':
        return <LessonsPage />;
      default:
        return <CoachSchedulePage />;
    }
  };

  const tabs: { id: CoachTabId; label: string; icon: ReactNode }[] = [
    {
      id: 'schedule',
      label: 'Schedule',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
    },
    {
      id: 'students',
      label: 'Students',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      id: 'library',
      label: 'Library',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
      ),
    },
  ];

  const profileIcon = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );

  return (
    <main
      style={{
        width: '100%',
        minHeight: '100vh',
        paddingBottom: 80,
        boxSizing: 'border-box',
        position: 'relative',
        backgroundColor: '#ffffff',
      }}
    >
      {renderContent()}

      <nav
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
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {tabs.slice(0, 1).map((tab) => {
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  type="button"
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
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{tab.icon}</span>
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
                          backgroundColor: COLORS.primary,
                        }}
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {tabs.slice(1, 2).map((tab) => {
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  type="button"
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
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{tab.icon}</span>
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
                          backgroundColor: COLORS.primary,
                        }}
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          {/* Big Add button (no functionality) - floats above nav, centered */}
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
              style={{
                position: 'absolute',
                left: '50%',
                top: 0,
                transform: 'translate(-50%, -38%)',
                width: 58,
                height: 58,
                borderRadius: '50%',
                backgroundColor: COLORS.primary,
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(49, 203, 0, 0.4)',
                cursor: 'default',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {tabs.slice(2, 3).map((tab) => {
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  type="button"
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
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{tab.icon}</span>
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
                          backgroundColor: COLORS.primary,
                        }}
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          {/* Person - visual only, no functionality yet */}
          <div
            style={{
              flex: 1,
              padding: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              color: COLORS.textSecondary,
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{profileIcon}</span>
            <span style={{ ...TYPOGRAPHY.label, fontSize: 11, fontWeight: 500, color: COLORS.textSecondary, whiteSpace: 'nowrap' }}>Profile</span>
            <div style={{ height: 4 }} />
          </div>
        </div>
      </nav>
    </main>
  );
};
