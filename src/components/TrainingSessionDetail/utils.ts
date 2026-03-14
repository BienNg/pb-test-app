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
