import React, { useState } from 'react';
import { COLORS, SPACING, TYPOGRAPHY } from '../styles/theme';
import { Card, Button } from './BaseComponents';
import { LessonCard } from './Cards';

interface FilterOption {
  id: string;
  label: string;
}

export const LessonsPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories: FilterOption[] = [
    { id: 'all', label: 'All Lessons' },
    { id: 'technique', label: 'Technique' },
    { id: 'strategy', label: 'Strategy' },
    { id: 'fitness', label: 'Fitness' },
    { id: 'mindset', label: 'Mindset' },
    { id: 'tournaments', label: 'Tournaments' },
  ];

  const lessons = [
    {
      id: 1,
      title: 'Complete Serve Guide',
      category: 'Technique',
      duration: '24:30',
      thumbnail: '🎾',
      progress: 75,
      isVOD: true,
    },
    {
      id: 2,
      title: 'Dinking Masterclass',
      category: 'Technique',
      duration: '18:45',
      thumbnail: '🏓',
      progress: 100,
      isVOD: true,
      isCompleted: true,
    },
    {
      id: 3,
      title: 'Kitchen Line Strategy',
      category: 'Strategy',
      duration: '32:15',
      thumbnail: '📍',
      progress: 45,
      isVOD: true,
    },
    {
      id: 4,
      title: 'Tournament Preparation',
      category: 'Tournaments',
      duration: '28:00',
      thumbnail: '🏆',
      progress: 0,
      isVOD: true,
    },
    {
      id: 5,
      title: 'Footwork Drills',
      category: 'Fitness',
      duration: '16:20',
      thumbnail: '🦶',
      progress: 60,
      isVOD: true,
    },
    {
      id: 6,
      title: 'Mental Game in Pickleball',
      category: 'Mindset',
      duration: '12:15',
      thumbnail: '🧠',
      progress: 100,
      isVOD: true,
      isCompleted: true,
    },
    {
      id: 7,
      title: 'Advanced Positioning',
      category: 'Strategy',
      duration: '22:45',
      thumbnail: '📊',
      progress: 30,
      isVOD: true,
    },
    {
      id: 8,
      title: 'Doubles Team Dynamics',
      category: 'Strategy',
      duration: '35:00',
      thumbnail: '👥',
      progress: 0,
      isVOD: true,
    },
  ];

  const filteredLessons =
    selectedCategory === 'all'
      ? lessons
      : lessons.filter(
          (lesson) =>
            lesson.category.toLowerCase() === selectedCategory.toLowerCase()
        );

  // Stats for the overview card
  const completedCount = lessons.filter((l) => l.isCompleted).length;
  const inProgressCount = lessons.filter(
    (l) => l.progress > 0 && !l.isCompleted
  ).length;
  const totalLessons = lessons.length;

  // Parse "MM:SS" or "M:SS" to minutes and sum
  const totalMinutes = lessons.reduce((acc, l) => {
    const [m, s] = l.duration.split(':').map(Number);
    return acc + (m || 0) + (s || 0) / 60;
  }, 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalMins = Math.round(totalMinutes % 60);
  const totalContentLabel =
    totalHours > 0
      ? `${totalHours}:${totalMins.toString().padStart(2, '0')} hr`
      : `${Math.round(totalMinutes)} min`;

  const avgProgress =
    totalLessons > 0
      ? Math.round(
          lessons.reduce((acc, l) => acc + l.progress, 0) / totalLessons
        )
      : 0;

  return (
    <div
      style={{
        backgroundColor: COLORS.background,
        minHeight: '100vh',
        padding: `${SPACING.md}px`,
        width: '100%',
        boxSizing: 'border-box',
        overflowX: 'hidden',
      }}
    >
      <div
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {/* Header - on top */}
        <div style={{ marginBottom: SPACING.xxl }}>
          <h1
            style={{
              ...TYPOGRAPHY.h1,
              color: COLORS.textPrimary,
              margin: 0,
              marginBottom: SPACING.md,
            }}
          >
            Pickleball Training Library 🎾
          </h1>
          <p
            style={{
              ...TYPOGRAPHY.body,
              color: COLORS.textSecondary,
              margin: 0,
              marginBottom: SPACING.lg,
            }}
          >
            Learn from expert instructors. Master your technique, strategy, and game.
          </p>
        </div>

        {/* Lesson Progress overview card */}
        <div style={{ marginBottom: SPACING.xxl }}>
          <Card padding={SPACING.lg}>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: SPACING.lg,
                alignItems: 'flex-start',
              }}
            >
              <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                <h2
                  style={{
                    ...TYPOGRAPHY.h3,
                    color: COLORS.textPrimary,
                    margin: 0,
                    marginBottom: 4,
                  }}
                >
                  Lesson Progress
                </h2>
                <p
                  style={{
                    ...TYPOGRAPHY.label,
                    color: COLORS.textSecondary,
                    margin: 0,
                  }}
                >
                  Pickleball Training Library
                </p>
              </div>
              <div
                style={{
                  flexShrink: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <div style={{ position: 'relative', width: 72, height: 72 }}>
                  <svg width={72} height={72} viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)', display: 'block' }}>
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      fill="none"
                      stroke={COLORS.backgroundLight}
                      strokeWidth="4"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      fill="none"
                      stroke={COLORS.green}
                      strokeWidth="4"
                      strokeDasharray={`${(completedCount / Math.max(totalLessons, 1)) * 88} 88`}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dasharray 0.4s ease' }}
                    />
                  </svg>
                  <span
                    style={{
                      ...TYPOGRAPHY.h2,
                      color: COLORS.textPrimary,
                      margin: 0,
                      lineHeight: 1,
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    {completedCount}/{totalLessons}
                  </span>
                </div>
                <span
                  style={{
                    ...TYPOGRAPHY.label,
                    color: COLORS.textSecondary,
                  }}
                >
                  Completed
                </span>
              </div>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: SPACING.md,
                marginTop: SPACING.xl,
                paddingTop: SPACING.lg,
                borderTop: `1px solid ${COLORS.backgroundLight}`,
              }}
            >
              <div>
                <p
                  style={{
                    ...TYPOGRAPHY.h3,
                    color: COLORS.textPrimary,
                    margin: 0,
                    marginBottom: 4,
                  }}
                >
                  {totalContentLabel}
                </p>
                <p
                  style={{
                    ...TYPOGRAPHY.label,
                    color: COLORS.textSecondary,
                    margin: 0,
                  }}
                >
                  Total Content
                </p>
                <div
                  style={{
                    height: 2,
                    backgroundColor: COLORS.backgroundLight,
                    marginTop: SPACING.sm,
                    borderRadius: 1,
                    maxWidth: 48,
                  }}
                />
              </div>
              <div>
                <p
                  style={{
                    ...TYPOGRAPHY.h3,
                    color: COLORS.textPrimary,
                    margin: 0,
                    marginBottom: 4,
                  }}
                >
                  {inProgressCount}
                </p>
                <p
                  style={{
                    ...TYPOGRAPHY.label,
                    color: COLORS.textSecondary,
                    margin: 0,
                  }}
                >
                  In Progress
                </p>
                <div
                  style={{
                    height: 2,
                    backgroundColor: COLORS.backgroundLight,
                    marginTop: SPACING.sm,
                    borderRadius: 1,
                    maxWidth: 48,
                  }}
                />
              </div>
              <div>
                <p
                  style={{
                    ...TYPOGRAPHY.h3,
                    color: COLORS.textPrimary,
                    margin: 0,
                    marginBottom: 4,
                  }}
                >
                  {avgProgress}%
                </p>
                <p
                  style={{
                    ...TYPOGRAPHY.label,
                    color: COLORS.textSecondary,
                    margin: 0,
                  }}
                >
                  Avg Progress
                </p>
                <div
                  style={{
                    height: 2,
                    backgroundColor: COLORS.backgroundLight,
                    marginTop: SPACING.sm,
                    borderRadius: 1,
                    maxWidth: 48,
                  }}
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Filter Buttons */}
        <div style={{ marginBottom: SPACING.xxl }}>
          <Card padding={SPACING.lg}>
            <div
              style={{
                display: 'flex',
                gap: SPACING.md,
                flexWrap: 'wrap',
              }}
            >
              {categories.map((cat) => (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.id ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  {cat.label}
                </Button>
              ))}
            </div>
          </Card>
        </div>

        {/* Lessons Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: `${SPACING.lg}px`,
            marginBottom: SPACING.xxl,
          }}
        >
          {filteredLessons.map((lesson) => (
            <LessonCard
              key={lesson.id}
              title={lesson.title}
              category={lesson.category}
              duration={lesson.duration}
              thumbnail={lesson.thumbnail}
              progress={lesson.progress}
              isVOD={lesson.isVOD}
              isCompleted={lesson.isCompleted}
              onClick={() =>
                console.log(`Clicked lesson: ${lesson.title}`)
              }
            />
          ))}
        </div>

        {filteredLessons.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: SPACING.xxl,
            }}
          >
            <p
              style={{
                ...TYPOGRAPHY.body,
                color: COLORS.textSecondary,
              }}
            >
              No lessons found in this category. Try selecting a different filter.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
