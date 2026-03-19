'use client';

import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { COLORS, TYPOGRAPHY, SHADOWS, SPACING } from '../styles/theme';
import { LessonsPage } from './LessonsPage';
import { GameAnalyticsPage, RoadmapSkillsChecklist, type TrainingSession } from './GameAnalyticsPage';
import { PlayerProfileLoadingScreen } from './PlayerProfileLoadingScreen';
import { TrainingSessionDetail } from './TrainingSessionDetail';
import { createClient } from '@/lib/supabase/client';
import { fetchSessionsForStudent } from '@/lib/studentSessions';
import { fetchShotVideoCountsByShot } from '@/lib/shotVideos';
import { useAuth } from './providers/AuthProvider';

const SESSION_DETAIL_TRANSITION_MS = 280;

/** Wraps session detail overlay and runs enter animation (slide-up) when visible. Opaque immediately so the view switches. */
function SessionDetailOverlay({
  visible,
  height,
  children,
}: {
  visible: boolean;
  height: string;
  children: ReactNode;
}) {
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    if (!visible) {
      const id = requestAnimationFrame(() => setEntered(false));
      return () => cancelAnimationFrame(id);
    }
    const id = requestAnimationFrame(() => {
      setEntered(true);
    });
    return () => cancelAnimationFrame(id);
  }, [visible]);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height,
        overflow: 'hidden',
        display: visible ? 'flex' : 'none',
        flexDirection: 'column',
        backgroundColor: '#f6f8f8',
        zIndex: 50,
        opacity: visible ? 1 : 0,
        transform: visible && entered ? 'translateY(0)' : 'translateY(16px)',
        transition: `transform ${SESSION_DETAIL_TRANSITION_MS}ms ease-out`,
      }}
    >
      {children}
    </div>
  );
}

type TabId = 'roadmap' | 'sessions' | 'library';

