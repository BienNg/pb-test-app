import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, RADIUS } from '../styles/theme';
import {
  IconArrowLeft,
  IconCheck,
  IconClock,
  IconMoreVertical,
  IconPencil,
  IconPlay,
  IconUser,
  IconX,
  IconLink,
} from './Icons';
import type { SessionComment, TrainingSession } from './GameAnalyticsPage';
import { ROADMAP_SKILLS, TECHNIQUE_ICONS, ROOF_TECHNIQUE_LABEL } from '../data/roadmapSkills';
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
  ERROR_LABEL_OPTIONS,
  ERROR_PILL_STYLE,
} from './TrainingSessionDetail/constants';
import {
  getCaretTopOffset,
  getReplyById,
  toFramePrecision,
  formatTimestamp,
  FRAME_SEEK_EPSILON_SECONDS,
} from './TrainingSessionDetail/utils';
import { Breadcrumb } from './Breadcrumb';
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

import type { SessionCommentReply } from './GameAnalyticsPage';
import {
  fetchSessionComments,
  fetchSessionCommentReplies,
  insertSessionComment,
  insertSessionCommentReply,
  updateSessionComment,
  updateSessionCommentLoopEnd,
  updateCommentExampleGif,
  deleteSessionComment,
  mapDbCommentToSessionComment,
  mapDbReplyToSessionCommentReply,
  fetchSessionTaggableProfiles,
  updateSessionCommentReply,
  deleteSessionCommentReply,
  type ReplyFrameMarker,
  type SessionCommentWithAuthor,
} from '@/lib/sessionComments';
import {
  fetchShotVideoComments,
  fetchShotVideoCommentReplies,
  insertShotVideoComment,
  insertShotVideoCommentReply,
  mapShotVideoCommentToSessionComment,
  updateShotVideoComment,
  updateShotVideoCommentLoopEnd,
  updateShotVideoCommentReply,
  deleteShotVideoComment,
  deleteShotVideoCommentReply,
  type ShotVideoCommentWithAuthor,
} from '@/lib/shotVideoComments';
import { useAuth } from './providers/AuthProvider';
import {
  VideoPlayer,
  type VideoPlayerHandle,
  type VideoPlayerLoopCommentOverlay,
  type VideoPlayerMarker,
} from './VideoPlayer';
import { MOCK_COACHES } from '../data/mockCoaches';
import {
  fetchShotTechniqueChecks,
  upsertShotTechniqueCheck,
  buildTechniqueKey,
} from '@/lib/shotTechniqueChecks';
import {
  fetchShotTechniqueSubVisibility,
  upsertShotTechniqueSubVisibility,
} from '@/lib/shotTechniqueSubVisibility';
import {
  fetchShotTechniqueChecklistLayouts,
  orderShotTechniqueChecklistByCheckedState,
  techniqueSubKey,
  upsertShotTechniqueChecklistLayout,
  type ChecklistLayoutStateMap,
} from '@/lib/shotTechniqueChecklistLayout';
import { updateShotVideo, deleteShotVideo } from '@/lib/shotVideos';

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
  /** DB-backed session (sessions table); shot videos use shot_video_comments instead. */
  const isDbSession = sessionsProp != null && session != null && !isShotVideo;
  /** Show comment composer only in admin view. */
  const showCommentComposer = isAdminView;
  const showShareLinkButton = isDbSession || isShotVideo;

  const [linkJustCopied, setLinkJustCopied] = useState(false);
  const linkCopyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopySessionLink = useCallback(() => {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}/session/${encodeURIComponent(sessionId)}`;
    void navigator.clipboard.writeText(url).then(() => {
      setLinkJustCopied(true);
      if (linkCopyTimeoutRef.current) clearTimeout(linkCopyTimeoutRef.current);
      linkCopyTimeoutRef.current = setTimeout(() => setLinkJustCopied(false), 2000);
    });
  }, [sessionId]);

  useEffect(() => {
    return () => {
      if (linkCopyTimeoutRef.current) clearTimeout(linkCopyTimeoutRef.current);
    };
  }, []);

  const [showAddUrlForm, setShowAddUrlForm] = useState(false);
  const [, setAddUrlDraft] = useState('');
  const [, setAddUrlError] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const commentInputRef = useRef<HTMLDivElement>(null);
  const pendingCursorRef = useRef<number | null>(null);
  const videoPlayerRef = useRef<VideoPlayerHandle>(null);
  const videoPlayerWrapperRef = useRef<HTMLDivElement>(null);
  const activeFrameReplyIdSetAtRef = useRef<number>(0);
  /** Always reflects the latest currentVideoTime without being a reactive dep in the seek effect. */
  const currentVideoTimeRef = useRef<number>(0);
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
  const SHOW_EXAMPLE_BUTTON = false;
  /** Which comment triggered the example modal ('new' = composer, else comment id) */
  const [exampleModalContext, setExampleModalContext] = useState<string | number | 'new' | null>(null);
  /** GIF attached to the pending new comment (before it is posted) */
  const [pendingNewCommentGif, setPendingNewCommentGif] = useState<string | null>(null);
  /** When set, shows the lightweight "view example" modal. commentId is set when opened from a comment so admin can edit. */
  const [viewExampleModal, setViewExampleModal] = useState<{ src: string; title: string; commentId?: number | string } | null>(null);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [commentsRetryTrigger, setCommentsRetryTrigger] = useState(0);
  const [postingComment, setPostingComment] = useState(false);
  const [taggableProfiles, setTaggableProfiles] = useState<{ id: string; name: string }[]>([]);
  const [selectedMentionIds, setSelectedMentionIds] = useState<string[]>([]);
  const [pendingSeekSeconds, setPendingSeekSeconds] = useState<number | null>(null);
  /** "/" command menu for shots: when set, show dropdown; query filters SHOT_LIST; highlightIndex for keyboard nav. */
  const [shotMenu, setShotMenu] = useState<{ query: string; slashStart: number; highlightIndex: number } | null>(null);
  /** "@" command menu for mentions: when set, show dropdown of taggableProfiles. */
  const [mentionMenu, setMentionMenu] = useState<{ query: string; atStart: number; highlightIndex: number } | null>(null);
  /** "#" command menu for error labels (Forced/Unforced Error). */
  const [errorMenu, setErrorMenu] = useState<{ query: string; hashStart: number; highlightIndex: number } | null>(null);
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
  const [editCommentTextBoxDraft, setEditCommentTextBoxDraft] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const handleEditableLoopCommentTextBoxChange = useCallback((layout: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => {
    setEditCommentTextBoxDraft((prev) => {
      if (
        prev != null &&
        prev.x === layout.x &&
        prev.y === layout.y &&
        prev.width === layout.width &&
        prev.height === layout.height
      ) {
        return prev;
      }
      return layout;
    });
  }, []);
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
  /** When set, show Add Loop UI below video controls (start = comment timestamp, end = current video time). */
  const [addLoopState, setAddLoopState] = useState<{
    commentId: string | number;
    startTimestamp: number;
    mode: 'add' | 'edit';
  } | null>(null);
  /** When shot has sub-categories (e.g. Forehand Dink: Normal, Topspin, Slice), which sub is selected. */
  const [selectedTechniqueSubId, setSelectedTechniqueSubId] = useState<string | null>(null);
  /** In admin view, which technique points are checked (keyed by item label, or "subId:label" when using sub-categories). */
  const [techniqueChecked, setTechniqueChecked] = useState<Record<string, boolean>>({});
  /** Track whether we've loaded technique checks from DB for the current shot video. */
  const [techniqueChecksLoaded, setTechniqueChecksLoaded] = useState(false);
  /** Per shot video: which sub-category IDs are visible to the student (from DB). Empty = use default (first only). */
  const [techniqueVisibleSubIds, setTechniqueVisibleSubIds] = useState<string[]>([]);
  const [techniqueVisibilityLoaded, setTechniqueVisibilityLoaded] = useState(false);
  /** Per sub key: saved checklist order + highlighted label (coach focus). */
  const [checklistLayoutBySub, setChecklistLayoutBySub] = useState<ChecklistLayoutStateMap>({});
  const [checklistLayoutLoaded, setChecklistLayoutLoaded] = useState(false);
  const [techniqueChecklistDraggingLabel, setTechniqueChecklistDraggingLabel] = useState<string | null>(null);

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

  // Shot video edit state (when isAdminView && isShotVideo)
  const [editShotVideoUrl, setEditShotVideoUrl] = useState<string>(session?.videoUrl ?? '');
  const [editShotVideoTitle, setEditShotVideoTitle] = useState<string>(session?.title ?? '');

  // Any overlay/modal state; used to pause video playback when true
  const anyModalOpen =
    isExampleModalOpen ||
    viewExampleModal != null ||
    showEditSession ||
    showDeleteConfirm ||
    isFilterSheetOpen;

  const activeReplyForMarkerId = editingReplyId ?? activeFrameReplyId;
  const { frameDetailMarkerInitial, frameDetailTextBoxInitial, frameDetailMarkerReadOnly } = useMemo(() => {
    const readOnly = activeFrameReplyId != null;
    if (activeReplyForMarkerId == null) {
      return {
        frameDetailMarkerInitial: null as { x: number; y: number; radiusX: number; radiusY: number } | null,
        frameDetailTextBoxInitial: null as { x: number; y: number; width: number; height: number } | null,
        frameDetailMarkerReadOnly: readOnly,
      };
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
        frameDetailTextBoxInitial:
          typeof reply.markerTextBoxXPercent === 'number' &&
          typeof reply.markerTextBoxYPercent === 'number' &&
          typeof reply.markerTextBoxWidthPercent === 'number' &&
          typeof reply.markerTextBoxHeightPercent === 'number'
            ? {
                x: reply.markerTextBoxXPercent,
                y: reply.markerTextBoxYPercent,
                width: reply.markerTextBoxWidthPercent,
                height: reply.markerTextBoxHeightPercent,
              }
            : null,
        frameDetailMarkerReadOnly: readOnly,
      };
    }
    return { frameDetailMarkerInitial: null, frameDetailTextBoxInitial: null, frameDetailMarkerReadOnly: readOnly };
  }, [activeReplyForMarkerId, activeFrameReplyId, repliesByCommentId]);

  const frameDetailOverlayText = useMemo(() => {
    if (editingReplyId != null) return editReplyDraft;
    if (replyingToCommentId != null) return replyDraft;
    if (activeFrameReplyId != null) {
      return getReplyById(repliesByCommentId, activeFrameReplyId)?.text ?? '';
    }
    return '';
  }, [editingReplyId, editReplyDraft, replyingToCommentId, replyDraft, activeFrameReplyId, repliesByCommentId]);

  // Keep ref in sync with state every render so the seek effect can read the current time
  // without needing it as a reactive dependency (which would cause re-seeks on every time update).
  currentVideoTimeRef.current = currentVideoTime;

  useEffect(() => {
    if (activeFrameReplyId == null) return;
    activeFrameReplyIdSetAtRef.current = Date.now();
    const reply = getReplyById(repliesByCommentId, activeFrameReplyId);
    if (reply?.timestampSeconds != null) {
      // Read via ref so this effect only fires when activeFrameReplyId changes,
      // not on every video time update (which was causing snap-back after skipping).
      const alreadyAtFrame =
        Math.abs(currentVideoTimeRef.current - reply.timestampSeconds) <= FRAME_SEEK_EPSILON_SECONDS;
      if (!alreadyAtFrame) {
        setPendingSeekSeconds(reply.timestampSeconds);
        setFrameReplyPauseRequested(true);
        videoPlayerRef.current?.pause();
      }
    }
  }, [activeFrameReplyId, repliesByCommentId, currentVideoTimeRef]);

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

  // When shot changes (shot video), sync selected technique sub-tab.
  // Always focus the first active tab by default: first in display order (subs) that is visible/active.
  useEffect(() => {
    if (!isShotVideo || !session) return;
    const shotSkill = ROADMAP_SKILLS.find((s) => s.title === session.title);
    const subs = shotSkill?.subCategories;
    if (subs?.length) {
      const visibleIds =
        techniqueVisibilityLoaded && techniqueVisibleSubIds.length > 0
          ? techniqueVisibleSubIds.filter((id) => subs.some((s) => s.id === id))
          : [subs[0].id];
      // First active = first tab in UI order (subs) that is in the visible set
      const firstActive =
        subs.find((s) => visibleIds.includes(s.id))?.id ?? visibleIds[0] ?? subs[0].id;
      setSelectedTechniqueSubId((prev) => {
        // Only keep prev if it's visible to student (in visibleIds); otherwise default to first active tab
        if (isAdminView) return prev && visibleIds.includes(prev) ? prev : firstActive;
        return prev && visibleIds.includes(prev) ? prev : firstActive;
      });
    } else {
      setSelectedTechniqueSubId(null);
    }
  }, [isShotVideo, session, isAdminView, techniqueVisibilityLoaded, techniqueVisibleSubIds]);

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

  // Load which sub-categories are visible to student (for shot technique tab)
  useEffect(() => {
    if (!isShotVideo || !sessionId) {
      setTechniqueVisibleSubIds([]);
      setTechniqueVisibilityLoaded(false);
      return;
    }
    let cancelled = false;
    setTechniqueVisibilityLoaded(false);
    (async () => {
      const ids = await fetchShotTechniqueSubVisibility(supabase, sessionId);
      if (!cancelled) {
        setTechniqueVisibleSubIds(ids);
        setTechniqueVisibilityLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isShotVideo, sessionId, supabase]);

  // Load checklist order + highlight for shot technique tab
  useEffect(() => {
    if (!isShotVideo || !sessionId) {
      setChecklistLayoutBySub({});
      setChecklistLayoutLoaded(false);
      return;
    }
    let cancelled = false;
    setChecklistLayoutLoaded(false);
    (async () => {
      const map = await fetchShotTechniqueChecklistLayouts(supabase, sessionId);
      if (!cancelled) {
        setChecklistLayoutBySub(map);
        setChecklistLayoutLoaded(true);
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

  // Load comments and taggable profiles when viewing a DB session or shot video
  const COMMENTS_FETCH_TIMEOUT_MS = 15000;
  useEffect(() => {
    if (!sessionId) return;
    setCommentsLoading(true);
    setCommentsError(null);
    const commentsPromise = isDbSession
      ? fetchSessionComments(supabase, sessionId)
      : isShotVideo
        ? fetchShotVideoComments(supabase, sessionId)
        : Promise.resolve([]);
    const repliesPromise =
      isDbSession
        ? fetchSessionCommentReplies(supabase, sessionId)
        : isShotVideo
          ? fetchShotVideoCommentReplies(supabase, sessionId, user?.id ?? null)
          : Promise.resolve([]);
    const taggablePromise = fetchSessionTaggableProfiles(supabase, sessionId);
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('Taking longer than usual. Check your connection.')), COMMENTS_FETCH_TIMEOUT_MS);
    });
    let cancelled = false;
    Promise.race([
      Promise.all([commentsPromise, repliesPromise, taggablePromise]),
      timeoutPromise,
    ])
      .then(([commentRows, replyRowsData, taggable]) => {
        if (cancelled) return;
        if (Array.isArray(commentRows) && commentRows.length > 0) {
          const mapped = isShotVideo
            ? (commentRows as ShotVideoCommentWithAuthor[]).map((r) =>
                mapShotVideoCommentToSessionComment(r, user?.id ?? null)
              )
            : (commentRows as SessionCommentWithAuthor[]).map((r) =>
                mapDbCommentToSessionComment(r, user?.id ?? null)
              );
          setComments(mapped);
        } else {
          setComments([]);
        }
        if (Array.isArray(replyRowsData) && replyRowsData.length > 0) {
          const mappedReplies = isDbSession
            ? (replyRowsData as Parameters<typeof mapDbReplyToSessionCommentReply>[0][]).map((r) =>
                mapDbReplyToSessionCommentReply(r, user?.id ?? null)
              )
            : (replyRowsData as SessionCommentReply[]);
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
      .catch((err) => {
        if (!cancelled) {
          setCommentsError(err instanceof Error ? err.message : 'Couldn\'t load comments.');
        }
      })
      .finally(() => {
        if (!cancelled) setCommentsLoading(false);
        if (timeoutId != null) clearTimeout(timeoutId);
      });
    return () => {
      cancelled = true;
      if (timeoutId != null) clearTimeout(timeoutId);
    };
  }, [supabase, isDbSession, isShotVideo, sessionId, user?.id, commentsRetryTrigger]);

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
    const exitFrameDetailView = () => {
      setActiveFrameReplyId(null);
      setPendingSeekSeconds(null);
      setFrameReplyPauseRequested(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTypingInInput(e)) return;
      const key = e.key;
      const player = videoPlayerRef.current;
      if (!player) return;
      if (key === ' ') {
        e.preventDefault();
        exitFrameDetailView();
        player.playPause();
        return;
      }
      if (key === 'q' || key === 'Q') {
        e.preventDefault();
        exitFrameDetailView();
        player.skipBy(-1);
        return;
      }
      if (key === 'w' || key === 'W') {
        e.preventDefault();
        exitFrameDetailView();
        player.skipBy(1);
        return;
      }
      if (key === 'a' || key === 'A') {
        e.preventDefault();
        exitFrameDetailView();
        player.skipBy(-5);
        return;
      }
      if (key === 's' || key === 'S') {
        e.preventDefault();
        exitFrameDetailView();
        player.skipBy(5);
        return;
      }
      if (key === 'y' || key === 'Y') {
        e.preventDefault();
        exitFrameDetailView();
        player.skipBy(-10);
        return;
      }
      if (key === 'x' || key === 'X') {
        e.preventDefault();
        exitFrameDetailView();
        player.skipBy(10);
        return;
      }
      if (key === 'ArrowLeft') {
        e.preventDefault();
        exitFrameDetailView();
        player.skipBy(-1 / 30);
        return;
      }
      if (key === 'ArrowRight') {
        e.preventDefault();
        exitFrameDetailView();
        player.skipBy(1 / 30);
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [session]);

  // When opening edit modal for shot video, sync form from current session
  useEffect(() => {
    if (showEditSession && isShotVideo && session) {
      setEditShotVideoUrl(session.videoUrl ?? '');
      setEditShotVideoTitle(session.title ?? '');
    }
  }, [showEditSession, isShotVideo, session]);

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
        setAvailableStudents(
          rows.map((r) => ({
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

  const handleSaveShotVideoDetails = useCallback(async () => {
    if (!isShotVideo || !supabase) return;
    const url = editShotVideoUrl?.trim();
    if (!url) {
      setEditSessionError('Video URL is required');
      return;
    }
    setEditSessionSaving(true);
    setEditSessionError(null);
    try {
      const result = await updateShotVideo(supabase, sessionId, {
        videoUrl: url,
        shotTitle: editShotVideoTitle?.trim() || session?.title || '',
      });
      if (result.error) throw new Error(result.error);
      await onSessionUpdated?.();
      setShowEditSession(false);
    } catch (err) {
      setEditSessionError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setEditSessionSaving(false);
    }
  }, [supabase, isShotVideo, sessionId, editShotVideoUrl, editShotVideoTitle, session?.title, onSessionUpdated]);

  const handleDeleteSession = useCallback(async () => {
    if (!supabase) {
      setEditSessionError('Supabase not configured');
      return;
    }
    setEditSessionDeleting(true);
    setEditSessionError(null);
    try {
      if (isShotVideo) {
        const result = await deleteShotVideo(supabase, sessionId);
        if (result.error) throw new Error(result.error);
        setShowEditSession(false);
        setShowDeleteConfirm(false);
        await onSessionUpdated?.();
        onBack();
      } else if (isDbSession) {
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
      } else {
        setEditSessionError('This session cannot be deleted.');
      }
    } catch (err) {
      console.error('[TrainingSessionDetail] Delete failed:', err);
      setEditSessionError(err instanceof Error ? err.message : 'Failed to delete session');
      setShowDeleteConfirm(false);
    } finally {
      setEditSessionDeleting(false);
    }
  }, [supabase, isDbSession, isShotVideo, sessionId, onDeleteSession, onSessionUpdated, onBack]);

  const sortedCommentTimestamps = useMemo(
    () =>
      [...new Set(comments.filter((c) => c.timestampSeconds != null).map((c) => c.timestampSeconds!))].sort(
        (a, b) => a - b
      ),
    [comments]
  );

  const toOverlayCommentText = useCallback((text: string): string => {
    return parseCommentTextWithShots(text)
      .map((seg) => {
        if (seg.type === 'text') return seg.value;
        if (seg.type === 'shot') return seg.name;
        if (seg.type === 'error') return seg.label;
        return `@${seg.name}`;
      })
      .join('');
  }, []);

  const loopCommentOverlays = useMemo<VideoPlayerLoopCommentOverlay[]>(
    () =>
      comments
        .filter((c) => c.timestampSeconds != null && c.text.trim().length > 0)
        .map((c) => {
          const start = c.timestampSeconds ?? 0;
          const loopEnd = c.loopEndTimestampSeconds;
          const nextTimestamp = sortedCommentTimestamps.find((ts) => ts > start) ?? null;
          const fallbackEnd = nextTimestamp != null ? Math.min(start + 5, nextTimestamp) : start + 5;
          const end =
            loopEnd != null && loopEnd > start
              ? loopEnd
              : fallbackEnd;
          return {
            id: c.id,
            start,
            end,
            text: toOverlayCommentText(c.text),
            textBoxXPercent: c.textBoxXPercent,
            textBoxYPercent: c.textBoxYPercent,
            textBoxWidthPercent: c.textBoxWidthPercent,
            textBoxHeightPercent: c.textBoxHeightPercent,
          };
        })
        .filter((overlay) => overlay.end > overlay.start),
    [comments, sortedCommentTimestamps, toOverlayCommentText]
  );

  /** Mentioned profile ids in a comment from inline markers (fallback to taggedUsers for older data). */
  const getMentionedStudentIds = useCallback((comment: SessionComment): Set<string> => {
    const ids = new Set<string>();
    parseCommentTextWithShots(comment.text).forEach((seg) => {
      if (seg.type === 'mention') ids.add(seg.id);
    });
    (comment.taggedUsers ?? []).forEach((u) => ids.add(u.id));
    return ids;
  }, []);

  /** When students are selected, only consider comments that mention at least one of them. */
  const commentsForShotCount = useMemo(() => {
    if (studentFilter.length === 0) return comments;
    return comments.filter((c) => {
      const commentStudentIds = getMentionedStudentIds(c);
      return studentFilter.some((id) => commentStudentIds.has(id));
    });
  }, [comments, getMentionedStudentIds, studentFilter]);

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
          parseCommentTextWithShots(c.text).forEach((seg) => {
            if (seg.type === 'mention' && !map.has(seg.id)) map.set(seg.id, seg.name);
          });
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
      const commentStudentIds = getMentionedStudentIds(comment);

      if (shotFilter.length > 0 && !shotFilter.some((shot) => commentShots.has(shot))) {
        return false;
      }
      if (studentFilter.length > 0 && !studentFilter.some((id) => commentStudentIds.has(id))) {
        return false;
      }
      return true;
    });
  }, [getMentionedStudentIds, sortedComments, shotFilter, studentFilter]);

  // When video time reaches a comment's timestamp, set that comment as active (for scroll + highlight)
  useEffect(() => {
    const activeTimestamp =
      sortedCommentTimestamps.filter((t) => t <= currentVideoTime + 0.5).pop() ?? null;
    const activeComment =
      activeTimestamp != null
        ? sortedComments.find((c) => c.timestampSeconds === activeTimestamp)
        : null;
    const nextId = activeComment?.id ?? null;
    setActiveCommentId((prev) => (prev === nextId ? prev : nextId));
  }, [currentVideoTime, sortedComments, sortedCommentTimestamps]);

  /** Skip seeking only when already at the same frame (exact timestamp), not when within a rounded second. */
  const seekToTimestampIfNeeded = useCallback(
    (seconds: number) => {
      if (Math.abs(currentVideoTime - seconds) <= FRAME_SEEK_EPSILON_SECONDS) return;
      setPendingSeekSeconds(seconds);
    },
    [currentVideoTime]
  );

  // Scroll comments list to the active comment — only scroll the comments container,
  // never the page. scrollIntoView() scrolls all ancestor scroll containers, which
  // caused the video/header to jump and the filter sheet to appear on timestamp click.
  useEffect(() => {
    if (activeCommentId == null || !commentsScrollRef.current) return;
    const container = commentsScrollRef.current;
    const el = container.querySelector(
      `[data-comment-id="${CSS.escape(String(activeCommentId))}"]`
    ) as HTMLElement | null;
    if (!el) return;
    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const containerHeight = container.clientHeight;
    const elHeight = el.offsetHeight;
    const scrollTop =
      container.scrollTop +
      (elRect.top - containerRect.top) -
      containerHeight / 2 +
      elHeight / 2;
    const clamped = Math.max(
      0,
      Math.min(scrollTop, container.scrollHeight - containerHeight)
    );
    container.scrollTo({ top: clamped, behavior: 'smooth' });
  }, [activeCommentId]);

  const handleAddComment = useCallback(async () => {
    if (!commentDraft.trim() || !showCommentComposer) return;

    const currentTime = currentVideoTime ?? 0;
    const timestampSeconds = includeTimestamp ? toFramePrecision(currentTime) : null;

    // Shot video: persist to shot_video_comments (sessionId is shot_video_id)
    if (isShotVideo && user?.id) {
      setPostingComment(true);
      try {
        const inserted = await insertShotVideoComment(
          supabase,
          sessionId,
          user.id,
          commentDraft.trim(),
          timestampSeconds,
          pendingNewCommentGif
        );
        if (inserted) {
          const mapped = mapShotVideoCommentToSessionComment(inserted, user.id);
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
    isShotVideo,
    pendingNewCommentGif,
    selectedMentionIds,
    sessionId,
    user?.id,
    showCommentComposer,
  ]);

  const handleAddReply = useCallback(
    async (parentIdRaw: string | number) => {
      if (!replyDraft.trim()) return;
      if (!user?.id || !isAdmin) return;
      const parentId = String(parentIdRaw);
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
              markerTextBoxXPercent: markerState.textBoxX,
              markerTextBoxYPercent: markerState.textBoxY,
              markerTextBoxWidthPercent: markerState.textBoxWidth,
              markerTextBoxHeightPercent: markerState.textBoxHeight,
            }
          : undefined;

      setPostingReply(true);
      try {
        if (isShotVideo) {
          const inserted = await insertShotVideoCommentReply(
            supabase,
            sessionId,
            parentId,
            user.id,
            replyDraft.trim(),
            timestampSeconds,
            marker
          );
          if (inserted) {
            setRepliesByCommentId((prev) => {
              const key = inserted.parentCommentId;
              const existing = prev[key] ?? [];
              return { ...prev, [key]: [...existing, inserted] };
            });
            setReplyDraft('');
            setReplyingToCommentId(null);
            setReplyTimestampSeconds(null);
            setFrameReplyPauseRequested(false);
            setActiveFrameReplyId(null);
          }
          return;
        }

        if (!isDbSession) return;

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
    [supabase, comments, isAdmin, isDbSession, isShotVideo, replyDraft, replyTimestampSeconds, sessionId, user?.id]
  );

  const handleSaveReplyEdit = useCallback(
    async (parentCommentId: string, replyId: string) => {
      if (!editReplyDraft.trim() || !user?.id) return;
      if (!isDbSession && !isShotVideo) return;

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
                markerTextBoxXPercent: markerState.textBoxX,
                markerTextBoxYPercent: markerState.textBoxY,
                markerTextBoxWidthPercent: markerState.textBoxWidth,
                markerTextBoxHeightPercent: markerState.textBoxHeight,
              }
            : undefined;
        const ok = isShotVideo
          ? await updateShotVideoCommentReply(supabase, replyId, editReplyDraft.trim(), marker)
          : await updateSessionCommentReply(supabase, replyId, editReplyDraft.trim(), marker);
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
                            markerTextBoxXPercent: marker.markerTextBoxXPercent,
                            markerTextBoxYPercent: marker.markerTextBoxYPercent,
                            markerTextBoxWidthPercent: marker.markerTextBoxWidthPercent,
                            markerTextBoxHeightPercent: marker.markerTextBoxHeightPercent,
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
    [supabase, editReplyDraft, isDbSession, isShotVideo, user?.id]
  );

  const handleDeleteReply = useCallback(
    async (parentCommentId: string, replyId: string) => {
      if ((!isDbSession && !isShotVideo) || !user?.id) return;
      setPostingReply(true);
      try {
        const ok = isShotVideo
          ? await deleteShotVideoCommentReply(supabase, replyId)
          : await deleteSessionCommentReply(supabase, replyId);
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
    [supabase, isDbSession, isShotVideo, user?.id]
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

  const filteredErrors = useMemo(() => {
    if (!errorMenu) return [];
    const q = errorMenu.query.trim().toLowerCase();
    if (!q) return [...ERROR_LABEL_OPTIONS];
    return ERROR_LABEL_OPTIONS.filter(
      (option) =>
        option.label.toLowerCase().includes(q) || option.key.toLowerCase().includes(q)
    );
  }, [errorMenu]);

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
    const lastHash = beforeCursor.lastIndexOf('#');

    const isTokenOpen = (start: number) => start !== -1 && !beforeCursor.slice(start).includes('\n');
    const slashStart = isTokenOpen(lastSlash) ? lastSlash : -1;
    const atStart = isTokenOpen(lastAt) ? lastAt : -1;
    const hashStart = isTokenOpen(lastHash) ? lastHash : -1;
    const activeTokenStart = Math.max(slashStart, atStart, hashStart);

    let anyMenu = false;
    if (activeTokenStart === slashStart && slashStart !== -1) {
      setShotMenu({
        query: text.slice(slashStart + 1, cursorOffset),
        slashStart,
        highlightIndex: 0,
      });
      anyMenu = true;
    } else {
      setShotMenu(null);
    }

    if (activeTokenStart === atStart && atStart !== -1) {
      const query = text.slice(atStart + 1, cursorOffset);
      setMentionMenu({
        query,
        atStart,
        highlightIndex: 0,
      });
      anyMenu = true;
    } else {
      setMentionMenu(null);
    }

    if (activeTokenStart === hashStart && hashStart !== -1) {
      const query = text.slice(hashStart + 1, cursorOffset);
      setErrorMenu({
        query,
        hashStart,
        highlightIndex: 0,
      });
      anyMenu = true;
    } else {
      setErrorMenu(null);
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

      if (e.key === '/' || e.key === '@' || e.key === '#') {
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
          setMentionMenu(null);
          setErrorMenu(null);
        } else if (char === '@') {
          setMentionMenu({
            query: '',
            atStart: cursorOffset,
            highlightIndex: 0,
          });
          setShotMenu(null);
          setErrorMenu(null);
        } else if (char === '#') {
          setErrorMenu({
            query: '',
            hashStart: cursorOffset,
            highlightIndex: 0,
          });
          setShotMenu(null);
          setMentionMenu(null);
        }
        setInlineMenuTop(getCaretTopOffset(container) + 20);
        focusContainer();
        return;
      }

      // Handle open menus
      if (shotMenu || mentionMenu || errorMenu) {
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
          } else if (errorMenu) {
            setErrorMenu((m) =>
              m
                ? {
                    ...m,
                    highlightIndex: Math.min(m.highlightIndex + 1, filteredErrors.length - 1),
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
          } else if (errorMenu) {
            setErrorMenu((m) =>
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
          } else if (errorMenu && filteredErrors.length > 0) {
            const selectedError = filteredErrors[errorMenu.highlightIndex];
            if (selectedError) {
              const start = errorMenu.hashStart;
              const marker = `[[error:${selectedError.key}|${selectedError.label}]] `;
              const nextDraft = text.slice(0, start) + marker + text.slice(cursorOffset);
              setDraft(nextDraft);
              setErrorMenu(null);
              pendingRef.current = start + marker.length;
              focusContainer();
            }
          }
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          setShotMenu(null);
          setMentionMenu(null);
          setErrorMenu(null);
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
    [
      shotMenu,
      mentionMenu,
      errorMenu,
      filteredShots,
      filteredMentions,
      filteredErrors,
      postingComment,
      postingReply,
      replyingToCommentId,
      handleAddComment,
      handleAddReply,
    ]
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
      if (!mentionMenu && !errorMenu) setInlineMenuTop(null);
    },
    [shotMenu, mentionMenu, errorMenu]
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
      if (!shotMenu && !errorMenu) setInlineMenuTop(null);
    },
    [mentionMenu, taggableProfiles, shotMenu, errorMenu]
  );

  const selectErrorFromMenu = useCallback(
    (errorKey: string) => {
      if (!errorMenu) return;
      const selectedError = ERROR_LABEL_OPTIONS.find((option) => option.key === errorKey);
      if (!selectedError) return;
      const container =
        editInputRef.current?.contains(document.activeElement)
          ? editInputRef.current
          : replyInputRef.current?.contains(document.activeElement)
            ? replyInputRef.current
            : commentInputRef.current;
      const sel = window.getSelection();
      if (!container || !sel || !container.contains(sel.anchorNode)) return;
      const { text, cursorOffset } = serializeContentEditable(container, sel);
      const start = errorMenu.hashStart;
      const marker = `[[error:${selectedError.key}|${selectedError.label}]] `;
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
      setErrorMenu(null);
      (container as HTMLDivElement).focus();
      if (!shotMenu && !mentionMenu) setInlineMenuTop(null);
    },
    [errorMenu, shotMenu, mentionMenu]
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

  interface ErrorSuggestionsDropdownProps {
    errorMenu: { query: string; hashStart: number; highlightIndex: number };
    filteredErrors: ReadonlyArray<{ key: string; label: string }>;
    inlineMenuTop: number | null;
    hasAnotherMenu: boolean;
    onSelectError: (key: string) => void;
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

  const ErrorSuggestionsDropdown: React.FC<ErrorSuggestionsDropdownProps> = ({
    errorMenu,
    filteredErrors,
    inlineMenuTop,
    hasAnotherMenu,
    onSelectError,
  }) => (
    <div
      role="listbox"
      aria-label="Error label"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: inlineMenuTop != null ? inlineMenuTop : '100%',
        marginTop: inlineMenuTop != null ? 0 : hasAnotherMenu ? 8 : 4,
        maxHeight: 220,
        overflowY: 'auto',
        backgroundColor: COLORS.cardBg,
        border: `1px solid ${COLORS.backgroundLight}`,
        borderRadius: RADIUS.sm,
        boxShadow: SHADOWS.light,
        zIndex: 21,
      }}
    >
      {filteredErrors.length === 0 ? (
        <div
          style={{
            padding: SPACING.sm,
            ...TYPOGRAPHY.bodySmall,
            color: COLORS.textMuted,
          }}
        >
          No matching error label
        </div>
      ) : (
        filteredErrors.map((option, i) => (
          <button
            key={option.key}
            type="button"
            role="option"
            aria-selected={errorMenu.highlightIndex === i}
            onMouseDown={(e) => {
              e.preventDefault();
              onSelectError(option.key);
            }}
            style={{
              display: 'block',
              width: '100%',
              padding: `${SPACING.sm}px ${SPACING.md}px`,
              border: 'none',
              background:
                errorMenu.highlightIndex === i ? COLORS.backgroundLight : 'transparent',
              textAlign: 'left',
              ...TYPOGRAPHY.bodySmall,
              color: COLORS.textPrimary,
              cursor: 'pointer',
            }}
          >
            #{option.label}
          </button>
        ))
      )}
    </div>
  );

  const handleDeleteComment = async (commentId: string | number) => {
    if (typeof commentId !== 'string') {
      // Local state fallback
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setRepliesByCommentId((prev) => {
        const next = { ...prev };
        delete next[String(commentId)];
        return next;
      });
      return;
    }

    // Shot video comments use their own table
    if (isShotVideo) {
      const success = await deleteShotVideoComment(supabase, commentId);
      if (success) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        setRepliesByCommentId((prev) => {
          const next = { ...prev };
          delete next[commentId];
          return next;
        });
      }
      return;
    }

    if (!isDbSession) {
      // Local-only session: just update state
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setRepliesByCommentId((prev) => {
        const next = { ...prev };
        delete next[commentId];
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

  const handleEditComment = async (
    commentId: string | number,
    newText: string,
    textBoxLayout?: { x: number; y: number; width: number; height: number } | null
  ) => {
    const editedFields =
      textBoxLayout != null
        ? {
            textBoxXPercent: textBoxLayout.x,
            textBoxYPercent: textBoxLayout.y,
            textBoxWidthPercent: textBoxLayout.width,
            textBoxHeightPercent: textBoxLayout.height,
          }
        : {};
    if (typeof commentId !== 'string') {
      // Local state fallback
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, text: newText, ...editedFields } : c))
      );
      setEditingCommentId(null);
      setEditDraft('');
      return;
    }

    if (isShotVideo) {
      const success = await updateShotVideoComment(supabase, commentId, newText, textBoxLayout);
      if (success) {
        setComments((prev) =>
          prev.map((c) => (c.id === commentId ? { ...c, text: newText, ...editedFields } : c))
        );
        setEditingCommentId(null);
        setEditDraft('');
      }
      return;
    }

    if (!isDbSession) {
      // Local-only session: just update state
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, text: newText, ...editedFields } : c))
      );
      setEditingCommentId(null);
      setEditDraft('');
      return;
    }

    const success = await updateSessionComment(supabase, commentId, newText, textBoxLayout);
    if (success) {
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, text: newText, ...editedFields } : c))
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
          gap: SPACING.xs,
          padding: `${SPACING.md}px ${SPACING.xs}px`,
          backgroundColor: '#f6f8f8',
          minWidth: 0,
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        {breadcrumbFromRoadmap ? (
          <Breadcrumb
            onBack={onBack}
            variant="centered"
            fontSize={14}
            containerStyle={{
              flex: 1,
              borderBottom: 'none',
              backgroundColor: 'transparent',
            }}
            items={[
              ...(breadcrumbFromRoadmap.studentName
                ? [{ label: breadcrumbFromRoadmap.studentName, onClick: onBack }]
                : []),
              { label: 'Your Roadmap', onClick: onBack },
              {
                label: breadcrumbFromRoadmap.shotTitle,
                onClick: () =>
                  onBreadcrumbShotClick
                    ? onBreadcrumbShotClick(breadcrumbFromRoadmap.shotTitle)
                    : onBack(),
              },
              ...(session?.dateLabel ? [{ label: session.dateLabel }] : []),
            ]}
            rightSlot={
              <div
                style={{
                  minWidth: 40,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 4,
                }}
              >
                {showShareLinkButton && (
                  <button
                    type="button"
                    onClick={() => void handleCopySessionLink()}
                    aria-label="Copy link to this session"
                    title={linkJustCopied ? 'Copied!' : 'Copy link'}
                    style={{
                      width: 36,
                      minWidth: 36,
                      height: 36,
                      flexShrink: 0,
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
                    <IconLink size={18} />
                  </button>
                )}
                {isAdminView && (isDbSession || isShotVideo) && (
                  <button
                    type="button"
                    onClick={() => setShowEditSession(true)}
                    aria-label="Edit session"
                    style={{
                      width: 36,
                      minWidth: 36,
                      height: 36,
                      flexShrink: 0,
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
            }
          />
        ) : (
          <>
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
            <h1
              style={{
                margin: 0,
                fontSize: 'clamp(13px, 3.5vw, 15px)',
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
            <div
              style={{
                minWidth: 40,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 4,
              }}
            >
              {showShareLinkButton && (
                <button
                  type="button"
                  onClick={() => void handleCopySessionLink()}
                  aria-label="Copy link to this session"
                  title={linkJustCopied ? 'Copied!' : 'Copy link'}
                  style={{
                    width: 36,
                    minWidth: 36,
                    height: 36,
                    flexShrink: 0,
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
                  <IconLink size={18} />
                </button>
              )}
              {isAdminView && (isDbSession || isShotVideo) && (
                <button
                  type="button"
                  onClick={() => setShowEditSession(true)}
                  aria-label="Edit session"
                  style={{
                    width: 36,
                    minWidth: 36,
                    height: 36,
                    flexShrink: 0,
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
          </>
        )}
      </header>
      <div
        style={{
          padding: 0,
          width: '100%',
          boxSizing: 'border-box',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          marginLeft: -1,
          marginTop: 1,
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
            gap: isNarrow ? 0 : SPACING.lg,
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
                  overflow: 'hidden',
                  background: '#ffffff',
                  marginBottom: 0,
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
                  frameDetailTextBoxInitial={frameDetailTextBoxInitial}
                  frameDetailMarkerReadOnly={frameDetailMarkerReadOnly}
                  frameDetailOverlayText={frameDetailOverlayText}
                  onPlay={() => setActiveFrameReplyId(null)}
                  onControlPressed={() => {
                    // When user uses time controls (±1s, ±5s, frames, play/pause), exit any active frame-detail view
                    // and clear pending seek so the video does not snap back to the previous frame timestamp.
                    setActiveFrameReplyId(null);
                    setPendingSeekSeconds(null);
                    setFrameReplyPauseRequested(false);
                  }}
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
                  loopCommentOverlays={loopCommentOverlays}
                  editableLoopCommentId={editingCommentId}
                  editableLoopCommentTextBoxInitial={editCommentTextBoxDraft}
                  onEditableLoopCommentTextBoxChange={handleEditableLoopCommentTextBoxChange}
                  onMarkerClick={(marker) => {
                    if (marker.id != null) {
                      const nextId: string | number | null = marker.id;
                      setActiveCommentId((prev) => (prev === nextId ? prev : nextId));
                    }
                  }}
                  onTimeUpdate={(t, dur) => {
                    setCurrentVideoTime(t);
                    setVideoDuration(dur);
                  }}
                  onActiveMarkerChange={(marker) => {
                    const nextId = marker?.id ?? null;
                    setActiveCommentId((prev) => (prev === nextId ? prev : nextId));
                  }}
                  seekToSeconds={pendingSeekSeconds}
                  onSeekHandled={() => setPendingSeekSeconds(null)}
                  loopRange={
                    activeCommentId != null
                      ? (() => {
                          const c = comments.find((x) => x.id === activeCommentId);
                          if (
                            c?.timestampSeconds != null &&
                            c?.loopEndTimestampSeconds != null &&
                            c.loopEndTimestampSeconds > c.timestampSeconds
                          ) {
                            return { start: c.timestampSeconds, end: c.loopEndTimestampSeconds };
                          }
                          return null;
                        })()
                      : null
                  }
                  canRequestAddUrl={canAddVideoUrl && !hasVideoUrl && !showAddUrlForm}
                  onRequestAddUrl={() => {
                    setShowAddUrlForm(true);
                    setAddUrlError(null);
                    setAddUrlDraft('');
                  }}
                  renderBelowTimeControls={
                    addLoopState && (
                      <div
                        style={{
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: SPACING.md,
                          padding: `${SPACING.sm}px ${SPACING.md}px`,
                          background: '#fff',
                          borderBottom: '1px solid #F5F5F5',
                          width: '100%',
                          minWidth: 0,
                        }}
                      >
                        {(() => {
                          const isValidLoop =
                            currentVideoTime >= addLoopState.startTimestamp &&
                            currentVideoTime - addLoopState.startTimestamp >= 2;
                          return (
                            <>
                              <span style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ padding: '2px 8px', borderRadius: RADIUS.md, backgroundColor: COLORS.backgroundLight }}>
                                  {formatTimestamp(addLoopState.startTimestamp)}
                                </span>
                                {' → '}
                                <span style={{ padding: '2px 8px', borderRadius: RADIUS.md, backgroundColor: COLORS.backgroundLight, fontWeight: 700 }}>
                                  {formatTimestamp(currentVideoTime)}
                                </span>
                              </span>
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!isValidLoop || !sessionId || !supabase) return;
                                  const endTs = currentVideoTime;
                                  const success = isShotVideo
                                    ? await updateShotVideoCommentLoopEnd(supabase, String(addLoopState.commentId), endTs)
                                    : await updateSessionCommentLoopEnd(supabase, String(addLoopState.commentId), endTs);
                                  if (success) {
                                    setComments((prev) =>
                                      prev.map((c) =>
                                        c.id === addLoopState.commentId
                                          ? { ...c, loopEndTimestampSeconds: endTs }
                                          : c
                                      )
                                    );
                                    setAddLoopState(null);
                                  }
                                }}
                                disabled={!isValidLoop}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: RADIUS.md,
                                  border: 'none',
                                  backgroundColor: isValidLoop ? REFERENCE_PRIMARY : COLORS.backgroundLight,
                                  color: isValidLoop ? '#fff' : COLORS.textSecondary,
                                  fontSize: 13,
                                  fontWeight: 600,
                                  cursor: isValidLoop ? 'pointer' : 'default',
                                }}
                              >
                                {addLoopState.mode === 'edit' ? 'Update Loop' : 'Add Loop'}
                              </button>
                            </>
                          );
                        })()}
                      </div>
                    )
                  }
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
                  alignItems: 'flex-end',
                  padding: '0 16px',
                  background: '#fff',
                  borderBottom: '1px solid #F5F5F5',
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
                    padding: '12px 0',
                    marginRight: 26,
                    border: 'none',
                    borderRadius: 0,
                    background: 'none',
                    fontSize: 14,
                    fontWeight: shotDetailTab === 'comments' ? 600 : 500,
                    color: shotDetailTab === 'comments' ? REFERENCE_PRIMARY : '#8E8E93',
                    borderBottom: `2.5px solid ${shotDetailTab === 'comments' ? REFERENCE_PRIMARY : 'transparent'}`,
                    marginBottom: -1,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
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
                    padding: '12px 0',
                    marginRight: 26,
                    border: 'none',
                    borderRadius: 0,
                    background: 'none',
                    fontSize: 14,
                    fontWeight: shotDetailTab === 'technique' ? 600 : 500,
                    color: shotDetailTab === 'technique' ? REFERENCE_PRIMARY : '#8E8E93',
                    borderBottom: `2.5px solid ${shotDetailTab === 'technique' ? REFERENCE_PRIMARY : 'transparent'}`,
                    marginBottom: -1,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Shot technique
                </button>
              </div>
            )}
            {(!isShotVideo || shotDetailTab === 'comments') && (
              <>
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
              {/* Filter & Sort - scrolls with comments */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  padding: `10px 0 8px`,
                  minWidth: 0,
                  flexShrink: 0,
                  background: '#fff',
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsFilterSheetOpen(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 14px',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: 999,
                    background: '#fff',
                    color: (shotFilter.length || studentFilter.length) > 0 ? REFERENCE_PRIMARY : '#1C1C1E',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    flexShrink: 0,
                    borderColor: (shotFilter.length || studentFilter.length) > 0 ? REFERENCE_PRIMARY : '#e2e8f0',
                    backgroundColor: (shotFilter.length || studentFilter.length) > 0 ? 'rgba(143,185,168,0.08)' : '#fff',
                  }}
                  aria-label="Filter comments"
                  title="Filter comments by shots and students"
                >
                  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                  </svg>
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
              {commentsLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.md, padding: `${SPACING.sm}px 0` }}>
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} style={{ display: 'flex', gap: SPACING.sm, alignItems: 'flex-start' }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          backgroundColor: '#e8ecf1',
                          flexShrink: 0,
                          animation: 'skeleton-pulse 1.5s ease-in-out infinite',
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div
                          style={{
                            height: 14,
                            width: `${60 + (i % 3) * 15}%`,
                            borderRadius: 4,
                            backgroundColor: '#e8ecf1',
                            animation: 'skeleton-pulse 1.5s ease-in-out infinite',
                            animationDelay: `${i * 0.1}s`,
                          }}
                        />
                        <div
                          style={{
                            height: 12,
                            width: '100%',
                            borderRadius: 4,
                            backgroundColor: '#e8ecf1',
                            animation: 'skeleton-pulse 1.5s ease-in-out infinite',
                            animationDelay: `${i * 0.1 + 0.05}s`,
                          }}
                        />
                        <div
                          style={{
                            height: 10,
                            width: `${40 + (i % 2) * 20}%`,
                            borderRadius: 4,
                            backgroundColor: '#e8ecf1',
                            animation: 'skeleton-pulse 1.5s ease-in-out infinite',
                            animationDelay: `${i * 0.1 + 0.1}s`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : commentsError ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: SPACING.md,
                    padding: SPACING.lg,
                    textAlign: 'center',
                  }}
                >
                  <p style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, margin: 0 }}>
                    {commentsError}
                  </p>
                  <button
                    type="button"
                    onClick={() => setCommentsRetryTrigger((t) => t + 1)}
                    style={{
                      padding: `${SPACING.sm}px ${SPACING.lg}px`,
                      borderRadius: RADIUS.md,
                      border: `2px solid ${REFERENCE_PRIMARY}`,
                      backgroundColor: `${REFERENCE_PRIMARY}1A`,
                      color: REFERENCE_PRIMARY,
                      ...TYPOGRAPHY.labelMed,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Retry
                  </button>
                </div>
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
                              setActiveFrameReplyId(null);
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
                                setActiveFrameReplyId(null);
                                seekToTimestampIfNeeded(comment.timestampSeconds!);
                                setActiveCommentId(comment.id);
                              }
                              if (e.key === ' ') e.preventDefault();
                            }
                          : undefined
                      }
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        gap: SPACING.sm,
                        padding: `${SPACING.sm}px ${SPACING.sm}px`,
                        cursor: canSeekToTimestamp ? 'pointer' : 'default',
                        backgroundColor: isActive ? `${REFERENCE_PRIMARY}18` : 'transparent',
                        borderRadius: 8,
                        margin: isActive ? `0 -${SPACING.sm}px 0 0` : 0,
                      }}
                    >
                    {/* Left column: profile icon only */}
                    <div style={{ flexShrink: 0 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          backgroundColor: `${REFERENCE_PRIMARY}33`,
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 12,
                          fontWeight: 600,
                          color: REFERENCE_PRIMARY,
                        }}
                      >
                        {(comment.author || '')
                          .trim()
                          .split(/\s+/)
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase() || '?'}
                      </div>
                    </div>
                    {/* Right column: author, controls, content */}
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0 }}>
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
                              ) : isAdmin && SHOW_EXAMPLE_BUTTON ? (
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
                                  setActiveFrameReplyId(null);
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
                                {comment.loopEndTimestampSeconds != null
                                  ? `${formatTimestamp(comment.timestampSeconds)} → ${formatTimestamp(comment.loopEndTimestampSeconds)}`
                                  : formatTimestamp(comment.timestampSeconds)}
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
                              {(isDbSession || isShotVideo) && user?.id && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveFrameReplyId(null);
                                    setReplyingToCommentId(String(comment.id));
                                    // Add frame comment at current frame; do not seek to the parent comment's timestamp.
                                    setReplyTimestampSeconds(toFramePrecision(currentVideoTime));
                                    setFrameReplyPauseRequested(true);
                                    videoPlayerRef.current?.pause();
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
                              {(isDbSession || isShotVideo) && user?.id && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const startTs = comment.timestampSeconds ?? currentVideoTime;
                                    const hasExistingLoop =
                                      comment.loopEndTimestampSeconds != null &&
                                      comment.loopEndTimestampSeconds > startTs;
                                    setAddLoopState({
                                      commentId: comment.id,
                                      startTimestamp: startTs,
                                      mode: hasExistingLoop ? 'edit' : 'add',
                                    });
                                    setActiveCommentMenu(null);
                                    seekToTimestampIfNeeded(
                                      hasExistingLoop ? (comment.loopEndTimestampSeconds as number) : startTs
                                    );
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
                                  {comment.loopEndTimestampSeconds != null &&
                                  comment.loopEndTimestampSeconds > (comment.timestampSeconds ?? currentVideoTime)
                                    ? 'Edit loop'
                                    : 'Add loop'}
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
                                  setEditCommentTextBoxDraft(
                                    typeof comment.textBoxXPercent === 'number' &&
                                    typeof comment.textBoxYPercent === 'number' &&
                                    typeof comment.textBoxWidthPercent === 'number' &&
                                    typeof comment.textBoxHeightPercent === 'number'
                                      ? {
                                          x: comment.textBoxXPercent,
                                          y: comment.textBoxYPercent,
                                          width: comment.textBoxWidthPercent,
                                          height: comment.textBoxHeightPercent,
                                        }
                                      : null
                                  );
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
                            aria-label="Edit comment. Type / for shots, @ to tag people, or # for error labels."
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
                          {errorMenu != null && (
                            <ErrorSuggestionsDropdown
                              errorMenu={errorMenu}
                              filteredErrors={filteredErrors}
                              inlineMenuTop={inlineMenuTop}
                              hasAnotherMenu={shotMenu != null || mentionMenu != null}
                              onSelectError={selectErrorFromMenu}
                            />
                          )}
                          <div style={{ display: 'flex', gap: SPACING.sm, marginTop: SPACING.sm, justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingCommentId(null);
                                setEditDraft('');
                                setEditCommentTextBoxDraft(null);
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
                                handleEditComment(comment.id, editDraft.trim(), editCommentTextBoxDraft);
                                setEditDraft('');
                                setEditCommentTextBoxDraft(null);
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
                            if (seg.type === 'error') {
                              return (
                                <span key={i} style={ERROR_PILL_STYLE}>
                                  {seg.label}
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
                          const _isOwnReply = reply.role === 'You';
                          const isEditing = editingReplyId === reply.id;
                          const isMenuOpen = activeReplyMenuId === reply.id;
                          return (
                            <FrameDetailCard
                              key={reply.id}
                              highlighted={isActive}
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
                                    if (seg.type === 'error') {
                                      return (
                                        <span key={i} style={ERROR_PILL_STYLE}>
                                          {seg.label}
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
                        <FrameDetailCard highlighted={isActive} onClick={(e) => e.stopPropagation()}>
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
                            </div>
                          </div>
                          <div style={{ position: 'relative', marginBottom: SPACING.sm }}>
                            <div
                              ref={replyInputRef}
                              contentEditable
                              suppressContentEditableWarning
                              role="textbox"
                              aria-multiline="true"
                              aria-label="Add a comment to the frame. Type / for shots, @ to tag people, or # for error labels."
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
                            {errorMenu != null && (
                              <ErrorSuggestionsDropdown
                                errorMenu={errorMenu}
                                filteredErrors={filteredErrors}
                                inlineMenuTop={inlineMenuTop}
                                hasAnotherMenu={shotMenu != null || mentionMenu != null}
                                onSelectError={selectErrorFromMenu}
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
                      {!pendingNewCommentGif && SHOW_EXAMPLE_BUTTON && (
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
                  aria-label="Type / for shots, @ to tag people, or # for error labels."
                  onInput={handleCommentInput}
                  onKeyDown={handleCommentKeyDown}
                  onPaste={(e) => {
                    e.preventDefault();
                    const text = e.clipboardData.getData('text/plain');
                    document.execCommand('insertText', false, text);
                  }}
                  data-placeholder="Type / for shots, @ to tag, or # for errors"
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
                    Type / for shots, @ to tag, or # for errors
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
                {editingCommentId == null && errorMenu != null && (
                  <ErrorSuggestionsDropdown
                    errorMenu={errorMenu}
                    filteredErrors={filteredErrors}
                    inlineMenuTop={inlineMenuTop}
                    hasAnotherMenu={shotMenu != null || mentionMenu != null}
                    onSelectError={selectErrorFromMenu}
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
              // Student: only sub-categories marked visible (default: first only). Admin: all subs.
              const visibleSubIdsForStudent =
                hasSubs && techniqueVisibilityLoaded && techniqueVisibleSubIds.length > 0
                  ? techniqueVisibleSubIds.filter((id) => subs!.some((s) => s.id === id))
                  : hasSubs
                    ? [subs![0].id]
                    : [];
              // Effective list of sub-category IDs that are visible to the student, guaranteeing at least one.
              const effectiveVisibleSubIdsBase = visibleSubIdsForStudent.filter((id) =>
                subs!.some((s) => s.id === id)
              );
              const fallbackFirst = effectiveVisibleSubIdsBase[0] ?? subs?.[0]?.id ?? null;
              const effectiveVisibleSubIds =
                effectiveVisibleSubIdsBase.length > 0 && fallbackFirst
                  ? Array.from(new Set([fallbackFirst, ...effectiveVisibleSubIdsBase]))
                  : fallbackFirst
                    ? [fallbackFirst]
                    : [];
              // Student sees only sub-categories marked visible (default: first). Admin sees all and can toggle visibility.
              const visibleSubs = hasSubs
                ? (isAdminView ? subs! : subs!.filter((s) => visibleSubIdsForStudent.includes(s.id)))
                : [];
              const effectiveSubId =
                hasSubs && selectedTechniqueSubId && visibleSubs.some((s) => s.id === selectedTechniqueSubId)
                  ? selectedTechniqueSubId
                  : fallbackFirst;
              const isCategoryVisibleToStudent = !hasSubs || (effectiveSubId != null && effectiveVisibleSubIds.includes(effectiveSubId));
              const techniqueItems =
                hasSubs && effectiveSubId
                  ? (subs!.find((s) => s.id === effectiveSubId)?.items ?? [])
                  : shotSkill.items;
              const getCheckedKey = (label: string) => buildTechniqueKey(effectiveSubId, label);

              const handleVisibilityToggle = (subId: string, currentlyVisible: boolean) => {
                if (!subId) return;
                if (currentlyVisible && effectiveVisibleSubIds.length <= 1) return; // At least one must stay visible.
                const base = effectiveVisibleSubIds;
                const next = currentlyVisible
                  ? base.filter((id) => id !== subId)
                  : Array.from(new Set([...base, subId]));
                setTechniqueVisibleSubIds(next);
                if (sessionId) {
                  void upsertShotTechniqueSubVisibility(supabase, sessionId, next);
                }
              };

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
                  {(!techniqueChecksLoaded ||
                    !checklistLayoutLoaded ||
                    (hasSubs && !techniqueVisibilityLoaded)) && (
                    <div
                      style={{
                        padding: SPACING.lg,
                        color: COLORS.textSecondary,
                        fontSize: 13,
                        display: 'flex',
                        alignItems: 'center',
                        gap: SPACING.sm,
                      }}
                    >
                      <span
                        style={{
                          width: 20,
                          height: 20,
                          border: '2px solid currentColor',
                          borderTopColor: 'transparent',
                          borderRadius: '50%',
                          animation: 'spin 0.8s linear infinite',
                        }}
                      />
                      Loading…
                    </div>
                  )}
                  {hasSubs &&
                    (techniqueChecksLoaded &&
                      checklistLayoutLoaded &&
                      (!hasSubs || techniqueVisibilityLoaded)) && (
                    <div
                      style={{
                        marginBottom: SPACING.sm,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 6,
                          padding: '4px 0',
                          justifyContent: 'center',
                        }}
                      >
                        {visibleSubs.map((sub) => {
                          const isSubSelected = effectiveSubId === sub.id;
                          const isVisibleToStudent = isAdminView
                            ? effectiveVisibleSubIds.includes(sub.id)
                            : true;
                          const labelColor = isSubSelected
                            ? '#fff'
                            : isVisibleToStudent
                              ? COLORS.textSecondary
                              : COLORS.textMuted;
                          const labelOpacity = isVisibleToStudent ? 1 : 0.6;
                          return (
                            <button
                              key={sub.id}
                              type="button"
                              onClick={() => setSelectedTechniqueSubId(sub.id)}
                              style={{
                                padding: '10px 16px',
                                border: 'none',
                                borderRadius: 12,
                                background: isSubSelected
                                  ? REFERENCE_PRIMARY
                                  : 'rgba(143, 185, 168, 0.12)',
                                fontSize: 13,
                                fontWeight: isSubSelected ? 700 : 600,
                                color: labelColor,
                                cursor: 'pointer',
                                boxShadow: isSubSelected
                                  ? '0 2px 8px rgba(143, 185, 168, 0.35)'
                                  : 'none',
                                transition: 'background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease',
                                opacity: labelOpacity,
                              }}
                            >
                              {sub.label}
                            </button>
                          );
                        })}
                      </div>
                      {isAdminView && effectiveSubId && (
                        <div
                          style={{
                            marginTop: 8,
                            padding: '8px 12px',
                            borderRadius: 10,
                            backgroundColor: effectiveVisibleSubIds.includes(effectiveSubId)
                              ? 'rgba(56, 189, 248, 0.08)'
                              : 'rgba(148, 163, 184, 0.12)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 12,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 12,
                              color: COLORS.textSecondary,
                            }}
                          >
                            {effectiveVisibleSubIds.includes(effectiveSubId)
                              ? 'This shot category is visible to the student.'
                              : 'This shot category is currently hidden from the student.'}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleVisibilityToggle(
                                effectiveSubId,
                                effectiveVisibleSubIds.includes(effectiveSubId)
                              )
                            }
                            style={{
                              padding: '6px 12px',
                              borderRadius: 999,
                              border: 'none',
                              backgroundColor: effectiveVisibleSubIds.includes(effectiveSubId)
                                ? 'rgba(239, 68, 68, 0.12)'
                                : REFERENCE_PRIMARY,
                              color: effectiveVisibleSubIds.includes(effectiveSubId) ? '#b91c1c' : '#fff',
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            {effectiveVisibleSubIds.includes(effectiveSubId) ? 'Hide' : 'Show'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {(techniqueChecksLoaded &&
                    checklistLayoutLoaded &&
                    (!hasSubs || techniqueVisibilityLoaded)) && (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: SPACING.sm,
                        opacity: isCategoryVisibleToStudent ? 1 : 0.5,
                        pointerEvents: isCategoryVisibleToStudent ? undefined : 'none',
                        transition: 'opacity 0.2s ease',
                      }}
                    >
                      {(() => {
                        const layoutSubKey = techniqueSubKey(effectiveSubId);
                        const layoutEntry = checklistLayoutBySub[layoutSubKey];
                        const savedOrder = layoutEntry?.orderedItemLabels;
                        const savedHighlights = layoutEntry?.highlightedItemLabels ?? [];
                        const orderedItems = orderShotTechniqueChecklistByCheckedState(
                          techniqueItems,
                          savedOrder,
                          (item) =>
                            techniqueChecked[getCheckedKey(item.label)] ?? item.completed
                        );
                        const orderLabels = orderedItems.map((i) => i.label);

                        const persistChecklistLayout = (
                          nextOrder: string[],
                          nextHighlights: string[]
                        ) => {
                          if (!sessionId || !isShotVideo) return;
                          setChecklistLayoutBySub((prev) => ({
                            ...prev,
                            [layoutSubKey]: {
                              orderedItemLabels: nextOrder,
                              highlightedItemLabels: nextHighlights,
                            },
                          }));
                          void upsertShotTechniqueChecklistLayout(supabase, {
                            shotVideoId: sessionId,
                            subCategoryKey: layoutSubKey,
                            orderedItemLabels: nextOrder,
                            highlightedItemLabels: nextHighlights,
                          });
                        };

                        const moveLabelInOrder = (fromLabel: string, toLabel: string) => {
                          const next = [...orderLabels];
                          const iFrom = next.indexOf(fromLabel);
                          const iTo = next.indexOf(toLabel);
                          if (iFrom < 0 || iTo < 0 || iFrom === iTo) return;
                          next.splice(iFrom, 1);
                          next.splice(iTo, 0, fromLabel);
                          persistChecklistLayout(next, savedHighlights);
                        };

                        return orderedItems.map((item, idx) => {
                          const key = getCheckedKey(item.label);
                          const isChecked = techniqueChecked[key] ?? item.completed;
                          const canEditChecks = isAdminView && isCategoryVisibleToStudent;
                          const isHighlighted =
                            !isChecked && savedHighlights.includes(item.label);
                          const roadmapIconIdx = techniqueItems.findIndex((i) => i.label === item.label);
                          const iconIdx = roadmapIconIdx >= 0 ? roadmapIconIdx : idx;

                          const toggleChecked = () => {
                            const nextChecked = !isChecked;
                            setTechniqueChecked((prev) => ({ ...prev, [key]: nextChecked }));
                            if (isShotVideo && sessionId) {
                              void upsertShotTechniqueCheck(supabase, {
                                shotVideoId: sessionId,
                                subCategoryId: effectiveSubId ?? null,
                                itemLabel: item.label,
                                checked: nextChecked,
                              });
                            }
                            if (nextChecked && savedHighlights.includes(item.label) && sessionId && isShotVideo) {
                              persistChecklistLayout(
                                orderLabels,
                                savedHighlights.filter((l) => l !== item.label)
                              );
                            }
                          };

                          const checkboxStyle: React.CSSProperties = {
                            width: 28,
                            height: 28,
                            flexShrink: 0,
                            borderRadius: '50%',
                            border: `2px solid ${isChecked ? REFERENCE_PRIMARY : '#94a3b8'}`,
                            backgroundColor: isChecked ? REFERENCE_PRIMARY : COLORS.white,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
                            transition: 'border-color 0.15s ease, background-color 0.15s ease',
                            ...(canEditChecks ? { cursor: 'pointer' } : { cursor: 'default', opacity: 0.9 }),
                          };

                          const cardBorder = isHighlighted
                            ? `2px solid ${REFERENCE_PRIMARY}`
                            : `1px solid rgba(143, 185, 168, 0.2)`;
                          const cardShadow = isHighlighted
                            ? `0 0 0 3px rgba(143, 185, 168, 0.25), 0 4px 12px rgba(0,0,0,0.08)`
                            : '0 1px 3px rgba(0,0,0,0.04)';
                          const isDraggingRow = techniqueChecklistDraggingLabel === item.label;

                          return (
                            <div
                              key={item.label}
                              role={canEditChecks && !isChecked ? 'button' : undefined}
                              tabIndex={canEditChecks && !isChecked ? 0 : undefined}
                              onClick={
                                canEditChecks && !isChecked
                                  ? () => {
                                      const nextHl = savedHighlights.includes(item.label)
                                        ? savedHighlights.filter((l) => l !== item.label)
                                        : [...savedHighlights, item.label];
                                      persistChecklistLayout(orderLabels, nextHl);
                                    }
                                  : undefined
                              }
                              onKeyDown={
                                canEditChecks && !isChecked
                                  ? (e) => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        const nextHl = savedHighlights.includes(item.label)
                                          ? savedHighlights.filter((l) => l !== item.label)
                                          : [...savedHighlights, item.label];
                                        persistChecklistLayout(orderLabels, nextHl);
                                      }
                                    }
                                  : undefined
                              }
                              onDragOver={
                                canEditChecks
                                  ? (e) => {
                                      e.preventDefault();
                                      e.dataTransfer.dropEffect = 'move';
                                    }
                                  : undefined
                              }
                              onDrop={
                                canEditChecks
                                  ? (e) => {
                                      e.preventDefault();
                                      const from = e.dataTransfer.getData('text/plain');
                                      if (from && from !== item.label) {
                                        moveLabelInOrder(from, item.label);
                                      }
                                    }
                                  : undefined
                              }
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: SPACING.md,
                                padding: SPACING.lg,
                                borderRadius: 16,
                                backgroundColor: isHighlighted
                                  ? 'rgba(143, 185, 168, 0.12)'
                                  : COLORS.cardBg,
                                border: cardBorder,
                                minWidth: 0,
                                boxShadow: cardShadow,
                                transition: 'border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease, opacity 0.15s ease',
                                opacity: isDraggingRow ? 0.55 : 1,
                                ...(canEditChecks && !isChecked && { cursor: 'pointer' }),
                              }}
                            >
                              {canEditChecks ? (
                                <div
                                  draggable
                                  onDragStart={(e) => {
                                    e.dataTransfer.setData('text/plain', item.label);
                                    e.dataTransfer.effectAllowed = 'move';
                                    setTechniqueChecklistDraggingLabel(item.label);
                                  }}
                                  onDragEnd={() => setTechniqueChecklistDraggingLabel(null)}
                                  onClick={(e) => e.stopPropagation()}
                                  onKeyDown={(e) => e.stopPropagation()}
                                  role="button"
                                  tabIndex={0}
                                  aria-label={`Drag to reorder: ${item.label}`}
                                  style={{
                                    flexShrink: 0,
                                    width: 28,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'grab',
                                    color: COLORS.textMuted,
                                    fontSize: 16,
                                    lineHeight: 1,
                                    userSelect: 'none',
                                  }}
                                >
                                  ⋮⋮
                                </div>
                              ) : null}
                              <div
                                style={{
                                  width: 44,
                                  height: 44,
                                  flexShrink: 0,
                                  borderRadius: 14,
                                  background: `linear-gradient(145deg, rgba(143, 185, 168, 0.2) 0%, rgba(143, 185, 168, 0.08) 100%)`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: REFERENCE_PRIMARY,
                                  fontSize: 20,
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
                                  TECHNIQUE_ICONS[iconIdx % TECHNIQUE_ICONS.length]
                                )}
                              </div>
                              <span
                                style={{
                                  flex: 1,
                                  fontSize: 14,
                                  fontWeight: 600,
                                  color: COLORS.textPrimary,
                                  lineHeight: 1.4,
                                  wordBreak: 'break-word',
                                }}
                              >
                                {item.label}
                              </span>
                              {canEditChecks ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleChecked();
                                  }}
                                  aria-label={
                                    isChecked
                                      ? `Mark "${item.label}" as not done`
                                      : `Mark "${item.label}" as done`
                                  }
                                  style={checkboxStyle}
                                >
                                  {isChecked && (
                                    <IconCheck size={16} style={{ color: '#fff' }} />
                                  )}
                                </button>
                              ) : (
                                <div
                                  aria-hidden
                                  style={checkboxStyle}
                                  title="Completed by coach"
                                >
                                  {isChecked && (
                                    <IconCheck size={16} style={{ color: '#fff' }} />
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
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

      {isAdminView && showEditSession && (isDbSession || isShotVideo) && (
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
            aria-label={isShotVideo ? 'Edit shot video' : 'Edit session details'}
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
                {isShotVideo ? 'Edit shot video' : 'Edit session'}
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

            {isShotVideo ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.md }}>
                <div>
                  <label
                    htmlFor="edit-shot-video-url"
                    style={{
                      display: 'block',
                      ...TYPOGRAPHY.label,
                      color: COLORS.textSecondary,
                      marginBottom: SPACING.xs,
                    }}
                  >
                    Video URL
                  </label>
                  <input
                    id="edit-shot-video-url"
                    type="url"
                    value={editShotVideoUrl}
                    onChange={(e) => setEditShotVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
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
                    htmlFor="edit-shot-video-title"
                    style={{
                      display: 'block',
                      ...TYPOGRAPHY.label,
                      color: COLORS.textSecondary,
                      marginBottom: SPACING.xs,
                    }}
                  >
                    Title (shot / drill name)
                  </label>
                  <input
                    id="edit-shot-video-title"
                    type="text"
                    value={editShotVideoTitle}
                    onChange={(e) => setEditShotVideoTitle(e.target.value)}
                    placeholder="e.g. Forehand Drive"
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
              </div>
            ) : (
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
            )}

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
                {isShotVideo ? 'Delete shot video' : 'Delete session'}
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
                  onClick={isShotVideo ? handleSaveShotVideoDetails : handleSaveSessionDetails}
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

      {isAdminView && (isDbSession || isShotVideo) && showDeleteConfirm && (
        <div
          role="presentation"
          onClick={() => !editSessionDeleting && setShowDeleteConfirm(false)}
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
            aria-label={isShotVideo ? 'Confirm delete shot video' : 'Confirm delete session'}
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
              {isShotVideo ? 'Delete shot video?' : 'Delete session?'}
            </h3>
            <p style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, margin: 0 }}>
              {isShotVideo
                ? 'This will permanently remove this shot video and its comments.'
                : 'This will permanently remove the session and its links to students. Comments on the video will remain.'}
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

