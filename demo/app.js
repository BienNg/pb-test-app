// ── Mock Data ──────────────────────────────────────────────────────────
const MOCK = {
  session: {
    date: 'Sun, Mar 15, 2026',
    shot: 'Forehand Dink',
    student: 'bach.nn11',
    duration: 202,
  },
  comments: [
    {
      id: 1,
      author: 'bien-nguyen',
      initials: 'B',
      timestamp: 10,
      loopEnd: null,
      text: 'Dont go up when hitting the ball',
      frames: [
        {
          id: 'fd-1a',
          ts: 10,
          note: 'Head Starting position before hitting the ball',
          marker: { cx: 295, cy: 130, r: 28 },
        },
        {
          id: 'fd-1b',
          ts: 10,
          note: 'Head Ending position after shot. Your Head should stay at the same level',
          marker: { cx: 295, cy: 138, r: 26 },
        },
      ],
    },
    {
      id: 2,
      author: 'bien-nguyen',
      initials: 'B',
      timestamp: 13,
      loopEnd: 15,
      text: 'Footwork is bad',
      frames: [
        {
          id: 'fd-2a',
          ts: 14,
          note: 'Feet too close together — widen your stance for better balance',
          marker: { cx: 293, cy: 195, r: 32 },
        },
      ],
    },
    {
      id: 3,
      author: 'bien-nguyen',
      initials: 'B',
      timestamp: 43,
      loopEnd: null,
      text: 'Dont reach for the ball. Let it come to you and use your [[shot:Forehand Dink]] motion',
      frames: [],
    },
    {
      id: 4,
      author: 'bien-nguyen',
      initials: 'B',
      timestamp: 87,
      loopEnd: null,
      text: 'Bend your knees more — weight should be forward on your toes during the [[shot:Dink]]',
      frames: [
        {
          id: 'fd-4a',
          ts: 87,
          note: 'Knee bend — ideally at 120° angle for stable base',
          marker: { cx: 295, cy: 190, r: 30 },
        },
      ],
    },
    {
      id: 5,
      author: 'bien-nguyen',
      initials: 'B',
      timestamp: 135,
      loopEnd: 140,
      text: 'Good paddle angle here! Keep this up. Notice the compact [[shot:Follow-through]]',
      frames: [],
    },
  ],
  technique: {
    subCategories: [
      { id: 'normal', label: 'Normal' },
      { id: 'topspin', label: 'Topspin' },
      { id: 'slice', label: 'Slice' },
    ],
    items: {
      normal: [
        { label: 'Head stability', checked: false },
        { label: 'Arm extension', checked: false },
        { label: 'Knee bend', checked: false },
        { label: 'Paddle angle', checked: true },
        { label: 'Follow-through', checked: true },
        { label: 'Weight transfer', checked: false },
        { label: 'Contact point', checked: true },
      ],
      topspin: [
        { label: 'Low-to-high swing path', checked: false },
        { label: 'Wrist snap at contact', checked: false },
        { label: 'Paddle face angle (closed)', checked: true },
        { label: 'Follow-through height', checked: false },
      ],
      slice: [
        { label: 'High-to-low swing path', checked: true },
        { label: 'Open paddle face', checked: true },
        { label: 'Underspin contact', checked: false },
        { label: 'Soft hands at contact', checked: false },
      ],
    },
  },
  examples: [
    { name: 'Forehand Dink – Professional Form', desc: 'Stable head, bent knees, compact swing', color: '#3a7d5a' },
    { name: 'Head Stability Drill', desc: 'Keep head level throughout the stroke', color: '#5b8675' },
    { name: 'Reach Correction Exercise', desc: 'Let the ball come to you, don\'t reach', color: '#8FB9A8' },
  ],
};

// ── State ──────────────────────────────────────────────────────────────
let DURATION = MOCK.session.duration;
let currentTime = 0;
let isPlaying = false;
let playInterval = null;
let activeCommentId = null;
let openMenuId = null;
let activeAnnotationTimeout = null;
let activeFrameId = null;
let activeTechSubTab = 'normal';
let skipIndicatorTimeout = null;
let ytPlayer = null;
let ytReady = false;
let progressRAF = null;

// ── DOM Helpers ────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

