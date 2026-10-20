import {loadStoryAssets, drawStory, STORY_SCENES} from './story-renderer.js';

const ASSET_BASE = new URL('./assets/story-beacon/', import.meta.url);
const MAX_LOAD_MS = 5000;
const DRAW_INTERVAL_MS = 1000 / 30;
let activeScene = null;

/**
 * Play one self-contained story chapter above the existing game UI.
 * The caller owns pausing the game, music and banner; this player owns only its
 * canvas, soundtrack and controls. A failed load never claims a chapter seen.
 * @returns {Promise<{completed:boolean, skipped:boolean, failed?:boolean}> & {cancel:Function}}
 */
export function showStoryScene({scene, document = globalThis.document, reduced = false, volume = 1, effectsVolume = volume, done} = {}, renderer = {}) {
  if(Array.isArray(scene))return showStorySequence({scenes:scene,document,reduced,volume,effectsVolume,done},renderer);
  let resolve;
  const result = new Promise(finish => { resolve = finish; });
  let settled = false, dialog, audio, frame, loadTimer, assets, context, soundButton, soundURL, soundRequest;
  let started = false, ended = false;
  let ready = false, nativePaused = false, lastTime = null, lastDrawTime = null, elapsed = 0;
  let audioPending = false, audioBlocked = false, metadataReady = false, soundStarted = false;
  const listeners = [];
  const cues=[];
  function playCues(){
    for(const cue of cues){
      if(cue.fired || elapsed<cue.at)continue;
      cue.fired=true;
      cue.media.play().catch(()=>{});
    }
  }
  const config = (renderer.scenes || STORY_SCENES)[scene];
  const loadAssets = renderer.load || loadStoryAssets;
  const draw = renderer.draw || drawStory;
  const view = document?.defaultView || globalThis;
  const previousFocus = document?.activeElement;
  const requestFrame = window.ShapeShiftPlatform.requestAnimationFrame?.bind(view);
  const cancelFrame = window.ShapeShiftPlatform.cancelAnimationFrame?.bind(view);
  const duration = Number(config?.duration);
  const offset = Math.max(0, Number(config?.audioOffset) || 0);
  const now = () => window.ShapeShiftPlatform.now() ?? Date.now();
  const isVisible = () => !window.ShapeShiftPlatform.paused && !nativePaused;
  const listen = (target, type, handler, options) => {
    target?.addEventListener?.(type, handler, options);
    listeners.push(() => target?.removeEventListener?.(type, handler, options));
  };

  function finish(state) {
    if (settled) return;
    settled = true;
    if (loadTimer) window.ShapeShiftPlatform.clearTimeout(loadTimer);
    soundRequest?.abort();
    for(const cue of cues){cue.media.pause();cue.media.removeAttribute('src');cue.media.load();}
    if (frame != null) cancelFrame?.(frame);
    for (const unlisten of listeners) unlisten();
    if (audio) {
      try { audio.pause(); audio.removeAttribute('src'); audio.load(); } catch {}
    }
    if (soundURL) { view.URL.revokeObjectURL(soundURL); soundURL = null; }
    try { if (dialog?.open) dialog.close(); } catch {}
    dialog?.remove();
    if (activeScene === result) activeScene = null;
    try { if (previousFocus?.isConnected) previousFocus.focus({preventScroll: true}); } catch {}
    resolve(state);
    try { done?.(state); } catch {}
  }
  result.cancel = () => finish({completed: false, skipped: true});

  if (!document?.body || !config || !(duration > 0) || !requestFrame) {
    finish({completed: false, skipped: false, failed: true});
    return result;
  }
  // A repeated launch must not leave an invisible earlier dialog consuming taps.
  activeScene?.cancel();
  activeScene = result;

  function alignSound() {
    if (!audio || !metadataReady) return;
    const target = offset + elapsed;
    if (!Number.isFinite(audio.currentTime) || Math.abs(audio.currentTime - target) > .25) {
      try { audio.currentTime = target; } catch {}
    }
  }
  function playSound() {
    if (!started || ended || !audio || !ready || !isVisible() || settled || audioPending || audioBlocked) return;
    alignSound();
    if (!audio.paused) return;
    audioPending = true;
    try {
      Promise.resolve(audio.play()).then(() => {
        if (settled) return;
        soundStarted = true;
        lastTime = null;
        soundButton.hidden = true;
      }).catch(() => {
        if (settled) return;
        audioBlocked = true;
        pauseSound();
        soundButton.hidden = false;
        soundButton.focus({preventScroll: true});
      }).finally(() => {
        audioPending = false;
        // A play promise can resolve after the user has skipped or hidden the app.
        if (settled || !isVisible()) { try { audio.pause(); } catch {} }
      });
    } catch { audioPending = false; audioBlocked = true; soundButton.hidden = false; }
  }
  function pauseSound() { try { audio?.pause(); } catch {} }
  function syncVisibility() {
    lastTime = null;
    lastDrawTime = null;
    if (isVisible()) playSound(); else pauseSound();
  }
  function tick(timestamp) {
    if (settled) return;
    if (!started || ended) { frame = requestFrame(tick); return; }
    if (isVisible()) {
      // Ignore background time and cap long foreground frames to avoid jumping
      // straight past the action after a WebView stall.
      const soundReady = !audio || (soundStarted && !audioPending && !audioBlocked);
      if (soundReady && lastTime != null) elapsed += Math.max(0, Math.min(.1, (timestamp - lastTime) / 1000));
      lastTime = soundReady ? timestamp : null;
      // Keep input, the clock and audio on RAF, but do not repaint this 30 fps
      // film 90/120 times a second on high-refresh phones. Carry the fractional
      // interval so 60/90/120/144 Hz displays all retain the intended cadence.
      const intervals = lastDrawTime == null ? 1 : Math.floor((timestamp - lastDrawTime + .001) / DRAW_INTERVAL_MS);
      if (intervals >= 1 || elapsed >= duration) {
        lastDrawTime = lastDrawTime == null ? timestamp : lastDrawTime + intervals * DRAW_INTERVAL_MS;
        try { draw(context, assets, scene, Math.min(duration, elapsed), {reduced}); }
        catch { finish({completed: false, skipped: false, failed: true}); return; }
      }
      alignSound();
      playCues();
      if (elapsed >= duration) {
        ended = true; pauseSound(); dialog.dataset.stage='complete';
        soundButton.textContent='Tap to continue'; soundButton.hidden=false;
        soundButton.focus({preventScroll:true});
      }
    } else {
      lastTime = null;
      lastDrawTime = null;
    }
    frame = requestFrame(tick);
  }

  try {
    reduced = Boolean(reduced || view.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
    dialog = document.createElement('dialog');
    dialog.id = 'story-scene';
    dialog.className = 'story-scene';
    dialog.dataset.scene = scene;
    dialog.setAttribute('aria-label', config.title || 'Color Beacon story');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('role', 'dialog');
    const canvas = document.createElement('canvas');
    canvas.className = 'story-scene-canvas';
    canvas.width = 720;
    canvas.height = 1280;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', config.description || config.title || 'Collect matching shapes to bring color back to your island.');
    context = canvas.getContext('2d', {alpha: false});
    if (!context) throw new Error('Canvas is unavailable');
    soundButton = document.createElement('button');
    soundButton.type='button'; soundButton.className='story-scene-sound';
    soundButton.textContent='Loading…'; soundButton.disabled=true;
    dialog.append(canvas,soundButton);
    function advance(event) {
      event.preventDefault(); event.stopPropagation();
      if(!ready)return;
      if(ended){finish({completed:true,skipped:false,returnToMap:true});return;}
      if(started&&!audioBlocked)return;
      started=true; lastTime=null; audioBlocked=false;
      dialog.dataset.stage='revealing';soundButton.hidden=true;playSound();
    }
    listen(soundButton,'click',advance);
    listen(dialog,'click',advance);
    listen(dialog, 'cancel', event => { event.preventDefault(); event.stopPropagation(); result.cancel(); });
    listen(dialog, 'close', result.cancel);
    listen(dialog, 'contextmenu', event => event.preventDefault());
    // Keep gesture handlers belonging to the underlying board out of this scene.
    for (const event of ['pointerdown', 'pointermove', 'pointerup', 'touchstart', 'touchmove', 'touchend']) {
      listen(dialog, event, event => event.stopPropagation(), {passive: true});
    }
    listen(dialog, 'keydown', event => {
      if (event.key === 'Escape') { event.stopPropagation(); result.cancel(); }
      else if (event.key === 'Tab') {
        event.preventDefault();
        soundButton.focus({preventScroll: true});
      }
    });
    listen(document, 'unused-visibilitychange', syncVisibility);
    listen(view, 'unused-androidpause', () => { nativePaused = true; syncVisibility(); });
    listen(view, 'unused-androidresume', () => { nativePaused = false; syncVisibility(); });
    listen(view, 'unused-pagehide', () => { nativePaused = true; syncVisibility(); });
    listen(view, 'unused-pageshow', () => { nativePaused = false; syncVisibility(); });
    document.body.append(dialog);
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    soundButton.focus({preventScroll: true});

    const outputVolume = Math.max(0, Math.min(1, Number(volume) || 0));
    const effectLevel=Math.max(0,Math.min(1,Number(effectsVolume)||0));
    if(scene!=='credits' && effectLevel>0){
      const hit=scene==='intro'?3.2:scene==='ending'?1.3:.7;
      for(const [at,name,gain] of [[hit,'transform',.6],[hit+.9,'spark0',.7]]){
        const media=document.createElement('audio');media.hidden=true;media.preload='auto';
        media.dataset.storyCue=name;media.volume=effectLevel*gain;
        media.src=new URL('assets/audio/victory-'+name+'-v4947.ogg',import.meta.url).href;
        listeners.push(window.ShapeShiftPlatform.registerMedia(media));
        dialog.append(media);cues.push({at,media,fired:false});
      }
    }
    let soundLoaded = Promise.resolve();
    if (config.audio && outputVolume > 0) {
      audio = document.createElement('audio');
      listeners.push(window.ShapeShiftPlatform.registerMedia(audio));
      audio.preload = 'auto';
      audio.volume = outputVolume;
      audio.setAttribute('playsinline', '');
      listen(audio, 'loadedmetadata', () => {
        metadataReady = true;
        // Credits reuse the ending score at its credit roll, never from its start.
        try { audio.currentTime = offset + elapsed; } catch {}
        playSound();
      });
      listen(audio, 'canplay', playSound);
      listen(audio, 'error', () => finish({completed: false, skipped: false, failed: true}));
      const url = new URL(config.audio, ASSET_BASE).href;
      const attachSound = src => {
        if (settled) return;
        audio.src = src;
        audio.load();
        if (audio.readyState >= 1) {
          metadataReady = true;
          try { audio.currentTime = offset; } catch {}
        }
      };
      // Native bundled assets do not implement HTTP byte-range streaming.
      // Load the whole short cue into a Blob before handing it to the media player.
      if (view.fetch && view.URL?.createObjectURL) {
        soundRequest = new view.AbortController();
        soundLoaded = view.fetch(url, {signal: soundRequest.signal}).then(response => {
          if (!response.ok) throw Error('Story soundtrack unavailable');
          return response.blob();
        }).then(blob => {
          if (settled) return;
          soundURL = view.URL.createObjectURL(blob);
          attachSound(soundURL);
        });
      } else attachSound(url);
    }

    loadTimer = window.ShapeShiftPlatform.setTimeout(() => finish({completed: false, skipped: false, failed: true}), MAX_LOAD_MS);
    Promise.all([loadAssets(), soundLoaded]).then(([loaded]) => {
      if (settled) return;
      window.ShapeShiftPlatform.clearTimeout(loadTimer);
      loadTimer = null;
      assets = loaded;
      try { draw(context, assets, scene, .6, {reduced}); }
      catch { finish({completed: false, skipped: false, failed: true}); return; }
      ready = true;
      dialog.dataset.ready = 'true';
      dialog.dataset.stage='waiting'; soundButton.textContent='Tap to reveal'; soundButton.disabled=false; soundButton.hidden=false;
      lastTime = isVisible() ? now() : null;
      lastDrawTime = lastTime;
      playSound();
      frame = requestFrame(tick);
    }).catch(() => finish({completed: false, skipped: false, failed: true}));
  } catch {
    finish({completed: false, skipped: false, failed: true});
  }
  return result;
}

// Keep one full-screen presentation and one game-audio pause across all unlocked
// chapters. Each chapter retains its authored soundtrack and fade transitions.
function showStorySequence({scenes,document,reduced,volume,effectsVolume,done},renderer){
 let current,cancelled=false;
 const curtain=document.createElement('div');curtain.className='story-sequence-curtain';
 curtain.setAttribute('aria-hidden','true');document.body.append(curtain);
 const result=(async()=>{
  let outcome={completed:false,skipped:false};
  try{
   for(const scene of scenes){
    if(cancelled)return {completed:false,skipped:true};
    current=showStoryScene({scene,document,reduced,volume,effectsVolume},renderer);
    outcome=await current;
    if(!outcome.completed||outcome.returnToMap)return outcome;
   }
   return outcome;
  }finally{current=null;curtain.remove();}
 })();
 result.cancel=()=>{cancelled=true;current?.cancel?.();};
 result.then(state=>{try{done?.(state);}catch{}});
 return result;
}
