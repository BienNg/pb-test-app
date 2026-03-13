import React, { useState, useMemo } from 'react';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../styles/theme';
import { IconUser, IconChevronRight, IconSearch, IconChevronDown } from './Icons';
import { LessonCard } from './Cards';
import type { TrainingSession } from './MySessionsPage';

export type StudentLevel = 'newbie' | 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface StudentInfo {
  id: string;
  name: string;
  email?: string;
  lessonsCompleted?: number;
  lastActive?: string;
  avatar?: string;
  level?: StudentLevel;
  joinedDate?: string;
  progress?: number;
}

const LEVEL_ORDER: StudentLevel[] = ['newbie', 'beginner', 'intermediate', 'advanced', 'expert'];

const LEVEL_LABELS: Record<StudentLevel, string> = {
  newbie: 'Newbie',
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  expert: 'Expert',
};

const LEVEL_COLORS: Record<StudentLevel, { bg: string; text: string; badgeBg?: string }> = {
  newbie: { bg: '#E1EDEA', text: '#55877f', badgeBg: 'rgba(143, 185, 168, 0.2)' },
  beginner: { bg: '#C4DBD6', text: '#436d67', badgeBg: 'rgba(143, 185, 168, 0.2)' },
  intermediate: { bg: '#9BC1B9', text: '#2563eb', badgeBg: 'rgba(37, 99, 235, 0.1)' },
  advanced: { bg: '#70A198', text: '#7c3aed', badgeBg: 'rgba(124, 58, 237, 0.1)' },
  expert: { bg: '#55877F', text: '#dc2626', badgeBg: 'rgba(220, 38, 38, 0.1)' },
};

// Mock students for the coach
const MOCK_STUDENTS: StudentInfo[] = [
  { id: '1', name: 'Alex Johnson', email: 'alex.j@example.com', lessonsCompleted: 24, lastActive: 'Oct 12, 2023', level: 'intermediate', joinedDate: 'Oct 2023', progress: 72 },
  { id: '2', name: 'Maria Garcia', email: 'm.garcia@mail.com', lessonsCompleted: 5, lastActive: 'Jan 05, 2024', level: 'newbie', joinedDate: 'Jan 2024', progress: 15 },
  { id: '3', name: 'James Chen', email: 'chen.james@web.com', lessonsCompleted: 48, lastActive: 'Jun 15, 2023', level: 'advanced', joinedDate: 'Jun 2023', progress: 94 },
  { id: '4', name: 'Sarah Smith', email: 'sarah_s@provider.net', lessonsCompleted: 18, lastActive: 'Sep 20, 2023', level: 'intermediate', joinedDate: 'Sep 2023', progress: 60 },
  { id: '5', name: 'Sam Smith', email: 'sam@example.com', lessonsCompleted: 8, lastActive: 'Nov 2023', level: 'newbie', joinedDate: 'Nov 2023', progress: 15 },
  { id: '6', name: 'Jordan Lee', email: 'jordan@example.com', lessonsCompleted: 42, lastActive: 'Sep 2023', level: 'advanced', joinedDate: 'Sep 2023', progress: 94 },
  { id: '7', name: 'Casey Wong', email: 'casey@example.com', lessonsCompleted: 12, lastActive: 'Jan 2024', level: 'beginner', joinedDate: 'Jan 2024', progress: 42 },
  { id: '8', name: 'Riley Davis', email: 'riley@example.com', lessonsCompleted: 35, lastActive: 'Dec 2023', level: 'advanced', joinedDate: 'Dec 2023', progress: 88 },
];

interface StudentCardProps {
  student: StudentInfo;
  onClick: () => void;
  viewMode?: 'list' | 'grid' | 'table';
  isMobile?: boolean;
}