// ── Time Helpers ───────────────────────────────────────────────────────
function fmt(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function updateProgressUI() {
  const pct = DURATION > 0 ? (currentTime / DURATION) * 100 : 0;
  $('progressFill').style.width = pct + '%';
  $('progressThumb').style.left = pct + '%';
  $('videoCurrentTime').textContent = fmt(currentTime);
  const durEl = $('videoDuration');
  if (durEl) durEl.textContent = fmt(DURATION);
}

// ── YouTube Player ─────────────────────────────────────────────────────
function onYouTubeIframeAPIReady() {
  ytPlayer = new YT.Player('ytPlayer', {
    videoId: 'qZRiKBCIdFo',
    playerVars: {
      controls: 0,
      modestbranding: 1,
      rel: 0,
      showinfo: 0,
      iv_load_policy: 3,
      disablekb: 1,
      fs: 0,
      playsinline: 1,
    },
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange,
    },
  });
}
window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;

function onPlayerReady() {
  ytReady = true;
  DURATION = ytPlayer.getDuration() || MOCK.session.duration;
  updateProgressUI();
}

function onPlayerStateChange(event) {
  const state = event.data;
  if (state === YT.PlayerState.PLAYING) {
    isPlaying = true;
    setPlayIcons(true);
    startProgressSync();
  } else if (state === YT.PlayerState.PAUSED || state === YT.PlayerState.ENDED) {
    isPlaying = false;
    setPlayIcons(false);
    stopProgressSync();
    syncTimeFromPlayer();
  }
}

function startProgressSync() {
  stopProgressSync();
  const loopComment = MOCK.comments.find(
    (c) => c.id === activeCommentId && c.loopEnd !== null
  );
  function tick() {
    if (!ytReady || !isPlaying) return;
    currentTime = ytPlayer.getCurrentTime();

    if (loopComment && currentTime >= loopComment.loopEnd) {
      ytPlayer.seekTo(loopComment.timestamp, true);
      currentTime = loopComment.timestamp;
    }

    updateProgressUI();
    progressRAF = requestAnimationFrame(tick);
  }
  progressRAF = requestAnimationFrame(tick);
}

function stopProgressSync() {
  if (progressRAF) {
    cancelAnimationFrame(progressRAF);
    progressRAF = null;
  }
}

function syncTimeFromPlayer() {
  if (ytReady) {
    currentTime = ytPlayer.getCurrentTime();
    updateProgressUI();
  }
}

// ── Playback ───────────────────────────────────────────────────────────
function togglePlay() {
  if (!ytReady) return;
  if (isPlaying) {
    ytPlayer.pauseVideo();
  } else {
    hideAnnotation();
    ytPlayer.playVideo();
  }
}

function setPlayIcons(playing) {
  $('tcPlayIcon').style.display = playing ? 'none' : 'block';
  $('tcPauseIcon').style.display = playing ? 'block' : 'none';
}

function stopPlayback() {
  if (ytReady && isPlaying) {
    ytPlayer.pauseVideo();
  }
  isPlaying = false;
  stopProgressSync();
  setPlayIcons(false);
}

function adjustTime(delta) {
  if (!ytReady) return;
  currentTime = Math.max(0, Math.min(DURATION, currentTime + delta));
  ytPlayer.seekTo(currentTime, true);
  updateProgressUI();
  showSkipIndicator(delta);
}

function showSkipIndicator(delta) {
  const el = $('skipIndicator');
  if (!el) return;
  let label;
  if (Math.abs(delta) < 0.05) label = delta > 0 ? '+1f' : '−1f';
  else if (Math.abs(delta) === 1) label = delta > 0 ? '+1s' : '−1s';
  else if (Math.abs(delta) === 5) label = delta > 0 ? '+5s' : '−5s';
  else label = delta > 0 ? '+10s' : '−10s';
  el.textContent = label;
  el.classList.add('visible');
  clearTimeout(skipIndicatorTimeout);
  skipIndicatorTimeout = setTimeout(() => el.classList.remove('visible'), 600);
}

function seekToTime(t, showAnn) {
  currentTime = Math.max(0, Math.min(DURATION, t));
  if (ytReady) ytPlayer.seekTo(currentTime, true);
  updateProgressUI();
  if (showAnn) showFrameAnnotation();
}

