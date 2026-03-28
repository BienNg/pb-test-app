import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { COLORS, SPACING, TYPOGRAPHY } from '../styles/theme';
import { getYoutubeVideoId } from '@/lib/youtube';
import { LessonCard } from './Cards';
import { createClient } from '@/lib/supabase/client';
import { fetchSessionComments, mapDbCommentToSessionComment } from '@/lib/sessionComments';
import { fetchShotVideos, fetchShotVideoCountsByShot, shotVideoToSessionLike, type ShotVideoRow } from '@/lib/shotVideos';
import { fetchFocusedSkillIds, upsertFocusedSkillIds } from '@/lib/studentFocusedSkills';
import { fetchMultipleShotTechniqueChecks, type ShotTechniqueCheckRow } from '@/lib/shotTechniqueChecks';
import { fetchShotTechniqueSubVisibilityBatch } from '@/lib/shotTechniqueSubVisibility';
import { parseCommentTextWithShots } from './commentText';
import { Breadcrumb } from './Breadcrumb';
import {
  IconUser,
  IconCheck,
  IconTarget,
  IconSearch,
  IconPlay,
  IconSettings,
} from './Icons';
import { TechniqueSubCategory, ROADMAP_SKILLS, ROOF_TECHNIQUE_LABEL, TECHNIQUE_ICONS } from '../data/roadmapSkills';
import { PlayerProfileHeader } from './GameAnalytics/PlayerProfileHeader';
import { QuickStatsSection } from './GameAnalytics/QuickStatsSection';
import { SegmentSwitcher } from './GameAnalytics/SegmentSwitcher';
import { SessionsEmptyState } from './GameAnalytics/SessionsEmptyState';
import { useAuth } from './providers/AuthProvider';
import { useInView } from '@/hooks/useInView';

const SAGE_PRIMARY = '#8FB9A8';

export interface GameAnalyticsPageProps {
  /** Override page title (e.g. "Alex's Game Analytics" when coach views a student) */
  title?: string;
  /** When set, show a back button (e.g. in coach view) */
  onBack?: () => void;
  /** Optional controlled value for which segment is selected. When omitted, component manages its own state. */
  selectedSegment?: 'videos' | 'roadmap';
  /** Called when the selected segment changes (used with controlled selectedSegment). */
  onSelectedSegmentChange?: (segment: 'videos' | 'roadmap') => void;
  /** When set, open a full-screen training session view instead of inline modal */
  onOpenSession?: (sessionId: string) => void;
  /** Sessions to display (e.g. from DB for a student). Required; when empty, no sessions are shown. */
  sessions: TrainingSession[];
  /** Optional callback when user taps "Watch Video Lessons" in the empty state (e.g. switch to library tab). */
  onOpenLibrary?: () => void;
  /** Optional callback when user taps the arrow on "Shots Analyzed" card (e.g. switch to roadmap tab). */
  onOpenRoadmap?: () => void;
  /** Optional callback when user taps "Most trained shot" card (e.g. open that shot's detail in roadmap tab). */
  onOpenShotDetail?: (shotTitle: string) => void;
  /** When true, hide the "Your Shot Analytics | Your Roadmap" tab switcher (e.g. student view where roadmap is in the navbar). */
  hideSegmentSwitcher?: boolean;
  /** When set (e.g. coach viewing a student), shown in shot detail header breadcrumb. */
  studentName?: string;
  /** When set (coach/admin viewing a student), used when saving "Add video" to DB. */
  studentId?: string;
  /** When provided (admin/coach), called when admin submits a YouTube URL in the add-session modal. Context includes studentId, shotId, shotTitle when adding for a specific student/shot. */
  onAddSession?: (
    youtubeUrl: string,
    context?: { studentId: string; shotId: string; shotTitle: string }
  ) => void | Promise<void>;
  /** When provided, called when user taps a shot video in the roadmap "Your Shot Analytics" tab; opens that video in TrainingSessionDetail. */
  onOpenShotVideo?: (session: TrainingSession) => void;
  /** When set, open the shot detail for the skill with this title (e.g. when returning from session detail breadcrumb). */
  openShotTitle?: string | null;
  /** Called after opening shot detail from openShotTitle so parent can clear it. */
  onOpenShotTitleConsumed?: () => void;
  /** When true, hide the "Your Shot Analytics" tab in shot detail (e.g. for student and admin views). */
  hideShotAnalyticsTab?: boolean;
}

export interface TrainingSession {
  id: string;
  dateKey: string;
  dateLabel: string;
  time: string;
  thumbnail: string;
  duration: string;
  title: string;
  focus: string;
  videoUrl: string;
  session_type?: string;
}

export interface SessionComment {
  id: number | string;
  author: string;
  role: 'Coach' | 'You' | string;
  createdAt: string;
  text: string;
  /** Timestamp in seconds - clicking jumps video to this point (Frame.io style) */
  timestampSeconds?: number;
  /** Loop end timestamp in seconds; when set, comment has a loop range. */
  loopEndTimestampSeconds?: number;
  /** ISO date string when from DB (optional) */
  createdAtIso?: string;
  /** Tagged/mentioned users when from DB */
  taggedUsers?: { id: string; name: string }[];
  /** Filename of an attached shot-example GIF (e.g. "shot-example-Dink-Volley.gif") */
  exampleGif?: string;
  /** Optional loop-comment text box layout on the video overlay (percent-based). */
  textBoxXPercent?: number;
  textBoxYPercent?: number;
  textBoxWidthPercent?: number;
  textBoxHeightPercent?: number;
}

/** A reply to a session comment (stored as a subcomment in the DB). */
export interface SessionCommentReply extends Omit<SessionComment, 'id'> {
  /** Database id for the reply (always a UUID string). */
  id: string;
  /** Parent comment this reply belongs to. */
  parentCommentId: string;
  /** Frame marker position/size (0–100 percent for x/y, px for radius). When set, shown when viewing this reply. */
  markerXPercent?: number;
  markerYPercent?: number;
  markerRadiusX?: number;
  markerRadiusY?: number;
  markerTextBoxXPercent?: number;
  markerTextBoxYPercent?: number;
  markerTextBoxWidthPercent?: number;
  markerTextBoxHeightPercent?: number;
}

const CARD_ANIMATION_DURATION_MS = 480;
const CARD_STAGGER_MS = 80;

