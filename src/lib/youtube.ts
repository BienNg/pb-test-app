const VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

/** Extract YouTube video ID from watch or share link. Returns null if not YouTube. */
export function getYoutubeVideoId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    const host = parsed.hostname.replace(/^www\./, '');
    if (host === 'youtube.com' && parsed.pathname === '/watch') {
      const v = parsed.searchParams.get('v');
      if (v && VIDEO_ID_REGEX.test(v)) return v;
    }
    if (host === 'youtu.be' && parsed.pathname.length >= 12) {
      const id = parsed.pathname.slice(1).split('/')[0];
      if (VIDEO_ID_REGEX.test(id)) return id;
    }
    if (host === 'youtube.com' && parsed.pathname.startsWith('/embed/')) {
      const id = parsed.pathname.slice(7).split('/')[0];
      if (VIDEO_ID_REGEX.test(id)) return id;
    }
  } catch {
    // fallback: try legacy regex for watch URLs with v= anywhere in query
    const watchMatch = trimmed.match(/youtube\.com\/watch\?.*[?&]v=([a-zA-Z0-9_-]{11})/);
    if (watchMatch) return watchMatch[1];
    const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (shortMatch) return shortMatch[1];
    const embedMatch = trimmed.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
    if (embedMatch) return embedMatch[1];
  }
  return null;
}