function seekFromBar(e) {
  const track = $('progressTrack');
  const rect = track.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const pct = Math.max(0, Math.min(1, x / rect.width));
  currentTime = pct * DURATION;
  if (ytReady) ytPlayer.seekTo(currentTime, true);
  updateProgressUI();
}

// ── Annotation ─────────────────────────────────────────────────────────
function showFrameAnnotation(marker) {
  if (isPlaying) return;
  const ann = $('frameAnnotation');
  if (marker) {
    updateAnnotationCircle($('annotationCircle'), marker);
  }
  ann.classList.add('visible');
  clearTimeout(activeAnnotationTimeout);
  activeAnnotationTimeout = setTimeout(hideAnnotation, 5000);
}

function hideAnnotation() {
  $('frameAnnotation').classList.remove('visible');
}

function updateAnnotationCircle(circleEl, marker) {
  if (!circleEl || !marker) return;
  circleEl.setAttribute('cx', marker.cx);
  circleEl.setAttribute('cy', marker.cy);
  circleEl.setAttribute('r', marker.r);
  const anim = circleEl.querySelector('animateTransform');
  if (anim) {
    anim.setAttribute('from', `0 ${marker.cx} ${marker.cy}`);
    anim.setAttribute('to', `360 ${marker.cx} ${marker.cy}`);
  }
  const inner = circleEl.nextElementSibling;
  if (inner && inner.tagName === 'circle') {
    inner.setAttribute('cx', marker.cx);
    inner.setAttribute('cy', marker.cy);
    inner.setAttribute('r', marker.r - 6);
  }
}

// ── Draggable annotation ───────────────────────────────────────────────
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragMarkerStart = { cx: 0, cy: 0 };

function initDraggableAnnotation() {
  const overlay = $('frameAnnotation');
  overlay.addEventListener('mousedown', onAnnotationDragStart);
  overlay.addEventListener('touchstart', onAnnotationDragStart, { passive: false });
  document.addEventListener('mousemove', onAnnotationDragMove);
  document.addEventListener('touchmove', onAnnotationDragMove, { passive: false });
  document.addEventListener('mouseup', onAnnotationDragEnd);
  document.addEventListener('touchend', onAnnotationDragEnd);
}

function onAnnotationDragStart(e) {
  if (!$('frameAnnotation').classList.contains('interactive')) return;
  isDragging = true;
  const pos = e.touches ? e.touches[0] : e;
  dragStartX = pos.clientX;
  dragStartY = pos.clientY;
  const circle = $('annotationCircle');
  dragMarkerStart = {
    cx: parseFloat(circle.getAttribute('cx')),
    cy: parseFloat(circle.getAttribute('cy')),
  };
  e.preventDefault();
}

function onAnnotationDragMove(e) {
  if (!isDragging) return;
  const pos = e.touches ? e.touches[0] : e;
  const wrapper = $('videoWrapper');
  const rect = wrapper.getBoundingClientRect();
  const scaleX = 430 / rect.width;
  const scaleY = 242 / rect.height;
  const dx = (pos.clientX - dragStartX) * scaleX;
  const dy = (pos.clientY - dragStartY) * scaleY;
  const newCx = Math.max(30, Math.min(400, dragMarkerStart.cx + dx));
  const newCy = Math.max(20, Math.min(220, dragMarkerStart.cy + dy));
  const marker = { cx: newCx, cy: newCy, r: parseFloat($('annotationCircle').getAttribute('r')) };
  updateAnnotationCircle($('annotationCircle'), marker);
  clearTimeout(activeAnnotationTimeout);
}

function onAnnotationDragEnd() {
  if (!isDragging) return;
  isDragging = false;
  clearTimeout(activeAnnotationTimeout);
  activeAnnotationTimeout = setTimeout(hideAnnotation, 5000);
}