/** Wraps content and animates it in when it scrolls into view (fade + slide up), with optional stagger delay. */
function ScrollAnimatedCard({ children, staggerIndex = 0 }: { children: React.ReactNode; staggerIndex?: number }) {
  const { ref, inView } = useInView({ threshold: 0.08, rootMargin: '0px 0px -24px 0px', triggerOnce: true });
  const delayMs = inView ? staggerIndex * CARD_STAGGER_MS : 0;
  return (
    <div
      ref={ref}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity ${CARD_ANIMATION_DURATION_MS}ms ease-out, transform ${CARD_ANIMATION_DURATION_MS}ms ease-out`,
        transitionDelay: `${delayMs}ms`,
      }}
    >
      {children}
    </div>
  );
}

type RoadmapSkill = (typeof ROADMAP_SKILLS)[number];


type ShotDetailTab = 'analytics' | 'sessions' | 'technique';

const TAB_TRANSITION_MS = 220;
const TAB_PANEL_ANIMATION_MS = 280;

/** Wraps tab content and animates it in on mount (fade + slide up). */
function AnimatedTabPanel({ children }: { children: React.ReactNode }) {
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <div
      style={{
        opacity: entered ? 1 : 0,
        transform: entered ? 'translateY(0)' : 'translateY(10px)',
        transition: `opacity ${TAB_PANEL_ANIMATION_MS}ms ease-out, transform ${TAB_PANEL_ANIMATION_MS}ms ease-out`,
      }}
    >
      {children}
    </div>
  );
}

/** Full-screen shot detail view: header, tab switcher, hero + technique or empty sessions. No navbar. */
function ShotDetailView({
  skill,
  studentName,
  studentId,
  onClose: _onClose,
  onShotDetailOpenChange,
  onWatchTutorial,
  onAddSession,
  onOpenShotVideo,
  hideShotAnalyticsTab = false,
}: {
  skill: RoadmapSkill;
  /** When set (e.g. coach viewing a student), shown as first segment in the header breadcrumb. */
  studentName?: string;
  /** When set (coach/admin viewing a student), passed to onAddSession so the video can be stored for that student/shot. */
  studentId?: string;
  onClose: () => void;
  onShotDetailOpenChange?: (open: boolean) => void;
  onWatchTutorial?: () => void;
  /** When set (admin/coach), called when admin submits a YouTube URL in the add-session modal. */
  onAddSession?: (
    youtubeUrl: string,
    context?: { studentId: string; shotId: string; shotTitle: string }
  ) => void | Promise<void>;
  /** When provided, called when user taps a shot video card; opens that video in TrainingSessionDetail. */
  onOpenShotVideo?: (session: TrainingSession) => void;
  /** When true, hide the "Your Shot Analytics" tab (e.g. for student and admin views). */
  hideShotAnalyticsTab?: boolean;
}) {
  const heroImageUrl =
    'https://cdn.pickleball.com/news/1738690596502/psxuRaIs.jpeg?width=1320&height=528&optimizer=image';
  const [activeTab, setActiveTab] = useState<ShotDetailTab>(hideShotAnalyticsTab ? 'sessions' : 'analytics');
  const [addSessionModalOpen, setAddSessionModalOpen] = useState(false);
  const [addSessionYoutubeUrl, setAddSessionYoutubeUrl] = useState('');
  const [addSessionError, setAddSessionError] = useState<string | null>(null);
  const [addSessionSaving, setAddSessionSaving] = useState(false);
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>(() => {
    if (skill.subCategories) {
      const entries: [string, boolean][] = [];
      for (const sub of skill.subCategories) {
        for (const item of sub.items) {
          entries.push([`${sub.id}:${item.label}`, item.completed]);
        }
      }
      return Object.fromEntries(entries);
    }
    return Object.fromEntries(skill.items.map((item) => [item.label, item.completed]));
  });
  const [selectedTechniqueSubId, setSelectedTechniqueSubId] = useState<string | null>(() =>
    skill.subCategories?.[0]?.id ?? null
  );
  const [shotVideos, setShotVideos] = useState<ShotVideoRow[]>([]);
  const [loadingShotVideos, setLoadingShotVideos] = useState(false);
  const [allChecks, setAllChecks] = useState<Pick<ShotTechniqueCheckRow, 'shot_video_id' | 'sub_category_id' | 'item_label' | 'checked'>[]>([]);
  const [visibilityByShotVideo, setVisibilityByShotVideo] = useState<Record<string, string[]>>({});
  const { user } = useAuth();
  const isAdmin = Boolean(studentName);
  const effectiveStudentId = studentId ?? user?.id ?? null;

  const loadShotVideos = React.useCallback(async () => {
    if (!effectiveStudentId || !skill.id) {
      setShotVideos([]);
      setAllChecks([]);
      setVisibilityByShotVideo({});
      return;
    }
    setLoadingShotVideos(true);
    try {
      const supabase = createClient();
      const list = await fetchShotVideos(supabase, effectiveStudentId, skill.id);
      setShotVideos(list);
      if (list.length > 0) {
        const [checks, visibility] = await Promise.all([
          fetchMultipleShotTechniqueChecks(supabase, list.map(v => v.id)),
          fetchShotTechniqueSubVisibilityBatch(supabase, list.map(v => v.id)),
        ]);
        setAllChecks(checks);
        setVisibilityByShotVideo(visibility);
      } else {
        setAllChecks([]);
        setVisibilityByShotVideo({});
      }
    } finally {
      setLoadingShotVideos(false);
    }
  }, [effectiveStudentId, skill.id]);

  const pointsToImprove = React.useMemo(() => {
    if (shotVideos.length === 0) return [];
    
    const counts: Record<string, number> = {};
    
    shotVideos.forEach(video => {
      const videoChecks = allChecks.filter(c => c.shot_video_id === video.id);
      
      const allItems = skill.subCategories 
        ? skill.subCategories.flatMap(s => s.items.map(i => ({ subId: s.id, label: i.label })))
        : skill.items.map(i => ({ subId: null, label: i.label }));

      allItems.forEach(item => {
        const check = videoChecks.find(c => c.item_label === item.label && c.sub_category_id === item.subId);
        // If there's an explicit check, use it. Otherwise assume it hasn't been checked/mastered (false).
        const isChecked = check ? check.checked : false;
        if (!isChecked) {
          const key = item.subId ? `${item.subId}:${item.label}` : item.label;
          counts[key] = (counts[key] || 0) + 1;
        }
      });
    });

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1]) // highest first
      .map(([key, count]) => {
        const parts = key.split(':');
        let label = key;
        let subLabel = '';
        if (skill.subCategories && parts.length > 1) {
          const subId = parts[0];
          label = parts.slice(1).join(':');
          subLabel = skill.subCategories.find(s => s.id === subId)?.label || '';
        }
        return { label, subLabel, count };
      })
      .filter(x => x.count > 0);
  }, [shotVideos, allChecks, skill]);

  useEffect(() => {
    void loadShotVideos();
  }, [loadShotVideos]);

  const handleAddSessionSubmit = async () => {
    const trimmed = addSessionYoutubeUrl.trim();
    if (!trimmed) {
      setAddSessionError('Please enter a YouTube URL');
      return;
    }
    if (!getYoutubeVideoId(trimmed)) {
      setAddSessionError('Enter a valid YouTube URL (e.g. youtube.com/watch?v=... or youtu.be/...)');
      return;
    }
    setAddSessionError(null);
    setAddSessionSaving(true);
    try {
      await onAddSession?.(
        trimmed,
        studentId ? { studentId, shotId: skill.id, shotTitle: skill.title } : undefined
      );
      setAddSessionModalOpen(false);
      setAddSessionYoutubeUrl('');
      void loadShotVideos();
    } catch (e) {
      setAddSessionError(e instanceof Error ? e.message : 'Failed to add session');
    } finally {
      setAddSessionSaving(false);
    }
  };

  const getCompletedKey = (label: string, subId: string | null) =>
    subId ? `${subId}:${label}` : label;
  const isMastered = (label: string, subId?: string | null) =>
    completedItems[getCompletedKey(label, subId ?? selectedTechniqueSubId)] ?? false;
  const toggleMastered = (label: string, subId?: string | null) => {
    const key = getCompletedKey(label, subId ?? selectedTechniqueSubId);
    setCompletedItems((prev) => ({ ...prev, [key]: !(prev[key] ?? false) }));
  };

  useEffect(() => {
    onShotDetailOpenChange?.(true);
    return () => {
      onShotDetailOpenChange?.(false);
    };
  }, [onShotDetailOpenChange]);

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        backgroundColor: '#f6f8f8',
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Back button + breadcrumbs — return to roadmap */}
      <Breadcrumb
        onBack={_onClose}
        items={[
          { label: studentName ?? 'Your Roadmap', onClick: _onClose },
          { label: skill.title },
        ]}
        ariaLabel="Breadcrumb"
      />
      {/* Tab switcher */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'nowrap',
          gap: 0,
          padding: '12px 0 0',
          flexShrink: 0,
          borderBottom: `1px solid ${SAGE_PRIMARY}1A`,
          minWidth: 0,
        }}
      >
        {!hideShotAnalyticsTab && (
          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            style={{
              flex: 1,
              padding: '12px 0',
              border: 'none',
              borderBottom: `3px solid ${activeTab === 'analytics' ? '#6a9a95' : 'transparent'}`,
              marginBottom: -1,
              background: 'transparent',
              fontSize: 'clamp(14px, 2.5vw, 15px)',
              fontWeight: activeTab === 'analytics' ? 600 : 400,
              color: activeTab === 'analytics' ? COLORS.textPrimary : '#6a9a95',
              cursor: 'pointer',
              borderRadius: 0,
              textAlign: 'center',
              transition: `border-color ${TAB_TRANSITION_MS}ms ease, color ${TAB_TRANSITION_MS}ms ease`,
              wordBreak: 'break-word',
            }}
          >
            Your Shot Analytics
          </button>
        )}
        <button
          type="button"
          onClick={() => setActiveTab('sessions')}
          style={{
            flex: 1,
            padding: '12px 0',
            border: 'none',
            borderBottom: `3px solid ${activeTab === 'sessions' ? '#6a9a95' : 'transparent'}`,
            marginBottom: -1,
            background: 'transparent',
            fontSize: 'clamp(14px, 2.5vw, 15px)',
            fontWeight: activeTab === 'sessions' ? 600 : 400,
            color: activeTab === 'sessions' ? COLORS.textPrimary : '#6a9a95',
            cursor: 'pointer',
            borderRadius: 0,
            textAlign: 'center',
            transition: `border-color ${TAB_TRANSITION_MS}ms ease, color ${TAB_TRANSITION_MS}ms ease`,
            wordBreak: 'break-word',
          }}
        >
          Your {skill.title} Sessions
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('technique')}
          style={{
            flex: 1,
            padding: '12px 0',
            border: 'none',
            borderBottom: `3px solid ${activeTab === 'technique' ? '#6a9a95' : 'transparent'}`,
            marginBottom: -1,
            background: 'transparent',
            fontSize: 'clamp(14px, 2.5vw, 15px)',
            fontWeight: activeTab === 'technique' ? 600 : 400,
            color: activeTab === 'technique' ? COLORS.textPrimary : '#6a9a95',
            cursor: 'pointer',
            borderRadius: 0,
            textAlign: 'center',
            transition: `border-color ${TAB_TRANSITION_MS}ms ease, color ${TAB_TRANSITION_MS}ms ease`,
            wordBreak: 'break-word',
          }}
        >
          Technique
        </button>
      </div>

      {activeTab === 'analytics' && (
        <AnimatedTabPanel>
          {loadingShotVideos ? (
            <div style={{ padding: '32px 0', textAlign: 'center', color: COLORS.textSecondary }}>
              Loading…
            </div>
          ) : pointsToImprove.length > 0 ? (
            <div style={{ padding: '16px 0 80px' }}>
              <div style={{
                padding: 20,
                backgroundColor: COLORS.white,
                borderRadius: 16,
                border: `1px solid ${COLORS.textMuted}40`,
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700, color: COLORS.textPrimary }}>
                  Technique Points to Improve
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {pointsToImprove.slice(0, 5).map((point, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 500, color: COLORS.textPrimary }}>
                          {point.label}
                        </div>
                        {point.subLabel && (
                          <div style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 2 }}>
                            {point.subLabel}
                          </div>
                        )}
                      </div>
                      <div style={{ 
                        fontSize: 13, 
                        fontWeight: 600, 
                        color: '#b91c1c', 
                        backgroundColor: '#fee2e2', 
                        padding: '4px 8px', 
                        borderRadius: 8,
                        whiteSpace: 'nowrap'
                      }}>
                        Missed in {point.count} session{point.count !== 1 ? 's' : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '32px 0', textAlign: 'center', color: COLORS.textSecondary }}>
              {shotVideos.length > 0 ? "You're doing great! No technique points to improve." : `No analytics for ${skill.title} yet.`}
            </div>
          )}
        </AnimatedTabPanel>
      )}

      {activeTab === 'sessions' && (
        <AnimatedTabPanel>
          {loadingShotVideos ? (
            <div style={{ padding: '32px 0', textAlign: 'center', color: COLORS.textSecondary }}>
              Loading…
            </div>
          ) : shotVideos.length > 0 ? (
            <div
              style={{
                padding: '16px 0 80px',
                display: 'flex',
                flexDirection: 'column',
                gap: 24,
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
                  gap: 16,
                  alignContent: 'start',
                }}
              >
                {shotVideos.map((sv) => {
                  const dateLabel =
                    sv.created_at &&
                    (() => {
                      try {
                        const d = new Date(sv.created_at);
                        return d.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        });
                      } catch {
                        return '';
                      }
                    })();
                  const visibleSubIds = visibilityByShotVideo[sv.id];
                  const effectiveSubIds =
                    visibleSubIds && visibleSubIds.length > 0
                      ? visibleSubIds
                      : skill.subCategories
                        ? [skill.subCategories[0].id]
                        : [];
                  const videoChecks = allChecks.filter((c) => c.shot_video_id === sv.id);
                  const techniquePointsToImproveBySubcategory: { subcategoryLabel: string; items: string[] }[] = [];
                  if (skill.subCategories && effectiveSubIds.length > 0) {
                    for (const sub of skill.subCategories) {
                      if (!effectiveSubIds.includes(sub.id)) continue;
                      const unchecked = sub.items
                        .filter((item) => {
                          const check = videoChecks.find(
                            (c) => c.item_label === item.label && c.sub_category_id === sub.id
                          );
                          return !(check ? check.checked : false);
                        })
                        .map((item) => item.label);
                      if (unchecked.length > 0) {
                        techniquePointsToImproveBySubcategory.push({
                          subcategoryLabel: sub.label,
                          items: unchecked,
                        });
                      }
                    }
                  } else {
                    const unchecked = skill.items
                      .filter((item) => {
                        const check = videoChecks.find(
                          (c) => c.item_label === item.label && c.sub_category_id === null
                        );
                        return !(check ? check.checked : false);
                      })
                      .map((item) => item.label);
                    if (unchecked.length > 0) {
                      techniquePointsToImproveBySubcategory.push({
                        subcategoryLabel: skill.title,
                        items: unchecked,
                      });
                    }
                  }
                  return (
                    <LessonCard
                      key={sv.id}
                      title={sv.shot_title}
                      category="Shot video"
                      videoUrl={sv.video_url}
                      dateLabel={dateLabel}
                      isVOD
                      techniquePointsToImproveBySubcategory={
                        techniquePointsToImproveBySubcategory.length > 0
                          ? techniquePointsToImproveBySubcategory
                          : undefined
                      }
                      onClick={() =>
                        onOpenShotVideo?.(shotVideoToSessionLike(sv, getYoutubeVideoId) as TrainingSession)
                      }
                    />
                  );
                })}
                {isAdmin && (
                  <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center' }}>
                    <button
                      type="button"
                      onClick={() => setAddSessionModalOpen(true)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        width: '100%',
                        maxWidth: 240,
                        height: 56,
                        padding: '0 24px',
                        backgroundColor: 'transparent',
                        color: SAGE_PRIMARY,
                        border: `2px solid ${SAGE_PRIMARY}`,
                        borderRadius: 12,
                        fontSize: 16,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      <span>Add another video</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '32px 0',
                textAlign: 'center',
                minHeight: 320,
              }}
            >
              <div style={{ position: 'relative', marginBottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div
                  style={{
                    position: 'absolute',
                    width: 192,
                    height: 192,
                    borderRadius: '50%',
                    backgroundColor: `${SAGE_PRIMARY}1A`,
                  }}
                />
                <div
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    width: 160,
                    height: 160,
                    backgroundColor: COLORS.white,
                    borderRadius: 16,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    border: `1px solid ${COLORS.textMuted}40`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 24,
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ position: 'absolute', inset: 0, opacity: 0.1 }}>
                    <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, backgroundColor: SAGE_PRIMARY }} />
                    <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, backgroundColor: SAGE_PRIMARY }} />
                  </div>
                  <div
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      backgroundColor: `${SAGE_PRIMARY}33`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 8,
                    }}
                  >
                    <svg
                      width="48"
                      height="48"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={SAGE_PRIMARY}
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ flexShrink: 0 }}
                    >
                      <circle cx="12" cy="12" r="8" />
                      <path d="M12 4a8 8 0 0 1 0 16 8 8 0 0 1 0-16" />
                    </svg>
                  </div>
                  <div style={{ width: 48, height: 8, backgroundColor: `${SAGE_PRIMARY}4D`, borderRadius: 4 }} />
                </div>
              </div>
              <div style={{ maxWidth: 320, marginBottom: 40 }}>
                <h2
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    color: COLORS.textPrimary,
                    margin: '0 0 12px',
                  }}
                >
                  No sessions for {skill.title} yet
                </h2>
                <p
                  style={{
                    ...TYPOGRAPHY.bodySmall,
                    color: COLORS.textSecondary,
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  {isAdmin
                    ? `Add a session and attach a video for ${skill.title}. Paste a YouTube URL to add a video lesson.`
                    : `Book a session and your coach can tag ${skill.title} in your feedback. In the meantime watch Video Lessons to improve your technique.`}
                </p>
              </div>
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => setAddSessionModalOpen(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    width: '100%',
                    maxWidth: 240,
                    height: 56,
                    padding: '0 24px',
                    backgroundColor: SAGE_PRIMARY,
                    color: COLORS.white,
                    border: 'none',
                    borderRadius: 12,
                    fontSize: 16,
                    fontWeight: 700,
                    boxShadow: `0 10px 15px -3px ${SAGE_PRIMARY}33`,
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  }}
                  onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
                  onMouseUp={(e) => (e.currentTarget.style.transform = '')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = '')}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  <span>Add a session</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onWatchTutorial?.()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    width: '100%',
                    maxWidth: 240,
                    height: 56,
                    padding: '0 24px',
                    backgroundColor: SAGE_PRIMARY,
                    color: COLORS.white,
                    border: 'none',
                    borderRadius: 12,
                    fontSize: 16,
                    fontWeight: 700,
                    boxShadow: `0 10px 15px -3px ${SAGE_PRIMARY}33`,
                    cursor: onWatchTutorial ? 'pointer' : 'default',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  }}
                  onMouseDown={(e) => onWatchTutorial && (e.currentTarget.style.transform = 'scale(0.98)')}
                  onMouseUp={(e) => (e.currentTarget.style.transform = '')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = '')}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  <span>Watch Video Lessons</span>
                </button>
              )}
            </div>
          )}
        </AnimatedTabPanel>
      )}

      {activeTab === 'technique' && (
        <AnimatedTabPanel>
          {/* Hero */}
          <div
            style={{
              margin: '12px 0 16px',
              minHeight: 320,
              borderRadius: 12,
              overflow: 'hidden',
              backgroundImage: `linear-gradient(0deg, rgba(16, 34, 32, 0.8) 0%, rgba(16, 34, 32, 0) 50%), url("${heroImageUrl}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              padding: 24,
            }}
          >
            <p style={{ color: '#fff', fontSize: 28, fontWeight: 700, lineHeight: 1.2, margin: 0 }}>
              Master the {skill.title}
            </p>
            <button
              type="button"
              onClick={onWatchTutorial}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                alignSelf: 'flex-start',
                marginTop: 16,
                padding: '12px 24px',
                borderRadius: 9999,
                backgroundColor: SAGE_PRIMARY,
                color: '#1C1C1E',
                fontWeight: 700,
                fontSize: 16,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <IconPlay size={20} />
              Watch Tutorial
            </button>
          </div>

          {/* Sub-category subtabs (e.g. Forehand Dink: Normal, Topspin, Slice) */}
          {skill.subCategories && skill.subCategories.length > 0 && (
            <div
              style={{
                display: 'flex',
                gap: 0,
                padding: 0,
                flexShrink: 0,
                borderBottom: `1px solid ${SAGE_PRIMARY}1A`,
                marginTop: 8,
              }}
            >
              {skill.subCategories.map((sub) => {
                const isSelected = selectedTechniqueSubId === sub.id;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setSelectedTechniqueSubId(sub.id)}
                    style={{
                      padding: '12px 16px',
                      border: 'none',
                      borderBottom: `3px solid ${isSelected ? '#6a9a95' : 'transparent'}`,
                      marginBottom: -1,
                      background: 'transparent',
                      fontSize: 14,
                      fontWeight: isSelected ? 600 : 400,
                      color: isSelected ? COLORS.textPrimary : '#6a9a95',
                      cursor: 'pointer',
                      borderRadius: 0,
                      transition: `border-color ${TAB_TRANSITION_MS}ms ease, color ${TAB_TRANSITION_MS}ms ease`,
                    }}
                  >
                    {sub.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Technique Points */}
          <div
            style={{
              width: '100%',
              maxWidth: '100%',
              boxSizing: 'border-box',
              padding: `clamp(${SPACING.md}px, 5vw, ${SPACING.xxl}px) 0 clamp(80px, 15vh, 120px) 0`,
            }}
          >
            <h2
              style={{
                fontSize: 'clamp(18px, 4.5vw, 22px)',
                fontWeight: 700,
                lineHeight: 1.3,
                letterSpacing: '-0.015em',
                color: COLORS.textPrimary,
                marginBottom: 'clamp(12px, 2.5vw, 16px)',
              }}
            >
              Technique Points
              {skill.subCategories && selectedTechniqueSubId && (
                <span style={{ fontWeight: 500, color: COLORS.textSecondary }}>
                  {' '}
                  · {skill.subCategories.find((s) => s.id === selectedTechniqueSubId)?.label}
                </span>
              )}
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))',
                gap: 'clamp(12px, 2.5vw, 16px)',
                width: '100%',
                minWidth: 0,
                maxWidth: '100%',
              }}
            >
              {(skill.subCategories && selectedTechniqueSubId
                ? skill.subCategories.find((s) => s.id === selectedTechniqueSubId)?.items ?? []
                : skill.items
              ).map((item, idx) => {
                const mastered = isMastered(item.label);
                return (
                  <div
                    key={item.label}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'clamp(12px, 2.5vw, 16px)',
                      padding: 'clamp(12px, 2.5vw, 16px)',
                      borderRadius: 12,
                      backgroundColor: COLORS.white,
                      border: `1px solid ${SAGE_PRIMARY}0D`,
                      opacity: 1,
                      animation: `shotDetailCardFadeIn ${TAB_PANEL_ANIMATION_MS}ms ease-out ${idx * 50}ms both`,
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        width: 'clamp(36px, 10vw, 48px)',
                        height: 'clamp(36px, 10vw, 48px)',
                        flexShrink: 0,
                        borderRadius: 12,
                        backgroundColor: `${SAGE_PRIMARY}1A`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: SAGE_PRIMARY,
                      }}
                    >
                      {item.label === ROOF_TECHNIQUE_LABEL ? (
                        <img
                          src="/icons/Pickleball%20Academy%20Icons%20Roof.ico"
                          alt=""
                          width={24}
                          height={24}
                          style={{ display: 'block' }}
                          aria-hidden
                        />
                      ) : (
                        TECHNIQUE_ICONS[idx % TECHNIQUE_ICONS.length]
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3
                        style={{
                          fontSize: 'clamp(14px, 3.5vw, 16px)',
                          fontWeight: 700,
                          color: COLORS.textPrimary,
                          margin: 0,
                          wordBreak: 'break-word',
                        }}
                      >
                        {item.label}
                      </h3>
                      <p
                        style={{
                          fontSize: 'clamp(13px, 3vw, 14px)',
                          lineHeight: 1.5,
                          color: COLORS.textSecondary,
                          margin: '4px 0 0',
                          wordBreak: 'break-word',
                        }}
                      >
                        {mastered ? 'Completed' : 'Focus on this in your next practice.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleMastered(item.label)}
                      aria-label={mastered ? `Mark "${item.label}" as not mastered` : `Mark "${item.label}" as mastered`}
                      style={{
                        width: 'clamp(22px, 5vw, 24px)',
                        height: 'clamp(22px, 5vw, 24px)',
                        flexShrink: 0,
                        borderRadius: '50%',
                        backgroundColor: mastered ? SAGE_PRIMARY : 'transparent',
                        border: mastered ? 'none' : `2px solid ${SAGE_PRIMARY}33`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      {mastered && <IconCheck size={12} style={{ color: COLORS.white }} />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </AnimatedTabPanel>
      )}

      {addSessionModalOpen && (
        <div
          role="presentation"
          onClick={() => !addSessionSaving && setAddSessionModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 300,
            backgroundColor: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: SPACING.lg,
          }}
        >
          <div
            role="dialog"
            aria-label="Add session video"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: COLORS.white,
              borderRadius: 12,
              padding: SPACING.xl,
              maxWidth: 440,
              width: '100%',
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            }}
          >
            <h3 style={{ ...TYPOGRAPHY.h3, color: COLORS.textPrimary, margin: `0 0 ${SPACING.lg}px` }}>
              Add session video
            </h3>
            <p style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, margin: `0 0 ${SPACING.md}px` }}>
              Paste a YouTube URL to add a video for {skill.title}.
            </p>
            <div style={{ marginBottom: SPACING.md }}>
              <label
                htmlFor="add-session-youtube"
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
                id="add-session-youtube"
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={addSessionYoutubeUrl}
                onChange={(e) => {
                  setAddSessionYoutubeUrl(e.target.value);
                  setAddSessionError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setAddSessionModalOpen(false);
                }}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: SPACING.sm,
                  borderRadius: 8,
                  border: `1px solid ${addSessionError ? '#c00' : COLORS.textMuted}`,
                  ...TYPOGRAPHY.body,
                  color: COLORS.textPrimary,
                }}
              />
              {addSessionError && (
                <p style={{ ...TYPOGRAPHY.bodySmall, color: '#c00', margin: `${SPACING.xs}px 0 0` }}>
                  {addSessionError}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: SPACING.sm, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => !addSessionSaving && setAddSessionModalOpen(false)}
                style={{
                  padding: '10px 20px',
                  borderRadius: 8,
                  border: `1px solid ${COLORS.textMuted}`,
                  background: COLORS.white,
                  color: COLORS.textPrimary,
                  ...TYPOGRAPHY.body,
                  cursor: addSessionSaving ? 'default' : 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddSessionSubmit}
                disabled={addSessionSaving}
                style={{
                  padding: '10px 20px',
                  borderRadius: 8,
                  border: 'none',
                  background: SAGE_PRIMARY,
                  color: COLORS.white,
                  ...TYPOGRAPHY.body,
                  fontWeight: 600,
                  cursor: addSessionSaving ? 'default' : 'pointer',
                }}
              >
                {addSessionSaving ? 'Adding…' : 'Add video'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Reusable profile menu button with dropdown (Log out). Use in header or roadmap bar. */
function ProfileMenuButton({
  size = 40,
  variant = 'profile',
}: {
  size?: number;
  variant?: 'profile' | 'settings';
}) {
  const { signOut, user } = useAuth();
  const supabase = createClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [onboardingIncomplete, setOnboardingIncomplete] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    right: number;
  } | null>(null);
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        !buttonRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open) {
      queueMicrotask(() => setMenuPosition(null));
      return;
    }
    const raf = requestAnimationFrame(() => {
      if (buttonRef.current && typeof document !== 'undefined') {
        const rect = buttonRef.current.getBoundingClientRect();
        setMenuPosition({
          top: rect.bottom + 4,
          right: window.innerWidth - rect.right,
        });
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [open]);

  useEffect(() => {
    if (!user?.id || !supabase) {
      queueMicrotask(() => setOnboardingIncomplete(false));
      return;
    }
    if (!open) return;
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_completed_at')
        .eq('id', user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setOnboardingIncomplete(false);
        return;
      }
      setOnboardingIncomplete(!data?.onboarding_completed_at);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, user?.id, supabase]);

  const isSettings = variant === 'settings';

  const menuContent =
    open &&
    menuPosition &&
    typeof document !== 'undefined' ? (
      createPortal(
        <div
          ref={menuRef}
          role="menu"
          style={{
            position: 'fixed',
            top: menuPosition.top,
            right: menuPosition.right,
            minWidth: 140,
            padding: 4,
            background: COLORS.white,
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
            zIndex: 9999,
          }}
        >
          {onboardingIncomplete ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                router.push('/onboarding');
              }}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: 'none',
                borderRadius: 6,
                background: 'transparent',
                color: SAGE_PRIMARY,
                ...TYPOGRAPHY.body,
                fontWeight: 600,
                textAlign: 'left',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = COLORS.backgroundLight;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              Complete onboarding
            </button>
          ) : null}
          <button
            type="button"
            role="menuitem"
            onClick={async () => {
              setOpen(false);
              await signOut();
              router.replace('/login');
            }}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: 'none',
              borderRadius: 6,
              background: 'transparent',
              color: COLORS.textPrimary,
              ...TYPOGRAPHY.body,
              textAlign: 'left',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = COLORS.backgroundLight;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            Log out
          </button>
        </div>,
        document.body
      )
    ) : null;

  return (
    <>
      <div style={{ position: 'relative', flexShrink: 0 }} ref={buttonRef}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={isSettings ? 'Settings' : 'Profile menu'}
          aria-expanded={open}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: size,
            height: size,
            padding: isSettings ? 8 : 0,
            borderRadius: '50%',
            border: isSettings ? 'none' : '1px solid rgba(143, 185, 168, 0.3)',
            background: isSettings ? COLORS.white : 'rgba(143, 185, 168, 0.2)',
            color: isSettings ? COLORS.brandDark : '#2d3a38',
            cursor: 'pointer',
            overflow: 'hidden',
            boxShadow: isSettings ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none',
          }}
        >
          {isSettings ? <IconSettings size={20} /> : <IconUser size={22} />}
        </button>
      </div>
      {menuContent}
    </>
  );
}

