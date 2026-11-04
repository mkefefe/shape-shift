import {startWelcomeMusic} from './welcome-audio.js?v=494238';
import {prepareBootstrap} from './startup-loader.js?v=494238';
import {createPlaygamaPlatform} from './playgama-platform.mjs?v=494238';
import {readPersonalScores} from './playables-scores.mjs';
import {observeDeferredImages} from './deferred-images.js?v=494238';

const media = new Set(), playingMedia = new Set(), animations = new Set();
let platform;
function placeSaveNotice() {
  const panel = document.getElementById('platform-save-status');
  if (!panel) return;
  const host = [...document.querySelectorAll('dialog[open]')].at(-1) || document.body;
  if (panel.parentElement !== host) host.append(panel);
}
new MutationObserver(placeSaveNotice).observe(document.documentElement, {subtree: true, attributes: true, attributeFilter: ['open']});
function showSaveState({state, retryIn}) {
  let panel = document.getElementById('platform-save-status');
  if (state === 'saved') { panel?.remove(); return; }
  if (!panel && state !== 'retrying') return;
  if (!panel) {
    panel = document.createElement('aside'); panel.id = 'platform-save-status';
    panel.setAttribute('role', 'status'); panel.setAttribute('aria-live', 'polite');
    panel.style.cssText = 'position:fixed;left:50%;bottom:max(12px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:2147483646;width:max-content;max-width:calc(100% - 32px);box-sizing:border-box;display:flex;align-items:center;gap:12px;padding:10px 14px;border:1px solid #ffe192;border-radius:12px;background:#073b50f5;color:white;font:700 13px/1.4 system-ui,sans-serif;box-shadow:0 4px 14px #002a4066';
    const copy = document.createElement('span'); copy.dataset.saveCopy = '';
    const retry = document.createElement('button'); retry.type = 'button'; retry.textContent = 'Retry';
    retry.style.cssText = 'flex:none;border:1px solid #ffe192;border-radius:8px;padding:6px 10px;background:#ffd24a;color:#483700;font:700 13px system-ui,sans-serif';
    retry.onclick = () => platform.flush().catch(() => {});
    panel.append(copy, retry); document.body.append(panel);
  }
  panel.querySelector('[data-save-copy]').textContent = state === 'saving'
    ? 'Retrying save…' : `Progress not saved yet. Retrying in ${Math.ceil(retryIn / 1000)}s.`;
  panel.querySelector('button').disabled = state === 'saving';
  placeSaveNotice();
}
function notifyPlatformState(){window.dispatchEvent(new Event('shape-shift-platform-state'));}
function syncAudio() {
  window.gameAudio?.platformAudioChanged?.();
  for (const element of media) element.muted = !platform.audioAllowed;
  notifyPlatformState();
}
function pause() {
  notifyPlatformState();
  window.dispatchEvent(new Event('shape-shift-input-reset'));
  document.documentElement.classList.add('platform-paused');
  for (const animation of document.getAnimations()) {
    if (animation.playState === 'running') { animations.add(animation); animation.pause(); }
  }
  for (const element of media) {
    if (!element.paused) { playingMedia.add(element); element.pause(); }
  }
}
function resume() {
  notifyPlatformState();
  window.dispatchEvent(new Event('shape-shift-input-reset'));
  document.documentElement.classList.remove('platform-paused');
  for (const animation of animations) {
    try { if (animation.playState === 'paused') animation.play(); } catch {}
  }
  animations.clear();
  for (const element of playingMedia) element.play().catch(() => {});
  playingMedia.clear();
}
function showScores() {
  document.querySelector('#leaderboard-dialog h2').textContent = 'Your best scores';
  document.getElementById('leaderboard-status').textContent = 'Your personal best scores are saved with your progress.';
  document.getElementById('leaderboard-reload').hidden = true;
  const globalFooter = document.getElementById('leaderboard-personal');
  if (globalFooter) globalFooter.hidden = true;
  const rows = document.getElementById('leaderboard-rows'); rows.replaceChildren();
  for (const [name, score] of readPersonalScores(platform.storage)) {
    const row = document.createElement('div'); row.className = 'personal-score-row';row.style.marginBottom='10px';
    const label = document.createElement('span'); label.textContent = name;
    const value = document.createElement('strong'); value.textContent = score.toLocaleString();
    row.append(label, value); rows.append(row);
  }
}
async function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script'); script.src = src;
    script.onload = resolve; script.onerror = reject; document.head.append(script);
  });
}
async function start() {
  const cover = document.getElementById('startup-ready');
  try {
    // Start required art while Bridge and cloud progress initialize. This job
    // never announces game readiness or creates a saved-game fallback.
    const artwork = prepareBootstrap({loadAudio:()=>loadScript('audio.js?v=494238')});
    artwork.catch(()=>{}); // The awaited barrier below reports any failure.
    // index.html creates this promise before loading game-frame.html. Never initialize
    // a second SDK here: a nested frame loses the portal's launch parameters.
    const ready = window.parent.ShapeShiftBridgeReady;
    if (!ready || typeof ready.then !== 'function') throw Error('Open the game from index.html?v=494238');
    const bridge = await ready;
    window.ShapeShiftTelemetryBridge=bridge;bridge.gameVersion="4.94.238";
    platform = window.ShapeShiftPlatform = createPlaygamaPlatform({
      bridge, host: window,
      isInteractive: () => cover.hidden && !document.getElementById('app').inert &&
        !document.documentElement.classList.contains('startup-loading'),
      beforePause: () => window.dispatchEvent(new Event('playables-save')),
      onPause: pause, onResume: resume, onAudio: syncAudio, showScores, onSaveState: showSaveState,
      onReady() {
        document.documentElement.dataset.playablesReady = 'true';
        if (parent !== window) parent.postMessage('shape-shift-ready', location.origin);
      },
      report: error => console.warn('Game platform request failed', error)
    });
    platform.registerMedia = element => {
      media.add(element); element.muted = !platform.audioAllowed;
      return () => { media.delete(element); playingMedia.delete(element); };
    };
    window.ShapeShiftAds = platform.supportsRewarded ? {
      setBannerVisible() {}, setAudience() {},
      cancelRewarded: () => platform.cancelRewarded(),
      showRewarded: placement => platform.requestReward(placement)
    } : undefined;
    document.getElementById('coins-ad-open').hidden = !platform.supportsRewarded;
    platform.syncInitialState();
    platform.setPauseReason('visibility', document.hidden);
    const syncPlatformState = () => {
      platform.setPauseReason('visibility', document.hidden);
      // Let Bridge finish its own focus/visibility handler before reconciling.
      Promise.resolve().then(() => platform.syncHostState());
    };
    document.addEventListener('visibilitychange', syncPlatformState);
    window.addEventListener('focus', syncPlatformState);
    window.addEventListener('pageshow', syncPlatformState);
    window.addEventListener('pagehide', () => {
      window.dispatchEvent(new Event('playables-save')); platform.flush().catch(() => {});
    });
    for (const type of ['pointerdown','pointerup','pointermove','click','keydown','keyup','touchstart','touchmove','touchend']) {
      document.addEventListener(type, event => {
        if (document.documentElement.classList.contains('startup-loading') && !event.target.closest?.('#startup-ready')) {
          if (event.cancelable) event.preventDefault(); event.stopImmediatePropagation(); return;
        }
        if (event.target.closest?.('#startup-ready,#platform-save-status')) return;
        if (!platform.paused) return;
        if (platform.adLoading && event.target.closest?.('.continue-finish,#coins-ad-close')) return;
        if (event.cancelable) event.preventDefault(); event.stopImmediatePropagation();
      }, {capture: true, passive: false});
    }
    await Promise.all([platform.initialize(), artwork]);
    observeDeferredImages();
    bindDesktopScroll();
    startWelcomeMusic();
    await import('./game.js?v=494238');
    const scoresButton = document.getElementById('leaderboard-open');
    scoresButton.setAttribute('aria-label', 'Global leaderboard'); scoresButton.title = 'Global leaderboard';
    document.getElementById('privacy-options').hidden = true;
    document.querySelector('#coin-help-dialog p').textContent = 'Play games and collect task and achievement rewards to earn coins. You can also choose to watch a video for extra coins.';
  } catch (error) {
    console.error('Unable to prepare game', error);
    cover.querySelector('p').textContent = 'Could not load the game and your progress. Please try again.';
    const retry = cover.querySelector('button'); retry.hidden = false;
    retry.onclick = () => { window.parent.location.reload(); };
  }
}