// ── Comments ───────────────────────────────────────────────────────────
function activateComment(id, ts) {
  $$('.comment-item').forEach((el) => el.classList.remove('active'));
  activeCommentId = id;
  const el = $('comment-' + id);
  if (el) el.classList.add('active');
  if (isPlaying) stopPlayback();

  const comment = MOCK.comments.find((c) => c.id === id);
  const defaultMarker = { cx: 295, cy: 130, r: 28 };
  const marker = comment?.frames?.[0]?.marker || defaultMarker;
  seekToTime(ts, false);
  showFrameAnnotation(marker);

  updateLoopRange(comment);
  el && el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function updateLoopRange(comment) {
  const bar = $('loopRangeBar');
  const icon = $('loopIcon');
  if (!bar || !icon) return;
  if (comment && comment.loopEnd !== null) {
    const startPct = (comment.timestamp / DURATION) * 100;
    const endPct = (comment.loopEnd / DURATION) * 100;
    bar.style.left = startPct + '%';
    bar.style.width = (endPct - startPct) + '%';
    bar.style.display = 'block';
    icon.style.display = 'flex';
  } else {
    bar.style.display = 'none';
    icon.style.display = 'none';
  }
}

// ── View Frame ─────────────────────────────────────────────────────────
function viewFrame(frameId) {
  const frame = findFrame(frameId);
  if (!frame) return;
  if (isPlaying) stopPlayback();
  seekToTime(frame.ts, false);
  showFrameAnnotation(frame.marker);

  activeFrameId = frameId;
  $$('.frame-card').forEach((el) => el.classList.remove('active-frame'));
  const card = document.querySelector(`[data-frame-id="${frameId}"]`);
  if (card) card.classList.add('active-frame');

  updateAnnotationCircle($('modalCircle'), frame.marker);
  $('viewFrameModalTitle').textContent = `Frame Detail [${fmt(frame.ts)}]`;
  $('viewFrameModalNote').textContent = frame.note;
  $('viewFrameModalBadge').innerHTML = `
    <svg width="10" height="10" viewBox="0 0 24 24" fill="#8FB9A8"><polygon points="5,3 19,12 5,21"/></svg>
    ${fmt(frame.ts)}
  `;
  $('viewFrameModal').classList.add('open');
}

function findFrame(frameId) {
  for (const c of MOCK.comments) {
    for (const f of c.frames) {
      if (f.id === frameId) return f;
    }
  }
  return null;
}

function closeViewFrameModal() {
  $('viewFrameModal').classList.remove('open');
  activeFrameId = null;
  $$('.frame-card').forEach((el) => el.classList.remove('active-frame'));
}

// ── Tabs ───────────────────────────────────────────────────────────────
function switchTab(tab) {
  const isComments = tab === 'comments';
  $('tab-comments').classList.toggle('active', isComments);
  $('tab-shot').classList.toggle('active', !isComments);
  $('commentsArea').style.display = isComments ? 'block' : 'none';
  $('shotTechniquePanel').classList.toggle('visible', !isComments);
}

// ── Context Menus ──────────────────────────────────────────────────────
function toggleCtxMenu(menuId, e) {
  e.stopPropagation();
  const menu = $(menuId);
  const isOpen = menu.classList.contains('open');
  closeMenus();
  if (!isOpen) {
    menu.classList.add('open');
    openMenuId = menuId;
  }
}

function closeMenus() {
  if (openMenuId) {
    const menu = $(openMenuId);
    if (menu) menu.classList.remove('open');
    openMenuId = null;
  }
}

document.addEventListener('click', closeMenus);

// ── Comment Actions ────────────────────────────────────────────────────
function doAddFrameComment(parentId) {
  closeMenus();
  if (isPlaying) stopPlayback();

  const overlay = $('frameAnnotation');
  overlay.classList.add('interactive');
  const defaultMarker = { cx: 215, cy: 130, r: 28 };
  updateAnnotationCircle($('annotationCircle'), defaultMarker);
  showFrameAnnotation(defaultMarker);
  clearTimeout(activeAnnotationTimeout);

  showToast(`Drag the red circle to annotate at ${fmt(currentTime)}, then click to confirm`);

  const confirmHandler = () => {
    overlay.classList.remove('interactive');
    overlay.removeEventListener('dblclick', confirmHandler);
    const circle = $('annotationCircle');
    const cx = parseFloat(circle.getAttribute('cx'));
    const cy = parseFloat(circle.getAttribute('cy'));
    showToast(`Frame comment added at (${Math.round(cx)}, ${Math.round(cy)})`);
    activeAnnotationTimeout = setTimeout(hideAnnotation, 3000);
  };
  overlay.addEventListener('dblclick', confirmHandler);
}

function doEditComment(id) {
  closeMenus();
  showToast('Edit comment #' + id);
}

function doDeleteComment(id) {
  closeMenus();
  const el = $('comment-' + id);
  if (el) {
    el.style.transition = 'opacity 0.2s, transform 0.2s';
    el.style.opacity = '0';
    el.style.transform = 'translateX(16px)';
    setTimeout(() => el.remove(), 220);
    showToast('Comment deleted');
  }
}

// ── Example Modal ──────────────────────────────────────────────────────
function openExampleModal(commentId) {
  $('exampleModal').classList.add('open');
}

function closeExampleModal() {
  $('exampleModal').classList.remove('open');
}

function attachExample(name) {
  closeExampleModal();
  showToast(`Example attached: ${name}`);
}

// ── Shot Technique ─────────────────────────────────────────────────────
function switchSubTab(tabId) {
  activeTechSubTab = tabId;
  $$('.sub-tab').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.subtab === tabId);
  });
  renderTechniqueItems();
}

