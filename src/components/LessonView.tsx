'use client';

import React, { useState } from 'react';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../styles/theme';
import { IconChevronLeft } from './Icons';
import { getYoutubeVideoId } from '../lib/youtube';
import type { Lesson } from './LessonsPage';

type TabId = 'transcript' | 'notes' | 'summary' | 'attachments';

interface LessonViewProps {
  lesson: Lesson;
  onBack: () => void;
  prevLesson?: Lesson | null;
  nextLesson?: Lesson | null;
  onPrevious?: () => void;
  onNext?: () => void;
}

const TAB_LABELS: { id: TabId; label: string }[] = [
  { id: 'transcript', label: 'Transcript' },
  { id: 'notes', label: 'Notes' },
  { id: 'summary', label: 'Summary' },
  { id: 'attachments', label: 'Attachments' },
];

export function LessonView(props: LessonViewProps) {
  const { lesson, onBack } = props;
  const [activeTab, setActiveTab] = useState<TabId>('transcript');
  const videoId = lesson.videoUrl ? getYoutubeVideoId(lesson.videoUrl) : null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: COLORS.background,
        paddingBottom: 80,
        boxSizing: 'border-box',
      }}
    >
      {/* Top bar: back + title */}
      <header
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: SPACING.sm,
          padding: `${SPACING.md}px ${SPACING.lg}px`,
          backgroundColor: COLORS.white,
          borderBottom: `1px solid ${COLORS.textMuted}`,
          boxShadow: SHADOWS.light,
        }}
      >
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to lessons"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            padding: 0,
            border: 'none',
            borderRadius: RADIUS.md,
            background: COLORS.iconBg,
            color: COLORS.textPrimary,
            cursor: 'pointer',
          }}
        >
          <IconChevronLeft size={24} />
        </button>
        <span
          style={{
            ...TYPOGRAPHY.bodySmall,
            fontWeight: 600,
            color: COLORS.textPrimary,
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {lesson.title}
        </span>
      </header>

      {/* Video player */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16/9',
          backgroundColor: '#000',
          flexShrink: 0,
        }}
      >
        {videoId ? (
          <iframe
            title={`Video: ${lesson.title}`}
            src={`https://www.youtube.com/embed/${videoId}?rel=0`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              border: 'none',
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: COLORS.textMuted,
              ...TYPOGRAPHY.bodySmall,
            }}
          >
            No video available
          </div>
        )}
      </div>

      {/* Lecture title + subtitle */}
      <div style={{ padding: `${SPACING.lg}px ${SPACING.lg}px ${SPACING.sm}px`, flexShrink: 0 }}>
        <h1
          style={{
            ...TYPOGRAPHY.h3,
            color: COLORS.textPrimary,
            margin: 0,
            marginBottom: SPACING.xs,
          }}
        >
          {lesson.title}
        </h1>
        <p
          style={{
            ...TYPOGRAPHY.label,
            color: COLORS.textSecondary,
            textTransform: 'uppercase',
            margin: 0,
          }}
        >
          {lesson.category}
        </p>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: SPACING.sm,
          padding: `${SPACING.sm}px ${SPACING.lg}px`,
          flexShrink: 0,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {TAB_LABELS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 8px',
                border: `1px solid ${COLORS.textMuted}`,
                borderRadius: RADIUS.lg,
                background: isActive ? '#F2F2F7' : COLORS.white,
                fontSize: 12,
                fontWeight: isActive ? 600 : 500,
                lineHeight: '16px',
                color: COLORS.textPrimary,
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content (scrollable) */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: SPACING.lg,
        }}
      >
        {activeTab === 'transcript' && (
          <div style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary }}>
            <p style={{ margin: 0 }}>No transcript available for this lesson.</p>
          </div>
        )}
        {activeTab === 'notes' && (
          <div style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary }}>
            <p style={{ margin: 0 }}>No notes yet.</p>
          </div>
        )}
        {activeTab === 'summary' && (
          <div style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary }}>
            <p style={{ margin: 0 }}>No summary available for this lesson.</p>
          </div>
        )}
        {activeTab === 'attachments' && (
          <div style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary }}>
            <p style={{ margin: 0 }}>No attachments for this lesson.</p>
          </div>
        )}
      </div>
    </div>
  );
}