// Mouse/pen dragging complements native touch and trackpad scrolling.
function bindDesktopScroll() {
  let drag = null, blockClick = false;
  const clear = () => {
    const old = drag; drag = null;
    if (old) {
      old.scroller.classList.remove('desktop-dragging');
      if (old.scroller.hasPointerCapture?.(old.id)) old.scroller.releasePointerCapture(old.id);
    }
  };
  document.addEventListener('pointerdown', event => {
    clear(); blockClick = false;
    if (event.pointerType === 'touch' || event.button !== 0 || event.isPrimary === false || platform.paused) return;
    const target = event.target;
    if (!(target instanceof Element) || target.closest('input,select,textarea,[contenteditable],.map-header')) return;
    if (!target.closest('#adventure-map,dialog[open]')) return;
    for (let node = target; node && node !== document.body; node = node.parentElement) {
      if (/^(auto|scroll)$/.test(getComputedStyle(node).overflowY) && node.scrollHeight > node.clientHeight + 2) {
        drag = {id: event.pointerId, scroller: node, x: event.clientX, y: event.clientY, top: node.scrollTop, moved: false}; break;
      }
    }
  }, {capture: true, passive: true});
  document.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    const dy = event.clientY - drag.y, dx = event.clientX - drag.x;
    if (!drag.moved) {
      if (Math.abs(dy) < 10) return;
      if (Math.abs(dx) > Math.abs(dy)) { clear(); return; }
      drag.moved = true; blockClick = true; drag.scroller.classList.add('desktop-dragging');
      try { drag.scroller.setPointerCapture(event.pointerId); } catch {}
    }
    drag.scroller.scrollTop = drag.top - dy;
    if (event.cancelable) event.preventDefault();
  }, {capture: true, passive: false});
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'])
    document.addEventListener(type, event => { if (drag?.id === event.pointerId) clear(); }, true);
  document.addEventListener('click', event => {
    if (blockClick && event.detail !== 0) { blockClick = false; event.preventDefault(); event.stopImmediatePropagation(); }
  }, true);
  const reset = () => { clear(); blockClick = false; };
  window.addEventListener('blur', reset);
  window.addEventListener('shape-shift-input-reset', reset);
}
start();