function toggleTechniqueCheck(subId, label) {
  const items = MOCK.technique.items[subId];
  const item = items.find((i) => i.label === label);
  if (item) {
    item.checked = !item.checked;
    renderTechniqueItems();
    showToast(item.checked ? `✓ ${label}` : `Unchecked: ${label}`);
  }
}

function renderTechniqueItems() {
  const container = $('techniqueList');
  if (!container) return;
  const items = MOCK.technique.items[activeTechSubTab] || [];
  const sorted = [...items].sort((a, b) => a.checked - b.checked);

  container.innerHTML = sorted
    .map((item) => {
      const isChecked = item.checked;
      const dotClass = isChecked ? 'good' : 'needs-work';
      const statusClass = isChecked ? 'good' : 'needs-work';
      const statusText = isChecked ? 'Good' : 'Needs work';
      const checkClass = isChecked ? 'checked' : 'unchecked';
      const checkIcon = isChecked
        ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>'
        : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C7C7CC" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';

      return `
        <div class="technique-item">
          <div class="technique-item-left">
            <div class="technique-dot ${dotClass}"></div>
            <span class="technique-label">${item.label}</span>
          </div>
          <div class="technique-item-right">
            <span class="technique-status ${statusClass}">${statusText}</span>
            <button class="technique-checkbox ${checkClass}"
              onclick="toggleTechniqueCheck('${activeTechSubTab}', '${item.label.replace(/'/g, "\\'")}')"
            >${checkIcon}</button>
          </div>
        </div>
      `;
    })
    .join('');
}

// ── Comment Text Parsing (shot pills) ──────────────────────────────────
function parseCommentText(text) {
  return text.replace(
    /\[\[shot:([^\]]+)\]\]/g,
    '<span class="shot-pill">$1</span>'
  );
}

