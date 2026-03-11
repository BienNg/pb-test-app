import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, RADIUS } from '../styles/theme';
import {
  IconArrowLeft,
  IconCheck,
  IconClock,
  IconFilter,
  IconMoreVertical,
  IconPencil,
  IconPlay,
  IconUser,
  IconX,
} from './Icons';
import type { SessionComment, TrainingSession } from './MyProgressPage';
import { createClient } from '@/lib/supabase/client';
import { MOCK_COACHES } from '../data/mockCoaches';

declare const require: {
  context: (
    directory: string,
    useSubdirectories: boolean,
    regExp: RegExp
  ) => {
    keys: () => string[];
    (id: string): unknown;
  };
};

/** Pickleball shot types available via "/" command in comments. */
export const SHOT_LIST = [
  'Serve', 'Return', 'Drive', 'Forehand Drive', 'Backhand Drive',
  'Volley', 'Forehand Volley', 'Backhand Volley', 'Punch Volley', 'Block Volley', 'Roll Volley', 'Volley Dink',
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

/** Reference UI primary (Training Session Detail screen). */
const REFERENCE_PRIMARY = '#8FB9A8';

export const SHOT_PILL_STYLE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  margin: '0 2px',
  padding: '2px 8px',
  borderRadius: RADIUS.sm,
  border: '1px solid rgba(148, 163, 184, 0.5)',
  backgroundColor: '#f1f5f9',
  color: '#475569',
  ...TYPOGRAPHY.label,
  fontWeight: 600,
};

const MENTION_PILL_STYLE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  margin: '0 2px',
  padding: '2px 8px',
  borderRadius: RADIUS.sm,
  border: `1px solid ${REFERENCE_PRIMARY}40`,
  backgroundColor: `${REFERENCE_PRIMARY}1A`,
  color: REFERENCE_PRIMARY,
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
  updateSessionComment,
  updateCommentExampleGif,
  deleteSessionComment,
  mapDbCommentToSessionComment,
  fetchSessionTaggableProfiles,
} from '@/lib/sessionComments';
import { useAuth } from './providers/AuthProvider';
import { VideoPlayer, type VideoPlayerMarker } from './VideoPlayer';