export const StudentCard: React.FC<StudentCardProps> = ({ student, onClick, viewMode = 'list', isMobile = false }) => {
  const level = student.level ?? 'beginner';
  const levelStyle = LEVEL_COLORS[level];

  if (viewMode === 'grid') {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}
        style={{
          background: COLORS.white,
          borderRadius: '12px',
          border: '1px solid rgba(143, 185, 168, 0.2)',
          padding: SPACING.lg,
          display: 'flex',
          flexDirection: 'column',
          gap: SPACING.md,
          cursor: 'pointer',
          transition: 'box-shadow 0.2s, transform 0.2s',
          overflow: 'hidden',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', borderRadius: '8px', overflow: 'hidden', background: levelStyle.bg }}>
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: levelStyle.text }}>
            <IconUser size={48} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ ...TYPOGRAPHY.bodySmall, fontWeight: 700, fontSize: '18px', margin: 0, color: COLORS.textPrimary }}>{student.name}</h3>
            <p style={{ ...TYPOGRAPHY.label, fontSize: '12px', color: '#55877f', margin: '4px 0 0 0', fontWeight: 500 }}>Joined {student.joinedDate || student.lastActive}</p>
          </div>
          <span style={{
            padding: '4px 8px',
            background: levelStyle.badgeBg || levelStyle.bg,
            color: levelStyle.text,
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            fontStyle: 'italic',
          }}>
            {LEVEL_LABELS[level]}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#55877f' }}>Learning Roadmap</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#13ecda' }}>{student.progress || 0}%</span>
          </div>
          <div style={{ height: '8px', width: '100%', background: '#E1EDEA', borderRadius: '999px', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#13ecda', width: `${student.progress || 0}%`, borderRadius: '999px' }} />
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === 'list' && isMobile) {
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
          padding: '12px',
          background: COLORS.white,
          borderRadius: '12px',
          border: '1px solid rgba(143, 185, 168, 0.15)',
          cursor: 'pointer',
          transition: 'border-color 0.2s',
          marginBottom: '8px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'rgba(143, 185, 168, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(143, 185, 168, 0.15)';
        }}
      >
        <div style={{ position: 'relative' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              backgroundColor: levelStyle.bg,
              color: levelStyle.text,
              border: '2px solid #E1EDEA',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconUser size={28} />
          </div>
          {student.lastActive?.includes('today') || student.lastActive?.includes('2 days') ? (
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: '14px', height: '14px', background: '#10b981', border: '2px solid white', borderRadius: '50%' }} />
          ) : null}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ ...TYPOGRAPHY.bodySmall, fontWeight: 600, margin: 0, color: COLORS.textPrimary }}>{student.name}</p>
          <p style={{ ...TYPOGRAPHY.label, fontSize: '12px', color: '#55877f', margin: '2px 0 0 0', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 500 }}>
            {LEVEL_LABELS[level]} • {student.lessonsCompleted ? `${student.lessonsCompleted} COURSES` : student.lastActive?.toUpperCase()}
          </p>
        </div>
        <IconChevronRight size={20} style={{ color: '#C4DBD6', flexShrink: 0 }} />
      </div>
    );
  }

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
              {student.lessonsCompleted} session{student.lessonsCompleted !== 1 ? 's' : ''}
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
  title?: string;
  students?: StudentInfo[];
  onSelectStudent: (student: StudentInfo) => void;
  onOpenSession?: (sessionId: string) => void;
  showMySessionsTab?: boolean;
  sessions?: TrainingSession[];
}

type SortField = 'name' | 'lessons' | 'lastActive' | 'level';
type ViewMode = 'table' | 'grid' | 'list';

