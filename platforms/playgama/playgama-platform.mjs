import {createSaveStore, createScheduler, REWARDS} from './playables-core.mjs';

// Playgama-only monetization. GitHub and native builds use separate adapters.
const ADS_ENABLED = true;

export const SAVE_KEY = 'shape-shift-progress-v1';

// Bridge is initialized once by the outer page so portal launch parameters survive.
export function createPlaygamaPlatform({bridge, host, isInteractive = () => true,
  beforePause = () => {}, onPause = () => {}, onResume = () => {}, onAudio = () => {},
  onReady = () => {}, showScores = () => {}, onSaveState = () => {}, report = () => {}}) {
  const scheduler = createScheduler(host);
  const reasons = new Set();
  let audioEnabled = bridge.platform.isAudioEnabled !== false;
  let saveTimer, savePending = null, saveFailures = 0, initialized = false, readyRequested = false, announced = false;
  let retryAdAfter = 0;
  let ad = null, playing = false, levelStarted = false, levelDetails = {}, lastInterstitial = host.performance.now();
  const message = (name, details) => {
    try { Promise.resolve(bridge.platform.sendMessage(name, details)).catch(report); } catch (error) { report(error); }
  };
  function bounded(promise, label, delay = 20000) {
    let timer;
    return Promise.race([Promise.resolve(promise), new Promise((_, reject) => {
      timer = host.setTimeout(() => reject(Error(label)), delay);
    })]).finally(() => host.clearTimeout(timer));
  }
  const store = createSaveStore({
    async load() {
      const values = await bounded(bridge.storage.get([SAVE_KEY]), 'Progress download timed out');
      if (!Array.isArray(values) || values.length !== 1) throw Error('Invalid progress response');
      const value = values[0];
      if (value == null) return '';
      if (typeof value === 'string') return value;
      // Bridge may parse JSON on read. Normalize the representation only; the
      // save store still validates version, keys and string values before use.
      if (typeof value === 'object' && !Array.isArray(value)) return JSON.stringify(value);
      throw Error('Invalid progress response');
    },
    save: value => bounded(bridge.storage.set([SAVE_KEY], [value]), 'Progress save timed out'),
    changed() {
      // New gameplay changes join a pending retry instead of defeating its backoff.
      if (saveFailures && saveTimer != null) return;
      scheduleSave(300);
    }, report
  });
  function scheduleSave(delay) {
    host.clearTimeout(saveTimer);
    saveTimer = host.setTimeout(() => { saveTimer = null; flushSave().catch(() => {}); }, delay);
  }
  function saveState(state, retryIn = 0) {
    try { onSaveState({state, retryIn, failures: saveFailures}); } catch (error) { report(error); }
  }
  function flushSave() {
    if (!initialized) return store.flush(); // Never turn a failed load into a new save.
    if (savePending) return savePending;
    host.clearTimeout(saveTimer); saveTimer = null;
    if (!store.dirty) return Promise.resolve();
    saveState('saving');
    savePending = store.flush().then(() => {
      saveFailures = 0; saveState('saved');
    }).catch(error => {
      saveFailures++;
      const retryIn = [1000, 2500, 5000, 10000, 30000][Math.min(saveFailures - 1, 4)];
      saveState('retrying', retryIn); scheduleSave(retryIn);
      throw error;
    }).finally(() => { savePending = null; });
    return savePending;
  }
  function setPauseReason(reason, paused) {
    if (paused) reasons.add(reason); else reasons.delete(reason);
    const next = reasons.size > 0;
    if (next === scheduler.paused) return;
    if (next) {
      beforePause();
      host.clearTimeout(saveTimer);
      if (initialized) flushSave().catch(() => {});
      scheduler.pause(); onPause();
      if (playing && announced) message('level_paused', levelDetails);
    } else {
      scheduler.resume(); onResume();
      if (initialized && store.dirty) flushSave().catch(() => {});
      if (playing && announced) message('level_resumed', levelDetails);
    }
    onAudio();
  }
  function clearAd(record) {
    if (ad !== record) return;
    host.clearTimeout(record.timer);
    ad = null;
    // A close must never override an independent host or visibility pause.
    if (bridge.platform.isPaused === true) setPauseReason('host', true);
    setPauseReason('ad', false);
    // Bridge emits the terminal ad event before updating its aggregate pause
    // and audio getters. Read them after that event stack has finished: reading
    // only here can retain the ad's old host pause and block every input.
    Promise.resolve().then(syncHostState).catch(report);
  }
  function syncHostState() {
    // Older adapters may expose events without getters. Preserve their most
    // recent event state rather than interpreting an absent getter as resumed.
    if (typeof bridge.platform.isPaused === 'boolean')
      setPauseReason('host', bridge.platform.isPaused);
    if (typeof bridge.platform.isAudioEnabled === 'boolean') {
      audioEnabled = bridge.platform.isAudioEnabled;
      onAudio();
    }
  }
  function adState(kind, state) {
    const record = ad;
    if (!record || record.kind !== kind) return;
    if (state === 'loading') return;
    if (state === 'opened') {
      record.opened = true; host.clearTimeout(record.timer);
      record.timer = host.setTimeout(() => { if (ad !== record) return; record.resolve(record.rewarded && !record.cancelled ? 'rewarded' : 'unavailable'); clearAd(record); }, 180000);
      setPauseReason('ad', true); return;
    }
    if (state === 'rewarded' && kind === 'rewarded') {
      record.rewarded = true;
      // Deliver only after close, so gameplay cannot resume beneath an ad.
      lastInterstitial = host.performance.now();
      return; // Keep the ad lock and mute until the overlay actually closes.
    }
    if (state === 'closed' || state === 'failed') {
      if (state === 'failed') retryAdAfter = host.performance.now() + 30000;
      record.resolve(record.cancelled ? 'dismissed' : kind === 'rewarded'
        ? record.rewarded ? 'rewarded' : state === 'closed' ? 'dismissed' : 'unavailable'
        : state === 'closed' ? 'closed' : 'unavailable');
      clearAd(record);
    }
  }
  function requestAd(kind, placement) {
    if (!ADS_ENABLED) return Promise.resolve('unsupported');
    const supported = kind === 'rewarded' ? bridge.advertisement.isRewardedSupported : bridge.advertisement.isInterstitialSupported;
    if (!supported || ad || scheduler.paused || host.performance.now() < retryAdAfter) return Promise.resolve('unavailable');
    return new Promise(resolve => {
      const record = ad = {kind, resolve, rewarded: false, cancelled: false, opened: false};
      setPauseReason('ad', true);
      record.timer = host.setTimeout(() => {
        if (ad !== record) return;
        retryAdAfter = host.performance.now() + 30000;
        record.resolve(record.rewarded && !record.cancelled ? 'rewarded' : 'unavailable');
        clearAd(record);
      }, 12000);
      try {
        const result = kind === 'rewarded' ? bridge.advertisement.showRewarded(placement) : bridge.advertisement.showInterstitial(placement);
        // Current Bridge uses events. Catch rejected promises as well if a platform provides one.
        Promise.resolve(result).catch(error => { report(error); if (ad === record) adState(kind, 'failed'); });
      } catch (error) { report(error); if (ad === record) adState(kind, 'failed'); }
    });
  }
  const platform = {
    ...scheduler,
    get paused() { return scheduler.paused; },
    get audioAllowed() { return audioEnabled && !scheduler.paused; },
    get supportsRewarded() { return ADS_ENABLED && Boolean(bridge.advertisement.isRewardedSupported) && host.performance.now() >= retryAdAfter; },
    get supportsInterstitial() { return ADS_ENABLED && Boolean(bridge.advertisement.isInterstitialSupported); },
    get adActive() { return ad !== null; },
    get adLoading() { return ad !== null && !ad.opened; },
    get readyAnnounced() { return announced; },
    storage: store.storage, live: true, playgama: true, cloudRankings: true,
    language: bridge.platform.language || 'en', locale: bridge.platform.language || 'en', showScores,
    initialize: async () => { await store.initialize(); initialized = true; },
    flush: flushSave,
    setPauseReason,
    syncHostState,
    ready() {
      if (readyRequested) return readyRequested;
      // Readiness belongs to startup, not the paused gameplay scheduler. Portal
      // loaders may hold focus/visibility until this message arrives.
      readyRequested = new Promise(resolve => {
        let rendered = false;
        async function check() {
          if (!initialized || !isInteractive()) rendered = false;
          else if (rendered) {
            try {
              await bridge.platform.sendMessage('game_ready');
            } catch (error) {
              report(error);
              host.setTimeout(check, 500);
              return;
            }
            announced = true;
            try { onReady(); } catch (error) { report(error); }
            if (playing) { levelStarted = true; message('level_started', levelDetails); }
            resolve();
            return;
          } else rendered = true;
          host.setTimeout(check, 50);
        }
        host.setTimeout(check, 0);
      });
      return readyRequested;
    },
    gameplay(active, details = {}) {
      const next = Boolean(active);
      if (next === playing) return;
      playing = next;
      if (next) levelDetails = details;
      if (announced) {
        message(next ? levelStarted ? 'level_resumed' : 'level_started' : 'level_paused', levelDetails);
        if (next) levelStarted = true;
      }
    },
    levelComplete(success = true, details = levelDetails) {
      playing = false; levelStarted = false;
      if (announced) message(success ? 'level_completed' : 'level_failed', details);
      if (initialized) flushSave().catch(() => {});
    },
    requestReward(placement = 'default') {
      if (!Object.hasOwn(REWARDS, placement)) return Promise.resolve('failed');
      return requestAd('rewarded', placement);
    },
    cancelRewarded() {
      if (!ad || ad.kind !== 'rewarded') return;
      const record = ad; record.cancelled = true; record.resolve('dismissed');
      if (!record.opened) { retryAdAfter = host.performance.now() + 30000; clearAd(record); }
    },
    runComplete() {
      platform.levelComplete();
      return platform.requestInterstitial('run_complete');
    },
    requestInterstitial(placement = 'run_complete') {
      const now = host.performance.now();
      if (!announced || playing || now - lastInterstitial < 120000 || ad || scheduler.paused || !platform.supportsInterstitial)
        return Promise.resolve('unavailable');
      lastInterstitial = now;
      return requestAd('interstitial', placement);
    }
  };
  bridge.platform.on(bridge.EVENT_NAME.PAUSE_STATE_CHANGED, paused => setPauseReason('host', Boolean(paused)));
  bridge.platform.on(bridge.EVENT_NAME.AUDIO_STATE_CHANGED, enabled => { audioEnabled = Boolean(enabled); onAudio(); });
  bridge.advertisement.on(bridge.EVENT_NAME.REWARDED_STATE_CHANGED, state => adState('rewarded', state));
  bridge.advertisement.on(bridge.EVENT_NAME.INTERSTITIAL_STATE_CHANGED, state => adState('interstitial', state));
  bridge.advertisement.setMinimumDelayBetweenInterstitial?.(120);
  // Apply initial state after the caller has installed the platform reference.
  platform.syncInitialState = syncHostState;
  return platform;
}
