import React, { useState, useMemo } from 'react';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../styles/theme';
import { IconUser, IconChevronRight, IconSearch, IconChevronDown } from './Icons';
import { LessonCard } from './Cards';
import { TRAINING_SESSIONS } from './MyProgressPage';

export type StudentLevel = 'newbie' | 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface StudentInfo {
  id: string;
  name: string;
  email?: string;
  lessonsCompleted?: number;
  lastActive?: string;
  avatar?: string;
  level?: StudentLevel;
}

const LEVEL_ORDER: StudentLevel[] = ['newbie', 'beginner', 'intermediate', 'advanced', 'expert'];

const LEVEL_LABELS: Record<StudentLevel, string> = {
  newbie: 'Newbie',
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  expert: 'Expert',
};

const LEVEL_COLORS: Record<StudentLevel, { bg: string; text: string }> = {
  newbie: { bg: 'rgba(199, 199, 204, 0.35)', text: COLORS.textSecondary },
  beginner: { bg: 'rgba(135, 206, 235, 0.35)', text: '#4a7a96' },
  intermediate: { bg: 'rgba(49, 203, 0, 0.12)', text: COLORS.primary },
  advanced: { bg: 'rgba(214, 201, 255, 0.5)', text: '#6b5b95' },
  expert: { bg: 'rgba(255, 138, 128, 0.25)', text: COLORS.coral },
};

// Mock students for the coach
const MOCK_STUDENTS: StudentInfo[] = [
  { id: '1', name: 'Alex Chen', email: 'alex@example.com', lessonsCompleted: 12, lastActive: 'Feb 5, 2026', level: 'intermediate' },
  { id: '2', name: 'Jamie Lee', email: 'jamie@example.com', lessonsCompleted: 8, lastActive: 'Feb 4, 2026', level: 'beginner' },
  { id: '3', name: 'Morgan Taylor', email: 'morgan@example.com', lessonsCompleted: 15, lastActive: 'Feb 6, 2026', level: 'advanced' },
  { id: '4', name: 'Riley Smith', email: 'riley@example.com', lessonsCompleted: 5, lastActive: 'Feb 2, 2026', level: 'newbie' },
  { id: '5', name: 'Jordan Kim', email: 'jordan@example.com', lessonsCompleted: 3, lastActive: 'Jan 28, 2026', level: 'expert' },
];

interface StudentCardProps {
  student: StudentInfo;
  onClick: () => void;
}

export const StudentCard: React.FC<StudentCardProps> = ({ student, onClick }) => {
  const level = student.level ?? 'beginner';
  const levelStyle = LEVEL_COLORS[level];
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.md,
        padding: `${SPACING.md}px ${SPACING.lg}px`,
        background: COLORS.white,
        borderRadius: RADIUS.md,
        border: `1px solid rgba(0,0,0,0.06)`,
        cursor: 'pointer',
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(0,0,0,0.06)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: RADIUS.sm,
          backgroundColor: COLORS.iconBg,
          color: COLORS.textSecondary,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {student.avatar ?? <IconUser size={22} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm, flexWrap: 'wrap' }}>
          <span style={{ ...TYPOGRAPHY.bodySmall, fontWeight: 600, color: COLORS.textPrimary }}>
            {student.name}
          </span>
          {student.level && (
            <span
              style={{
                ...TYPOGRAPHY.label,
                padding: '2px 8px',
                borderRadius: 999,
                backgroundColor: levelStyle.bg,
                color: levelStyle.text,
                fontWeight: 500,
              }}
            >
              {LEVEL_LABELS[student.level]}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: SPACING.lg, marginTop: 2, flexWrap: 'wrap' }}>
          {student.lessonsCompleted != null && (
            <span style={{ ...TYPOGRAPHY.label, color: COLORS.textMuted }}>
              {student.lessonsCompleted} lessons
            </span>
          )}
          {student.lastActive && (
            <span style={{ ...TYPOGRAPHY.label, color: COLORS.textMuted }}>
              {student.lastActive}
            </span>
          )}
        </div>
      </div>
      <IconChevronRight size={18} style={{ color: COLORS.textMuted, flexShrink: 0 }} />
    </div>
  );
};

interface CoachStudentsPageProps {
  students?: StudentInfo[];
  onSelectStudent: (student: StudentInfo) => void;
  onOpenSession?: (sessionId: number) => void;
}

type SortField = 'name' | 'lessons' | 'lastActive' | 'level';

