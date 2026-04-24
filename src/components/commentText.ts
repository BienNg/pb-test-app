// [[shot:Serve]], [[mention:userId|Full Name]], or [[error:forced|Forced Error]]
export const INLINE_MARKER_REGEX = /\[\[(shot|mention|error):([^\]]+)\]\]/g;

export type CommentSegment =
  | { type: 'text'; value: string }
  | { type: 'shot'; name: string }
  | { type: 'mention'; id: string; name: string }
  | { type: 'error'; key: string; label: string };

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
    } else if (kind === 'error') {
      const [key, label] = payload.split('|');
      const normalizedKey = (key ?? '').trim().toLowerCase();
      const fallbackLabel =
        normalizedKey === 'forced'
          ? 'Forced Error'
          : normalizedKey === 'unforced'
            ? 'Unforced Error'
            : (key ?? 'Error');
      segments.push({
        type: 'error',
        key: normalizedKey || 'error',
        label: (label ?? '').trim() || fallbackLabel,
      });
    }
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) });
  }
  return segments.length ? segments : [{ type: 'text', value: text }];
}

