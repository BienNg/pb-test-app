'use client';

import React, { useState } from 'react';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../styles/theme';
import { IconChevronLeft, IconChevronRight } from './Icons';
import { getYoutubeVideoId } from '../lib/youtube';
import type { Lesson } from './LessonsPage';
import { FilePlus2 } from 'lucide-react';

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

export function LessonView({ lesson, onBack, prevLesson = null, nextLesson = null, onPrevious, onNext }: LessonViewProps) {
  const [activeTab, setActiveTab] = useState<TabId>('transcript');
  const videoId = lesson.videoUrl ? getYoutubeVideoId(lesson.videoUrl) : null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: COLORS.background,
        paddingBottom: 80 + 72,
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
          gap: 0,
          padding: `0 ${SPACING.lg}px`,
          borderBottom: `1px solid ${COLORS.textMuted}`,
          flexShrink: 0,
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
                padding: `${SPACING.md}px ${SPACING.sm}px`,
                border: 'none',
                borderBottom: isActive ? `2px solid ${COLORS.primary}` : '2px solid transparent',
                background: 'none',
                ...TYPOGRAPHY.label,
                color: isActive ? COLORS.textPrimary : COLORS.textSecondary,
                fontWeight: isActive ? 600 : 500,
                cursor: 'pointer',
                marginBottom: -1,
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
          <div style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textPrimary, lineHeight: 1.6 }}>
            <p style={{ margin: '0 0 12px 0' }}>
              <strong>0:00</strong> — Welcome to this lesson. This video covers key concepts and techniques you can
              practice right away.
            </p>
            <p style={{ margin: '0 0 12px 0' }}>
              <strong>0:15</strong> — Focus on form and consistency. Small adjustments often lead to big improvements
              over time.
            </p>
            <p style={{ margin: 0 }}>
              <strong>0:30</strong> — Review this lesson whenever you need a refresher. Good luck on the court!
            </p>
          </div>
        )}
        {activeTab === 'notes' && (
          <div style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary }}>
            <p style={{ margin: 0 }}>No notes yet. Use &quot;Save a Note&quot; below to add your thoughts.</p>
          </div>
        )}
        {activeTab === 'summary' && (
          <div style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textPrimary, lineHeight: 1.6 }}>
            <p style={{ margin: 0 }}>
              This lesson covers {lesson.title} within the {lesson.category} category. Watch the video and use the
              transcript or notes to reinforce your learning.
            </p>
          </div>
        )}
        {activeTab === 'attachments' && (
          <div style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary }}>
            <p style={{ margin: 0 }}>No attachments for this lesson.</p>
          </div>
        )}
      </div>

      {/* Persistent lesson toolbar (above app nav) */}
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 80,
          height: 72,
          backgroundColor: COLORS.white,
          borderTop: `1px solid ${COLORS.textMuted}`,
          boxShadow: '0 -4px 12px rgba(0,0,0,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `0 ${SPACING.lg}px`,
          zIndex: 90,
          boxSizing: 'border-box',
        }}
      >
        <button
          type="button"
          onClick={onPrevious}
          disabled={!prevLesson}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: SPACING.xs,
            padding: `${SPACING.sm}px ${SPACING.md}px`,
            border: 'none',
            borderRadius: RADIUS.md,
            background: prevLesson ? COLORS.iconBg : 'transparent',
            color: prevLesson ? COLORS.textPrimary : COLORS.textMuted,
            ...TYPOGRAPHY.label,
            fontWeight: 600,
            cursor: prevLesson ? 'pointer' : 'default',
          }}
        >
          <IconChevronLeft size={18} />
          Previous
        </button>
        <button
          type="button"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: SPACING.xs,
            padding: `${SPACING.sm}px ${SPACING.md}px`,
            border: 'none',
            borderRadius: RADIUS.md,
            background: COLORS.iconBg,
            color: COLORS.textPrimary,
            ...TYPOGRAPHY.label,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <FilePlus2 size={18} strokeWidth={2} />
          Save a Note
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!nextLesson}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: SPACING.xs,
            padding: `${SPACING.sm}px ${SPACING.md}px`,
            border: 'none',
            borderRadius: RADIUS.md,
            background: nextLesson ? COLORS.iconBg : 'transparent',
            color: nextLesson ? COLORS.textPrimary : COLORS.textMuted,
            ...TYPOGRAPHY.label,
            fontWeight: 600,
            cursor: nextLesson ? 'pointer' : 'default',
          }}
        >
          Next
          <IconChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