export interface RoadmapSkillsChecklistProps {
  /** When set (e.g. coach viewing a student), shown in shot detail header breadcrumb. */
  studentName?: string;
  /** When set (coach/admin viewing a student), passed to ShotDetailView so "Add video" can save to DB for that student. */
  studentId?: string;
  /** Session (shot video) count per shot id for badge and sorting (descending by count). */
  sessionCountByShotId?: Record<string, number>;
  /** When provided, called with true/false when shot detail opens/closes so parent can hide navbar. */
  onShotDetailOpenChange?: (open: boolean) => void;
  /** When provided, called when user taps "Watch Tutorial" in shot detail (e.g. switch to library tab). */
  onWatchTutorial?: () => void;
  /** When provided (admin/coach), called when admin submits a YouTube URL in the add-session modal. */
  onAddSession?: (
    youtubeUrl: string,
    context?: { studentId: string; shotId: string; shotTitle: string }
  ) => void | Promise<void>;
  /** When provided, called when user taps a shot video in the roadmap; opens that video in TrainingSessionDetail. */
  onOpenShotVideo?: (session: TrainingSession) => void;
  /** When set, open the shot detail for the skill with this title (e.g. when returning from session detail breadcrumb). */
  openShotTitle?: string | null;
  /** Called after opening shot detail from openShotTitle so parent can clear it. */
  onOpenShotTitleConsumed?: () => void;
  /** When true, hide the "Your Shot Analytics" tab in shot detail (e.g. for student and admin views). */
  hideShotAnalyticsTab?: boolean;
}

