import React, { useState, useEffect } from 'react';
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
      <div style={{ minHeight: '100vh', backgroundColor: COLORS.background }}>
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

  const tabs: { id: CoachTabId; label: string; icon: string }[] = [
    { id: 'schedule', label: 'Schedule', icon: '📅' },
    { id: 'students', label: 'Students', icon: '👥' },
    { id: 'library', label: 'Library', icon: '🎬' },
  ];

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
            gap: SPACING.lg,
          }}
        >
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1,
                  background: 'none',
                  border: 'none',
                  padding: SPACING.xs,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  color: isActive ? COLORS.textPrimary : COLORS.textSecondary,
                }}
              >
                <span style={{ fontSize: 20 }}>{tab.icon}</span>
                <span
                  style={{
                    ...TYPOGRAPHY.label,
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? COLORS.textPrimary : COLORS.textSecondary,
                  }}
                >
                  {tab.label}
                </span>
                {isActive && (
                  <div
                    style={{
                      width: 24,
                      height: 3,
                      borderRadius: 999,
                      backgroundColor: COLORS.primary,
                      marginTop: 2,
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </main>
  );
};
