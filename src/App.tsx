import { useEffect, useState } from 'react';
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

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'progress', label: 'My Progress', icon: '📈' },
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
                      backgroundColor: COLORS.lavender,
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
}

export default App;
