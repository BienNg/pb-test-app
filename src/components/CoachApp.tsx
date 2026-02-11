import React, { type ReactNode, useState, useEffect } from 'react';
import { globalStyles } from '../styles/globals';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS } from '../styles/theme';
import { CoachSchedulePage } from './CoachSchedulePage';
import { CoachStudentsPage } from './CoachStudentsPage';
import { LessonsPage } from './LessonsPage';
import { MyProgressPage } from './MyProgressPage';
import type { StudentInfo } from './CoachStudentsPage';

type CoachTabId = 'schedule' | 'students' | 'library';

export const CoachApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<CoachTabId>('schedule');
  const [selectedStudent, setSelectedStudent] = useState<StudentInfo | null>(null);

  useEffect(() => {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = globalStyles;
    document.head.appendChild(styleSheet);
    return () => {
      document.head.removeChild(styleSheet);
    };
  }, []);

  // When viewing a student's progress, show full-screen overlay
  if (selectedStudent) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'transparent' }}>
        <MyProgressPage
          title={`${selectedStudent.name}'s Progress`}
          onBack={() => setSelectedStudent(null)}
        />
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'schedule':
        return <CoachSchedulePage />;
      case 'students':
        return <CoachStudentsPage onSelectStudent={setSelectedStudent} />;
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
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
      ),
    },
  ];

  const profileIcon = (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
          {tabs.slice(0, 1).map((tab) => {
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
                  padding: SPACING.xs,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  color: isActive ? COLORS.textPrimary : COLORS.textSecondary,
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{tab.icon}</span>
                <span style={{ ...TYPOGRAPHY.label, fontWeight: isActive ? 600 : 500, color: isActive ? COLORS.textPrimary : COLORS.textSecondary }}>
                  {tab.label}
                </span>
                <div style={{ height: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isActive && (
                    <div style={{ width: 20, height: 2, borderRadius: 999, backgroundColor: COLORS.primary }} />
                  )}
                </div>
              </button>
            );
          })}
          {tabs.slice(1, 2).map((tab) => {
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
                  padding: SPACING.xs,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  color: isActive ? COLORS.textPrimary : COLORS.textSecondary,
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{tab.icon}</span>
                <span style={{ ...TYPOGRAPHY.label, fontWeight: isActive ? 600 : 500, color: isActive ? COLORS.textPrimary : COLORS.textSecondary }}>
                  {tab.label}
                </span>
                <div style={{ height: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isActive && (
                    <div style={{ width: 20, height: 2, borderRadius: 999, backgroundColor: COLORS.primary }} />
                  )}
                </div>
              </button>
            );
          })}
          <div style={{ flex: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <button
              type="button"
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
          {tabs.slice(2, 3).map((tab) => {
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
                  padding: SPACING.xs,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  color: isActive ? COLORS.textPrimary : COLORS.textSecondary,
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{tab.icon}</span>
                <span style={{ ...TYPOGRAPHY.label, fontWeight: isActive ? 600 : 500, color: isActive ? COLORS.textPrimary : COLORS.textSecondary }}>
                  {tab.label}
                </span>
                <div style={{ height: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isActive && (
                    <div style={{ width: 20, height: 2, borderRadius: 999, backgroundColor: COLORS.primary }} />
                  )}
                </div>
              </button>
            );
          })}
          <div
            style={{
              flex: 1,
              padding: SPACING.xs,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              color: COLORS.textSecondary,
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{profileIcon}</span>
            <span style={{ ...TYPOGRAPHY.label, fontWeight: 500, color: COLORS.textSecondary }}>Profile</span>
            <div style={{ height: 5 }} />
          </div>
        </div>
      </nav>
    </main>
  );
};
