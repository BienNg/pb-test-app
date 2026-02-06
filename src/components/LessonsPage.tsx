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
        {/* Header */}
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

          {/* Filter Buttons */}
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

        {/* Lesson Stats */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: `${SPACING.lg}px`,
            marginBottom: SPACING.xxl,
          }}
        >
          <Card padding={SPACING.lg}>
            <p
              style={{
                ...TYPOGRAPHY.label,
                color: COLORS.textSecondary,
                margin: 0,
                marginBottom: SPACING.sm,
              }}
            >
              Total Lessons
            </p>
            <p
              style={{
                ...TYPOGRAPHY.h2,
                color: COLORS.textPrimary,
                margin: 0,
              }}
            >
              {lessons.length}
            </p>
          </Card>
          <Card padding={SPACING.lg}>
            <p
              style={{
                ...TYPOGRAPHY.label,
                color: COLORS.textSecondary,
                margin: 0,
                marginBottom: SPACING.sm,
              }}
            >
              Completed
            </p>
            <p
              style={{
                ...TYPOGRAPHY.h2,
                color: COLORS.green,
                margin: 0,
              }}
            >
              {lessons.filter((l) => l.isCompleted).length}
            </p>
          </Card>
          <Card padding={SPACING.lg}>
            <p
              style={{
                ...TYPOGRAPHY.label,
                color: COLORS.textSecondary,
                margin: 0,
                marginBottom: SPACING.sm,
              }}
            >
              In Progress
            </p>
            <p
              style={{
                ...TYPOGRAPHY.h2,
                color: COLORS.lavender,
                margin: 0,
              }}
            >
              {lessons.filter((l) => l.progress > 0 && !l.isCompleted).length}
            </p>
          </Card>
          <Card padding={SPACING.lg}>
            <p
              style={{
                ...TYPOGRAPHY.label,
                color: COLORS.textSecondary,
                margin: 0,
                marginBottom: SPACING.sm,
              }}
            >
              Not Started
            </p>
            <p
              style={{
                ...TYPOGRAPHY.h2,
                color: COLORS.coral,
                margin: 0,
              }}
            >
              {lessons.filter((l) => l.progress === 0 && !l.isCompleted).length}
            </p>
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
