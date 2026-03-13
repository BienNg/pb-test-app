import { RADIUS, TYPOGRAPHY } from '../styles/theme';
import { parseCommentTextWithShots } from './commentText';

/** Serialize contenteditable DOM to [[shot:...]] / [[mention:...]] string and get selection offset. */
export function serializeContentEditable(
  container: Node,
  selection: Selection
): { text: string; cursorOffset: number } {
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
export function syncContentEditableFromDraft(container: HTMLElement, draft: string): void {
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
export function setContentEditableCursor(container: Node, offset: number): void {
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
      const mentionId = el.getAttribute?.('data-mention-id');
      const mentionName = el.getAttribute?.('data-mention-name');
      if (dataShot != null || mentionId != null) {
        const marker =
          dataShot != null
            ? `[[shot:${dataShot}]]`
            : `[[mention:${mentionId}|${mentionName ?? ''}]]`;
        const markerLen = marker.length;
        if (current + markerLen >= offset) {
          const range = document.createRange();
          // Place caret just before or just after the non-editable pill span
          const within = offset - current;
          if (within <= Math.floor(markerLen / 2)) {
            range.setStartBefore(node);
          } else {
            range.setStartAfter(node);
          }
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

