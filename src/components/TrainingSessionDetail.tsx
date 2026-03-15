import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, RADIUS } from '../styles/theme';
import {
  IconArrowLeft,
  IconChevronRight,
  IconCheck,
  IconClock,
  IconFilter,
  IconMoreVertical,
  IconPencil,
  IconPlay,
  IconUser,
  IconX,
} from './Icons';
import type { SessionComment, TrainingSession } from './MySessionsPage';
import { ROADMAP_SKILLS, TECHNIQUE_ICONS } from './MySessionsPage';
import { createClient } from '@/lib/supabase/client';
import { parseCommentTextWithShots, type CommentSegment } from './commentText';
import {
  serializeContentEditable,
  syncContentEditableFromDraft,
  setContentEditableCursor,
} from './contentEditableUtils';
import {
  SHOT_LIST,
  SHOT_PILL_STYLE,
  REFERENCE_PRIMARY,
  MENTION_PILL_STYLE,
} from './TrainingSessionDetail/constants';
import {
  getCaretTopOffset,
  getReplyById,
  toFramePrecision,
  formatTimestamp,
} from './TrainingSessionDetail/utils';
import { ExampleGifButton } from './TrainingSessionDetail/ExampleGifButton';
import { FrameDetailCard } from './TrainingSessionDetail/FrameDetailCard';
import { ShotSuggestionsDropdown } from './TrainingSessionDetail/ShotSuggestionsDropdown';

export { SHOT_LIST, SHOT_PILL_STYLE } from './TrainingSessionDetail/constants';

declare const require: {
  context: (
    directory: string,
    useSubdirectories: boolean,
    regExp: RegExp
  ) => {
    keys: () => string[];
    (id: string): unknown;
  };
};

import type { SessionCommentReply } from './MySessionsPage';
import {
  fetchSessionComments,
  fetchSessionCommentReplies,
  insertSessionComment,
  insertSessionCommentReply,
  updateSessionComment,
  updateCommentExampleGif,
  deleteSessionComment,
  mapDbCommentToSessionComment,
  mapDbReplyToSessionCommentReply,
  fetchSessionTaggableProfiles,
  updateSessionCommentReply,
  deleteSessionCommentReply,
  type ReplyFrameMarker,
} from '@/lib/sessionComments';
import { useAuth } from './providers/AuthProvider';
import { VideoPlayer, type VideoPlayerHandle, type VideoPlayerMarker } from './VideoPlayer';
import { MOCK_COACHES } from '../data/mockCoaches';
import {
  fetchShotTechniqueChecks,
  upsertShotTechniqueCheck,
  buildTechniqueKey,
} from '@/lib/shotTechniqueChecks';

/** When set, header shows breadcrumb "StudentName > Your Roadmap > ShotTitle" (e.g. when opened from shot video in roadmap). */
export interface BreadcrumbFromRoadmap {
  studentName?: string;
  shotTitle: string;
}

export interface TrainingSessionDetailProps {
  sessionId: string;
  onBack: () => void;
  /** When provided (e.g. sessions from DB for a student), lookup session from this list. */
  sessions?: TrainingSession[];
  /** When provided (e.g. admin), allows adding a YouTube URL when session has no video. Called with session id and the new YouTube URL; persist to sessions.youtube_url. */
  onSaveVideoUrl?: (sessionId: string, youtubeUrl: string) => Promise<void>;
  /** Optional callback to refresh parent session data after edits. */
  onSessionUpdated?: () => Promise<void> | void;
  /** Optional callback invoked after a session is deleted. Typically navigates away. */
  onDeleteSession?: (sessionId: string) => Promise<void> | void;
  /** When false, the video is paused (e.g. user switched to another tab). Default true. */
  isTabVisible?: boolean;
  /** When set (e.g. opened from shot video in roadmap), header shows breadcrumb instead of date. */
  breadcrumbFromRoadmap?: BreadcrumbFromRoadmap;
  /** When provided, clicking the shot title in the breadcrumb calls this (e.g. open shot detail view) instead of onBack. */
  onBreadcrumbShotClick?: (shotTitle: string) => void;
  /** When true (e.g. in Admin app), shot technique tab shows checkboxes. */
  isAdminView?: boolean;
}

