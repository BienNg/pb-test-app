import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from '../styles/theme';
import { getYoutubeVideoId } from '@/lib/youtube';
import { gsap } from 'gsap';
import {
  IconMaximize2,
  IconMinimize2,
  IconPause,
  IconPlay,
  IconRepeat,
  IconVolume2,
  IconVolumeX,
} from './Icons';

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
  getVolume?: () => number;
  setVolume?: (volume: number) => void;
  setPlaybackRate?: (rate: number) => void;
}

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

function formatPlaybackSpeedLabel(rate: number): string {
  return `${Number.isInteger(rate) ? rate : rate}×`;
}

type OrientationWithLock = ScreenOrientation & {
  lock?: (orientation: ScreenOrientationLockType) => Promise<void>;
  unlock?: () => void;
};

type ScreenOrientationLockType =
  | 'any'
  | 'natural'
  | 'landscape'
  | 'portrait'
  | 'portrait-primary'
  | 'portrait-secondary'
  | 'landscape-primary'
  | 'landscape-secondary';

function getScreenOrientation(): OrientationWithLock | null {
  if (typeof window === 'undefined' || typeof screen === 'undefined') return null;
  return (screen.orientation as OrientationWithLock | undefined) ?? null;
}

function getFullscreenElement(): Element | null {
  const d = document as Document & {
    webkitFullscreenElement?: Element | null;
    msFullscreenElement?: Element | null;
  };
  return d.fullscreenElement ?? d.webkitFullscreenElement ?? d.msFullscreenElement ?? null;
}

async function requestElFullscreen(el: HTMLElement): Promise<void> {
  const anyEl = el as HTMLElement & { webkitRequestFullscreen?: () => void };
  if (typeof el.requestFullscreen === 'function') {
    await el.requestFullscreen();
  } else if (typeof anyEl.webkitRequestFullscreen === 'function') {
    anyEl.webkitRequestFullscreen();
  }
}

