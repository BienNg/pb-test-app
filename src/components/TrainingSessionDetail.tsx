import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, RADIUS } from '../styles/theme';
import {
  IconCalendar,
  IconClock,
  IconPlay,
  IconPause,
  IconVolume2,
  IconVolumeX,
  IconChevronLeft,
  IconChevronRight,
} from './Icons';
import { TRAINING_SESSIONS, type SessionComment, type TrainingSession } from './MyProgressPage';
import { createClient } from '@/lib/supabase/client';

/** Pickleball shot types available via "/" command in comments. */
export const SHOT_LIST = [
  'Serve', 'Return', 'Drive', 'Forehand Drive', 'Backhand Drive',
  'Volley', 'Forehand Volley', 'Backhand Volley', 'Punch Volley', 'Block Volley', 'Roll Volley',
  'Dink', 'Forehand Dink', 'Backhand Dink', 'Cross-Court Dink', 'Straight Dink', 'Dead Dink',
  'Slice Dink', 'Topspin Dink', 'Attack Dink', 'Drop', 'Third Shot Drop', 'Transition',
  'Third Shot Drive', 'Hybrid Drop', 'Reset', 'Smash', 'Put-Away', 'Backhand Overhead',
  'Jump Smash', 'Lob', 'Offensive Lob', 'Defensive Lob', 'Topspin Lob', 'Backspin Lob',
  'Block', 'Counter', 'Erne', 'Bert', 'ATP', 'Tweener', 'Flick', 'Speed-Up', 'Fake Speed-Up',
  'Chicken Wing', 'Pancake Shot',
] as const;

// [[shot:Serve]] or [[mention:userId|Full Name]]
const INLINE_MARKER_REGEX = /\[\[(shot|mention):([^\]]+)\]\]/g;

type CommentSegment =
  | { type: 'text'; value: string }
  | { type: 'shot'; name: string }
  | { type: 'mention'; id: string; name: string };

/** Split comment text into segments: plain text, shot chips, or mention chips. */
export function parseCommentTextWithShots(text: string): CommentSegment[] {
  const segments: CommentSegment[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  INLINE_MARKER_REGEX.lastIndex = 0;
  while ((m = INLINE_MARKER_REGEX.exec(text)) !== null) {
    if (m.index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, m.index) });
    }
    const kind = m[1];
    const payload = m[2];
    if (kind === 'shot') {
      segments.push({ type: 'shot', name: payload });
    } else if (kind === 'mention') {
      const [id, name] = payload.split('|');
      segments.push({ type: 'mention', id, name: name ?? id });
    }
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) });
  }
  return segments.length ? segments : [{ type: 'text', value: text }];
}

const SHOT_PILL_STYLE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  margin: '0 2px',
  padding: '2px 8px',
  borderRadius: RADIUS.sm,
  border: '1px solid rgba(212, 168, 75, 0.6)',
  backgroundColor: 'rgba(212, 168, 75, 0.14)',
  color: '#8B6914',
  ...TYPOGRAPHY.label,
  fontWeight: 600,
};

const MENTION_PILL_STYLE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  margin: '0 2px',
  padding: '2px 8px',
  borderRadius: RADIUS.sm,
  border: '1px solid rgba(80, 140, 255, 0.6)',
  backgroundColor: 'rgba(80, 140, 255, 0.12)',
  color: '#1D4ED8',
  ...TYPOGRAPHY.label,
  fontWeight: 600,
};

/** Serialize contenteditable DOM to [[shot:...]] / [[mention:...]] string and get selection offset. */
function serializeContentEditable(container: Node, selection: Selection): { text: string; cursorOffset: number } {
  let text = '';
  let cursorOffset = 0;
  function walk(node: Node, currentOffset: number): number {
    if (node.nodeType === Node.TEXT_NODE) {
      const content = node.textContent || '';
      if (node === selection.anchorNode) {
        cursorOffset = currentOffset + Math.min(selection.anchorOffset, content.length);
      }
      text += content;
      return currentOffset + content.length;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const dataShot = el.getAttribute?.('data-shot');
      const mentionId = el.getAttribute?.('data-mention-id');
      const mentionName = el.getAttribute?.('data-mention-name');
      if (dataShot != null || mentionId != null) {
        const marker =
          dataShot != null
            ? `[[shot:${dataShot}]]`
            : `[[mention:${mentionId}|${mentionName ?? ''}]]`;
        if (node === selection.anchorNode) {
          cursorOffset = currentOffset + (selection.anchorOffset > 0 ? marker.length : 0);
        }
        text += marker;
        return currentOffset + marker.length;
      }
      if (el.tagName === 'BR') {
        if (node === selection.anchorNode) {
          cursorOffset = currentOffset + (selection.anchorOffset > 0 ? 1 : 0);
        }
        text += '\n';
        return currentOffset + 1;
      }
      let off = currentOffset;
      for (let i = 0; i < node.childNodes.length; i++) {
        off = walk(node.childNodes[i], off);
      }
      return off;
    }
    return currentOffset;
  }
  walk(container, 0);
  return { text, cursorOffset };
}

/** Build and set contenteditable DOM from draft string (no React children = no removeChild conflicts). */
function syncContentEditableFromDraft(container: HTMLElement, draft: string): void {
  const segments = parseCommentTextWithShots(draft);
  const fragment = document.createDocumentFragment();
  for (const seg of segments) {
    if (seg.type === 'text') {
      fragment.appendChild(document.createTextNode(seg.value));
    } else {
      const span = document.createElement('span');
      if (seg.type === 'shot') {
        span.setAttribute('data-shot', seg.name);
      } else if (seg.type === 'mention') {
        span.setAttribute('data-mention-id', seg.id);
        span.setAttribute('data-mention-name', seg.name);
      }
      span.contentEditable = 'false';
      const s = span.style;
      s.display = 'inline-flex';
      s.alignItems = 'center';
      s.margin = '0 2px';
      s.padding = '2px 8px';
      s.borderRadius = `${RADIUS.sm}px`;
      if (seg.type === 'shot') {
        s.border = '1px solid rgba(212, 168, 75, 0.6)';
        s.backgroundColor = 'rgba(212, 168, 75, 0.14)';
        s.color = '#8B6914';
      } else {
        s.border = '1px solid rgba(80, 140, 255, 0.6)';
        s.backgroundColor = 'rgba(80, 140, 255, 0.12)';
        s.color = '#1D4ED8';
      }
      s.fontSize = TYPOGRAPHY.label.fontSize;
      s.fontWeight = String(TYPOGRAPHY.label.fontWeight ?? 500);
      s.lineHeight = TYPOGRAPHY.label.lineHeight;
      span.textContent = seg.type === 'shot' ? seg.name : seg.name;
      fragment.appendChild(span);
    }
  }
  container.replaceChildren(fragment);
}

