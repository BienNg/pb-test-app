import React from 'react';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../styles/theme';
import { Card } from './BaseComponents';

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
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
        }}
      >
        {student.avatar ?? '👤'}
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
      <span style={{ color: COLORS.textMuted, fontSize: 18 }}>›</span>
    </div>
  </Card>
);

interface CoachStudentsPageProps {
  students?: StudentInfo[];
  onSelectStudent: (student: StudentInfo) => void;
}

export const CoachStudentsPage: React.FC<CoachStudentsPageProps> = ({
  students = MOCK_STUDENTS,
  onSelectStudent,
}) => {
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
          <h1 style={{ ...TYPOGRAPHY.h1, color: COLORS.textPrimary, margin: 0, marginBottom: SPACING.sm }}>
            Student Progress
          </h1>
          <p style={{ ...TYPOGRAPHY.body, color: COLORS.textSecondary, margin: 0 }}>
            View progress for each student. Tap a card to see their full progress view.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.md }}>
          {students.map((student) => (
            <StudentCard
              key={student.id}
              student={student}
              onClick={() => onSelectStudent(student)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