export const TrainingSessionDetail: React.FC<TrainingSessionDetailProps> = ({
  sessionId,
  onBack,
  sessions: sessionsProp,
  onSaveVideoUrl,
  onSessionUpdated,
  onDeleteSession,
  isTabVisible = true,
  breadcrumbFromRoadmap,
  onBreadcrumbShotClick,
  isAdminView = false,
}) => {
  const { user } = useAuth();
  const sessionList = sessionsProp ?? [];
  const session = sessionList.find((s) => s.id === sessionId);
  const hasVideoUrl = !!(session?.videoUrl?.trim());
  const canAddVideoUrl = !!onSaveVideoUrl;
  const isAdmin = !!onSaveVideoUrl || isAdminView;
  const isShotVideo = session?.session_type === 'shot_video';
  const isDbSession = sessionsProp != null && session != null && !isShotVideo;
  /** Show comment composer only in admin view. */
  const showCommentComposer = isAdminView;

  // Debug logging
  console.log('[TrainingSessionDetail] Rendered:', {
    sessionId,
    hasSessionsProp: sessionsProp != null,
    sessionCount: sessionList.length,
    foundSession: session != null,
    isDbSession,
    hasOnDeleteSession: onDeleteSession != null,
  });

  const [showAddUrlForm, setShowAddUrlForm] = useState(false);
  const [, setAddUrlDraft] = useState('');
  const [, setAddUrlError] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const commentInputRef = useRef<HTMLDivElement>(null);
  const pendingCursorRef = useRef<number | null>(null);
  const videoPlayerRef = useRef<VideoPlayerHandle>(null);
  const videoPlayerWrapperRef = useRef<HTMLDivElement>(null);
  const activeFrameReplyIdSetAtRef = useRef<number>(0);
  const videoStickySentinelRef = useRef<HTMLDivElement>(null);
  const videoStickySpacerRef = useRef<HTMLDivElement>(null);

  const [isNarrow, setIsNarrow] = useState(false);
  /** When set, video is "stuck" (position: fixed) and spacer holds layout. Only used when isNarrow. */
  const [videoStickyBox, setVideoStickyBox] = useState<{
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [includeTimestamp, setIncludeTimestamp] = useState(true);
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [, setVideoDuration] = useState(0);
  const [isExampleModalOpen, setIsExampleModalOpen] = useState(false);
  const [selectedExampleKey, setSelectedExampleKey] = useState<string | null>(null);
  /** Which comment triggered the example modal ('new' = composer, else comment id) */
  const [exampleModalContext, setExampleModalContext] = useState<string | number | 'new' | null>(null);
  /** GIF attached to the pending new comment (before it is posted) */
  const [pendingNewCommentGif, setPendingNewCommentGif] = useState<string | null>(null);
  /** When set, shows the lightweight "view example" modal. commentId is set when opened from a comment so admin can edit. */
  const [viewExampleModal, setViewExampleModal] = useState<{ src: string; title: string; commentId?: number | string } | null>(null);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [postingComment, setPostingComment] = useState(false);
  const [taggableProfiles, setTaggableProfiles] = useState<{ id: string; name: string }[]>([]);
  const [selectedMentionIds, setSelectedMentionIds] = useState<string[]>([]);
  const [pendingSeekSeconds, setPendingSeekSeconds] = useState<number | null>(null);
  /** "/" command menu for shots: when set, show dropdown; query filters SHOT_LIST; highlightIndex for keyboard nav. */
  const [shotMenu, setShotMenu] = useState<{ query: string; slashStart: number; highlightIndex: number } | null>(null);
  /** "@" command menu for mentions: when set, show dropdown of taggableProfiles. */
  const [mentionMenu, setMentionMenu] = useState<{ query: string; atStart: number; highlightIndex: number } | null>(null);
  /** Vertical position (px from top of comment input) where inline dropdowns should appear. */
  const [inlineMenuTop, setInlineMenuTop] = useState<number | null>(null);
  const [shotFilter, setShotFilter] = useState<string[]>([]);
  const [studentFilter, setStudentFilter] = useState<string[]>([]);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  /** Comment id to scroll to and highlight when its timestamp is reached or a timestamp dot is selected. */
  const [activeCommentId, setActiveCommentId] = useState<string | number | null>(null);
  const [activeCommentMenu, setActiveCommentMenu] = useState<string | number | null>(null);
  /** When set, this comment is being edited; edit box shows and uses editDraft. */
  const [editingCommentId, setEditingCommentId] = useState<string | number | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const editInputRef = useRef<HTMLDivElement>(null);
  const pendingEditCursorRef = useRef<number | null>(null);
  const commentsScrollRef = useRef<HTMLDivElement>(null);
  const replyInputRef = useRef<HTMLDivElement>(null);
  const pendingReplyCursorRef = useRef<number | null>(null);
  const [comments, setComments] = useState<SessionComment[]>(() => {
    if (!session) return [];
    if (sessionsProp != null) return [];
    if (session.id === '1') {
      return [
        { id: 1, author: 'Coach Riley', role: 'Coach', createdAt: '2h ago', text: 'Great use of your split step on wide balls.', timestampSeconds: 492 },
        { id: 2, author: 'You', role: 'You', createdAt: '1h ago', text: 'I can feel how much smoother my transitions are. Next time I want to focus on staying lower.', timestampSeconds: 145 },
      ];
    }
    if (session.id === '2') {
      return [
        { id: 3, author: 'Coach Riley', role: 'Coach', createdAt: 'Yesterday', text: "Your returns are landing much deeper. Let's keep targeting the backhand corner.", timestampSeconds: 89 },
      ];
    }
    return [];
  });
  const [repliesByCommentId, setRepliesByCommentId] = useState<Record<string, SessionCommentReply[]>>({});
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  /** Video timestamp (seconds) when user opened the reply composer; used when posting the reply. */
  const [replyTimestampSeconds, setReplyTimestampSeconds] = useState<number | null>(null);
  /** When true, video is paused because user opened a frame-detail reply (seek to comment timestamp). */
  const [frameReplyPauseRequested, setFrameReplyPauseRequested] = useState(false);
  const [replyDraft, setReplyDraft] = useState('');
  const [postingReply, setPostingReply] = useState(false);
  const [activeReplyMenuId, setActiveReplyMenuId] = useState<string | null>(null);
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editReplyDraft, setEditReplyDraft] = useState('');
  /** When set, we're viewing this reply's frame (seek to timestamp, show marker read-only). */
  const [activeFrameReplyId, setActiveFrameReplyId] = useState<string | null>(null);
  /** Tab for shot session detail: comments (default) or technique checklist. Only used when isShotVideo. */
  const [shotDetailTab, setShotDetailTab] = useState<'comments' | 'technique'>('comments');
  /** When shot has sub-categories (e.g. Forehand Dink: Normal, Topspin, Slice), which sub is selected. */
  const [selectedTechniqueSubId, setSelectedTechniqueSubId] = useState<string | null>(null);
  /** In admin view, which technique points are checked (keyed by item label, or "subId:label" when using sub-categories). */
  const [techniqueChecked, setTechniqueChecked] = useState<Record<string, boolean>>({});
  /** Track whether we've loaded technique checks from DB for the current shot video. */
  const [techniqueChecksLoaded, setTechniqueChecksLoaded] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  // Admin session edit state (for DB-backed sessions)
  const [showEditSession, setShowEditSession] = useState(false);
  const [_editSessionLoading, setEditSessionLoading] = useState(false);
  const [editSessionSaving, setEditSessionSaving] = useState(false);
  const [editSessionDeleting, setEditSessionDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editSessionError, setEditSessionError] = useState<string | null>(null);
  const [editDate, setEditDate] = useState<string>(session?.dateKey ?? '');
  const [editTitle, setEditTitle] = useState<string>(session?.title ?? '');
  const [editCoachId, setEditCoachId] = useState<string>('');

  // Any overlay/modal state; used to pause video playback when true
  const anyModalOpen =
    isExampleModalOpen ||
    viewExampleModal != null ||
    showEditSession ||
    showDeleteConfirm ||
    isFilterSheetOpen;

  const activeReplyForMarkerId = editingReplyId ?? activeFrameReplyId;
  const { frameDetailMarkerInitial, frameDetailMarkerReadOnly } = useMemo(() => {
    const readOnly = activeFrameReplyId != null;
    if (activeReplyForMarkerId == null) {
      return { frameDetailMarkerInitial: null as { x: number; y: number; radiusX: number; radiusY: number } | null, frameDetailMarkerReadOnly: readOnly };
    }
    const reply = getReplyById(repliesByCommentId, activeReplyForMarkerId);
    if (
      reply &&
      typeof reply.markerXPercent === 'number' &&
      typeof reply.markerYPercent === 'number' &&
      typeof reply.markerRadiusX === 'number' &&
      typeof reply.markerRadiusY === 'number'
    ) {
      return {
        frameDetailMarkerInitial: {
          x: reply.markerXPercent,
          y: reply.markerYPercent,
          radiusX: reply.markerRadiusX,
          radiusY: reply.markerRadiusY,
        },
        frameDetailMarkerReadOnly: readOnly,
      };
    }
    return { frameDetailMarkerInitial: null, frameDetailMarkerReadOnly: readOnly };
  }, [activeReplyForMarkerId, activeFrameReplyId, repliesByCommentId]);

  useEffect(() => {
    if (activeFrameReplyId == null) return;
    activeFrameReplyIdSetAtRef.current = Date.now();
    const reply = getReplyById(repliesByCommentId, activeFrameReplyId);
    if (reply?.timestampSeconds != null) {
      const alreadyAtFrame = Math.abs(currentVideoTime - reply.timestampSeconds) <= 1;
      if (!alreadyAtFrame) {
        setPendingSeekSeconds(reply.timestampSeconds);
        setFrameReplyPauseRequested(true);
        videoPlayerRef.current?.pause();
      }
    }
  }, [activeFrameReplyId, currentVideoTime, repliesByCommentId]);

  // Hide frame reply overlay when video is played or when playback time moves away from the reply's timestamp
  useEffect(() => {
    if (activeFrameReplyId == null) return;
    const reply = getReplyById(repliesByCommentId, activeFrameReplyId);
    if (reply?.timestampSeconds == null) return;
    const replyTs = reply.timestampSeconds;
    const graceMs = 800;
    if (Date.now() - activeFrameReplyIdSetAtRef.current < graceMs) return;
    const threshold = 1;
    if (Math.abs(currentVideoTime - replyTs) > threshold) {
      setActiveFrameReplyId(null);
    }
  }, [activeFrameReplyId, currentVideoTime, repliesByCommentId]);

  // When shot changes (shot video), sync selected technique sub-tab to the first sub if current shot has sub-categories
  useEffect(() => {
    if (!isShotVideo || !session) return;
    const shotSkill = ROADMAP_SKILLS.find((s) => s.title === session.title);
    const subs = shotSkill?.subCategories;
    if (subs?.length) {
      setSelectedTechniqueSubId((prev) =>
        prev && subs.some((s) => s.id === prev) ? prev : subs[0].id
      );
    } else {
      setSelectedTechniqueSubId(null);
    }
  }, [isShotVideo, session?.id, session?.title]);

  // Load technique checks from DB when viewing a shot video
  useEffect(() => {
    if (!isShotVideo || !sessionId) {
      setTechniqueChecked({});
      setTechniqueChecksLoaded(false);
      return;
    }
    let cancelled = false;
    setTechniqueChecksLoaded(false);
    (async () => {
      const checks = await fetchShotTechniqueChecks(supabase, sessionId);
      if (!cancelled) {
        setTechniqueChecked(checks);
        setTechniqueChecksLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isShotVideo, sessionId, supabase]);

  const shotExampleGifs = useMemo(() => {
    try {
      const ctx = require.context('../assets/shot-examples', false, /\.gif$/);
      const toTitle = (fileName: string) => {
        const base = fileName.replace(/^\.\//, '').replace(/\.gif$/i, '');
        const cleaned = base.replace(/^shot-example-/, '').replace(/[-_]+/g, ' ').trim();
        return cleaned.replace(/\b\w/g, (c: string) => c.toUpperCase());
      };
      return ctx.keys()
        .map((k: string) => {
          const mod = ctx(k) as
            | string
            | { default?: string | { src?: string } }
            | { src?: string };

          const src =
            typeof mod === 'string'
              ? mod
              : typeof (mod as { default?: unknown }).default === 'string'
                ? ((mod as { default: string }).default)
                : typeof (mod as { default?: { src?: unknown } }).default === 'object' &&
                    (mod as { default?: { src?: unknown } }).default?.src &&
                    typeof (mod as { default?: { src?: unknown } }).default?.src === 'string'
                  ? ((mod as { default: { src: string } }).default.src)
                  : typeof (mod as { src?: unknown }).src === 'string'
                    ? ((mod as { src: string }).src)
                    : '';

          return { key: k, src, title: toTitle(k) };
        })
        .filter((g: { src: string }) => Boolean(g.src))
        .sort((a: { title: string }, b: { title: string }) => a.title.localeCompare(b.title));
    } catch {
      return [] as { key: string; src: string; title: string }[];
    }
  }, []);

  useEffect(() => {
    if (!isExampleModalOpen) return;
    // Pre-select the currently attached GIF (if any) so "Edit GIF" opens with the
    // existing selection highlighted.
    const currentGifFileName =
      exampleModalContext === 'new'
        ? pendingNewCommentGif
        : (() => {
            const c = comments.find((x) => x.id === exampleModalContext);
            return c?.exampleGif ?? null;
          })();

    if (currentGifFileName) {
      const currentKey =
        shotExampleGifs.find((g) => g.key === `./${currentGifFileName}` || g.key === currentGifFileName)?.key ??
        null;
      setSelectedExampleKey(currentKey);
    } else {
      setSelectedExampleKey(null);
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsExampleModalOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isExampleModalOpen, exampleModalContext, pendingNewCommentGif, comments, shotExampleGifs]);

  const clearExampleGifForCurrentContext = async () => {
    if (exampleModalContext === 'new') {
      setPendingNewCommentGif(null);
      return;
    }
    const commentId = exampleModalContext;
    if (commentId == null) return;

    setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, exampleGif: undefined } : c)));

    if (isDbSession && typeof commentId === 'string') {
      await updateCommentExampleGif(supabase, commentId, null);
    }
  };

  const handleAddExample = async () => {
    if (!selectedExampleKey) return;
    const gifFileName = selectedExampleKey.replace(/^\.\//, '');
    if (exampleModalContext === 'new') {
      setPendingNewCommentGif(gifFileName);
      setIsExampleModalOpen(false);
      return;
    }
    const commentId = exampleModalContext;
    if (commentId == null) return;
    // Optimistically update local state
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, exampleGif: gifFileName } : c))
    );
    setIsExampleModalOpen(false);
    // Persist to DB for real comments
    if (isDbSession && typeof commentId === 'string') {
      await updateCommentExampleGif(supabase, commentId, gifFileName);
    }
  };
  const [editSessionType, setEditSessionType] = useState<'game' | 'drill' | ''>('');
  const [editStudentIds, setEditStudentIds] = useState<string[]>([]);
  const [availableStudents, setAvailableStudents] = useState<
    { id: string; name: string; email: string }[]
  >([]);
  const editSessionLoadedRef = useRef(false);

  // Player + comments: stacked when narrow (≤956px), side-by-side when wider (from screenshot breakpoint)
  const PLAYER_COMMENTS_STACK_BREAKPOINT = 957;
  useEffect(() => {
    const updateLayout = () => {
      if (typeof window === 'undefined') return;
      setIsNarrow(window.innerWidth < PLAYER_COMMENTS_STACK_BREAKPOINT);
      setIsDesktop(window.innerWidth >= 1024);
    };

    updateLayout();
    window.addEventListener('resize', updateLayout);

    return () => {
      window.removeEventListener('resize', updateLayout);
    };
  }, []);

  // Scroll-driven sticky video on narrow: stick when video top hits viewport top, unstick when scrolling back up
  useEffect(() => {
    if (!isNarrow) {
      setVideoStickyBox(null);
      return;
    }
    const sentinel = videoStickySentinelRef.current;
    const wrapper = videoPlayerWrapperRef.current;
    if (!sentinel || !wrapper) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (!e || !wrapper) return;
        // Sentinel scrolled past the top of the viewport → stick video
        if (e.boundingClientRect.top < 0) {
          const rect = wrapper.getBoundingClientRect();
          setVideoStickyBox({
            left: rect.left,
            width: rect.width,
            height: rect.height,
          });
        }
      },
      { threshold: 0, rootMargin: '0px', root: null }
    );
    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [isNarrow]);

  // Unstick when user scrolls back up and the spacer (video slot) is at or above viewport top
  useEffect(() => {
    if (!isNarrow || !videoStickyBox) return;
    const spacer = videoStickySpacerRef.current;
    if (!spacer) return;

    const checkUnstick = () => {
      if (spacer.getBoundingClientRect().top >= 0) setVideoStickyBox(null);
    };

    checkUnstick(); // in case spacer is already in view
    window.addEventListener('scroll', checkUnstick, { passive: true });
    return () => window.removeEventListener('scroll', checkUnstick);
  }, [isNarrow, videoStickyBox]);

  // Load comments and taggable profiles when viewing a DB session
  useEffect(() => {
    if (!sessionId) return;
    setCommentsLoading(true);
    Promise.all([
      isDbSession ? fetchSessionComments(supabase, sessionId) : Promise.resolve([]),
      isDbSession ? fetchSessionCommentReplies(supabase, sessionId) : Promise.resolve([]),
      fetchSessionTaggableProfiles(supabase, sessionId),
    ])
      .then(([rows, replyRows, taggable]) => {
        if (Array.isArray(rows) && rows.length > 0) {
          setComments(rows.map((r) => mapDbCommentToSessionComment(r, user?.id ?? null)));
        }
        if (Array.isArray(replyRows) && replyRows.length > 0) {
          const mappedReplies = replyRows.map((r) => mapDbReplyToSessionCommentReply(r, user?.id ?? null));
          const grouped: Record<string, SessionCommentReply[]> = {};
          for (const reply of mappedReplies) {
            const key = reply.parentCommentId;
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(reply);
          }
          setRepliesByCommentId(grouped);
        } else {
          setRepliesByCommentId({});
        }
        setTaggableProfiles(taggable);
      })
      .finally(() => setCommentsLoading(false));
  }, [supabase, isDbSession, sessionId, user?.id]);

  // Video player keyboard shortcuts when comment section / any edit box is not focused
  useEffect(() => {
    if (!session?.videoUrl?.trim()) return;
    const isTypingInInput = (e: KeyboardEvent) => {
      const active = document.activeElement;
      const tag = active?.nodeName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return true;
      let node: Node | null = e.target as Node | null;
      while (node && node instanceof HTMLElement) {
        if (node.isContentEditable) return true;
        node = node.parentElement;
      }
      node = active;
      while (node && node instanceof HTMLElement) {
        if (node.isContentEditable) return true;
        node = node.parentElement;
      }
      if (active && commentInputRef.current?.contains(active)) return true;
      if (active && editInputRef.current?.contains(active)) return true;
      return false;
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTypingInInput(e)) return;
      const key = e.key;
      const player = videoPlayerRef.current;
      if (!player) return;
      if (key === ' ') {
        e.preventDefault();
        player.playPause();
        return;
      }
      if (key === 'q' || key === 'Q') {
        e.preventDefault();
        player.skipBy(-1);
        return;
      }
      if (key === 'w' || key === 'W') {
        e.preventDefault();
        player.skipBy(1);
        return;
      }
      if (key === 'a' || key === 'A') {
        e.preventDefault();
        player.skipBy(-5);
        return;
      }
      if (key === 's' || key === 'S') {
        e.preventDefault();
        player.skipBy(5);
        return;
      }
      if (key === 'y' || key === 'Y') {
        e.preventDefault();
        player.skipBy(-10);
        return;
      }
      if (key === 'x' || key === 'X') {
        e.preventDefault();
        player.skipBy(10);
        return;
      }
      if (key === 'ArrowLeft') {
        e.preventDefault();
        player.skipBy(-1 / 30);
        return;
      }
      if (key === 'ArrowRight') {
        e.preventDefault();
        player.skipBy(1 / 30);
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [session?.id, session?.videoUrl]);

  // Lazy-load session details and student list for admin editing
  useEffect(() => {
    if (!isDbSession || !showEditSession || editSessionLoadedRef.current === true) return;
    if (!supabase) {
      setEditSessionError('Supabase not configured');
      return;
    }
    setEditSessionLoading(true);
    setEditSessionError(null);
    const load = async () => {
      try {
        const { data: sessionRow, error: sessionError } = await supabase
          .from('sessions')
          .select('date, coach_id, title, session_type')
          .eq('id', sessionId)
          .maybeSingle();
        if (sessionError) throw sessionError;
        if (sessionRow) {
          const dateStr =
            typeof sessionRow.date === 'string' && sessionRow.date.length >= 10
              ? sessionRow.date.slice(0, 10)
              : String(sessionRow.date);
          setEditDate(dateStr);
          setEditCoachId(sessionRow.coach_id ?? '');
          setEditTitle((sessionRow.title as string | null) ?? (session?.title ?? ''));
          const st = sessionRow.session_type as string | null;
          setEditSessionType(st === 'game' || st === 'drill' ? st : '');
        } else if (session) {
          setEditDate(session.dateKey);
          setEditTitle(session.title);
        }

        const { data: studentLinks, error: linksError } = await supabase
          .from('session_students')
          .select('student_id')
          .eq('session_id', sessionId);
        if (linksError) throw linksError;
        const linkedStudentIds = (studentLinks ?? []).map(
          (r: { student_id: string }) => r.student_id,
        );
        setEditStudentIds(linkedStudentIds);

        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email, full_name, role');
        if (profilesError) throw profilesError;
        const rows = (profiles ?? []) as {
          id: string;
          email: string | null;
          full_name: string | null;
          role: string | null;
        }[];
        const filtered = rows.filter((r) => r.role === 'student' || !r.role);
        setAvailableStudents(
          filtered.map((r) => ({
            id: r.id,
            name: r.full_name?.trim() || r.email || r.id,
            email: r.email ?? '',
          })),
        );
        editSessionLoadedRef.current = true;
      } catch (err) {
        setEditSessionError(
          err instanceof Error ? err.message : 'Failed to load session details for editing',
        );
      } finally {
        setEditSessionLoading(false);
      }
    };
    void load();
  }, [supabase, isDbSession, showEditSession, sessionId, session]);

  const toggleEditStudent = useCallback((id: string) => {
    setEditStudentIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }, []);

  const handleSaveSessionDetails = useCallback(async () => {
    if (!isDbSession) return;
    if (!supabase) {
      setEditSessionError('Supabase not configured');
      return;
    }
    if (!editDate) {
      setEditSessionError('Date is required');
      return;
    }
    setEditSessionSaving(true);
    setEditSessionError(null);
    try {
      const { error: updateError } = await supabase
        .from('sessions')
        .update({
          date: editDate,
          coach_id: editCoachId || null,
          title: editTitle.trim() || null,
          session_type: editSessionType || null,
        })
        .eq('id', sessionId);
      if (updateError) throw updateError;

      const { error: deleteError } = await supabase
        .from('session_students')
        .delete()
        .eq('session_id', sessionId);
      if (deleteError) throw deleteError;

      if (editStudentIds.length > 0) {
        const { error: insertError } = await supabase.from('session_students').insert(
          editStudentIds.map((student_id) => ({ session_id: sessionId, student_id })),
        );
        if (insertError) throw insertError;
      }

      await onSessionUpdated?.();
      setShowEditSession(false);
    } catch (err) {
      setEditSessionError(
        err instanceof Error ? err.message : 'Failed to save session changes',
      );
    } finally {
      setEditSessionSaving(false);
    }
  }, [supabase, isDbSession, editDate, editCoachId, editSessionType, editTitle, editStudentIds, sessionId, onSessionUpdated]);

  const handleDeleteSession = useCallback(async () => {
    if (!isDbSession) {
      setEditSessionError('This session cannot be deleted.');
      return;
    }
    if (!supabase) {
      setEditSessionError('Supabase not configured');
      return;
    }
    setEditSessionDeleting(true);
    setEditSessionError(null);
    try {
      console.log('[TrainingSessionDetail] Deleting session:', sessionId);
      const { error: deleteError } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId);
      if (deleteError) {
        console.error('[TrainingSessionDetail] Delete error:', deleteError);
        throw deleteError;
      }
      console.log('[TrainingSessionDetail] Session deleted successfully');
      setShowEditSession(false);
      await onDeleteSession?.(sessionId);
      onBack();
    } catch (err) {
      console.error('[TrainingSessionDetail] Delete failed:', err);
      setEditSessionError(err instanceof Error ? err.message : 'Failed to delete session');
      setEditSessionDeleting(false);
      setShowDeleteConfirm(false);
    }
  }, [supabase, isDbSession, sessionId, onDeleteSession, onBack]);

  const sortedCommentTimestamps = useMemo(
    () =>
      [...new Set(comments.filter((c) => c.timestampSeconds != null).map((c) => c.timestampSeconds!))].sort(
        (a, b) => a - b
      ),
    [comments]
  );

  /** When students are selected, only consider comments that mention at least one of them. */
  const commentsForShotCount = useMemo(() => {
    if (studentFilter.length === 0) return comments;
    return comments.filter((c) =>
      (c.taggedUsers ?? []).some((u) => studentFilter.includes(u.id))
    );
  }, [comments, studentFilter]);

  /** Shot types in relevant comments. When students selected, only show shots with count > 0. */
  const shotsInComments = useMemo(() => {
    const shotSet = new Set<string>();
    commentsForShotCount.forEach((c) => {
      parseCommentTextWithShots(c.text).forEach((seg) => {
        if (seg.type === 'shot') shotSet.add(seg.name);
      });
    });
    const list = Array.from(shotSet).sort((a, b) => a.localeCompare(b));
    if (studentFilter.length === 0) return list;
    const count = new Map<string, number>();
    commentsForShotCount.forEach((c) => {
      parseCommentTextWithShots(c.text).forEach((seg) => {
        if (seg.type === 'shot') count.set(seg.name, (count.get(seg.name) ?? 0) + 1);
      });
    });
    return list.filter((shot) => (count.get(shot) ?? 0) > 0);
  }, [commentsForShotCount, studentFilter.length]);

  /** Count per shot in the relevant comments (all comments, or only those mentioning selected students). */
  const shotCountByName = useMemo(() => {
    const count = new Map<string, number>();
    commentsForShotCount.forEach((c) => {
      parseCommentTextWithShots(c.text).forEach((seg) => {
        if (seg.type === 'shot') count.set(seg.name, (count.get(seg.name) ?? 0) + 1);
      });
    });
    return count;
  }, [commentsForShotCount]);

  /** Count how many times each user is @mentioned in comment text across the session. */
  const tagCountByUserId = useMemo(() => {
    const count = new Map<string, number>();
    comments.forEach((c) => {
      parseCommentTextWithShots(c.text).forEach((seg) => {
        if (seg.type === 'mention') {
          count.set(seg.id, (count.get(seg.id) ?? 0) + 1);
        }
      });
    });
    return count;
  }, [comments]);

  const studentsInComments = useMemo(
    () =>
      Array.from(
        comments.reduce<Map<string, string>>((map, c) => {
          (c.taggedUsers ?? []).forEach((u) => {
            if (!map.has(u.id)) map.set(u.id, u.name);
          });
          return map;
        }, new Map())
      )
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [comments]
  );

  /** Comments sorted by timestamp ascending (newest last); comments without timestamp first. */
  const sortedComments = useMemo(() => {
    return [...comments].sort((a, b) => {
      const hasA = a.timestampSeconds != null ? 1 : 0;
      const hasB = b.timestampSeconds != null ? 1 : 0;
      if (hasA !== hasB) return hasA - hasB;
      if (hasA && hasB) {
        const ta = a.timestampSeconds ?? 0;
        const tb = b.timestampSeconds ?? 0;
        return ta - tb; // ascending (newest last)
      }
      return 0;
    });
  }, [comments]);

  const visibleComments = useMemo(() => {
    if (shotFilter.length === 0 && studentFilter.length === 0) return sortedComments;
    return sortedComments.filter((comment) => {
      const segments = parseCommentTextWithShots(comment.text);
      const commentShots = new Set(
        segments.filter((seg) => seg.type === 'shot').map((seg) => (seg as Extract<CommentSegment, { type: 'shot' }>).name)
      );
      const commentStudentIds = new Set((comment.taggedUsers ?? []).map((u) => u.id));

      if (shotFilter.length > 0 && !shotFilter.some((shot) => commentShots.has(shot))) {
        return false;
      }
      if (studentFilter.length > 0 && !studentFilter.some((id) => commentStudentIds.has(id))) {
        return false;
      }
      return true;
    });
  }, [sortedComments, shotFilter, studentFilter]);

  // When video time reaches a comment's timestamp, set that comment as active (for scroll + highlight)
  useEffect(() => {
    const activeTimestamp =
      sortedCommentTimestamps.filter((t) => t <= currentVideoTime + 0.5).pop() ?? null;
    const activeComment =
      activeTimestamp != null
        ? sortedComments.find((c) => c.timestampSeconds === activeTimestamp)
        : null;
    setActiveCommentId(activeComment?.id ?? null);
  }, [currentVideoTime, sortedComments, sortedCommentTimestamps]);

  /** Skip seeking if we're already within this many seconds of the target (avoids re-seeking when already on frame). */
  const SEEK_SKIP_THRESHOLD_SECONDS = 1;
  const seekToTimestampIfNeeded = useCallback(
    (seconds: number) => {
      if (Math.abs(currentVideoTime - seconds) <= SEEK_SKIP_THRESHOLD_SECONDS) return;
      setPendingSeekSeconds(seconds);
    },
    [currentVideoTime]
  );

  // Scroll comments list to the active comment and keep it in view
  useEffect(() => {
    if (activeCommentId == null || !commentsScrollRef.current) return;
    const el = commentsScrollRef.current.querySelector(
      `[data-comment-id="${CSS.escape(String(activeCommentId))}"]`
    ) as HTMLElement | null;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    }
  }, [activeCommentId]);

  const handleAddComment = useCallback(async () => {
    if (!commentDraft.trim() || !showCommentComposer) return;

    const currentTime = currentVideoTime ?? 0;
    const timestampSeconds = includeTimestamp ? toFramePrecision(currentTime) : null;

    if (isDbSession && user?.id) {
      setPostingComment(true);
      try {
        const inserted = await insertSessionComment(
          supabase,
          sessionId,
          user.id,
          commentDraft.trim(),
          timestampSeconds,
          selectedMentionIds,
          pendingNewCommentGif
        );
        if (inserted) {
          const mapped = mapDbCommentToSessionComment(inserted, user.id);
          setComments((prev) => [...prev, mapped]);
          setCommentDraft('');
          setSelectedMentionIds([]);
          setPendingNewCommentGif(null);
        }
      } finally {
        setPostingComment(false);
      }
      return;
    }

    const newComment: SessionComment = {
      id: Date.now(),
      author: 'You',
      role: 'You',
      createdAt: 'Just now',
      text: commentDraft.trim(),
      ...(timestampSeconds != null && { timestampSeconds }),
      ...(pendingNewCommentGif != null && { exampleGif: pendingNewCommentGif }),
    };
    setComments((prev) => [...prev, newComment]);
    setCommentDraft('');
    setPendingNewCommentGif(null);
  }, [
    supabase,
    commentDraft,
    currentVideoTime,
    includeTimestamp,
    isDbSession,
    pendingNewCommentGif,
    selectedMentionIds,
    sessionId,
    user?.id,
    showCommentComposer,
  ]);

  const handleAddReply = useCallback(
    async (parentIdRaw: string | number) => {
      if (!replyDraft.trim()) return;
      if (!isDbSession || !user?.id || !isAdmin) return;
      const parentId = String(parentIdRaw);

      setPostingReply(true);
      try {
        const parentComment = comments.find((c) => String(c.id) === parentId);
        const timestampSeconds = replyTimestampSeconds ?? parentComment?.timestampSeconds ?? null;
        const markerState = videoPlayerRef.current?.getFrameMarkerState();
        const marker: ReplyFrameMarker | undefined =
          markerState != null
            ? {
                markerXPercent: markerState.x,
                markerYPercent: markerState.y,
                markerRadiusX: markerState.radiusX,
                markerRadiusY: markerState.radiusY,
              }
            : undefined;

        const inserted = await insertSessionCommentReply(
          supabase,
          sessionId,
          parentId,
          user.id,
          replyDraft.trim(),
          timestampSeconds,
          marker
        );
        if (inserted) {
          const mapped = mapDbReplyToSessionCommentReply(inserted, user.id);
          setRepliesByCommentId((prev) => {
            const key = mapped.parentCommentId;
            const existing = prev[key] ?? [];
            return {
              ...prev,
              [key]: [...existing, mapped],
            };
          });
          setReplyDraft('');
          setReplyingToCommentId(null);
          setReplyTimestampSeconds(null);
          setFrameReplyPauseRequested(false);
          setActiveFrameReplyId(null);
        }
      } finally {
        setPostingReply(false);
      }
    },
    [supabase, comments, isAdmin, isDbSession, replyDraft, replyTimestampSeconds, sessionId, user?.id]
  );

  const handleSaveReplyEdit = useCallback(
    async (parentCommentId: string, replyId: string) => {
      if (!editReplyDraft.trim()) return;
      if (!isDbSession || !user?.id) return;

      setPostingReply(true);
      try {
        const markerState = videoPlayerRef.current?.getFrameMarkerState();
        const marker: ReplyFrameMarker | undefined =
          markerState != null
            ? {
                markerXPercent: markerState.x,
                markerYPercent: markerState.y,
                markerRadiusX: markerState.radiusX,
                markerRadiusY: markerState.radiusY,
              }
            : undefined;
        const ok = await updateSessionCommentReply(
          supabase,
          replyId,
          editReplyDraft.trim(),
          marker
        );
        if (ok) {
          setRepliesByCommentId((prev) => {
            const existing = prev[parentCommentId] ?? [];
            return {
              ...prev,
              [parentCommentId]: existing.map((r) =>
                r.id === replyId
                  ? {
                      ...r,
                      text: editReplyDraft.trim(),
                      ...(marker != null
                        ? {
                            markerXPercent: marker.markerXPercent,
                            markerYPercent: marker.markerYPercent,
                            markerRadiusX: marker.markerRadiusX,
                            markerRadiusY: marker.markerRadiusY,
                          }
                        : {}),
                    }
                  : r
              ),
            };
          });
          setEditingReplyId(null);
          setEditReplyDraft('');
          setActiveFrameReplyId(null);
        }
      } finally {
        setPostingReply(false);
      }
    },
    [supabase, editReplyDraft, isDbSession, user?.id]
  );

  const handleDeleteReply = useCallback(
    async (parentCommentId: string, replyId: string) => {
      if (!isDbSession || !user?.id) return;
      setPostingReply(true);
      try {
        const ok = await deleteSessionCommentReply(supabase, replyId);
        if (ok) {
          setRepliesByCommentId((prev) => {
            const existing = prev[parentCommentId] ?? [];
            return {
              ...prev,
              [parentCommentId]: existing.filter((r) => r.id !== replyId),
            };
          });
        }
      } finally {
        setPostingReply(false);
      }
    },
    [supabase, isDbSession, user?.id]
  );

  const filteredShots = useMemo(() => {
    if (!shotMenu) return [];
    const q = shotMenu.query.trim().toLowerCase();
    if (!q) return [...SHOT_LIST];
    return SHOT_LIST.filter((shot) => shot.toLowerCase().includes(q));
  }, [shotMenu]);

  const filteredMentions = useMemo(() => {
    if (!mentionMenu) return [];
    const q = mentionMenu.query.trim().toLowerCase();
    const base = taggableProfiles;
    if (!q) return base;
    return base.filter((p) => p.name.toLowerCase().includes(q));
  }, [mentionMenu, taggableProfiles]);

  const handleCommentInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const sel = window.getSelection();
    if (!container || !sel || !container.contains(sel.anchorNode)) return;
    const { text, cursorOffset } = serializeContentEditable(container, sel);
    const isEdit = editInputRef.current === container;
    const isReply = replyInputRef.current === container;
    if (isEdit) {
      setEditDraft(text);
      pendingEditCursorRef.current = cursorOffset;
    } else if (isReply) {
      setReplyDraft(text);
      pendingReplyCursorRef.current = cursorOffset;
    } else {
      setCommentDraft(text);
      pendingCursorRef.current = cursorOffset;
    }
    const beforeCursor = text.slice(0, cursorOffset);
    const lastSlash = beforeCursor.lastIndexOf('/');
    const lastAt = beforeCursor.lastIndexOf('@');

    let anyMenu = false;
    if (lastSlash !== -1 && !beforeCursor.slice(lastSlash).includes('\n')) {
      setShotMenu({
        query: text.slice(lastSlash + 1, cursorOffset),
        slashStart: lastSlash,
        highlightIndex: 0,
      });
      anyMenu = true;
    } else {
      setShotMenu(null);
    }

    if (lastAt !== -1 && !beforeCursor.slice(lastAt).includes('\n')) {
      const query = text.slice(lastAt + 1, cursorOffset);
      setMentionMenu({
        query,
        atStart: lastAt,
        highlightIndex: 0,
      });
      anyMenu = true;
    } else if (lastAt === -1) {
      setMentionMenu(null);
    }

    if (anyMenu) {
      // Add extra offset so dropdown appears just below the typing line
      setInlineMenuTop(getCaretTopOffset(container) + 20);
    } else {
      setInlineMenuTop(null);
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = () => {
      if (activeCommentMenu !== null) {
        setActiveCommentMenu(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeCommentMenu]);

  // Sync contenteditable from draft imperatively so React never reconciles its children (avoids removeChild errors when user deletes nodes).
  useEffect(() => {
    const container = commentInputRef.current;
    if (!container) return;
    syncContentEditableFromDraft(container, commentDraft);
    if (pendingCursorRef.current != null) {
      const offset = pendingCursorRef.current;
      pendingCursorRef.current = null;
      setContentEditableCursor(container, offset);
    }
  }, [commentDraft]);

  // Sync edit box contenteditable from editDraft when editing a comment.
  useEffect(() => {
    if (editingCommentId == null) return;
    const container = editInputRef.current;
    if (!container) return;
    syncContentEditableFromDraft(container, editDraft);
    if (pendingEditCursorRef.current != null) {
      const offset = pendingEditCursorRef.current;
      pendingEditCursorRef.current = null;
      setContentEditableCursor(container, offset);
    }
  }, [editingCommentId, editDraft]);

  // Sync reply composer contenteditable from replyDraft.
  useEffect(() => {
    if (replyingToCommentId == null) return;
    const container = replyInputRef.current;
    if (!container) return;
    syncContentEditableFromDraft(container, replyDraft);
    if (pendingReplyCursorRef.current != null) {
      const offset = pendingReplyCursorRef.current;
      pendingReplyCursorRef.current = null;
      setContentEditableCursor(container, offset);
    }
  }, [replyDraft, replyingToCommentId]);

  const handleCommentKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const container = e.currentTarget;
      const isEdit = editInputRef.current === container;
      const isReply = replyInputRef.current === container;
      const setDraft = isEdit ? setEditDraft : isReply ? setReplyDraft : setCommentDraft;
      const pendingRef = isEdit ? pendingEditCursorRef : isReply ? pendingReplyCursorRef : pendingCursorRef;
      const focusContainer = () => (container as HTMLDivElement).focus();

      if (e.key === '/' || e.key === '@') {
        e.preventDefault();
        const sel = window.getSelection();
        if (!container || !sel || !container.contains(sel.anchorNode)) return;
        const { text, cursorOffset } = serializeContentEditable(container, sel);
        const char = e.key;
        const newText = text.slice(0, cursorOffset) + char + text.slice(cursorOffset);
        setDraft(newText);
        pendingRef.current = cursorOffset + 1;
        if (char === '/') {
          setShotMenu({
            query: '',
            slashStart: cursorOffset,
            highlightIndex: 0,
          });
        } else if (char === '@') {
          setMentionMenu({
            query: '',
            atStart: cursorOffset,
            highlightIndex: 0,
          });
        }
        setInlineMenuTop(getCaretTopOffset(container) + 20);
        focusContainer();
        return;
      }

      // Handle open menus
      if (shotMenu || mentionMenu) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (shotMenu) {
            setShotMenu((m) =>
              m
                ? { ...m, highlightIndex: Math.min(m.highlightIndex + 1, filteredShots.length - 1) }
                : null
            );
          } else if (mentionMenu) {
            setMentionMenu((m) =>
              m
                ? {
                    ...m,
                    highlightIndex: Math.min(m.highlightIndex + 1, filteredMentions.length - 1),
                  }
                : null
            );
          }
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (shotMenu) {
            setShotMenu((m) => (m ? { ...m, highlightIndex: Math.max(0, m.highlightIndex - 1) } : null));
          } else if (mentionMenu) {
            setMentionMenu((m) =>
              m ? { ...m, highlightIndex: Math.max(0, m.highlightIndex - 1) } : null
            );
          }
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          const sel = window.getSelection();
          if (!container || !sel || !container.contains(sel.anchorNode)) return;
          const { text, cursorOffset } = serializeContentEditable(container, sel);
          if (shotMenu && filteredShots.length > 0) {
            const shot = filteredShots[shotMenu.highlightIndex];
            if (shot) {
              const start = shotMenu.slashStart;
              const replacement = `[[shot:${shot}]] `;
              const nextDraft = text.slice(0, start) + replacement + text.slice(cursorOffset);
              setDraft(nextDraft);
              setShotMenu(null);
              pendingRef.current = start + replacement.length;
              focusContainer();
            }
          } else if (mentionMenu && filteredMentions.length > 0) {
            const mention = filteredMentions[mentionMenu.highlightIndex];
            if (mention) {
              const start = mentionMenu.atStart;
              const marker = `[[mention:${mention.id}|${mention.name}]] `;
              const nextDraft = text.slice(0, start) + marker + text.slice(cursorOffset);
              setDraft(nextDraft);
              setMentionMenu(null);
              pendingRef.current = start + marker.length;
              focusContainer();
              setSelectedMentionIds((prev) =>
                prev.includes(mention.id) ? prev : [...prev, mention.id]
              );
            }
          }
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          setShotMenu(null);
          setMentionMenu(null);
          setInlineMenuTop(null);
          return;
        }
      }

      // When no inline menus are open: Enter posts the comment (Shift+Enter inserts newline).
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (isReply) {
          if (!postingReply && replyingToCommentId != null) {
            void handleAddReply(replyingToCommentId);
          }
        } else if (!isEdit) {
          if (!postingComment) {
            void handleAddComment();
          }
        }
      }
    },
    [shotMenu, mentionMenu, filteredShots, filteredMentions, postingComment, postingReply, replyingToCommentId, handleAddComment, handleAddReply]
  );

  const selectShotFromMenu = useCallback(
    (shot: string) => {
      if (!shotMenu) return;
      const container =
        editInputRef.current?.contains(document.activeElement)
          ? editInputRef.current
          : replyInputRef.current?.contains(document.activeElement)
            ? replyInputRef.current
            : commentInputRef.current;
      const sel = window.getSelection();
      if (!container || !sel || !container.contains(sel.anchorNode)) return;
      const { text, cursorOffset } = serializeContentEditable(container, sel);
      const start = shotMenu.slashStart;
      const replacement = `[[shot:${shot}]] `;
      const nextDraft = text.slice(0, start) + replacement + text.slice(cursorOffset);
      const isEdit = container === editInputRef.current;
      const isReply = container === replyInputRef.current;
      if (isEdit) {
        setEditDraft(nextDraft);
        pendingEditCursorRef.current = start + replacement.length;
      } else if (isReply) {
        setReplyDraft(nextDraft);
        pendingReplyCursorRef.current = start + replacement.length;
      } else {
        setCommentDraft(nextDraft);
        pendingCursorRef.current = start + replacement.length;
      }
      setShotMenu(null);
      (container as HTMLDivElement).focus();
      if (!mentionMenu) setInlineMenuTop(null);
    },
    [shotMenu, mentionMenu]
  );

  const selectMentionFromMenu = useCallback(
    (mentionId: string) => {
      if (!mentionMenu) return;
      const mention = taggableProfiles.find((p) => p.id === mentionId);
      if (!mention) return;
      const container =
        editInputRef.current?.contains(document.activeElement)
          ? editInputRef.current
          : replyInputRef.current?.contains(document.activeElement)
            ? replyInputRef.current
            : commentInputRef.current;
      const sel = window.getSelection();
      if (!container || !sel || !container.contains(sel.anchorNode)) return;
      const { text, cursorOffset } = serializeContentEditable(container, sel);
      const start = mentionMenu.atStart;
      const marker = `[[mention:${mention.id}|${mention.name}]] `;
      const nextDraft = text.slice(0, start) + marker + text.slice(cursorOffset);
      const isEdit = container === editInputRef.current;
      const isReply = container === replyInputRef.current;
      if (isEdit) {
        setEditDraft(nextDraft);
        pendingEditCursorRef.current = start + marker.length;
      } else if (isReply) {
        setReplyDraft(nextDraft);
        pendingReplyCursorRef.current = start + marker.length;
      } else {
        setCommentDraft(nextDraft);
        pendingCursorRef.current = start + marker.length;
      }
      setMentionMenu(null);
      (container as HTMLDivElement).focus();
      setSelectedMentionIds((prev) =>
        prev.includes(mention.id) ? prev : [...prev, mention.id]
      );
    },
    [mentionMenu, taggableProfiles]
  );

  interface MentionSuggestionsDropdownProps {
    mentionMenu: { query: string; atStart: number; highlightIndex: number };
    filteredMentions: { id: string; name: string }[];
    inlineMenuTop: number | null;
    hasShotMenu: boolean;
    emptyLabel: string;
    showAtPrefix: boolean;
    onSelectMention: (id: string) => void;
  }

  const MentionSuggestionsDropdown: React.FC<MentionSuggestionsDropdownProps> = ({
    mentionMenu,
    filteredMentions,
    inlineMenuTop,
    hasShotMenu,
    emptyLabel,
    showAtPrefix,
    onSelectMention,
  }) => (
    <div
      role="listbox"
      aria-label="Mention person"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: inlineMenuTop != null ? inlineMenuTop : '100%',
        marginTop: inlineMenuTop != null ? 0 : hasShotMenu ? 8 : 4,
        maxHeight: 220,
        overflowY: 'auto',
        backgroundColor: COLORS.cardBg,
        border: `1px solid ${COLORS.backgroundLight}`,
        borderRadius: RADIUS.sm,
        boxShadow: SHADOWS.light,
        zIndex: 21,
      }}
    >
      {filteredMentions.length === 0 ? (
        <div
          style={{
            padding: SPACING.sm,
            ...TYPOGRAPHY.bodySmall,
            color: COLORS.textMuted,
          }}
        >
          {emptyLabel}
        </div>
      ) : (
        filteredMentions.map((p, i) => (
          <button
            key={p.id}
            type="button"
            role="option"
            aria-selected={mentionMenu.highlightIndex === i}
            onMouseDown={(e) => {
              e.preventDefault();
              onSelectMention(p.id);
            }}
            style={{
              display: 'block',
              width: '100%',
              padding: `${SPACING.sm}px ${SPACING.md}px`,
              border: 'none',
              background:
                mentionMenu.highlightIndex === i ? COLORS.backgroundLight : 'transparent',
              textAlign: 'left',
              ...TYPOGRAPHY.bodySmall,
              color: COLORS.textPrimary,
              cursor: 'pointer',
            }}
          >
            {showAtPrefix ? `@${p.name}` : p.name}
          </button>
        ))
      )}
    </div>
  );

  const handleDeleteComment = async (commentId: string | number) => {
    if (!isDbSession || typeof commentId !== 'string') {
      // Local state fallback
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setRepliesByCommentId((prev) => {
        const next = { ...prev };
        delete next[String(commentId)];
        return next;
      });
      return;
    }
    const success = await deleteSessionComment(supabase, commentId);
    if (success) {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setRepliesByCommentId((prev) => {
        const next = { ...prev };
        delete next[commentId];
        return next;
      });
    }
  };

  const handleEditComment = async (commentId: string | number, newText: string) => {
    if (!isDbSession || typeof commentId !== 'string') {
      // Local state fallback
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, text: newText } : c))
      );
      setEditingCommentId(null);
      setEditDraft('');
      return;
    }
    const success = await updateSessionComment(supabase, commentId, newText);
    if (success) {
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, text: newText } : c))
      );
      setEditingCommentId(null);
      setEditDraft('');
    }
  };

  if (!session) {
    return null;
  }

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        minHeight: isDesktop ? 'auto' : '100vh',
        height: '100%',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        margin: 0,
        boxSizing: 'border-box',
        boxShadow: '0 0 0 1px rgba(0,0,0,0.04)',
      }}
    >
      {/* Header: back icon, center date, right icon — fixed at top on wide; scrolls with content on narrow */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: SPACING.sm,
          padding: `${SPACING.md}px clamp(${SPACING.sm}px, 4vw, ${SPACING.lg}px)`,
          borderBottom: '1px solid #f1f5f9',
          backgroundColor: '#ffffff',
          minWidth: 0,
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            width: 40,
            height: 40,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            border: 'none',
            background: 'none',
            color: '#475569',
            cursor: 'pointer',
          }}
          aria-label="Back"
        >
          <IconArrowLeft size={22} />
        </button>
        {breadcrumbFromRoadmap ? (
          <nav
            aria-label="Breadcrumb"
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              minWidth: 0,
              overflow: 'hidden',
            }}
          >
            {breadcrumbFromRoadmap.studentName && (
              <>
                <button
                  type="button"
                  onClick={onBack}
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    lineHeight: 1.3,
                    letterSpacing: '-0.015em',
                    color: COLORS.textSecondary,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                  }}
                >
                  {breadcrumbFromRoadmap.studentName}
                </button>
                <IconChevronRight size={14} style={{ color: COLORS.textSecondary, flexShrink: 0 }} aria-hidden />
              </>
            )}
            <button
              type="button"
              onClick={onBack}
              style={{
                fontSize: 14,
                fontWeight: 600,
                lineHeight: 1.3,
                letterSpacing: '-0.015em',
                color: breadcrumbFromRoadmap.studentName ? COLORS.textSecondary : COLORS.textPrimary,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
              }}
            >
              Your Roadmap
            </button>
            <IconChevronRight size={14} style={{ color: COLORS.textSecondary, flexShrink: 0 }} aria-hidden />
            <button
              type="button"
              onClick={() =>
                onBreadcrumbShotClick
                  ? onBreadcrumbShotClick(breadcrumbFromRoadmap.shotTitle)
                  : onBack()
              }
              style={{
                fontSize: 14,
                fontWeight: 600,
                lineHeight: 1.3,
                letterSpacing: '-0.015em',
                color: COLORS.textSecondary,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
              }}
            >
              {breadcrumbFromRoadmap.shotTitle}
            </button>
            {session?.dateLabel ? (
              <>
                <IconChevronRight size={14} style={{ color: COLORS.textSecondary, flexShrink: 0 }} aria-hidden />
                <span
                  aria-current="page"
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    lineHeight: 1.3,
                    letterSpacing: '-0.015em',
                    color: COLORS.textPrimary,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {session.dateLabel}
                </span>
              </>
            ) : null}
          </nav>
        ) : (
          <h1
            style={{
              margin: 0,
              fontSize: 'clamp(15px, 4.5vw, 18px)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: COLORS.textPrimary,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {session?.dateLabel}
          </h1>
        )}
        <div
          style={{
            width: 40,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
          }}
        >
          {isAdmin && isDbSession && (
            <button
              type="button"
              onClick={() => setShowEditSession(true)}
              aria-label="Edit session"
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: 'none',
                backgroundColor: 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: COLORS.textSecondary,
              }}
            >
              <IconPencil size={18} />
            </button>
          )}
        </div>
      </header>
      <div
        style={{
          padding: `0 clamp(${SPACING.sm}px, 4vw, ${SPACING.lg}px)`,
          width: '100%',
          boxSizing: 'border-box',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Main content */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isNarrow
              ? 'minmax(0, 1fr)'
              : 'minmax(0, 1fr) minmax(280px, 400px)',
            gridTemplateRows: isNarrow ? 'auto 1fr' : '1fr',
            gap: isNarrow ? SPACING.sm : SPACING.lg,
            minWidth: 0,
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          {/* Video + session info */}
          <div
            style={{
              minWidth: 0,
              ...(isNarrow ? { minHeight: 200 } : { overflow: 'hidden', minHeight: 0, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }),
            }}
          >
            {/* Sentinel: when this scrolls past viewport top (narrow only), we stick the video with position:fixed */}
            {isNarrow && (
              <div
                ref={videoStickySentinelRef}
                style={{ height: 1, width: '100%', pointerEvents: 'none' }}
                aria-hidden
              />
            )}
            {isNarrow && videoStickyBox && (
              <div
                ref={videoStickySpacerRef}
                style={{
                  height: videoStickyBox.height,
                  width: '100%',
                  flexShrink: 0,
                  marginBottom: SPACING.md,
                }}
                aria-hidden
              />
            )}
              <div
                ref={videoPlayerWrapperRef}
                style={{
                  position: isNarrow && videoStickyBox ? ('fixed' as const) : ('sticky' as const),
                  top: 0,
                  zIndex: 2,
                  width: isNarrow && videoStickyBox ? videoStickyBox.width : '100%',
                  maxWidth: '100%',
                  marginLeft: undefined,
                  marginRight: undefined,
                  left: isNarrow && videoStickyBox ? videoStickyBox.left : undefined,
                  borderRadius: 12,
                  overflow: 'hidden',
                  background: '#ffffff',
                  marginBottom: isNarrow ? SPACING.sm : 0,
                  border: 'none',
                  ...(isNarrow ? {} : { maxHeight: '100%' }),
                }}
              >
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  ...(isNarrow ? {} : { maxHeight: '100%' }),
                }}
              >
              {session && (
                <VideoPlayer
                  ref={videoPlayerRef}
                  videoUrl={session.videoUrl}
                  videoKey={session.id}
                  variant="sessionDetail"
                  accentColor={REFERENCE_PRIMARY}
                  pauseRequested={anyModalOpen || !isTabVisible || frameReplyPauseRequested}
                  showFrameDetailReplyOverlay={
                    replyingToCommentId != null ||
                    editingReplyId != null ||
                    (activeFrameReplyId != null && frameDetailMarkerInitial != null)
                  }
                  frameDetailMarkerInitial={frameDetailMarkerInitial}
                  frameDetailMarkerReadOnly={frameDetailMarkerReadOnly}
                  onPlay={() => setActiveFrameReplyId(null)}
                  onControlPressed={() => setActiveFrameReplyId(null)}
                  markers={
                    comments
                      .filter((c) => c.timestampSeconds != null)
                      .map<VideoPlayerMarker>((c) => ({
                        time: c.timestampSeconds ?? 0,
                        id: c.id,
                        label: `${c.author}: ${
                          c.text.length > 45 ? c.text.slice(0, 45) + '…' : c.text
                        }`,
                      }))
                  }
                  onMarkerClick={(marker) => {
                    if (marker.id != null) {
                      setActiveCommentId(marker.id);
                    }
                  }}
                  onTimeUpdate={(t, dur) => {
                    setCurrentVideoTime(t);
                    setVideoDuration(dur);
                  }}
                  onActiveMarkerChange={(marker) => {
                    setActiveCommentId(marker?.id ?? null);
                  }}
                  seekToSeconds={pendingSeekSeconds}
                  onSeekHandled={() => setPendingSeekSeconds(null)}
                  canRequestAddUrl={canAddVideoUrl && !hasVideoUrl && !showAddUrlForm}
                  onRequestAddUrl={() => {
                    setShowAddUrlForm(true);
                    setAddUrlError(null);
                    setAddUrlDraft('');
                  }}
                />
              )}
              </div>
            </div>
          </div>

          {/* Comments column */}
          <div
            style={{
              minWidth: 0,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {isShotVideo && (
              <div
                style={{
                  display: 'flex',
                  gap: 0,
                  padding: `${SPACING.xs}px 0`,
                  marginBottom: SPACING.sm,
                  flexShrink: 0,
                }}
                role="tablist"
                aria-label="Shot session tabs"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={shotDetailTab === 'comments'}
                  onClick={() => setShotDetailTab('comments')}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: 0,
                    background: 'none',
                    fontSize: 14,
                    fontWeight: shotDetailTab === 'comments' ? 600 : 500,
                    color: shotDetailTab === 'comments' ? REFERENCE_PRIMARY : COLORS.textSecondary,
                    borderBottom: `3px solid ${shotDetailTab === 'comments' ? REFERENCE_PRIMARY : 'transparent'}`,
                    marginBottom: -1,
                    cursor: 'pointer',
                  }}
                >
                  Comments
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={shotDetailTab === 'technique'}
                  onClick={() => setShotDetailTab('technique')}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: 0,
                    background: 'none',
                    fontSize: 14,
                    fontWeight: shotDetailTab === 'technique' ? 600 : 500,
                    color: shotDetailTab === 'technique' ? REFERENCE_PRIMARY : COLORS.textSecondary,
                    borderBottom: `3px solid ${shotDetailTab === 'technique' ? REFERENCE_PRIMARY : 'transparent'}`,
                    marginBottom: -1,
                    cursor: 'pointer',
                  }}
                >
                  Shot technique
                </button>
              </div>
            )}
            {(!isShotVideo || shotDetailTab === 'comments') && (
              <>
            {/* Filter & Sort */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: `${SPACING.xs}px 0`,
                gap: SPACING.xs,
                minWidth: 0,
                flexShrink: 0,
              }}
            >
              <button
                type="button"
                onClick={() => setIsFilterSheetOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 12px',
                  borderRadius: 9999,
                  border: '1px solid #e2e8f0',
                  backgroundColor: 'transparent',
                  color: '#64748b',
                  fontSize: 'clamp(11px, 2.8vw, 12px)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
                aria-label="Filter comments"
                title="Filter comments by shots and students"
              >
                <IconFilter size={14} />
                Filters
                {(shotFilter.length || studentFilter.length) > 0 && (
                  <span
                    style={{
                      minWidth: 18,
                      height: 18,
                      borderRadius: 999,
                      backgroundColor: REFERENCE_PRIMARY,
                      color: '#fff',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      padding: '0 5px',
                    }}
                  >
                    {shotFilter.length + studentFilter.length}
                  </span>
                )}
              </button>
            </div>

            <div
              ref={commentsScrollRef}
              style={{
                flex: 1,
                minWidth: 0,
                minHeight: 0,
                overflowY: 'auto',
                overflowX: 'hidden',
                paddingLeft: SPACING.sm,
                paddingRight: SPACING.sm,
                paddingBottom: SPACING.xxl + SPACING.lg,
              }}
            >
              {commentsLoading ? (
                <p style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, margin: 0 }}>
                  Loading comments…
                </p>
              ) : comments.length === 0 ? (
                <p
                  style={{
                    ...TYPOGRAPHY.bodySmall,
                    color: COLORS.textSecondary,
                    margin: 0,
                  }}
                >
                  No comments yet. Be the first to leave a note about this session.
                </p>
              ) : visibleComments.length === 0 ? (
                <p
                  style={{
                    ...TYPOGRAPHY.bodySmall,
                    color: COLORS.textSecondary,
                    margin: 0,
                  }}
                >
                  No comments match the current filters.
                </p>
              ) : (
                visibleComments.map((comment) => {
                  const isCoach = comment.role === 'Coach';
                  const isActive = activeCommentId !== null && comment.id === activeCommentId;
                  const canSeekToTimestamp =
                    comment.timestampSeconds != null && editingCommentId !== comment.id;

                  return (
                    <div
                      key={comment.id}
                      data-comment-id={comment.id}
                      role={canSeekToTimestamp ? 'button' : undefined}
                      tabIndex={canSeekToTimestamp ? 0 : undefined}
                      onClick={
                        canSeekToTimestamp
                          ? () => {
                              seekToTimestampIfNeeded(comment.timestampSeconds!);
                              setActiveCommentId(comment.id);
                            }
                          : undefined
                      }
                      onKeyDown={
                        canSeekToTimestamp
                          ? (e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                seekToTimestampIfNeeded(comment.timestampSeconds!);
                                setActiveCommentId(comment.id);
                              }
                              if (e.key === ' ') e.preventDefault();
                            }
                          : undefined
                      }
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 0,
                        padding: `${SPACING.sm}px ${SPACING.sm}px`,
                        cursor: canSeekToTimestamp ? 'pointer' : 'default',
                        backgroundColor: isActive ? `${REFERENCE_PRIMARY}18` : 'transparent',
                        borderRadius: 8,
                        margin: isActive ? `0 -${SPACING.sm}px 0 0` : 0,
                      }}
                    >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: SPACING.sm,
                          marginBottom: 4,
                          minWidth: 0,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, overflow: 'hidden' }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              backgroundColor: `${REFERENCE_PRIMARY}33`,
                              flexShrink: 0,
                              overflow: 'hidden',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 16,
                            }}
                          >
                            {isCoach ? '🎓' : '🙂'}
                          </div>
                          <span
                            style={{
                              fontSize: 14,
                              fontWeight: 700,
                              color: COLORS.textPrimary,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              minWidth: 0,
                            }}
                          >
                            {comment.author}
                          </span>
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: SPACING.xs,
                            flexShrink: 0,
                            position: 'relative',
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {comment.timestampSeconds != null && (
                            <>
                              {comment.exampleGif ? (
                                <ExampleGifButton
                                  gifFileName={comment.exampleGif}
                                  shotExampleGifs={shotExampleGifs}
                                  stopPropagation
                                  onClick={(gif) =>
                                    setViewExampleModal({
                                      src: gif.src,
                                      title: gif.title,
                                      commentId: comment.id,
                                    })
                                  }
                                />
                              ) : isAdmin ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExampleModalContext(comment.id);
                                    setIsExampleModalOpen(true);
                                  }}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    padding: '2px 8px',
                                    borderRadius: 6,
                                    border: '1px solid #e2e8f0',
                                    backgroundColor: COLORS.cardBg,
                                    color: COLORS.textSecondary,
                                    fontSize: 10,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                  }}
                                >
                                  +example
                                </button>
                              ) : null}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  seekToTimestampIfNeeded(comment.timestampSeconds!);
                                  setActiveCommentId(comment.id);
                                }}
                                onKeyDown={(e) => { if (e.key === ' ') e.preventDefault(); }}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  padding: '6px 12px',
                                  borderRadius: 8,
                                  border: 'none',
                                  backgroundColor: `${REFERENCE_PRIMARY}1A`,
                                  color: REFERENCE_PRIMARY,
                                  fontSize: 12,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                <IconPlay size={14} style={{ flexShrink: 0 }} />
                                {formatTimestamp(comment.timestampSeconds)}
                              </button>
                            </>
                          )}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveCommentMenu((prev) => (prev === comment.id ? null : comment.id));
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                padding: 4,
                                cursor: 'pointer',
                                color: COLORS.textSecondary,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '50%',
                              }}
                            >
                              <IconMoreVertical size={16} />
                            </button>
                          )}
                          {activeCommentMenu === comment.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                position: 'absolute',
                                top: '100%',
                                right: 0,
                                marginTop: 4,
                                backgroundColor: COLORS.cardBg,
                                borderRadius: RADIUS.md,
                                zIndex: 10,
                                minWidth: 120,
                                overflow: 'hidden',
                              }}
                            >
                              {isDbSession && user?.id && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveFrameReplyId(null);
                                    setReplyingToCommentId(String(comment.id));
                                    if (comment.timestampSeconds != null) {
                                      seekToTimestampIfNeeded(comment.timestampSeconds);
                                      setFrameReplyPauseRequested(true);
                                      setReplyTimestampSeconds(comment.timestampSeconds);
                                      if (Math.abs(currentVideoTime - comment.timestampSeconds) > 1) {
                                        videoPlayerRef.current?.pause();
                                      }
                                    } else {
                                      setReplyTimestampSeconds(toFramePrecision(currentVideoTime));
                                    }
                                    setReplyDraft('');
                                    setActiveCommentMenu(null);
                                  }}
                                  style={{
                                    display: 'block',
                                    width: '100%',
                                    textAlign: 'left',
                                    padding: `${SPACING.sm}px ${SPACING.md}px`,
                                    background: 'none',
                                    border: 'none',
                                    ...TYPOGRAPHY.bodySmall,
                                    color: COLORS.textPrimary,
                                    cursor: 'pointer',
                                  }}
                                >
                                  Add Frame Comment
                                </button>
                              )}
                              <div
                                style={{
                                  height: 1,
                                  margin: `${SPACING.xs}px 0`,
                                  backgroundColor: COLORS.backgroundLight,
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setEditDraft(comment.text);
                                  setEditingCommentId(comment.id);
                                  setActiveCommentMenu(null);
                                }}
                                style={{
                                  display: 'block',
                                  width: '100%',
                                  textAlign: 'left',
                                  padding: `${SPACING.sm}px ${SPACING.md}px`,
                                  background: 'none',
                                  border: 'none',
                                  ...TYPOGRAPHY.bodySmall,
                                  color: COLORS.textPrimary,
                                  cursor: 'pointer',
                                }}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  handleDeleteComment(comment.id);
                                  setActiveCommentMenu(null);
                                }}
                                style={{
                                  display: 'block',
                                  width: '100%',
                                  textAlign: 'left',
                                  padding: `${SPACING.sm}px ${SPACING.md}px`,
                                  background: 'none',
                                  border: 'none',
                                  ...TYPOGRAPHY.bodySmall,
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      {editingCommentId === comment.id ? (
                        <div style={{ marginTop: SPACING.xs, position: 'relative' }}>
                          <div
                            ref={editingCommentId === comment.id ? editInputRef : undefined}
                            contentEditable
                            suppressContentEditableWarning
                            role="textbox"
                            aria-multiline="true"
                            aria-label="Edit comment. Type / for shot commands or @ to tag people."
                            onInput={handleCommentInput}
                            onKeyDown={(e) => {
                              e.stopPropagation();
                              handleCommentKeyDown(e);
                            }}
                            onPaste={(e) => {
                              e.preventDefault();
                              const text = e.clipboardData.getData('text/plain');
                              document.execCommand('insertText', false, text);
                            }}
                            style={{
                              minHeight: 48,
                              width: '100%',
                              outline: 'none',
                              ...TYPOGRAPHY.bodySmall,
                              color: COLORS.textPrimary,
                              padding: `${SPACING.xs}px ${SPACING.sm}px`,
                              borderRadius: RADIUS.sm,
                              border: `1px solid ${COLORS.backgroundLight}`,
                              backgroundColor: COLORS.cardBg,
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                            }}
                          />
                          {shotMenu != null && (
                            <ShotSuggestionsDropdown
                              shotMenu={shotMenu}
                              filteredShots={filteredShots}
                              inlineMenuTop={inlineMenuTop}
                              onSelectShot={selectShotFromMenu}
                            />
                          )}
                          {mentionMenu != null && (
                            <MentionSuggestionsDropdown
                              mentionMenu={mentionMenu}
                              filteredMentions={filteredMentions}
                              inlineMenuTop={inlineMenuTop}
                              hasShotMenu={shotMenu != null}
                              emptyLabel="No students/coaches assigned to this session"
                              showAtPrefix
                              onSelectMention={selectMentionFromMenu}
                            />
                          )}
                          <div style={{ display: 'flex', gap: SPACING.sm, marginTop: SPACING.sm, justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingCommentId(null);
                                setEditDraft('');
                              }}
                              style={{
                                padding: `${SPACING.xs}px ${SPACING.md}px`,
                                borderRadius: RADIUS.sm,
                                border: `1px solid ${COLORS.backgroundLight}`,
                                backgroundColor: COLORS.cardBg,
                                ...TYPOGRAPHY.label,
                                color: COLORS.textSecondary,
                                cursor: 'pointer',
                              }}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditComment(comment.id, editDraft.trim());
                                setEditDraft('');
                              }}
                              disabled={!editDraft.trim()}
                              style={{
                                padding: `${SPACING.xs}px ${SPACING.md}px`,
                                borderRadius: RADIUS.sm,
                                border: 'none',
                                backgroundColor: REFERENCE_PRIMARY,
                                color: COLORS.white,
                                ...TYPOGRAPHY.label,
                                fontWeight: 600,
                                cursor: editDraft.trim() ? 'pointer' : 'not-allowed',
                              }}
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p
                          style={{
                            ...TYPOGRAPHY.bodySmall,
                            margin: `${SPACING.xs}px 0 0`,
                            color: COLORS.textPrimary,
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word',
                          }}
                        >
                          {parseCommentTextWithShots(comment.text).map((seg, i) => {
                            if (seg.type === 'text') return <span key={i}>{seg.value}</span>;
                            if (seg.type === 'shot') {
                              return (
                                <span key={i} style={SHOT_PILL_STYLE}>
                                  {seg.name}
                                </span>
                              );
                            }
                            return (
                              <span key={i} style={MENTION_PILL_STYLE}>
                                @{seg.name}
                              </span>
                            );
                          })}
                        </p>
                      )}
                      {repliesByCommentId[String(comment.id)] &&
                        repliesByCommentId[String(comment.id)].map((reply) => {
                          const tsSeconds = (reply.timestampSeconds ?? comment.timestampSeconds) ?? null;
                          const canSeek = tsSeconds != null && !!session?.videoUrl;
                          const timestampLabel =
                            tsSeconds != null ? formatTimestamp(tsSeconds) : comment.timestampSeconds != null ? formatTimestamp(comment.timestampSeconds) : null;
                          const _isOwnReply = reply.role === 'You';
                          const isEditing = editingReplyId === reply.id;
                          const isMenuOpen = activeReplyMenuId === reply.id;
                          return (
                            <FrameDetailCard
                              key={reply.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (canSeek && tsSeconds != null) {
                                  setActiveFrameReplyId(reply.id);
                                  setActiveCommentId(comment.id);
                                }
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  marginBottom: 4,
                                  position: 'relative',
                                }}
                              >
                                <div
                                  style={{
                                    ...TYPOGRAPHY.label,
                                    fontSize: 11,
                                    letterSpacing: '0.08em',
                                    textTransform: 'uppercase',
                                    color: '#8fb9a8',
                                  }}
                                >
                                  FRAME DETAIL
                                  {timestampLabel && (
                                    <span style={{ color: '#9ca3af', marginLeft: 4 }}>[{timestampLabel}]</span>
                                  )}
                                </div>
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                  }}
                                >
                                  {canSeek && tsSeconds != null && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveFrameReplyId(reply.id);
                                        setActiveCommentId(comment.id);
                                      }}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        border: 'none',
                                        background: 'transparent',
                                        color: '#8fb9a8',
                                        fontSize: 11,
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        textTransform: 'uppercase',
                                      }}
                                    >
                                      <IconPlay size={12} />
                                      View frame
                                    </button>
                                  )}
                                  {isAdmin && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveReplyMenuId((prev) =>
                                          prev === reply.id ? null : String(reply.id)
                                        );
                                      }}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        padding: 4,
                                        cursor: 'pointer',
                                        color: COLORS.textSecondary,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: '50%',
                                      }}
                                    >
                                      <IconMoreVertical size={16} />
                                    </button>
                                  )}
                                  {isMenuOpen && (
                                    <div
                                      onClick={(e) => e.stopPropagation()}
                                      style={{
                                        position: 'absolute',
                                        top: '100%',
                                        right: 0,
                                        marginTop: 4,
                                        backgroundColor: COLORS.cardBg,
                                        borderRadius: RADIUS.md,
                                        zIndex: 10,
                                        minWidth: 120,
                                        overflow: 'hidden',
                                      }}
                                    >
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditReplyDraft(reply.text);
                                          setActiveFrameReplyId(null);
                                          setEditingReplyId(reply.id);
                                          setActiveReplyMenuId(null);
                                        }}
                                        style={{
                                          display: 'block',
                                          width: '100%',
                                          textAlign: 'left',
                                          padding: `${SPACING.sm}px ${SPACING.md}px`,
                                          background: 'none',
                                          border: 'none',
                                          ...TYPOGRAPHY.bodySmall,
                                          color: COLORS.textPrimary,
                                          cursor: 'pointer',
                                        }}
                                      >
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          void handleDeleteReply(String(comment.id), reply.id);
                                          setActiveReplyMenuId(null);
                                        }}
                                        style={{
                                          display: 'block',
                                          width: '100%',
                                          textAlign: 'left',
                                          padding: `${SPACING.sm}px ${SPACING.md}px`,
                                          background: 'none',
                                          border: 'none',
                                          ...TYPOGRAPHY.bodySmall,
                                          color: '#ef4444',
                                          cursor: 'pointer',
                                        }}
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                              {isEditing ? (
                                <div>
                                  <textarea
                                    value={editReplyDraft}
                                    onChange={(e) => setEditReplyDraft(e.target.value)}
                                    style={{
                                      width: '100%',
                                      minHeight: 56,
                                      resize: 'none',
                                      overflow: 'hidden',
                                      borderRadius: RADIUS.sm,
                                      border: `1px solid ${COLORS.backgroundLight}`,
                                      padding: `${SPACING.xs}px ${SPACING.sm}px`,
                                      ...TYPOGRAPHY.bodySmall,
                                      color: COLORS.textPrimary,
                                      backgroundColor: COLORS.cardBg,
                                    }}
                                  />
                                  <div
                                    style={{
                                      display: 'flex',
                                      justifyContent: 'flex-end',
                                      gap: 8,
                                      marginTop: SPACING.xs,
                                    }}
                                  >
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        void handleSaveReplyEdit(String(comment.id), reply.id);
                                      }}
                                      disabled={postingReply || !editReplyDraft.trim()}
                                      style={{
                                        padding: '4px 10px',
                                        borderRadius: 999,
                                        border: 'none',
                                        backgroundColor:
                                          postingReply || !editReplyDraft.trim() ? '#d1e3db' : '#8fb9a8',
                                        color: '#ffffff',
                                        fontSize: 11,
                                        fontWeight: 600,
                                        cursor:
                                          postingReply || !editReplyDraft.trim() ? 'default' : 'pointer',
                                      }}
                                    >
                                      Save
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveFrameReplyId(null);
                                        setEditingReplyId(null);
                                        setEditReplyDraft('');
                                      }}
                                      style={{
                                        padding: '4px 8px',
                                        borderRadius: 999,
                                        border: 'none',
                                        backgroundColor: 'transparent',
                                        color: COLORS.textSecondary,
                                        fontSize: 11,
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                      }}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p
                                  style={{
                                    ...TYPOGRAPHY.bodySmall,
                                    margin: 0,
                                    color: COLORS.textPrimary,
                                  }}
                                >
                                  {parseCommentTextWithShots(reply.text).map((seg, i) => {
                                    if (seg.type === 'text') return <span key={i}>{seg.value}</span>;
                                    if (seg.type === 'shot') {
                                      return (
                                        <span key={i} style={SHOT_PILL_STYLE}>
                                          {seg.name}
                                        </span>
                                      );
                                    }
                                    return (
                                      <span key={i} style={MENTION_PILL_STYLE}>
                                        @{seg.name}
                                      </span>
                                    );
                                  })}
                                </p>
                              )}
                            </FrameDetailCard>
                          );
                        })}
                      {replyingToCommentId === String(comment.id) && (
                        <FrameDetailCard onClick={(e) => e.stopPropagation()}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              marginBottom: 4,
                            }}
                          >
                            <div
                              style={{
                                ...TYPOGRAPHY.label,
                                fontSize: 11,
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                color: '#8fb9a8',
                              }}
                            >
                              FRAME DETAIL
                              <span style={{ color: '#9ca3af', marginLeft: 4 }}>
                                [{formatTimestamp(replyTimestampSeconds ?? currentVideoTime)}]
                              </span>
                            </div>
                          </div>
                          <div style={{ position: 'relative', marginBottom: SPACING.sm }}>
                            <div
                              ref={replyInputRef}
                              contentEditable
                              suppressContentEditableWarning
                              role="textbox"
                              aria-multiline="true"
                              aria-label="Add a comment to the frame. Type / for shot commands or @ to tag people."
                              onInput={handleCommentInput}
                              onKeyDown={(e) => {
                                e.stopPropagation();
                                handleCommentKeyDown(e);
                              }}
                              onPaste={(e) => {
                                e.preventDefault();
                                const text = e.clipboardData.getData('text/plain');
                                document.execCommand('insertText', false, text);
                              }}
                              style={{
                                minHeight: 56,
                                width: '100%',
                                outline: 'none',
                                ...TYPOGRAPHY.bodySmall,
                                color: COLORS.textPrimary,
                                padding: `${SPACING.xs}px ${SPACING.sm}px`,
                                borderRadius: RADIUS.sm,
                                border: `1px solid ${COLORS.backgroundLight}`,
                                backgroundColor: COLORS.cardBg,
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                              }}
                            />
                            {shotMenu != null && (
                              <ShotSuggestionsDropdown
                                shotMenu={shotMenu}
                                filteredShots={filteredShots}
                                inlineMenuTop={inlineMenuTop}
                                onSelectShot={selectShotFromMenu}
                              />
                            )}
                            {mentionMenu != null && (
                              <MentionSuggestionsDropdown
                                mentionMenu={mentionMenu}
                                filteredMentions={filteredMentions}
                                inlineMenuTop={inlineMenuTop}
                                hasShotMenu={shotMenu != null}
                                emptyLabel="No matching person"
                                showAtPrefix={false}
                                onSelectMention={selectMentionFromMenu}
                              />
                            )}
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'flex-end',
                              gap: 8,
                              marginTop: SPACING.xs,
                            }}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleAddReply(comment.id);
                              }}
                              disabled={postingReply || !replyDraft.trim()}
                              style={{
                                padding: '4px 10px',
                                borderRadius: 999,
                                border: 'none',
                                backgroundColor: postingReply || !replyDraft.trim() ? '#d1e3db' : '#8fb9a8',
                                color: '#ffffff',
                                fontSize: 11,
                                fontWeight: 600,
                                cursor: postingReply || !replyDraft.trim() ? 'default' : 'pointer',
                              }}
                            >
                              Post reply
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveFrameReplyId(null);
                                setReplyingToCommentId(null);
                                setReplyTimestampSeconds(null);
                                setFrameReplyPauseRequested(false);
                                setReplyDraft('');
                              }}
                              style={{
                                padding: '4px 8px',
                                borderRadius: 999,
                                border: 'none',
                                backgroundColor: 'transparent',
                                color: COLORS.textSecondary,
                                fontSize: 11,
                                fontWeight: 500,
                                cursor: 'pointer',
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </FrameDetailCard>
                      )}
                    </div>
                  </div>
                  );
                })
              )}

            {showCommentComposer && (
            <div
              style={{
                borderRadius: RADIUS.md,
                padding: SPACING.sm,
                backgroundColor: COLORS.cardBg,
                border: `1px solid ${COLORS.backgroundLight}`,
                marginTop: SPACING.md,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: SPACING.sm,
                  marginBottom: SPACING.xs,
                }}
              >
                <label
                  htmlFor="session-comment-input"
                  style={{
                    ...TYPOGRAPHY.label,
                    textTransform: 'uppercase',
                    color: COLORS.textSecondary,
                  }}
                >
                  Comment
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.xs }}>
                  {isAdmin && (
                    <>
                      <ExampleGifButton
                        gifFileName={pendingNewCommentGif}
                        shotExampleGifs={shotExampleGifs}
                        style={{ flexShrink: 0 }}
                        onClick={(gif) =>
                          setViewExampleModal({
                            src: gif.src,
                            title: gif.title,
                          })
                        }
                      />
                      {!pendingNewCommentGif && (
                        <button
                          type="button"
                          onClick={() => {
                            setExampleModalContext('new');
                            setIsExampleModalOpen(true);
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: `${SPACING.xs}px ${SPACING.sm}px`,
                            borderRadius: RADIUS.sm,
                            border: `1px solid ${COLORS.backgroundLight}`,
                            backgroundColor: COLORS.cardBg,
                            color: COLORS.textSecondary,
                            ...TYPOGRAPHY.label,
                            fontWeight: 600,
                            cursor: 'pointer',
                            flexShrink: 0,
                          }}
                        >
                          +example
                        </button>
                      )}
                    </>
                  )}
                  <div
                    role="group"
                    aria-label="Comment timestamp"
                    style={{
                      display: 'inline-flex',
                      padding: 2,
                      borderRadius: RADIUS.sm,
                      backgroundColor: COLORS.backgroundLight,
                      gap: 0,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setIncludeTimestamp(false)}
                      onKeyDown={(e) => { if (e.key === ' ') e.preventDefault(); }}
                      style={{
                        padding: `${SPACING.xs}px ${SPACING.sm}px`,
                        borderRadius: RADIUS.sm - 2,
                        border: 'none',
                        backgroundColor: !includeTimestamp ? COLORS.white : 'transparent',
                        color: !includeTimestamp ? COLORS.textPrimary : COLORS.textSecondary,
                        ...TYPOGRAPHY.label,
                        fontWeight: !includeTimestamp ? 600 : 500,
                        cursor: 'pointer',
                        boxShadow: !includeTimestamp ? SHADOWS.light : 'none',
                      }}
                    >
                      No timestamp
                    </button>
                    <button
                      type="button"
                      onClick={() => setIncludeTimestamp(true)}
                      onKeyDown={(e) => { if (e.key === ' ') e.preventDefault(); }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: `${SPACING.xs}px ${SPACING.sm}px`,
                        borderRadius: RADIUS.sm - 2,
                        border: 'none',
                        backgroundColor: includeTimestamp ? COLORS.white : 'transparent',
                        color: includeTimestamp ? REFERENCE_PRIMARY : COLORS.textSecondary,
                        ...TYPOGRAPHY.label,
                        fontWeight: includeTimestamp ? 600 : 500,
                        cursor: 'pointer',
                        boxShadow: includeTimestamp ? SHADOWS.light : 'none',
                      }}
                    >
                      <IconClock size={14} />
                      {formatTimestamp(currentVideoTime)}
                    </button>
                  </div>
                </div>
              </div>
              {/* Tag line with manual "+ Add person" dropdown removed; mentions are handled via @ in the comment box */}
              <div style={{ position: 'relative', marginBottom: SPACING.sm }}>
                <div
                  ref={commentInputRef}
                  id="session-comment-input"
                  contentEditable
                  suppressContentEditableWarning
                  role="textbox"
                  aria-multiline="true"
                  aria-label="Type / for shot commands or @ to tag people."
                  onInput={handleCommentInput}
                  onKeyDown={handleCommentKeyDown}
                  onPaste={(e) => {
                    e.preventDefault();
                    const text = e.clipboardData.getData('text/plain');
                    document.execCommand('insertText', false, text);
                  }}
                  data-placeholder="Type / for shot commands or @ to tag"
                  style={{
                    minHeight: 56,
                    width: '100%',
                    outline: 'none',
                    ...TYPOGRAPHY.bodySmall,
                    color: COLORS.textPrimary,
                    background: 'transparent',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {/* Content is synced imperatively in useEffect to avoid React removeChild errors when user deletes nodes */}
                </div>
                {commentDraft === '' && (
                  <span
                    aria-hidden
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      ...TYPOGRAPHY.bodySmall,
                      color: COLORS.textMuted,
                      pointerEvents: 'none',
                    }}
                  >
                    Type / for shot commands or @ to tag
                  </span>
                )}
                {editingCommentId == null && shotMenu != null && (
                  <ShotSuggestionsDropdown
                    shotMenu={shotMenu}
                    filteredShots={filteredShots}
                    inlineMenuTop={inlineMenuTop}
                    onSelectShot={selectShotFromMenu}
                  />
                )}
                {editingCommentId == null && mentionMenu != null && (
                  <MentionSuggestionsDropdown
                    mentionMenu={mentionMenu}
                    filteredMentions={filteredMentions}
                    inlineMenuTop={inlineMenuTop}
                    hasShotMenu={shotMenu != null}
                    emptyLabel="No students/coaches assigned to this session"
                    showAtPrefix
                    onSelectMention={selectMentionFromMenu}
                  />
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => handleAddComment()}
                  disabled={!commentDraft.trim() || postingComment}
                  style={{
                    padding: `${SPACING.xs + 2}px ${SPACING.lg}px`,
                    borderRadius: 999,
                    border: 'none',
                    cursor: commentDraft.trim() ? 'pointer' : 'default',
                    ...TYPOGRAPHY.labelMed,
                    textTransform: 'uppercase',
                    letterSpacing: 0.4,
                    backgroundColor: commentDraft.trim()
                      ? REFERENCE_PRIMARY
                      : `${REFERENCE_PRIMARY}26`,
                    color: commentDraft.trim() ? '#1e293b' : COLORS.textPrimary,
                    boxShadow: commentDraft.trim()
                      ? `0 4px 12px ${REFERENCE_PRIMARY}40`
                      : 'none',
                    transition:
                      'background-color 0.15s ease-out, box-shadow 0.15s ease-out, transform 0.1s ease-out',
                  }}
                >
                  {postingComment ? 'Posting…' : 'Post'}
                </button>
              </div>
            </div>
            )}
            </div>
              </>
            )}
            {isShotVideo && shotDetailTab === 'technique' && (() => {
              const shotSkill = session ? ROADMAP_SKILLS.find((s) => s.title === session.title) : null;
              if (!shotSkill) {
                return (
                  <div
                    style={{
                      flex: 1,
                      minHeight: 0,
                      overflowY: 'auto',
                      padding: SPACING.lg,
                      ...TYPOGRAPHY.bodySmall,
                      color: COLORS.textSecondary,
                    }}
                  >
                    Technique points for this shot are not available.
                  </div>
                );
              }
              const subs = shotSkill.subCategories;
              const hasSubs = subs && subs.length > 0;
              const effectiveSubId = hasSubs && selectedTechniqueSubId && subs.some((s) => s.id === selectedTechniqueSubId)
                ? selectedTechniqueSubId
                : (subs?.[0]?.id ?? null);
              const techniqueItems = hasSubs && effectiveSubId
                ? (subs!.find((s) => s.id === effectiveSubId)?.items ?? [])
                : shotSkill.items;
              const getCheckedKey = (label: string) => buildTechniqueKey(effectiveSubId, label);
              return (
                <div
                  style={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: 'auto',
                    paddingLeft: SPACING.sm,
                    paddingRight: SPACING.sm,
                    paddingBottom: SPACING.xxl + SPACING.lg,
                  }}
                >
                  {!techniqueChecksLoaded && (
                    <div style={{ padding: SPACING.md, color: COLORS.textSecondary, fontSize: 13 }}>
                      Loading…
                    </div>
                  )}
                  {hasSubs && (
                    <div
                      style={{
                        display: 'flex',
                        gap: 0,
                        borderBottom: `1px solid ${REFERENCE_PRIMARY}1A`,
                        marginBottom: SPACING.md,
                      }}
                    >
                      {subs!.map((sub) => {
                        const isSubSelected = effectiveSubId === sub.id;
                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => setSelectedTechniqueSubId(sub.id)}
                            style={{
                              padding: '8px 12px',
                              border: 'none',
                              borderBottom: `3px solid ${isSubSelected ? REFERENCE_PRIMARY : 'transparent'}`,
                              marginBottom: -1,
                              background: 'none',
                              fontSize: 13,
                              fontWeight: isSubSelected ? 600 : 500,
                              color: isSubSelected ? REFERENCE_PRIMARY : COLORS.textSecondary,
                              cursor: 'pointer',
                              borderRadius: 0,
                            }}
                          >
                            {sub.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: SPACING.sm,
                    }}
                  >
                    {techniqueItems.map((item, idx) => {
                      const key = getCheckedKey(item.label);
                      const isChecked = isAdmin && (techniqueChecked[key] ?? item.completed);
                      const toggleChecked = () => {
                        const nextChecked = !(techniqueChecked[key] ?? item.completed);
                        setTechniqueChecked((prev) => ({ ...prev, [key]: nextChecked }));
                        if (isShotVideo && sessionId) {
                          void upsertShotTechniqueCheck(supabase, {
                            shotVideoId: sessionId,
                            subCategoryId: effectiveSubId ?? null,
                            itemLabel: item.label,
                            checked: nextChecked,
                          });
                        }
                      };
                      return (
                      <div
                        key={item.label}
                        role={isAdmin ? 'button' : undefined}
                        tabIndex={isAdmin ? 0 : undefined}
                        onClick={isAdmin ? toggleChecked : undefined}
                        onKeyDown={
                          isAdmin
                            ? (e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  toggleChecked();
                                }
                              }
                            : undefined
                        }
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: SPACING.md,
                          padding: SPACING.md,
                          borderRadius: 12,
                          backgroundColor: COLORS.cardBg,
                          border: `1px solid ${REFERENCE_PRIMARY}1A`,
                          minWidth: 0,
                          ...(isAdmin && { cursor: 'pointer' }),
                        }}
                      >
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            flexShrink: 0,
                            borderRadius: 12,
                            backgroundColor: `${REFERENCE_PRIMARY}1A`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: REFERENCE_PRIMARY,
                          }}
                        >
                          {TECHNIQUE_ICONS[idx % TECHNIQUE_ICONS.length]}
                        </div>
                        <span
                          style={{
                            flex: 1,
                            fontSize: 14,
                            fontWeight: 600,
                            color: COLORS.textPrimary,
                            wordBreak: 'break-word',
                          }}
                        >
                          {item.label}
                        </span>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleChecked();
                            }}
                            aria-label={isChecked ? `Mark "${item.label}" as not done` : `Mark "${item.label}" as done`}
                            style={{
                              width: 26,
                              height: 26,
                              flexShrink: 0,
                              borderRadius: '50%',
                              border: `2px solid ${isChecked ? REFERENCE_PRIMARY : '#94a3b8'}`,
                              backgroundColor: isChecked ? REFERENCE_PRIMARY : COLORS.white,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              padding: 0,
                              boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                            }}
                          >
                            {isChecked && (
                              <IconCheck size={14} style={{ color: '#fff' }} />
                            )}
                          </button>
                        )}
                      </div>
                    );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
      {/* Comment filter bottom sheet - above bottom nav so Apply Filters is visible */}
      <div
        aria-hidden={!isFilterSheetOpen}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 110,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          pointerEvents: isFilterSheetOpen ? 'auto' : 'none',
          backgroundColor: isFilterSheetOpen ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0)',
          transition: 'background-color 0.22s ease-out',
        }}
        onClick={() => setIsFilterSheetOpen(false)}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Filter comments"
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: 640,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            backgroundColor: COLORS.cardBg,
            boxShadow: isFilterSheetOpen ? '0 -18px 40px rgba(0,0,0,0.45)' : 'none',
            borderTop: `1px solid ${COLORS.backgroundLight}`,
            maxHeight: '90vh',
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            transform: isFilterSheetOpen ? 'translateY(0%)' : 'translateY(100%)',
            transition: 'transform 0.24s cubic-bezier(0.22, 0.61, 0.36, 1)',
          }}
        >
          {/* Handle + Header */}
          <div style={{ flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: SPACING.sm }}>
              <div
                style={{
                  width: 48,
                  height: 4,
                  borderRadius: 999,
                  backgroundColor: '#e2e8f0',
                }}
              />
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: `${SPACING.sm}px ${SPACING.lg}px ${SPACING.md}px`,
                gap: SPACING.md,
              }}
            >
              <button
                type="button"
                onClick={() => setIsFilterSheetOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 40,
                  height: 40,
                  padding: 0,
                  border: 'none',
                  background: 'none',
                  color: COLORS.textPrimary,
                  cursor: 'pointer',
                  borderRadius: '50%',
                }}
                aria-label="Close filters"
              >
                <IconX size={24} />
              </button>
              <h2
                style={{
                  flex: 1,
                  fontSize: 20,
                  fontWeight: 600,
                  color: COLORS.textPrimary,
                  margin: 0,
                  letterSpacing: '-0.02em',
                  textAlign: 'center',
                }}
              >
                Filters
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShotFilter([]);
                  setStudentFilter([]);
                }}
                style={{
                  padding: '4px 0',
                  minWidth: 40,
                  border: 'none',
                  background: 'none',
                  color: REFERENCE_PRIMARY,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Reset
              </button>
            </div>
          </div>
          {/* Scrollable content */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: `0 ${SPACING.lg}px ${SPACING.lg}px`,
              display: 'flex',
              flexDirection: 'column',
              gap: 32,
            }}
          >
            {/* Shots in this thread */}
            <section>
              <div style={{ marginBottom: SPACING.md }}>
                <h3
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    color: COLORS.textPrimary,
                    margin: 0,
                  }}
                >
                  Shots in this thread
                </h3>
              </div>
              {shotsInComments.length === 0 ? (
                <p style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textMuted, margin: 0 }}>
                  No shot tags have been used in the comments yet.
                </p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {shotsInComments.map((shot) => {
                    const isActive = shotFilter.includes(shot);
                    return (
                      <button
                        key={shot}
                        type="button"
                        onClick={() =>
                          setShotFilter((prev) =>
                            prev.includes(shot) ? prev.filter((s) => s !== shot) : [...prev, shot]
                          )
                        }
                        style={{
                          padding: '10px 20px',
                          borderRadius: 9999,
                          border: isActive
                            ? `1px solid ${REFERENCE_PRIMARY}`
                            : '1px solid #f1f5f9',
                          backgroundColor: isActive ? REFERENCE_PRIMARY : '#f8fafc',
                          color: isActive ? '#fff' : '#475569',
                          fontSize: 14,
                          fontWeight: 500,
                          cursor: 'pointer',
                        }}
                      >
                        {shot}
                        <span style={{ marginLeft: 4, opacity: isActive ? 0.9 : 0.85 }}>
                          ({shotCountByName.get(shot) ?? 0})
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
            {/* Students in this thread */}
            <section>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: SPACING.md,
                }}
              >
                <h3
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    color: COLORS.textPrimary,
                    margin: 0,
                  }}
                >
                  Students in this thread
                </h3>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: '#94a3b8',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {studentFilter.length} active
                </span>
              </div>
              {studentsInComments.length === 0 ? (
                <p style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textMuted, margin: 0 }}>
                  No students have been tagged in comments yet.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {studentsInComments.map((s) => {
                    const isActive = studentFilter.includes(s.id);
                    const handle = s.name.toLowerCase().replace(/\s+/g, '');
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() =>
                          setStudentFilter((prev) =>
                            prev.includes(s.id) ? prev.filter((id) => id !== s.id) : [...prev, s.id]
                          )
                        }
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: 12,
                          borderRadius: 12,
                          border: `1px solid ${isActive ? '#e2e8f0' : '#f1f5f9'}`,
                          backgroundColor: isActive ? '#f8fafc' : 'transparent',
                          cursor: 'pointer',
                          width: '100%',
                          textAlign: 'left',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            opacity: isActive ? 1 : 0.6,
                          }}
                        >
                          <div
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: '50%',
                              backgroundColor: '#e2e8f0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'hidden',
                              flexShrink: 0,
                            }}
                          >
                            <IconUser size={20} style={{ color: '#94a3b8' }} />
                          </div>
                          <div>
                            <p
                              style={{
                                fontSize: 14,
                                fontWeight: 500,
                                color: COLORS.textPrimary,
                                margin: 0,
                              }}
                            >
                              {s.name}
                            </p>
                            <p
                              style={{
                                fontSize: 12,
                                color: '#64748b',
                                margin: 0,
                              }}
                            >
                              @{handle}({tagCountByUserId.get(s.id) ?? 0})
                            </p>
                          </div>
                        </div>
                        <div
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            border: isActive ? 'none' : '1px solid #cbd5e1',
                            backgroundColor: isActive ? REFERENCE_PRIMARY : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {isActive && <IconCheck size={14} style={{ color: '#fff' }} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
          {/* Footer: Apply Filters + results */}
          <div
            style={{
              flexShrink: 0,
              padding: SPACING.lg,
              paddingTop: SPACING.md,
              borderTop: `1px solid ${COLORS.backgroundLight}`,
              backgroundColor: COLORS.cardBg,
            }}
          >
            <button
              type="button"
              onClick={() => setIsFilterSheetOpen(false)}
              style={{
                width: '100%',
                padding: '16px 24px',
                borderRadius: 16,
                border: 'none',
                backgroundColor: REFERENCE_PRIMARY,
                color: '#fff',
                fontSize: 18,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Apply Filters
            </button>
            <p
              style={{
                textAlign: 'center',
                fontSize: 12,
                color: '#94a3b8',
                margin: 0,
                marginTop: SPACING.md,
              }}
            >
              Showing {visibleComments.length} results based on your selection
            </p>
          </div>
        </div>
      </div>

      {isAdmin && isDbSession && showEditSession && (
        <div
          role="presentation"
          onClick={() => {
            if (!editSessionSaving && !editSessionDeleting) {
              setShowEditSession(false);
            }
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1150,
            backgroundColor: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: SPACING.lg,
          }}
        >
          <div
            role="dialog"
            aria-label="Edit session details"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(560px, 100%)',
              maxHeight: 'min(80vh, 720px)',
              overflow: 'auto',
              backgroundColor: COLORS.white,
              borderRadius: RADIUS.xl,
              boxShadow: '0 16px 48px rgba(0,0,0,0.25)',
              padding: SPACING.xl,
              display: 'flex',
              flexDirection: 'column',
              gap: SPACING.lg,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: SPACING.md,
              }}
            >
              <h3 style={{ ...TYPOGRAPHY.h3, color: COLORS.textPrimary, margin: 0 }}>
                Edit session
              </h3>
              <button
                type="button"
                onClick={() => {
                  if (!editSessionSaving && !editSessionDeleting) {
                    setShowEditSession(false);
                  }
                }}
                aria-label="Close edit session"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: COLORS.backgroundLight,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: editSessionSaving || editSessionDeleting ? 'not-allowed' : 'pointer',
                  color: COLORS.textSecondary,
                }}
                disabled={editSessionSaving || editSessionDeleting}
              >
                <IconX size={18} />
              </button>
            </div>

            {editSessionError && (
              <div
                style={{
                  padding: SPACING.sm,
                  borderRadius: RADIUS.md,
                  backgroundColor: 'rgba(248,113,113,0.12)',
                  color: '#b91c1c',
                  ...TYPOGRAPHY.bodySmall,
                }}
              >
                {editSessionError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.md }}>
              <div>
                <label
                  htmlFor="edit-session-date"
                  style={{
                    display: 'block',
                    ...TYPOGRAPHY.label,
                    color: COLORS.textSecondary,
                    marginBottom: SPACING.xs,
                  }}
                >
                  Date
                </label>
                <input
                  id="edit-session-date"
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: SPACING.sm,
                    borderRadius: RADIUS.md,
                    border: `1px solid ${COLORS.backgroundLight}`,
                    ...TYPOGRAPHY.body,
                    color: COLORS.textPrimary,
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="edit-session-title"
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
                  id="edit-session-title"
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Optional session title"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: SPACING.sm,
                    borderRadius: RADIUS.md,
                    border: `1px solid ${COLORS.backgroundLight}`,
                    ...TYPOGRAPHY.body,
                    color: COLORS.textPrimary,
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="edit-session-coach"
                  style={{
                    display: 'block',
                    ...TYPOGRAPHY.label,
                    color: COLORS.textSecondary,
                    marginBottom: SPACING.xs,
                  }}
                >
                  Coach
                </label>
                <select
                  id="edit-session-coach"
                  value={editCoachId}
                  onChange={(e) => setEditCoachId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: SPACING.sm,
                    borderRadius: RADIUS.md,
                    border: `1px solid ${COLORS.backgroundLight}`,
                    ...TYPOGRAPHY.body,
                    color: COLORS.textPrimary,
                    backgroundColor: COLORS.white,
                  }}
                >
                  <option value="">No coach assigned</option>
                  {MOCK_COACHES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span
                  style={{
                    display: 'block',
                    ...TYPOGRAPHY.label,
                    color: COLORS.textSecondary,
                    marginBottom: SPACING.xs,
                  }}
                >
                  Session type
                </span>
                <div style={{ display: 'flex', gap: SPACING.sm }}>
                  <label
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: SPACING.xs,
                      padding: SPACING.sm,
                      borderRadius: RADIUS.md,
                      border: `2px solid ${
                        editSessionType === 'game' ? COLORS.primary : COLORS.backgroundLight
                      }`,
                      backgroundColor:
                        editSessionType === 'game' ? COLORS.primaryLight : COLORS.white,
                      cursor: 'pointer',
                      ...TYPOGRAPHY.bodySmall,
                      color: COLORS.textPrimary,
                    }}
                  >
                    <input
                      type="radio"
                      name="edit-session-type"
                      value="game"
                      checked={editSessionType === 'game'}
                      onChange={() => setEditSessionType('game')}
                      style={{ width: 18, height: 18, accentColor: COLORS.primary }}
                    />
                    Game
                  </label>
                  <label
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: SPACING.xs,
                      padding: SPACING.sm,
                      borderRadius: RADIUS.md,
                      border: `2px solid ${
                        editSessionType === 'drill' ? COLORS.primary : COLORS.backgroundLight
                      }`,
                      backgroundColor:
                        editSessionType === 'drill' ? COLORS.primaryLight : COLORS.white,
                      cursor: 'pointer',
                      ...TYPOGRAPHY.bodySmall,
                      color: COLORS.textPrimary,
                    }}
                  >
                    <input
                      type="radio"
                      name="edit-session-type"
                      value="drill"
                      checked={editSessionType === 'drill'}
                      onChange={() => setEditSessionType('drill')}
                      style={{ width: 18, height: 18, accentColor: COLORS.primary }}
                    />
                    Drill
                  </label>
                </div>
              </div>

              <div>
                <span
                  style={{
                    display: 'block',
                    ...TYPOGRAPHY.label,
                    color: COLORS.textSecondary,
                    marginBottom: SPACING.xs,
                  }}
                >
                  Students
                </span>
                <div
                  style={{
                    maxHeight: 180,
                    overflow: 'auto',
                    borderRadius: RADIUS.md,
                    border: `1px solid ${COLORS.backgroundLight}`,
                    padding: SPACING.xs,
                  }}
                >
                  {availableStudents.length === 0 && (
                    <div
                      style={{
                        padding: SPACING.sm,
                        ...TYPOGRAPHY.bodySmall,
                        color: COLORS.textSecondary,
                      }}
                    >
                      No students found for this session.
                    </div>
                  )}
                  {availableStudents.map((s) => (
                    <label
                      key={s.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: SPACING.sm,
                        padding: SPACING.sm,
                        borderRadius: RADIUS.sm,
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={editStudentIds.includes(s.id)}
                        onChange={() => toggleEditStudent(s.id)}
                        style={{ width: 18, height: 18, accentColor: COLORS.primary }}
                      />
                      <span style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textPrimary }}>
                        {s.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: SPACING.md,
                marginTop: SPACING.md,
              }}
            >
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={editSessionSaving || editSessionDeleting}
                style={{
                  padding: `${SPACING.sm}px ${SPACING.lg}px`,
                  borderRadius: 999,
                  border: '1px solid rgba(248,113,113,0.5)',
                  backgroundColor: 'rgba(248,113,113,0.08)',
                  color: '#b91c1c',
                  ...TYPOGRAPHY.bodySmall,
                  fontWeight: 600,
                  cursor: editSessionSaving || editSessionDeleting ? 'not-allowed' : 'pointer',
                }}
              >
                Delete session
              </button>
              <div style={{ display: 'flex', gap: SPACING.sm }}>
                <button
                  type="button"
                  onClick={() => setShowEditSession(false)}
                  disabled={editSessionSaving || editSessionDeleting}
                  style={{
                    padding: `${SPACING.sm}px ${SPACING.lg}px`,
                    borderRadius: 999,
                    border: `1px solid ${COLORS.backgroundLight}`,
                    backgroundColor: COLORS.white,
                    color: COLORS.textSecondary,
                    ...TYPOGRAPHY.bodySmall,
                    fontWeight: 600,
                    cursor: editSessionSaving || editSessionDeleting ? 'not-allowed' : 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveSessionDetails}
                  disabled={editSessionSaving || editSessionDeleting}
                  style={{
                    padding: `${SPACING.sm}px ${SPACING.lg}px`,
                    borderRadius: 999,
                    border: 'none',
                    backgroundColor: COLORS.primary,
                    color: COLORS.textPrimary,
                    ...TYPOGRAPHY.bodySmall,
                    fontWeight: 700,
                    cursor: editSessionSaving || editSessionDeleting ? 'not-allowed' : 'pointer',
                    opacity: editSessionSaving || editSessionDeleting ? 0.7 : 1,
                    boxShadow: '0 4px 12px rgba(49,203,0,0.4)',
                  }}
                >
                  {editSessionSaving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isAdmin && isDbSession && showDeleteConfirm && (
        <div
          role="presentation"
          onClick={() => setShowDeleteConfirm(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1250,
            backgroundColor: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: SPACING.lg,
          }}
        >
          <div
            role="dialog"
            aria-label="Confirm delete session"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: COLORS.white,
              borderRadius: RADIUS.xl,
              boxShadow: '0 16px 48px rgba(0,0,0,0.25)',
              padding: SPACING.xl,
              width: 'min(420px, 100%)',
              display: 'flex',
              flexDirection: 'column',
              gap: SPACING.md,
            }}
          >
            <h3 style={{ ...TYPOGRAPHY.h3, color: COLORS.textPrimary, margin: 0 }}>
              Delete session?
            </h3>
            <p style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, margin: 0 }}>
              This will permanently remove the session and its links to students. Comments on the
              video will remain.
            </p>
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: SPACING.sm,
                marginTop: SPACING.sm,
              }}
            >
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={editSessionDeleting}
                style={{
                  padding: `${SPACING.sm}px ${SPACING.lg}px`,
                  borderRadius: 999,
                  border: `1px solid ${COLORS.backgroundLight}`,
                  backgroundColor: COLORS.white,
                  color: COLORS.textSecondary,
                  ...TYPOGRAPHY.bodySmall,
                  fontWeight: 600,
                  cursor: editSessionDeleting ? 'not-allowed' : 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSession}
                disabled={editSessionDeleting}
                style={{
                  padding: `${SPACING.sm}px ${SPACING.lg}px`,
                  borderRadius: 999,
                  border: 'none',
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  ...TYPOGRAPHY.bodySmall,
                  fontWeight: 700,
                  cursor: editSessionDeleting ? 'not-allowed' : 'pointer',
                  opacity: editSessionDeleting ? 0.8 : 1,
                  boxShadow: '0 4px 12px rgba(239,68,68,0.4)',
                }}
              >
                {editSessionDeleting ? 'Deleting…' : 'Delete session'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isExampleModalOpen && (
        <div
          role="presentation"
          onClick={() => setIsExampleModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1200,
            backgroundColor: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: SPACING.lg,
          }}
        >
          <div
            role="dialog"
            aria-label="Shot examples"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(960px, 100%)',
              maxHeight: 'min(80vh, 760px)',
              overflow: 'auto',
              backgroundColor: COLORS.white,
              borderRadius: RADIUS.xl,
              boxShadow: '0 16px 48px rgba(0,0,0,0.22)',
              padding: SPACING.xxl,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: SPACING.md }}>
              <div>
                <h3 style={{ ...TYPOGRAPHY.h3, color: COLORS.textPrimary, margin: 0 }}>Shot examples</h3>
                <div style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, marginTop: 6 }}>
                  {shotExampleGifs.length} example{shotExampleGifs.length === 1 ? '' : 's'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: SPACING.sm, alignItems: 'center' }}>
                <button
                  type="button"
                  disabled={selectedExampleKey == null}
                  onClick={handleAddExample}
                  style={{
                    border: 'none',
                    backgroundColor: selectedExampleKey == null ? COLORS.backgroundLight : COLORS.primary,
                    color: selectedExampleKey == null ? COLORS.textSecondary : COLORS.textPrimary,
                    borderRadius: 999,
                    padding: `${SPACING.xs}px ${SPACING.md}px`,
                    cursor: selectedExampleKey == null ? 'not-allowed' : 'pointer',
                    opacity: selectedExampleKey == null ? 0.7 : 1,
                    ...TYPOGRAPHY.label,
                    fontWeight: 700,
                    letterSpacing: 0.2,
                  }}
                >
                  Add Example
                </button>
                <button
                  type="button"
                  onClick={() => setIsExampleModalOpen(false)}
                  style={{
                    border: `1px solid ${COLORS.backgroundLight}`,
                    backgroundColor: COLORS.white,
                    color: COLORS.textSecondary,
                    borderRadius: 999,
                    padding: `${SPACING.xs}px ${SPACING.md}px`,
                    cursor: 'pointer',
                    ...TYPOGRAPHY.label,
                    fontWeight: 600,
                  }}
                >
                  Close
                </button>
              </div>
            </div>

            <div
              style={{
                marginTop: SPACING.xl,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: SPACING.lg,
              }}
            >
              {shotExampleGifs.map((g) => (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => {
                    // Toggle behavior: clicking the selected gif deselects it and removes it
                    // from the underlying comment.
                    if (selectedExampleKey === g.key) {
                      setSelectedExampleKey(null);
                      void clearExampleGifForCurrentContext();
                      return;
                    }
                    setSelectedExampleKey(g.key);
                  }}
                  style={{
                    borderRadius: RADIUS.lg,
                    border:
                      selectedExampleKey === g.key
                        ? `2px solid ${COLORS.primary}`
                        : `1px solid ${COLORS.backgroundLight}`,
                    backgroundColor: selectedExampleKey === g.key ? 'rgba(49, 203, 0, 0.08)' : COLORS.white,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    padding: 0,
                    textAlign: 'left',
                  }}
                >
                  <div style={{ padding: SPACING.md }}>
                    <div style={{ ...TYPOGRAPHY.labelMed, color: COLORS.textPrimary, fontWeight: 700 }}>
                      {g.title}
                    </div>
                  </div>
                  <div style={{ padding: `0 ${SPACING.md}px ${SPACING.md}px` }}>
                    <img
                      src={g.src}
                      alt={g.title}
                      style={{
                        width: '100%',
                        height: 'auto',
                        maxHeight: 320,
                        objectFit: 'contain',
                        borderRadius: RADIUS.md,
                        border: `1px solid ${COLORS.backgroundLight}`,
                        backgroundColor: COLORS.backgroundLight,
                        display: 'block',
                      }}
                    />
                  </div>
                </button>
              ))}
              {shotExampleGifs.length === 0 && (
                <div style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary }}>
                  No GIFs found in <code style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>src/assets/shot-examples</code>.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {viewExampleModal && (
        <div
          role="presentation"
          onClick={() => setViewExampleModal(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1300,
            backgroundColor: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: SPACING.lg,
          }}
        >
          <div
            role="dialog"
            aria-label={viewExampleModal.title}
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: COLORS.white,
              borderRadius: RADIUS.xl,
              boxShadow: '0 16px 48px rgba(0,0,0,0.25)',
              padding: SPACING.xl,
              width: 'min(560px, 100%)',
              display: 'flex',
              flexDirection: 'column',
              gap: SPACING.md,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.md }}>
              <div style={{ ...TYPOGRAPHY.h3, color: COLORS.textPrimary, margin: 0 }}>
                {viewExampleModal.title}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm }}>
                {isAdmin && viewExampleModal.commentId != null && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExampleModalContext(viewExampleModal.commentId!);
                      setViewExampleModal(null);
                      setIsExampleModalOpen(true);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      border: `1px solid ${REFERENCE_PRIMARY}40`,
                      backgroundColor: `${REFERENCE_PRIMARY}1A`,
                      color: REFERENCE_PRIMARY,
                      borderRadius: 999,
                      padding: `${SPACING.xs}px ${SPACING.md}px`,
                      cursor: 'pointer',
                      ...TYPOGRAPHY.label,
                      fontWeight: 600,
                    }}
                  >
                    <IconPencil size={14} />
                    Edit GIF
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setViewExampleModal(null)}
                  style={{
                    border: `1px solid ${COLORS.backgroundLight}`,
                    backgroundColor: COLORS.white,
                    color: COLORS.textSecondary,
                    borderRadius: 999,
                    padding: `${SPACING.xs}px ${SPACING.md}px`,
                    cursor: 'pointer',
                    ...TYPOGRAPHY.label,
                    fontWeight: 600,
                  }}
                >
                  Close
                </button>
              </div>
            </div>
            <img
              src={viewExampleModal.src}
              alt={viewExampleModal.title}
              style={{
                width: '100%',
                height: 'auto',
                borderRadius: RADIUS.lg,
                border: `1px solid ${COLORS.backgroundLight}`,
                backgroundColor: COLORS.backgroundLight,
                display: 'block',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

