import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { COLORS, SPACING, TYPOGRAPHY } from '../styles/theme';
import { getYoutubeVideoId } from '@/lib/youtube';
import { LessonCard } from './Cards';
import { createClient } from '@/lib/supabase/client';
import { fetchSessionComments, mapDbCommentToSessionComment } from '@/lib/sessionComments';
import { fetchShotVideos, type ShotVideoRow } from '@/lib/shotVideos';
import { parseCommentTextWithShots } from './commentText';
import {
  IconUser,
  IconCheck,
  IconTarget,
  IconHand,
  IconArrowDownUp,
  IconZap,
  IconSearch,
  IconArrowLeft,
  IconPlay,
  IconChevronRight,
} from './Icons';
import { useAuth } from './providers/AuthProvider';
import { useInView } from '@/hooks/useInView';

const SAGE_PRIMARY = '#8FB9A8';

export interface MySessionsPageProps {
  /** Override page title (e.g. "Alex's Sessions" when coach views a student) */
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
  /** When true, hide the "Your Sessions | Your Roadmap" tab switcher (e.g. student view where roadmap is in the navbar). */
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
  /** ISO date string when from DB (optional) */
  createdAtIso?: string;
  /** Tagged/mentioned users when from DB */
  taggedUsers?: { id: string; name: string }[];
  /** Filename of an attached shot-example GIF (e.g. "shot-example-Dink-Volley.gif") */
  exampleGif?: string;
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

/** Each shot is its own card with icon and checklist. */
const ROADMAP_SKILLS: Array<{
  id: string;
  title: string;
  icon: React.ReactNode;
  items: Array<{ label: string; completed: boolean }>;
}> = [
  {
    id: 'serve',
    title: 'Serve',
    icon: <IconTarget size={24} />,
    items: [
      { label: 'Balanced stance behind baseline', completed: false },
      { label: 'Paddle in front during setup', completed: false },
      { label: 'Paddle below wrist at contact', completed: false },
      { label: 'Contact in front of body', completed: false },
      { label: 'Swing low → high', completed: false },
      { label: 'Use shoulder rotation', completed: false },
      { label: 'Eyes on ball at contact', completed: false },
      { label: 'Follow through toward target', completed: false },
      { label: 'Recover and prepare for next shot', completed: false },
    ],
  },
  {
    id: 'return-of-serve',
    title: 'Return of Serve',
    icon: <IconTarget size={24} />,
    items: [
      { label: 'Split step as opponent hits', completed: false },
      { label: 'Move behind the ball', completed: false },
      { label: 'Paddle in front of body', completed: false },
      { label: 'Balanced stance', completed: false },
      { label: 'Contact in front of body', completed: false },
      { label: 'Compact swing', completed: false },
      { label: 'Eyes on ball', completed: false },
      { label: 'Hit deep to baseline', completed: false },
      { label: 'Recover quickly to kitchen line', completed: false },
    ],
  },
  {
    id: 'volley',
    title: 'Volley',
    icon: <IconHand size={24} />,
    items: [
      { label: 'Paddle in front of chest (ready position)', completed: false },
      { label: 'Balanced stance at kitchen line', completed: false },
      { label: 'Eyes on ball', completed: false },
      { label: 'Contact in front of body', completed: false },
      { label: 'Short punch motion', completed: false },
      { label: 'Soft hands when needed', completed: false },
      { label: "Aim low or at opponent's feet", completed: false },
      { label: 'Recover to ready position', completed: false },
    ],
  },
  {
    id: 'forehand-dink',
    title: 'Forehand Dink',
    icon: <IconHand size={24} />,
    items: [
      { label: 'Paddle in front of body', completed: false },
      { label: 'Balanced stance with knees bent', completed: false },
      { label: 'Eyes on ball', completed: false },
      { label: 'Contact in front and low', completed: false },
      { label: 'Slightly open paddle face', completed: false },
      { label: 'Soft grip pressure', completed: false },
      { label: 'Small shoulder-driven swing', completed: false },
      { label: 'Lift low → high', completed: false },
      { label: 'Recover to ready position', completed: false },
    ],
  },
  {
    id: 'backhand-dink',
    title: 'Backhand Dink',
    icon: <IconHand size={24} />,
    items: [
      { label: 'Paddle in front of body', completed: false },
      { label: 'Balanced stance with knees bent', completed: false },
      { label: 'Eyes on ball', completed: false },
      { label: 'Contact in front and low', completed: false },
      { label: 'Slight open paddle face', completed: false },
      { label: 'Soft hands', completed: false },
      { label: 'Compact shoulder swing', completed: false },
      { label: 'Lift low → high', completed: false },
      { label: 'Recover to ready position', completed: false },
    ],
  },
  {
    id: 'forehand-drop',
    title: 'Forehand Drop',
    icon: <IconArrowDownUp size={24} />,
    items: [
      { label: 'Paddle in front during setup', completed: false },
      { label: 'Balanced stance', completed: false },
      { label: 'Eyes on ball', completed: false },
      { label: 'Contact in front of body', completed: false },
      { label: 'Paddle slightly open', completed: false },
      { label: 'Smooth low → high swing', completed: false },
      { label: 'Use legs for control', completed: false },
      { label: 'Soft hands for touch', completed: false },
      { label: 'Recover forward', completed: false },
    ],
  },
  {
    id: 'backhand-drop',
    title: 'Backhand Drop',
    icon: <IconArrowDownUp size={24} />,
    items: [
      { label: 'Paddle in front', completed: false },
      { label: 'Balanced stance', completed: false },
      { label: 'Eyes on ball', completed: false },
      { label: 'Contact in front', completed: false },
      { label: 'Slightly open paddle face', completed: false },
      { label: 'Compact swing', completed: false },
      { label: 'Lift low → high', completed: false },
      { label: 'Soft hands', completed: false },
      { label: 'Recover forward', completed: false },
    ],
  },
  {
    id: 'reset',
    title: 'Reset',
    icon: <IconArrowDownUp size={24} />,
    items: [
      { label: 'Paddle in front of body', completed: false },
      { label: 'Balanced stance', completed: false },
      { label: 'Eyes on ball', completed: false },
      { label: 'Contact in front and low', completed: false },
      { label: 'Very short swing', completed: false },
      { label: 'Soft hands to absorb pace', completed: false },
      { label: 'Slightly open paddle face', completed: false },
      { label: 'Ball drops softly into kitchen', completed: false },
      { label: 'Recover to ready position', completed: false },
    ],
  },
  {
    id: 'volley-block',
    title: 'Volley Block',
    icon: <IconHand size={24} />,
    items: [
      { label: 'Paddle in front of chest', completed: false },
      { label: 'Balanced stance', completed: false },
      { label: 'Eyes on ball', completed: false },
      { label: 'Contact in front', completed: false },
      { label: 'No swing', completed: false },
      { label: 'Slightly open paddle face', completed: false },
      { label: 'Soft hands absorb pace', completed: false },
      { label: 'Keep ball low over net', completed: false },
      { label: 'Recover to ready position', completed: false },
    ],
  },
  {
    id: 'forehand-drive',
    title: 'Forehand Drive',
    icon: <IconZap size={24} />,
    items: [
      { label: 'Paddle in front during preparation', completed: false },
      { label: 'Balanced stance', completed: false },
      { label: 'Eyes on ball', completed: false },
      { label: 'Unit turn with shoulders', completed: false },
      { label: 'Contact in front of body', completed: false },
      { label: 'Swing low → high', completed: false },
      { label: 'Transfer weight forward', completed: false },
      { label: 'Follow through toward target', completed: false },
      { label: 'Recover to ready position', completed: false },
    ],
  },
  {
    id: 'backhand-drive',
    title: 'Backhand Drive',
    icon: <IconZap size={24} />,
    items: [
      { label: 'Paddle in front during setup', completed: false },
      { label: 'Balanced stance', completed: false },
      { label: 'Eyes on ball', completed: false },
      { label: 'Shoulder unit turn', completed: false },
      { label: 'Contact in front of body', completed: false },
      { label: 'Swing low → high', completed: false },
      { label: 'Weight transfer forward', completed: false },
      { label: 'Follow through toward target', completed: false },
      { label: 'Recover to ready position', completed: false },
    ],
  },
  {
    id: 'smash',
    title: 'Smash',
    icon: <IconZap size={24} />,
    items: [
      { label: 'Move behind the ball', completed: false },
      { label: 'Balanced stance', completed: false },
      { label: 'Eyes on ball', completed: false },
      { label: 'Paddle up and ready', completed: false },
      { label: 'Contact high and in front', completed: false },
      { label: 'Strong shoulder swing', completed: false },
      { label: 'Snap downward', completed: false },
      { label: 'Aim down into court', completed: false },
      { label: 'Recover to ready position', completed: false },
    ],
  },
  {
    id: 'putaway',
    title: 'Putaway',
    icon: <IconZap size={24} />,
    items: [
      { label: 'Paddle in front of body', completed: false },
      { label: 'Balanced stance', completed: false },
      { label: 'Eyes on ball', completed: false },
      { label: 'Contact in front', completed: false },
      { label: 'Short compact swing', completed: false },
      { label: "Aim down or at opponent's feet", completed: false },
      { label: 'Control over power', completed: false },
      { label: 'Recover immediately', completed: false },
    ],
  },
];

type RoadmapSkill = (typeof ROADMAP_SKILLS)[number];

/** Icons for technique point cards (cycle by index to match reference variety). */
const TECHNIQUE_ICONS = [
  <IconTarget key="target" size={24} />,
  <IconHand key="hand" size={24} />,
  <IconArrowDownUp key="arrow" size={24} />,
  <IconZap key="zap" size={24} />,
];

type ShotDetailTab = 'sessions' | 'technique';

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
  onClose,
  onShotDetailOpenChange,
  onWatchTutorial,
  onAddSession,
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
}) {
  const [activeTab, setActiveTab] = useState<ShotDetailTab>('sessions');
  const [addSessionModalOpen, setAddSessionModalOpen] = useState(false);
  const [addSessionYoutubeUrl, setAddSessionYoutubeUrl] = useState('');
  const [addSessionError, setAddSessionError] = useState<string | null>(null);
  const [addSessionSaving, setAddSessionSaving] = useState(false);
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(skill.items.map((item) => [item.label, item.completed]))
  );
  const [shotVideos, setShotVideos] = useState<ShotVideoRow[]>([]);
  const [loadingShotVideos, setLoadingShotVideos] = useState(false);
  const { user } = useAuth();
  const isAdmin = Boolean(studentName);
  const effectiveStudentId = studentId ?? user?.id ?? null;

  const loadShotVideos = React.useCallback(async () => {
    if (!effectiveStudentId || !skill.id) {
      setShotVideos([]);
      return;
    }
    setLoadingShotVideos(true);
    try {
      const list = await fetchShotVideos(createClient(), effectiveStudentId, skill.id);
      setShotVideos(list);
    } finally {
      setLoadingShotVideos(false);
    }
  }, [effectiveStudentId, skill.id]);

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

  const isMastered = (label: string) => completedItems[label] ?? false;
  const toggleMastered = (label: string) => {
    setCompletedItems((prev) => ({ ...prev, [label]: !(prev[label] ?? false) }));
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
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        backgroundColor: '#f6f8f8',
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header: back, title — no share, no bottom nav */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 16px 8px',
          borderBottom: `1px solid ${SAGE_PRIMARY}1A`,
          backgroundColor: '#f6f8f8',
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Back"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 48,
            height: 48,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: COLORS.textPrimary,
          }}
        >
          <IconArrowLeft size={24} />
        </button>
        <nav
          aria-label="Breadcrumb"
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            minWidth: 0,
          }}
        >
          {studentName && (
            <>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: 0,
                  border: 'none',
                  background: 'none',
                  font: 'inherit',
                  fontSize: 14,
                  fontWeight: 600,
                  lineHeight: 1.3,
                  letterSpacing: '-0.015em',
                  color: COLORS.textSecondary,
                  cursor: 'pointer',
                }}
              >
                {studentName}
              </button>
              <IconChevronRight size={14} style={{ color: COLORS.textSecondary, flexShrink: 0 }} aria-hidden />
            </>
          )}
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: 0,
              border: 'none',
              background: 'none',
              font: 'inherit',
              fontSize: 14,
              fontWeight: 600,
              lineHeight: 1.3,
              letterSpacing: '-0.015em',
              color: studentName ? COLORS.textSecondary : COLORS.textPrimary,
              cursor: 'pointer',
            }}
          >
            Your Roadmap
          </button>
          <IconChevronRight size={14} style={{ color: COLORS.textSecondary, flexShrink: 0 }} aria-hidden />
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              lineHeight: 1.3,
              letterSpacing: '-0.015em',
              color: COLORS.textPrimary,
            }}
          >
            {skill.title}
          </span>
        </nav>
        <div style={{ width: 48 }} aria-hidden />
      </div>

      {/* Tab switcher */}
      <div
        style={{
          display: 'flex',
          gap: 0,
          padding: '12px 16px 0',
          flexShrink: 0,
          borderBottom: `1px solid ${SAGE_PRIMARY}1A`,
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('sessions')}
          style={{
            flex: 1,
            padding: '12px 16px',
            border: 'none',
            borderBottom: `3px solid ${activeTab === 'sessions' ? '#6a9a95' : 'transparent'}`,
            marginBottom: -1,
            background: 'transparent',
            fontSize: 15,
            fontWeight: activeTab === 'sessions' ? 600 : 400,
            color: activeTab === 'sessions' ? COLORS.textPrimary : '#6a9a95',
            cursor: 'pointer',
            borderRadius: 0,
            transition: `border-color ${TAB_TRANSITION_MS}ms ease, color ${TAB_TRANSITION_MS}ms ease`,
          }}
        >
          Your Sessions
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('technique')}
          style={{
            flex: 1,
            padding: '12px 16px',
            border: 'none',
            borderBottom: `3px solid ${activeTab === 'technique' ? '#6a9a95' : 'transparent'}`,
            marginBottom: -1,
            background: 'transparent',
            fontSize: 15,
            fontWeight: activeTab === 'technique' ? 600 : 400,
            color: activeTab === 'technique' ? COLORS.textPrimary : '#6a9a95',
            cursor: 'pointer',
            borderRadius: 0,
            transition: `border-color ${TAB_TRANSITION_MS}ms ease, color ${TAB_TRANSITION_MS}ms ease`,
          }}
        >
          {skill.title} Technique
        </button>
      </div>

      {activeTab === 'sessions' && (
        <AnimatedTabPanel>
          {/* Your Sessions — shot videos for this student + shot, or empty state */}
          {loadingShotVideos ? (
            <div style={{ padding: 32, textAlign: 'center', color: COLORS.textSecondary }}>
              Loading…
            </div>
          ) : shotVideos.length > 0 ? (
            <div style={{ padding: '16px 16px 80px', display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                return (
                  <LessonCard
                    key={sv.id}
                    title={sv.shot_title}
                    category="Shot video"
                    videoUrl={sv.video_url}
                    dateLabel={dateLabel}
                    isVOD
                    onClick={() => window.open(sv.video_url, '_blank', 'noopener,noreferrer')}
                  />
                );
              })}
              {isAdmin && (
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
                    alignSelf: 'center',
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  <span>Add another video</span>
                </button>
              )}
            </div>
          ) : (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 32,
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
              margin: 16,
              marginTop: 12,
              minHeight: 320,
              borderRadius: 12,
              overflow: 'hidden',
              backgroundImage: `linear-gradient(0deg, rgba(16, 34, 32, 0.8) 0%, rgba(16, 34, 32, 0) 50%), url("https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800")`,
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

          {/* Technique Points */}
          <div style={{ padding: '24px 16px 80px' }}>
            <h2
              style={{
                fontSize: 22,
                fontWeight: 700,
                lineHeight: 1.3,
                letterSpacing: '-0.015em',
                color: COLORS.textPrimary,
                marginBottom: 16,
              }}
            >
              Technique Points
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {skill.items.map((item, idx) => {
                const mastered = isMastered(item.label);
                return (
                  <div
                    key={item.label}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      padding: 16,
                      borderRadius: 12,
                      backgroundColor: COLORS.white,
                      border: `1px solid ${SAGE_PRIMARY}0D`,
                      opacity: 1,
                      animation: `shotDetailCardFadeIn ${TAB_PANEL_ANIMATION_MS}ms ease-out ${idx * 50}ms both`,
                    }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        flexShrink: 0,
                        borderRadius: 12,
                        backgroundColor: `${SAGE_PRIMARY}1A`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: SAGE_PRIMARY,
                      }}
                    >
                      {TECHNIQUE_ICONS[idx % TECHNIQUE_ICONS.length]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                          color: COLORS.textPrimary,
                          margin: 0,
                        }}
                      >
                        {item.label}
                      </h3>
                      <p
                        style={{
                          fontSize: 14,
                          lineHeight: 1.5,
                          color: COLORS.textSecondary,
                          margin: '4px 0 0',
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
                        width: 24,
                        height: 24,
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
function ProfileMenuButton() {
  const { signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div style={{ position: 'relative', flexShrink: 0 }} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Profile menu"
        aria-expanded={open}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: '1px solid rgba(143, 185, 168, 0.3)',
          background: 'rgba(143, 185, 168, 0.2)',
          color: '#2d3a38',
          cursor: 'pointer',
          overflow: 'hidden',
        }}
      >
        <IconUser size={22} />
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            right: 0,
            top: '100%',
            marginTop: 4,
            minWidth: 140,
            padding: 4,
            background: COLORS.white,
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
            zIndex: 10,
          }}
        >
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
        </div>
      )}
    </div>
  );
}