export const CoachStudentsPage: React.FC<CoachStudentsPageProps> = ({
  students = MOCK_STUDENTS,
  onSelectStudent,
  onOpenSession,
}) => {
  const [selectedSegment, setSelectedSegment] = useState<'students' | 'mySession'>('students');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [filterLevel, setFilterLevel] = useState<StudentLevel | 'all'>('all');
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const sessions = TRAINING_SESSIONS;

  const filteredAndSortedStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = students.filter((s) => {
      const matchSearch = !q || s.name.toLowerCase().includes(q) || (s.email?.toLowerCase().includes(q));
      const matchLevel = filterLevel === 'all' || s.level === filterLevel;
      return matchSearch && matchLevel;
    });
    const mult = sortAsc ? 1 : -1;
    list = [...list].sort((a, b) => {
      if (sortBy === 'name') return mult * (a.name.localeCompare(b.name));
      if (sortBy === 'lessons') return mult * ((a.lessonsCompleted ?? 0) - (b.lessonsCompleted ?? 0));
      if (sortBy === 'lastActive') return mult * (a.lastActive?.localeCompare(b.lastActive ?? '') ?? 0);
      if (sortBy === 'level') {
        const ai = LEVEL_ORDER.indexOf(a.level ?? 'beginner');
        const bi = LEVEL_ORDER.indexOf(b.level ?? 'beginner');
        return mult * (ai - bi);
      }
      return 0;
    });
    return list;
  }, [students, searchQuery, filterLevel, sortBy, sortAsc]);

  const sortLabel = sortBy === 'name' ? 'Name' : sortBy === 'lessons' ? 'Lessons' : sortBy === 'lastActive' ? 'Last active' : 'Level';

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
          <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.lg }}>
            {/* Search */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: SPACING.sm,
                padding: `${SPACING.sm}px ${SPACING.md}px`,
                background: COLORS.white,
                borderRadius: RADIUS.md,
                border: '1px solid rgba(0,0,0,0.06)',
              }}
            >
              <IconSearch size={18} style={{ color: COLORS.textMuted }} />
              <input
                type="search"
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search students"
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  ...TYPOGRAPHY.bodySmall,
                  color: COLORS.textPrimary,
                  background: 'transparent',
                }}
              />
            </div>

            {/* Sort + Filter row */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.sm }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm, flexWrap: 'wrap' }}>
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setSortDropdownOpen((o) => !o)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: `${SPACING.xs}px ${SPACING.sm}px`,
                      borderRadius: RADIUS.sm,
                      border: '1px solid rgba(0,0,0,0.08)',
                      background: COLORS.white,
                      ...TYPOGRAPHY.label,
                      color: COLORS.textPrimary,
                      cursor: 'pointer',
                    }}
                  >
                    {sortLabel}
                    <IconChevronDown size={14} />
                  </button>
                  {sortDropdownOpen && (
                    <>
                      <div
                        role="presentation"
                        style={{ position: 'fixed', inset: 0, zIndex: 10 }}
                        onClick={() => setSortDropdownOpen(false)}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          marginTop: 2,
                          background: COLORS.white,
                          borderRadius: RADIUS.sm,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          border: '1px solid rgba(0,0,0,0.06)',
                          zIndex: 11,
                          minWidth: 120,
                          overflow: 'hidden',
                        }}
                      >
                        {(['name', 'lessons', 'lastActive', 'level'] as const).map((field) => (
                          <button
                            key={field}
                            type="button"
                            onClick={() => {
                              if (sortBy === field) setSortAsc((a) => !a);
                              else setSortBy(field);
                              setSortDropdownOpen(false);
                            }}
                            style={{
                              display: 'block',
                              width: '100%',
                              padding: `${SPACING.sm}px ${SPACING.md}px`,
                              border: 'none',
                              background: sortBy === field ? COLORS.iconBg : 'transparent',
                              ...TYPOGRAPHY.label,
                              color: COLORS.textPrimary,
                              textAlign: 'left',
                              cursor: 'pointer',
                            }}
                          >
                            {field === 'name' ? 'Name' : field === 'lessons' ? 'Lessons' : field === 'lastActive' ? 'Last active' : 'Level'}
                            {sortBy === field && (sortAsc ? ' ↑' : ' ↓')}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: SPACING.xs, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setFilterLevel('all')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 999,
                    border: 'none',
                    background: filterLevel === 'all' ? COLORS.textPrimary : COLORS.iconBg,
                    color: filterLevel === 'all' ? COLORS.white : COLORS.textSecondary,
                    ...TYPOGRAPHY.label,
                    cursor: 'pointer',
                  }}
                >
                  All
                </button>
                {LEVEL_ORDER.map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setFilterLevel(lvl)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 999,
                      border: 'none',
                      background: filterLevel === lvl ? LEVEL_COLORS[lvl].text : LEVEL_COLORS[lvl].bg,
                      color: filterLevel === lvl ? COLORS.white : LEVEL_COLORS[lvl].text,
                      ...TYPOGRAPHY.label,
                      cursor: 'pointer',
                    }}
                  >
                    {LEVEL_LABELS[lvl]}
                  </button>
                ))}
              </div>
            </div>

            {/* Student list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.sm }}>
              {filteredAndSortedStudents.length === 0 ? (
                <p style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textMuted, margin: SPACING.lg, textAlign: 'center' }}>
                  No students match your search or filter.
                </p>
              ) : (
                filteredAndSortedStudents.map((student) => (
                  <StudentCard
                    key={student.id}
                    student={student}
                    onClick={() => onSelectStudent(student)}
                  />
                ))
              )}
            </div>
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
