import React, { useState } from 'react';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../styles/theme';
import { Card } from './BaseComponents';
import { IconUser, IconChevronRight } from './Icons';
import { LessonCard } from './Cards';
import { TRAINING_SESSIONS } from './MyProgressPage';

export interface StudentInfo {
  id: string;
  name: string;
  email?: string;
  lessonsCompleted?: number;
  lastActive?: string;
  avatar?: string;
}

// Mock students for the coach
const MOCK_STUDENTS: StudentInfo[] = [
  { id: '1', name: 'Alex Chen', email: 'alex@example.com', lessonsCompleted: 12, lastActive: 'Feb 5, 2026' },
  { id: '2', name: 'Jamie Lee', email: 'jamie@example.com', lessonsCompleted: 8, lastActive: 'Feb 4, 2026' },
  { id: '3', name: 'Morgan Taylor', email: 'morgan@example.com', lessonsCompleted: 15, lastActive: 'Feb 6, 2026' },
  { id: '4', name: 'Riley Smith', email: 'riley@example.com', lessonsCompleted: 5, lastActive: 'Feb 2, 2026' },
  { id: '5', name: 'Jordan Kim', email: 'jordan@example.com', lessonsCompleted: 3, lastActive: 'Jan 28, 2026' },
];

interface StudentCardProps {
  student: StudentInfo;
  onClick: () => void;
}

export const StudentCard: React.FC<StudentCardProps> = ({ student, onClick }) => (
  <Card onClick={onClick} padding={SPACING.lg} style={{ cursor: 'pointer' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.lg }}>
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: RADIUS.circle,
          backgroundColor: COLORS.primary,
          color: COLORS.textPrimary,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {student.avatar ?? <IconUser size={24} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3 style={{ ...TYPOGRAPHY.h3, color: COLORS.textPrimary, margin: 0, marginBottom: SPACING.xs }}>
          {student.name}
        </h3>
        {student.email && (
          <p style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, margin: 0, marginBottom: SPACING.xs }}>
            {student.email}
          </p>
        )}
        <div style={{ display: 'flex', gap: SPACING.lg, marginTop: SPACING.sm }}>
          {student.lessonsCompleted != null && (
            <span style={{ ...TYPOGRAPHY.label, color: COLORS.textSecondary }}>
              {student.lessonsCompleted} lessons
            </span>
          )}
          {student.lastActive && (
            <span style={{ ...TYPOGRAPHY.label, color: COLORS.textMuted }}>
              Last active: {student.lastActive}
            </span>
          )}
        </div>
      </div>
      <IconChevronRight size={20} style={{ color: COLORS.textMuted }} />
    </div>
  </Card>
);

interface CoachStudentsPageProps {
  students?: StudentInfo[];
  onSelectStudent: (student: StudentInfo) => void;
  onOpenSession?: (sessionId: number) => void;
}

export const CoachStudentsPage: React.FC<CoachStudentsPageProps> = ({
  students = MOCK_STUDENTS,
  onSelectStudent,
  onOpenSession,
}) => {
  const [selectedSegment, setSelectedSegment] = useState<'students' | 'mySession'>('students');
  const sessions = TRAINING_SESSIONS;

  return (
    <div
      style={{
        backgroundColor: 'transparent',
        minHeight: '100vh',
        padding: SPACING.md,
        width: '100%',
        boxSizing: 'border-box',
        overflowX: 'hidden',
      }}
    >
      <div style={{ maxWidth: 1400, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ marginBottom: SPACING.xl }}>
          <h1 style={{ ...TYPOGRAPHY.h1, color: COLORS.textPrimary, margin: 0, marginBottom: SPACING.xl }}>
            Student Progress
          </h1>

          {/* Segmented Control */}
          <div
            style={{
              display: 'flex',
              background: `linear-gradient(135deg, ${COLORS.backgroundLight} 0%, ${COLORS.iconBg} 100%)`,
              borderRadius: 999,
              padding: 2,
              gap: 2,
              marginBottom: SPACING.xl,
              boxShadow: 'inset 0px 1px 2px rgba(0, 0, 0, 0.04), 0px 1px 3px rgba(0, 0, 0, 0.06)',
              border: `1px solid rgba(0, 0, 0, 0.04)`,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Subtle shimmer overlay */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.3) 0%, transparent 50%)',
                pointerEvents: 'none',
              }}
            />
            <button
              type="button"
              onClick={() => setSelectedSegment('students')}
              style={{
                flex: 1,
                padding: `${SPACING.sm}px ${SPACING.md}px`,
                borderRadius: 999,
                border: 'none',
                backgroundColor: selectedSegment === 'students' ? COLORS.white : 'transparent',
                color: selectedSegment === 'students' ? COLORS.textPrimary : COLORS.textSecondary,
                ...TYPOGRAPHY.bodySmall,
                fontWeight: selectedSegment === 'students' ? 600 : 500,
                cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: selectedSegment === 'students' 
                  ? '0px 2px 8px rgba(0, 0, 0, 0.08), 0px 1px 2px rgba(0, 0, 0, 0.04)' 
                  : 'none',
                transform: selectedSegment === 'students' ? 'translateY(-1px)' : 'translateY(0)',
                position: 'relative',
                zIndex: selectedSegment === 'students' ? 1 : 0,
              }}
              onMouseEnter={(e) => {
                if (selectedSegment !== 'students') {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedSegment !== 'students') {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              Students
            </button>
            <button
              type="button"
              onClick={() => setSelectedSegment('mySession')}
              style={{
                flex: 1,
                padding: `${SPACING.sm}px ${SPACING.md}px`,
                borderRadius: 999,
                border: 'none',
                backgroundColor: selectedSegment === 'mySession' ? COLORS.white : 'transparent',
                color: selectedSegment === 'mySession' ? COLORS.textPrimary : COLORS.textSecondary,
                ...TYPOGRAPHY.bodySmall,
                fontWeight: selectedSegment === 'mySession' ? 600 : 500,
                cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: selectedSegment === 'mySession' 
                  ? '0px 2px 8px rgba(0, 0, 0, 0.08), 0px 1px 2px rgba(0, 0, 0, 0.04)' 
                  : 'none',
                transform: selectedSegment === 'mySession' ? 'translateY(-1px)' : 'translateY(0)',
                position: 'relative',
                zIndex: selectedSegment === 'mySession' ? 1 : 0,
              }}
              onMouseEnter={(e) => {
                if (selectedSegment !== 'mySession') {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedSegment !== 'mySession') {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              My Session
            </button>
          </div>
        </div>

        {/* Content based on selected segment */}
        {selectedSegment === 'students' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.md }}>
            {students.map((student) => (
              <StudentCard
                key={student.id}
                student={student}
                onClick={() => onSelectStudent(student)}
              />
            ))}
          </div>
        )}

        {selectedSegment === 'mySession' && (
          <div style={{ marginBottom: SPACING.xl }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: `${SPACING.lg}px`,
              }}
            >
              {sessions.map((session) => (
                <div
                  key={session.id}
                  id={`session-${session.id}`}
                >
                  <LessonCard
                    title={`${session.dateLabel} • ${session.time}`}
                    category="Training Session"
                    duration={session.duration}
                    thumbnail={session.thumbnail}
                    isVOD
                    onClick={() =>
                      onOpenSession
                        ? onOpenSession(session.id)
                        : console.log(`Open video for training session ${session.id}`)
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
