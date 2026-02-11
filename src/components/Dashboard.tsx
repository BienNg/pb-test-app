import React, { useState } from 'react';
import { COLORS, SPACING, TYPOGRAPHY } from '../styles/theme';
import { StatCard } from './BaseComponents';
import { BookingCalendar } from './BookingCalendar';
import { UpcomingLessonCard } from './Cards';
import { IconCheck, IconClock } from './Icons';
import { MOCK_COACHES } from '../data/mockCoaches';

type TabId = 'home' | 'progress' | 'library';

interface DashboardProps {
  onNavigateToTab?: (tab: TabId) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigateToTab }) => {
  const [selectedCoachId, setSelectedCoachId] = useState<string | null>(null);
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
        <div style={{ marginBottom: `${SPACING.lg}px` }}>
          <h1
            style={{
              ...TYPOGRAPHY.h1,
              color: COLORS.textPrimary,
              margin: 0,
              marginBottom: SPACING.md,
            }}
          >
            Welcome back, Alex
          </h1>
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
            title="Video Lessons Completed"
            value="12"
            unit="of 16"
            icon={<IconCheck size={24} />}
            accentColor={COLORS.primary}
            onClick={onNavigateToTab ? () => onNavigateToTab('library') : undefined}
          />
          <StatCard
            title="Training Hours"
            value="18.5"
            unit="hrs"
            icon={<IconClock size={24} />}
            accentColor={COLORS.blue}
            onClick={onNavigateToTab ? () => onNavigateToTab('progress') : undefined}
          />
        </div>

        {/* Upcoming Lesson */}
        <div style={{ marginBottom: `${SPACING.lg}px` }}>
          <UpcomingLessonCard
            coachName="Coach Sarah Martinez"
            date="Saturday, Feb 8, 2025"
            timeRange="2:00 PM – 3:00 PM"
            address="123 Sunset Blvd, San Diego, CA"
            courtName="Court 3"
            otherParticipants={['Jamie', 'Morgan']}
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
