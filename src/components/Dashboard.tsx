import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { COLORS, SPACING, TYPOGRAPHY } from '../styles/theme';
import { StatCard } from './BaseComponents';
import { BookingCalendar } from './BookingCalendar';
import { UpcomingLessonCard } from './Cards';
import { IconCheck, IconClock, IconUser } from './Icons';
import { useAuth } from './providers/AuthProvider';
import { MOCK_COACHES } from '../data/mockCoaches';
import coachJamesKim from '../assets/coach-profile-pictures/3b1cfb78-b2ba-4cc5-a57a-42f9247304c9.png';

type TabId = 'home' | 'progress' | 'library';

interface DashboardProps {
  onNavigateToTab?: (tab: TabId) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigateToTab }) => {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [selectedCoachId, setSelectedCoachId] = useState<string | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profileMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileMenuOpen]);

  return (
    <div
      style={{
        backgroundColor: 'transparent',
        width: '100%',
        boxSizing: 'border-box',
        overflowX: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Container - Max width for readability */}
      <div
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box',
          padding: `${SPACING.md}px`,
        }}
      >
        {/* Header */}
        <div
          style={{
            marginBottom: `${SPACING.lg}px`,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: SPACING.md,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1
              style={{
                ...TYPOGRAPHY.h1,
                color: COLORS.textPrimary,
                margin: 0,
                marginBottom: 4,
              }}
            >
              Welcome back, Alex
            </h1>
            {user?.email && (
              <p
                style={{
                  ...TYPOGRAPHY.body,
                  color: COLORS.textSecondary,
                  margin: 0,
                  marginBottom: SPACING.md,
                }}
              >
                {user.email}
              </p>
            )}
          </div>
          <div style={{ position: 'relative', flexShrink: 0 }} ref={profileMenuRef}>
            <button
              type="button"
              onClick={() => setProfileMenuOpen((o) => !o)}
              aria-label="Profile menu"
              aria-expanded={profileMenuOpen}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 40,
                height: 40,
                borderRadius: '50%',
                border: 'none',
                background: COLORS.backgroundLight,
                color: COLORS.textPrimary,
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              }}
            >
              <IconUser size={22} />
            </button>
            {profileMenuOpen && (
              <div
                role="menu"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '100%',
                  marginTop: 4,
                  minWidth: 140,
                  padding: 4,
                  background: COLORS.white,
                  borderRadius: 8,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                  zIndex: 10,
                }}
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={async () => {
                    setProfileMenuOpen(false);
                    await signOut();
                    router.replace('/login');
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: 'none',
                    borderRadius: 6,
                    background: 'transparent',
                    color: COLORS.textPrimary,
                    ...TYPOGRAPHY.body,
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = COLORS.backgroundLight;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: `${SPACING.lg}px`,
            marginBottom: `${SPACING.lg}px`,
          }}
        >
          {/* Quick Stats */}
          <StatCard
            title="Training Hours"
            value="18.5"
            unit="hrs"
            icon={<IconClock size={16} />}
            accentColor={COLORS.statIconMuted}
            onClick={onNavigateToTab ? () => onNavigateToTab('progress') : undefined}
          />
          <StatCard
            title="Video Lessons Completed"
            value="12"
            unit="of 16"
            icon={<IconCheck size={16} />}
            accentColor={COLORS.statIconMuted}
            onClick={onNavigateToTab ? () => onNavigateToTab('library') : undefined}
          />
        </div>

        {/* Upcoming Lesson */}
        <div style={{ marginBottom: `${SPACING.lg}px` }}>
          <UpcomingLessonCard
            coachName="Coach James Kim"
            date="Saturday, Feb 8, 2025"
            timeRange="2:00 PM – 3:00 PM"
            address="123 Sunset Blvd, San Diego, CA"
            courtName="Court 3"
            otherParticipants={['Jamie', 'Morgan']}
            profilePicture={coachJamesKim.src}
          />
        </div>

        {/* Booking Calendar */}
        <div style={{ paddingBottom: SPACING.xxl }}>
          <BookingCalendar
            coaches={MOCK_COACHES.map((c) => ({ id: c.id, name: c.name, tier: c.tier, hourlyRate: c.hourlyRate }))}
            selectedCoachId={selectedCoachId}
            onCoachSelect={setSelectedCoachId}
            onTimeSlotSelect={(date, time) => {
              const coach = selectedCoachId ? MOCK_COACHES.find((c) => c.id === selectedCoachId) : null;
              console.log('Booked:', date, time, coach ? `with ${coach.name} (${coach.tier})` : '');
            }}
          />
        </div>
      </div>
    </div>
  );
};