/** Set selection in contenteditable at given offset in serialized string. */
function setContentEditableCursor(container: Node, offset: number): void {
  const sel = window.getSelection();
  if (!sel) return;
  const selection = sel;
  let current = 0;
  function walk(node: Node): boolean {
    if (node.nodeType === Node.TEXT_NODE) {
      const len = (node.textContent || '').length;
      if (current + len >= offset) {
        const range = document.createRange();
        range.setStart(node, Math.min(offset - current, len));
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        return true;
      }
      current += len;
      return false;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const dataShot = el.getAttribute?.('data-shot');
      if (dataShot != null) {
        const markerLen = `[[shot:${dataShot}]]`.length;
        if (current + markerLen >= offset) {
          const range = document.createRange();
          range.setStart(node, offset - current <= 0 ? 0 : 1);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
          return true;
        }
        current += markerLen;
        return false;
      }
      if (el.tagName === 'BR') {
        if (current + 1 >= offset) {
          const range = document.createRange();
          range.setStart(node, offset - current <= 0 ? 0 : 1);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
          return true;
        }
        current += 1;
        return false;
      }
      for (let i = 0; i < node.childNodes.length; i++) {
        if (walk(node.childNodes[i])) return true;
      }
      return false;
    }
    return false;
  }
  walk(container);
}

/** Get the pixel offset (from top of container) just below the current caret line. */
function getCaretTopOffset(container: HTMLElement): number {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return 0;
  const range = sel.getRangeAt(0).cloneRange();
  if (!container.contains(range.startContainer)) return 0;
  range.collapse(true);
  const rects = range.getClientRects();
  if (!rects.length) return 0;
  const caretRect = rects[0];
  const containerRect = container.getBoundingClientRect();
  const offset = caretRect.bottom - containerRect.top;
  return Math.max(0, offset);
}

import {
  fetchSessionComments,
  insertSessionComment,
  mapDbCommentToSessionComment,
  fetchSessionTaggableProfiles,
} from '@/lib/sessionComments';
import { useAuth } from './providers/AuthProvider';

declare global {
  interface Window {
    YT?: { Player: new (el: string | HTMLElement, opts: object) => YTPlayer; PlayerState: { PLAYING: number; PAUSED: number; ENDED: number } };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
}

/** Load YouTube IFrame API. Resolves when ready. */
function loadYoutubeAPI(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  return new Promise((resolve) => {
    window.onYouTubeIframeAPIReady = () => resolve();
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const first = document.getElementsByTagName('script')[0];
      first.parentNode?.insertBefore(tag, first);
    }
  });
}

/** Extract YouTube video ID from watch or share link. Returns null if not YouTube. */
function getYoutubeVideoId(url: string): string | null {
  const watchMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];
  const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];
  return null;
}

export interface TrainingSessionDetailProps {
  sessionId: string;
  onBack: () => void;
  /** When provided (e.g. sessions from DB for a student), lookup session from this list. Otherwise uses TRAINING_SESSIONS. */
  sessions?: TrainingSession[];
  /** When provided (e.g. admin), allows adding a YouTube URL when session has no video. Called with session id and the new YouTube URL; persist to sessions.youtube_url. */
  onSaveVideoUrl?: (sessionId: string, youtubeUrl: string) => Promise<void>;
}

