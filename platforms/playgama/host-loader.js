
(() => {
const PLAYGAMA_BRIDGE_URL = 'https://bridge.playgama.com/v2/stable/playgama-bridge.js';

// A slow connection is not a failed connection. The platform promise remains
// pending after the notice, so late SDK initialization can still start the game.
function createPlaygamaHostLoader({
  loadScript,
  getBridge,
  setTimer = globalThis.setTimeout.bind(globalThis),
  clearTimer = globalThis.clearTimeout.bind(globalThis),
  slowAfterMs = 25000,
  retryDelaysMs = [1000, 2500],
  onSlow = () => {},
  onRetry = () => {},
  onFailure = () => {},
  onReady = () => {},
} = {}) {
  if (typeof loadScript !== 'function' || typeof getBridge !== 'function')
    throw new TypeError('SDK loading and bridge lookup are required');
  const delays = retryDelaysMs.map(delay => Math.max(0, Number(delay) || 0));
  let state = {status: 'loading', attempt: 1, maxAttempts: delays.length + 1, slow: false};
  const snapshot = () => ({...state});
  // UI or logging failures must never reject an otherwise usable platform.
  const notify = (callback, ...args) => { try { callback(...args); } catch {} };
  const slowTimer = setTimer(() => {
    if (state.status === 'ready' || state.status === 'failed') return;
    state = {...state, slow: true};
    notify(onSlow, snapshot());
  }, Math.max(0, slowAfterMs));
  const delay = ms => new Promise(resolve => setTimer(resolve, ms));
  const ready = (async () => {
    try {
      for (let attempt = 1; attempt <= delays.length + 1; attempt++) {
        state = {...state, status: 'loading', attempt};
        try {
          await loadScript(PLAYGAMA_BRIDGE_URL, attempt);
          break;
        } catch (cause) {
          if (attempt > delays.length) {
            const error = new Error('The game platform SDK could not be downloaded.', {cause});
            error.code = 'sdk-download-failed';
            throw error;
          }
          state = {...state, status: 'retrying'};
          notify(onRetry, {...snapshot(), nextAttempt: attempt + 1, delayMs: delays[attempt - 1]});
          await delay(delays[attempt - 1]);
        }
      }
      const bridge = getBridge();
      if (typeof bridge?.initialize !== 'function') {
        const error = new Error('The game platform SDK did not become available.');
        error.code = 'sdk-unavailable';
        throw error;
      }
      state = {...state, status: 'initializing'};
      // Only download failures retry. Once initialize has started, it is awaited
      // exactly once; a slow result cannot cause another SDK/session to start.
      try { await bridge.initialize(); }
      catch (cause) {
        const error = new Error('The game platform connection could not be initialized.', {cause});
        error.code = 'sdk-initialize-failed';
        throw error;
      }
      clearTimer(slowTimer);
      state = {...state, status: 'ready'};
      notify(onReady, bridge, snapshot());
      return bridge;
    } catch (error) {
      clearTimer(slowTimer);
      state = {...state, status: 'failed', errorCode: error.code || 'sdk-failed'};
      notify(onFailure, error, snapshot());
      throw error;
    }
  })();
  return {ready, snapshot};
}

function loadPlaygamaScript(host, url) {
  return new Promise((resolve, reject) => {
    const script = host.document.createElement('script');
    script.src = url; script.async = true;
    const finish = error => {
      script.onload = null; script.onerror = null;
      if (error) { script.remove(); reject(error); }
      else resolve();
    };
    script.onload = () => finish();
    script.onerror = () => finish(new Error('Platform SDK download failed'));
    host.document.head.append(script);
  });
}

const focusGuards = new WeakSet();
function installIframeFocusGuard(host) {
  if (focusGuards.has(host)) return;
  focusGuards.add(host);
  // Moving focus into our game iframe must not be reported as leaving the game.
  // This listener is registered before loading Bridge and its blur listener.
  host.addEventListener('blur', event => {
    const doc = host.document, frame = doc.querySelector('main>iframe');
    if (event.target === host && frame && doc.visibilityState === 'visible' &&
        doc.hasFocus() && doc.activeElement === frame) event.stopImmediatePropagation();
  }, {capture: true});
}

function createPlaygamaConnectionNotice(host) {
  const doc = host.document;
  let current = null, waitingForBody = false;
  function removePanels() {
    doc.getElementById('platform-load-status')?.remove();
    doc.getElementById('platform-load-error')?.remove();
  }
  function render() {
    removePanels();
    if (!current) return;
    if (!doc.body) {
      if (!waitingForBody) {
        waitingForBody = true;
        doc.addEventListener('DOMContentLoaded', () => { waitingForBody = false; render(); }, {once: true});
      }
      return;
    }
    if (!doc.getElementById('playgama-connection-notice-style')) {
      const style = doc.createElement('style'); style.id = 'playgama-connection-notice-style';
      style.textContent = '#platform-load-status{position:fixed;left:50%;bottom:max(16px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:2147483647;box-sizing:border-box;width:min(420px,calc(100% - 32px));padding:16px 18px;border:1px solid #8fd5e7;border-radius:18px;background:#073d55f5;color:white;text-align:center;box-shadow:0 5px 24px #001b3166;font:600 15px/1.4 system-ui,sans-serif}#platform-load-status h1,#platform-load-status p{margin:0 0 9px}#platform-load-status h1{font-size:19px}#platform-load-status button,#platform-load-error button{border:2px solid #fff;border-radius:16px;padding:10px 24px;color:#503c00;background:#ffcd30;font:700 17px system-ui,sans-serif;cursor:pointer;min-height:44px}#platform-load-error{position:fixed;inset:0;z-index:2147483647;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;box-sizing:border-box;padding:24px;background:#063d5d;color:white;text-align:center;font:600 18px/1.5 system-ui,sans-serif}#platform-load-error h1,#platform-load-error p{margin:0;max-width:440px}#platform-load-error h1{font-size:28px}#platform-load-status button:focus-visible,#platform-load-error button:focus-visible{outline:3px solid #8feaff;outline-offset:4px}';
      doc.head.append(style);
    }
    const failed = current.kind === 'failed';
    const panel = doc.createElement('section');
    panel.id = failed ? 'platform-load-error' : 'platform-load-status';
    panel.setAttribute('role', failed ? 'alert' : 'status');
    const title = doc.createElement('h1'), copy = doc.createElement('p'), retry = doc.createElement('button');
    title.textContent = failed ? 'Could not connect' : 'Still connectingâ€¦';
    copy.textContent = failed
      ? 'The game could not connect to the game platform. Please try again.'
      : 'The connection is taking longer than usual. You can wait, or try again.';
    retry.type = 'button'; retry.textContent = 'Try again'; retry.onclick = () => host.location.reload();
    panel.append(title, copy, retry); doc.body.append(panel);
    if (failed) retry.focus();
  }
  return {
    slow() { current = {kind: 'slow'}; render(); },
    failed() { current = {kind: 'failed'}; render(); },
    clear() { current = null; removePanels(); },
  };
}

const hostLoads = new WeakMap();
function initializePlaygamaHost({
  host = globalThis.window,
  loadScript = url => loadPlaygamaScript(host, url),
  getBridge = () => host.bridge,
  notice = createPlaygamaConnectionNotice(host),
  ...options
} = {}) {
  if (hostLoads.has(host)) return hostLoads.get(host);
  installIframeFocusGuard(host);
  const loader = createPlaygamaHostLoader({
    ...options,
    loadScript, getBridge,
    setTimer: host.setTimeout.bind(host), clearTimer: host.clearTimeout.bind(host),
    onSlow: () => notice.slow(),
    onReady: () => notice.clear(),
    onFailure: error => {
      notice.failed();
      host.console?.error?.('Game platform could not initialize', error);
    },
  });
  hostLoads.set(host, loader.ready);
  // Register a rejection handler immediately. The original promise still
  // rejects for the child bootstrap; no standalone/offline platform is faked.
  loader.ready.catch(() => {});
  return loader.ready;
}

  window.ShapeShiftBridgeReady = initializePlaygamaHost({host: window});
})();