export const CoachStudentsPage: React.FC<CoachStudentsPageProps> = ({
  title = 'Student Directory',
  students = MOCK_STUDENTS,
  onSelectStudent,
  onOpenSession,
  showMySessionsTab = true,
  sessions = [],
}) => {
  const [selectedSegment, setSelectedSegment] = useState<'students' | 'mySession'>('students');
  const [selectedSubSegment, setSelectedSubSegment] = useState<'completed' | 'new'>('completed');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [filterLevel, setFilterLevel] = useState<StudentLevel | 'all'>('all');
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isMobile, setIsMobile] = useState(false);
  const showStudentsOnly = !showMySessionsTab;

  React.useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setViewMode('list');
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
        backgroundColor: isMobile ? '#ffffff' : '#f6f8f8',
        minHeight: '100vh',
        padding: isMobile ? SPACING.md : SPACING.xl,
        width: '100%',
        boxSizing: 'border-box',
        overflowX: 'hidden',
      }}
    >
      <div style={{ maxWidth: isMobile ? '100%' : 1400, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        {/* Header */}
        <div style={{ marginBottom: isMobile ? SPACING.md : SPACING.xl }}>
          {isMobile ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md }}>
              <div style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconChevronRight size={24} style={{ transform: 'rotate(180deg)', color: COLORS.textPrimary }} />
              </div>
              <h2 style={{ ...TYPOGRAPHY.h2, fontSize: '18px', fontWeight: 700, margin: 0 }}>Students</h2>
              <div style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '24px' }}>⋮</span>
              </div>
            </div>
          ) : (
            <>
              <h1 style={{ ...TYPOGRAPHY.h1, fontSize: '30px', fontWeight: 900, color: COLORS.textPrimary, margin: 0, marginBottom: SPACING.xs, letterSpacing: '-0.5px' }}>
                {title}
              </h1>
              <p style={{ ...TYPOGRAPHY.bodySmall, color: '#55877f', margin: '4px 0 24px 0' }}>
                {viewMode === 'grid' ? 'Real-time learning progress and skill tracking.' : 'Manage your active roster and monitor student development.'}
              </p>
            </>
          )}

          {/* Segmented Control */}
          {!showStudentsOnly && !isMobile && (
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
              My Sessions
            </button>
          </div>
          )}

          {/* Sub Segmented Control */}
          {!showStudentsOnly && selectedSegment === 'mySession' && !isMobile && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: SPACING.lg }}>
              <div
                style={{
                  display: 'flex',
                  background: `linear-gradient(135deg, rgba(30, 30, 35, 0.95) 0%, rgba(40, 40, 45, 0.95) 100%)`,
                  borderRadius: RADIUS.md,
                  padding: 2,
                  gap: 2,
                  boxShadow: 'inset 0px 1px 2px rgba(0, 0, 0, 0.2), 0px 2px 8px rgba(0, 0, 0, 0.15)',
                  border: `1px solid rgba(0, 0, 0, 0.2)`,
                  position: 'relative',
                  overflow: 'hidden',
                  maxWidth: 300,
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, transparent 50%)',
                    pointerEvents: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setSelectedSubSegment('completed')}
                  style={{
                    flex: 1,
                    padding: `${SPACING.xs}px ${SPACING.sm}px`,
                    borderRadius: RADIUS.sm,
                    border: 'none',
                    backgroundColor: selectedSubSegment === 'completed' ? 'rgba(255, 255, 255, 0.95)' : 'transparent',
                    color: selectedSubSegment === 'completed' ? COLORS.textPrimary : 'rgba(255, 255, 255, 0.7)',
                    ...TYPOGRAPHY.label,
                    fontSize: '13px',
                    fontWeight: selectedSubSegment === 'completed' ? 600 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: selectedSubSegment === 'completed' 
                      ? '0px 2px 8px rgba(0, 0, 0, 0.2), 0px 1px 2px rgba(0, 0, 0, 0.1)' 
                      : 'none',
                    transform: selectedSubSegment === 'completed' ? 'translateY(-1px)' : 'translateY(0)',
                    position: 'relative',
                    zIndex: selectedSubSegment === 'completed' ? 1 : 0,
                  }}
                  onMouseEnter={(e) => {
                    if (selectedSubSegment !== 'completed') {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedSubSegment !== 'completed') {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  Completed
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSubSegment('new')}
                  style={{
                    flex: 1,
                    padding: `${SPACING.xs}px ${SPACING.sm}px`,
                    borderRadius: RADIUS.sm,
                    border: 'none',
                    backgroundColor: selectedSubSegment === 'new' ? 'rgba(255, 255, 255, 0.95)' : 'transparent',
                    color: selectedSubSegment === 'new' ? COLORS.textPrimary : 'rgba(255, 255, 255, 0.7)',
                    ...TYPOGRAPHY.label,
                    fontSize: '13px',
                    fontWeight: selectedSubSegment === 'new' ? 600 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: selectedSubSegment === 'new' 
                      ? '0px 2px 8px rgba(0, 0, 0, 0.2), 0px 1px 2px rgba(0, 0, 0, 0.1)' 
                      : 'none',
                    transform: selectedSubSegment === 'new' ? 'translateY(-1px)' : 'translateY(0)',
                    position: 'relative',
                    zIndex: selectedSubSegment === 'new' ? 1 : 0,
                  }}
                  onMouseEnter={(e) => {
                    if (selectedSubSegment !== 'new') {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedSubSegment !== 'new') {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  New
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Content based on selected segment */}
        {(showStudentsOnly || selectedSegment === 'students') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? SPACING.md : SPACING.lg }}>
            {/* Search */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: SPACING.sm,
                padding: isMobile ? `${SPACING.sm}px ${SPACING.md}px` : `${SPACING.sm}px ${SPACING.md}px`,
                background: isMobile ? '#f2f7f5' : COLORS.white,
                borderRadius: isMobile ? '12px' : RADIUS.md,
                border: isMobile ? 'none' : '1px solid rgba(0,0,0,0.06)',
                boxShadow: isMobile ? '0 1px 2px rgba(0,0,0,0.04)' : 'none',
              }}
            >
              <IconSearch size={18} style={{ color: '#9BC1B9' }} />
              <input
                type="search"
                placeholder={isMobile ? "Search students by name..." : "Search students, skills or roadmaps..."}
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

            {/* Filter pills and view mode */}
            {!isMobile && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: SPACING.md }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setFilterLevel('all')}
                    style={{
                      padding: '6px 16px',
                      height: '36px',
                      borderRadius: '9999px',
                      border: 'none',
                      background: filterLevel === 'all' ? '#436d67' : COLORS.white,
                      color: filterLevel === 'all' ? 'white' : '#436d67',
                      ...TYPOGRAPHY.label,
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: filterLevel === 'all' ? 'none' : '0 0 0 1px rgba(143, 185, 168, 0.2)',
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
                        padding: '6px 16px',
                        height: '36px',
                        borderRadius: '9999px',
                        border: 'none',
                        background: filterLevel === lvl ? LEVEL_COLORS[lvl].text : COLORS.white,
                        color: filterLevel === lvl ? 'white' : LEVEL_COLORS[lvl].text,
                        ...TYPOGRAPHY.label,
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: filterLevel === lvl ? 'none' : '0 0 0 1px rgba(143, 185, 168, 0.2)',
                      }}
                    >
                      {LEVEL_LABELS[lvl]}
                    </button>
                  ))}
                </div>
                {viewMode !== 'table' && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => setViewMode('grid')}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: '1px solid rgba(143, 185, 168, 0.2)',
                        background: viewMode === 'grid' ? '#E1EDEA' : 'white',
                        color: COLORS.textPrimary,
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 600,
                      }}
                    >
                      Grid
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('table')}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: '1px solid rgba(143, 185, 168, 0.2)',
                        background: viewMode === 'table' ? '#E1EDEA' : 'white',
                        color: COLORS.textPrimary,
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 600,
                      }}
                    >
                      Table
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Mobile filter pills */}
            {isMobile && (
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                <button
                  type="button"
                  onClick={() => setFilterLevel('all')}
                  style={{
                    padding: '0 20px',
                    height: '36px',
                    borderRadius: '9999px',
                    border: 'none',
                    flexShrink: 0,
                    background: filterLevel === 'all' ? '#8FB9A8' : '#f2f7f5',
                    color: filterLevel === 'all' ? 'white' : '#436d67',
                    ...TYPOGRAPHY.label,
                    fontSize: '14px',
                    fontWeight: 600,
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
                      padding: '0 20px',
                      height: '36px',
                      borderRadius: '9999px',
                      flexShrink: 0,
                      border: filterLevel === lvl ? 'none' : '1px solid rgba(143, 185, 168, 0.2)',
                      background: filterLevel === lvl ? LEVEL_COLORS[lvl].text : '#f2f7f5',
                      color: filterLevel === lvl ? 'white' : '#436d67',
                      ...TYPOGRAPHY.label,
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    {LEVEL_LABELS[lvl]}
                  </button>
                ))}
              </div>
            )}

            {/* Student grid/list/table */}
            {viewMode === 'table' && !isMobile ? (
              <div style={{ background: 'white', borderRadius: '12px', border: '1px solid rgba(143, 185, 168, 0.1)', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: '#f2f7f5', borderBottom: '1px solid rgba(143, 185, 168, 0.1)' }}>
                    <tr>
                      <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: '#9BC1B9', textTransform: 'uppercase', letterSpacing: '0.5px' }}>STUDENT</th>
                      <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: '#9BC1B9', textTransform: 'uppercase', letterSpacing: '0.5px' }}>LEVEL</th>
                      <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: '#9BC1B9', textTransform: 'uppercase', letterSpacing: '0.5px' }}>JOINED DATE</th>
                      <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: '#9BC1B9', textTransform: 'uppercase', letterSpacing: '0.5px' }}>SESSIONS</th>
                      <th style={{ padding: '16px 24px', textAlign: 'right', fontSize: '12px', fontWeight: 700, color: '#9BC1B9', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody style={{ background: 'white' }}>
                    {filteredAndSortedStudents.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: SPACING.xl, textAlign: 'center', color: COLORS.textMuted }}>
                          No students match your search or filter.
                        </td>
                      </tr>
                    ) : (
                      filteredAndSortedStudents.map((student, idx) => {
                        const level = student.level ?? 'beginner';
                        const levelStyle = LEVEL_COLORS[level];
                        return (
                          <tr 
                            key={student.id}
                            onClick={() => onSelectStudent(student)}
                            style={{ 
                              borderBottom: idx !== filteredAndSortedStudents.length - 1 ? '1px solid rgba(143, 185, 168, 0.05)' : 'none',
                              cursor: 'pointer',
                              transition: 'background 0.2s',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(143, 185, 168, 0.05)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'white';
                            }}
                          >
                            <td style={{ padding: '16px 24px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: 40, height: 40, borderRadius: '8px', background: levelStyle.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: levelStyle.text, flexShrink: 0, overflow: 'hidden' }}>
                                  <IconUser size={20} />
                                </div>
                                <div>
                                  <p style={{ ...TYPOGRAPHY.bodySmall, fontWeight: 700, margin: 0, color: COLORS.textPrimary }}>{student.name}</p>
                                  <p style={{ ...TYPOGRAPHY.label, fontSize: '12px', color: '#55877f', margin: 0 }}>{student.email}</p>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '16px 24px' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '4px 10px',
                                borderRadius: '9999px',
                                fontSize: '12px',
                                fontWeight: 600,
                                background: levelStyle.badgeBg || levelStyle.bg,
                                color: levelStyle.text,
                              }}>
                                {LEVEL_LABELS[level]}
                              </span>
                            </td>
                            <td style={{ padding: '16px 24px', fontSize: '14px', color: '#55877f' }}>
                              {student.lastActive}
                            </td>
                            <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: 600, color: COLORS.textPrimary }}>
                              {student.lessonsCompleted} <span style={{ color: '#9BC1B9', fontWeight: 400 }}>lessons</span>
                            </td>
                            <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                              <button style={{ background: 'transparent', border: 'none', padding: '8px', cursor: 'pointer', color: '#9BC1B9' }}>
                                <span style={{ fontSize: '20px' }}>✎</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
                {filteredAndSortedStudents.length > 0 && (
                  <div style={{ padding: '16px 24px', background: '#f2f7f5', borderTop: '1px solid rgba(143, 185, 168, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: '12px', color: '#55877f', margin: 0 }}>Showing {filteredAndSortedStudents.length} of {students.length} students</p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button disabled style={{ padding: '4px 12px', fontSize: '12px', fontWeight: 700, border: '1px solid rgba(143, 185, 168, 0.2)', borderRadius: '8px', background: 'white', cursor: 'not-allowed', opacity: 0.5 }}>Previous</button>
                      <button style={{ padding: '4px 12px', fontSize: '12px', fontWeight: 700, border: '1px solid rgba(143, 185, 168, 0.2)', borderRadius: '8px', background: 'white', cursor: 'pointer' }}>Next</button>
                    </div>
                  </div>
                )}
              </div>
            ) : viewMode === 'grid' && !isMobile ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: SPACING.lg }}>
                {filteredAndSortedStudents.length === 0 ? (
                  <p style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textMuted, margin: SPACING.lg, textAlign: 'center', gridColumn: '1 / -1' }}>
                    No students match your search or filter.
                  </p>
                ) : (
                  filteredAndSortedStudents.map((student) => (
                    <StudentCard
                      key={student.id}
                      student={student}
                      onClick={() => onSelectStudent(student)}
                      viewMode="grid"
                      isMobile={false}
                    />
                  ))
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
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
                      viewMode="list"
                      isMobile={isMobile}
                    />
                  ))
                )}
              </div>
            )}

            {/* Mobile FAB */}
            {isMobile && (
              <button
                style={{
                  position: 'fixed',
                  bottom: '96px',
                  right: '24px',
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: '#8FB9A8',
                  color: 'white',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(143, 185, 168, 0.4)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                }}
              >
                <span>+</span>
              </button>
            )}
          </div>
        )}

        {!showStudentsOnly && selectedSegment === 'mySession' && (
          <div style={{ marginBottom: SPACING.xl }}>
            {selectedSubSegment === 'completed' && (
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
                      title={session.time === '—' ? session.dateLabel : `${session.dateLabel} • ${session.time}`}
                      category="Training Session"
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
            )}
            {selectedSubSegment === 'new' && (
              <div style={{ padding: SPACING.xl, textAlign: 'center' }}>
                <p style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textMuted }}>
                  No new sessions available.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