export const TrainingSessionDetail: React.FC<TrainingSessionDetailProps> = ({
  sessionId,
  onBack,
  sessions: sessionsProp,
  onSaveVideoUrl,
}) => {
  const { user } = useAuth();
  const sessionList = sessionsProp ?? TRAINING_SESSIONS;
  const session = sessionList.find((s) => s.id === sessionId);
  const hasVideoUrl = !!(session?.videoUrl?.trim());
  const youtubeVideoId = session ? getYoutubeVideoId(session.videoUrl) : null;
  const isYoutube = !!youtubeVideoId;
  const canAddVideoUrl = !!onSaveVideoUrl;
  const isDbSession = sessionsProp != null && session != null;

  const [showAddUrlForm, setShowAddUrlForm] = useState(false);
  const [addUrlDraft, setAddUrlDraft] = useState('');
  const [addUrlSaving, setAddUrlSaving] = useState(false);
  const [addUrlError, setAddUrlError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const commentInputRef = useRef<HTMLDivElement>(null);
  const pendingCursorRef = useRef<number | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const videoPlayerWrapperRef = useRef<HTMLDivElement>(null);
  const videoStickySentinelRef = useRef<HTMLDivElement>(null);
  const videoStickySpacerRef = useRef<HTMLDivElement>(null);

  const [isNarrow, setIsNarrow] = useState(false);
  /** When set, video is "stuck" (position: fixed) and spacer holds layout. Only used when isNarrow. */
  const [videoStickyBox, setVideoStickyBox] = useState<{
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [includeTimestamp, setIncludeTimestamp] = useState(true);
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  /** Intrinsic aspect ratio of the video (e.g. '16/9') so container height matches video and no letterboxing. */
  const [videoAspectRatio, setVideoAspectRatio] = useState<string | null>(null);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [postingComment, setPostingComment] = useState(false);
  const [taggableProfiles, setTaggableProfiles] = useState<{ id: string; name: string }[]>([]);
  const [selectedMentionIds, setSelectedMentionIds] = useState<string[]>([]);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  /** "/" command menu for shots: when set, show dropdown; query filters SHOT_LIST; highlightIndex for keyboard nav. */
  const [shotMenu, setShotMenu] = useState<{ query: string; slashStart: number; highlightIndex: number } | null>(null);
  /** "@" command menu for mentions: when set, show dropdown of taggableProfiles. */
  const [mentionMenu, setMentionMenu] = useState<{ query: string; atStart: number; highlightIndex: number } | null>(null);
  /** Vertical position (px from top of comment input) where inline dropdowns should appear. */
  const [inlineMenuTop, setInlineMenuTop] = useState<number | null>(null);
  type CommentSortMode = 'date-asc' | 'date-desc' | 'timestamp-asc' | 'timestamp-desc';
  const [commentSort, setCommentSort] = useState<CommentSortMode>('timestamp-asc');
  /** Comment id to scroll to and highlight when its timestamp is reached or a timestamp dot is selected. */
  const [activeCommentId, setActiveCommentId] = useState<string | number | null>(null);
  const commentsScrollRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    const updateLayout = () => {
      if (typeof window === 'undefined') return;
      setIsNarrow(window.innerWidth < 768);
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
    const supabase = createClient();
    setCommentsLoading(true);
    Promise.all([
      isDbSession ? fetchSessionComments(supabase, sessionId) : Promise.resolve([]),
      fetchSessionTaggableProfiles(supabase, sessionId),
    ])
      .then(([rows, taggable]) => {
        if (Array.isArray(rows) && rows.length > 0) {
          setComments(rows.map((r) => mapDbCommentToSessionComment(r, user?.id ?? null)));
        }
        setTaggableProfiles(taggable);
      })
      .finally(() => setCommentsLoading(false));
  }, [isDbSession, sessionId, user?.id]);

  useEffect(() => {
    const t = setTimeout(() => setVideoError(null), 0);
    return () => clearTimeout(t);
  }, [sessionId]);

  // Reset aspect ratio when session changes so we don't reuse a previous video's ratio
  useEffect(() => {
    setVideoAspectRatio(null);
  }, [sessionId]);

  // Load YouTube API and create player when YouTube video
  useEffect(() => {
    if (!isYoutube || !youtubeVideoId || !playerContainerRef.current) return;

    let pollId: ReturnType<typeof setInterval> | null = null;

    const createPlayer = (yt: NonNullable<typeof window.YT>) => {
      playerRef.current = new yt.Player(playerContainerRef.current!, {
        videoId: youtubeVideoId,
        playerVars: {
          controls: 0,
          disablekb: 0,
          playsinline: 1,
          rel: 0,
        },
        events: {
          onReady: (e: { target: YTPlayer }) => {
            const p = e.target;
            const dur = p.getDuration();
            if (dur && isFinite(dur)) setVideoDuration(dur);
            setIsMuted(p.isMuted());
            pollId = setInterval(() => {
              if (!playerRef.current) return;
              try {
                const t = playerRef.current.getCurrentTime();
                if (isFinite(t)) setCurrentVideoTime(t);
                const d = playerRef.current.getDuration();
                if (isFinite(d) && d > 0) setVideoDuration(d);
              } catch { /* ignore getCurrentTime/getDuration errors */ }
            }, 250);
          },
          onStateChange: (e: { data: number }) => {
            const YT = window.YT!;
            if (e.data === YT.PlayerState.PLAYING) setIsVideoPlaying(true);
            else if (e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.ENDED)
              setIsVideoPlaying(false);
          },
        },
      });
    };

    if (window.YT?.Player) {
      createPlayer(window.YT);
    } else {
      loadYoutubeAPI().then(() => {
        if (window.YT?.Player && playerContainerRef.current) createPlayer(window.YT);
      });
    }

    return () => {
      if (pollId) clearInterval(pollId);
      if (playerRef.current?.pauseVideo) playerRef.current.pauseVideo();
      playerRef.current = null;
    };
  }, [isYoutube, youtubeVideoId, sessionId]);

  const handlePlayPause = useCallback(async () => {
    setVideoError(null);
    if (isYoutube && playerRef.current) {
      const p = playerRef.current;
      if (typeof p.getPlayerState !== 'function') return; // player not ready yet
      const state = p.getPlayerState();
      const YT = window.YT!;
      if (state === YT.PlayerState.PLAYING) p.pauseVideo();
      else p.playVideo();
      return;
    }
    const v = videoRef.current;
    if (!v) return;
    try {
      if (v.paused) {
        await v.play();
      } else {
        v.pause();
      }
    } catch {
      v.muted = true;
      setIsMuted(true);
      await v.play().catch(() => {});
    }
  }, [isYoutube]);

  const seekTo = useCallback(
    (seconds: number) => {
      if (isYoutube && playerRef.current) {
        const p = playerRef.current;
        if (typeof p.seekTo === 'function') p.seekTo(seconds, true);
        if (typeof p.playVideo === 'function') p.playVideo();
        return;
      }
      const video = videoRef.current;
      if (!video) return;
      video.currentTime = seconds;
      video.play().catch(() => {});
    },
    [isYoutube]
  );

  const handleMuteToggle = useCallback(() => {
    if (isYoutube && playerRef.current) {
      const p = playerRef.current;
      if (typeof p.isMuted !== 'function') return;
      if (p.isMuted()) {
        p.unMute();
        setIsMuted(false);
      } else {
        p.mute();
        setIsMuted(true);
      }
      return;
    }
    setIsMuted((m) => !m);
  }, [isYoutube]);

  const skipBy = useCallback(
    (deltaSeconds: number) => {
      const getNow = () => {
        if (isYoutube && playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
          return playerRef.current.getCurrentTime();
        }
        return videoRef.current?.currentTime ?? 0;
      };
      const dur = videoDuration || (videoRef.current?.duration ?? 0);
      const now = getNow();
      const next = Math.max(0, Math.min(dur, now + deltaSeconds));
      seekTo(next);
    },
    [isYoutube, videoDuration, seekTo]
  );

  const sortedCommentTimestamps = useMemo(
    () =>
      [...new Set(comments.filter((c) => c.timestampSeconds != null).map((c) => c.timestampSeconds!))].sort(
        (a, b) => a - b
      ),
    [comments]
  );

  const getCurrentTime = useCallback(() => {
    if (isYoutube && playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
      return playerRef.current.getCurrentTime();
    }
    return videoRef.current?.currentTime ?? 0;
  }, [isYoutube]);

  const goToPrevTimestamp = useCallback(() => {
    if (sortedCommentTimestamps.length === 0) return;
    const now = getCurrentTime();
    const prev = sortedCommentTimestamps.filter((t) => t < now - 0.5).pop();
    const target = prev ?? sortedCommentTimestamps[sortedCommentTimestamps.length - 1];
    seekTo(target);
  }, [sortedCommentTimestamps, getCurrentTime, seekTo]);

  const goToNextTimestamp = useCallback(() => {
    if (sortedCommentTimestamps.length === 0) return;
    const now = getCurrentTime();
    const next = sortedCommentTimestamps.find((t) => t > now + 0.5);
    const target = next ?? sortedCommentTimestamps[0];
    seekTo(target);
  }, [sortedCommentTimestamps, getCurrentTime, seekTo]);

  const sortedComments = useMemo(() => {
    if (commentSort === 'date-asc' || commentSort === 'date-desc') {
      const desc = commentSort === 'date-desc';
      return [...comments].map((c, i) => ({ c, i })).sort((a, b) => {
        const isoA = a.c.createdAtIso ?? '';
        const isoB = b.c.createdAtIso ?? '';
        if (isoA && isoB) return desc ? isoB.localeCompare(isoA) : isoA.localeCompare(isoB);
        return a.i - b.i;
      }).map(({ c }) => c);
    }
    const asc = commentSort === 'timestamp-asc';
    return [...comments].sort((a, b) => {
      const hasA = a.timestampSeconds != null ? 1 : 0;
      const hasB = b.timestampSeconds != null ? 1 : 0;
      // Comments without a timestamp always on top when sorted by time
      if (hasA !== hasB) return hasA - hasB;
      if (hasA && hasB) {
        const ta = a.timestampSeconds ?? 0;
        const tb = b.timestampSeconds ?? 0;
        return asc ? ta - tb : tb - ta;
      }
      return 0;
    });
  }, [comments, commentSort]);

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

  const formatTimestamp = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(1, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleAddComment = async () => {
    if (!commentDraft.trim()) return;

    const currentTime = isYoutube && playerRef.current && typeof playerRef.current.getCurrentTime === 'function'
      ? playerRef.current.getCurrentTime()
      : videoRef.current?.currentTime ?? 0;
    const timestampSeconds = includeTimestamp ? Math.round(currentTime) : null;

    if (isDbSession && user?.id) {
      const supabase = createClient();
      setPostingComment(true);
      try {
        const inserted = await insertSessionComment(
          supabase,
          sessionId,
          user.id,
          commentDraft.trim(),
          timestampSeconds,
          selectedMentionIds
        );
        if (inserted) {
          const mapped = mapDbCommentToSessionComment(inserted, user.id);
          setComments((prev) => [...prev, mapped]);
          setCommentDraft('');
          setSelectedMentionIds([]);
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
    };
    setComments((prev) => [...prev, newComment]);
    setCommentDraft('');
  };

  const filteredShots = useMemo(() => {
    if (!shotMenu) return [];
    const q = shotMenu.query.trim().toLowerCase();
    if (!q) return [...SHOT_LIST];
    return SHOT_LIST.filter((shot) => shot.toLowerCase().includes(q));
  }, [shotMenu?.query]);

  const filteredMentions = useMemo(() => {
    if (!mentionMenu) return [];
    const q = mentionMenu.query.trim().toLowerCase();
    const base = taggableProfiles;
    if (!q) return base;
    return base.filter((p) => p.name.toLowerCase().includes(q));
  }, [mentionMenu?.query, taggableProfiles]);

  const handleCommentInput = useCallback(() => {
    const container = commentInputRef.current;
    const sel = window.getSelection();
    if (!container || !sel || !container.contains(sel.anchorNode)) return;
    const { text, cursorOffset } = serializeContentEditable(container, sel);
    setCommentDraft(text);
    pendingCursorRef.current = cursorOffset;
    const beforeCursor = text.slice(0, cursorOffset);
    const lastSlash = beforeCursor.lastIndexOf('/');
    const lastAt = beforeCursor.lastIndexOf('@');

    let anyMenu = false;
    if (lastSlash !== -1 && !beforeCursor.slice(lastSlash).includes('\n')) {
      setShowTagDropdown(false);
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

  const handleCommentKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === '/' || e.key === '@') {
        e.preventDefault();
        const container = commentInputRef.current;
        const sel = window.getSelection();
        if (!container || !sel || !container.contains(sel.anchorNode)) return;
        const { text, cursorOffset } = serializeContentEditable(container, sel);
        const char = e.key;
        const newText = text.slice(0, cursorOffset) + char + text.slice(cursorOffset);
        setCommentDraft(newText);
        pendingCursorRef.current = cursorOffset + 1;
        setShowTagDropdown(false);
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
        // Add extra offset so dropdown appears just below the typing line
        setInlineMenuTop(getCaretTopOffset(container) + 20);
        commentInputRef.current?.focus();
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
          const container = commentInputRef.current;
          const sel = window.getSelection();
          if (!container || !sel || !container.contains(sel.anchorNode)) return;
          const { text, cursorOffset } = serializeContentEditable(container, sel);
          if (shotMenu && filteredShots.length > 0) {
            const shot = filteredShots[shotMenu.highlightIndex];
            if (shot) {
              const start = shotMenu.slashStart;
              const replacement = `[[shot:${shot}]] `;
              const nextDraft = text.slice(0, start) + replacement + text.slice(cursorOffset);
              setCommentDraft(nextDraft);
              setShotMenu(null);
              pendingCursorRef.current = start + replacement.length;
              commentInputRef.current?.focus();
            }
          } else if (mentionMenu && filteredMentions.length > 0) {
            const mention = filteredMentions[mentionMenu.highlightIndex];
            if (mention) {
              const start = mentionMenu.atStart;
              const marker = `[[mention:${mention.id}|${mention.name}]] `;
              const nextDraft = text.slice(0, start) + marker + text.slice(cursorOffset);
              setCommentDraft(nextDraft);
              setMentionMenu(null);
              pendingCursorRef.current = start + marker.length;
              commentInputRef.current?.focus();
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
    },
    [shotMenu, mentionMenu, filteredShots, filteredMentions, commentDraft, isDbSession, taggableProfiles]
  );

  const selectShotFromMenu = useCallback(
    (shot: string) => {
      if (!shotMenu) return;
      const container = commentInputRef.current;
      const sel = window.getSelection();
      if (!container || !sel || !container.contains(sel.anchorNode)) return;
      const { text, cursorOffset } = serializeContentEditable(container, sel);
      const start = shotMenu.slashStart;
      const replacement = `[[shot:${shot}]] `;
      const nextDraft = text.slice(0, start) + replacement + text.slice(cursorOffset);
      setCommentDraft(nextDraft);
      setShotMenu(null);
      pendingCursorRef.current = start + replacement.length;
      commentInputRef.current?.focus();
      if (!mentionMenu) setInlineMenuTop(null);
    },
    [shotMenu, mentionMenu]
  );

  const selectMentionFromMenu = useCallback(
    (mentionId: string) => {
      if (!mentionMenu) return;
      const mention = taggableProfiles.find((p) => p.id === mentionId);
      if (!mention) return;
      const container = commentInputRef.current;
      const sel = window.getSelection();
      if (!container || !sel || !container.contains(sel.anchorNode)) return;
      const { text, cursorOffset } = serializeContentEditable(container, sel);
      const start = mentionMenu.atStart;
      const marker = `[[mention:${mention.id}|${mention.name}]] `;
      const nextDraft = text.slice(0, start) + marker + text.slice(cursorOffset);
      setCommentDraft(nextDraft);
      setMentionMenu(null);
      pendingCursorRef.current = start + marker.length;
      commentInputRef.current?.focus();
      setSelectedMentionIds((prev) =>
        prev.includes(mention.id) ? prev : [...prev, mention.id]
      );
    },
    [mentionMenu, taggableProfiles]
  );

  if (!session) {
    return null;
  }

  return (
    <div
      style={{
        backgroundColor: 'transparent',
        minHeight: '100vh',
        padding: `${SPACING.md}px`,
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {/* Header */}
        <div
          style={{
            marginBottom: SPACING.lg,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: SPACING.sm,
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              gap: SPACING.xs,
              color: COLORS.textSecondary,
              ...TYPOGRAPHY.bodySmall,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            ← Back to My Progress
          </button>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              color: COLORS.textSecondary,
              ...TYPOGRAPHY.bodySmall,
            }}
          >
            <span role="img" aria-label="calendar">
              <IconCalendar size={16} />
            </span>
            <span>{session.dateLabel}</span>
          </span>
        </div>

        {/* Main content */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isNarrow
              ? 'minmax(0, 1fr)'
              : 'minmax(0, 7fr) minmax(0, 5fr)',
            gap: SPACING.lg,
          }}
        >
          {/* Video + session info */}
          <div style={{ minWidth: 0 }}>
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
                left: isNarrow && videoStickyBox ? videoStickyBox.left : undefined,
                borderRadius: RADIUS.lg,
                overflow: 'hidden',
                background:
                  'radial-gradient(circle at 10% 20%, #31cb00 0%, #1C1C1E 45%, #000000 100%)',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.28)',
                marginBottom: SPACING.md,
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <div style={{ position: 'relative', width: '100%' }}>
              {!hasVideoUrl ? (
                canAddVideoUrl ? (
                  <div
                    style={{
                      width: '100%',
                      aspectRatio: '16 / 9',
                      minHeight: 200,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: SPACING.lg,
                      gap: SPACING.md,
                    }}
                  >
                    {!showAddUrlForm ? (
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddUrlForm(true);
                          setAddUrlError(null);
                          setAddUrlDraft('');
                        }}
                        style={{
                          padding: `${SPACING.sm}px ${SPACING.lg}px`,
                          borderRadius: RADIUS.md,
                          border: `2px solid ${COLORS.primary}`,
                          backgroundColor: 'rgba(49, 203, 0, 0.15)',
                          color: COLORS.primary,
                          ...TYPOGRAPHY.labelMed,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Add Video URL
                      </button>
                    ) : (
                      <>
                        <p
                          style={{
                            margin: 0,
                            ...TYPOGRAPHY.bodySmall,
                            color: 'rgba(255,255,255,0.9)',
                          }}
                        >
                          Enter a YouTube URL only
                        </p>
                        <input
                          type="url"
                          value={addUrlDraft}
                          onChange={(e) => {
                            setAddUrlDraft(e.target.value);
                            setAddUrlError(null);
                          }}
                          placeholder="https://www.youtube.com/watch?v=..."
                          style={{
                            width: '100%',
                            maxWidth: 400,
                            padding: `${SPACING.sm}px ${SPACING.md}px`,
                            borderRadius: RADIUS.sm,
                            border: `1px solid rgba(255,255,255,0.3)`,
                            backgroundColor: 'rgba(0,0,0,0.3)',
                            color: COLORS.textPrimary,
                            ...TYPOGRAPHY.bodySmall,
                          }}
                        />
                        {addUrlError && (
                          <p style={{ margin: 0, ...TYPOGRAPHY.bodySmall, color: '#ff6b6b' }}>
                            {addUrlError}
                          </p>
                        )}
                        <div style={{ display: 'flex', gap: SPACING.sm }}>
                          <button
                            type="button"
                            onClick={() => {
                              setShowAddUrlForm(false);
                              setAddUrlDraft('');
                              setAddUrlError(null);
                            }}
                            style={{
                              padding: `${SPACING.xs}px ${SPACING.md}px`,
                              borderRadius: RADIUS.sm,
                              border: 'none',
                              backgroundColor: 'rgba(255,255,255,0.2)',
                              color: 'rgba(255,255,255,0.95)',
                              ...TYPOGRAPHY.label,
                              cursor: 'pointer',
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={addUrlSaving || !addUrlDraft.trim()}
                            onClick={async () => {
                              const trimmed = addUrlDraft.trim();
                              if (!trimmed || !session) return;
                              const vid = getYoutubeVideoId(trimmed);
                              if (!vid) {
                                setAddUrlError('Only YouTube URLs are allowed (e.g. youtube.com/watch?v=... or youtu.be/...)');
                                return;
                              }
                              setAddUrlError(null);
                              setAddUrlSaving(true);
                              try {
                                await onSaveVideoUrl!(session.id, trimmed);
                                setShowAddUrlForm(false);
                                setAddUrlDraft('');
                              } catch (e) {
                                setAddUrlError(e instanceof Error ? e.message : 'Failed to save URL');
                              } finally {
                                setAddUrlSaving(false);
                              }
                            }}
                            style={{
                              padding: `${SPACING.xs}px ${SPACING.md}px`,
                              borderRadius: RADIUS.sm,
                              border: 'none',
                              backgroundColor: COLORS.primary,
                              color: COLORS.textPrimary,
                              ...TYPOGRAPHY.label,
                              fontWeight: 600,
                              cursor: addUrlSaving ? 'default' : 'pointer',
                              opacity: addUrlSaving ? 0.8 : 1,
                            }}
                          >
                            {addUrlSaving ? 'Saving…' : 'Save'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div
                    style={{
                      width: '100%',
                      aspectRatio: '16 / 9',
                      minHeight: 200,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: SPACING.lg,
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        ...TYPOGRAPHY.bodySmall,
                        color: 'rgba(255,255,255,0.7)',
                      }}
                    >
                      No video for this session.
                    </p>
                  </div>
                )
              ) : isYoutube && youtubeVideoId ? (
                <>
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      aspectRatio: '16 / 9',
                      overflow: 'hidden',
                    }}
                  >
                  <div
                    ref={playerContainerRef}
                    key={`yt-${session.id}`}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      display: 'block',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      zIndex: 1,
                      pointerEvents: !isVideoPlaying ? 'auto' : 'none',
                    }}
                    onClick={handlePlayPause}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        handlePlayPause();
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={isVideoPlaying ? 'Pause video' : 'Play video'}
                  >
                  </div>
                  </div>
                </>
              ) : (
                <>
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: videoAspectRatio ?? '16 / 9',
                }}
              >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 1,
                  pointerEvents: !isVideoPlaying ? 'auto' : 'none',
                }}
                onClick={handlePlayPause}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    handlePlayPause();
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={isVideoPlaying ? 'Pause video' : 'Play video'}
              >
              {videoError && (
                <div
                  style={{
                    padding: SPACING.md,
                    textAlign: 'center',
                    color: 'rgba(255,255,255,0.95)',
                    ...TYPOGRAPHY.bodySmall,
                    maxWidth: 280,
                  }}
                >
                  {videoError}
                </div>
              )}
              </div>
              <video
                key={session.id}
                ref={videoRef}
                muted={isMuted}
                playsInline
                preload="metadata"
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'block',
                  objectFit: 'contain',
                }}
                onPlay={() => setIsVideoPlaying(true)}
                onPause={() => setIsVideoPlaying(false)}
                onEnded={() => setIsVideoPlaying(false)}
                onTimeUpdate={(e) =>
                  setCurrentVideoTime((e.target as HTMLVideoElement).currentTime)
                }
                onLoadedMetadata={(e) => {
                  const v = e.target as HTMLVideoElement;
                  setVideoDuration(v.duration);
                  setVideoError(null);
                  const w = v.videoWidth;
                  const h = v.videoHeight;
                  if (w && h) setVideoAspectRatio(`${w} / ${h}`);
                }}
                onError={() => {
                  setVideoError('Video failed to load. The source may be unavailable or blocked.');
                }}
              >
                <source src={session.videoUrl} type="video/mp4" />
              </video>
              </div>
              </>
              )}
              </div>

              {/* Frame.io-style timeline with comment markers */}
              {videoDuration > 0 && (
                <div
                  style={{
                    padding: `0 ${SPACING.md}px ${SPACING.sm}px`,
                    backgroundColor: 'transparent',
                    borderTop: 'none',
                  }}
                >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: SPACING.sm,
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'inherit',
                      fontSize: 12,
                      color: '#FFFFFF',
                      minWidth: 56,
                      flexShrink: 0,
                    }}
                  >
                    {formatTimestamp(currentVideoTime)} / {formatTimestamp(videoDuration)}
                  </span>
                    <div
                      style={{
                        flex: 1,
                        position: 'relative',
                        height: 20,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        minWidth: 0,
                      }}
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const pct = Math.max(0, Math.min(1, x / rect.width));
                        const time = pct * videoDuration;
                        seekTo(time);
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          height: 4,
                          backgroundColor: '#6B7280',
                          borderRadius: 2,
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          left: `calc(${(currentVideoTime / videoDuration) * 100}% - 6px)`,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          backgroundColor: '#FFFFFF',
                          boxShadow: '0 0 0 1px rgba(0,0,0,0.2)',
                          pointerEvents: 'none',
                        }}
                      />
                      {comments
                        .filter((c) => c.timestampSeconds != null)
                        .map((c) => {
                          const left =
                            ((c.timestampSeconds ?? 0) / videoDuration) * 100;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                seekTo(c.timestampSeconds!);
                                setActiveCommentId(c.id);
                              }}
                              style={{
                                position: 'absolute',
                                left: `calc(${left}% - 4px)`,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 0,
                              }}
                              title={`${c.author}: ${c.text.length > 45 ? c.text.slice(0, 45) + '…' : c.text}`}
                            />
                          );
                        })}
                    </div>
                  <button
                    type="button"
                    onClick={handleMuteToggle}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      border: 'none',
                      backgroundColor: 'rgba(0, 0, 0, 0.6)',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      padding: 0,
                      flexShrink: 0,
                    }}
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? (
                      <IconVolumeX size={16} />
                    ) : (
                      <IconVolume2 size={16} />
                    )}
                  </button>
                  </div>
                {/* Skip buttons below the player */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: SPACING.sm,
                    paddingTop: SPACING.xs,
                    paddingBottom: SPACING.xs,
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <button
                    type="button"
                    onClick={goToPrevTimestamp}
                    disabled={sortedCommentTimestamps.length === 0}
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      border: '1px solid rgba(255, 255, 255, 0.35)',
                      backgroundColor: 'rgba(255, 255, 255, 0.15)',
                      color: 'rgba(255, 255, 255, 0.95)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: sortedCommentTimestamps.length === 0 ? 'default' : 'pointer',
                      padding: 0,
                      opacity: sortedCommentTimestamps.length === 0 ? 0.5 : 1,
                    }}
                    aria-label="Previous comment timestamp"
                    title="Previous timestamp"
                  >
                    <IconChevronLeft size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => skipBy(-10)}
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      border: '1px solid rgba(255, 255, 255, 0.35)',
                      backgroundColor: 'rgba(255, 255, 255, 0.15)',
                      color: 'rgba(255, 255, 255, 0.95)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      padding: 0,
                      ...TYPOGRAPHY.label,
                      fontSize: 9,
                    }}
                    aria-label="Skip back 10 seconds"
                    title="−10s"
                  >
                    −10s
                  </button>
                  <button
                    type="button"
                    onClick={() => skipBy(-5)}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      border: '1px solid rgba(255, 255, 255, 0.35)',
                      backgroundColor: 'rgba(255, 255, 255, 0.15)',
                      color: 'rgba(255, 255, 255, 0.95)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      padding: 0,
                      ...TYPOGRAPHY.label,
                      fontSize: 11,
                    }}
                    aria-label="Skip back 5 seconds"
                    title="−5s"
                  >
                    −5s
                  </button>
                  <button
                    type="button"
                    onClick={handlePlayPause}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      border: '1px solid rgba(255, 255, 255, 0.4)',
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      color: 'rgba(0, 0, 0, 0.85)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      padding: 0,
                      flexShrink: 0,
                    }}
                    aria-label={isVideoPlaying ? 'Pause' : 'Play'}
                    title={isVideoPlaying ? 'Pause' : 'Play'}
                  >
                    {isVideoPlaying ? (
                      <IconPause size={18} />
                    ) : (
                      <IconPlay size={18} />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => skipBy(5)}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      border: '1px solid rgba(255, 255, 255, 0.35)',
                      backgroundColor: 'rgba(255, 255, 255, 0.15)',
                      color: 'rgba(255, 255, 255, 0.95)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      padding: 0,
                      ...TYPOGRAPHY.label,
                      fontSize: 11,
                    }}
                    aria-label="Skip forward 5 seconds"
                    title="+5s"
                  >
                    +5s
                  </button>
                  <button
                    type="button"
                    onClick={() => skipBy(10)}
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      border: '1px solid rgba(255, 255, 255, 0.35)',
                      backgroundColor: 'rgba(255, 255, 255, 0.15)',
                      color: 'rgba(255, 255, 255, 0.95)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      padding: 0,
                      ...TYPOGRAPHY.label,
                      fontSize: 9,
                    }}
                    aria-label="Skip forward 10 seconds"
                    title="+10s"
                  >
                    +10s
                  </button>
                  <button
                    type="button"
                    onClick={goToNextTimestamp}
                    disabled={sortedCommentTimestamps.length === 0}
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      border: '1px solid rgba(255, 255, 255, 0.35)',
                      backgroundColor: 'rgba(255, 255, 255, 0.15)',
                      color: 'rgba(255, 255, 255, 0.95)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: sortedCommentTimestamps.length === 0 ? 'default' : 'pointer',
                      padding: 0,
                      opacity: sortedCommentTimestamps.length === 0 ? 0.5 : 1,
                    }}
                    aria-label="Next comment timestamp"
                    title="Next timestamp"
                  >
                    <IconChevronRight size={12} />
                  </button>
                </div>
              </div>
              )}
            </div>
          </div>

          {/* Comments column */}
          <div
            style={{
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              maxHeight: isNarrow ? 'none' : 520,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: SPACING.sm,
                marginBottom: SPACING.sm,
              }}
            >
              <h3
                style={{
                  ...TYPOGRAPHY.bodySmall,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  color: COLORS.textSecondary,
                  margin: 0,
                }}
              >
                Comments
              </h3>
              <button
                type="button"
                onClick={() =>
                  setCommentSort((s) =>
                    s === 'date-desc'
                      ? 'date-asc'
                      : s === 'date-asc'
                        ? 'timestamp-asc'
                        : s === 'timestamp-asc'
                          ? 'timestamp-desc'
                          : 'date-desc'
                  )
                }
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 8px',
                  borderRadius: RADIUS.sm,
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  color: COLORS.textSecondary,
                  ...TYPOGRAPHY.label,
                  fontSize: 11,
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
                aria-label={`Sort: ${commentSort}`}
                title={`Sort: ${commentSort.replace('-', ' ')}. Click to cycle.`}
              >
                {commentSort.startsWith('date') ? (
                  <>
                    <IconCalendar size={12} />
                    Date {commentSort === 'date-desc' ? '↓' : '↑'}
                  </>
                ) : (
                  <>
                    <IconClock size={12} />
                    Time {commentSort === 'timestamp-desc' ? '↓' : '↑'}
                  </>
                )}
              </button>
            </div>

            <div
              ref={commentsScrollRef}
              style={{
                flex: 1,
                overflowY: 'auto',
                paddingRight: SPACING.sm,
                marginBottom: SPACING.md,
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
              ) : (
                sortedComments.map((comment) => {
                  const isCoach = comment.role === 'Coach';
                  const isActive = activeCommentId !== null && comment.id === activeCommentId;

                  return (
                    <div
                      key={comment.id}
                      data-comment-id={comment.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: SPACING.sm,
                        padding: `${SPACING.sm}px ${SPACING.sm}px`,
                        margin: `0 -${SPACING.xs}px`,
                        borderBottom: `1px solid ${COLORS.backgroundLight}`,
                        backgroundColor: isActive
                          ? 'rgba(49, 203, 0, 0.12)'
                          : isCoach
                            ? COLORS.backgroundLight
                            : 'transparent',
                        borderLeft: isCoach
                          ? `3px solid ${COLORS.primaryLight}`
                          : `3px solid transparent`,
                        borderRadius: RADIUS.sm,
                        transition: 'background-color 0.2s ease',
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          backgroundColor: isCoach ? COLORS.primaryLight : COLORS.iconBg,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 16,
                        }}
                      >
                        {isCoach ? '🎓' : '🙂'}
                      </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          justifyContent: 'space-between',
                          gap: SPACING.sm,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <span
                            style={{
                              ...TYPOGRAPHY.bodySmall,
                              fontWeight: isCoach ? 700 : 600,
                              color: COLORS.textPrimary,
                            }}
                          >
                            {comment.author}
                          </span>
                          {isCoach && (
                            <span
                              style={{
                                ...TYPOGRAPHY.label,
                                textTransform: 'uppercase',
                                color: COLORS.textPrimary,
                                opacity: 0.9,
                              }}
                            >
                              {comment.role}
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: SPACING.xs,
                            flexShrink: 0,
                          }}
                        >
                          <span
                            style={{
                              ...TYPOGRAPHY.label,
                              color: COLORS.textMuted,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {comment.createdAt}
                          </span>
                          {comment.timestampSeconds != null && (
                            <button
                              type="button"
                              onClick={() => {
                                seekTo(comment.timestampSeconds!);
                                setActiveCommentId(comment.id);
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: `${SPACING.xs}px ${SPACING.sm}px`,
                                borderRadius: RADIUS.sm,
                                border: `1px solid ${COLORS.primaryLight}`,
                                backgroundColor: 'rgba(49, 203, 0, 0.12)',
                                color: COLORS.primary,
                                ...TYPOGRAPHY.label,
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              <span style={{ opacity: 0.9 }}>▶</span>
                              {formatTimestamp(comment.timestampSeconds)}
                            </button>
                          )}
                        </div>
                      </div>
                      {comment.taggedUsers && comment.taggedUsers.length > 0 && (
                        <div
                          style={{
                            marginTop: SPACING.xs,
                            ...TYPOGRAPHY.label,
                            color: COLORS.textSecondary,
                            fontSize: 11,
                          }}
                        >
                          Tagged: {comment.taggedUsers.map((u) => u.name).join(', ')}
                        </div>
                      )}
              <p
                        style={{
                          ...TYPOGRAPHY.bodySmall,
                          margin: `${SPACING.xs}px 0 0`,
                          color: COLORS.textPrimary,
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
                    </div>
                  </div>
                  );
                })
              )}
            </div>

            <div
              style={{
                borderRadius: RADIUS.md,
                border: `1px solid ${COLORS.backgroundLight}`,
                padding: SPACING.sm,
                backgroundColor: COLORS.cardBg,
                boxShadow: SHADOWS.light,
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
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: `${SPACING.xs}px ${SPACING.sm}px`,
                      borderRadius: RADIUS.sm - 2,
                      border: 'none',
                      backgroundColor: includeTimestamp ? COLORS.white : 'transparent',
                      color: includeTimestamp ? COLORS.primary : COLORS.textSecondary,
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
              {isDbSession && taggableProfiles.length > 0 && (
                <div style={{ marginBottom: SPACING.sm, position: 'relative' }}>
                  <span style={{ ...TYPOGRAPHY.label, color: COLORS.textSecondary, marginRight: SPACING.sm }}>
                    Tag:
                  </span>
                  {selectedMentionIds.length > 0 && (
                    <span style={{ marginRight: SPACING.sm }}>
                      {selectedMentionIds.map((id) => {
                        const p = taggableProfiles.find((x) => x.id === id);
                        return p ? (
                          <span
                            key={id}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              marginRight: 4,
                              padding: '2px 8px',
                              borderRadius: RADIUS.sm,
                              backgroundColor: COLORS.primaryLight,
                              color: COLORS.primary,
                              ...TYPOGRAPHY.label,
                              fontSize: 12,
                            }}
                          >
                            {p.name}
                            <button
                              type="button"
                              onClick={() => setSelectedMentionIds((prev) => prev.filter((x) => x !== id))}
                              style={{
                                marginLeft: 4,
                                padding: 0,
                                border: 'none',
                                background: 'none',
                                cursor: 'pointer',
                                color: 'inherit',
                                fontSize: 14,
                                lineHeight: 1,
                              }}
                              aria-label={`Remove ${p.name}`}
                            >
                              ×
                            </button>
                          </span>
                        ) : null;
                      })}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowTagDropdown((b) => !b)}
                    style={{
                      padding: `${SPACING.xs}px ${SPACING.sm}px`,
                      borderRadius: RADIUS.sm,
                      border: `1px solid ${COLORS.backgroundLight}`,
                      backgroundColor: COLORS.cardBg,
                      color: COLORS.textSecondary,
                      ...TYPOGRAPHY.label,
                      cursor: 'pointer',
                    }}
                  >
                    + Add person
                  </button>
                  {showTagDropdown && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: '100%',
                        marginTop: 4,
                        minWidth: 180,
                        maxHeight: 200,
                        overflowY: 'auto',
                        backgroundColor: COLORS.cardBg,
                        border: `1px solid ${COLORS.backgroundLight}`,
                        borderRadius: RADIUS.sm,
                        boxShadow: SHADOWS.light,
                        zIndex: 10,
                      }}
                    >
                      {taggableProfiles
                        .filter((p) => !selectedMentionIds.includes(p.id))
                        .map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setSelectedMentionIds((prev) => [...prev, p.id]);
                              setShowTagDropdown(false);
                            }}
                            style={{
                              display: 'block',
                              width: '100%',
                              padding: `${SPACING.sm}px ${SPACING.md}px`,
                              border: 'none',
                              background: 'none',
                              textAlign: 'left',
                              ...TYPOGRAPHY.bodySmall,
                              color: COLORS.textPrimary,
                              cursor: 'pointer',
                            }}
                          >
                            {p.name}
                          </button>
                        ))}
                      {taggableProfiles.filter((p) => !selectedMentionIds.includes(p.id)).length === 0 && (
                        <div style={{ padding: SPACING.sm, ...TYPOGRAPHY.bodySmall, color: COLORS.textMuted }}>
                          All selected
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              <div style={{ position: 'relative', marginBottom: SPACING.sm }}>
                <div
                  ref={commentInputRef}
                  id="session-comment-input"
                  contentEditable
                  suppressContentEditableWarning
                  role="textbox"
                  aria-multiline="true"
                  aria-label="Add a note. Type / for shot commands or @ to tag people."
                  onInput={handleCommentInput}
                  onKeyDown={handleCommentKeyDown}
                  onPaste={(e) => {
                    e.preventDefault();
                    const text = e.clipboardData.getData('text/plain');
                    document.execCommand('insertText', false, text);
                  }}
                  data-placeholder="Add a note... Type / for shot commands or @ to tag"
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
                    Add a note... Type / for shot commands or @ to tag
                  </span>
                )}
                {shotMenu != null && (
                  <div
                    role="listbox"
                    aria-label="Shot type"
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: inlineMenuTop != null ? inlineMenuTop : '100%',
                      marginTop: inlineMenuTop != null ? 0 : 4,
                      maxHeight: 220,
                      overflowY: 'auto',
                      backgroundColor: COLORS.cardBg,
                      border: `1px solid ${COLORS.backgroundLight}`,
                      borderRadius: RADIUS.sm,
                      boxShadow: SHADOWS.light,
                      zIndex: 20,
                    }}
                  >
                    {filteredShots.length === 0 ? (
                      <div style={{ padding: SPACING.sm, ...TYPOGRAPHY.bodySmall, color: COLORS.textMuted }}>
                        No matching shot
                      </div>
                    ) : (
                      filteredShots.map((shot, i) => (
                        <button
                          key={shot}
                          type="button"
                          role="option"
                          aria-selected={i === shotMenu.highlightIndex}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            selectShotFromMenu(shot);
                          }}
                          style={{
                            display: 'block',
                            width: '100%',
                            padding: `${SPACING.sm}px ${SPACING.md}px`,
                            border: 'none',
                            background: i === shotMenu.highlightIndex ? COLORS.backgroundLight : 'transparent',
                            textAlign: 'left',
                            ...TYPOGRAPHY.bodySmall,
                            color: COLORS.textPrimary,
                            cursor: 'pointer',
                          }}
                        >
                          {shot}
                        </button>
                      ))
                    )}
                  </div>
                )}
                {mentionMenu != null && (
                  <div
                    role="listbox"
                    aria-label="Mention person"
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: inlineMenuTop != null ? inlineMenuTop : '100%',
                      marginTop: inlineMenuTop != null ? 0 : shotMenu ? 8 : 4,
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
                        No students/coaches assigned to this session
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
                            selectMentionFromMenu(p.id);
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
                          @{p.name}
                        </button>
                      ))
                    )}
                  </div>
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
                      ? COLORS.primary
                      : COLORS.primaryLight,
                    color: COLORS.textPrimary,
                    boxShadow: commentDraft.trim()
                      ? '0 6px 14px rgba(49, 203, 0, 0.45)'
                      : 'none',
                    transition:
                      'background-color 0.15s ease-out, box-shadow 0.15s ease-out, transform 0.1s ease-out',
                  }}
                >
                  {postingComment ? 'Posting…' : 'Post'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

