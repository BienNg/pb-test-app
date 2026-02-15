import React, { useEffect, useState, useRef, useCallback } from 'react';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, RADIUS } from '../styles/theme';
import { IconCalendar, IconClock, IconVolume2, IconVolumeX } from './Icons';
import { TRAINING_SESSIONS, type SessionComment } from './MyProgressPage';

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
  sessionId: number;
  onBack: () => void;
}

export const TrainingSessionDetail: React.FC<TrainingSessionDetailProps> = ({
  sessionId,
  onBack,
}) => {
  const session = TRAINING_SESSIONS.find((s) => s.id === sessionId);
  const youtubeVideoId = session ? getYoutubeVideoId(session.videoUrl) : null;
  const isYoutube = !!youtubeVideoId;
  const videoRef = useRef<HTMLVideoElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  const [isNarrow, setIsNarrow] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

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

  useEffect(() => {
    setVideoError(null);
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
              } catch {}
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

  const [commentDraft, setCommentDraft] = useState('');
  const [includeTimestamp, setIncludeTimestamp] = useState(true);
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [comments, setComments] = useState<SessionComment[]>(() => {
    if (!session) return [];

    if (session.id === 1) {
      return [
        {
          id: 1,
          author: 'Coach Riley',
          role: 'Coach',
          createdAt: '2h ago',
          text: 'Great use of your split step on wide balls.',
          timestampSeconds: 492, // 08:12
        },
        {
          id: 2,
          author: 'You',
          role: 'You',
          createdAt: '1h ago',
          text: 'I can feel how much smoother my transitions are. Next time I want to focus on staying lower.',
          timestampSeconds: 145, // 02:25
        },
      ];
    }

    if (session.id === 2) {
      return [
        {
          id: 3,
          author: 'Coach Riley',
          role: 'Coach',
          createdAt: 'Yesterday',
          text: 'Your returns are landing much deeper. Let’s keep targeting the backhand corner.',
          timestampSeconds: 89,
        },
      ];
    }

    return [];
  });

  const handlePlayPause = useCallback(async () => {
    setVideoError(null);
    if (isYoutube && playerRef.current) {
      const p = playerRef.current;
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
        playerRef.current.seekTo(seconds, true);
        playerRef.current.playVideo();
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
      if (playerRef.current.isMuted()) {
        playerRef.current.unMute();
        setIsMuted(false);
      } else {
        playerRef.current.mute();
        setIsMuted(true);
      }
      return;
    }
    setIsMuted((m) => !m);
  }, [isYoutube]);

  const skipBy = useCallback(
    (deltaSeconds: number) => {
      const getNow = () =>
        isYoutube && playerRef.current
          ? playerRef.current.getCurrentTime()
          : videoRef.current?.currentTime ?? 0;
      const dur = videoDuration || (videoRef.current?.duration ?? 0);
      const now = getNow();
      const next = Math.max(0, Math.min(dur, now + deltaSeconds));
      seekTo(next);
    },
    [isYoutube, videoDuration, seekTo]
  );

  const formatTimestamp = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(1, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleAddComment = () => {
    if (!commentDraft.trim()) return;

    const currentTime = isYoutube && playerRef.current
      ? playerRef.current.getCurrentTime()
      : videoRef.current?.currentTime ?? 0;

    const newComment: SessionComment = {
      id: Date.now(),
      author: 'You',
      role: 'You',
      createdAt: 'Just now',
      text: commentDraft.trim(),
      ...(includeTimestamp && { timestampSeconds: Math.round(currentTime) }),
    };

    setComments((prev) => [...prev, newComment]);
    setCommentDraft('');
  };

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
            flexDirection: 'column',
            gap: SPACING.sm,
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
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: SPACING.xs,
            }}
          >
            <div
              style={{
                padding: `${SPACING.xs}px ${SPACING.sm}px`,
                borderRadius: 999,
                backgroundColor: COLORS.backgroundLight,
                ...TYPOGRAPHY.label,
                textTransform: 'uppercase',
                color: COLORS.textSecondary,
                opacity: 0.9,
              }}
            >
              Training session
            </div>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: SPACING.md,
                marginTop: SPACING.xs,
                color: COLORS.textSecondary,
                ...TYPOGRAPHY.bodySmall,
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span role="img" aria-label="calendar">
                  <IconCalendar size={16} />
                </span>
                <span>{session.dateLabel}</span>
              </span>
            </div>
          </div>
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
            <div
              style={{
                position: 'relative',
                width: '100%',
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
              {isYoutube && youtubeVideoId ? (
                <>
                  <div
                    ref={playerContainerRef}
                    key={`yt-${session.id}`}
                    style={{
                      width: '100%',
                      aspectRatio: '16 / 9',
                      display: 'block',
                      minHeight: 200,
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
                      backgroundColor: !isVideoPlaying ? 'rgba(0, 0, 0, 0.85)' : 'transparent',
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
                    {!isVideoPlaying && (
                      <div
                        style={{
                          width: 72,
                          height: 72,
                          borderRadius: '50%',
                          backgroundColor: 'rgba(0, 0, 0, 0.55)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid rgba(255, 255, 255, 0.4)',
                          backdropFilter: 'blur(6px)',
                        }}
                      >
                        <div
                          style={{
                            marginLeft: 4,
                            width: 0,
                            height: 0,
                            borderTop: '12px solid transparent',
                            borderBottom: '12px solid transparent',
                            borderLeft: '20px solid #FFFFFF',
                          }}
                        />
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 1,
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
              {!isVideoPlaying && !videoError && (
                  <div
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: '50%',
                      backgroundColor: 'rgba(0, 0, 0, 0.55)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid rgba(255, 255, 255, 0.4)',
                      backdropFilter: 'blur(6px)',
                    }}
                  >
                    <div
                      style={{
                        marginLeft: 4,
                        width: 0,
                        height: 0,
                        borderTop: '12px solid transparent',
                        borderBottom: '12px solid transparent',
                        borderLeft: '20px solid #FFFFFF',
                      }}
                    />
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
                  display: 'block',
                  aspectRatio: '16 / 9',
                  objectFit: 'cover',
                }}
                onPlay={() => setIsVideoPlaying(true)}
                onPause={() => setIsVideoPlaying(false)}
                onEnded={() => setIsVideoPlaying(false)}
                onTimeUpdate={(e) =>
                  setCurrentVideoTime((e.target as HTMLVideoElement).currentTime)
                }
                onLoadedMetadata={(e) => {
                  setVideoDuration((e.target as HTMLVideoElement).duration);
                  setVideoError(null);
                }}
                onError={() => {
                  setVideoError('Video failed to load. The source may be unavailable or blocked.');
                }}
              >
                <source src={session.videoUrl} type="video/mp4" />
              </video>
              </>
              )}
              </div>

              {/* Frame.io-style timeline with comment markers */}
              {videoDuration > 0 && (
                <div
                  style={{
                    padding: `${SPACING.xs}px ${SPACING.sm}px`,
                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: SPACING.xs,
                  }}
                >
                  <button
                    type="button"
                    onClick={handlePlayPause}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: RADIUS.sm,
                      border: 'none',
                      backgroundColor: COLORS.primary,
                      color: COLORS.textPrimary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                    aria-label={isVideoPlaying ? 'Pause' : 'Play'}
                  >
                    {isVideoPlaying ? (
                      <span style={{ fontSize: 11 }}>⏸</span>
                    ) : (
                      <span style={{ marginLeft: 1, fontSize: 10 }}>▶</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleMuteToggle}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: RADIUS.sm,
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: 'rgba(255, 255, 255, 0.9)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? (
                      <IconVolumeX size={14} />
                    ) : (
                      <IconVolume2 size={14} />
                    )}
                  </button>
                  <span
                    style={{
                      ...TYPOGRAPHY.label,
                      fontSize: 11,
                      color: 'rgba(255, 255, 255, 0.9)',
                      minWidth: 32,
                    }}
                  >
                    {formatTimestamp(currentVideoTime)}
                  </span>
                    <div
                      style={{
                        flex: 1,
                        position: 'relative',
                        height: 16,
                        cursor: 'pointer',
                        borderRadius: RADIUS.sm,
                        overflow: 'visible',
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
                          inset: 0,
                          backgroundColor: 'rgba(255, 255, 255, 0.15)',
                          borderRadius: RADIUS.sm,
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: `${(currentVideoTime / videoDuration) * 100}%`,
                          backgroundColor: COLORS.primary,
                          borderRadius: RADIUS.sm,
                          transition: 'width 0.1s linear',
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
                              }}
                              style={{
                                position: 'absolute',
                                left: `calc(${left}% - 4px)`,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                backgroundColor: COLORS.primary,
                                border: '2px solid white',
                                boxShadow: '0 0 0 1px rgba(0,0,0,0.3)',
                                cursor: 'pointer',
                                padding: 0,
                              }}
                              title={`${c.author}: ${c.text.length > 45 ? c.text.slice(0, 45) + '…' : c.text}`}
                            />
                          );
                        })}
                    </div>
                    <span
                      style={{
                        ...TYPOGRAPHY.label,
                        fontSize: 11,
                        color: 'rgba(255, 255, 255, 0.7)',
                        minWidth: 32,
                      }}
                    >
                      {formatTimestamp(videoDuration)}
                    </span>
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
                    onClick={() => skipBy(-10)}
                    style={{
                      width: 36,
                      height: 28,
                      borderRadius: RADIUS.sm,
                      border: 'none',
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      color: 'rgba(255, 255, 255, 0.95)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      padding: 0,
                      ...TYPOGRAPHY.label,
                      fontSize: 11,
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
                      width: 34,
                      height: 28,
                      borderRadius: RADIUS.sm,
                      border: 'none',
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
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
                    onClick={() => skipBy(5)}
                    style={{
                      width: 34,
                      height: 28,
                      borderRadius: RADIUS.sm,
                      border: 'none',
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
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
                      width: 36,
                      height: 28,
                      borderRadius: RADIUS.sm,
                      border: 'none',
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      color: 'rgba(255, 255, 255, 0.95)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      padding: 0,
                      ...TYPOGRAPHY.label,
                      fontSize: 11,
                    }}
                    aria-label="Skip forward 10 seconds"
                    title="+10s"
                  >
                    +10s
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
            <h3
              style={{
                ...TYPOGRAPHY.bodySmall,
                fontWeight: 600,
                textTransform: 'uppercase',
                color: COLORS.textSecondary,
                margin: 0,
                marginBottom: SPACING.sm,
              }}
            >
              Comments
            </h3>

            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                paddingRight: SPACING.sm,
                marginBottom: SPACING.md,
              }}
            >
              {comments.length === 0 ? (
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
                comments.map((comment) => {
                  const isCoach = comment.role === 'Coach';

                  return (
                    <div
                      key={comment.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: SPACING.sm,
                        padding: `${SPACING.sm}px ${SPACING.sm}px`,
                        margin: `0 -${SPACING.xs}px`,
                        borderBottom: `1px solid ${COLORS.backgroundLight}`,
                        backgroundColor: isCoach ? COLORS.backgroundLight : 'transparent',
                        borderLeft: isCoach
                          ? `3px solid ${COLORS.primaryLight}`
                          : `3px solid transparent`,
                        borderRadius: RADIUS.sm,
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
                          <span
                            style={{
                              ...TYPOGRAPHY.label,
                              textTransform: 'uppercase',
                              color: isCoach ? COLORS.textPrimary : COLORS.textSecondary,
                              opacity: isCoach ? 0.9 : 0.8,
                            }}
                          >
                            {comment.role}
                          </span>
                        </div>
                        <span
                          style={{
                            ...TYPOGRAPHY.label,
                            color: COLORS.textMuted,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {comment.createdAt}
                        </span>
                      </div>
                      {comment.timestampSeconds != null && (
                        <button
                          type="button"
                          onClick={() => seekTo(comment.timestampSeconds!)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            marginTop: SPACING.xs,
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
                      <p
                        style={{
                          ...TYPOGRAPHY.bodySmall,
                          margin: `${SPACING.xs}px 0 0`,
                          color: COLORS.textPrimary,
                        }}
                      >
                        {comment.text}
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
              <textarea
                ref={textareaRef}
                id="session-comment-input"
                rows={3}
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                placeholder="Add a note..."
                style={{
                  width: '100%',
                  resize: 'none',
                  border: 'none',
                  outline: 'none',
                  ...TYPOGRAPHY.bodySmall,
                  color: COLORS.textPrimary,
                  background: 'transparent',
                  marginBottom: SPACING.sm,
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={handleAddComment}
                  disabled={!commentDraft.trim()}
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
                  Post
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