async function exitDocumentFullscreen(): Promise<void> {
  const d = document as Document & {
    webkitExitFullscreen?: () => void;
    msExitFullscreen?: () => void;
  };
  if (typeof document.exitFullscreen === 'function') {
    await document.exitFullscreen();
  } else if (typeof d.webkitExitFullscreen === 'function') {
    d.webkitExitFullscreen();
  } else if (typeof d.msExitFullscreen === 'function') {
    d.msExitFullscreen();
  }
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

/** Resolve YouTube video ID for use in this component (handles URLs with extra params like si=, feature=). */
function resolveYoutubeVideoId(url: string | null | undefined): string | null {
  if (!url) return null;
  return getYoutubeVideoId(url);
}

export interface VideoPlayerMarker {
  time: number;
  id?: string | number;
  label?: string;
}

export interface VideoPlayerLoopCommentOverlay {
  start: number;
  end: number;
  text: string;
  id?: string | number;
  textBoxXPercent?: number;
  textBoxYPercent?: number;
  textBoxWidthPercent?: number;
  textBoxHeightPercent?: number;
}

export interface VideoPlayerProps {
  /** Either a YouTube URL or direct video URL (e.g. mp4). */
  videoUrl: string | null | undefined;
  /** Unique key for the logical video; when this changes, the player resets. */
  videoKey?: string | number;

  /** Optional markers to show on the scrubber (e.g. comment timestamps). */
  markers?: VideoPlayerMarker[];
  onMarkerClick?: (marker: VideoPlayerMarker) => void;

  /** Called whenever current time or duration change. */
  onTimeUpdate?: (currentTime: number, duration: number) => void;

  /** Called when a marker becomes "active" based on playback time. */
  onActiveMarkerChange?: (marker: VideoPlayerMarker | null) => void;

  /** When set, the player will seek to this time (in seconds). */
  seekToSeconds?: number | null;
  /** Called after an external seek request has been applied. */
  onSeekHandled?: () => void;

  /** When true, the player should pause playback (used when modals are open). */
  pauseRequested?: boolean;

  /**
   * When true and there is no videoUrl, show an "Add Video URL" call-to-action.
   * Parent is responsible for rendering the actual form; this just surfaces the intent.
   */
  canRequestAddUrl?: boolean;
  onRequestAddUrl?: () => void;

  /** UI variant: sessionDetail = progress overlay on video, play accent, controls in card below. */
  variant?: 'default' | 'sessionDetail';
  /** When true, video autoplays when loaded. Defaults to true for sessionDetail variant. */
  autoplay?: boolean;
  /** Accent color for sessionDetail variant (e.g. #8FB9A8). */
  accentColor?: string;

  /** When true, show a draggable red circle overlay on the video (e.g. for frame-detail reply mode). */
  showFrameDetailReplyOverlay?: boolean;
  /** Initial position/size for the frame marker (e.g. when editing a reply that has saved marker). */
  frameDetailMarkerInitial?: { x: number; y: number; radiusX: number; radiusY: number } | null;
  /** Initial position/size for the frame-detail text box. */
  frameDetailTextBoxInitial?: { x: number; y: number; width: number; height: number } | null;
  /** When true, marker is read-only (e.g. when viewing a reply's frame). */
  frameDetailMarkerReadOnly?: boolean;
  /** Optional frame-detail text to render in a draggable/resizable overlay box. */
  frameDetailOverlayText?: string | null;

  /** Called when playback starts (user pressed play). */
  onPlay?: () => void;
  /** Called when any playback control (skip or play/pause) is pressed. */
  onControlPressed?: () => void;

  /** Optional content to render below the time controls (sessionDetail variant). */
  renderBelowTimeControls?: React.ReactNode;

  /**
   * When loop icon is active and this is set, the video will seek back to start when
   * playback reaches end. Used for looping through a comment's timestamp range.
   */
  loopRange?: { start: number; end: number } | null;
  /** Optional loop-comment ranges that should show a text box while current time is within range. */
  loopCommentOverlays?: VideoPlayerLoopCommentOverlay[];
  /** When set, allow editing this loop comment overlay's text-box layout. */
  editableLoopCommentId?: string | number | null;
  /** Initial text-box layout for the editable loop comment overlay. */
  editableLoopCommentTextBoxInitial?: { x: number; y: number; width: number; height: number } | null;
  /** Called when editable loop comment text-box layout changes. */
  onEditableLoopCommentTextBoxChange?: (layout: { x: number; y: number; width: number; height: number }) => void;

  /** Called when the video player is ready (YouTube onReady or native canplay). */
  onPlayerReady?: () => void;
}

export interface FrameMarkerState {
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
  textBoxX: number;
  textBoxY: number;
  textBoxWidth: number;
  textBoxHeight: number;
}

export interface VideoPlayerHandle {
  playPause: () => void;
  /** Pause playback without toggling (e.g. when opening frame-detail reply). */
  pause: () => void;
  skipBy: (deltaSeconds: number) => void;
  /** Current frame marker position/size (for saving with reply). */
  getFrameMarkerState: () => FrameMarkerState | null;
}

/** Reusable video player with Frame.io-style timeline, skip controls, and optional markers. */
export const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(function VideoPlayer(
  {
    videoUrl,
    videoKey,
    markers = [],
    onMarkerClick,
    onTimeUpdate,
    onActiveMarkerChange,
    seekToSeconds,
    onSeekHandled,
    canRequestAddUrl,
    onRequestAddUrl,
    pauseRequested,
    variant = 'default',
    autoplay,
    accentColor = COLORS.primary,
    showFrameDetailReplyOverlay = false,
    frameDetailMarkerInitial = null,
    frameDetailTextBoxInitial = null,
    frameDetailMarkerReadOnly = false,
    frameDetailOverlayText = null,
    onPlay: onPlayProp,
    onControlPressed,
    renderBelowTimeControls,
    loopRange = null,
    loopCommentOverlays = [],
    editableLoopCommentId = null,
    editableLoopCommentTextBoxInitial = null,
    onEditableLoopCommentTextBoxChange,
    onPlayerReady,
  },
  ref
) {
  const isSessionDetail = variant === 'sessionDetail';
  const shouldAutoplay = autoplay ?? isSessionDetail;
  const youtubeVideoId = resolveYoutubeVideoId(videoUrl || undefined);
  const isYoutube = !!youtubeVideoId;

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const fullscreenRootRef = useRef<HTMLDivElement>(null);
  const frameDetailOverlayRef = useRef<HTMLDivElement>(null);
  const frameDetailTextBoxRef = useRef<HTMLDivElement>(null);
  const onPlayPropRef = useRef(onPlayProp);
  const onTimeUpdateRef = useRef(onTimeUpdate);
  const onActiveMarkerChangeRef = useRef(onActiveMarkerChange);
  useEffect(() => { onPlayPropRef.current = onPlayProp; });
  useEffect(() => { onTimeUpdateRef.current = onTimeUpdate; });
  useEffect(() => { onActiveMarkerChangeRef.current = onActiveMarkerChange; });

  const [frameDetailCirclePosition, setFrameDetailCirclePosition] = useState({ x: 50, y: 50 });
  // radiusX and radiusY are stored as percentages of the overlay's width/height
  const [frameDetailCircleRadiusX, setFrameDetailCircleRadiusX] = useState(5);
  const [frameDetailCircleRadiusY, setFrameDetailCircleRadiusY] = useState(5);
  const [isDraggingFrameCircle, setIsDraggingFrameCircle] = useState(false);
  const [isResizingFrameCircle, setIsResizingFrameCircle] = useState(false);
  const [frameDetailTextBoxPosition, setFrameDetailTextBoxPosition] = useState({ x: 68, y: 60 });
  const [frameDetailTextBoxWidth, setFrameDetailTextBoxWidth] = useState(30);
  const [frameDetailTextBoxHeight, setFrameDetailTextBoxHeight] = useState(16);
  const [isDraggingFrameTextBox, setIsDraggingFrameTextBox] = useState(false);
  const [isResizingFrameTextBoxWidth, setIsResizingFrameTextBoxWidth] = useState(false);
  const [isResizingFrameTextBoxHeight, setIsResizingFrameTextBoxHeight] = useState(false);

  const FRAME_ELLIPSE_RADIUS_MIN = 3;
  const FRAME_ELLIPSE_RADIUS_MAX = 30;
  const FRAME_TEXT_BOX_WIDTH_MIN = 12;
  const FRAME_TEXT_BOX_WIDTH_MAX = 70;
  const FRAME_TEXT_BOX_HEIGHT_MIN = 6;
  const FRAME_TEXT_BOX_HEIGHT_MAX = 40;
  const LOOP_TEXT_BOX_WIDTH_MIN = 14;
  const LOOP_TEXT_BOX_WIDTH_MAX = 72;
  const LOOP_TEXT_BOX_HEIGHT_MIN = 8;
  const LOOP_TEXT_BOX_HEIGHT_MAX = 42;

  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1); // 0–1, used when unmuted
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoopActive, setIsLoopActive] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoAspectRatio, setVideoAspectRatio] = useState<string | null>(null);
  const [skipIndicator, setSkipIndicator] = useState<{ label: string; side: 'left' | 'right' } | null>(null);
  const [skipIndicatorFadeOut, setSkipIndicatorFadeOut] = useState(false);
  const skipIndicatorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipIndicatorFadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visibleLoopCommentText, setVisibleLoopCommentText] = useState<string | null>(null);
  const [visibleLoopCommentLayout, setVisibleLoopCommentLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [loopOverlaySizePx, setLoopOverlaySizePx] = useState({ width: 0, height: 0 });
  const [isLoopCommentBubbleVisible, setIsLoopCommentBubbleVisible] = useState(false);
  const [isLoopCommentCollapsed, setIsLoopCommentCollapsed] = useState(false);
  const [isFrameDetailTextCollapsed, setIsFrameDetailTextCollapsed] = useState(false);
  const loopCommentBubbleRef = useRef<HTMLDivElement | null>(null);
  const loopCommentDotRef = useRef<HTMLButtonElement | null>(null);
  const loopCommentTextInnerRef = useRef<HTMLSpanElement | null>(null);
  const frameDetailDotRef = useRef<HTMLButtonElement | null>(null);
  const frameDetailTextInnerRef = useRef<HTMLSpanElement | null>(null);
  const loopCommentHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emittedLoopLayoutRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const lastNotifiedActiveMarkerKeyRef = useRef<string>('__init__');
  const appliedLoopLayoutKeyRef = useRef<string | null>(null);
  const [loopCommentTextBoxPosition, setLoopCommentTextBoxPosition] = useState({ x: 22, y: 12 });
  const [loopCommentTextBoxWidth, setLoopCommentTextBoxWidth] = useState(32);
  const [loopCommentTextBoxHeight, setLoopCommentTextBoxHeight] = useState(18);
  const [isDraggingLoopTextBox, setIsDraggingLoopTextBox] = useState(false);
  const [isResizingLoopTextBoxWidth, setIsResizingLoopTextBoxWidth] = useState(false);
  const [isResizingLoopTextBoxHeight, setIsResizingLoopTextBoxHeight] = useState(false);

  const clampLoopTextLayout = useCallback((layout: { x: number; y: number; width: number; height: number }) => {
    const width = Math.max(LOOP_TEXT_BOX_WIDTH_MIN, Math.min(LOOP_TEXT_BOX_WIDTH_MAX, layout.width));
    const height = Math.max(LOOP_TEXT_BOX_HEIGHT_MIN, Math.min(LOOP_TEXT_BOX_HEIGHT_MAX, layout.height));
    const minX = width / 2;
    const maxX = 100 - width / 2;
    const minY = height / 2;
    const maxY = 100 - height / 2;
    return {
      width,
      height,
      x: Math.max(minX, Math.min(maxX, layout.x)),
      y: Math.max(minY, Math.min(maxY, layout.y)),
    };
  }, [LOOP_TEXT_BOX_WIDTH_MIN, LOOP_TEXT_BOX_WIDTH_MAX, LOOP_TEXT_BOX_HEIGHT_MIN, LOOP_TEXT_BOX_HEIGHT_MAX]);

  // Responsive: on small screens, skip buttons fill full width (no maxWidth cap)
  const [skipButtonsFillWidth, setSkipButtonsFillWidth] = useState(false);
  const [isTabletOrMobileView, setIsTabletOrMobileView] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const update = () => setSkipButtonsFillWidth(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1024px)');
    const update = () => setIsTabletOrMobileView(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Pause playback whenever pauseRequested toggles true (e.g. when any modal is open)
  useEffect(() => {
    if (!pauseRequested) return;
    if (isYoutube && playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
      playerRef.current.pauseVideo();
    } else if (videoRef.current) {
      videoRef.current.pause();
    }
  }, [pauseRequested, isYoutube]);

  // Reset aspect + timing whenever key changes (e.g. new session)
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setVideoAspectRatio(null);
    setCurrentVideoTime(0);
    setVideoDuration(0);
    setVideoError(null);
    setIsVideoPlaying(false);
    setIsPlayerReady(false);
    setRetryCount(0);
    setPlaybackRate(1);
    setShowSpeedMenu(false);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [videoKey]);

  // Reset or sync draggable ellipse when entering frame-detail reply overlay mode
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!showFrameDetailReplyOverlay) return;
    if (
      frameDetailMarkerInitial != null &&
      typeof frameDetailMarkerInitial.x === 'number' &&
      typeof frameDetailMarkerInitial.y === 'number' &&
      typeof frameDetailMarkerInitial.radiusX === 'number' &&
      typeof frameDetailMarkerInitial.radiusY === 'number'
    ) {
      setFrameDetailCirclePosition({ x: frameDetailMarkerInitial.x, y: frameDetailMarkerInitial.y });
      setFrameDetailCircleRadiusX(frameDetailMarkerInitial.radiusX);
      setFrameDetailCircleRadiusY(frameDetailMarkerInitial.radiusY);
    } else {
      setFrameDetailCirclePosition({ x: 50, y: 50 });
      setFrameDetailCircleRadiusX(5);
      setFrameDetailCircleRadiusY(5);
    }
    if (
      frameDetailTextBoxInitial != null &&
      typeof frameDetailTextBoxInitial.x === 'number' &&
      typeof frameDetailTextBoxInitial.y === 'number' &&
      typeof frameDetailTextBoxInitial.width === 'number' &&
      typeof frameDetailTextBoxInitial.height === 'number'
    ) {
      setFrameDetailTextBoxPosition({
        x: frameDetailTextBoxInitial.x,
        y: frameDetailTextBoxInitial.y,
      });
      setFrameDetailTextBoxWidth(frameDetailTextBoxInitial.width);
      setFrameDetailTextBoxHeight(frameDetailTextBoxInitial.height);
    } else {
      const markerX = frameDetailMarkerInitial?.x ?? 50;
      const markerY = frameDetailMarkerInitial?.y ?? 50;
      const markerRadiusX = frameDetailMarkerInitial?.radiusX ?? 5;
      setFrameDetailTextBoxPosition({
        x: Math.max(8, Math.min(92, markerX + markerRadiusX + 12)),
        y: Math.max(8, Math.min(92, markerY)),
      });
      setFrameDetailTextBoxWidth(30);
      setFrameDetailTextBoxHeight(16);
    }
  }, [showFrameDetailReplyOverlay, frameDetailMarkerInitial, frameDetailTextBoxInitial]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleFrameCirclePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsDraggingFrameCircle(true);
  }, []);

  const handleFrameCirclePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingFrameCircle) return;
    if (!frameDetailOverlayRef.current) return;
    const rect = frameDetailOverlayRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setFrameDetailCirclePosition({ x, y });
  }, [isDraggingFrameCircle]);

  const handleFrameCirclePointerUp = useCallback((e: React.PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    setIsDraggingFrameCircle(false);
  }, []);

  const handleFrameResizePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsResizingFrameCircle(true);
  }, []);

  const handleFrameResizeWidthPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isResizingFrameCircle) return;
    if (!frameDetailOverlayRef.current) return;
    const rect = frameDetailOverlayRef.current.getBoundingClientRect();
    const centerX = rect.left + (frameDetailCirclePosition.x / 100) * rect.width;
    const radiusX = Math.round(
      Math.max(FRAME_ELLIPSE_RADIUS_MIN, Math.min(FRAME_ELLIPSE_RADIUS_MAX, (Math.abs(e.clientX - centerX) / rect.width) * 100))
    );
    setFrameDetailCircleRadiusX(radiusX);
  }, [isResizingFrameCircle, frameDetailCirclePosition.x]);

  const handleFrameResizeHeightPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isResizingFrameCircle) return;
    if (!frameDetailOverlayRef.current) return;
    const rect = frameDetailOverlayRef.current.getBoundingClientRect();
    const centerY = rect.top + (frameDetailCirclePosition.y / 100) * rect.height;
    const radiusY = Math.round(
      Math.max(FRAME_ELLIPSE_RADIUS_MIN, Math.min(FRAME_ELLIPSE_RADIUS_MAX, (Math.abs(e.clientY - centerY) / rect.height) * 100))
    );
    setFrameDetailCircleRadiusY(radiusY);
  }, [isResizingFrameCircle, frameDetailCirclePosition.y]);

  const handleFrameResizePointerUp = useCallback((e: React.PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    setIsResizingFrameCircle(false);
  }, []);

  const handleFrameTextBoxPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsDraggingFrameTextBox(true);
  }, []);

  const handleFrameTextBoxPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingFrameTextBox) return;
    if (!frameDetailOverlayRef.current) return;
    const rect = frameDetailOverlayRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setFrameDetailTextBoxPosition({ x, y });
  }, [isDraggingFrameTextBox]);

  const handleFrameTextBoxPointerUp = useCallback((e: React.PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    setIsDraggingFrameTextBox(false);
  }, []);

  const handleFrameTextResizeWidthPointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsResizingFrameTextBoxWidth(true);
  }, []);

  const handleFrameTextResizeHeightPointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsResizingFrameTextBoxHeight(true);
  }, []);

  const handleFrameTextResizeWidthPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isResizingFrameTextBoxWidth) return;
    if (!frameDetailOverlayRef.current) return;
    const rect = frameDetailOverlayRef.current.getBoundingClientRect();
    const centerX = rect.left + (frameDetailTextBoxPosition.x / 100) * rect.width;
    const width = Math.round(
      Math.max(FRAME_TEXT_BOX_WIDTH_MIN, Math.min(FRAME_TEXT_BOX_WIDTH_MAX, (Math.abs(e.clientX - centerX) / rect.width) * 200))
    );
    setFrameDetailTextBoxWidth(width);
  }, [isResizingFrameTextBoxWidth, frameDetailTextBoxPosition.x]);

  const handleFrameTextResizeHeightPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isResizingFrameTextBoxHeight) return;
    if (!frameDetailOverlayRef.current) return;
    const rect = frameDetailOverlayRef.current.getBoundingClientRect();
    const centerY = rect.top + (frameDetailTextBoxPosition.y / 100) * rect.height;
    const height = Math.round(
      Math.max(FRAME_TEXT_BOX_HEIGHT_MIN, Math.min(FRAME_TEXT_BOX_HEIGHT_MAX, (Math.abs(e.clientY - centerY) / rect.height) * 200))
    );
    setFrameDetailTextBoxHeight(height);
  }, [isResizingFrameTextBoxHeight, frameDetailTextBoxPosition.y]);

  const handleFrameTextResizePointerUp = useCallback((e: React.PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    setIsResizingFrameTextBoxWidth(false);
    setIsResizingFrameTextBoxHeight(false);
  }, []);

  const handleLoopTextBoxPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsDraggingLoopTextBox(true);
  }, []);
  const handleLoopTextBoxPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingLoopTextBox) return;
    const parent = (e.currentTarget as HTMLElement).parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    const clamped = clampLoopTextLayout({ x, y, width: loopCommentTextBoxWidth, height: loopCommentTextBoxHeight });
    setLoopCommentTextBoxPosition((prev) =>
      prev.x === clamped.x && prev.y === clamped.y ? prev : { x: clamped.x, y: clamped.y }
    );
  }, [isDraggingLoopTextBox, clampLoopTextLayout, loopCommentTextBoxWidth, loopCommentTextBoxHeight]);
  const handleLoopTextBoxPointerUp = useCallback((e: React.PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    setIsDraggingLoopTextBox(false);
  }, []);
  const handleLoopTextResizeWidthPointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsResizingLoopTextBoxWidth(true);
  }, []);
  const handleLoopTextResizeHeightPointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsResizingLoopTextBoxHeight(true);
  }, []);
  const handleLoopTextResizeWidthPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isResizingLoopTextBoxWidth) return;
    const parent = (e.currentTarget as HTMLElement).parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    const centerX = rect.left + (loopCommentTextBoxPosition.x / 100) * rect.width;
    const width = Math.round(
      Math.max(LOOP_TEXT_BOX_WIDTH_MIN, Math.min(LOOP_TEXT_BOX_WIDTH_MAX, (Math.abs(e.clientX - centerX) / rect.width) * 200))
    );
    const clamped = clampLoopTextLayout({
      x: loopCommentTextBoxPosition.x,
      y: loopCommentTextBoxPosition.y,
      width,
      height: loopCommentTextBoxHeight,
    });
    setLoopCommentTextBoxWidth((prev) => (prev === clamped.width ? prev : clamped.width));
    setLoopCommentTextBoxPosition((prev) =>
      prev.x === clamped.x && prev.y === clamped.y ? prev : { x: clamped.x, y: clamped.y }
    );
  }, [
    isResizingLoopTextBoxWidth,
    loopCommentTextBoxPosition.x,
    loopCommentTextBoxPosition.y,
    loopCommentTextBoxHeight,
    LOOP_TEXT_BOX_WIDTH_MIN,
    LOOP_TEXT_BOX_WIDTH_MAX,
    clampLoopTextLayout,
  ]);
  const handleLoopTextResizeHeightPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isResizingLoopTextBoxHeight) return;
    const parent = (e.currentTarget as HTMLElement).parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    const centerY = rect.top + (loopCommentTextBoxPosition.y / 100) * rect.height;
    const height = Math.round(
      Math.max(LOOP_TEXT_BOX_HEIGHT_MIN, Math.min(LOOP_TEXT_BOX_HEIGHT_MAX, (Math.abs(e.clientY - centerY) / rect.height) * 200))
    );
    const clamped = clampLoopTextLayout({
      x: loopCommentTextBoxPosition.x,
      y: loopCommentTextBoxPosition.y,
      width: loopCommentTextBoxWidth,
      height,
    });
    setLoopCommentTextBoxHeight((prev) => (prev === clamped.height ? prev : clamped.height));
    setLoopCommentTextBoxPosition((prev) =>
      prev.x === clamped.x && prev.y === clamped.y ? prev : { x: clamped.x, y: clamped.y }
    );
  }, [
    isResizingLoopTextBoxHeight,
    loopCommentTextBoxPosition.x,
    loopCommentTextBoxPosition.y,
    loopCommentTextBoxWidth,
    LOOP_TEXT_BOX_HEIGHT_MIN,
    LOOP_TEXT_BOX_HEIGHT_MAX,
    clampLoopTextLayout,
  ]);
  const handleLoopTextResizePointerUp = useCallback((e: React.PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    setIsResizingLoopTextBoxWidth(false);
    setIsResizingLoopTextBoxHeight(false);
  }, []);

  // Load YouTube API and create player when we have a YouTube video
  // Use youtube-nocookie.com for privacy-enhanced embed (may reduce "More videos" overlay)
  useEffect(() => {
    if (!isYoutube || !youtubeVideoId || !playerContainerRef.current) return;

    let pollId: ReturnType<typeof setInterval> | null = null;
    const container = playerContainerRef.current;

    const createPlayer = (yt: NonNullable<typeof window.YT>) => {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const params = new URLSearchParams({
        enablejsapi: '1',
        origin,
        controls: '0',
        disablekb: '0',
        playsinline: '1',
        rel: '0',
        ...(shouldAutoplay ? { autoplay: '1', mute: '1' } : {}),
      });
      const iframe = document.createElement('iframe');
      iframe.id = `yt-nocookie-${youtubeVideoId}-${videoKey ?? ''}`;
      iframe.src = `https://www.youtube-nocookie.com/embed/${youtubeVideoId}?${params.toString()}`;
      iframe.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
      iframe.setAttribute('frameborder', '0');
      iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
      iframe.setAttribute('allowfullscreen', 'true');
      container.innerHTML = '';
      container.appendChild(iframe);

      playerRef.current = new yt.Player(iframe, {
        events: {
          onReady: (e: { target: YTPlayer }) => {
            const p = e.target;
            const dur = p.getDuration();
            if (dur && isFinite(dur)) setVideoDuration(dur);
            if (shouldAutoplay) {
              setIsMuted(false);
              setVolume(1);
              if (typeof p.unMute === 'function') p.unMute();
              if (typeof p.setVolume === 'function') p.setVolume(100);
            } else {
              setIsMuted(p.isMuted());
              if (typeof p.getVolume === 'function') {
                const v = p.getVolume();
                if (Number.isFinite(v)) setVolume(v / 100);
              }
            }
            setIsPlayerReady(true);
            onPlayerReady?.();
            pollId = setInterval(() => {
              if (!playerRef.current) return;
              try {
                const t = playerRef.current.getCurrentTime();
                if (isFinite(t)) {
                  setCurrentVideoTime((prev) => (Math.abs(prev - t) < 0.01 ? prev : t));
                }
                const d = playerRef.current.getDuration();
                if (isFinite(d) && d > 0) {
                  setVideoDuration((prev) => (Math.abs(prev - d) < 0.01 ? prev : d));
                }
              } catch {
                // ignore getCurrentTime/getDuration errors
              }
            }, 250);
          },
          onStateChange: (e: { data: number }) => {
            const YT = window.YT!;
            if (e.data === YT.PlayerState.PLAYING) {
              setIsVideoPlaying(true);
              onPlayPropRef.current?.();
            } else if (e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.ENDED) {
              setIsVideoPlaying(false);
            }
          },
          onError: () => {
            setVideoError('Video couldn\'t load. Check your connection and try again.');
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
  }, [isYoutube, youtubeVideoId, videoKey, retryCount, onPlayerReady, shouldAutoplay]);

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
        return;
      }
      const video = videoRef.current;
      if (!video) return;
      video.currentTime = seconds;
    },
    [isYoutube]
  );

  const pause = useCallback(() => {
    if (isYoutube && playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
      playerRef.current.pauseVideo();
      return;
    }
    if (videoRef.current) {
      videoRef.current.pause();
    }
  }, [isYoutube]);

  const _handleMuteToggle = useCallback(() => {
    if (isYoutube && playerRef.current) {
      const p = playerRef.current;
      if (typeof p.isMuted !== 'function') return;
      if (p.isMuted()) {
        p.unMute();
        if (typeof p.setVolume === 'function') p.setVolume(volume * 100);
        setIsMuted(false);
      } else {
        p.mute();
        setIsMuted(true);
      }
      return;
    }
    setIsMuted((m) => !m);
  }, [isYoutube, volume]);

  // Apply volume to native video element and YouTube player
  useEffect(() => {
    if (isYoutube) {
      const p = playerRef.current;
      if (!p) return;
      if (isMuted) {
        if (typeof p.mute === 'function') p.mute();
      } else {
        if (typeof p.unMute === 'function') p.unMute();
        if (typeof p.setVolume === 'function') p.setVolume(volume * 100);
      }
      return;
    }
    const v = videoRef.current;
    if (!v) return;
    v.volume = volume;
    v.muted = isMuted;
  }, [isYoutube, volume, isMuted]);

  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      const v = Math.max(0, Math.min(1, Number.isFinite(val) ? val : 0));
      setVolume(v);
      if (v > 0) setIsMuted(false);
      else setIsMuted(true);
      if (isYoutube && playerRef.current) {
        const p = playerRef.current;
        if (typeof p.setVolume === 'function') p.setVolume(v * 100);
        if (v === 0 && typeof p.mute === 'function') p.mute();
        else if (v > 0 && typeof p.unMute === 'function') p.unMute();
      }
    },
    [isYoutube]
  );

  useEffect(() => {
    const sync = () => {
      const el = getFullscreenElement();
      const root = fullscreenRootRef.current;
      setIsFullscreen(!!root && el === root);
    };
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync);
    };
  }, []);

  useEffect(() => {
    const orientation = getScreenOrientation();
    if (!orientation) return;
    if (isFullscreen) {
      if (typeof orientation.lock !== 'function') return;
      void orientation.lock('landscape').catch(() => {
        // Browsers may block orientation lock despite fullscreen.
      });
      return;
    }
    if (typeof orientation.unlock !== 'function') return;
    try {
      orientation.unlock();
    } catch {
      // Ignore unsupported unlock behavior.
    }
  }, [isFullscreen]);

  useEffect(() => {
    if (isYoutube) {
      const p = playerRef.current;
      if (!p || typeof p.setPlaybackRate !== 'function') return;
      try {
        p.setPlaybackRate(playbackRate);
      } catch {
        // ignore unsupported rates
      }
      return;
    }
    const v = videoRef.current;
    if (!v) return;
    try {
      v.playbackRate = playbackRate;
    } catch {
      // ignore
    }
  }, [isYoutube, playbackRate, isPlayerReady, videoKey]);

  const toggleFullscreen = useCallback(async () => {
    const root = fullscreenRootRef.current;
    if (!root) return;
    try {
      if (getFullscreenElement() === root) {
        await exitDocumentFullscreen();
      } else {
        await requestElFullscreen(root);
      }
    } catch {
      // Fullscreen may be blocked or unsupported
    }
  }, []);

  const selectPlaybackSpeed = useCallback((rate: number) => {
    setPlaybackRate(rate);
    setShowSpeedMenu(false);
    onControlPressed?.();
  }, [onControlPressed]);

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
      if (deltaSeconds !== 0) {
        const abs = Math.abs(deltaSeconds);
        const isFrame = abs < 0.1;
        const label = isFrame ? '1fr' : `${Math.round(abs)}s`;
        const displayLabel = deltaSeconds < 0 ? `−${label}` : `+${label}`;
        if (skipIndicatorTimeoutRef.current) clearTimeout(skipIndicatorTimeoutRef.current);
        if (skipIndicatorFadeTimeoutRef.current) clearTimeout(skipIndicatorFadeTimeoutRef.current);
        setSkipIndicatorFadeOut(false);
        setSkipIndicator({ label: displayLabel, side: deltaSeconds < 0 ? 'left' : 'right' });
        skipIndicatorFadeTimeoutRef.current = setTimeout(() => setSkipIndicatorFadeOut(true), 550);
        skipIndicatorTimeoutRef.current = setTimeout(() => {
          setSkipIndicator(null);
          setSkipIndicatorFadeOut(false);
          skipIndicatorTimeoutRef.current = null;
          skipIndicatorFadeTimeoutRef.current = null;
        }, 850);
      }
    },
    [isYoutube, videoDuration, seekTo]
  );

  const getFrameMarkerState = useCallback((): FrameMarkerState | null => {
    if (!showFrameDetailReplyOverlay) return null;
    return {
      x: frameDetailCirclePosition.x,
      y: frameDetailCirclePosition.y,
      radiusX: frameDetailCircleRadiusX,
      radiusY: frameDetailCircleRadiusY,
      textBoxX: frameDetailTextBoxPosition.x,
      textBoxY: frameDetailTextBoxPosition.y,
      textBoxWidth: frameDetailTextBoxWidth,
      textBoxHeight: frameDetailTextBoxHeight,
    };
  }, [
    showFrameDetailReplyOverlay,
    frameDetailCirclePosition.x,
    frameDetailCirclePosition.y,
    frameDetailCircleRadiusX,
    frameDetailCircleRadiusY,
    frameDetailTextBoxPosition.x,
    frameDetailTextBoxPosition.y,
    frameDetailTextBoxWidth,
    frameDetailTextBoxHeight,
  ]);

  useImperativeHandle(
    ref,
    () => ({
      playPause: handlePlayPause,
      pause,
      skipBy,
      getFrameMarkerState,
    }),
    [handlePlayPause, pause, skipBy, getFrameMarkerState]
  );

  useEffect(() => () => {
    if (skipIndicatorTimeoutRef.current) clearTimeout(skipIndicatorTimeoutRef.current);
    if (skipIndicatorFadeTimeoutRef.current) clearTimeout(skipIndicatorFadeTimeoutRef.current);
    if (loopCommentHideTimeoutRef.current) clearTimeout(loopCommentHideTimeoutRef.current);
  }, []);

  const sortedMarkerTimes = useMemo(
    () => [...new Set(markers.map((m) => m.time))].sort((a, b) => a - b),
    [markers]
  );

  const handleScrubPointerDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
      if (videoDuration <= 0) return;

      event.preventDefault();

      const target = event.currentTarget;
      const rect = target.getBoundingClientRect();

      const getClientX = (ev: MouseEvent | TouchEvent): number => {
        if ('touches' in ev) {
          const touch = ev.touches[0] ?? ev.changedTouches[0];
          return touch?.clientX ?? 0;
        }
        return (ev as MouseEvent).clientX;
      };

      const updateFromClientX = (clientX: number) => {
        const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        seekTo(pct * videoDuration);
      };

      const nativeEvent = event.nativeEvent as MouseEvent | TouchEvent;
      let startClientX = 0;
      if ('clientX' in nativeEvent && typeof nativeEvent.clientX === 'number') {
        startClientX = nativeEvent.clientX;
      } else if ('touches' in nativeEvent && nativeEvent.touches[0]) {
        startClientX = nativeEvent.touches[0].clientX;
      }
      if (startClientX) updateFromClientX(startClientX);

      const handleMove = (ev: MouseEvent | TouchEvent) => {
        ev.preventDefault();
        updateFromClientX(getClientX(ev));
      };

      const handleUp = (ev: MouseEvent | TouchEvent) => {
        ev.preventDefault();
        onControlPressed?.();
        window.removeEventListener('mousemove', handleMove as EventListener);
        window.removeEventListener('mouseup', handleUp as EventListener);
        window.removeEventListener('touchmove', handleMove as EventListener);
        window.removeEventListener('touchend', handleUp as EventListener);
        window.removeEventListener('touchcancel', handleUp as EventListener);
      };

      window.addEventListener('mousemove', handleMove as EventListener);
      window.addEventListener('mouseup', handleUp as EventListener);
      window.addEventListener('touchmove', handleMove as EventListener, { passive: false });
      window.addEventListener('touchend', handleUp as EventListener);
      window.addEventListener('touchcancel', handleUp as EventListener);
    },
    [seekTo, videoDuration, onControlPressed]
  );

  // Apply external seek requests from parent
  useEffect(() => {
    if (seekToSeconds == null || !Number.isFinite(seekToSeconds)) return;
    seekTo(seekToSeconds);
    if (onSeekHandled) onSeekHandled();
  }, [seekToSeconds, seekTo, onSeekHandled]);

  // Auto-activate loop only when user newly selects a comment with a loop range (not on every re-render)
  const hadLoopRangeRef = useRef(false);
  useEffect(() => {
    const hasLoopRange = Boolean(loopRange && loopRange.end > loopRange.start);
    if (hasLoopRange && !hadLoopRangeRef.current) {
      queueMicrotask(() => setIsLoopActive(true));
    }
    hadLoopRangeRef.current = hasLoopRange;
  }, [loopRange]);

  // When loop is active and a loop range is set: seek back when reaching end, or deactivate when skipped outside
  useEffect(() => {
    if (!isLoopActive || !loopRange) return;
    const { start, end } = loopRange;
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return;
    if (currentVideoTime < start) {
      queueMicrotask(() => setIsLoopActive(false));
      return;
    }
    if (currentVideoTime > end + 0.5) {
      queueMicrotask(() => setIsLoopActive(false));
      return;
    }
    if (currentVideoTime >= end) {
      seekTo(start);
    }
  }, [currentVideoTime, isLoopActive, loopRange, seekTo]);

  // Notify parent about current time / duration
  useEffect(() => {
    if (onTimeUpdateRef.current) {
      onTimeUpdateRef.current(currentVideoTime, videoDuration);
    }
  }, [currentVideoTime, videoDuration]);

  // Determine active marker based on current playback time
  useEffect(() => {
    if (!onActiveMarkerChangeRef.current || sortedMarkerTimes.length === 0) return;
    const activeTime =
      sortedMarkerTimes.filter((t) => t <= currentVideoTime + 0.5).pop() ?? null;
    if (activeTime == null) {
      if (lastNotifiedActiveMarkerKeyRef.current !== 'null') {
        lastNotifiedActiveMarkerKeyRef.current = 'null';
        onActiveMarkerChangeRef.current(null);
      }
      return;
    }
    const marker =
      markers.find((m) => m.time === activeTime) ??
      { time: activeTime };
    const markerKey = marker.id != null ? `id:${String(marker.id)}` : `t:${activeTime}`;
    if (lastNotifiedActiveMarkerKeyRef.current === markerKey) return;
    lastNotifiedActiveMarkerKeyRef.current = markerKey;
    onActiveMarkerChangeRef.current(marker);
  }, [currentVideoTime, sortedMarkerTimes, markers]);

  const formatTimestamp = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(1, '0')}:${s.toString().padStart(2, '0')}`;
  };
  const frameDetailOverlayTextTrimmed = (frameDetailOverlayText ?? '').trim();
  const hasFrameDetailOverlayText = frameDetailOverlayTextTrimmed.length > 0;
  const isFrameTextBoxActive =
    isDraggingFrameTextBox || isResizingFrameTextBoxWidth || isResizingFrameTextBoxHeight;
  const frameTextBoxCursor = frameDetailMarkerReadOnly
    ? 'default'
    : isDraggingFrameTextBox
      ? 'grabbing'
      : 'grab';
  const frameDetailTextBoxSizing = useMemo(() => {
    if (!hasFrameDetailOverlayText) {
      return {
        fontSize: isTabletOrMobileView ? 11 : 13,
        lineHeight: 1.32,
        padding: isTabletOrMobileView ? '6px 8px' : '10px 12px',
      };
    }

    const boxWidthPx = (loopOverlaySizePx.width * frameDetailTextBoxWidth) / 100;
    const boxHeightPx = (loopOverlaySizePx.height * frameDetailTextBoxHeight) / 100;
    if (boxWidthPx <= 0 || boxHeightPx <= 0) {
      return {
        fontSize: isTabletOrMobileView ? 11 : 13,
        lineHeight: 1.32,
        padding: isTabletOrMobileView ? '6px 8px' : '10px 12px',
      };
    }

    const minFont = 6;
    const maxFont = isTabletOrMobileView ? 11.5 : 13;
    let best = minFont;

    const fits = (fontSize: number, hPad: number, vPad: number, lineHeight: number) => {
      const contentWidth = Math.max(4, boxWidthPx - hPad * 2);
      const contentHeight = Math.max(4, boxHeightPx - vPad * 2);
      const approxCharWidth = Math.max(1, fontSize * 0.55);
      const maxCharsPerLine = Math.max(1, Math.floor(contentWidth / approxCharWidth));
      let lineCount = 0;
      for (const rawLine of frameDetailOverlayTextTrimmed.split('\n')) {
        const line = rawLine.trim();
        if (!line.length) {
          lineCount += 1;
          continue;
        }
        const charsBasedLines = Math.ceil(line.length / maxCharsPerLine);
        let longestToken = 0;
        for (const token of line.split(/\s+/)) {
          longestToken = Math.max(longestToken, token.length);
        }
        const tokenBasedLines = Math.ceil(longestToken / maxCharsPerLine);
        lineCount += Math.max(charsBasedLines, tokenBasedLines);
      }
      return lineCount * fontSize * lineHeight <= contentHeight;
    };

    for (let fs = minFont; fs <= maxFont; fs += 0.5) {
      const scale = (fs - minFont) / (maxFont - minFont || 1);
      const hPad = (isTabletOrMobileView ? 4 : 5) + scale * (isTabletOrMobileView ? 5 : 7);
      const vPad = (isTabletOrMobileView ? 2 : 3) + scale * (isTabletOrMobileView ? 4 : 6);
      const lineHeight = 1.14 + scale * 0.2;
      if (fits(fs, hPad, vPad, lineHeight)) best = fs;
      else break;
    }

    const scale = (best - minFont) / (maxFont - minFont || 1);
    const hPad = (isTabletOrMobileView ? 4 : 5) + scale * (isTabletOrMobileView ? 5 : 7);
    const vPad = (isTabletOrMobileView ? 2 : 3) + scale * (isTabletOrMobileView ? 4 : 6);
    return {
      fontSize: Number(best.toFixed(1)),
      lineHeight: Number((1.14 + scale * 0.2).toFixed(2)),
      padding: `${Math.round(vPad)}px ${Math.round(hPad)}px`,
    };
  }, [
    hasFrameDetailOverlayText,
    isTabletOrMobileView,
    loopOverlaySizePx.width,
    loopOverlaySizePx.height,
    frameDetailTextBoxWidth,
    frameDetailTextBoxHeight,
    frameDetailOverlayTextTrimmed,
  ]);
  const activeLoopCommentOverlay = useMemo(() => {
    if (!loopCommentOverlays.length) return null;
    if (editableLoopCommentId != null) {
      const editing = loopCommentOverlays.find(
        (item) => item.id != null && String(item.id) === String(editableLoopCommentId)
      );
      if (editing) return editing;
    }
    return loopCommentOverlays
      .filter((item) => {
        if (!Number.isFinite(item.start) || !Number.isFinite(item.end)) return false;
        if (item.end <= item.start) return false;
        // Start showing 1s early and keep visible until 1s after end.
        return currentVideoTime >= item.start - 1 && currentVideoTime <= item.end + 1;
      })
      .sort((a, b) => b.start - a.start)[0] ?? null;
  }, [loopCommentOverlays, currentVideoTime, editableLoopCommentId]);
  const activeLoopCommentOverlayText = useMemo(() => {
    if (!activeLoopCommentOverlay) return null;
    const text = activeLoopCommentOverlay.text.trim();
    return text.length ? text : null;
  }, [activeLoopCommentOverlay]);
  const isEditingLoopCommentOverlay =
    editableLoopCommentId != null &&
    activeLoopCommentOverlay?.id != null &&
    String(activeLoopCommentOverlay.id) === String(editableLoopCommentId);
  const loopCommentDisplayLayout = useMemo(() => {
    if (isEditingLoopCommentOverlay) {
      return clampLoopTextLayout({
        x: loopCommentTextBoxPosition.x,
        y: loopCommentTextBoxPosition.y,
        width: loopCommentTextBoxWidth,
        height: loopCommentTextBoxHeight,
      });
    }
    if (
      activeLoopCommentOverlay &&
      typeof activeLoopCommentOverlay.textBoxXPercent === 'number' &&
      typeof activeLoopCommentOverlay.textBoxYPercent === 'number' &&
      typeof activeLoopCommentOverlay.textBoxWidthPercent === 'number' &&
      typeof activeLoopCommentOverlay.textBoxHeightPercent === 'number'
    ) {
      return clampLoopTextLayout({
        x: activeLoopCommentOverlay.textBoxXPercent,
        y: activeLoopCommentOverlay.textBoxYPercent,
        width: activeLoopCommentOverlay.textBoxWidthPercent,
        height: activeLoopCommentOverlay.textBoxHeightPercent,
      });
    }
    return null;
  }, [
    isEditingLoopCommentOverlay,
    activeLoopCommentOverlay,
    loopCommentTextBoxPosition.x,
    loopCommentTextBoxPosition.y,
    loopCommentTextBoxWidth,
    loopCommentTextBoxHeight,
    clampLoopTextLayout,
  ]);

  useEffect(() => {
    if (loopCommentHideTimeoutRef.current) {
      clearTimeout(loopCommentHideTimeoutRef.current);
      loopCommentHideTimeoutRef.current = null;
    }
    if (activeLoopCommentOverlayText) {
      requestAnimationFrame(() => {
        setVisibleLoopCommentText(activeLoopCommentOverlayText);
        setVisibleLoopCommentLayout(loopCommentDisplayLayout);
      });
      requestAnimationFrame(() => setIsLoopCommentBubbleVisible(true));
      return;
    }
    requestAnimationFrame(() => setIsLoopCommentBubbleVisible(false));
    loopCommentHideTimeoutRef.current = setTimeout(() => {
      setVisibleLoopCommentText(null);
      setVisibleLoopCommentLayout(null);
      loopCommentHideTimeoutRef.current = null;
    }, 220);
  }, [activeLoopCommentOverlayText, loopCommentDisplayLayout]);

  useEffect(() => {
    if (!activeLoopCommentOverlayText) {
      requestAnimationFrame(() => setIsLoopCommentCollapsed(false));
    }
  }, [activeLoopCommentOverlayText]);

  useEffect(() => {
    if (!showFrameDetailReplyOverlay || !hasFrameDetailOverlayText) {
      requestAnimationFrame(() => setIsFrameDetailTextCollapsed(false));
    }
  }, [showFrameDetailReplyOverlay, hasFrameDetailOverlayText]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (editableLoopCommentId == null) {
      appliedLoopLayoutKeyRef.current = null;
      return;
    }
    // Avoid re-initializing on every render/time tick. Only initialize once per edited comment id.
    if (!isEditingLoopCommentOverlay) return;
    const initKey = String(editableLoopCommentId);
    if (appliedLoopLayoutKeyRef.current === initKey) return;
    appliedLoopLayoutKeyRef.current = initKey;

    let source: { x: number; y: number; width: number; height: number };
    if (
      editableLoopCommentTextBoxInitial != null &&
      typeof editableLoopCommentTextBoxInitial.x === 'number' &&
      typeof editableLoopCommentTextBoxInitial.y === 'number' &&
      typeof editableLoopCommentTextBoxInitial.width === 'number' &&
      typeof editableLoopCommentTextBoxInitial.height === 'number'
    ) {
      source = {
        x: editableLoopCommentTextBoxInitial.x,
        y: editableLoopCommentTextBoxInitial.y,
        width: editableLoopCommentTextBoxInitial.width,
        height: editableLoopCommentTextBoxInitial.height,
      };
    } else if (
      activeLoopCommentOverlay &&
      typeof activeLoopCommentOverlay.textBoxXPercent === 'number' &&
      typeof activeLoopCommentOverlay.textBoxYPercent === 'number' &&
      typeof activeLoopCommentOverlay.textBoxWidthPercent === 'number' &&
      typeof activeLoopCommentOverlay.textBoxHeightPercent === 'number'
    ) {
      source = {
        x: activeLoopCommentOverlay.textBoxXPercent,
        y: activeLoopCommentOverlay.textBoxYPercent,
        width: activeLoopCommentOverlay.textBoxWidthPercent,
        height: activeLoopCommentOverlay.textBoxHeightPercent,
      };
    } else {
      source = { x: 22, y: 12, width: 32, height: 18 };
    }

    const clamped = clampLoopTextLayout(source);
    setLoopCommentTextBoxPosition((prev) =>
      prev.x === clamped.x && prev.y === clamped.y ? prev : { x: clamped.x, y: clamped.y }
    );
    setLoopCommentTextBoxWidth((prev) => (prev === clamped.width ? prev : clamped.width));
    setLoopCommentTextBoxHeight((prev) => (prev === clamped.height ? prev : clamped.height));
  }, [
    editableLoopCommentId,
    isEditingLoopCommentOverlay,
    editableLoopCommentTextBoxInitial,
    activeLoopCommentOverlay,
    clampLoopTextLayout,
  ]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!isEditingLoopCommentOverlay || !onEditableLoopCommentTextBoxChange) return;
    const next = {
      x: loopCommentTextBoxPosition.x,
      y: loopCommentTextBoxPosition.y,
      width: loopCommentTextBoxWidth,
      height: loopCommentTextBoxHeight,
    };
    const prev = emittedLoopLayoutRef.current;
    if (
      prev &&
      prev.x === next.x &&
      prev.y === next.y &&
      prev.width === next.width &&
      prev.height === next.height
    ) {
      return;
    }
    emittedLoopLayoutRef.current = next;
    onEditableLoopCommentTextBoxChange(next);
  }, [
    isEditingLoopCommentOverlay,
    onEditableLoopCommentTextBoxChange,
    loopCommentTextBoxPosition.x,
    loopCommentTextBoxPosition.y,
    loopCommentTextBoxWidth,
    loopCommentTextBoxHeight,
  ]);

  useEffect(() => {
    const el = frameDetailOverlayRef.current;
    if (!el) return;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      setLoopOverlaySizePx({ width: rect.width, height: rect.height });
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, [isSessionDetail, isFullscreen, videoUrl]);

  const loopCommentBubbleSizing = useMemo(() => {
    if (!visibleLoopCommentLayout || !visibleLoopCommentText?.trim()) {
      return {
        fontSize: 13,
        lineHeight: 1.38,
        padding: '10px 14px',
      };
    }
    const boxWidthPx = (loopOverlaySizePx.width * visibleLoopCommentLayout.width) / 100;
    const boxHeightPx = (loopOverlaySizePx.height * visibleLoopCommentLayout.height) / 100;
    if (boxWidthPx <= 0 || boxHeightPx <= 0) {
      return { fontSize: 13, lineHeight: 1.38, padding: '10px 14px' };
    }

    const minFont = 8;
    const maxFont = 13;
    let best = minFont;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return { fontSize: 13, lineHeight: 1.38, padding: '10px 14px' };

    const fits = (fontSize: number, hPad: number, vPad: number, lineHeight: number) => {
      const contentWidth = Math.max(4, boxWidthPx - hPad * 2);
      const contentHeight = Math.max(4, boxHeightPx - vPad * 2);
      ctx.font = `${500} ${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
      const approxCharWidth = Math.max(1, fontSize * 0.55);
      const maxCharsPerLine = Math.max(1, Math.floor(contentWidth / approxCharWidth));
      let lineCount = 0;
      for (const rawLine of visibleLoopCommentText.split('\n')) {
        const line = rawLine.trim();
        if (!line.length) {
          lineCount += 1;
          continue;
        }
        // Conservative estimate so we undershoot size rather than overflow.
        const charsBasedLines = Math.ceil(line.length / maxCharsPerLine);
        let longestToken = 0;
        for (const token of line.split(/\s+/)) {
          longestToken = Math.max(longestToken, token.length);
        }
        const tokenBasedLines = Math.ceil(longestToken / maxCharsPerLine);
        lineCount += Math.max(charsBasedLines, tokenBasedLines);
      }
      return lineCount * fontSize * lineHeight <= contentHeight;
    };

    for (let fs = minFont; fs <= maxFont; fs += 0.5) {
      const scale = (fs - minFont) / (maxFont - minFont || 1);
      const hPad = 6 + scale * 8;
      const vPad = 4 + scale * 6;
      const lineHeight = 1.2 + scale * 0.18;
      if (fits(fs, hPad, vPad, lineHeight)) best = fs;
      else break;
    }

    const scale = (best - minFont) / (maxFont - minFont || 1);
    const hPad = 6 + scale * 8;
    const vPad = 4 + scale * 6;
    return {
      fontSize: Number(best.toFixed(1)),
      lineHeight: Number((1.2 + scale * 0.18).toFixed(2)),
      padding: `${Math.round(vPad)}px ${Math.round(hPad)}px`,
    };
  }, [visibleLoopCommentLayout, visibleLoopCommentText, loopOverlaySizePx.width, loopOverlaySizePx.height]);
  const loopCommentBubbleRadius = isTabletOrMobileView ? 4 : 18;

  useLayoutEffect(() => {
    const el = loopCommentBubbleRef.current;
    if (!el || !visibleLoopCommentLayout || !visibleLoopCommentText?.trim()) return;

    const minFont = 6;
    const maxFont = 13;
    const parsePadding = (value: string) => {
      const [v, h] = value.split(' ');
      return {
        vertical: Number.parseFloat(v || '8') || 8,
        horizontal: Number.parseFloat(h || v || '10') || 10,
      };
    };
    const applySize = (fontSize: number) => {
      const scale = (fontSize - minFont) / (maxFont - minFont || 1);
      const vertical = 3 + scale * 7;
      const horizontal = 4 + scale * 10;
      const lineHeight = 1.12 + scale * 0.22;
      el.style.fontSize = `${fontSize}px`;
      el.style.lineHeight = String(Number(lineHeight.toFixed(2)));
      el.style.padding = `${Math.round(vertical)}px ${Math.round(horizontal)}px`;
    };

    // Start from computed responsive baseline, then shrink until no overflow.
    const baseFont = Math.max(minFont, Math.min(maxFont, loopCommentBubbleSizing.fontSize));
    const parsedBasePad = parsePadding(loopCommentBubbleSizing.padding);
    el.style.fontSize = `${baseFont}px`;
    el.style.lineHeight = String(loopCommentBubbleSizing.lineHeight);
    el.style.padding = `${Math.round(parsedBasePad.vertical)}px ${Math.round(parsedBasePad.horizontal)}px`;

    let currentFont = baseFont;
    let safety = 0;
    while ((el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth) && currentFont > minFont && safety < 20) {
      currentFont = Number((currentFont - 0.5).toFixed(2));
      applySize(currentFont);
      safety += 1;
    }
  }, [
    visibleLoopCommentLayout,
    visibleLoopCommentText,
    isLoopCommentBubbleVisible,
    loopCommentBubbleSizing.fontSize,
    loopCommentBubbleSizing.lineHeight,
    loopCommentBubbleSizing.padding,
    loopOverlaySizePx.width,
    loopOverlaySizePx.height,
  ]);

  useLayoutEffect(() => {
    const bubbleEl = loopCommentBubbleRef.current;
    const dotEl = loopCommentDotRef.current;
    const textEl = loopCommentTextInnerRef.current;
    if (!bubbleEl || !dotEl || !textEl || !visibleLoopCommentText?.trim()) return;

    gsap.killTweensOf([bubbleEl, dotEl, textEl]);
    if (isLoopCommentCollapsed) {
      const tl = gsap.timeline();
      gsap.set(dotEl, { pointerEvents: 'none' });
      tl.to(textEl, { opacity: 0, duration: 0.1, ease: 'power1.out' })
        .to(
          bubbleEl,
          {
            scale: 0.12,
            autoAlpha: 0,
            borderRadius: 999,
            duration: 0.26,
            ease: 'power2.inOut',
          },
          '<'
        )
        .fromTo(
          dotEl,
          { scale: 0.72, autoAlpha: 0 },
          {
            scale: 1,
            autoAlpha: 1,
            duration: 0.16,
            ease: 'power2.out',
            onStart: () => gsap.set(dotEl, { pointerEvents: 'auto' }),
          },
          '-=0.06'
        );
      return;
    }

    gsap.set(dotEl, { pointerEvents: 'none' });
    const tl = gsap.timeline();
    tl.to(dotEl, { scale: 0.72, autoAlpha: 0, duration: 0.12, ease: 'power2.inOut' }).fromTo(
      bubbleEl,
      { scale: 0.12, autoAlpha: 0, borderRadius: 999 },
      {
        scale: 1,
        autoAlpha: isLoopCommentBubbleVisible ? 1 : 0,
        borderRadius: loopCommentBubbleRadius,
        duration: 0.28,
        ease: 'power2.out',
      },
      '<'
    );
    tl.to(textEl, { opacity: 1, duration: 0.18, ease: 'power1.out' }, '-=0.16');
  }, [isLoopCommentCollapsed, visibleLoopCommentText, isLoopCommentBubbleVisible, loopCommentBubbleRadius]);

  useLayoutEffect(() => {
    const boxEl = frameDetailTextBoxRef.current;
    const dotEl = frameDetailDotRef.current;
    const textEl = frameDetailTextInnerRef.current;
    if (!boxEl || !dotEl || !textEl || !hasFrameDetailOverlayText) return;

    gsap.killTweensOf([boxEl, dotEl, textEl]);
    if (isFrameDetailTextCollapsed) {
      const tl = gsap.timeline();
      gsap.set(dotEl, { pointerEvents: 'none' });
      tl.to(textEl, { opacity: 0, duration: 0.1, ease: 'power1.out' })
        .to(
          boxEl,
          {
            scale: 0.12,
            autoAlpha: 0,
            borderRadius: 999,
            duration: 0.26,
            ease: 'power2.inOut',
          },
          '<'
        )
        .fromTo(
          dotEl,
          { scale: 0.72, autoAlpha: 0 },
          {
            scale: 1,
            autoAlpha: 1,
            duration: 0.16,
            ease: 'power2.out',
            onStart: () => gsap.set(dotEl, { pointerEvents: 'auto' }),
          },
          '-=0.06'
        );
      return;
    }

    gsap.set(dotEl, { pointerEvents: 'none' });
    const tl = gsap.timeline();
    tl.to(dotEl, { scale: 0.72, autoAlpha: 0, duration: 0.12, ease: 'power2.inOut' }).fromTo(
      boxEl,
      { scale: 0.12, autoAlpha: 0, borderRadius: 999 },
      { scale: 1, autoAlpha: 1, borderRadius: loopCommentBubbleRadius, duration: 0.28, ease: 'power2.out' },
      '<'
    );
    tl.to(textEl, { opacity: 1, duration: 0.18, ease: 'power1.out' }, '-=0.16');
  }, [isFrameDetailTextCollapsed, hasFrameDetailOverlayText, loopCommentBubbleRadius]);

  useLayoutEffect(() => {
    const el = frameDetailTextBoxRef.current;
    if (!el || !hasFrameDetailOverlayText) return;

    const minFont = 6;
    const maxFont = isTabletOrMobileView ? 11.5 : 13;
    const parsePadding = (value: string) => {
      const [v, h] = value.split(' ');
      return {
        vertical: Number.parseFloat(v || '6') || 6,
        horizontal: Number.parseFloat(h || v || '8') || 8,
      };
    };
    const applySize = (fontSize: number) => {
      const scale = (fontSize - minFont) / (maxFont - minFont || 1);
      const vertical = (isTabletOrMobileView ? 2 : 3) + scale * (isTabletOrMobileView ? 4 : 6);
      const horizontal = (isTabletOrMobileView ? 4 : 5) + scale * (isTabletOrMobileView ? 5 : 7);
      const lineHeight = 1.14 + scale * 0.2;
      el.style.fontSize = `${fontSize}px`;
      el.style.lineHeight = String(Number(lineHeight.toFixed(2)));
      el.style.padding = `${Math.round(vertical)}px ${Math.round(horizontal)}px`;
    };

    let font = Math.max(minFont, Math.min(maxFont, frameDetailTextBoxSizing.fontSize));
    const parsedBasePad = parsePadding(frameDetailTextBoxSizing.padding);
    el.style.fontSize = `${font}px`;
    el.style.lineHeight = String(frameDetailTextBoxSizing.lineHeight);
    el.style.padding = `${Math.round(parsedBasePad.vertical)}px ${Math.round(parsedBasePad.horizontal)}px`;

    while ((el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth) && font > minFont) {
      font = Math.max(minFont, font - 0.5);
      applySize(font);
      if (font <= minFont) break;
    }
  }, [
    hasFrameDetailOverlayText,
    isTabletOrMobileView,
    frameDetailTextBoxSizing.fontSize,
    frameDetailTextBoxSizing.lineHeight,
    frameDetailTextBoxSizing.padding,
    frameDetailOverlayTextTrimmed,
    frameDetailTextBoxWidth,
    frameDetailTextBoxHeight,
    loopOverlaySizePx.width,
    loopOverlaySizePx.height,
  ]);

  if (!videoUrl) {
    if (canRequestAddUrl && onRequestAddUrl) {
      return (
        <div
          style={{
            width: '100%',
            maxWidth: '100%',
            aspectRatio: '16 / 9',
            minHeight: 200,
            ...(isSessionDetail ? { maxHeight: '100%' } : {}),
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: SPACING.lg,
            gap: SPACING.md,
          }}
        >
          <button
            type="button"
            onClick={onRequestAddUrl}
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
        </div>
      );
    }

    return (
      <div
        style={{
          width: '100%',
          maxWidth: '100%',
          aspectRatio: '16 / 9',
          minHeight: 200,
          ...(isSessionDetail ? { maxHeight: '100%' } : {}),
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
    );
  }

  return (
    <div
      ref={fullscreenRootRef}
      style={{
        position: 'relative',
        width: '100%',
        minWidth: 0,
        ...(isSessionDetail
          ? {
              height: '100%',
              minHeight: 0,
              maxHeight: '100%',
              display: 'flex',
              flexDirection: 'column',
            }
          : {}),
      }}
    >
      <div
        style={
          isSessionDetail
            ? { minHeight: 0, overflow: 'hidden' }
            : undefined
        }
      >
      {isYoutube && youtubeVideoId ? (
        <>
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '100%',
              aspectRatio: '16 / 9',
              overflow: 'hidden',
              minWidth: 0,
              ...(isSessionDetail ? { maxHeight: '100%' } : {}),
            }}
          >
            <div
              ref={playerContainerRef}
              key={`yt-${videoKey ?? youtubeVideoId}-${retryCount}`}
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
            {!isPlayerReady && !videoError && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: SPACING.md,
                  background: 'rgba(0,0,0,0.6)',
                  color: '#fff',
                }}
                aria-live="polite"
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    border: '3px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff',
                    borderRadius: '50%',
                    animation: 'video-loading-spin 0.8s linear infinite',
                  }}
                />
                <span style={{ ...TYPOGRAPHY.bodySmall, fontWeight: 500 }}>Loading video…</span>
              </div>
            )}
            {videoError && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: SPACING.md,
                  background: 'rgba(0,0,0,0.75)',
                  color: '#fff',
                  padding: SPACING.lg,
                  textAlign: 'center',
                }}
              >
                <span style={{ ...TYPOGRAPHY.bodySmall }}>{videoError}</span>
                <button
                  type="button"
                  onClick={() => setRetryCount((c) => c + 1)}
                  style={{
                    padding: `${SPACING.sm}px ${SPACING.lg}px`,
                    borderRadius: RADIUS.md,
                    border: 'none',
                    backgroundColor: '#fff',
                    color: '#1C1C1E',
                    ...TYPOGRAPHY.labelMed,
                    cursor: 'pointer',
                  }}
                >
                  Retry
                </button>
              </div>
            )}
            {skipIndicator && (
              <div
                aria-live="polite"
                aria-atomic="true"
                style={{
                  position: 'absolute',
                  ...(skipIndicator.side === 'left'
                    ? { left: 'clamp(12px, 3vw, 24px)' }
                    : { right: 'clamp(12px, 3vw, 24px)' }),
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 3,
                  padding: '8px 14px',
                  borderRadius: 8,
                  background: 'rgba(0,0,0,0.5)',
                  color: '#fff',
                  fontSize: 'clamp(14px, 2.5vw, 18px)',
                  fontWeight: 700,
                  transition: 'opacity 0.25s ease',
                  opacity: skipIndicatorFadeOut ? 0 : 1,
                  pointerEvents: 'none',
                  textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                }}
              >
                {skipIndicator.label}
              </div>
            )}
            {visibleLoopCommentText && (
              <div
                ref={loopCommentBubbleRef}
                style={{
                  position: 'absolute',
                  ...(visibleLoopCommentLayout
                    ? {
                        left: `${visibleLoopCommentLayout.x}%`,
                        top: `${visibleLoopCommentLayout.y}%`,
                        transform: 'translate(-50%, -50%)',
                        width: `${visibleLoopCommentLayout.width}%`,
                        height: `${visibleLoopCommentLayout.height}%`,
                        minHeight: 32,
                      }
                    : {
                        top: 'clamp(10px, 2vw, 16px)',
                        left: 'clamp(10px, 2vw, 16px)',
                        maxWidth: 'min(46ch, 62%)',
                      }),
                  zIndex: 3,
                  padding: loopCommentBubbleSizing.padding,
                  borderRadius: loopCommentBubbleRadius,
                  background: '#ffffff',
                  color: '#111111',
                  fontSize: loopCommentBubbleSizing.fontSize,
                  fontWeight: 500,
                  lineHeight: loopCommentBubbleSizing.lineHeight,
                  letterSpacing: '-0.01em',
                  boxShadow: '0 6px 18px rgba(0,0,0,0.16)',
                  pointerEvents: isLoopCommentCollapsed ? 'none' : 'auto',
                  whiteSpace: 'normal',
                  wordBreak: 'break-word',
                  overflowWrap: 'anywhere',
                  overflow: visibleLoopCommentLayout ? 'hidden' : undefined,
                  opacity: isLoopCommentBubbleVisible ? 1 : 0,
                  transform: visibleLoopCommentLayout
                    ? 'translate(-50%, -50%)'
                    : isLoopCommentBubbleVisible
                      ? 'translateY(0) scale(1)'
                      : 'translateY(8px) scale(0.96)',
                  filter: isLoopCommentBubbleVisible ? 'blur(0px)' : 'blur(0.6px)',
                  transition: 'opacity 180ms ease, transform 220ms cubic-bezier(0.22, 1, 0.36, 1), filter 180ms ease',
                  transformOrigin: 'top left',
                  cursor: isDraggingLoopTextBox ? 'grabbing' : isEditingLoopCommentOverlay ? 'grab' : 'default',
                  userSelect: isEditingLoopCommentOverlay ? 'none' : undefined,
                }}
                onClick={() => {
                  if (isEditingLoopCommentOverlay || isDraggingLoopTextBox || isResizingLoopTextBoxWidth || isResizingLoopTextBoxHeight) return;
                  setIsLoopCommentCollapsed(true);
                }}
                onPointerDown={isEditingLoopCommentOverlay ? handleLoopTextBoxPointerDown : undefined}
                onPointerMove={isEditingLoopCommentOverlay ? handleLoopTextBoxPointerMove : undefined}
                onPointerUp={isEditingLoopCommentOverlay ? handleLoopTextBoxPointerUp : undefined}
                onPointerLeave={isEditingLoopCommentOverlay ? handleLoopTextBoxPointerUp : undefined}
              >
                <span ref={loopCommentTextInnerRef}>{visibleLoopCommentText}</span>
              </div>
            )}
            {visibleLoopCommentText && visibleLoopCommentLayout && (
              <button
                ref={loopCommentDotRef}
                type="button"
                aria-label="Show comment"
                onClick={() => setIsLoopCommentCollapsed(false)}
                style={{
                  position: 'absolute',
                  left: `${visibleLoopCommentLayout.x}%`,
                  top: `${visibleLoopCommentLayout.y}%`,
                  transform: 'translate(-50%, -50%)',
                  width: 14,
                  height: 14,
                  aspectRatio: '1 / 1',
                  borderRadius: '50%',
                  border: '2px solid #ffffff',
                  background: 'transparent',
                  boxShadow: '0 0 0 2px rgba(0,0,0,0.28), 0 4px 12px rgba(0,0,0,0.22)',
                  zIndex: 3,
                  cursor: 'pointer',
                  opacity: 0,
                  pointerEvents: 'none',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#ffffff',
                  }}
                />
              </button>
            )}
            {visibleLoopCommentText && isEditingLoopCommentOverlay && (
              <>
                <div
                  role="presentation"
                  aria-label="Resize comment text width"
                  style={{
                    position: 'absolute',
                    left: `calc(${loopCommentTextBoxPosition.x}% + ${loopCommentTextBoxWidth / 2}%)`,
                    top: `${loopCommentTextBoxPosition.y}%`,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 3,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: '#ffffff',
                    border: '1px solid rgba(255,255,255,0.9)',
                    boxShadow: '0 3px 10px rgba(0,0,0,0.3), 0 0 0 1px rgba(148,163,184,0.38) inset',
                    cursor: 'ew-resize',
                    pointerEvents: 'auto',
                  }}
                  onPointerDown={handleLoopTextResizeWidthPointerDown}
                  onPointerMove={handleLoopTextResizeWidthPointerMove}
                  onPointerUp={handleLoopTextResizePointerUp}
                  onPointerLeave={handleLoopTextResizePointerUp}
                />
                <div
                  role="presentation"
                  aria-label="Resize comment text height"
                  style={{
                    position: 'absolute',
                    left: `${loopCommentTextBoxPosition.x}%`,
                    top: `calc(${loopCommentTextBoxPosition.y}% + ${loopCommentTextBoxHeight / 2}%)`,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 3,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: '#ffffff',
                    border: '1px solid rgba(255,255,255,0.9)',
                    boxShadow: '0 3px 10px rgba(0,0,0,0.3), 0 0 0 1px rgba(148,163,184,0.38) inset',
                    cursor: 'ns-resize',
                    pointerEvents: 'auto',
                  }}
                  onPointerDown={handleLoopTextResizeHeightPointerDown}
                  onPointerMove={handleLoopTextResizeHeightPointerMove}
                  onPointerUp={handleLoopTextResizePointerUp}
                  onPointerLeave={handleLoopTextResizePointerUp}
                />
              </>
            )}
            {isSessionDetail && videoDuration > 0 && (
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  padding: 'clamp(8px, 2vw, 16px)',
                  background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)',
                  zIndex: 2,
                  minWidth: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(8px, 2vw, 12px)', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <span style={{ fontSize: 'clamp(9px, 2.5vw, 10px)', fontWeight: 700, color: '#fff', minWidth: 28, flexShrink: 0 }}>
                      {formatTimestamp(currentVideoTime)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setIsLoopActive((a) => !a); }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 28,
                        height: 28,
                        padding: 0,
                        border: 'none',
                        borderRadius: 6,
                        background: isLoopActive ? `${accentColor}40` : 'transparent',
                        cursor: 'pointer',
                        color: isLoopActive ? '#fff' : 'rgba(255,255,255,0.7)',
                        boxShadow: isLoopActive ? `0 0 0 2px ${accentColor}` : undefined,
                      }}
                      title={isLoopActive ? 'Loop on' : 'Loop off'}
                      aria-label={isLoopActive ? 'Loop on' : 'Loop off'}
                    >
                      <IconRepeat size={18} />
                    </button>
                  </div>
                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                      height: 6,
                      borderRadius: 3,
                      background: 'rgba(255,255,255,0.3)',
                      position: 'relative',
                      cursor: 'pointer',
                    }}
                    onMouseDown={handleScrubPointerDown}
                    onTouchStart={handleScrubPointerDown}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: `${(videoDuration > 0 ? currentVideoTime / videoDuration : 0) * 100}%`,
                        borderRadius: 3,
                        backgroundColor: accentColor,
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        left: `calc(${(videoDuration > 0 ? currentVideoTime / videoDuration : 0) * 100}% - 6px)`,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: accentColor,
                        border: '2px solid #fff',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        pointerEvents: 'none',
                      }}
                    />
                    {markers.map((m) => {
                      const left = (m.time / videoDuration) * 100;
                      return (
                        <button
                          key={m.id ?? m.time}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            seekTo(m.time);
                            if (onMarkerClick) onMarkerClick(m);
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
                          title={m.label}
                        />
                      );
                    })}
                  </div>
                  <span style={{ fontSize: 'clamp(9px, 2.5vw, 10px)', fontWeight: 700, color: '#fff', minWidth: 28, flexShrink: 0 }}>
                    {formatTimestamp(videoDuration)}
                  </span>
                  <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                    {showVolumeSlider && (
                      <div style={{ position: 'absolute', bottom: '100%', marginBottom: 6, width: 24, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', left: '50%', transform: 'translateX(-50%)', zIndex: 3 }}>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.01}
                          value={isMuted ? 0 : volume}
                          onChange={handleVolumeChange}
                          style={{
                            width: 80,
                            height: 24,
                            transform: 'rotate(-90deg)',
                            transformOrigin: 'center',
                            accentColor: '#fff',
                            cursor: 'pointer',
                          }}
                          aria-label="Volume"
                        />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setShowVolumeSlider((s) => !s);
                        setShowSpeedMenu(false);
                      }}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        border: 'none',
                        background: 'rgba(255,255,255,0.2)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                      aria-label={showVolumeSlider ? 'Hide volume' : 'Volume'}
                    >
                      {isMuted ? <IconVolumeX size={14} /> : <IconVolume2 size={14} />}
                    </button>
                  </div>
                  <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                    {showSpeedMenu && (
                      <div
                        role="menu"
                        style={{
                          position: 'absolute',
                          bottom: '100%',
                          marginBottom: 6,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          zIndex: 4,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 2,
                          padding: 6,
                          borderRadius: 8,
                          background: 'rgba(0,0,0,0.92)',
                          minWidth: 58,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
                        }}
                      >
                        {PLAYBACK_SPEEDS.map((r) => (
                          <button
                            key={r}
                            type="button"
                            role="menuitem"
                            onClick={() => selectPlaybackSpeed(r)}
                            style={{
                              border: 'none',
                              borderRadius: 4,
                              padding: '4px 8px',
                              background: r === playbackRate ? 'rgba(255,255,255,0.2)' : 'transparent',
                              color: '#fff',
                              fontSize: 12,
                              fontWeight: r === playbackRate ? 700 : 500,
                              cursor: 'pointer',
                              textAlign: 'center',
                            }}
                          >
                            {formatPlaybackSpeedLabel(r)}
                          </button>
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setShowSpeedMenu((s) => !s);
                        setShowVolumeSlider(false);
                      }}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        border: 'none',
                        background: 'rgba(255,255,255,0.2)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        padding: 0,
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                      aria-label={showSpeedMenu ? 'Hide playback speed' : 'Playback speed'}
                      aria-expanded={showSpeedMenu}
                      title="Speed"
                    >
                      {formatPlaybackSpeedLabel(playbackRate)}
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => {
                        void toggleFullscreen();
                        onControlPressed?.();
                      }}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        border: 'none',
                        background: 'rgba(255,255,255,0.2)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                      aria-label={isFullscreen ? 'Exit full screen' : 'Full screen'}
                      title={isFullscreen ? 'Exit full screen' : 'Full screen'}
                    >
                      {isFullscreen ? <IconMinimize2 size={14} /> : <IconMaximize2 size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            )}
            {showFrameDetailReplyOverlay && (
              <div
                ref={frameDetailOverlayRef}
                style={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 4,
                  pointerEvents:
                    frameDetailMarkerReadOnly
                      ? 'none'
                      : isDraggingFrameCircle || isResizingFrameCircle || isDraggingFrameTextBox || isResizingFrameTextBoxWidth || isResizingFrameTextBoxHeight
                        ? 'auto'
                        : 'none',
                }}
              >
                <div
                  role="presentation"
                  style={{
                    position: 'absolute',
                    left: `${frameDetailCirclePosition.x}%`,
                    top: `${frameDetailCirclePosition.y}%`,
                    transform: 'translate(-50%, -50%)',
                    width: `${frameDetailCircleRadiusX * 2}%`,
                    height: `${frameDetailCircleRadiusY * 2}%`,
                    borderRadius: '50%',
                    backgroundColor: 'transparent',
                    border: '3px solid #e11',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                    cursor: frameDetailMarkerReadOnly ? 'default' : isDraggingFrameCircle ? 'grabbing' : 'grab',
                    pointerEvents: frameDetailMarkerReadOnly ? 'none' : 'auto',
                  }}
                  onPointerDown={handleFrameCirclePointerDown}
                  onPointerMove={handleFrameCirclePointerMove}
                  onPointerUp={handleFrameCirclePointerUp}
                  onPointerLeave={handleFrameCirclePointerUp}
                />
                {!frameDetailMarkerReadOnly && (
                  <>
                    <div
                      role="presentation"
                      aria-label="Resize marker width"
                      style={{
                        position: 'absolute',
                        left: `calc(${frameDetailCirclePosition.x}% + ${frameDetailCircleRadiusX}%)`,
                        top: `${frameDetailCirclePosition.y}%`,
                        transform: 'translate(-50%, -50%)',
                        width: 14,
                        height: 14,
                        borderRadius: 2,
                        backgroundColor: '#fff',
                        border: '2px solid #e11',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                        cursor: 'ew-resize',
                        pointerEvents: 'auto',
                      }}
                      onPointerDown={handleFrameResizePointerDown}
                      onPointerMove={handleFrameResizeWidthPointerMove}
                      onPointerUp={handleFrameResizePointerUp}
                      onPointerLeave={handleFrameResizePointerUp}
                    />
                    <div
                      role="presentation"
                      aria-label="Resize marker height"
                      style={{
                        position: 'absolute',
                        left: `${frameDetailCirclePosition.x}%`,
                        top: `calc(${frameDetailCirclePosition.y}% + ${frameDetailCircleRadiusY}%)`,
                        transform: 'translate(-50%, -50%)',
                        width: 14,
                        height: 14,
                        borderRadius: 2,
                        backgroundColor: '#fff',
                        border: '2px solid #e11',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                        cursor: 'ns-resize',
                        pointerEvents: 'auto',
                      }}
                      onPointerDown={handleFrameResizePointerDown}
                      onPointerMove={handleFrameResizeHeightPointerMove}
                      onPointerUp={handleFrameResizePointerUp}
                      onPointerLeave={handleFrameResizePointerUp}
                    />
                  </>
                )}
                {hasFrameDetailOverlayText && (
                  <div
                    ref={frameDetailTextBoxRef}
                    role="presentation"
                    style={{
                      position: 'absolute',
                      left: `${frameDetailTextBoxPosition.x}%`,
                      top: `${frameDetailTextBoxPosition.y}%`,
                      transform: 'translate(-50%, -50%)',
                      width: `${frameDetailTextBoxWidth}%`,
                      height: `${frameDetailTextBoxHeight}%`,
                      minHeight: 32,
                      borderRadius: loopCommentBubbleRadius,
                      background: '#ffffff',
                      backdropFilter: 'none',
                      WebkitBackdropFilter: 'none',
                      border: 'none',
                      boxShadow: isFrameTextBoxActive
                        ? '0 10px 26px rgba(0,0,0,0.22)'
                        : '0 6px 18px rgba(0,0,0,0.16)',
                      color: '#111111',
                      fontSize: frameDetailTextBoxSizing.fontSize,
                      fontWeight: 500,
                      lineHeight: frameDetailTextBoxSizing.lineHeight,
                      letterSpacing: '-0.01em',
                      padding: frameDetailTextBoxSizing.padding,
                      overflow: 'hidden',
                      cursor: frameTextBoxCursor,
                      pointerEvents: isFrameDetailTextCollapsed ? 'none' : 'auto',
                      transition: 'box-shadow 160ms ease, border-color 160ms ease, transform 120ms ease',
                      userSelect: 'none',
                    }}
                    onPointerDown={handleFrameTextBoxPointerDown}
                    onPointerMove={handleFrameTextBoxPointerMove}
                    onPointerUp={handleFrameTextBoxPointerUp}
                    onPointerLeave={handleFrameTextBoxPointerUp}
                    onClick={() => {
                      if (!frameDetailMarkerReadOnly) return;
                      setIsFrameDetailTextCollapsed(true);
                    }}
                  >
                    <span ref={frameDetailTextInnerRef}>{frameDetailOverlayTextTrimmed}</span>
                  </div>
                )}
                {hasFrameDetailOverlayText && (
                  <button
                    ref={frameDetailDotRef}
                    type="button"
                    aria-label="Show frame detail"
                    onClick={() => setIsFrameDetailTextCollapsed(false)}
                    style={{
                      position: 'absolute',
                      left: `${frameDetailTextBoxPosition.x}%`,
                      top: `${frameDetailTextBoxPosition.y}%`,
                      transform: 'translate(-50%, -50%)',
                      width: 14,
                      height: 14,
                      aspectRatio: '1 / 1',
                      borderRadius: '50%',
                      border: '2px solid #ffffff',
                      background: 'transparent',
                      boxShadow: '0 0 0 2px rgba(0,0,0,0.28), 0 4px 12px rgba(0,0,0,0.22)',
                      zIndex: 3,
                      cursor: 'pointer',
                      opacity: 0,
                      pointerEvents: 'none',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: '#ffffff',
                      }}
                    />
                  </button>
                )}
                {!frameDetailMarkerReadOnly && hasFrameDetailOverlayText && (
                  <>
                    <div
                      role="presentation"
                      aria-label="Resize frame text width"
                      style={{
                        position: 'absolute',
                        left: `calc(${frameDetailTextBoxPosition.x}% + ${frameDetailTextBoxWidth / 2}%)`,
                        top: `${frameDetailTextBoxPosition.y}%`,
                        transform: 'translate(-50%, -50%)',
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        background: '#ffffff',
                        border: '1px solid rgba(255,255,255,0.9)',
                        boxShadow: '0 3px 10px rgba(0,0,0,0.3), 0 0 0 1px rgba(148,163,184,0.38) inset',
                        cursor: 'ew-resize',
                        pointerEvents: 'auto',
                        transition: 'transform 120ms ease',
                      }}
                      onPointerDown={handleFrameTextResizeWidthPointerDown}
                      onPointerMove={handleFrameTextResizeWidthPointerMove}
                      onPointerUp={handleFrameTextResizePointerUp}
                      onPointerLeave={handleFrameTextResizePointerUp}
                    />
                    <div
                      role="presentation"
                      aria-label="Resize frame text height"
                      style={{
                        position: 'absolute',
                        left: `${frameDetailTextBoxPosition.x}%`,
                        top: `calc(${frameDetailTextBoxPosition.y}% + ${frameDetailTextBoxHeight / 2}%)`,
                        transform: 'translate(-50%, -50%)',
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        background: '#ffffff',
                        border: '1px solid rgba(255,255,255,0.9)',
                        boxShadow: '0 3px 10px rgba(0,0,0,0.3), 0 0 0 1px rgba(148,163,184,0.38) inset',
                        cursor: 'ns-resize',
                        pointerEvents: 'auto',
                        transition: 'transform 120ms ease',
                      }}
                      onPointerDown={handleFrameTextResizeHeightPointerDown}
                      onPointerMove={handleFrameTextResizeHeightPointerMove}
                      onPointerUp={handleFrameTextResizePointerUp}
                      onPointerLeave={handleFrameTextResizePointerUp}
                    />
                  </>
                )}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '100%',
              aspectRatio: videoAspectRatio ?? '16 / 9',
              minWidth: 0,
              ...(isSessionDetail ? { overflow: 'hidden', maxHeight: '100%' } : {}),
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
            </div>
            {!isPlayerReady && !videoError && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: SPACING.md,
                  background: 'rgba(0,0,0,0.6)',
                  color: '#fff',
                }}
                aria-live="polite"
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    border: '3px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff',
                    borderRadius: '50%',
                    animation: 'video-loading-spin 0.8s linear infinite',
                  }}
                />
                <span style={{ ...TYPOGRAPHY.bodySmall, fontWeight: 500 }}>Loading video…</span>
              </div>
            )}
            {videoError && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: SPACING.md,
                  background: 'rgba(0,0,0,0.75)',
                  color: '#fff',
                  padding: SPACING.lg,
                  textAlign: 'center',
                }}
              >
                <span style={{ ...TYPOGRAPHY.bodySmall }}>{videoError}</span>
                <button
                  type="button"
                  onClick={() => {
                    setVideoError(null);
                    setRetryCount((c) => c + 1);
                  }}
                  style={{
                    padding: `${SPACING.sm}px ${SPACING.lg}px`,
                    borderRadius: RADIUS.md,
                    border: 'none',
                    backgroundColor: '#fff',
                    color: '#1C1C1E',
                    ...TYPOGRAPHY.labelMed,
                    cursor: 'pointer',
                  }}
                >
                  Retry
                </button>
              </div>
            )}
            {skipIndicator && (
              <div
                aria-live="polite"
                aria-atomic="true"
                style={{
                  position: 'absolute',
                  ...(skipIndicator.side === 'left'
                    ? { left: 'clamp(12px, 3vw, 24px)' }
                    : { right: 'clamp(12px, 3vw, 24px)' }),
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 3,
                  padding: '8px 14px',
                  borderRadius: 8,
                  background: 'rgba(0,0,0,0.5)',
                  color: '#fff',
                  fontSize: 'clamp(14px, 2.5vw, 18px)',
                  fontWeight: 700,
                  transition: 'opacity 0.25s ease',
                  opacity: skipIndicatorFadeOut ? 0 : 1,
                  pointerEvents: 'none',
                  textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                }}
              >
                {skipIndicator.label}
              </div>
            )}
            {visibleLoopCommentText && (
              <div
                ref={loopCommentBubbleRef}
                style={{
                  position: 'absolute',
                  ...(visibleLoopCommentLayout
                    ? {
                        left: `${visibleLoopCommentLayout.x}%`,
                        top: `${visibleLoopCommentLayout.y}%`,
                        transform: 'translate(-50%, -50%)',
                        width: `${visibleLoopCommentLayout.width}%`,
                        height: `${visibleLoopCommentLayout.height}%`,
                        minHeight: 32,
                      }
                    : {
                        top: 'clamp(10px, 2vw, 16px)',
                        left: 'clamp(10px, 2vw, 16px)',
                        maxWidth: 'min(46ch, 62%)',
                      }),
                  zIndex: 3,
                  padding: loopCommentBubbleSizing.padding,
                  borderRadius: loopCommentBubbleRadius,
                  background: '#ffffff',
                  color: '#111111',
                  fontSize: loopCommentBubbleSizing.fontSize,
                  fontWeight: 500,
                  lineHeight: loopCommentBubbleSizing.lineHeight,
                  letterSpacing: '-0.01em',
                  boxShadow: '0 6px 18px rgba(0,0,0,0.16)',
                  pointerEvents: isLoopCommentCollapsed ? 'none' : 'auto',
                  whiteSpace: 'normal',
                  wordBreak: 'break-word',
                  overflowWrap: 'anywhere',
                  overflow: visibleLoopCommentLayout ? 'hidden' : undefined,
                  opacity: isLoopCommentBubbleVisible ? 1 : 0,
                  transform: visibleLoopCommentLayout
                    ? 'translate(-50%, -50%)'
                    : isLoopCommentBubbleVisible
                      ? 'translateY(0) scale(1)'
                      : 'translateY(8px) scale(0.96)',
                  filter: isLoopCommentBubbleVisible ? 'blur(0px)' : 'blur(0.6px)',
                  transition: 'opacity 180ms ease, transform 220ms cubic-bezier(0.22, 1, 0.36, 1), filter 180ms ease',
                  transformOrigin: 'top left',
                  cursor: isDraggingLoopTextBox ? 'grabbing' : isEditingLoopCommentOverlay ? 'grab' : 'default',
                  userSelect: isEditingLoopCommentOverlay ? 'none' : undefined,
                }}
                onClick={() => {
                  if (isEditingLoopCommentOverlay || isDraggingLoopTextBox || isResizingLoopTextBoxWidth || isResizingLoopTextBoxHeight) return;
                  setIsLoopCommentCollapsed(true);
                }}
                onPointerDown={isEditingLoopCommentOverlay ? handleLoopTextBoxPointerDown : undefined}
                onPointerMove={isEditingLoopCommentOverlay ? handleLoopTextBoxPointerMove : undefined}
                onPointerUp={isEditingLoopCommentOverlay ? handleLoopTextBoxPointerUp : undefined}
                onPointerLeave={isEditingLoopCommentOverlay ? handleLoopTextBoxPointerUp : undefined}
              >
                <span ref={loopCommentTextInnerRef}>{visibleLoopCommentText}</span>
              </div>
            )}
            {visibleLoopCommentText && visibleLoopCommentLayout && (
              <button
                ref={loopCommentDotRef}
                type="button"
                aria-label="Show comment"
                onClick={() => setIsLoopCommentCollapsed(false)}
                style={{
                  position: 'absolute',
                  left: `${visibleLoopCommentLayout.x}%`,
                  top: `${visibleLoopCommentLayout.y}%`,
                  transform: 'translate(-50%, -50%)',
                  width: 14,
                  height: 14,
                  aspectRatio: '1 / 1',
                  borderRadius: '50%',
                  border: '2px solid #ffffff',
                  background: 'transparent',
                  boxShadow: '0 0 0 2px rgba(0,0,0,0.28), 0 4px 12px rgba(0,0,0,0.22)',
                  zIndex: 3,
                  cursor: 'pointer',
                  opacity: 0,
                  pointerEvents: 'none',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#ffffff',
                  }}
                />
              </button>
            )}
            {visibleLoopCommentText && isEditingLoopCommentOverlay && (
              <>
                <div
                  role="presentation"
                  aria-label="Resize comment text width"
                  style={{
                    position: 'absolute',
                    left: `calc(${loopCommentTextBoxPosition.x}% + ${loopCommentTextBoxWidth / 2}%)`,
                    top: `${loopCommentTextBoxPosition.y}%`,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 3,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: '#ffffff',
                    border: '1px solid rgba(255,255,255,0.9)',
                    boxShadow: '0 3px 10px rgba(0,0,0,0.3), 0 0 0 1px rgba(148,163,184,0.38) inset',
                    cursor: 'ew-resize',
                    pointerEvents: 'auto',
                  }}
                  onPointerDown={handleLoopTextResizeWidthPointerDown}
                  onPointerMove={handleLoopTextResizeWidthPointerMove}
                  onPointerUp={handleLoopTextResizePointerUp}
                  onPointerLeave={handleLoopTextResizePointerUp}
                />
                <div
                  role="presentation"
                  aria-label="Resize comment text height"
                  style={{
                    position: 'absolute',
                    left: `${loopCommentTextBoxPosition.x}%`,
                    top: `calc(${loopCommentTextBoxPosition.y}% + ${loopCommentTextBoxHeight / 2}%)`,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 3,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: '#ffffff',
                    border: '1px solid rgba(255,255,255,0.9)',
                    boxShadow: '0 3px 10px rgba(0,0,0,0.3), 0 0 0 1px rgba(148,163,184,0.38) inset',
                    cursor: 'ns-resize',
                    pointerEvents: 'auto',
                  }}
                  onPointerDown={handleLoopTextResizeHeightPointerDown}
                  onPointerMove={handleLoopTextResizeHeightPointerMove}
                  onPointerUp={handleLoopTextResizePointerUp}
                  onPointerLeave={handleLoopTextResizePointerUp}
                />
              </>
            )}
            <video
              key={`${videoKey ?? 'video'}-${retryCount}`}
              ref={videoRef}
              muted={isMuted}
              autoPlay={shouldAutoplay}
              playsInline
              preload="metadata"
              style={{
                width: '100%',
                height: '100%',
                display: 'block',
                objectFit: 'contain',
              }}
              onPlay={() => {
                setIsVideoPlaying(true);
                onPlayProp?.();
              }}
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
                setIsPlayerReady(true);
                onPlayerReady?.();
                if (shouldAutoplay) {
                  v.muted = false;
                  v.play()
                    .then(() => {
                      setIsMuted(false);
                    })
                    .catch(() => {
                      v.muted = true;
                      setIsMuted(true);
                      v.play().catch(() => {});
                    });
                }
              }}
              onError={() => {
                setVideoError('Video failed to load. The source may be unavailable or blocked.');
              }}
            >
              <source src={videoUrl} />
            </video>
            {isSessionDetail && videoDuration > 0 && (
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  padding: 'clamp(8px, 2vw, 16px)',
                  background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)',
                  zIndex: 2,
                  minWidth: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(8px, 2vw, 12px)', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <span style={{ fontSize: 'clamp(9px, 2.5vw, 10px)', fontWeight: 700, color: '#fff', minWidth: 28, flexShrink: 0 }}>
                      {formatTimestamp(currentVideoTime)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setIsLoopActive((a) => !a); }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 28,
                        height: 28,
                        padding: 0,
                        border: 'none',
                        borderRadius: 6,
                        background: isLoopActive ? `${accentColor}40` : 'transparent',
                        cursor: 'pointer',
                        color: isLoopActive ? '#fff' : 'rgba(255,255,255,0.7)',
                        boxShadow: isLoopActive ? `0 0 0 2px ${accentColor}` : undefined,
                      }}
                      title={isLoopActive ? 'Loop on' : 'Loop off'}
                      aria-label={isLoopActive ? 'Loop on' : 'Loop off'}
                    >
                      <IconRepeat size={18} />
                    </button>
                  </div>
                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                      height: 6,
                      borderRadius: 3,
                      background: 'rgba(255,255,255,0.3)',
                      position: 'relative',
                      cursor: 'pointer',
                    }}
                    onMouseDown={handleScrubPointerDown}
                    onTouchStart={handleScrubPointerDown}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: `${(videoDuration > 0 ? currentVideoTime / videoDuration : 0) * 100}%`,
                        borderRadius: 3,
                        backgroundColor: accentColor,
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        left: `calc(${(videoDuration > 0 ? currentVideoTime / videoDuration : 0) * 100}% - 6px)`,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: accentColor,
                        border: '2px solid #fff',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        pointerEvents: 'none',
                      }}
                    />
                    {markers.map((m) => {
                      const left = (m.time / videoDuration) * 100;
                      return (
                        <button
                          key={m.id ?? m.time}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            seekTo(m.time);
                            if (onMarkerClick) onMarkerClick(m);
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
                          title={m.label}
                        />
                      );
                    })}
                  </div>
                  <span style={{ fontSize: 'clamp(9px, 2.5vw, 10px)', fontWeight: 700, color: '#fff', minWidth: 28, flexShrink: 0 }}>
                    {formatTimestamp(videoDuration)}
                  </span>
                  <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                    {showVolumeSlider && (
                      <div style={{ position: 'absolute', bottom: '100%', marginBottom: 6, width: 24, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', left: '50%', transform: 'translateX(-50%)', zIndex: 3 }}>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.01}
                          value={isMuted ? 0 : volume}
                          onChange={handleVolumeChange}
                          style={{
                            width: 80,
                            height: 24,
                            transform: 'rotate(-90deg)',
                            transformOrigin: 'center',
                            accentColor: '#fff',
                            cursor: 'pointer',
                          }}
                          aria-label="Volume"
                        />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setShowVolumeSlider((s) => !s);
                        setShowSpeedMenu(false);
                      }}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        border: 'none',
                        background: 'rgba(255,255,255,0.2)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                      aria-label={showVolumeSlider ? 'Hide volume' : 'Volume'}
                    >
                      {isMuted ? <IconVolumeX size={14} /> : <IconVolume2 size={14} />}
                    </button>
                  </div>
                  <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                    {showSpeedMenu && (
                      <div
                        role="menu"
                        style={{
                          position: 'absolute',
                          bottom: '100%',
                          marginBottom: 6,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          zIndex: 4,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 2,
                          padding: 6,
                          borderRadius: 8,
                          background: 'rgba(0,0,0,0.92)',
                          minWidth: 58,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
                        }}
                      >
                        {PLAYBACK_SPEEDS.map((r) => (
                          <button
                            key={r}
                            type="button"
                            role="menuitem"
                            onClick={() => selectPlaybackSpeed(r)}
                            style={{
                              border: 'none',
                              borderRadius: 4,
                              padding: '4px 8px',
                              background: r === playbackRate ? 'rgba(255,255,255,0.2)' : 'transparent',
                              color: '#fff',
                              fontSize: 12,
                              fontWeight: r === playbackRate ? 700 : 500,
                              cursor: 'pointer',
                              textAlign: 'center',
                            }}
                          >
                            {formatPlaybackSpeedLabel(r)}
                          </button>
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setShowSpeedMenu((s) => !s);
                        setShowVolumeSlider(false);
                      }}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        border: 'none',
                        background: 'rgba(255,255,255,0.2)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        padding: 0,
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                      aria-label={showSpeedMenu ? 'Hide playback speed' : 'Playback speed'}
                      aria-expanded={showSpeedMenu}
                      title="Speed"
                    >
                      {formatPlaybackSpeedLabel(playbackRate)}
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => {
                        void toggleFullscreen();
                        onControlPressed?.();
                      }}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        border: 'none',
                        background: 'rgba(255,255,255,0.2)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                      aria-label={isFullscreen ? 'Exit full screen' : 'Full screen'}
                      title={isFullscreen ? 'Exit full screen' : 'Full screen'}
                    >
                      {isFullscreen ? <IconMinimize2 size={14} /> : <IconMaximize2 size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            )}
            {showFrameDetailReplyOverlay && (
              <div
                ref={frameDetailOverlayRef}
                style={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 4,
                  pointerEvents:
                    frameDetailMarkerReadOnly
                      ? 'none'
                      : isDraggingFrameCircle || isResizingFrameCircle || isDraggingFrameTextBox || isResizingFrameTextBoxWidth || isResizingFrameTextBoxHeight
                        ? 'auto'
                        : 'none',
                }}
              >
                <div
                  role="presentation"
                  style={{
                    position: 'absolute',
                    left: `${frameDetailCirclePosition.x}%`,
                    top: `${frameDetailCirclePosition.y}%`,
                    transform: 'translate(-50%, -50%)',
                    width: `${frameDetailCircleRadiusX * 2}%`,
                    height: `${frameDetailCircleRadiusY * 2}%`,
                    borderRadius: '50%',
                    backgroundColor: 'transparent',
                    border: '3px solid #e11',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                    cursor: frameDetailMarkerReadOnly ? 'default' : isDraggingFrameCircle ? 'grabbing' : 'grab',
                    pointerEvents: frameDetailMarkerReadOnly ? 'none' : 'auto',
                  }}
                  onPointerDown={handleFrameCirclePointerDown}
                  onPointerMove={handleFrameCirclePointerMove}
                  onPointerUp={handleFrameCirclePointerUp}
                  onPointerLeave={handleFrameCirclePointerUp}
                />
                {!frameDetailMarkerReadOnly && (
                  <>
                    <div
                      role="presentation"
                      aria-label="Resize marker width"
                      style={{
                        position: 'absolute',
                        left: `calc(${frameDetailCirclePosition.x}% + ${frameDetailCircleRadiusX}%)`,
                        top: `${frameDetailCirclePosition.y}%`,
                        transform: 'translate(-50%, -50%)',
                        width: 14,
                        height: 14,
                        borderRadius: 2,
                        backgroundColor: '#fff',
                        border: '2px solid #e11',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                        cursor: 'ew-resize',
                        pointerEvents: 'auto',
                      }}
                      onPointerDown={handleFrameResizePointerDown}
                      onPointerMove={handleFrameResizeWidthPointerMove}
                      onPointerUp={handleFrameResizePointerUp}
                      onPointerLeave={handleFrameResizePointerUp}
                    />
                    <div
                      role="presentation"
                      aria-label="Resize marker height"
                      style={{
                        position: 'absolute',
                        left: `${frameDetailCirclePosition.x}%`,
                        top: `calc(${frameDetailCirclePosition.y}% + ${frameDetailCircleRadiusY}%)`,
                        transform: 'translate(-50%, -50%)',
                        width: 14,
                        height: 14,
                        borderRadius: 2,
                        backgroundColor: '#fff',
                        border: '2px solid #e11',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                        cursor: 'ns-resize',
                        pointerEvents: 'auto',
                      }}
                      onPointerDown={handleFrameResizePointerDown}
                      onPointerMove={handleFrameResizeHeightPointerMove}
                      onPointerUp={handleFrameResizePointerUp}
                      onPointerLeave={handleFrameResizePointerUp}
                    />
                  </>
                )}
                {hasFrameDetailOverlayText && (
                  <div
                    ref={frameDetailTextBoxRef}
                    role="presentation"
                    style={{
                      position: 'absolute',
                      left: `${frameDetailTextBoxPosition.x}%`,
                      top: `${frameDetailTextBoxPosition.y}%`,
                      transform: 'translate(-50%, -50%)',
                      width: `${frameDetailTextBoxWidth}%`,
                      height: `${frameDetailTextBoxHeight}%`,
                      minHeight: 32,
                      borderRadius: loopCommentBubbleRadius,
                      background: '#ffffff',
                      backdropFilter: 'none',
                      WebkitBackdropFilter: 'none',
                      border: 'none',
                      boxShadow: isFrameTextBoxActive
                        ? '0 10px 26px rgba(0,0,0,0.22)'
                        : '0 6px 18px rgba(0,0,0,0.16)',
                      color: '#111111',
                      fontSize: frameDetailTextBoxSizing.fontSize,
                      fontWeight: 500,
                      lineHeight: frameDetailTextBoxSizing.lineHeight,
                      letterSpacing: '-0.01em',
                      padding: frameDetailTextBoxSizing.padding,
                      overflow: 'hidden',
                      cursor: frameTextBoxCursor,
                      pointerEvents: isFrameDetailTextCollapsed ? 'none' : 'auto',
                      transition: 'box-shadow 160ms ease, border-color 160ms ease, transform 120ms ease',
                      userSelect: 'none',
                    }}
                    onPointerDown={handleFrameTextBoxPointerDown}
                    onPointerMove={handleFrameTextBoxPointerMove}
                    onPointerUp={handleFrameTextBoxPointerUp}
                    onPointerLeave={handleFrameTextBoxPointerUp}
                    onClick={() => {
                      if (!frameDetailMarkerReadOnly) return;
                      setIsFrameDetailTextCollapsed(true);
                    }}
                  >
                    <span ref={frameDetailTextInnerRef}>{frameDetailOverlayTextTrimmed}</span>
                  </div>
                )}
                {hasFrameDetailOverlayText && (
                  <button
                    ref={frameDetailDotRef}
                    type="button"
                    aria-label="Show frame detail"
                    onClick={() => setIsFrameDetailTextCollapsed(false)}
                    style={{
                      position: 'absolute',
                      left: `${frameDetailTextBoxPosition.x}%`,
                      top: `${frameDetailTextBoxPosition.y}%`,
                      transform: 'translate(-50%, -50%)',
                      width: 14,
                      height: 14,
                      aspectRatio: '1 / 1',
                      borderRadius: '50%',
                      border: '2px solid #ffffff',
                      background: 'transparent',
                      boxShadow: '0 0 0 2px rgba(0,0,0,0.28), 0 4px 12px rgba(0,0,0,0.22)',
                      zIndex: 3,
                      cursor: 'pointer',
                      opacity: 0,
                      pointerEvents: 'none',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: '#ffffff',
                      }}
                    />
                  </button>
                )}
                {!frameDetailMarkerReadOnly && hasFrameDetailOverlayText && (
                  <>
                    <div
                      role="presentation"
                      aria-label="Resize frame text width"
                      style={{
                        position: 'absolute',
                        left: `calc(${frameDetailTextBoxPosition.x}% + ${frameDetailTextBoxWidth / 2}%)`,
                        top: `${frameDetailTextBoxPosition.y}%`,
                        transform: 'translate(-50%, -50%)',
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        background: '#ffffff',
                        border: '1px solid rgba(255,255,255,0.9)',
                        boxShadow: '0 3px 10px rgba(0,0,0,0.3), 0 0 0 1px rgba(148,163,184,0.38) inset',
                        cursor: 'ew-resize',
                        pointerEvents: 'auto',
                        transition: 'transform 120ms ease',
                      }}
                      onPointerDown={handleFrameTextResizeWidthPointerDown}
                      onPointerMove={handleFrameTextResizeWidthPointerMove}
                      onPointerUp={handleFrameTextResizePointerUp}
                      onPointerLeave={handleFrameTextResizePointerUp}
                    />
                    <div
                      role="presentation"
                      aria-label="Resize frame text height"
                      style={{
                        position: 'absolute',
                        left: `${frameDetailTextBoxPosition.x}%`,
                        top: `calc(${frameDetailTextBoxPosition.y}% + ${frameDetailTextBoxHeight / 2}%)`,
                        transform: 'translate(-50%, -50%)',
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        background: '#ffffff',
                        border: '1px solid rgba(255,255,255,0.9)',
                        boxShadow: '0 3px 10px rgba(0,0,0,0.3), 0 0 0 1px rgba(148,163,184,0.38) inset',
                        cursor: 'ns-resize',
                        pointerEvents: 'auto',
                        transition: 'transform 120ms ease',
                      }}
                      onPointerDown={handleFrameTextResizeHeightPointerDown}
                      onPointerMove={handleFrameTextResizeHeightPointerMove}
                      onPointerUp={handleFrameTextResizePointerUp}
                      onPointerLeave={handleFrameTextResizePointerUp}
                    />
                  </>
                )}
              </div>
            )}
          </div>
        </>
      )}
      </div>

      {videoDuration > 0 && !isSessionDetail && (
        <div
          style={{
            padding: `0 clamp(${SPACING.sm}px, 2vw, ${SPACING.md}px) ${SPACING.sm}px`,
            backgroundColor: 'transparent',
            borderTop: 'none',
            minWidth: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: SPACING.sm,
              minWidth: 0,
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
                  borderRadius: 2,
                  background: `linear-gradient(to right, #FFFFFF ${
                    videoDuration > 0 ? (currentVideoTime / videoDuration) * 100 : 0
                  }%, rgba(255, 255, 255, 0.25) ${
                    videoDuration > 0 ? (currentVideoTime / videoDuration) * 100 : 0
                  }%)`,
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
              {markers.map((m) => {
                const left = (m.time / videoDuration) * 100;
                return (
                  <button
                    key={m.id ?? m.time}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      seekTo(m.time);
                      if (onMarkerClick) onMarkerClick(m);
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
                    title={m.label}
                  />
                );
              })}
            </div>
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              {showVolumeSlider && (
                <div style={{ position: 'absolute', bottom: '100%', marginBottom: 6, width: 24, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', left: '50%', transform: 'translateX(-50%)', zIndex: 3 }}>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    style={{
                      width: 80,
                      height: 24,
                      transform: 'rotate(-90deg)',
                      transformOrigin: 'center',
                      accentColor: '#FFFFFF',
                      cursor: 'pointer',
                    }}
                    aria-label="Volume"
                  />
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setShowVolumeSlider((s) => !s);
                  setShowSpeedMenu(false);
                }}
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
                aria-label={showVolumeSlider ? 'Hide volume' : 'Volume'}
              >
                {isMuted ? <IconVolumeX size={16} /> : <IconVolume2 size={16} />}
              </button>
            </div>
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              {showSpeedMenu && (
                <div
                  role="menu"
                  style={{
                    position: 'absolute',
                    bottom: '100%',
                    marginBottom: 6,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    padding: 6,
                    borderRadius: 8,
                    background: 'rgba(0,0,0,0.92)',
                    minWidth: 58,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
                  }}
                >
                  {PLAYBACK_SPEEDS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      role="menuitem"
                      onClick={() => selectPlaybackSpeed(r)}
                      style={{
                        border: 'none',
                        borderRadius: 4,
                        padding: '4px 8px',
                        background: r === playbackRate ? 'rgba(255,255,255,0.2)' : 'transparent',
                        color: '#fff',
                        fontSize: 12,
                        fontWeight: r === playbackRate ? 700 : 500,
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      {formatPlaybackSpeedLabel(r)}
                    </button>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setShowSpeedMenu((s) => !s);
                  setShowVolumeSlider(false);
                }}
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
                  fontSize: 11,
                  fontWeight: 700,
                }}
                aria-label={showSpeedMenu ? 'Hide playback speed' : 'Playback speed'}
                aria-expanded={showSpeedMenu}
                title="Speed"
              >
                {formatPlaybackSpeedLabel(playbackRate)}
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => {
                  void toggleFullscreen();
                  onControlPressed?.();
                }}
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
                aria-label={isFullscreen ? 'Exit full screen' : 'Full screen'}
                title={isFullscreen ? 'Exit full screen' : 'Full screen'}
              >
                {isFullscreen ? <IconMinimize2 size={16} /> : <IconMaximize2 size={16} />}
              </button>
            </div>
          </div>
          {!isSessionDetail && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: SPACING.xs,
              paddingTop: SPACING.xs,
              paddingBottom: SPACING.xs,
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              flexWrap: 'nowrap',
              width: '100%',
            }}
          >
            <button
              type="button"
              onClick={() => skipBy(-1 / 30)}
              style={{
                flex: 1,
                minWidth: 20,
                ...(skipButtonsFillWidth ? {} : { maxWidth: 26 }),
                aspectRatio: 1,
                height: 'auto',
                flexShrink: 0,
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
                fontSize: 'clamp(8px, 2vw, 9px)',
              }}
              aria-label="Skip back 1 frame"
              title="−1f"
            >
              −1f
            </button>
            <button
              type="button"
              onClick={() => skipBy(-10)}
              style={{
                flex: 1,
                minWidth: 20,
                ...(skipButtonsFillWidth ? {} : { maxWidth: 26 }),
                aspectRatio: 1,
                height: 'auto',
                flexShrink: 0,
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
                fontSize: 'clamp(8px, 2vw, 9px)',
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
                flex: 1,
                minWidth: 28,
                ...(skipButtonsFillWidth ? {} : { maxWidth: 36 }),
                aspectRatio: 1,
                height: 'auto',
                flexShrink: 0,
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
                fontSize: 'clamp(9px, 2.2vw, 11px)',
              }}
              aria-label="Skip back 5 seconds"
              title="−5s"
            >
              −5s
            </button>
            <button
              type="button"
              onClick={() => skipBy(-1)}
              style={{
                flex: 1,
                minWidth: 28,
                ...(skipButtonsFillWidth ? {} : { maxWidth: 36 }),
                aspectRatio: 1,
                height: 'auto',
                flexShrink: 0,
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
                fontSize: 'clamp(9px, 2.2vw, 11px)',
              }}
              aria-label="Skip back 1 second"
              title="−1s"
            >
              −1s
            </button>
            <button
              type="button"
              onClick={handlePlayPause}
              style={{
                flex: 1,
                minWidth: 30,
                ...(skipButtonsFillWidth ? {} : { maxWidth: 40 }),
                aspectRatio: 1,
                height: 'auto',
                flexShrink: 0,
                borderRadius: '50%',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                color: 'rgba(0, 0, 0, 0.85)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: 0,
              }}
              aria-label={isVideoPlaying ? 'Pause' : 'Play'}
              title={isVideoPlaying ? 'Pause' : 'Play'}
            >
              {isVideoPlaying ? <IconPause size={18} /> : <IconPlay size={18} />}
            </button>
            <button
              type="button"
              onClick={() => skipBy(1)}
              style={{
                flex: 1,
                minWidth: 28,
                ...(skipButtonsFillWidth ? {} : { maxWidth: 36 }),
                aspectRatio: 1,
                height: 'auto',
                flexShrink: 0,
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
                fontSize: 'clamp(9px, 2.2vw, 11px)',
              }}
              aria-label="Skip forward 1 second"
              title="+1s"
            >
              +1s
            </button>
            <button
              type="button"
              onClick={() => skipBy(5)}
              style={{
                flex: 1,
                minWidth: 28,
                ...(skipButtonsFillWidth ? {} : { maxWidth: 36 }),
                aspectRatio: 1,
                height: 'auto',
                flexShrink: 0,
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
                fontSize: 'clamp(9px, 2.2vw, 11px)',
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
                flex: 1,
                minWidth: 20,
                ...(skipButtonsFillWidth ? {} : { maxWidth: 26 }),
                aspectRatio: 1,
                height: 'auto',
                flexShrink: 0,
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
                fontSize: 'clamp(8px, 2vw, 9px)',
              }}
              aria-label="Skip forward 10 seconds"
              title="+10s"
            >
              +10s
            </button>
            <button
              type="button"
              onClick={() => skipBy(1 / 30)}
              style={{
                flex: 1,
                minWidth: 20,
                ...(skipButtonsFillWidth ? {} : { maxWidth: 26 }),
                aspectRatio: 1,
                height: 'auto',
                flexShrink: 0,
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
                fontSize: 'clamp(8px, 2vw, 9px)',
              }}
              aria-label="Skip forward 1 frame"
              title="+1f"
            >
              +1f
            </button>
          </div>
          )}
        </div>
      )}

      {videoDuration > 0 && isSessionDetail && (
        <div
          className="time-controls"
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'clamp(3px, 1.2vw, 5px)',
            padding: 'clamp(6px, 2vw, 10px)',
            background: '#fff',
            borderBottom: '1px solid #F5F5F5',
            width: '100%',
            minWidth: 0,
            overflowX: 'auto',
            overflowY: 'hidden',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <button type="button" onClick={() => { skipBy(-1 / 30); onControlPressed?.(); }} style={sessionDetailCircleBtn(false)} aria-label="-1f" title="−1f">
            −1f
          </button>
          <button type="button" onClick={() => { skipBy(-10); onControlPressed?.(); }} style={sessionDetailCircleBtn(false)} aria-label="-10s" title="−10s">
            −10s
          </button>
          <button type="button" onClick={() => { skipBy(-5); onControlPressed?.(); }} style={sessionDetailCircleBtn(false)} aria-label="-5s" title="−5s">
            −5s
          </button>
          <button type="button" onClick={() => { skipBy(-1); onControlPressed?.(); }} style={sessionDetailCircleBtn(false)} aria-label="-1s" title="−1s">
            −1s
          </button>
          <button type="button" onClick={() => { handlePlayPause(); onControlPressed?.(); }} style={sessionDetailPlayPauseBtn(accentColor)} aria-label={isVideoPlaying ? 'Pause' : 'Play'} title={isVideoPlaying ? 'Pause' : 'Play'}>
            {isVideoPlaying ? (
              <svg width={19} height={19} viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 2 }}>
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg width={19} height={19} viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 2 }}>
                <polygon points="5,3 19,12 5,21" />
              </svg>
            )}
          </button>
          <button type="button" onClick={() => { skipBy(1); onControlPressed?.(); }} style={sessionDetailCircleBtn(false)} aria-label="+1s" title="+1s">
            +1s
          </button>
          <button type="button" onClick={() => { skipBy(5); onControlPressed?.(); }} style={sessionDetailCircleBtn(false)} aria-label="+5s" title="+5s">
            +5s
          </button>
          <button type="button" onClick={() => { skipBy(10); onControlPressed?.(); }} style={sessionDetailCircleBtn(false)} aria-label="+10s" title="+10s">
            +10s
          </button>
          <button type="button" onClick={() => { skipBy(1 / 30); onControlPressed?.(); }} style={sessionDetailCircleBtn(false)} aria-label="+1f" title="+1f">
            +1f
          </button>
        </div>
      )}
      {renderBelowTimeControls}
    </div>
  );
});

function sessionDetailCircleBtn(disabled: boolean): React.CSSProperties {
  return {
    height: 'clamp(28px, 8vw, 32px)',
    minWidth: 'clamp(28px, 8.5vw, 36px)',
    padding: '0 clamp(4px, 1.5vw, 7px)',
    border: '1.5px solid #e2e8f0',
    borderRadius: 999,
    background: '#fff',
    color: '#1C1C1E',
    fontSize: 'clamp(9px, 2.5vw, 11.5px)',
    fontWeight: 500,
    cursor: disabled ? 'default' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
    opacity: disabled ? 0.5 : 1,
  };
}

function sessionDetailPlayPauseBtn(accentColor: string): React.CSSProperties {
  return {
    width: 'clamp(34px, 10vw, 44px)',
    height: 'clamp(34px, 10vw, 44px)',
    flexShrink: 0,
    borderRadius: '50%',
    border: `2px solid ${accentColor}`,
    background: '#fff',
    color: accentColor,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: 0,
  };
}

