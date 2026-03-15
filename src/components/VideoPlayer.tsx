import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from '../styles/theme';
import { getYoutubeVideoId } from '@/lib/youtube';
import {
  IconPause,
  IconPlay,
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
  /** Accent color for sessionDetail variant (e.g. #8FB9A8). */
  accentColor?: string;

  /** When true, show a draggable red circle overlay on the video (e.g. for frame-detail reply mode). */
  showFrameDetailReplyOverlay?: boolean;
  /** Initial position/size for the frame marker (e.g. when editing a reply that has saved marker). */
  frameDetailMarkerInitial?: { x: number; y: number; radiusX: number; radiusY: number } | null;
  /** When true, marker is read-only (e.g. when viewing a reply's frame). */
  frameDetailMarkerReadOnly?: boolean;

  /** Called when playback starts (user pressed play). */
  onPlay?: () => void;
  /** Called when any playback control (skip or play/pause) is pressed. */
  onControlPressed?: () => void;
}

export interface FrameMarkerState {
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
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
    accentColor = COLORS.primary,
    showFrameDetailReplyOverlay = false,
    frameDetailMarkerInitial = null,
    frameDetailMarkerReadOnly = false,
    onPlay: onPlayProp,
    onControlPressed,
  },
  ref
) {
  const isSessionDetail = variant === 'sessionDetail';
  const youtubeVideoId = resolveYoutubeVideoId(videoUrl || undefined);
  const isYoutube = !!youtubeVideoId;

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const frameDetailOverlayRef = useRef<HTMLDivElement>(null);
  const onPlayPropRef = useRef(onPlayProp);
  useEffect(() => { onPlayPropRef.current = onPlayProp; });

  const [frameDetailCirclePosition, setFrameDetailCirclePosition] = useState({ x: 50, y: 50 });
  // radiusX and radiusY are stored as percentages of the overlay's width/height
  const [frameDetailCircleRadiusX, setFrameDetailCircleRadiusX] = useState(5);
  const [frameDetailCircleRadiusY, setFrameDetailCircleRadiusY] = useState(5);
  const [isDraggingFrameCircle, setIsDraggingFrameCircle] = useState(false);
  const [isResizingFrameCircle, setIsResizingFrameCircle] = useState(false);

  const FRAME_ELLIPSE_RADIUS_MIN = 3;
  const FRAME_ELLIPSE_RADIUS_MAX = 30;

  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1); // 0–1, used when unmuted
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoAspectRatio, setVideoAspectRatio] = useState<string | null>(null);
  const [skipIndicator, setSkipIndicator] = useState<{ label: string; side: 'left' | 'right' } | null>(null);
  const [skipIndicatorFadeOut, setSkipIndicatorFadeOut] = useState(false);
  const skipIndicatorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipIndicatorFadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Responsive: on small screens, skip buttons fill full width (no maxWidth cap)
  const [skipButtonsFillWidth, setSkipButtonsFillWidth] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const update = () => setSkipButtonsFillWidth(mq.matches);
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
  }, [showFrameDetailReplyOverlay, frameDetailMarkerInitial]);
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

  // Load YouTube API and create player when we have a YouTube video
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
            if (typeof p.getVolume === 'function') {
              const v = p.getVolume();
              if (Number.isFinite(v)) setVolume(v / 100);
            }
            pollId = setInterval(() => {
              if (!playerRef.current) return;
              try {
                const t = playerRef.current.getCurrentTime();
                if (isFinite(t)) setCurrentVideoTime(t);
                const d = playerRef.current.getDuration();
                if (isFinite(d) && d > 0) setVideoDuration(d);
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
  }, [isYoutube, youtubeVideoId, videoKey]);

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
    };
  }, [
    showFrameDetailReplyOverlay,
    frameDetailCirclePosition.x,
    frameDetailCirclePosition.y,
    frameDetailCircleRadiusX,
    frameDetailCircleRadiusY,
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
    [seekTo, videoDuration]
  );

  // Apply external seek requests from parent
  useEffect(() => {
    if (seekToSeconds == null || !Number.isFinite(seekToSeconds)) return;
    seekTo(seekToSeconds);
    if (onSeekHandled) onSeekHandled();
  }, [seekToSeconds, seekTo, onSeekHandled]);

  // Notify parent about current time / duration
  useEffect(() => {
    if (onTimeUpdate) {
      onTimeUpdate(currentVideoTime, videoDuration);
    }
  }, [currentVideoTime, videoDuration, onTimeUpdate]);

  // Determine active marker based on current playback time
  useEffect(() => {
    if (!onActiveMarkerChange || sortedMarkerTimes.length === 0) return;
    const activeTime =
      sortedMarkerTimes.filter((t) => t <= currentVideoTime + 0.5).pop() ?? null;
    if (activeTime == null) {
      onActiveMarkerChange(null);
      return;
    }
    const marker =
      markers.find((m) => m.time === activeTime) ??
      { time: activeTime };
    onActiveMarkerChange(marker);
  }, [currentVideoTime, sortedMarkerTimes, markers, onActiveMarkerChange]);

  const formatTimestamp = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(1, '0')}:${s.toString().padStart(2, '0')}`;
  };

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
              ...(isSessionDetail ? { borderRadius: 12, maxHeight: '100%' } : {}),
            }}
          >
            <div
              ref={playerContainerRef}
              key={`yt-${videoKey ?? youtubeVideoId}`}
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
                  <span style={{ fontSize: 'clamp(9px, 2.5vw, 10px)', fontWeight: 700, color: '#fff', minWidth: 28, flexShrink: 0 }}>
                    {formatTimestamp(currentVideoTime)}
                  </span>
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
                      onClick={() => setShowVolumeSlider((s) => !s)}
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
                      : isDraggingFrameCircle || isResizingFrameCircle
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
              ...(isSessionDetail ? { borderRadius: 12, overflow: 'hidden', maxHeight: '100%' } : {}),
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
            <video
              key={videoKey}
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
                  <span style={{ fontSize: 'clamp(9px, 2.5vw, 10px)', fontWeight: 700, color: '#fff', minWidth: 28, flexShrink: 0 }}>
                    {formatTimestamp(currentVideoTime)}
                  </span>
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
                      onClick={() => setShowVolumeSlider((s) => !s)}
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
                      : isDraggingFrameCircle || isResizingFrameCircle
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
                onClick={() => setShowVolumeSlider((s) => !s)}
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
          style={{
            flexShrink: 0,
            marginTop: SPACING.sm,
            padding: SPACING.sm,
            backgroundColor: '#f8fafc',
            borderRadius: 12,
            border: '1px solid #f1f5f9',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: SPACING.xs,
            flexWrap: 'nowrap',
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
            {isVideoPlaying ? <IconPause size={18} /> : <IconPlay size={18} />}
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
    </div>
  );
});

function sessionDetailCircleBtn(disabled: boolean): React.CSSProperties {
  const size = 'clamp(32px, 9vw, 40px)';
  return {
    width: size,
    height: size,
    minWidth: size,
    minHeight: size,
    flexShrink: 0,
    borderRadius: '50%',
    border: '1px solid #e2e8f0',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    color: '#475569',
    fontSize: 10,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: disabled ? 'default' : 'pointer',
    padding: 0,
    opacity: disabled ? 0.5 : 1,
  };
}

function sessionDetailPlayPauseBtn(accentColor: string): React.CSSProperties {
  const size = 'clamp(32px, 9vw, 40px)';
  return {
    width: size,
    height: size,
    minWidth: size,
    minHeight: size,
    flexShrink: 0,
    borderRadius: '50%',
    border: `1px solid ${accentColor}`,
    backgroundColor: `${accentColor}1A`,
    color: accentColor,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: 0,
  };
}

