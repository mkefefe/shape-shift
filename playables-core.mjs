// Platform-independent adapters. No browser storage is used by this module.
export function createSaveStore({load, save, changed = () => {}, report = () => {}}) {
  let values = new Map(), ready = false, revision = 0, saved = 0, pending = null;
  const storage = {
    get length() { return values.size; },
    key: n => [...values.keys()][n] ?? null,
    getItem: key => values.get(String(key)) ?? null,
    setItem(key, value) {
      key = String(key); value = String(value);
      if (values.get(key) === value) return;
      values.set(key, value); revision++; changed();
    },
    removeItem(key) { if (values.delete(String(key))) { revision++; changed(); } },
    clear() { if (values.size) { values.clear(); revision++; changed(); } }
  };
  async function initialize() {
    const raw = await load();
    const data = raw ? JSON.parse(raw) : {version: 1, values: {}};
    if (data.version !== 1 || !data.values || typeof data.values !== 'object' || Array.isArray(data.values))
      throw new Error('Unsupported saved-game format');
    const entries = Object.entries(data.values);
    if (entries.some(([key, value]) => typeof value !== 'string' || key.length > 200))
      throw new Error('Invalid saved-game data');
    values = new Map(entries); ready = true;
  }
  function flush() {
    if (!ready) return Promise.reject(new Error('Load must succeed before saving'));
    if (pending) return pending;
    pending = (async () => {
      while (saved !== revision) {
        const current = revision;
        const data = JSON.stringify({version: 1, values: Object.fromEntries(values)});
        if (new TextEncoder().encode(data).length >= 3 * 1024 * 1024) throw Error('Save is too large');
        await save(data); saved = current;
      }
    })().catch(error => { report(error); throw error; }).finally(() => { pending = null; });
    return pending;
  }
  return {storage, initialize, flush, get dirty() { return saved !== revision; }};
}

// Freeze game time, timers and RAF callbacks without modifying browser globals.
export function createScheduler(host) {
  const time = () => host.performance.now();
  let paused = false, pauseAt = 0, lost = 0, id = 0;
  const jobs = new Map();
  const now = () => (paused ? pauseAt : time()) - lost;
  function cancel(key) {
    const job = jobs.get(key); if (!job) return;
    (job.frame ? host.cancelAnimationFrame : host.clearTimeout).call(host, job.native);
    jobs.delete(key);
  }
  function arm(job) {
    if (paused) return;
    job.started = time();
    if (job.frame) job.native = host.requestAnimationFrame(() => {
      if (paused || !jobs.has(job.id)) return;
      jobs.delete(job.id); job.fn(now());
    });
    else job.native = host.setTimeout(() => {
      if (paused || !jobs.has(job.id)) return;
      if (job.repeat) { job.remaining = job.delay; arm(job); }
      else jobs.delete(job.id);
      job.fn(...job.args);
    }, job.remaining);
  }
  function add(fn, delay, args, repeat = false, frame = false) {
    if (typeof fn !== 'function') throw TypeError('Timer callback must be a function');
    const job = {id: ++id, fn, delay: Math.max(repeat ? 1 : 0, Number(delay) || 0), args, repeat, frame};
    job.remaining = job.delay; jobs.set(job.id, job); arm(job); return job.id;
  }
  return {
    now, get paused() { return paused; },
    setTimeout: (fn, delay, ...args) => add(fn, delay, args),
    setInterval: (fn, delay, ...args) => add(fn, delay, args, true),
    clearTimeout: cancel, clearInterval: cancel,
    requestAnimationFrame: fn => add(fn, 0, [], false, true), cancelAnimationFrame: cancel,
    pause() {
      if (paused) return; pauseAt = time(); paused = true;
      for (const job of jobs.values()) {
        (job.frame ? host.cancelAnimationFrame : host.clearTimeout).call(host, job.native);
        if (!job.frame) job.remaining = Math.max(0, job.remaining - (pauseAt - job.started));
      }
    },
    resume() {
      if (!paused) return; lost += time() - pauseAt; paused = false;
      for (const job of jobs.values()) arm(job);
    }
  };
}

export const REWARDS = Object.freeze({
  menu: 'coins-500', default: 'coins-500', 'run-bonus': 'coins-1000',
  continue: 'refill-hearts', 'continue-drop': 'clear-upper-pile',
  'continue-slice': 'refill-slice-hearts', 'continue-piano': 'refill-piano-hearts'
});
export async function requestPlatformReward(sdk, placement) {
  if (!sdk?.IN_PLAYABLES_ENV || !sdk.ads?.requestRewardedAd) return 'unavailable';
  const id = REWARDS[placement];
  if (!id) return 'failed';
  try { return await sdk.ads.requestRewardedAd(id) === true ? 'rewarded' : 'dismissed'; }
  catch { return 'unavailable'; }
}