export function RoadmapSkillsChecklist({ studentName, studentId, sessionCountByShotId = {}, onShotDetailOpenChange, onWatchTutorial, onAddSession, onOpenShotVideo, openShotTitle, onOpenShotTitleConsumed, hideShotAnalyticsTab }: RoadmapSkillsChecklistProps = {}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkill, setSelectedSkill] = useState<RoadmapSkill | null>(null);
  const [focusedSkillIds, setFocusedSkillIds] = useState<Set<string>>(new Set());
  const [openSettingsId, setOpenSettingsId] = useState<string | null>(null);
  const { user } = useAuth();
  const supabase = React.useMemo(() => createClient(), []);
  const effectiveStudentId = studentId ?? user?.id;

  // Load persisted focused skills on mount (or when the viewed student changes)
  useEffect(() => {
    if (!effectiveStudentId) return;
    fetchFocusedSkillIds(supabase, effectiveStudentId).then((ids) => {
      if (ids.length > 0) setFocusedSkillIds(new Set(ids));
    });
  }, [effectiveStudentId, supabase]);

  const toggleFocus = (skillId: string) => {
    const next = new Set(focusedSkillIds);
    if (next.has(skillId)) next.delete(skillId);
    else next.add(skillId);
    setFocusedSkillIds(next);
    if (effectiveStudentId) {
      upsertFocusedSkillIds(supabase, effectiveStudentId, [...next]);
    }
  };

  useEffect(() => {
    if (!openSettingsId) return;
    const handleClick = () => setOpenSettingsId(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [openSettingsId]);

  useEffect(() => {
    if (openShotTitle?.trim()) {
      const skill = ROADMAP_SKILLS.find((s) => s.title === openShotTitle?.trim());
      if (skill) queueMicrotask(() => setSelectedSkill(skill));
      onOpenShotTitleConsumed?.();
    }
  }, [openShotTitle, onOpenShotTitleConsumed]);
  const filteredSkills = React.useMemo(() => {
    const list = !searchQuery.trim()
      ? [...ROADMAP_SKILLS]
      : ROADMAP_SKILLS.filter((skill) =>
          skill.title.toLowerCase().includes(searchQuery.trim().toLowerCase())
        );
    return list.sort((a, b) => {
      const aFocused = focusedSkillIds.has(a.id) ? 1 : 0;
      const bFocused = focusedSkillIds.has(b.id) ? 1 : 0;
      if (bFocused !== aFocused) return bFocused - aFocused;
      return (sessionCountByShotId[b.id] ?? 0) - (sessionCountByShotId[a.id] ?? 0);
    });
  }, [searchQuery, sessionCountByShotId, focusedSkillIds]);

  // When a skill is selected, show shot detail as the full view (replaces list, no overlay)
  if (selectedSkill) {
    return (
      <div
        style={{
          height: '100%',
          minHeight: 'calc(100vh - 80px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <ShotDetailView
          skill={selectedSkill}
          studentName={studentName}
          studentId={studentId}
          onClose={() => setSelectedSkill(null)}
          onShotDetailOpenChange={onShotDetailOpenChange}
          onWatchTutorial={onWatchTutorial}
          onAddSession={onAddSession}
          onOpenShotVideo={onOpenShotVideo}
          hideShotAnalyticsTab={hideShotAnalyticsTab}
        />
      </div>
    );
  }

  return (
    <div style={{ marginBottom: SPACING.xl }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: SPACING.sm,
          marginBottom: 24,
          padding: `${SPACING.sm}px ${SPACING.md}px`,
          background: '#f2f7f5',
          borderRadius: 12,
          border: '1px solid rgba(0,0,0,0.04)',
        }}
      >
        <IconSearch size={18} style={{ color: SAGE_PRIMARY, flexShrink: 0 }} />
        <input
          type="search"
          placeholder="Search skills..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search skills"
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

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 24,
        }}
      >
        {filteredSkills.map((skill, index) => {
          const isFocused = focusedSkillIds.has(skill.id);
          return (
          <ScrollAnimatedCard key={skill.id} staggerIndex={index}>
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setSelectedSkill(skill)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  cursor: 'pointer',
                  backgroundColor: isFocused ? `${SAGE_PRIMARY}0D` : COLORS.white,
                  borderRadius: 12,
                  padding: 24,
                  border: isFocused ? `2px solid ${SAGE_PRIMARY}` : `1px solid ${SAGE_PRIMARY}1A`,
                  boxShadow: isFocused
                    ? `0 0 0 4px ${SAGE_PRIMARY}22, 0 2px 8px rgba(0,0,0,0.08)`
                    : '0 1px 3px rgba(0,0,0,0.06)',
                  transition: 'border 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, paddingRight: 28 }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      backgroundColor: isFocused ? `${SAGE_PRIMARY}2A` : `${SAGE_PRIMARY}1A`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: SAGE_PRIMARY,
                      flexShrink: 0,
                    }}
                  >
                    {skill.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, lineHeight: 1.3, color: COLORS.textPrimary }}>
                        {skill.title}
                      </h3>
                      {isFocused && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            fontSize: 11,
                            fontWeight: 700,
                            color: COLORS.white,
                            backgroundColor: SAGE_PRIMARY,
                            padding: '2px 7px',
                            borderRadius: 20,
                            letterSpacing: 0.3,
                            textTransform: 'uppercase',
                          }}
                        >
                          <IconTarget size={10} style={{ color: COLORS.white }} />
                          Focus
                        </span>
                      )}
                    </div>
                    {(sessionCountByShotId[skill.id] ?? 0) > 0 && (
                      <span
                        style={{
                          display: 'inline-block',
                          marginTop: 4,
                          fontSize: 12,
                          fontWeight: 600,
                          color: SAGE_PRIMARY,
                          backgroundColor: `${SAGE_PRIMARY}1A`,
                          padding: '2px 8px',
                          borderRadius: 6,
                        }}
                      >
                        {sessionCountByShotId[skill.id] === 1
                          ? '1 session'
                          : `${sessionCountByShotId[skill.id]} sessions`}
                      </span>
                    )}
                  </div>
                </div>
              </button>

              {/* Settings button */}
              <button
                type="button"
                aria-label={`Settings for ${skill.title}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenSettingsId(openSettingsId === skill.id ? null : skill.id);
                }}
                style={{
                  position: 'absolute',
                  top: 14,
                  right: 14,
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: openSettingsId === skill.id ? `${SAGE_PRIMARY}22` : 'transparent',
                  color: openSettingsId === skill.id ? SAGE_PRIMARY : COLORS.textSecondary,
                  transition: 'background-color 0.12s ease, color 0.12s ease',
                }}
                onMouseEnter={(e) => {
                  if (openSettingsId !== skill.id) {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = `${SAGE_PRIMARY}14`;
                    (e.currentTarget as HTMLButtonElement).style.color = SAGE_PRIMARY;
                  }
                }}
                onMouseLeave={(e) => {
                  if (openSettingsId !== skill.id) {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                    (e.currentTarget as HTMLButtonElement).style.color = COLORS.textSecondary;
                  }
                }}
              >
                <IconSettings size={15} />
              </button>

              {/* Settings dropdown */}
              {openSettingsId === skill.id && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: 'absolute',
                    top: 46,
                    right: 14,
                    background: COLORS.white,
                    borderRadius: 10,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.13)',
                    border: '1px solid rgba(0,0,0,0.07)',
                    padding: 4,
                    zIndex: 200,
                    minWidth: 168,
                  }}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFocus(skill.id);
                      setOpenSettingsId(null);
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 9,
                      padding: '9px 12px',
                      border: 'none',
                      background: isFocused ? `${SAGE_PRIMARY}14` : 'transparent',
                      borderRadius: 7,
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 600,
                      color: isFocused ? SAGE_PRIMARY : COLORS.textPrimary,
                      textAlign: 'left',
                    }}
                  >
                    <IconTarget size={15} style={{ color: isFocused ? SAGE_PRIMARY : COLORS.textSecondary, flexShrink: 0 }} />
                    {isFocused ? 'Remove focus' : 'Focus card'}
                  </button>
                </div>
              )}
            </div>
          </ScrollAnimatedCard>
          );
        })}
      </div>
    </div>
  );
}

export const GameAnalyticsPage: React.FC<GameAnalyticsPageProps> = ({
  title,
  onBack,
  selectedSegment: selectedSegmentProp,
  onSelectedSegmentChange,
  onOpenSession,
  sessions: sessionsProp,
  onOpenLibrary,
  onOpenRoadmap,
  onOpenShotDetail,
  hideSegmentSwitcher = false,
  studentName,
  studentId,
  onAddSession,
  onOpenShotVideo,
  openShotTitle,
  onOpenShotTitleConsumed,
  hideShotAnalyticsTab = false,
}) => {
  const { user } = useAuth();
  const sessions = sessionsProp ?? [];
  const isAdminView = Boolean(studentName);
  const [internalSelectedSegment, setInternalSelectedSegment] = useState<'videos' | 'roadmap'>('videos');
  const selectedSegment = hideSegmentSwitcher ? 'videos' : (selectedSegmentProp ?? internalSelectedSegment);
  const setSelectedSegment = onSelectedSegmentChange ?? setInternalSelectedSegment;
  const [shotsBySession, setShotsBySession] = useState<Record<string, string[]>>({});
  const [shotVideoCountByShotId, setShotVideoCountByShotId] = useState<Record<string, number>>({});
  const effectiveStudentId = studentId ?? user?.id ?? null;
  const welcomeName =
    studentName ??
    (typeof user?.user_metadata?.first_name === 'string' && user.user_metadata.first_name.trim()
      ? user.user_metadata.first_name.trim()
      : typeof user?.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()
        ? user.user_metadata.full_name.trim().split(' ')[0]
        : typeof user?.email === 'string' && user.email.includes('@')
          ? user.email.split('@')[0]
          : 'there');
  const avatarUrl = (user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture)
    ? String(user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture)
    : undefined;

  // Shot video counts per shot for roadmap (badge + sort)
  useEffect(() => {
    if (!effectiveStudentId) {
      queueMicrotask(() => setShotVideoCountByShotId({}));
      return;
    }
    const supabase = createClient();
    if (!supabase) return;
    let cancelled = false;
    (async () => {
      const counts = await fetchShotVideoCountsByShot(supabase, effectiveStudentId);
      if (!cancelled) setShotVideoCountByShotId(counts);
    })();
    return () => {
      cancelled = true;
    };
  }, [effectiveStudentId]);

  // For DB-backed sessions, load comments and derive unique shots from their texts
  useEffect(() => {
    if (!sessionsProp || sessionsProp.length === 0) return;
    const supabase = createClient();
    if (!supabase) return;

    const load = async () => {
      const result: Record<string, string[]> = {};
      for (const s of sessionsProp) {
        const rows = await fetchSessionComments(supabase, s.id);
        if (!rows || rows.length === 0) continue;
        const comments = rows.map((r) => mapDbCommentToSessionComment(r, null));
        const shotSet = new Set<string>();
        comments.forEach((c) => {
          parseCommentTextWithShots(c.text).forEach((seg) => {
            if (seg.type === 'shot') {
              shotSet.add(seg.name);
            }
          });
        });
        if (shotSet.size > 0) {
          result[s.id] = Array.from(shotSet).sort((a, b) => a.localeCompare(b));
        }
      }
      setShotsBySession(result);
    };

    void load();
  }, [sessionsProp]);

  return (
    <div
      style={{
        backgroundColor: '#F8FAFB',
        padding: '24px',
        width: '100%',
        boxSizing: 'border-box',
        overflowX: 'hidden',
        color: '#2d3a38',
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
        {hideSegmentSwitcher ? (
          <>
            <PlayerProfileHeader
              welcomeName={welcomeName}
              avatarUrl={avatarUrl}
              settingsSlot={<ProfileMenuButton size={46} variant="settings" />}
            />
            <QuickStatsSection
              sessionCount={sessions.length}
              shotVideoCountByShotId={shotVideoCountByShotId}
              onOpenRoadmap={onOpenRoadmap}
              onOpenShotDetail={onOpenShotDetail}
            />
          </>
        ) : (
          <Breadcrumb
            onBack={onBack}
            items={[{ label: title ?? 'Game Analytics' }]}
            ariaLabel="Breadcrumb"
            rightSlot={isAdminView ? null : <ProfileMenuButton />}
            containerStyle={{ marginBottom: 24 }}
          />
        )}

        {!hideSegmentSwitcher && (
          <SegmentSwitcher selectedSegment={selectedSegment} onSelect={setSelectedSegment} />
        )}

        {selectedSegment === 'videos' && (
          <>
            <h1
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: '#1f2937',
                letterSpacing: '-0.01em',
                lineHeight: 1.2,
                marginBottom: 24,
              }}
            >
              {title ?? 'Game Analytics'}
            </h1>
            {sessions.length === 0 ? (
              <SessionsEmptyState isAdminView={isAdminView} onOpenLibrary={onOpenLibrary} />
            ) : (
              <div style={{ marginBottom: 24 }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: '24px',
                  }}
                >
                  {sessions.map((session, index) => (
                    <ScrollAnimatedCard key={session.id} staggerIndex={index}>
                      <div id={`session-${session.id}`}>
                        <LessonCard
                          title={session.title || session.focus || 'Training Session'}
                          dateLabel={session.time === '—' ? session.dateLabel : `${session.dateLabel} • ${session.time}`}
                          category={session.session_type ? session.session_type.replace('_', ' ') : 'Training Session'}
                          thumbnail={session.thumbnail}
                          videoUrl={session.videoUrl}
                          shots={shotsBySession[session.id]}
                          isVOD
                          onClick={() =>
                            onOpenSession
                              ? onOpenSession(session.id)
                              : console.log(`Open video for training session ${session.id}`)
                          }
                        />
                      </div>
                    </ScrollAnimatedCard>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {selectedSegment === 'roadmap' && (
          <RoadmapSkillsChecklist
            studentName={studentName}
            studentId={studentId}
            sessionCountByShotId={shotVideoCountByShotId}
            onAddSession={onAddSession}
            onOpenShotVideo={onOpenShotVideo}
            openShotTitle={openShotTitle}
            onOpenShotTitleConsumed={onOpenShotTitleConsumed}
            hideShotAnalyticsTab={hideShotAnalyticsTab}
          />
        )}
      </div>
    </div>
  );
};

