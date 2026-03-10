import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from '../styles/theme';
import {
  IconChevronLeft,
  IconChevronRight,
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
function getYoutubeVideoId(url: string | null | undefined): string | null {
  if (!url) return null;
  const watchMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];
  const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];
  return null;
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
}

/** Reusable video player with Frame.io-style timeline, skip controls, and optional markers. */
export const VideoPlayer: React.FC<VideoPlayerProps> = ({
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
}) => {
  const youtubeVideoId = getYoutubeVideoId(videoUrl || undefined);
  const isYoutube = !!youtubeVideoId;

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoAspectRatio, setVideoAspectRatio] = useState<string | null>(null);

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
    if (isYoutube && playerRef.current) {
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

  const sortedMarkerTimes = useMemo(
    () => [...new Set(markers.map((m) => m.time))].sort((a, b) => a - b),
    [markers]
  );

  const getCurrentTime = useCallback(() => {
    if (isYoutube && playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
      return playerRef.current.getCurrentTime();
    }
    return videoRef.current?.currentTime ?? 0;
  }, [isYoutube]);

  const goToPrevMarker = useCallback(() => {
    if (sortedMarkerTimes.length === 0) return;
    const now = getCurrentTime();
    const prev = sortedMarkerTimes.filter((t) => t < now - 0.5).pop();
    const target = prev ?? sortedMarkerTimes[sortedMarkerTimes.length - 1];
    seekTo(target);
  }, [sortedMarkerTimes, getCurrentTime, seekTo]);

  const goToNextMarker = useCallback(() => {
    if (sortedMarkerTimes.length === 0) return;
    const now = getCurrentTime();
    const next = sortedMarkerTimes.find((t) => t > now + 0.5);
    const target = next ?? sortedMarkerTimes[0];
    seekTo(target);
  }, [sortedMarkerTimes, getCurrentTime, seekTo]);

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
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {isYoutube && youtubeVideoId ? (
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
            />
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
              <source src={videoUrl} />
            </video>
          </div>
        </>
      )}

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
              {isMuted ? <IconVolumeX size={16} /> : <IconVolume2 size={16} />}
            </button>
          </div>
          {/* Skip buttons below the player */}
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
              onClick={goToPrevMarker}
              disabled={sortedMarkerTimes.length === 0}
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
                cursor: sortedMarkerTimes.length === 0 ? 'default' : 'pointer',
                padding: 0,
                opacity: sortedMarkerTimes.length === 0 ? 0.5 : 1,
              }}
              aria-label="Previous marker"
              title="Previous marker"
            >
              <IconChevronLeft size={12} />
            </button>
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
            <button
              type="button"
              onClick={goToNextMarker}
              disabled={sortedMarkerTimes.length === 0}
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
                cursor: sortedMarkerTimes.length === 0 ? 'default' : 'pointer',
                padding: 0,
                opacity: sortedMarkerTimes.length === 0 ? 0.5 : 1,
              }}
              aria-label="Next marker"
              title="Next marker"
            >
              <IconChevronRight size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