export interface RoadmapSkillsChecklistProps {
  /** When set (e.g. coach viewing a student), shown in shot detail header breadcrumb. */
  studentName?: string;
  /** When set (coach/admin viewing a student), passed to ShotDetailView so "Add video" can save to DB for that student. */
  studentId?: string;
  /** When provided, called with true/false when shot detail opens/closes so parent can hide navbar. */
  onShotDetailOpenChange?: (open: boolean) => void;
  /** When provided, called when user taps "Watch Tutorial" in shot detail (e.g. switch to library tab). */
  onWatchTutorial?: () => void;
  /** When provided (admin/coach), called when admin submits a YouTube URL in the add-session modal. */
  onAddSession?: (
    youtubeUrl: string,
    context?: { studentId: string; shotId: string; shotTitle: string }
  ) => void | Promise<void>;
}

export function RoadmapSkillsChecklist({ studentName, studentId, onShotDetailOpenChange, onWatchTutorial, onAddSession }: RoadmapSkillsChecklistProps = {}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkill, setSelectedSkill] = useState<RoadmapSkill | null>(null);
  const filteredSkills = React.useMemo(() => {
    if (!searchQuery.trim()) return ROADMAP_SKILLS;
    const q = searchQuery.trim().toLowerCase();
    return ROADMAP_SKILLS.filter((skill) =>
      skill.title.toLowerCase().includes(q)
    );
  }, [searchQuery]);

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
        <ProfileMenuButton />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 24,
        }}
      >
        {filteredSkills.map((skill, index) => (
          <ScrollAnimatedCard key={skill.id} staggerIndex={index}>
            <button
              type="button"
              onClick={() => setSelectedSkill(skill)}
              style={{
                width: '100%',
                textAlign: 'left',
                cursor: 'pointer',
                backgroundColor: COLORS.white,
                borderRadius: 12,
                padding: 24,
                border: `1px solid ${SAGE_PRIMARY}1A`,
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}
            >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  backgroundColor: `${SAGE_PRIMARY}1A`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: SAGE_PRIMARY,
                  flexShrink: 0,
                }}
              >
                {skill.icon}
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, lineHeight: 1.3, color: COLORS.textPrimary }}>
                {skill.title}
              </h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {skill.items.map((item) => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      backgroundColor: item.completed ? SAGE_PRIMARY : 'transparent',
                      border: item.completed ? 'none' : `2px solid ${SAGE_PRIMARY}33`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: COLORS.white,
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    {item.completed && <IconCheck size={12} style={{ color: COLORS.white }} />}
                  </div>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: item.completed ? COLORS.textPrimary : COLORS.textSecondary,
                      lineHeight: 1.4,
                    }}
                  >
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
            </button>
          </ScrollAnimatedCard>
        ))}
      </div>

      {selectedSkill && (
        <ShotDetailView
          skill={selectedSkill}
          studentName={studentName}
          studentId={studentId}
          onClose={() => setSelectedSkill(null)}
          onShotDetailOpenChange={onShotDetailOpenChange}
          onWatchTutorial={onWatchTutorial}
          onAddSession={onAddSession}
        />
      )}
    </div>
  );
}

