import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { COLORS, SPACING, TYPOGRAPHY } from '../styles/theme';
import { getYoutubeVideoId } from '@/lib/youtube';
import { LessonCard } from './Cards';
import { createClient } from '@/lib/supabase/client';
import { fetchSessionComments, mapDbCommentToSessionComment } from '@/lib/sessionComments';
import { fetchShotVideos, fetchShotVideoCountsByShot, shotVideoToSessionLike, type ShotVideoRow } from '@/lib/shotVideos';
import { fetchMultipleShotTechniqueChecks, type ShotTechniqueCheckRow } from '@/lib/shotTechniqueChecks';
import { fetchShotTechniqueSubVisibilityBatch } from '@/lib/shotTechniqueSubVisibility';
import { parseCommentTextWithShots } from './commentText';
import { Breadcrumb } from './Breadcrumb';
import {
  IconUser,
  IconCheck,
  IconTarget,
  IconHand,
  IconArrowDownUp,
  IconZap,
  IconSearch,
  IconPlay,
  IconSettings,
  IconChevronRight,
} from './Icons';
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

/** Sub-category for shots that have variants (e.g. Forehand Dink: Normal, Topspin, Slice). Each has its own checklist. */
export type TechniqueSubCategory = {
  id: string;
  label: string;
  items: { label: string; completed: boolean }[];
};

