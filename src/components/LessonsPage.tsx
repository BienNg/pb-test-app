import React, { useState, useEffect } from 'react';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, BREAKPOINTS } from '../styles/theme';
import { Button } from './BaseComponents';
import { LessonCard } from './Cards';
import { LessonView } from './LessonView';
import { getYoutubeVideoId } from '../lib/youtube';
import { createClient } from '@/lib/supabase/client';

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${BREAKPOINTS.tablet - 1}px)`);
    const handler = () => setIsMobile(mq.matches);
    handler();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

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
      await onAdd({ title: title.trim() || 'New Video', category, duration: '0:00', videoUrl: trimmed });
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
  /** Called when user enters or leaves lesson detail view (for shell to hide nav, etc.) */
  onLessonViewChange?: (isViewing: boolean) => void;
}

export const LessonsPage: React.FC<LessonsPageProps> = ({ isAdmin: _isAdmin = false, onLessonViewChange }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, _setSearchQuery] = useState('');
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const isMobile = useIsMobile();
  const isAdmin = _isAdmin;

  useEffect(() => {
    onLessonViewChange?.(selectedLesson != null);
  }, [selectedLesson, onLessonViewChange]);

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

  const filteredLessons = lessons
    .filter((lesson) => {
      const matchCategory =
        selectedCategory === 'all' ||
        lesson.category.toLowerCase() === selectedCategory.toLowerCase();
      if (!matchCategory) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();
      return (
        lesson.title.toLowerCase().includes(q) ||
        lesson.category.toLowerCase().includes(q)
      );
    });

  const currentIndex = selectedLesson
    ? filteredLessons.findIndex((l) => l.id === selectedLesson.id)
    : -1;
  const prevLesson = currentIndex > 0 ? filteredLessons[currentIndex - 1] : null;
  const nextLesson =
    currentIndex >= 0 && currentIndex < filteredLessons.length - 1
      ? filteredLessons[currentIndex + 1]
      : null;

  if (selectedLesson) {
    return (
      <LessonView
        lesson={selectedLesson}
        onBack={() => setSelectedLesson(null)}
        prevLesson={prevLesson}
        nextLesson={nextLesson}
        onPrevious={prevLesson ? () => setSelectedLesson(prevLesson) : undefined}
        onNext={nextLesson ? () => setSelectedLesson(nextLesson) : undefined}
      />
    );
  }

  const contentPadding = isMobile ? SPACING.lg : 32;

  return (
    <div
      style={{
        backgroundColor: COLORS.backgroundLibrary,
        minHeight: '100vh',
        width: '100%',
        boxSizing: 'border-box',
        overflowX: 'hidden',
      }}
    >
      <div
        style={{
          maxWidth: 1400,
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box',
          padding: `0 ${contentPadding}px ${contentPadding}px`,
        }}
      >
        {/* Page title, subtitle & admin actions */}
        <div
          style={{
            marginBottom: 32,
            marginTop: 32,
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'flex-start' : 'center',
            justifyContent: 'space-between',
            gap: SPACING.md,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: isMobile ? 24 : 30,
                fontWeight: 800,
                color: COLORS.textPrimary,
                margin: 0,
                marginBottom: SPACING.sm,
              }}
            >
              Pickleball Training Library
            </h1>
            <p
              style={{
                ...TYPOGRAPHY.bodySmall,
                color: COLORS.textSecondary,
                margin: 0,
              }}
            >
              Master your game with professional drills and advanced techniques curated by experts.
            </p>
          </div>

          {isAdmin && (
            <Button
              variant="primary"
              size="md"
              onClick={() => setShowAddModal(true)}
            >
              Add video
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

        {/* Filter chips - pill style, horizontal scroll, edge to edge */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            overflowX: 'auto',
            paddingBottom: SPACING.lg,
            marginBottom: SPACING.lg,
            marginLeft: -contentPadding,
            marginRight: -contentPadding,
            paddingLeft: contentPadding,
            paddingRight: contentPadding,
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
          className="library-filter-chips"
        >
          {categories.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                style={{
                  flexShrink: 0,
                  padding: '8px 20px',
                  borderRadius: 9999,
                  border: isActive ? 'none' : '1px solid #e2e8f0',
                  background: isActive ? COLORS.libraryPrimary : COLORS.white,
                  color: isActive ? '#fff' : '#475569',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {isMobile ? (
          <>
            <h2 style={{ ...TYPOGRAPHY.h3, margin: '0 0 16px', color: COLORS.textPrimary }}>
              Recent Lessons
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
              {filteredLessons.map((lesson) => (
                <LessonCard
                  key={lesson.id}
                  title={lesson.title}
                  category={lesson.category}
                  thumbnail={lesson.thumbnail}
                  videoUrl={lesson.videoUrl}
                  progress={lesson.progress}
                  isVOD={lesson.isVOD}
                  isCompleted={lesson.isCompleted}
                  onClick={() => setSelectedLesson(lesson)}
                  variant="list"
                />
              ))}
            </div>
          </>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 24,
              marginBottom: SPACING.xxl,
            }}
          >
            {filteredLessons.map((lesson) => (
              <LessonCard
                key={lesson.id}
                title={lesson.title}
                category={lesson.category}
                thumbnail={lesson.thumbnail}
                videoUrl={lesson.videoUrl}
                progress={lesson.progress}
                isVOD={lesson.isVOD}
                isCompleted={lesson.isCompleted}
                onClick={() => setSelectedLesson(lesson)}
                variant="grid"
              />
            ))}
          </div>
        )}

        {filteredLessons.length === 0 && (
          <div style={{ textAlign: 'center', padding: SPACING.xxl }}>
            <p style={{ ...TYPOGRAPHY.body, color: COLORS.textSecondary }}>
              No lessons found. Try a different filter or search.
            </p>
          </div>
        )}
      </div>
      <style>{`
        .library-filter-chips::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};