// ── Render Comments ────────────────────────────────────────────────────
function renderComments() {
  const container = $('commentsArea');
  if (!container) return;

  container.innerHTML = MOCK.comments
    .map((c) => {
      const tsLabel = c.loopEnd !== null
        ? `${fmt(c.timestamp)} <span class="ts-arrow">→</span> ${fmt(c.loopEnd)}`
        : fmt(c.timestamp);

      const framesHtml = c.frames
        .map(
          (f) => `
        <div class="frame-card" data-frame-id="${f.id}"
          onclick="event.stopPropagation(); viewFrame('${f.id}')">
          <div class="frame-card-header">
            <span class="frame-label-text">Frame Detail</span>
            <button class="view-frame-btn"
              onclick="event.stopPropagation(); viewFrame('${f.id}')">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="#8FB9A8"><polygon points="5,3 19,12 5,21"/></svg>
              VIEW FRAME
            </button>
            <div class="ctx-menu-wrapper" onclick="event.stopPropagation()">
              <button class="frame-card-more"
                onclick="toggleCtxMenu('ctxmenu-${f.id}', event)" aria-label="More">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="#8E8E93">
                  <circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/>
                </svg>
              </button>
              <div id="ctxmenu-${f.id}" class="ctx-menu">
                <button class="ctx-menu-item" onclick="showToast('Edit frame comment')">Edit</button>
                <div class="ctx-divider"></div>
                <button class="ctx-menu-item danger" onclick="showToast('Frame comment deleted')">Delete</button>
              </div>
            </div>
          </div>
          <div class="frame-card-text">${f.note}</div>
        </div>
      `
        )
        .join('');

      return `
      <div class="comment-item" id="comment-${c.id}"
        onclick="activateComment(${c.id}, ${c.timestamp})" role="button" tabindex="0">
        <div class="comment-header-row">
          <div class="comment-avatar">${c.initials}</div>
          <span class="comment-author">${c.author}</span>
          <div class="comment-actions-group" onclick="event.stopPropagation()">
            <button class="example-btn" onclick="openExampleModal(${c.id})">+example</button>
            <button class="timestamp-btn" onclick="activateComment(${c.id}, ${c.timestamp})">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="#8FB9A8"><polygon points="5,3 19,12 5,21"/></svg>
              ${tsLabel}
            </button>
            <div class="ctx-menu-wrapper">
              <button class="more-btn" onclick="toggleCtxMenu('ctxmenu-c${c.id}', event)" aria-label="More">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="#8E8E93">
                  <circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/>
                </svg>
              </button>
              <div id="ctxmenu-c${c.id}" class="ctx-menu">
                <button class="ctx-menu-item" onclick="doAddFrameComment(${c.id})">Add Frame Comment</button>
                <div class="ctx-divider"></div>
                <button class="ctx-menu-item" onclick="doEditComment(${c.id})">Edit</button>
                <div class="ctx-divider"></div>
                <button class="ctx-menu-item danger" onclick="doDeleteComment(${c.id})">Delete</button>
              </div>
            </div>
          </div>
        </div>
        <div class="comment-body">${parseCommentText(c.text)}</div>
        ${framesHtml}
      </div>
    `;
    })
    .join('');
}

// ── Render Progress Markers ────────────────────────────────────────────
function renderProgressMarkers() {
  const track = $('progressTrack');
  if (!track) return;
  MOCK.comments.forEach((c) => {
    const pct = (c.timestamp / DURATION) * 100;
    const marker = document.createElement('div');
    marker.className = 'progress-marker' + (c.loopEnd !== null ? ' double' : '');
    marker.style.left = pct + '%';
    marker.title = `Comment at ${fmt(c.timestamp)}`;
    marker.onclick = (e) => {
      e.stopPropagation();
      activateComment(c.id, c.timestamp);
    };
    track.appendChild(marker);
  });
}

// ── Composer ───────────────────────────────────────────────────────────
function handleComposerSend() {
  const input = $('composerInput');
  const text = input.value.trim();
  if (!text) return;

  const newId = MOCK.comments.length + 1;
  MOCK.comments.push({
    id: newId,
    author: 'bien-nguyen',
    initials: 'B',
    timestamp: Math.round(currentTime),
    loopEnd: null,
    text: text,
    frames: [],
  });

  input.value = '';
  renderComments();
  renderProgressMarkers();
  showToast(`Comment added at ${fmt(currentTime)}`);
  setTimeout(() => {
    const el = $('comment-' + newId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 100);
}

// ── Toast ──────────────────────────────────────────────────────────────
let toastTimeout = null;
function showToast(message) {
  closeMenus();
  const toast = $('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 2200);
}

// ── Keyboard ───────────────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  const tag = document.activeElement.tagName;
  if (['INPUT', 'TEXTAREA'].includes(tag)) return;

  if (e.key === 'Escape') {
    closeViewFrameModal();
    closeExampleModal();
    closeMenus();
  }
  if (e.key === ' ' && tag !== 'BUTTON') {
    e.preventDefault();
    togglePlay();
  }
  if (e.key === 'ArrowLeft') adjustTime(-1 / 30);
  if (e.key === 'ArrowRight') adjustTime(1 / 30);
  if (e.key === 'q' || e.key === 'Q') adjustTime(-1);
  if (e.key === 'w' || e.key === 'W') adjustTime(1);
  if (e.key === 'a' || e.key === 'A') adjustTime(-5);
  if (e.key === 's' || e.key === 'S') adjustTime(5);
  if (e.key === 'y' || e.key === 'Y') adjustTime(-10);
  if (e.key === 'x' || e.key === 'X') adjustTime(10);
});

// ── Init ───────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderComments();
  renderProgressMarkers();
  renderTechniqueItems();
  updateProgressUI();
  initDraggableAnnotation();

  $('composerInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleComposerSend();
    }
  });
});