/** Each shot is its own card with icon and checklist. Exported for use in TrainingSessionDetail shot technique tab. */
export const ROADMAP_SKILLS: Array<{
  id: string;
  title: string;
  icon: React.ReactNode;
  items: Array<{ label: string; completed: boolean }>;
  subCategories?: TechniqueSubCategory[];
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
    subCategories: [
      {
        id: 'normal',
        label: 'Basic',
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
        id: 'topspin',
        label: 'Topspin',
        items: [
          { label: 'Lead leg behind the ball (don\'t reach sideways)', completed: false },
          { label: 'Balanced stance with knees bent', completed: false },
          { label: 'Paddle in front of body. Minimal backswing.', completed: false },
          { label: 'Eyes on ball', completed: false },
          { label: 'Head stable (don\'t rise up during shot)', completed: false },
          { label: 'Paddle tip drops below the ball. Butt cap facing upward → confirms paddle head is low', completed: false },
          { label: 'Paddle face slightly open', completed: false },
          { label: 'Contact Ball in front of body', completed: false },
          { label: 'Contact low and let the ball bounce down', completed: false },
          { label: 'Brush up the back of the ball for topspin', completed: false },
          { label: 'Swing low → high', completed: false },
          { label: 'Motion mainly from the shoulder, not wrist', completed: false },
          { label: 'Think smooth lift, not roll or flick', completed: false },
          { label: 'Optional cue: small C-shape with elbow to accelerate upward', completed: false },
          { label: 'Don\'t reach for the ball. Hit the ball while it is falling down.', completed: false },
        ],
      },
      {
        id: 'slice',
        label: 'Slice',
        items: [
          { label: 'Continental grip', completed: false },
          { label: "Lead leg behind the ball (don\u2019t reach)", completed: false },
          { label: 'Paddle in front of body', completed: false },
          { label: 'Balanced stance with bent knees', completed: false },
          { label: 'Eyes on the ball', completed: false },
          { label: 'Head stable (don\u2019t rise during contact)', completed: false },
          { label: 'Imagine a roof above your head (don\u2019t pop up)', completed: false },
          { label: 'Paddle face open (tilted upward)', completed: false },
          { label: 'Wrist set and stable', completed: false },
          { label: 'Paddle angle stays the same throughout the shot', completed: false },
          { label: 'Contact in front of body', completed: false },
          { label: 'Smooth controlled swing (no hacking or chopping)', completed: false },
          { label: 'Swing driven by shoulders and hips, not wrist', completed: false },
          { label: 'Think Nike swoosh shape swing path', completed: false },
        ],
      },
      {
        id: 'short-hop',
        label: 'Short Hop',
        items: [
          { label: 'Reach forward toward the ball (don\'t wait back)', completed: false },
          { label: 'Paddle in front of body', completed: false },
          { label: 'Balanced stance with bent knees', completed: false },
          { label: 'Eyes on the ball', completed: false },
          { label: 'Contact immediately after the bounce (short hop timing)', completed: false },
          { label: 'Paddle below the ball', completed: false },
          { label: 'No wrist movement', completed: false },
          { label: 'Very short motion', completed: false },
          { label: 'No backswing', completed: false },
        ],
      },
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
    subCategories: [
      {
        id: 'basic',
        label: 'Basic',
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
        id: 'slice',
        label: 'Slice',
        items: [
          { label: 'Feet aligned with target (line from feet → target)', completed: false },
          { label: 'Balanced stance with bent knees', completed: false },
          { label: 'Dominant shoulder angled downward toward the ball', completed: false },
          { label: 'Eyes on the ball', completed: false },
          { label: 'Continental or slight backhand grip', completed: false },
          { label: 'Wrist locked and stable (no flicking)', completed: false },
          { label: 'Elbow extended / arm mostly straight', completed: false },
          { label: 'Contact in front of body', completed: false },
          { label: "Don't reach for the ball. Hit the ball while falling down", completed: false },
          { label: 'Start swing just in front of back hip like a pendulum', completed: false },
          { label: 'Move paddle forward with slight lift', completed: false },
          { label: 'Use shoulders and body rotation, not wrist', completed: false },
          { label: 'Extend paddle toward the target', completed: false },
          { label: 'Do not chop or hack at the ball', completed: false },
          { label: 'Stay low through contact', completed: false },
          { label: 'Keep head stable', completed: false },
          { label: 'Finish balanced', completed: false },
        ],
      },
      {
        id: 'volley',
        label: 'Volley',
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
        id: 'two-handed',
        label: 'Two Handed',
        items: [
          { label: 'Both hands on paddle', completed: false },
          { label: 'Paddle in front of body', completed: false },
          { label: 'Balanced stance with knees bent', completed: false },
          { label: 'Eyes on ball', completed: false },
          { label: 'Contact in front and low', completed: false },
          { label: 'Slight open paddle face', completed: false },
          { label: 'Compact shoulder swing', completed: false },
          { label: 'Lift low → high', completed: false },
          { label: 'Recover to ready position', completed: false },
        ],
      },
      {
        id: 'short-hop',
        label: 'Short Hop',
        items: [
          { label: 'Read the short hop early', completed: false },
          { label: 'Move in quickly', completed: false },
          { label: 'Paddle in front of body', completed: false },
          { label: 'Contact ball early off the bounce', completed: false },
          { label: 'Soft hands', completed: false },
          { label: 'Compact stroke', completed: false },
          { label: 'Lift low → high', completed: false },
          { label: 'Recover to ready position', completed: false },
        ],
      },
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

/** Label for the "roof" technique point; when present we show the custom roof icon. Exported for TrainingSessionDetail. */
export const ROOF_TECHNIQUE_LABEL = "Imagine a roof above your head (don\u2019t pop up)";

/** Icons for technique point cards (cycle by index to match reference variety). Exported for use in TrainingSessionDetail. */
export const TECHNIQUE_ICONS = [
  <IconTarget key="target" size={24} />,
  <IconHand key="hand" size={24} />,
  <IconArrowDownUp key="arrow" size={24} />,
  <IconZap key="zap" size={24} />,
];

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
    skill.id === 'backhand-dink'
      ? 'https://cdn.pickleball.com/news/1738690596502/psxuRaIs.jpeg?width=1320&height=528&optimizer=image'
      : 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800';
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

  const isSettings = variant === 'settings';

  return (
    <div style={{ position: 'relative', flexShrink: 0 }} ref={ref}>
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
    return list.sort((a, b) => (sessionCountByShotId[b.id] ?? 0) - (sessionCountByShotId[a.id] ?? 0));
  }, [searchQuery, sessionCountByShotId]);

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
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, lineHeight: 1.3, color: COLORS.textPrimary }}>
                  {skill.title}
                </h3>
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
        {/* Header */}
        {hideSegmentSwitcher ? (
          <>
            <header
              data-purpose="game-analytics-header"
              style={{
                backgroundColor: COLORS.brandLight,
                margin: '-24px -24px 0',
                paddingTop: 48,
                paddingBottom: 32,
                paddingLeft: 24,
                paddingRight: 24,
                borderBottomLeftRadius: 40,
                borderBottomRightRadius: 40,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  marginBottom: 24,
                }}
              >
                <h2
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: '#1f2937',
                    lineHeight: 1.2,
                    textAlign: 'center',
                  }}
                >
                  Player Profile
                </h2>
                <div style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)' }}>
                  <ProfileMenuButton size={46} variant="settings" />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ position: 'relative', marginBottom: 16 }}>
                  <div
                    style={{
                      width: 96,
                      height: 96,
                      borderRadius: '50%',
                      border: '4px solid white',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: COLORS.white,
                    }}
                  >
                    {(user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture) ? (
                      <img
                        alt="Profile"
                        src={String(user.user_metadata.avatar_url ?? user.user_metadata.picture)}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <IconUser size={40} style={{ color: COLORS.brandDark }} />
                    )}
                  </div>
                </div>
                <p
                  style={{
                    fontSize: 16,
                    fontWeight: 500,
                    color: COLORS.brandDark,
                    opacity: 0.8,
                    margin: 0,
                  }}
                >
                  {welcomeName}
                </p>
              </div>
            </header>
            {/* Metric cards */}
            <section
              data-purpose="quick-stats"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 12,
                padding: '0 12px',
                marginTop: -24,
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  minHeight: 90,
                  minWidth: 0,
                  backgroundColor: COLORS.white,
                  border: '1px solid #E8F1EE',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                  borderRadius: 16,
                  padding: 12,
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  boxSizing: 'border-box',
                }}
              >
                <span style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#9ca3af', marginBottom: 4 }}>
                  Games Analyzed
                </span>
                <span style={{ display: 'block', fontSize: 18, fontWeight: 700, color: COLORS.brandDark }}>
                  {sessions.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onOpenRoadmap?.()}
                style={{
                  position: 'relative',
                  minHeight: 90,
                  minWidth: 0,
                  backgroundColor: COLORS.white,
                  border: '1px solid #E8F1EE',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                  borderRadius: 16,
                  padding: 12,
                  textAlign: 'center',
                  cursor: onOpenRoadmap ? 'pointer' : 'default',
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  boxSizing: 'border-box',
                }}
              >
                <span style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#9ca3af', marginBottom: 4 }}>
                  Shots Analyzed
                </span>
                <span style={{ display: 'block', fontSize: 18, fontWeight: 700, color: COLORS.brandDark }}>
                  {Object.values(shotVideoCountByShotId).reduce((a, b) => a + b, 0)}
                </span>
                {onOpenRoadmap && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: 12,
                      right: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <IconChevronRight size={14} style={{ color: COLORS.brandDark }} />
                  </span>
                )}
              </button>
              {(() => {
                const mostTrained = Object.entries(shotVideoCountByShotId)
                  .sort((a, b) => b[1] - a[1])[0];
                const mostTrainedSkill = mostTrained
                  ? ROADMAP_SKILLS.find((s) => s.id === mostTrained[0])
                  : null;
                const mostTrainedTitle = mostTrainedSkill?.title ?? '—';
                const canOpen = Boolean(onOpenShotDetail && mostTrainedSkill);
                return (
                  <button
                    type="button"
                    onClick={() => canOpen && onOpenShotDetail?.(mostTrainedTitle)}
                    style={{
                      position: 'relative',
                      minHeight: 90,
                      minWidth: 0,
                      backgroundColor: COLORS.white,
                      border: '1px solid #E8F1EE',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                      borderRadius: 16,
                      padding: 12,
                      textAlign: 'center',
                      cursor: canOpen ? 'pointer' : 'default',
                      width: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      boxSizing: 'border-box',
                    }}
                  >
                    <span style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#9ca3af', marginBottom: 4 }}>
                      Most trained shot
                    </span>
                    <span
                      style={{
                        display: 'block',
                        width: '100%',
                        minWidth: 0,
                        fontSize: 14,
                        fontWeight: 700,
                        color: COLORS.brandDark,
                        lineHeight: 1.2,
                        wordBreak: 'break-word',
                        textAlign: 'center',
                      }}
                    >
                      {mostTrainedTitle}
                    </span>
                    {canOpen && (
                      <span
                        style={{
                          position: 'absolute',
                          bottom: 12,
                          right: 12,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <IconChevronRight size={14} style={{ color: COLORS.brandDark }} />
                      </span>
                    )}
                  </button>
                );
              })()}
            </section>
          </>
        ) : (
          <Breadcrumb
            onBack={onBack}
            items={[{ label: title ?? 'Game Analytics' }]}
            ariaLabel="Breadcrumb"
            rightSlot={<ProfileMenuButton />}
            containerStyle={{ marginBottom: 24 }}
          />
        )}

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
                Your Game Analytics
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

        {/* Content based on selected segment */}
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
            {!isAdminView && (
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
            )}
          </div>
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
                        onOpenSession ? onOpenSession(session.id) : console.log(`Open video for training session ${session.id}`)
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

