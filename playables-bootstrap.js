import {prepareOpeningScreen} from './startup-loader.js?v=494118';
import {createSaveStore, createScheduler, requestPlatformReward} from './playables-core.mjs?v=49499';
import {initialAudioEnabled, createScoreReporter, renderPersonalScores} from './playables-scores.mjs?v=49499';
import {observeDeferredImages} from './deferred-images.js?v=49499';

const sdk = window.ytgame;
const live = Boolean(sdk?.IN_PLAYABLES_ENV);
const scheduler = createScheduler(window);
const media = new Set(), playingMedia = new Set(), animations = new Set();
let audioEnabled = initialAudioEnabled(sdk);
document.documentElement.classList.toggle('browser-preview', !live);
let saveTimer, announced = false;
const warn = () => sdk?.health?.logWarning?.();
const store = createSaveStore({
  load: () => live ? sdk.game.loadData() : Promise.resolve(localStorage.getItem('shape-shift-playables-preview-v1') || ''),
  save: data => live ? sdk.game.saveData(data) : Promise.resolve(localStorage.setItem('shape-shift-playables-preview-v1', data)),
  changed() {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => store.flush().then(reportScore).catch(warn), 300);
  },
  report: warn
});
const reportScore = createScoreReporter(sdk, store.storage);
const platform = window.ShapeShiftPlatform = {
  ...scheduler,
  get paused() { return scheduler.paused; },
  get audioAllowed() { return audioEnabled && !scheduler.paused; },
  storage: store.storage, language: 'en',
  live, showScores: () => renderPersonalScores(document, store.storage, live),
  requestReward: () => Promise.resolve('unsupported'),
  registerMedia(element) {
    media.add(element); element.muted = !platform.audioAllowed;
    return () => { media.delete(element); playingMedia.delete(element); };
  },
  ready() {
    if (announced) return;
    announced = true;
    sdk?.game?.gameReady?.();
    document.documentElement.dataset.playablesReady = 'true';
    if(parent!==window)parent.postMessage('shape-shift-ready',location.origin);
    reportScore().catch(warn);
  },
  flush: () => store.flush()
};
function syncAudio() {
  window.gameAudio?.platformAudioChanged?.();
  for (const element of media) element.muted = !platform.audioAllowed;
}
function pause() {
  if (scheduler.paused) return;
  window.dispatchEvent(new Event('playables-save'));
  window.clearTimeout(saveTimer);
  store.flush().catch(warn);
  scheduler.pause();
  document.documentElement.classList.add('platform-paused');
  for (const animation of document.getAnimations()) {
    if (animation.playState === 'running') { animations.add(animation); animation.pause(); }
  }
  for (const element of media) {
    if (!element.paused) { playingMedia.add(element); element.pause(); }
  }
  syncAudio();
}
function resume() {
  if (!scheduler.paused) return;
  scheduler.resume();
  document.documentElement.classList.remove('platform-paused');
  for (const animation of animations) animation.play();
  animations.clear();
  syncAudio();
  for (const element of playingMedia) element.play().catch(() => {});
  playingMedia.clear();
  if (store.dirty) store.flush().catch(warn);
}
if (live) {
  sdk.system.onPause(pause);
  sdk.system.onResume(resume);
  sdk.system.onAudioEnabledChange(enabled => { audioEnabled = enabled; syncAudio(); });
} else {
  document.addEventListener('visibilitychange', () => document.hidden ? pause() : resume());
}
for (const type of ['pointerdown','pointerup','pointermove','click','keydown','keyup','touchstart','touchmove','touchend']) {
  document.addEventListener(type, event => {
    if (document.documentElement.classList.contains('startup-loading') && !event.target.closest?.('#startup-ready')) {
      if (event.cancelable) event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if (scheduler.paused && event.key !== 'Escape') {
      event.preventDefault(); event.stopImmediatePropagation();
    }
  }, {capture: true, passive: false});
}
// Advertising is exclusive to the native Android edition.
window.ShapeShiftAds = undefined;
sdk?.game?.firstFrameReady?.();
async function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src; script.onload = resolve; script.onerror = reject; document.head.append(script);
  });
}
async function start() {
  const cover = document.getElementById('startup-ready');
  try {
    await store.initialize();
    observeDeferredImages();
    platform.language = (await sdk?.system?.getLanguage?.().catch(() => 'en')) || 'en';
    await loadScript('audio.js?v=494115');
  await prepareOpeningScreen();
    await import('./game.js?v=494124');
    const scoresButton=document.getElementById('leaderboard-open');
    scoresButton.setAttribute('aria-label','Global leaderboard');
    scoresButton.title='Global leaderboard';
    if (!live) document.querySelector('#coin-help-dialog p').textContent='Play games and collect quest and achievement rewards to earn coins.';
  } catch (error) {
    console.error('Unable to load saved game', error);
    warn(); cover.querySelector('p').textContent = 'Could not load your progress. Please try again.';
    const retry = cover.querySelector('button'); retry.hidden = false; retry.onclick = () => location.reload();
  }
}
// Desktop browsers do not translate a mouse drag into native touch scrolling.
// Keep native finger scrolling, while giving mouse/pen users the same grab gesture.
function bindDesktopScroll() {
  let drag=null,blockClick=false;
  const clear=()=>{
    const old=drag;drag=null;
    if(old){old.scroller.classList.remove('desktop-dragging');
      if(old.scroller.hasPointerCapture?.(old.id))old.scroller.releasePointerCapture(old.id);}
  };
  document.addEventListener('pointerdown',event=>{
    clear();blockClick=false;
    if(event.pointerType==='touch'||event.button!==0||event.isPrimary===false||platform.paused)return;
    const target=event.target;
    if(!(target instanceof Element)||target.closest('input,select,textarea,[contenteditable],.map-header'))return;
    if(!target.closest('#adventure-map,dialog[open]'))return;
    for(let node=target;node&&node!==document.body;node=node.parentElement){
      if(/^(auto|scroll)$/.test(getComputedStyle(node).overflowY)&&node.scrollHeight>node.clientHeight+2){
        drag={id:event.pointerId,scroller:node,x:event.clientX,y:event.clientY,top:node.scrollTop,moved:false};break;
      }
    }
  },{capture:true,passive:true});
  document.addEventListener('pointermove',event=>{
    if(!drag||drag.id!==event.pointerId)return;
    const dy=event.clientY-drag.y,dx=event.clientX-drag.x;
    if(!drag.moved){
      if(Math.abs(dy)<10)return;
      if(Math.abs(dx)>Math.abs(dy)){clear();return;}
      drag.moved=true;blockClick=true;
      drag.scroller.classList.add('desktop-dragging');
      try{drag.scroller.setPointerCapture(event.pointerId);}catch{}
    }
    drag.scroller.scrollTop=drag.top-dy;
    if(event.cancelable)event.preventDefault();
  },{capture:true,passive:false});
  document.addEventListener('pointerup',event=>{if(drag?.id===event.pointerId)clear();},true);
  document.addEventListener('pointercancel',event=>{if(drag?.id===event.pointerId)clear();},true);
  document.addEventListener('lostpointercapture',event=>{if(drag?.id===event.pointerId)clear();},true);
  document.addEventListener('click',event=>{
    if(blockClick&&event.detail!==0){blockClick=false;event.preventDefault();event.stopImmediatePropagation();}
  },true);
  window.addEventListener('blur',clear);
}
bindDesktopScroll();
start();



