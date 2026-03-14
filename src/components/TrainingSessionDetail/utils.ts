/** Get the pixel offset (from top of container) just below the current caret line. */
export function getCaretTopOffset(container: HTMLElement): number {
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

/** Find a reply by id from the replies-by-comment map. */
export function getReplyById<T extends { id: string | number }>(
  repliesByCommentId: Record<string, T[]>,
  replyId: string | number
): T | undefined {
  return Object.values(repliesByCommentId).flat().find((r) => r.id === replyId);
}

/** Round to frame-accurate precision (4 decimal places ≈ 0.1ms) for storing video timestamps. */
export function toFramePrecision(seconds: number): number {
  return Math.round(seconds * 10000) / 10000;
}

/** Format seconds as M:SS for display. */
export function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(1, '0')}:${s.toString().padStart(2, '0')}`;
}
