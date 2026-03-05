'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { COLORS, TYPOGRAPHY, SHADOWS } from '../styles/theme';
import { LessonsPage } from './LessonsPage';
import { MyProgressPage, type TrainingSession } from './MyProgressPage';
import { TrainingSessionDetail } from './TrainingSessionDetail';
import { createClient } from '@/lib/supabase/client';
import { fetchSessionsForStudent } from '@/lib/studentSessions';
import { useAuth } from './providers/AuthProvider';

type TabId = 'progress' | 'library';

export function StudentShell() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('progress');
  const [progressSelectedSegment, setProgressSelectedSegment] = useState<'videos' | 'duprCoach'>('videos');
  const [activeTrainingSessionId, setActiveTrainingSessionId] = useState<string | null>(null);
  const [sessionsForStudent, setSessionsForStudent] = useState<TrainingSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const handleTabClick = (tabId: TabId) => {
    setActiveTrainingSessionId(null);
    setActiveTab(tabId);
  };

  // Load DB-backed sessions for the logged-in student so ids line up with Supabase.
  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      const supabase = createClient();
      setLoadingSessions(true);
      try {
        const sessions = await fetchSessionsForStudent(supabase, user.id);
        setSessionsForStudent(sessions);
      } finally {
        setLoadingSessions(false);
      }
    };
    load();
  }, [user?.id]);

  const renderContent = () => {
    if (activeTrainingSessionId != null) {
      return (
        <TrainingSessionDetail
          sessionId={activeTrainingSessionId}
          onBack={() => setActiveTrainingSessionId(null)}
          sessions={sessionsForStudent.length > 0 ? sessionsForStudent : undefined}
        />
      );
    }
    switch (activeTab) {
      case 'progress':
        return (
          <MyProgressPage
            selectedSegment={progressSelectedSegment}
            onSelectedSegmentChange={setProgressSelectedSegment}
            onOpenSession={(sessionId) => setActiveTrainingSessionId(sessionId)}
            sessions={loadingSessions ? [] : sessionsForStudent.length > 0 ? sessionsForStudent : undefined}
          />
        );
      case 'library':
        return <LessonsPage />;
      default:
        return (
          <MyProgressPage
            selectedSegment={progressSelectedSegment}
            onSelectedSegmentChange={setProgressSelectedSegment}
            onOpenSession={(sessionId) => setActiveTrainingSessionId(sessionId)}
            sessions={loadingSessions ? [] : sessionsForStudent.length > 0 ? sessionsForStudent : undefined}
          />
        );
    }
  };

  const tabs: { id: TabId; label: string; icon: ReactNode }[] = [
    {
      id: 'progress',
      label: 'My Progress',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
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

  const rightTab = (
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
                        backgroundColor: COLORS.primary,
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
              padding: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              color: COLORS.textSecondary,
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{rightTab}</span>
            <span style={{ ...TYPOGRAPHY.label, fontSize: 11, fontWeight: 500, color: COLORS.textSecondary, whiteSpace: 'nowrap' }}>Profile</span>
            <div style={{ height: 4 }} />
          </div>
        </div>
      </nav>
    </main>
  );
}
