import React, { useState, useEffect } from 'react';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from '../styles/theme';
import { Card, Button } from './BaseComponents';
import { LessonCard } from './Cards';
import { getYoutubeVideoId } from '../lib/youtube';
import { createClient } from '@/lib/supabase/client';

interface FilterOption {
  id: string;
  label: string;
}

export interface Lesson {
  id: string;
  title: string;
  category: string;
  duration: string;
  thumbnail?: string;
  videoUrl?: string;
  progress: number;
  isVOD?: boolean;
  isCompleted?: boolean;
}

interface VideoLessonRow {
  id: string;
  title: string | null;
  category: string | null;
  duration: string | null;
  youtube_url: string | null;
  created_at: string;
}

const CATEGORIES: FilterOption[] = [
  { id: 'all', label: 'All Lessons' },
  { id: 'technique', label: 'Technique' },
  { id: 'strategy', label: 'Strategy' },
  { id: 'fitness', label: 'Fitness' },
  { id: 'mindset', label: 'Mindset' },
  { id: 'tournaments', label: 'Tournaments' },
];

interface AddVideoModalProps {
  onClose: () => void;
  onAdd: (video: { title: string; category: string; duration: string; videoUrl: string }) => Promise<void>;
}

function AddVideoModal({ onClose, onAdd }: AddVideoModalProps) {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Technique');
  const [duration, setDuration] = useState('0:00');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    const trimmed = youtubeUrl.trim();
    if (!trimmed) {
      setError('Please enter a YouTube URL');
      return;
    }
    const vid = getYoutubeVideoId(trimmed);
    if (!vid) {
      setError('Only YouTube URLs are allowed (e.g. youtube.com/watch?v=... or youtu.be/...)');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onAdd({ title: title.trim() || 'New Video', category, duration: duration.trim() || '0:00', videoUrl: trimmed });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add video');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        backgroundColor: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.lg,
      }}
    >
      <div
        role="dialog"
        aria-label="Add new video"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: COLORS.white,
          borderRadius: RADIUS.xl,
          padding: SPACING.xxl,
          maxWidth: 440,
          width: '100%',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        }}
      >
        <h3 style={{ ...TYPOGRAPHY.h3, color: COLORS.textPrimary, margin: `0 0 ${SPACING.xl}px` }}>
          Add Video
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.lg }}>
          <div>
            <label
              htmlFor="add-video-youtube"
              style={{
                display: 'block',
                ...TYPOGRAPHY.label,
                color: COLORS.textSecondary,
                marginBottom: SPACING.xs,
              }}
            >
              YouTube URL
            </label>
            <input
              id="add-video-youtube"
              type="url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={(e) => {
                setYoutubeUrl(e.target.value);
                setError(null);
              }}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: SPACING.sm,
                borderRadius: RADIUS.md,
                border: `1px solid ${COLORS.textMuted}`,
                ...TYPOGRAPHY.body,
                color: COLORS.textPrimary,
              }}
            />
          </div>

          <div>
            <label
              htmlFor="add-video-title"
              style={{
                display: 'block',
                ...TYPOGRAPHY.label,
                color: COLORS.textSecondary,
                marginBottom: SPACING.xs,
              }}
            >
              Title
            </label>
            <input
              id="add-video-title"
              type="text"
              placeholder="Video title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: SPACING.sm,
                borderRadius: RADIUS.md,
                border: `1px solid ${COLORS.textMuted}`,
                ...TYPOGRAPHY.body,
                color: COLORS.textPrimary,
              }}
            />
          </div>

          <div>
            <label
              htmlFor="add-video-category"
              style={{
                display: 'block',
                ...TYPOGRAPHY.label,
                color: COLORS.textSecondary,
                marginBottom: SPACING.xs,
              }}
            >
              Category
            </label>
            <select
              id="add-video-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                width: '100%',
                padding: SPACING.sm,
                borderRadius: RADIUS.md,
                border: `1px solid ${COLORS.textMuted}`,
                ...TYPOGRAPHY.body,
                color: COLORS.textPrimary,
                backgroundColor: COLORS.white,
              }}
            >
              {CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                <option key={c.id} value={c.label}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="add-video-duration"
              style={{
                display: 'block',
                ...TYPOGRAPHY.label,
                color: COLORS.textSecondary,
                marginBottom: SPACING.xs,
              }}
            >
              Duration (optional)
            </label>
            <input
              id="add-video-duration"
              type="text"
              placeholder="MM:SS"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: SPACING.sm,
                borderRadius: RADIUS.md,
                border: `1px solid ${COLORS.textMuted}`,
                ...TYPOGRAPHY.body,
                color: COLORS.textPrimary,
              }}
            />
          </div>

          {error && (
            <p style={{ margin: 0, ...TYPOGRAPHY.bodySmall, color: COLORS.red }}>
              {error}
            </p>
          )}

          <div style={{ display: 'flex', gap: SPACING.sm, justifyContent: 'flex-end', marginTop: SPACING.sm }}>
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmit}
              disabled={saving || !youtubeUrl.trim()}
            >
              {saving ? 'Adding…' : 'Add Video'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export interface LessonsPageProps {
  isAdmin?: boolean;
}

export const LessonsPage: React.FC<LessonsPageProps> = ({ isAdmin = false }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const categories = CATEGORIES;

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    queueMicrotask(() => setLoadError(null));

    (async () => {
      try {
        const { data, error } = await supabase
          .from('video_lessons')
          .select('id, title, category, duration, youtube_url, created_at')
          .order('created_at', { ascending: false });

        if (error || !data) {
          if (error) {
            console.error('Failed to load video lessons', error);
            setLoadError('Failed to load video lessons');
          }
          return;
        }

        const rows = data as VideoLessonRow[];
        const mapped: Lesson[] = rows.map((row) => ({
          id: row.id,
          title: row.title ?? 'New Video',
          category: row.category ?? 'Technique',
          duration: row.duration ?? '0:00',
          videoUrl: row.youtube_url ?? undefined,
          progress: 0,
          isVOD: true,
        }));

        setLessons(mapped);
      } catch (err) {
        console.error('Failed to load video lessons', err);
        setLoadError('Failed to load video lessons');
      }
    })();
  }, []);

  const handleAddVideo = async (video: { title: string; category: string; duration: string; videoUrl: string }) => {
    const supabase = createClient();

    // Fallback: if Supabase is not configured, just update local state.
    if (!supabase) {
      const newLesson: Lesson = {
        id:
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? (crypto as Crypto).randomUUID()
            : String(Date.now()),
        title: video.title,
        category: video.category,
        duration: video.duration,
        videoUrl: video.videoUrl,
        progress: 0,
        isVOD: true,
      };
      setLessons((prev) => [newLesson, ...prev]);
      return;
    }

    const { data, error } = await supabase
      .from('video_lessons')
      .insert({
        title: video.title,
        category: video.category,
        duration: video.duration,
        youtube_url: video.videoUrl,
      })
      .select('id, title, category, duration, youtube_url, created_at')
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to save video');
    }

    const row = data as VideoLessonRow;
    const newLesson: Lesson = {
      id: row.id,
      title: row.title ?? video.title,
      category: row.category ?? video.category,
      duration: row.duration ?? video.duration,
      videoUrl: row.youtube_url ?? video.videoUrl,
      progress: 0,
      isVOD: true,
    };

    setLessons((prev) => [newLesson, ...prev]);
  };

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
        backgroundColor: '#ffffff',
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
        <div style={{ marginBottom: SPACING.xxl, display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: SPACING.lg }}>
          <div>
            <h1
              style={{
                ...TYPOGRAPHY.h1,
                color: COLORS.textPrimary,
                margin: 0,
                marginBottom: SPACING.md,
              }}
            >
              Pickleball Training Library
            </h1>
          </div>
          {isAdmin && (
            <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
              Add Video
            </Button>
          )}
        </div>

        {loadError && (
          <p
            style={{
              ...TYPOGRAPHY.bodySmall,
              color: COLORS.red,
              marginTop: 0,
              marginBottom: SPACING.lg,
            }}
          >
            {loadError}
          </p>
        )}

        {showAddModal && (
          <AddVideoModal
            onClose={() => setShowAddModal(false)}
            onAdd={handleAddVideo}
          />
        )}

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
              videoUrl={lesson.videoUrl}
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
