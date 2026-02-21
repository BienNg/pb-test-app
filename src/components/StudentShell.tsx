'use client';

import { type ReactNode, useState } from 'react';
import { COLORS, TYPOGRAPHY, SHADOWS } from '../styles/theme';
import { Dashboard } from './Dashboard';
import { LessonsPage } from './LessonsPage';
import { MyProgressPage } from './MyProgressPage';
import { TrainingSessionDetail } from './TrainingSessionDetail';

type TabId = 'home' | 'progress' | 'library';

export function StudentShell() {
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [activeTrainingSessionId, setActiveTrainingSessionId] = useState<number | null>(null);

  const renderContent = () => {
    if (activeTrainingSessionId != null) {
      return (
        <TrainingSessionDetail
          sessionId={activeTrainingSessionId}
          onBack={() => setActiveTrainingSessionId(null)}
        />
      );
    }
    switch (activeTab) {
      case 'home':
        return <Dashboard onNavigateToTab={setActiveTab} />;
      case 'progress':
        return (
          <MyProgressPage
            onOpenSession={(sessionId) => setActiveTrainingSessionId(sessionId)}
          />
        );
      case 'library':
        return <LessonsPage />;
      default:
        return <Dashboard />;
    }
  };

  const tabs: { id: TabId; label: string; icon: ReactNode }[] = [
    {
      id: 'home',
      label: 'Home',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    },
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