const EditCommentInput: React.FC<{
  initialDraft: string;
  taggableProfiles: { id: string; name: string }[];
  onSave: (draft: string) => void;
  onCancel: () => void;
}> = ({ initialDraft, taggableProfiles, onSave, onCancel }) => {
  const [draft, setDraft] = useState(initialDraft);
  const inputRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<number | null>(null);

  const [shotMenu, setShotMenu] = useState<{ query: string; slashStart: number; highlightIndex: number } | null>(null);
  const [mentionMenu, setMentionMenu] = useState<{ query: string; atStart: number; highlightIndex: number } | null>(null);
  const [inlineMenuTop, setInlineMenuTop] = useState<number | null>(null);

  const filteredShots = useMemo(() => {
    if (!shotMenu) return [];
    const q = shotMenu.query.trim().toLowerCase();
    if (!q) return [...SHOT_LIST];
    return SHOT_LIST.filter((shot) => shot.toLowerCase().includes(q));
  }, [shotMenu]);

  const filteredMentions = useMemo(() => {
    if (!mentionMenu) return [];
    const q = mentionMenu.query.trim().toLowerCase();
    const base = taggableProfiles;
    if (!q) return base;
    return base.filter((p) => p.name.toLowerCase().includes(q));
  }, [mentionMenu, taggableProfiles]);

  const handleInput = useCallback(() => {
    const container = inputRef.current;
    const sel = window.getSelection();
    if (!container || !sel || !container.contains(sel.anchorNode)) return;
    const { text, cursorOffset } = serializeContentEditable(container, sel);
    setDraft(text);
    cursorRef.current = cursorOffset;

    const beforeCursor = text.slice(0, cursorOffset);
    const lastSlash = beforeCursor.lastIndexOf('/');
    const lastAt = beforeCursor.lastIndexOf('@');

    let anyMenu = false;
    if (lastSlash !== -1 && !beforeCursor.slice(lastSlash).includes('\n')) {
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
      setInlineMenuTop(getCaretTopOffset(container) + 20);
    } else {
      setInlineMenuTop(null);
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === '/' || e.key === '@') {
        e.preventDefault();
        const container = inputRef.current;
        const sel = window.getSelection();
        if (!container || !sel || !container.contains(sel.anchorNode)) return;
        const { text, cursorOffset } = serializeContentEditable(container, sel);
        const char = e.key;
        const newText = text.slice(0, cursorOffset) + char + text.slice(cursorOffset);
        setDraft(newText);
        cursorRef.current = cursorOffset + 1;
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
        setInlineMenuTop(getCaretTopOffset(container) + 20);
        inputRef.current?.focus();
        return;
      }

      if (shotMenu || mentionMenu) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (shotMenu) {
            setShotMenu((m) =>
              m ? { ...m, highlightIndex: Math.min(m.highlightIndex + 1, filteredShots.length - 1) } : null
            );
          } else if (mentionMenu) {
            setMentionMenu((m) =>
              m ? { ...m, highlightIndex: Math.min(m.highlightIndex + 1, filteredMentions.length - 1) } : null
            );
          }
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (shotMenu) {
            setShotMenu((m) => (m ? { ...m, highlightIndex: Math.max(0, m.highlightIndex - 1) } : null));
          } else if (mentionMenu) {
            setMentionMenu((m) => (m ? { ...m, highlightIndex: Math.max(0, m.highlightIndex - 1) } : null));
          }
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          const container = inputRef.current;
          const sel = window.getSelection();
          if (!container || !sel || !container.contains(sel.anchorNode)) return;
          const { text, cursorOffset } = serializeContentEditable(container, sel);
          if (shotMenu && filteredShots.length > 0) {
            const shot = filteredShots[shotMenu.highlightIndex];
            if (shot) {
              const start = shotMenu.slashStart;
              const replacement = `[[shot:${shot}]] `;
              const nextDraft = text.slice(0, start) + replacement + text.slice(cursorOffset);
              setDraft(nextDraft);
              setShotMenu(null);
              cursorRef.current = start + replacement.length;
              inputRef.current?.focus();
            }
          } else if (mentionMenu && filteredMentions.length > 0) {
            const mention = filteredMentions[mentionMenu.highlightIndex];
            if (mention) {
              const start = mentionMenu.atStart;
              const marker = `[[mention:${mention.id}|${mention.name}]] `;
              const nextDraft = text.slice(0, start) + marker + text.slice(cursorOffset);
              setDraft(nextDraft);
              setMentionMenu(null);
              cursorRef.current = start + marker.length;
              inputRef.current?.focus();
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
    [shotMenu, mentionMenu, filteredShots, filteredMentions]
  );

  const selectShotFromMenu = useCallback(
    (shot: string) => {
      if (!shotMenu) return;
      const container = inputRef.current;
      const sel = window.getSelection();
      if (!container || !sel || !container.contains(sel.anchorNode)) return;
      const { text, cursorOffset } = serializeContentEditable(container, sel);
      const start = shotMenu.slashStart;
      const replacement = `[[shot:${shot}]] `;
      const nextDraft = text.slice(0, start) + replacement + text.slice(cursorOffset);
      setDraft(nextDraft);
      setShotMenu(null);
      cursorRef.current = start + replacement.length;
      inputRef.current?.focus();
    },
    [shotMenu]
  );

  const selectMentionFromMenu = useCallback(
    (mentionId: string) => {
      if (!mentionMenu) return;
      const mention = taggableProfiles.find((p) => p.id === mentionId);
      if (!mention) return;
      const container = inputRef.current;
      const sel = window.getSelection();
      if (!container || !sel || !container.contains(sel.anchorNode)) return;
      const { text, cursorOffset } = serializeContentEditable(container, sel);
      const start = mentionMenu.atStart;
      const marker = `[[mention:${mention.id}|${mention.name}]] `;
      const nextDraft = text.slice(0, start) + marker + text.slice(cursorOffset);
      setDraft(nextDraft);
      setMentionMenu(null);
      cursorRef.current = start + marker.length;
      inputRef.current?.focus();
    },
    [mentionMenu, taggableProfiles]
  );

  useEffect(() => {
    const container = inputRef.current;
    if (!container) return;
    syncContentEditableFromDraft(container, draft);
    if (cursorRef.current != null) {
      const offset = cursorRef.current;
      cursorRef.current = null;
      setContentEditableCursor(container, offset);
    }
  }, [draft]);

  return (
    <div style={{ marginTop: SPACING.xs, position: 'relative' }}>
      <div
        ref={inputRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        style={{
          width: '100%',
          minHeight: 60,
          padding: SPACING.sm,
          borderRadius: RADIUS.sm,
          border: `1px solid ${COLORS.backgroundLight}`,
          backgroundColor: 'transparent',
          color: COLORS.textPrimary,
          ...TYPOGRAPHY.bodySmall,
          fontFamily: 'inherit',
          boxSizing: 'border-box',
          outline: 'none',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      />
      {(shotMenu || mentionMenu) && inlineMenuTop != null && (
        <div
          style={{
            position: 'absolute',
            top: inlineMenuTop,
            left: 0,
            zIndex: 50,
            width: 240,
            maxHeight: 200,
            overflowY: 'auto',
            backgroundColor: COLORS.cardBg,
            borderRadius: RADIUS.md,
            boxShadow: SHADOWS.md,
            border: `1px solid ${COLORS.backgroundLight}`,
            padding: `${SPACING.xs}px 0`,
          }}
        >
          {shotMenu && (
            <>
              <div
                style={{
                  padding: `${SPACING.xs}px ${SPACING.md}px`,
                  ...TYPOGRAPHY.label,
                  color: COLORS.textSecondary,
                  textTransform: 'uppercase',
                  borderBottom: `1px solid ${COLORS.backgroundLight}`,
                  marginBottom: SPACING.xs,
                }}
              >
                Shots
              </div>
              {filteredShots.length === 0 ? (
                <div
                  style={{
                    padding: `${SPACING.sm}px ${SPACING.md}px`,
                    ...TYPOGRAPHY.bodySmall,
                    color: COLORS.textSecondary,
                  }}
                >
                  No shots found.
                </div>
              ) : (
                filteredShots.map((shot, i) => (
                  <button
                    key={shot}
                    type="button"
                    role="option"
                    aria-selected={shotMenu.highlightIndex === i}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectShotFromMenu(shot);
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: `${SPACING.sm}px ${SPACING.md}px`,
                      border: 'none',
                      background: shotMenu.highlightIndex === i ? COLORS.backgroundLight : 'transparent',
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
            </>
          )}
          {mentionMenu && (
            <>
              <div
                style={{
                  padding: `${SPACING.xs}px ${SPACING.md}px`,
                  ...TYPOGRAPHY.label,
                  color: COLORS.textSecondary,
                  textTransform: 'uppercase',
                  borderBottom: `1px solid ${COLORS.backgroundLight}`,
                  marginBottom: SPACING.xs,
                }}
              >
                Mention
              </div>
              {filteredMentions.length === 0 ? (
                <div
                  style={{
                    padding: `${SPACING.sm}px ${SPACING.md}px`,
                    ...TYPOGRAPHY.bodySmall,
                    color: COLORS.textSecondary,
                  }}
                >
                  No profiles found.
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
                      background: mentionMenu.highlightIndex === i ? COLORS.backgroundLight : 'transparent',
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
            </>
          )}
        </div>
      )}
      <div style={{ display: 'flex', gap: SPACING.xs, marginTop: SPACING.xs, justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: `${SPACING.xs}px ${SPACING.sm}px`,
            borderRadius: RADIUS.sm,
            border: `1px solid ${COLORS.backgroundLight}`,
            background: 'none',
            ...TYPOGRAPHY.label,
            cursor: 'pointer',
            color: COLORS.textSecondary,
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onSave(draft)}
          style={{
            padding: `${SPACING.xs}px ${SPACING.sm}px`,
            borderRadius: RADIUS.sm,
            border: 'none',
            backgroundColor: COLORS.primary,
            color: '#fff',
            ...TYPOGRAPHY.label,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Save
        </button>
      </div>
    </div>
  );
};

export interface TrainingSessionDetailProps {
  sessionId: string;
  onBack: () => void;
  /** When provided (e.g. sessions from DB for a student), lookup session from this list. */
  sessions?: TrainingSession[];
  /** When provided (e.g. admin), allows adding a YouTube URL when session has no video. Called with session id and the new YouTube URL; persist to sessions.youtube_url. */
  onSaveVideoUrl?: (sessionId: string, youtubeUrl: string) => Promise<void>;
  /** Optional callback to refresh parent session data after edits. */
  onSessionUpdated?: () => Promise<void> | void;
  /** Optional callback invoked after a session is deleted. Typically navigates away. */
  onDeleteSession?: (sessionId: string) => Promise<void> | void;
}

export const TrainingSessionDetail: React.FC<TrainingSessionDetailProps> = ({
  sessionId,
  onBack,
  sessions: sessionsProp,
  onSaveVideoUrl,
  onSessionUpdated,
  onDeleteSession,
}) => {
  const { user } = useAuth();
  const sessionList = sessionsProp ?? [];
  const session = sessionList.find((s) => s.id === sessionId);
  const hasVideoUrl = !!(session?.videoUrl?.trim());
  const canAddVideoUrl = !!onSaveVideoUrl;
  const isAdmin = !!onSaveVideoUrl;
  const isDbSession = sessionsProp != null && session != null;

  // Debug logging
  console.log('[TrainingSessionDetail] Rendered:', {
    sessionId,
    hasSessionsProp: sessionsProp != null,
    sessionCount: sessionList.length,
    foundSession: session != null,
    isDbSession,
    hasOnDeleteSession: onDeleteSession != null,
  });

  const [showAddUrlForm, setShowAddUrlForm] = useState(false);
  const [, setAddUrlDraft] = useState('');
  const [, setAddUrlError] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const commentInputRef = useRef<HTMLDivElement>(null);
  const pendingCursorRef = useRef<number | null>(null);
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
  const [commentDraft, setCommentDraft] = useState('');
  const [includeTimestamp, setIncludeTimestamp] = useState(true);
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [, setVideoDuration] = useState(0);
  const [isExampleModalOpen, setIsExampleModalOpen] = useState(false);
  const [selectedExampleKey, setSelectedExampleKey] = useState<string | null>(null);
  /** Which comment triggered the example modal ('new' = composer, else comment id) */
  const [exampleModalContext, setExampleModalContext] = useState<string | number | 'new' | null>(null);
  /** GIF attached to the pending new comment (before it is posted) */
  const [pendingNewCommentGif, setPendingNewCommentGif] = useState<string | null>(null);
  /** When set, shows the lightweight "view example" modal */
  const [viewExampleModal, setViewExampleModal] = useState<{ src: string; title: string } | null>(null);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [postingComment, setPostingComment] = useState(false);
  const [taggableProfiles, setTaggableProfiles] = useState<{ id: string; name: string }[]>([]);
  const [selectedMentionIds, setSelectedMentionIds] = useState<string[]>([]);
  const [pendingSeekSeconds, setPendingSeekSeconds] = useState<number | null>(null);
  /** "/" command menu for shots: when set, show dropdown; query filters SHOT_LIST; highlightIndex for keyboard nav. */
  const [shotMenu, setShotMenu] = useState<{ query: string; slashStart: number; highlightIndex: number } | null>(null);
  /** "@" command menu for mentions: when set, show dropdown of taggableProfiles. */
  const [mentionMenu, setMentionMenu] = useState<{ query: string; atStart: number; highlightIndex: number } | null>(null);
  /** Vertical position (px from top of comment input) where inline dropdowns should appear. */
  const [inlineMenuTop, setInlineMenuTop] = useState<number | null>(null);
  const [shotFilter, setShotFilter] = useState<string[]>([]);
  const [studentFilter, setStudentFilter] = useState<string[]>([]);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  /** Comment id to scroll to and highlight when its timestamp is reached or a timestamp dot is selected. */
  const [activeCommentId, setActiveCommentId] = useState<string | number | null>(null);
  const [activeCommentMenu, setActiveCommentMenu] = useState<string | number | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | number | null>(null);
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

  // Admin session edit state (for DB-backed sessions)
  const [showEditSession, setShowEditSession] = useState(false);
  const [editSessionLoading, setEditSessionLoading] = useState(false);
  const [editSessionSaving, setEditSessionSaving] = useState(false);
  const [editSessionDeleting, setEditSessionDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editSessionError, setEditSessionError] = useState<string | null>(null);
  const [editDate, setEditDate] = useState<string>(session?.dateKey ?? '');
  const [editTitle, setEditTitle] = useState<string>(session?.title ?? '');
  const [editCoachId, setEditCoachId] = useState<string>('');

  // Any overlay/modal state; used to pause video playback when true
  const anyModalOpen =
    isExampleModalOpen ||
    viewExampleModal != null ||
    showEditSession ||
    showDeleteConfirm ||
    isFilterSheetOpen;

  const shotExampleGifs = useMemo(() => {
    try {
      const ctx = require.context('../assets/shot-examples', false, /\.gif$/);
      const toTitle = (fileName: string) => {
        const base = fileName.replace(/^\.\//, '').replace(/\.gif$/i, '');
        const cleaned = base.replace(/^shot-example-/, '').replace(/[-_]+/g, ' ').trim();
        return cleaned.replace(/\b\w/g, (c: string) => c.toUpperCase());
      };
      return ctx.keys()
        .map((k: string) => {
          const mod = ctx(k) as
            | string
            | { default?: string | { src?: string } }
            | { src?: string };

          const src =
            typeof mod === 'string'
              ? mod
              : typeof (mod as { default?: unknown }).default === 'string'
                ? ((mod as { default: string }).default)
                : typeof (mod as { default?: { src?: unknown } }).default === 'object' &&
                    (mod as { default?: { src?: unknown } }).default?.src &&
                    typeof (mod as { default?: { src?: unknown } }).default?.src === 'string'
                  ? ((mod as { default: { src: string } }).default.src)
                  : typeof (mod as { src?: unknown }).src === 'string'
                    ? ((mod as { src: string }).src)
                    : '';

          return { key: k, src, title: toTitle(k) };
        })
        .filter((g: { src: string }) => Boolean(g.src))
        .sort((a: { title: string }, b: { title: string }) => a.title.localeCompare(b.title));
    } catch {
      return [] as { key: string; src: string; title: string }[];
    }
  }, []);

  useEffect(() => {
    if (!isExampleModalOpen) return;
    setSelectedExampleKey(null);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsExampleModalOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isExampleModalOpen]);

  const handleAddExample = async () => {
    if (!selectedExampleKey) return;
    const gifFileName = selectedExampleKey.replace(/^\.\//, '');
    if (exampleModalContext === 'new') {
      setPendingNewCommentGif(gifFileName);
      setIsExampleModalOpen(false);
      return;
    }
    const commentId = exampleModalContext;
    if (commentId == null) return;
    // Optimistically update local state
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, exampleGif: gifFileName } : c))
    );
    setIsExampleModalOpen(false);
    // Persist to DB for real comments
    if (isDbSession && typeof commentId === 'string') {
      const supabase = createClient();
      await updateCommentExampleGif(supabase, commentId, gifFileName);
    }
  };
  const [editSessionType, setEditSessionType] = useState<'game' | 'drill' | ''>('');
  const [editStudentIds, setEditStudentIds] = useState<string[]>([]);
  const [availableStudents, setAvailableStudents] = useState<
    { id: string; name: string; email: string }[]
  >([]);
  const editSessionLoadedRef = useRef(false);

  useEffect(() => {
    const updateLayout = () => {
      if (typeof window === 'undefined') return;
      setIsNarrow(window.innerWidth < 768);
      setIsDesktop(window.innerWidth >= 1024);
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

  // Lazy-load session details and student list for admin editing
  useEffect(() => {
    if (!isDbSession || !showEditSession || editSessionLoadedRef.current === true) return;
    const supabase = createClient();
    if (!supabase) {
      setEditSessionError('Supabase not configured');
      return;
    }
    setEditSessionLoading(true);
    setEditSessionError(null);
    const load = async () => {
      try {
        const { data: sessionRow, error: sessionError } = await supabase
          .from('sessions')
          .select('date, coach_id, title, session_type')
          .eq('id', sessionId)
          .maybeSingle();
        if (sessionError) throw sessionError;
        if (sessionRow) {
          const dateStr =
            typeof sessionRow.date === 'string' && sessionRow.date.length >= 10
              ? sessionRow.date.slice(0, 10)
              : String(sessionRow.date);
          setEditDate(dateStr);
          setEditCoachId(sessionRow.coach_id ?? '');
          setEditTitle((sessionRow.title as string | null) ?? (session?.title ?? ''));
          const st = sessionRow.session_type as string | null;
          setEditSessionType(st === 'game' || st === 'drill' ? st : '');
        } else if (session) {
          setEditDate(session.dateKey);
          setEditTitle(session.title);
        }

        const { data: studentLinks, error: linksError } = await supabase
          .from('session_students')
          .select('student_id')
          .eq('session_id', sessionId);
        if (linksError) throw linksError;
        const linkedStudentIds = (studentLinks ?? []).map(
          (r: { student_id: string }) => r.student_id,
        );
        setEditStudentIds(linkedStudentIds);

        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email, full_name, role');
        if (profilesError) throw profilesError;
        const rows = (profiles ?? []) as {
          id: string;
          email: string | null;
          full_name: string | null;
          role: string | null;
        }[];
        const filtered = rows.filter((r) => r.role === 'student' || !r.role);
        setAvailableStudents(
          filtered.map((r) => ({
            id: r.id,
            name: r.full_name?.trim() || r.email || r.id,
            email: r.email ?? '',
          })),
        );
        editSessionLoadedRef.current = true;
      } catch (err) {
        setEditSessionError(
          err instanceof Error ? err.message : 'Failed to load session details for editing',
        );
      } finally {
        setEditSessionLoading(false);
      }
    };
    void load();
  }, [isDbSession, showEditSession, sessionId, session]);

  const toggleEditStudent = useCallback((id: string) => {
    setEditStudentIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }, []);

  const handleSaveSessionDetails = useCallback(async () => {
    if (!isDbSession) return;
    const supabase = createClient();
    if (!supabase) {
      setEditSessionError('Supabase not configured');
      return;
    }
    if (!editDate) {
      setEditSessionError('Date is required');
      return;
    }
    setEditSessionSaving(true);
    setEditSessionError(null);
    try {
      const { error: updateError } = await supabase
        .from('sessions')
        .update({
          date: editDate,
          coach_id: editCoachId || null,
          title: editTitle.trim() || null,
          session_type: editSessionType || null,
        })
        .eq('id', sessionId);
      if (updateError) throw updateError;

      const { error: deleteError } = await supabase
        .from('session_students')
        .delete()
        .eq('session_id', sessionId);
      if (deleteError) throw deleteError;

      if (editStudentIds.length > 0) {
        const { error: insertError } = await supabase.from('session_students').insert(
          editStudentIds.map((student_id) => ({ session_id: sessionId, student_id })),
        );
        if (insertError) throw insertError;
      }

      await onSessionUpdated?.();
      setShowEditSession(false);
    } catch (err) {
      setEditSessionError(
        err instanceof Error ? err.message : 'Failed to save session changes',
      );
    } finally {
      setEditSessionSaving(false);
    }
  }, [isDbSession, editDate, editCoachId, editSessionType, editTitle, editStudentIds, sessionId, onSessionUpdated]);

  const handleDeleteSession = useCallback(async () => {
    if (!isDbSession) {
      setEditSessionError('This session cannot be deleted.');
      return;
    }
    const supabase = createClient();
    if (!supabase) {
      setEditSessionError('Supabase not configured');
      return;
    }
    setEditSessionDeleting(true);
    setEditSessionError(null);
    try {
      console.log('[TrainingSessionDetail] Deleting session:', sessionId);
      const { error: deleteError } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId);
      if (deleteError) {
        console.error('[TrainingSessionDetail] Delete error:', deleteError);
        throw deleteError;
      }
      console.log('[TrainingSessionDetail] Session deleted successfully');
      setShowEditSession(false);
      await onDeleteSession?.(sessionId);
      onBack();
    } catch (err) {
      console.error('[TrainingSessionDetail] Delete failed:', err);
      setEditSessionError(err instanceof Error ? err.message : 'Failed to delete session');
      setEditSessionDeleting(false);
      setShowDeleteConfirm(false);
    }
  }, [isDbSession, sessionId, onDeleteSession, onBack]);

  const sortedCommentTimestamps = useMemo(
    () =>
      [...new Set(comments.filter((c) => c.timestampSeconds != null).map((c) => c.timestampSeconds!))].sort(
        (a, b) => a - b
      ),
    [comments]
  );

  /** When students are selected, only consider comments that mention at least one of them. */
  const commentsForShotCount = useMemo(() => {
    if (studentFilter.length === 0) return comments;
    return comments.filter((c) =>
      (c.taggedUsers ?? []).some((u) => studentFilter.includes(u.id))
    );
  }, [comments, studentFilter]);

  /** Shot types in relevant comments. When students selected, only show shots with count > 0. */
  const shotsInComments = useMemo(() => {
    const shotSet = new Set<string>();
    commentsForShotCount.forEach((c) => {
      parseCommentTextWithShots(c.text).forEach((seg) => {
        if (seg.type === 'shot') shotSet.add(seg.name);
      });
    });
    const list = Array.from(shotSet).sort((a, b) => a.localeCompare(b));
    if (studentFilter.length === 0) return list;
    const count = new Map<string, number>();
    commentsForShotCount.forEach((c) => {
      parseCommentTextWithShots(c.text).forEach((seg) => {
        if (seg.type === 'shot') count.set(seg.name, (count.get(seg.name) ?? 0) + 1);
      });
    });
    return list.filter((shot) => (count.get(shot) ?? 0) > 0);
  }, [commentsForShotCount, studentFilter.length]);

  /** Count per shot in the relevant comments (all comments, or only those mentioning selected students). */
  const shotCountByName = useMemo(() => {
    const count = new Map<string, number>();
    commentsForShotCount.forEach((c) => {
      parseCommentTextWithShots(c.text).forEach((seg) => {
        if (seg.type === 'shot') count.set(seg.name, (count.get(seg.name) ?? 0) + 1);
      });
    });
    return count;
  }, [commentsForShotCount]);

  /** Count how many times each user is @mentioned in comment text across the session. */
  const tagCountByUserId = useMemo(() => {
    const count = new Map<string, number>();
    comments.forEach((c) => {
      parseCommentTextWithShots(c.text).forEach((seg) => {
        if (seg.type === 'mention') {
          count.set(seg.id, (count.get(seg.id) ?? 0) + 1);
        }
      });
    });
    return count;
  }, [comments]);

  const studentsInComments = useMemo(
    () =>
      Array.from(
        comments.reduce<Map<string, string>>((map, c) => {
          (c.taggedUsers ?? []).forEach((u) => {
            if (!map.has(u.id)) map.set(u.id, u.name);
          });
          return map;
        }, new Map())
      )
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [comments]
  );

  /** Comments sorted by timestamp ascending (newest last); comments without timestamp first. */
  const sortedComments = useMemo(() => {
    return [...comments].sort((a, b) => {
      const hasA = a.timestampSeconds != null ? 1 : 0;
      const hasB = b.timestampSeconds != null ? 1 : 0;
      if (hasA !== hasB) return hasA - hasB;
      if (hasA && hasB) {
        const ta = a.timestampSeconds ?? 0;
        const tb = b.timestampSeconds ?? 0;
        return ta - tb; // ascending (newest last)
      }
      return 0;
    });
  }, [comments]);

  const visibleComments = useMemo(() => {
    if (shotFilter.length === 0 && studentFilter.length === 0) return sortedComments;
    return sortedComments.filter((comment) => {
      const segments = parseCommentTextWithShots(comment.text);
      const commentShots = new Set(
        segments.filter((seg) => seg.type === 'shot').map((seg) => (seg as Extract<CommentSegment, { type: 'shot' }>).name)
      );
      const commentStudentIds = new Set((comment.taggedUsers ?? []).map((u) => u.id));

      if (shotFilter.length > 0 && !shotFilter.some((shot) => commentShots.has(shot))) {
        return false;
      }
      if (studentFilter.length > 0 && !studentFilter.some((id) => commentStudentIds.has(id))) {
        return false;
      }
      return true;
    });
  }, [sortedComments, shotFilter, studentFilter]);

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

  const formatTimestamp = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(1, '0')}:${s.toString().padStart(2, '0')}`;
  };

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

  const handleAddComment = async () => {
    if (!commentDraft.trim()) return;

    const currentTime = currentVideoTime ?? 0;
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
          selectedMentionIds,
          pendingNewCommentGif
        );
        if (inserted) {
          const mapped = mapDbCommentToSessionComment(inserted, user.id);
          setComments((prev) => [...prev, mapped]);
          setCommentDraft('');
          setSelectedMentionIds([]);
          setPendingNewCommentGif(null);
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
      ...(pendingNewCommentGif != null && { exampleGif: pendingNewCommentGif }),
    };
    setComments((prev) => [...prev, newComment]);
    setCommentDraft('');
    setPendingNewCommentGif(null);
  };

  const filteredShots = useMemo(() => {
    if (!shotMenu) return [];
    const q = shotMenu.query.trim().toLowerCase();
    if (!q) return [...SHOT_LIST];
    return SHOT_LIST.filter((shot) => shot.toLowerCase().includes(q));
  }, [shotMenu]);

  const filteredMentions = useMemo(() => {
    if (!mentionMenu) return [];
    const q = mentionMenu.query.trim().toLowerCase();
    const base = taggableProfiles;
    if (!q) return base;
    return base.filter((p) => p.name.toLowerCase().includes(q));
  }, [mentionMenu, taggableProfiles]);

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

  useEffect(() => {
    const handleClickOutside = () => {
      if (activeCommentMenu !== null) {
        setActiveCommentMenu(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeCommentMenu]);

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
    [shotMenu, mentionMenu, filteredShots, filteredMentions]
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

  const handleDeleteComment = async (commentId: string | number) => {
    if (!isDbSession || typeof commentId !== 'string') {
      // Local state fallback
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      return;
    }
    const supabase = createClient();
    const success = await deleteSessionComment(supabase, commentId);
    if (success) {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    }
  };

  const handleEditComment = async (commentId: string | number, newText: string) => {
    if (!isDbSession || typeof commentId !== 'string') {
      // Local state fallback
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, text: newText } : c))
      );
      setEditingCommentId(null);
      return;
    }
    const supabase = createClient();
    const success = await updateSessionComment(supabase, commentId, newText);
    if (success) {
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, text: newText } : c))
      );
      setEditingCommentId(null);
    }
  };

  if (!session) {
    return null;
  }

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        minHeight: isDesktop ? 'auto' : '100vh',
        width: '100%',
        margin: 0,
        boxSizing: 'border-box',
        boxShadow: '0 0 0 1px rgba(0,0,0,0.04)',
      }}
    >
      {/* Header: back icon, center date, right icon — scrolls with content */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: SPACING.sm,
          padding: `${SPACING.md}px clamp(${SPACING.sm}px, 4vw, ${SPACING.lg}px)`,
          borderBottom: '1px solid #f1f5f9',
          backgroundColor: '#ffffff',
          minWidth: 0,
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            width: 40,
            height: 40,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            border: 'none',
            background: 'none',
            color: '#475569',
            cursor: 'pointer',
          }}
          aria-label="Back"
        >
          <IconArrowLeft size={22} />
        </button>
        <h1
          style={{
            margin: 0,
            fontSize: 'clamp(15px, 4.5vw, 18px)',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: COLORS.textPrimary,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {session.dateLabel}
        </h1>
        {isDbSession && canAddVideoUrl ? (
          <button
            type="button"
            onClick={() => setShowEditSession(true)}
            style={{
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              border: 'none',
              background: 'none',
              color: '#475569',
              cursor: 'pointer',
              flexShrink: 0,
            }}
            aria-label="Edit session"
          >
            <IconPencil size={20} />
          </button>
        ) : (
          <div style={{ width: 40, flexShrink: 0 }} />
        )}
      </header>
      <div
        style={{
          padding: `0 clamp(${SPACING.sm}px, 4vw, ${SPACING.lg}px)`,
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {/* Main content */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isNarrow
              ? 'minmax(0, 1fr)'
              : 'minmax(0, 1fr) minmax(280px, 400px)',
            gap: SPACING.sm,
            minWidth: 0,
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
                  width: isNarrow && videoStickyBox ? videoStickyBox.width : (isNarrow ? '100%' : '100%'),
                  marginLeft: undefined,
                  marginRight: undefined,
                  left: isNarrow && videoStickyBox ? videoStickyBox.left : undefined,
                  borderRadius: 12,
                  overflow: 'hidden',
                  background: '#ffffff',
                  marginBottom: SPACING.sm,
                  border: 'none',
                }}
              >
              <div style={{ position: 'relative', width: '100%' }}>
              {session && (
                <VideoPlayer
                  videoUrl={session.videoUrl}
                  videoKey={session.id}
                  variant="sessionDetail"
                  accentColor={REFERENCE_PRIMARY}
                  pauseRequested={anyModalOpen}
                  markers={
                    comments
                      .filter((c) => c.timestampSeconds != null)
                      .map<VideoPlayerMarker>((c) => ({
                        time: c.timestampSeconds ?? 0,
                        id: c.id,
                        label: `${c.author}: ${
                          c.text.length > 45 ? c.text.slice(0, 45) + '…' : c.text
                        }`,
                      }))
                  }
                  onMarkerClick={(marker) => {
                    if (marker.id != null) {
                      setActiveCommentId(marker.id);
                    }
                  }}
                  onTimeUpdate={(t, dur) => {
                    setCurrentVideoTime(t);
                    setVideoDuration(dur);
                  }}
                  onActiveMarkerChange={(marker) => {
                    setActiveCommentId(marker?.id ?? null);
                  }}
                  seekToSeconds={pendingSeekSeconds}
                  onSeekHandled={() => setPendingSeekSeconds(null)}
                  canRequestAddUrl={canAddVideoUrl && !hasVideoUrl && !showAddUrlForm}
                  onRequestAddUrl={() => {
                    setShowAddUrlForm(true);
                    setAddUrlError(null);
                    setAddUrlDraft('');
                  }}
                />
              )}
              </div>
            </div>
          </div>

          {/* Comments column */}
          <div
            style={{
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              maxHeight: 'none',
              overflow: 'hidden',
            }}
          >
            {/* Filter & Sort */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: `${SPACING.xs}px 0`,
                gap: SPACING.xs,
                minWidth: 0,
              }}
            >
              <button
                type="button"
                onClick={() => setIsFilterSheetOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 12px',
                  borderRadius: 9999,
                  border: '1px solid #e2e8f0',
                  backgroundColor: 'transparent',
                  color: '#64748b',
                  fontSize: 'clamp(11px, 2.8vw, 12px)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
                aria-label="Filter comments"
                title="Filter comments by shots and students"
              >
                <IconFilter size={14} />
                Filters
                {(shotFilter.length || studentFilter.length) > 0 && (
                  <span
                    style={{
                      minWidth: 18,
                      height: 18,
                      borderRadius: 999,
                      backgroundColor: REFERENCE_PRIMARY,
                      color: '#fff',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      padding: '0 5px',
                    }}
                  >
                    {shotFilter.length + studentFilter.length}
                  </span>
                )}
              </button>
            </div>

            <div
              ref={commentsScrollRef}
              style={{
                flex: 1,
                minWidth: 0,
                overflowY: 'auto',
                overflowX: 'hidden',
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
              ) : visibleComments.length === 0 ? (
                <p
                  style={{
                    ...TYPOGRAPHY.bodySmall,
                    color: COLORS.textSecondary,
                    margin: 0,
                  }}
                >
                  No comments match the current filters.
                </p>
              ) : (
                visibleComments.map((comment) => {
                  const isCoach = comment.role === 'Coach';
                  const isActive = activeCommentId !== null && comment.id === activeCommentId;

                  return (
                    <div
                      key={comment.id}
                      data-comment-id={comment.id}
                      role={comment.timestampSeconds != null ? 'button' : undefined}
                      tabIndex={comment.timestampSeconds != null ? 0 : undefined}
                      onClick={
                        comment.timestampSeconds != null
                          ? () => {
                              setPendingSeekSeconds(comment.timestampSeconds!);
                              setActiveCommentId(comment.id);
                            }
                          : undefined
                      }
                      onKeyDown={
                        comment.timestampSeconds != null
                          ? (e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setPendingSeekSeconds(comment.timestampSeconds!);
                                setActiveCommentId(comment.id);
                              }
                            }
                          : undefined
                      }
                      style={{
                        display: 'flex',
                        gap: 12,
                        padding: `${SPACING.sm}px 0`,
                        cursor: comment.timestampSeconds != null ? 'pointer' : 'default',
                        backgroundColor: isActive ? `${REFERENCE_PRIMARY}18` : 'transparent',
                        borderRadius: 8,
                        margin: isActive ? `0 -${SPACING.sm}px` : 0,
                        paddingLeft: isActive ? SPACING.sm : 0,
                        paddingRight: isActive ? SPACING.sm : 0,
                      }}
                    >
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          backgroundColor: `${REFERENCE_PRIMARY}33`,
                          flexShrink: 0,
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 18,
                        }}
                      >
                        {isCoach ? '🎓' : '🙂'}
                      </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: SPACING.sm,
                          marginBottom: 4,
                          minWidth: 0,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, overflow: 'hidden' }}>
                          <span
                            style={{
                              fontSize: 14,
                              fontWeight: 700,
                              color: COLORS.textPrimary,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {comment.author}
                          </span>
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: SPACING.xs,
                            flexShrink: 0,
                            position: 'relative',
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {comment.timestampSeconds != null && (
                            <>
                              {comment.exampleGif ? (() => {
                                const gif = shotExampleGifs.find((g) => g.key === `./${comment.exampleGif}` || g.key === comment.exampleGif);
                                return (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (gif) setViewExampleModal({ src: gif.src, title: gif.title });
                                    }}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4,
                                      padding: `${SPACING.xs}px ${SPACING.sm}px`,
                                      borderRadius: RADIUS.sm,
                                      border: `1px solid ${REFERENCE_PRIMARY}40`,
                                      backgroundColor: `${REFERENCE_PRIMARY}1A`,
                                      color: REFERENCE_PRIMARY,
                                      ...TYPOGRAPHY.label,
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Show example
                                  </button>
                                );
                              })() : isAdmin ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExampleModalContext(comment.id);
                                    setIsExampleModalOpen(true);
                                  }}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    padding: '2px 8px',
                                    borderRadius: 6,
                                    border: '1px solid #e2e8f0',
                                    backgroundColor: COLORS.cardBg,
                                    color: COLORS.textSecondary,
                                    fontSize: 10,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                  }}
                                >
                                  +example
                                </button>
                              ) : null}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPendingSeekSeconds(comment.timestampSeconds!);
                                  setActiveCommentId(comment.id);
                                }}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  padding: '6px 12px',
                                  borderRadius: 8,
                                  border: 'none',
                                  backgroundColor: `${REFERENCE_PRIMARY}1A`,
                                  color: REFERENCE_PRIMARY,
                                  fontSize: 12,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                <IconPlay size={14} style={{ flexShrink: 0 }} />
                                {formatTimestamp(comment.timestampSeconds)}
                              </button>
                            </>
                          )}
                          {comment.role === 'You' && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveCommentMenu((prev) => (prev === comment.id ? null : comment.id));
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                padding: 4,
                                cursor: 'pointer',
                                color: COLORS.textSecondary,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '50%',
                              }}
                            >
                              <IconMoreVertical size={16} />
                            </button>
                          )}
                          {activeCommentMenu === comment.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                position: 'absolute',
                                top: '100%',
                                right: 0,
                                marginTop: 4,
                                backgroundColor: COLORS.cardBg,
                                borderRadius: RADIUS.md,
                                zIndex: 10,
                                minWidth: 120,
                                overflow: 'hidden',
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCommentId(comment.id);
                                  setActiveCommentMenu(null);
                                }}
                                style={{
                                  display: 'block',
                                  width: '100%',
                                  textAlign: 'left',
                                  padding: `${SPACING.sm}px ${SPACING.md}px`,
                                  background: 'none',
                                  border: 'none',
                                  ...TYPOGRAPHY.bodySmall,
                                  color: COLORS.textPrimary,
                                  cursor: 'pointer',
                                }}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  handleDeleteComment(comment.id);
                                  setActiveCommentMenu(null);
                                }}
                                style={{
                                  display: 'block',
                                  width: '100%',
                                  textAlign: 'left',
                                  padding: `${SPACING.sm}px ${SPACING.md}px`,
                                  background: 'none',
                                  border: 'none',
                                  ...TYPOGRAPHY.bodySmall,
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      {editingCommentId === comment.id ? (
                        <div onClick={(e) => e.stopPropagation()}>
                          <EditCommentInput
                            initialDraft={comment.text}
                            taggableProfiles={taggableProfiles}
                            onSave={(newDraft) => handleEditComment(comment.id, newDraft)}
                            onCancel={() => setEditingCommentId(null)}
                          />
                        </div>
                      ) : (
                        <p
                          style={{
                            ...TYPOGRAPHY.bodySmall,
                            margin: `${SPACING.xs}px 0 0`,
                            color: COLORS.textPrimary,
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word',
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
                      )}
                    </div>
                  </div>
                  );
                })
              )}
            </div>

            <div
              style={{
                borderRadius: RADIUS.md,
                padding: SPACING.sm,
                backgroundColor: COLORS.cardBg,
                border: `1px solid ${COLORS.backgroundLight}`,
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
                <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.xs }}>
                  {isAdmin && (pendingNewCommentGif ? (() => {
                    const gif = shotExampleGifs.find((g) => g.key === `./${pendingNewCommentGif}` || g.key === pendingNewCommentGif);
                    return (
                      <button
                        type="button"
                        onClick={() => { if (gif) setViewExampleModal({ src: gif.src, title: gif.title }); }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: `${SPACING.xs}px ${SPACING.sm}px`,
                          borderRadius: RADIUS.sm,
                          border: `1px solid ${REFERENCE_PRIMARY}40`,
                          backgroundColor: `${REFERENCE_PRIMARY}1A`,
                          color: REFERENCE_PRIMARY,
                          ...TYPOGRAPHY.label,
                          fontWeight: 600,
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                      >
                        Show example
                      </button>
                    );
                  })() : (
                    <button
                      type="button"
                      onClick={() => {
                        setExampleModalContext('new');
                        setIsExampleModalOpen(true);
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: `${SPACING.xs}px ${SPACING.sm}px`,
                        borderRadius: RADIUS.sm,
                        border: `1px solid ${COLORS.backgroundLight}`,
                        backgroundColor: COLORS.cardBg,
                        color: COLORS.textSecondary,
                        ...TYPOGRAPHY.label,
                        fontWeight: 600,
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      +example
                    </button>
                  ))}
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
                        color: includeTimestamp ? REFERENCE_PRIMARY : COLORS.textSecondary,
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
              </div>
              {/* Tag line with manual "+ Add person" dropdown removed; mentions are handled via @ in the comment box */}
              <div style={{ position: 'relative', marginBottom: SPACING.sm }}>
                <div
                  ref={commentInputRef}
                  id="session-comment-input"
                  contentEditable
                  suppressContentEditableWarning
                  role="textbox"
                  aria-multiline="true"
                  aria-label="Type / for shot commands or @ to tag people."
                  onInput={handleCommentInput}
                  onKeyDown={handleCommentKeyDown}
                  onPaste={(e) => {
                    e.preventDefault();
                    const text = e.clipboardData.getData('text/plain');
                    document.execCommand('insertText', false, text);
                  }}
                  data-placeholder="Type / for shot commands or @ to tag"
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
                    Type / for shot commands or @ to tag
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
                      ? REFERENCE_PRIMARY
                      : `${REFERENCE_PRIMARY}26`,
                    color: commentDraft.trim() ? '#1e293b' : COLORS.textPrimary,
                    boxShadow: commentDraft.trim()
                      ? `0 4px 12px ${REFERENCE_PRIMARY}40`
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
      {/* Edit Session Modal */}
      {showEditSession && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.5)',
            padding: SPACING.md,
          }}
          onClick={() => { setShowEditSession(false); setShowDeleteConfirm(false); }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Edit session"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 500,
              backgroundColor: COLORS.white,
              borderRadius: RADIUS.xl,
              boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
              overflow: 'hidden',
              maxHeight: '88vh',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: `${SPACING.lg}px ${SPACING.xl}px`,
                borderBottom: `1px solid ${COLORS.backgroundLight}`,
                flexShrink: 0,
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: 17,
                  fontWeight: 700,
                  color: COLORS.textPrimary,
                  letterSpacing: -0.3,
                }}
              >
                Edit Session
              </h2>
              <button
                type="button"
                onClick={() => { setShowEditSession(false); setShowDeleteConfirm(false); }}
                style={{
                  background: COLORS.backgroundLight,
                  border: 'none',
                  borderRadius: '50%',
                  width: 30,
                  height: 30,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: COLORS.textSecondary,
                  fontSize: 16,
                  lineHeight: 1,
                  flexShrink: 0,
                }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: `${SPACING.xl}px`,
                display: 'flex',
                flexDirection: 'column',
                gap: SPACING.lg,
              }}
            >
              {editSessionLoading ? (
                <p style={{ margin: 0, color: COLORS.textSecondary, fontSize: 14 }}>
                  Loading session details…
                </p>
              ) : (
                <>
                  {/* Title */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.xs }}>
                    <label
                      htmlFor="edit-session-title"
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        color: COLORS.textSecondary,
                      }}
                    >
                      Session Title
                    </label>
                    <input
                      id="edit-session-title"
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="e.g. Dink drills, doubles strategy…"
                      style={{
                        padding: `${SPACING.sm}px ${SPACING.md}px`,
                        borderRadius: RADIUS.sm,
                        border: `1.5px solid ${COLORS.backgroundLight}`,
                        fontSize: 15,
                        color: COLORS.textPrimary,
                        outline: 'none',
                        width: '100%',
                        boxSizing: 'border-box',
                        backgroundColor: COLORS.white,
                        fontFamily: 'inherit',
                      }}
                    />
                  </div>

                  {/* Date */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.xs }}>
                    <label
                      htmlFor="edit-session-date"
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        color: COLORS.textSecondary,
                      }}
                    >
                      Date
                    </label>
                    <input
                      id="edit-session-date"
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      style={{
                        padding: `${SPACING.sm}px ${SPACING.md}px`,
                        borderRadius: RADIUS.sm,
                        border: `1.5px solid ${COLORS.backgroundLight}`,
                        fontSize: 15,
                        color: COLORS.textPrimary,
                        outline: 'none',
                        width: '100%',
                        boxSizing: 'border-box',
                        backgroundColor: COLORS.white,
                        fontFamily: 'inherit',
                      }}
                    />
                  </div>

                  {/* Coach */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.xs }}>
                    <label
                      htmlFor="edit-session-coach"
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        color: COLORS.textSecondary,
                      }}
                    >
                      Coach
                    </label>
                    <select
                      id="edit-session-coach"
                      value={editCoachId}
                      onChange={(e) => setEditCoachId(e.target.value)}
                      style={{
                        padding: `${SPACING.sm}px ${SPACING.md}px`,
                        borderRadius: RADIUS.sm,
                        border: `1.5px solid ${COLORS.backgroundLight}`,
                        fontSize: 15,
                        color: editCoachId ? COLORS.textPrimary : COLORS.textMuted,
                        outline: 'none',
                        width: '100%',
                        boxSizing: 'border-box',
                        backgroundColor: COLORS.white,
                        fontFamily: 'inherit',
                        appearance: 'auto',
                      }}
                    >
                      <option value="">Select a coach…</option>
                      {MOCK_COACHES.map((coach) => (
                        <option key={coach.id} value={coach.id}>
                          {coach.name} — {coach.tier}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Session type (game / drill) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.xs }}>
                    <label
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        color: COLORS.textSecondary,
                      }}
                    >
                      Session type
                    </label>
                    <div style={{ display: 'flex', gap: SPACING.sm }}>
                      <label
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: SPACING.xs,
                          padding: SPACING.sm,
                          borderRadius: RADIUS.sm,
                          border: `2px solid ${editSessionType === 'game' ? COLORS.primary : COLORS.backgroundLight}`,
                          backgroundColor: editSessionType === 'game' ? COLORS.primaryLight : COLORS.white,
                          cursor: 'pointer',
                          fontSize: 15,
                          color: COLORS.textPrimary,
                        }}
                      >
                        <input
                          type="radio"
                          name="edit-session-type"
                          value="game"
                          checked={editSessionType === 'game'}
                          onChange={() => setEditSessionType('game')}
                          style={{ width: 18, height: 18, accentColor: COLORS.primary }}
                        />
                        Game
                      </label>
                      <label
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: SPACING.xs,
                          padding: SPACING.sm,
                          borderRadius: RADIUS.sm,
                          border: `2px solid ${editSessionType === 'drill' ? COLORS.primary : COLORS.backgroundLight}`,
                          backgroundColor: editSessionType === 'drill' ? COLORS.primaryLight : COLORS.white,
                          cursor: 'pointer',
                          fontSize: 15,
                          color: COLORS.textPrimary,
                        }}
                      >
                        <input
                          type="radio"
                          name="edit-session-type"
                          value="drill"
                          checked={editSessionType === 'drill'}
                          onChange={() => setEditSessionType('drill')}
                          style={{ width: 18, height: 18, accentColor: COLORS.primary }}
                        />
                        Drill
                      </label>
                    </div>
                  </div>

                  {/* Students */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.sm }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        color: COLORS.textSecondary,
                      }}
                    >
                      Students
                    </div>
                    {availableStudents.length === 0 ? (
                      <p style={{ margin: 0, fontSize: 14, color: COLORS.textMuted }}>
                        No students found.
                      </p>
                    ) : (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 2,
                          maxHeight: 200,
                          overflowY: 'auto',
                          border: `1.5px solid ${COLORS.backgroundLight}`,
                          borderRadius: RADIUS.sm,
                          padding: `${SPACING.xs}px 0`,
                        }}
                      >
                        {availableStudents.map((student) => {
                          const checked = editStudentIds.includes(student.id);
                          return (
                            <label
                              key={student.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: SPACING.sm,
                                padding: `${SPACING.sm}px ${SPACING.md}px`,
                                cursor: 'pointer',
                                backgroundColor: checked ? 'rgba(49, 203, 0, 0.06)' : 'transparent',
                                transition: 'background-color 0.1s ease',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleEditStudent(student.id)}
                                style={{ accentColor: COLORS.primary, width: 16, height: 16, flexShrink: 0 }}
                              />
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 14, fontWeight: checked ? 600 : 400, color: COLORS.textPrimary }}>
                                  {student.name}
                                </div>
                                {student.email && (
                                  <div style={{ fontSize: 12, color: COLORS.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {student.email}
                                  </div>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                    {editStudentIds.length > 0 && (
                      <div style={{ fontSize: 12, color: COLORS.textSecondary }}>
                        {editStudentIds.length} student{editStudentIds.length !== 1 ? 's' : ''} selected
                      </div>
                    )}
                  </div>

                  {editSessionError && (
                    <div
                      style={{
                        padding: `${SPACING.sm}px ${SPACING.md}px`,
                        borderRadius: RADIUS.sm,
                        backgroundColor: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        fontSize: 13,
                        color: '#ef4444',
                      }}
                    >
                      {editSessionError}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div
              style={{
                padding: `${SPACING.md}px ${SPACING.xl}px`,
                borderTop: `1px solid ${COLORS.backgroundLight}`,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: SPACING.sm,
                flexWrap: 'wrap',
              }}
            >
              {/* Delete section */}
              {!showDeleteConfirm ? (
                <button
                  type="button"
                  onClick={() => {
                    console.log('[TrainingSessionDetail] Delete button clicked, showing confirmation');
                    setShowDeleteConfirm(true);
                  }}
                  disabled={editSessionDeleting}
                  style={{
                    padding: `${SPACING.xs + 2}px ${SPACING.md}px`,
                    borderRadius: RADIUS.sm,
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    backgroundColor: 'rgba(239, 68, 68, 0.06)',
                    color: '#ef4444',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Delete session
                </button>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: SPACING.xs,
                    flexWrap: 'wrap',
                  }}
                >
                  <span style={{ fontSize: 13, color: COLORS.textSecondary, fontWeight: 500 }}>
                    Are you sure?
                  </span>
                  <button
                    type="button"
                    onClick={handleDeleteSession}
                    disabled={editSessionDeleting}
                    style={{
                      padding: `${SPACING.xs + 2}px ${SPACING.md}px`,
                      borderRadius: RADIUS.sm,
                      border: 'none',
                      backgroundColor: '#ef4444',
                      color: '#fff',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: editSessionDeleting ? 'default' : 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    {editSessionDeleting ? 'Deleting…' : 'Yes, delete'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      console.log('[TrainingSessionDetail] Cancel button clicked');
                      setShowDeleteConfirm(false);
                    }}
                    style={{
                      padding: `${SPACING.xs + 2}px ${SPACING.md}px`,
                      borderRadius: RADIUS.sm,
                      border: `1px solid ${COLORS.backgroundLight}`,
                      backgroundColor: 'transparent',
                      color: COLORS.textSecondary,
                      fontSize: 13,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Save / Cancel */}
              <div style={{ display: 'flex', gap: SPACING.sm, marginLeft: 'auto' }}>
                <button
                  type="button"
                  onClick={() => { setShowEditSession(false); setShowDeleteConfirm(false); }}
                  style={{
                    padding: `${SPACING.xs + 2}px ${SPACING.lg}px`,
                    borderRadius: RADIUS.sm,
                    border: `1px solid ${COLORS.backgroundLight}`,
                    backgroundColor: 'transparent',
                    color: COLORS.textSecondary,
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveSessionDetails}
                  disabled={editSessionSaving || editSessionLoading}
                  style={{
                    padding: `${SPACING.xs + 2}px ${SPACING.lg}px`,
                    borderRadius: RADIUS.sm,
                    border: 'none',
                    backgroundColor: editSessionSaving || editSessionLoading ? COLORS.primaryLight : COLORS.primary,
                    color: COLORS.textPrimary,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: editSessionSaving || editSessionLoading ? 'default' : 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {editSessionSaving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comment filter bottom sheet - above bottom nav so Apply Filters is visible */}
      <div
        aria-hidden={!isFilterSheetOpen}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 110,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          pointerEvents: isFilterSheetOpen ? 'auto' : 'none',
          backgroundColor: isFilterSheetOpen ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0)',
          transition: 'background-color 0.22s ease-out',
        }}
        onClick={() => setIsFilterSheetOpen(false)}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Filter comments"
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: 640,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            backgroundColor: COLORS.cardBg,
            boxShadow: isFilterSheetOpen ? '0 -18px 40px rgba(0,0,0,0.45)' : 'none',
            borderTop: `1px solid ${COLORS.backgroundLight}`,
            maxHeight: '90vh',
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            transform: isFilterSheetOpen ? 'translateY(0%)' : 'translateY(100%)',
            transition: 'transform 0.24s cubic-bezier(0.22, 0.61, 0.36, 1)',
          }}
        >
          {/* Handle + Header */}
          <div style={{ flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: SPACING.sm }}>
              <div
                style={{
                  width: 48,
                  height: 4,
                  borderRadius: 999,
                  backgroundColor: '#e2e8f0',
                }}
              />
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: `${SPACING.sm}px ${SPACING.lg}px ${SPACING.md}px`,
                gap: SPACING.md,
              }}
            >
              <button
                type="button"
                onClick={() => setIsFilterSheetOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 40,
                  height: 40,
                  padding: 0,
                  border: 'none',
                  background: 'none',
                  color: COLORS.textPrimary,
                  cursor: 'pointer',
                  borderRadius: '50%',
                }}
                aria-label="Close filters"
              >
                <IconX size={24} />
              </button>
              <h2
                style={{
                  flex: 1,
                  fontSize: 20,
                  fontWeight: 600,
                  color: COLORS.textPrimary,
                  margin: 0,
                  letterSpacing: '-0.02em',
                  textAlign: 'center',
                }}
              >
                Filters
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShotFilter([]);
                  setStudentFilter([]);
                }}
                style={{
                  padding: '4px 0',
                  minWidth: 40,
                  border: 'none',
                  background: 'none',
                  color: REFERENCE_PRIMARY,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Reset
              </button>
            </div>
          </div>
          {/* Scrollable content */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: `0 ${SPACING.lg}px ${SPACING.lg}px`,
              display: 'flex',
              flexDirection: 'column',
              gap: 32,
            }}
          >
            {/* Shots in this thread */}
            <section>
              <div style={{ marginBottom: SPACING.md }}>
                <h3
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    color: COLORS.textPrimary,
                    margin: 0,
                  }}
                >
                  Shots in this thread
                </h3>
              </div>
              {shotsInComments.length === 0 ? (
                <p style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textMuted, margin: 0 }}>
                  No shot tags have been used in the comments yet.
                </p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {shotsInComments.map((shot) => {
                    const isActive = shotFilter.includes(shot);
                    return (
                      <button
                        key={shot}
                        type="button"
                        onClick={() =>
                          setShotFilter((prev) =>
                            prev.includes(shot) ? prev.filter((s) => s !== shot) : [...prev, shot]
                          )
                        }
                        style={{
                          padding: '10px 20px',
                          borderRadius: 9999,
                          border: isActive
                            ? `1px solid ${REFERENCE_PRIMARY}`
                            : '1px solid #f1f5f9',
                          backgroundColor: isActive ? REFERENCE_PRIMARY : '#f8fafc',
                          color: isActive ? '#fff' : '#475569',
                          fontSize: 14,
                          fontWeight: 500,
                          cursor: 'pointer',
                        }}
                      >
                        {shot}
                        <span style={{ marginLeft: 4, opacity: isActive ? 0.9 : 0.85 }}>
                          ({shotCountByName.get(shot) ?? 0})
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
            {/* Students in this thread */}
            <section>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: SPACING.md,
                }}
              >
                <h3
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    color: COLORS.textPrimary,
                    margin: 0,
                  }}
                >
                  Students in this thread
                </h3>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: '#94a3b8',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {studentFilter.length} active
                </span>
              </div>
              {studentsInComments.length === 0 ? (
                <p style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textMuted, margin: 0 }}>
                  No students have been tagged in comments yet.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {studentsInComments.map((s) => {
                    const isActive = studentFilter.includes(s.id);
                    const handle = s.name.toLowerCase().replace(/\s+/g, '');
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() =>
                          setStudentFilter((prev) =>
                            prev.includes(s.id) ? prev.filter((id) => id !== s.id) : [...prev, s.id]
                          )
                        }
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: 12,
                          borderRadius: 12,
                          border: `1px solid ${isActive ? '#e2e8f0' : '#f1f5f9'}`,
                          backgroundColor: isActive ? '#f8fafc' : 'transparent',
                          cursor: 'pointer',
                          width: '100%',
                          textAlign: 'left',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            opacity: isActive ? 1 : 0.6,
                          }}
                        >
                          <div
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: '50%',
                              backgroundColor: '#e2e8f0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'hidden',
                              flexShrink: 0,
                            }}
                          >
                            <IconUser size={20} style={{ color: '#94a3b8' }} />
                          </div>
                          <div>
                            <p
                              style={{
                                fontSize: 14,
                                fontWeight: 500,
                                color: COLORS.textPrimary,
                                margin: 0,
                              }}
                            >
                              {s.name}
                            </p>
                            <p
                              style={{
                                fontSize: 12,
                                color: '#64748b',
                                margin: 0,
                              }}
                            >
                              @{handle}({tagCountByUserId.get(s.id) ?? 0})
                            </p>
                          </div>
                        </div>
                        <div
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            border: isActive ? 'none' : '1px solid #cbd5e1',
                            backgroundColor: isActive ? REFERENCE_PRIMARY : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {isActive && <IconCheck size={14} style={{ color: '#fff' }} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
          {/* Footer: Apply Filters + results */}
          <div
            style={{
              flexShrink: 0,
              padding: SPACING.lg,
              paddingTop: SPACING.md,
              borderTop: `1px solid ${COLORS.backgroundLight}`,
              backgroundColor: COLORS.cardBg,
            }}
          >
            <button
              type="button"
              onClick={() => setIsFilterSheetOpen(false)}
              style={{
                width: '100%',
                padding: '16px 24px',
                borderRadius: 16,
                border: 'none',
                backgroundColor: REFERENCE_PRIMARY,
                color: '#fff',
                fontSize: 18,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Apply Filters
            </button>
            <p
              style={{
                textAlign: 'center',
                fontSize: 12,
                color: '#94a3b8',
                margin: 0,
                marginTop: SPACING.md,
              }}
            >
              Showing {visibleComments.length} results based on your selection
            </p>
          </div>
        </div>
      </div>

      {isExampleModalOpen && (
        <div
          role="presentation"
          onClick={() => setIsExampleModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1200,
            backgroundColor: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: SPACING.lg,
          }}
        >
          <div
            role="dialog"
            aria-label="Shot examples"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(960px, 100%)',
              maxHeight: 'min(80vh, 760px)',
              overflow: 'auto',
              backgroundColor: COLORS.white,
              borderRadius: RADIUS.xl,
              boxShadow: '0 16px 48px rgba(0,0,0,0.22)',
              padding: SPACING.xxl,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: SPACING.md }}>
              <div>
                <h3 style={{ ...TYPOGRAPHY.h3, color: COLORS.textPrimary, margin: 0 }}>Shot examples</h3>
                <div style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, marginTop: 6 }}>
                  {shotExampleGifs.length} example{shotExampleGifs.length === 1 ? '' : 's'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: SPACING.sm, alignItems: 'center' }}>
                <button
                  type="button"
                  disabled={selectedExampleKey == null}
                  onClick={handleAddExample}
                  style={{
                    border: 'none',
                    backgroundColor: selectedExampleKey == null ? COLORS.backgroundLight : COLORS.primary,
                    color: selectedExampleKey == null ? COLORS.textSecondary : COLORS.textPrimary,
                    borderRadius: 999,
                    padding: `${SPACING.xs}px ${SPACING.md}px`,
                    cursor: selectedExampleKey == null ? 'not-allowed' : 'pointer',
                    opacity: selectedExampleKey == null ? 0.7 : 1,
                    ...TYPOGRAPHY.label,
                    fontWeight: 700,
                    letterSpacing: 0.2,
                  }}
                >
                  Add Example
                </button>
                <button
                  type="button"
                  onClick={() => setIsExampleModalOpen(false)}
                  style={{
                    border: `1px solid ${COLORS.backgroundLight}`,
                    backgroundColor: COLORS.white,
                    color: COLORS.textSecondary,
                    borderRadius: 999,
                    padding: `${SPACING.xs}px ${SPACING.md}px`,
                    cursor: 'pointer',
                    ...TYPOGRAPHY.label,
                    fontWeight: 600,
                  }}
                >
                  Close
                </button>
              </div>
            </div>

            <div
              style={{
                marginTop: SPACING.xl,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: SPACING.lg,
              }}
            >
              {shotExampleGifs.map((g) => (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => setSelectedExampleKey(g.key)}
                  style={{
                    borderRadius: RADIUS.lg,
                    border:
                      selectedExampleKey === g.key
                        ? `2px solid ${COLORS.primary}`
                        : `1px solid ${COLORS.backgroundLight}`,
                    backgroundColor: selectedExampleKey === g.key ? 'rgba(49, 203, 0, 0.08)' : COLORS.white,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    padding: 0,
                    textAlign: 'left',
                  }}
                >
                  <div style={{ padding: SPACING.md }}>
                    <div style={{ ...TYPOGRAPHY.labelMed, color: COLORS.textPrimary, fontWeight: 700 }}>
                      {g.title}
                    </div>
                  </div>
                  <div style={{ padding: `0 ${SPACING.md}px ${SPACING.md}px` }}>
                    <img
                      src={g.src}
                      alt={g.title}
                      style={{
                        width: '100%',
                        height: 'auto',
                        maxHeight: 320,
                        objectFit: 'contain',
                        borderRadius: RADIUS.md,
                        border: `1px solid ${COLORS.backgroundLight}`,
                        backgroundColor: COLORS.backgroundLight,
                        display: 'block',
                      }}
                    />
                  </div>
                </button>
              ))}
              {shotExampleGifs.length === 0 && (
                <div style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary }}>
                  No GIFs found in <code style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>src/assets/shot-examples</code>.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {viewExampleModal && (
        <div
          role="presentation"
          onClick={() => setViewExampleModal(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1300,
            backgroundColor: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: SPACING.lg,
          }}
        >
          <div
            role="dialog"
            aria-label={viewExampleModal.title}
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: COLORS.white,
              borderRadius: RADIUS.xl,
              boxShadow: '0 16px 48px rgba(0,0,0,0.25)',
              padding: SPACING.xl,
              width: 'min(560px, 100%)',
              display: 'flex',
              flexDirection: 'column',
              gap: SPACING.md,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.md }}>
              <div style={{ ...TYPOGRAPHY.h3, color: COLORS.textPrimary, margin: 0 }}>
                {viewExampleModal.title}
              </div>
              <button
                type="button"
                onClick={() => setViewExampleModal(null)}
                style={{
                  border: `1px solid ${COLORS.backgroundLight}`,
                  backgroundColor: COLORS.white,
                  color: COLORS.textSecondary,
                  borderRadius: 999,
                  padding: `${SPACING.xs}px ${SPACING.md}px`,
                  cursor: 'pointer',
                  ...TYPOGRAPHY.label,
                  fontWeight: 600,
                }}
              >
                Close
              </button>
            </div>
            <img
              src={viewExampleModal.src}
              alt={viewExampleModal.title}
              style={{
                width: '100%',
                height: 'auto',
                borderRadius: RADIUS.lg,
                border: `1px solid ${COLORS.backgroundLight}`,
                backgroundColor: COLORS.backgroundLight,
                display: 'block',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