export const MySessionsPage: React.FC<MySessionsPageProps> = ({
  title,
  onBack,
  selectedSegment: selectedSegmentProp,
  onSelectedSegmentChange,
  onOpenSession,
  sessions: sessionsProp,
  onOpenLibrary,
  hideSegmentSwitcher = false,
  studentName,
  studentId,
  onAddSession,
}) => {
  const sessions = sessionsProp ?? [];
  const [internalSelectedSegment, setInternalSelectedSegment] = useState<'videos' | 'roadmap'>('videos');
  const selectedSegment = hideSegmentSwitcher ? 'videos' : (selectedSegmentProp ?? internalSelectedSegment);
  const setSelectedSegment = onSelectedSegmentChange ?? setInternalSelectedSegment;
  const [shotsBySession, setShotsBySession] = useState<Record<string, string[]>>({});

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
        backgroundColor: '#f6f8f8',
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
        {/* Header */}
        <div>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                marginBottom: SPACING.md,
                display: 'flex',
                alignItems: 'center',
                gap: SPACING.xs,
                color: COLORS.textSecondary,
                ...TYPOGRAPHY.bodySmall,
                cursor: 'pointer',
              }}
            >
              ← Back
            </button>
          )}
          <div
            style={{
              margin: 0,
              marginBottom: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: SPACING.md,
            }}
          >
            <h1
              style={{
                fontSize: 24,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: '#2d3a38',
                margin: 0,
              }}
            >
              {title ?? 'My Sessions'}
            </h1>
            <ProfileMenuButton />
          </div>

          {/* Segmented Control (hidden when roadmap is in navbar, e.g. student view) */}
          {!hideSegmentSwitcher && (
            <div
              style={{
                display: 'flex',
                gap: '32px',
                borderBottom: '1px solid #e1e9e7',
                marginBottom: '24px',
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedSegment('videos')}
                style={{
                  paddingBottom: '12px',
                  border: 'none',
                  borderBottom: `3px solid ${selectedSegment === 'videos' ? '#6a9a95' : 'transparent'}`,
                  borderRadius: 0,
                  backgroundColor: 'transparent',
                  color: selectedSegment === 'videos' ? '#333333' : '#6a9a95',
                  fontSize: 14,
                  fontWeight: selectedSegment === 'videos' ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                Your Sessions
              </button>
              <button
                type="button"
                onClick={() => setSelectedSegment('roadmap')}
                style={{
                  paddingBottom: '12px',
                  border: 'none',
                  borderBottom: `3px solid ${selectedSegment === 'roadmap' ? '#6a9a95' : 'transparent'}`,
                  borderRadius: 0,
                  backgroundColor: 'transparent',
                  color: selectedSegment === 'roadmap' ? '#333333' : '#6a9a95',
                  fontSize: 14,
                  fontWeight: selectedSegment === 'roadmap' ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                Your Roadmap
              </button>
            </div>
          )}
        </div>

        {/* Content based on selected segment */}
        {selectedSegment === 'videos' && sessions.length === 0 && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 32,
              textAlign: 'center',
              minHeight: 320,
            }}
          >
            {/* Illustration: court card with ball and paddle line */}
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
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0.1,
                  }}
                >
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
                  {/* Tennis ball / sport icon */}
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
                No sessions yet
              </h2>
              <p
                style={{
                  ...TYPOGRAPHY.bodySmall,
                  color: COLORS.textSecondary,
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                Book your first session and wait for the Academy to upload your recording. In the meantime watch our Video Lessons to improve your skills.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenLibrary?.()}
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
                cursor: onOpenLibrary ? 'pointer' : 'default',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
              onMouseDown={(e) => onOpenLibrary && (e.currentTarget.style.transform = 'scale(0.98)')}
              onMouseUp={(e) => (e.currentTarget.style.transform = '')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = '')}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              <span>Watch Video Lessons</span>
            </button>
          </div>
        )}
        {selectedSegment === 'videos' && sessions.length > 0 && (
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
                        onOpenSession ? onOpenSession(session.id) : console.log(`Open video for training session ${session.id}`)
                      }
                    />
                  </div>
                </ScrollAnimatedCard>
              ))}
            </div>
          </div>
        )}

        {selectedSegment === 'roadmap' && (
          <RoadmapSkillsChecklist studentName={studentName} studentId={studentId} onAddSession={onAddSession} />
        )}
      </div>
    </div>
  );
};

