import { type ReactNode, useEffect, useState } from 'react';
import './App.css';
import { globalStyles } from './styles/globals';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS } from './styles/theme';
import { Dashboard } from './components/Dashboard';
import { CoachApp } from './components/CoachApp';
import { LessonsPage } from './components/LessonsPage';
import { MyProgressPage } from './components/MyProgressPage';

type TabId = 'home' | 'progress' | 'library';

function App() {
  const [isCoachRoute, setIsCoachRoute] = useState(() => window.location.pathname === '/coach');
  const [activeTab, setActiveTab] = useState<TabId>('home');

  useEffect(() => {
    const onPopState = () => setIsCoachRoute(window.location.pathname === '/coach');
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  if (isCoachRoute) {
    return <CoachApp />;
  }

  useEffect(() => {
    // Inject global styles
    const styleSheet = document.createElement('style');
    styleSheet.textContent = globalStyles;
    document.head.appendChild(styleSheet);

    return () => {
      document.head.removeChild(styleSheet);
    };
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <Dashboard onNavigateToTab={setActiveTab} />;
      case 'progress':
        return <MyProgressPage />;
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
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    },
    {
      id: 'progress',
      label: 'My Progress',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
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

  const rightTab = (
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
                onClick={() => setActiveTab(tab.id)}
                type="button"
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
                <span
                  style={{
                    ...TYPOGRAPHY.label,
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? COLORS.textPrimary : COLORS.textSecondary,
                  }}
                >
                  {tab.label}
                </span>
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
              </button>
            );
          })}
          {/* My Progress */}
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
                  padding: SPACING.xs,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  color: isActive ? COLORS.textPrimary : COLORS.textSecondary,
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{tab.icon}</span>
                <span
                  style={{
                    ...TYPOGRAPHY.label,
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? COLORS.textPrimary : COLORS.textSecondary,
                  }}
                >
                  {tab.label}
                </span>
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
              </button>
            );
          })}
          {/* Big Add button (no functionality) - vertically centered */}
          <div
            style={{
              flex: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
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
          {/* Library */}
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
                  padding: SPACING.xs,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  color: isActive ? COLORS.textPrimary : COLORS.textSecondary,
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{tab.icon}</span>
                <span
                  style={{
                    ...TYPOGRAPHY.label,
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? COLORS.textPrimary : COLORS.textSecondary,
                  }}
                >
                  {tab.label}
                </span>
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
              </button>
            );
          })}
          {/* Person - visual only, no functionality yet */}
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
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{rightTab}</span>
            <span style={{ ...TYPOGRAPHY.label, fontWeight: 500, color: COLORS.textSecondary }}>Profile</span>
            <div style={{ height: 5 }} />
          </div>
        </div>
      </nav>
    </main>
  );
}

export default App;