export function StudentShell() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('sessions');
  const [activeTrainingSessionId, setActiveTrainingSessionId] = useState<string | null>(null);
  const [overrideSession, setOverrideSession] = useState<TrainingSession | null>(null);
  const [viewingLessonDetail, setViewingLessonDetail] = useState(false);
  const [_shotDetailOpen, setShotDetailOpen] = useState(false);
  const [openShotTitle, setOpenShotTitle] = useState<string | null>(null);
  const [sessionsForStudent, setSessionsForStudent] = useState<TrainingSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [shotVideoCountByShotId, setShotVideoCountByShotId] = useState<Record<string, number>>({});
  const [showTutorialsComingSoon, setShowTutorialsComingSoon] = useState(false);

  const handleTabClick = (tabId: TabId) => {
    setActiveTab(tabId);
  };

  const reloadSessions = useCallback(async () => {
    if (!user?.id) return;
    const supabase = createClient();
    setLoadingSessions(true);
    try {
      const sessions = await fetchSessionsForStudent(supabase, user.id);
      setSessionsForStudent(sessions);
    } finally {
      setLoadingSessions(false);
    }
  }, [user?.id]);

  // Load DB-backed sessions for the logged-in student so ids line up with Supabase.
  useEffect(() => {
    void reloadSessions();
  }, [reloadSessions]);

  // Shot video counts per shot for roadmap (badge + same sort as admin: descending by session count).
  useEffect(() => {
    if (!user?.id) {
      setShotVideoCountByShotId({});
      return;
    }
    const supabase = createClient();
    if (!supabase) return;
    let cancelled = false;
    (async () => {
      const counts = await fetchShotVideoCountsByShot(supabase, user.id);
      if (!cancelled) setShotVideoCountByShotId(counts);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const showRoadmap = activeTab === 'roadmap';
  const showSessions = activeTab === 'sessions';
  const showLibrary = activeTab === 'library';
  const showSessionOverlay = activeTrainingSessionId != null;
  const hideBottomNav = showSessionOverlay || viewingLessonDetail;

  const allTabs: { id: TabId; label: string; icon: ReactNode }[] = [
    {
      id: 'sessions',
      label: 'Game Analytics',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        </svg>
      ),
    },
    {
      id: 'roadmap',
      label: 'Roadmap',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
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
  // Hide Library tab for now
  const tabs = allTabs.filter((t) => t.id !== 'library');

  return (
    <main
      style={{
        width: '100%',
        minHeight: '100vh',
        paddingBottom: hideBottomNav ? 0 : 80,
        boxSizing: 'border-box',
        position: 'relative',
        backgroundColor: '#f6f8f8',
      }}
    >
      {/* Roadmap tab content — hide when session overlay is open so view switches to detail */}
      <div
        style={{
          display: showRoadmap && !showSessionOverlay ? 'block' : 'none',
          height: 'calc(100vh - 80px)',
          overflow: 'auto',
          padding: 24,
          backgroundColor: '#f6f8f8',
          boxSizing: 'border-box',
        }}
        aria-hidden={!showRoadmap}
      >
        <RoadmapSkillsChecklist
          sessionCountByShotId={shotVideoCountByShotId}
          onShotDetailOpenChange={setShotDetailOpen}
          onWatchTutorial={() => setShowTutorialsComingSoon(true)}
          onOpenShotVideo={(session) => {
            setOverrideSession(session);
            setActiveTrainingSessionId(session.id);
          }}
          openShotTitle={openShotTitle}
          onOpenShotTitleConsumed={() => setOpenShotTitle(null)}
          hideShotAnalyticsTab
        />
      </div>
      {/* Game Analytics tab content */}
      <div
        style={{
          display: showSessions && !showSessionOverlay ? 'block' : 'none',
          height: 'calc(100vh - 80px)',
          overflow: 'auto',
        }}
        aria-hidden={!showSessions}
      >
        {loadingSessions ? (
          <PlayerProfileLoadingScreen />
        ) : (
        <GameAnalyticsPage
          hideSegmentSwitcher
          onOpenRoadmap={() => setActiveTab('roadmap')}
          onOpenShotDetail={(shotTitle) => {
            setOpenShotTitle(shotTitle);
            setActiveTab('roadmap');
          }}
          onOpenSession={(sessionId) => {
            setOverrideSession(null);
            setActiveTrainingSessionId(sessionId);
          }}
          onOpenShotVideo={(session) => {
            setOverrideSession(session);
            setActiveTrainingSessionId(session.id);
          }}
          sessions={sessionsForStudent}
          onOpenLibrary={() => setShowTutorialsComingSoon(true)}
        />
        )}
      </div>
      {/* Library tab — hide when session overlay is open so view switches to detail */}
      <div
        style={{
          display: showLibrary && !showSessionOverlay ? 'block' : 'none',
          height: hideBottomNav && viewingLessonDetail ? '100vh' : 'calc(100vh - 80px)',
          overflow: 'auto',
        }}
        aria-hidden={!showLibrary}
      >
        <LessonsPage onLessonViewChange={setViewingLessonDetail} />
      </div>
      {/* Keep session detail mounted when a session is open so video position is preserved; hide when on another tab and pause video */}
      {activeTrainingSessionId != null && (
        <SessionDetailOverlay
          visible={showSessionOverlay}
          height={showSessionOverlay ? '100vh' : 'calc(100vh - 80px)'}
        >
          <TrainingSessionDetail
            sessionId={activeTrainingSessionId}
            onBack={() => {
              const wasFromRoadmap = overrideSession != null;
              setActiveTrainingSessionId(null);
              setOverrideSession(null);
              if (wasFromRoadmap) {
                setActiveTab('roadmap');
              }
            }}
            sessions={overrideSession ? [overrideSession] : sessionsForStudent}
            onSessionUpdated={reloadSessions}
            onDeleteSession={overrideSession ? undefined : async () => { await reloadSessions(); }}
            isTabVisible={showSessionOverlay}
            breadcrumbFromRoadmap={
              overrideSession ? { shotTitle: overrideSession.title } : undefined
            }
            onBreadcrumbShotClick={(shotTitle) => {
              setOpenShotTitle(shotTitle);
              setActiveTrainingSessionId(null);
              setOverrideSession(null);
              setActiveTab('roadmap');
            }}
          />
        </SessionDetailOverlay>
      )}

      {!hideBottomNav && (
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
            {tabs.map((tab) => {
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
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

      {/* Tutorials coming soon info popup (library is deactivated) */}
      {showTutorialsComingSoon && (
        <div
          role="presentation"
          onClick={() => setShowTutorialsComingSoon(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 300,
            backgroundColor: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: SPACING.lg,
          }}
        >
          <div
            role="dialog"
            aria-label="Tutorials coming soon"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.key === 'Escape' && setShowTutorialsComingSoon(false)}
            style={{
              backgroundColor: COLORS.white,
              borderRadius: 12,
              padding: SPACING.xl,
              maxWidth: 320,
              width: '100%',
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            }}
          >
            <h3 style={{ ...TYPOGRAPHY.h3, color: COLORS.textPrimary, margin: `0 0 ${SPACING.md}px` }}>
              Tutorials coming soon
            </h3>
            <p style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, margin: `0 0 ${SPACING.lg}px` }}>
              Video tutorials are on the way. Check back soon!
            </p>
            <button
              type="button"
              onClick={() => setShowTutorialsComingSoon(false)}
              style={{
                width: '100%',
                padding: '12px 24px',
                borderRadius: 8,
                backgroundColor: COLORS.libraryPrimary,
                color: COLORS.textPrimary,
                border: 'none',
                fontWeight: 600,
                fontSize: 16,
                cursor: 'pointer',
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
