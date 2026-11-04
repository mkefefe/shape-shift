import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../platforms/playgama/host-loader.js',import.meta.url),'utf8');
const body=source.slice(source.indexOf('const PLAYGAMA_BRIDGE_URL'),source.lastIndexOf('  bootPlaygamaHost(window);'));
// Exercise the shipped inline implementation without executing its browser boot.
const {PLAYGAMA_BRIDGE_URL,createPlaygamaHostLoader,initializePlaygamaHost,
 createPlaygamaConnectionNotice,installIframeFocusGuard,loadPlaygamaScript,bootPlaygamaHost}=new Function(body+'; return {PLAYGAMA_BRIDGE_URL,createPlaygamaHostLoader,initializePlaygamaHost,createPlaygamaConnectionNotice,installIframeFocusGuard,loadPlaygamaScript,bootPlaygamaHost};')();

const settle = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };

test('a normally loaded SDK is reused without any second download',async()=>{
  const f=fixture({preloaded:true});assert.equal(await f.ready,f.bridge);
  assert.deepEqual(f.calls,{download:0,initialize:1});assert.equal(f.clock.pending(),0);
});

test('a failed static download keeps the two existing retries and initializes only after recovery',async()=>{
  const clock=fakeClock(),attempts=[],retries=[];let available=false,initialized=0;
  const bridge={initialize(){initialized++;}};
  const loader=createPlaygamaHostLoader({...clock,preloaded:true,getBridge:()=>available?bridge:undefined,
    loadScript(url,attempt){assert.equal(url,PLAYGAMA_BRIDGE_URL);attempts.push(attempt);if(attempt===2)throw Error('network');available=true;},
    onRetry:state=>retries.push(state.nextAttempt)});
  await settle();assert.deepEqual(attempts,[]);assert.equal(initialized,0);
  await clock.advance(1000);assert.deepEqual(attempts,[2]);assert.equal(initialized,0);
  await clock.advance(2500);assert.equal(await loader.ready,bridge);
  assert.deepEqual(attempts,[2,3]);assert.deepEqual(retries,[2,3]);assert.equal(initialized,1);
});

function bootFixture({loading=false,reject=false}={}){
  const clock=fakeClock(),initialization=deferred(),attrs=new Map([['data-playgama-src','game-frame.html?v=494240']]);
  let assignments=0,initializations=0,downloads=0;const listeners=[],events=[];
  const frame={getAttribute:key=>attrs.get(key),removeAttribute:key=>attrs.delete(key),
    set src(value){assignments++;attrs.set('src',value);}};
  const doc={readyState:loading?'loading':'complete',querySelector:()=>attrs.has('data-playgama-src')?frame:null,
    addEventListener:(type,fn)=>listeners.push([type,fn])};
  const host={document:doc,bridge:{initialize(){initializations++;return initialization.promise;}},
    setTimeout:clock.setTimer,clearTimeout:clock.clearTimer,addEventListener(){},console:{error(){}}};
  const options={loadScript(){downloads++;},notice:{slow:()=>events.push('slow'),failed:()=>events.push('failed'),clear:()=>events.push('clear')}};
  return {host,options,clock,initialization,attrs,listeners,events,
    counts:()=>({assignments,initializations,downloads})};
}

test('the game document stays unfetched through slow SDK initialization, then starts exactly once',async()=>{
  const f=bootFixture(),first=bootPlaygamaHost(f.host,f.options),second=bootPlaygamaHost(f.host,f.options);
  assert.equal(first,second);assert.equal(f.host.ShapeShiftBridgeReady,first);
  await f.clock.advance(26000);assert.deepEqual(f.events,['slow']);assert.equal(f.attrs.has('src'),false);
  assert.deepEqual(f.counts(),{assignments:0,initializations:1,downloads:0});
  f.initialization.resolve();await first;await settle();
  assert.equal(f.attrs.get('src'),'game-frame.html?v=494240');assert.equal(f.attrs.has('data-playgama-src'),false);
  assert.deepEqual(f.counts(),{assignments:1,initializations:1,downloads:0});assert.deepEqual(f.events,['slow','clear']);
});

test('SDK initialization failure leaves the game document withheld and shows retry',async()=>{
  const f=bootFixture(),ready=bootPlaygamaHost(f.host,f.options);f.initialization.reject(Error('offline'));
  await assert.rejects(ready,error=>error.code==='sdk-initialize-failed');await settle();
  assert.equal(f.attrs.has('src'),false);assert.deepEqual(f.events,['failed']);
  assert.deepEqual(f.counts(),{assignments:0,initializations:1,downloads:0});
});

test('an SDK ready before body parsing waits for the iframe DOM without downloading again',async()=>{
  const f=bootFixture({loading:true}),ready=bootPlaygamaHost(f.host,f.options);
  f.initialization.resolve();await ready;await settle();assert.equal(f.attrs.has('src'),false);
  assert.equal(f.listeners.length,1);assert.equal(f.listeners[0][0],'DOMContentLoaded');
  f.host.document.readyState='interactive';f.listeners[0][1]();
  assert.equal(f.attrs.get('src'),'game-frame.html?v=494240');assert.equal(f.counts().assignments,1);
});

test('portal artwork preparation follows its explicit initialized Bridge barrier',()=>{
  const bootstrap=readFileSync(new URL('../platforms/playgama/playgama-bootstrap.js',import.meta.url),'utf8');
  assert(bootstrap.indexOf('const bridge = await ready;')<bootstrap.indexOf('const artwork = prepareBootstrap('));
});
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return {promise, resolve, reject}; }
function fakeClock() {
  let now = 0, sequence = 0; const jobs = new Map();
  return {
    setTimer(fn, delay) { const id = ++sequence; jobs.set(id, {fn, at: now + delay}); return id; },
    clearTimer(id) { jobs.delete(id); },
    async advance(ms) {
      const end = now + ms;
      for (;;) {
        const first = [...jobs].filter(([, job]) => job.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!first) break;
        now = first[1].at; jobs.delete(first[0]); first[1].fn(); await settle();
      }
      now = end; await settle();
    },
    pending: () => jobs.size,
  };
}
function fixture({download, initialize, retryDelaysMs, slowAfterMs, preloaded} = {}) {
  const clock = fakeClock(), events = [], calls = {download: 0, initialize: 0};
  const bridge = {initialize() { calls.initialize++; return initialize?.(); }};
  const loader = createPlaygamaHostLoader({
    ...clock, retryDelaysMs, slowAfterMs, preloaded,
    loadScript(url, attempt) { assert.equal(url, PLAYGAMA_BRIDGE_URL); calls.download++; return download?.(attempt); },
    getBridge: () => bridge,
    onSlow: state => events.push(['slow', state]), onRetry: state => events.push(['retry', state]),
    onFailure: (error, state) => events.push(['failed', error.code, state]),
    onReady: value => events.push(['ready', value]),
  });
  loader.ready.catch(() => {});
  return {clock, events, calls, bridge, ...loader};
}

test('successful SDK initialization resolves the actual bridge and cancels the slow notice', async () => {
  const f = fixture(); assert.equal(await f.ready, f.bridge);
  assert.deepEqual(f.calls, {download: 1, initialize: 1}); assert.equal(f.snapshot().status, 'ready');
  await f.clock.advance(60000); assert.deepEqual(f.events.map(event => event[0]), ['ready']); assert.equal(f.clock.pending(), 0);
});

test('download lasting longer than 25 seconds stays pending and can later succeed', async () => {
  const downloaded = deferred(), f = fixture({download: () => downloaded.promise}); let resolved = false;
  f.ready.then(() => { resolved = true; }); await f.clock.advance(26000);
  assert.equal(resolved, false); assert.equal(f.calls.initialize, 0);
  assert.deepEqual(f.events.map(event => event[0]), ['slow']);
  downloaded.resolve(); assert.equal(await f.ready, f.bridge);
  assert.deepEqual(f.events.map(event => event[0]), ['slow', 'ready']); assert.equal(f.calls.initialize, 1);
});

test('slow initialize is awaited once without announcing readiness or starting another session', async () => {
  const initialized = deferred(), f = fixture({initialize: () => initialized.promise}); let resolved = false;
  f.ready.then(() => { resolved = true; }); await settle(); await f.clock.advance(90000);
  assert.equal(resolved, false); assert.equal(f.snapshot().status, 'initializing');
  assert.deepEqual(f.calls, {download: 1, initialize: 1}); assert.deepEqual(f.events.map(event => event[0]), ['slow']);
  initialized.resolve(); await f.ready; assert.deepEqual(f.events.map(event => event[0]), ['slow', 'ready']);
});

test('failed SDK downloads retry twice with bounded backoff, then initialize exactly once', async () => {
  const f = fixture({download: attempt => attempt < 3 ? Promise.reject(Error('network')) : undefined});
  await settle(); assert.equal(f.calls.download, 1);
  await f.clock.advance(999); assert.equal(f.calls.download, 1);
  await f.clock.advance(1); assert.equal(f.calls.download, 2);
  await f.clock.advance(2499); assert.equal(f.calls.download, 2);
  await f.clock.advance(1); assert.equal(await f.ready, f.bridge);
  assert.deepEqual(f.calls, {download: 3, initialize: 1});
  assert.deepEqual(f.events.filter(e => e[0] === 'retry').map(e => [e[1].nextAttempt, e[1].delayMs]), [[2, 1000], [3, 2500]]);
});

test('all failed downloads show a genuine failure after three attempts, with no initialization', async () => {
  const f = fixture({download: () => Promise.reject(Error('blocked'))});
  await settle(); await f.clock.advance(3500);
  await assert.rejects(f.ready, error => error.code === 'sdk-download-failed' && error.cause.message === 'blocked');
  assert.deepEqual(f.calls, {download: 3, initialize: 0}); assert.equal(f.snapshot().status, 'failed');
  await f.clock.advance(60000); assert.equal(f.events.filter(e => e[0] === 'failed').length, 1);
  assert.equal(f.events.some(e => e[0] === 'ready'), false); assert.equal(f.clock.pending(), 0);
});

test('initialization rejection has its own failure and never redownloads or initializes again', async () => {
  const f = fixture({initialize: () => Promise.reject(Error('portal rejected'))});
  await assert.rejects(f.ready, error => error.code === 'sdk-initialize-failed');
  await f.clock.advance(60000); assert.deepEqual(f.calls, {download: 1, initialize: 1});
  assert.deepEqual(f.events.map(event => event[0]), ['failed']);
});

test('an initialization rejection after the slow notice remains a real failure', async () => {
  const initialized = deferred(), f = fixture({initialize: () => initialized.promise});
  await settle(); await f.clock.advance(26000); initialized.reject(Error('host unavailable'));
  await assert.rejects(f.ready, error => error.code === 'sdk-initialize-failed');
  assert.deepEqual(f.events.map(event => event[0]), ['slow', 'failed']);
});

test('missing initialize cannot report readiness or fall back to a standalone platform', async () => {
  const clock = fakeClock(), events = [];
  const f = createPlaygamaHostLoader({...clock, loadScript: async () => {}, getBridge: () => ({}), onReady: () => events.push('ready')});
  await assert.rejects(f.ready, error => error.code === 'sdk-unavailable'); assert.deepEqual(events, []);
});

test('the same host shares one loader, one initialize call, and clears a late slow notice', async () => {
  const clock = fakeClock(), initialization = deferred(), events = [], host = {
    setTimeout: clock.setTimer, clearTimeout: clock.clearTimer,
    addEventListener() {}, document: {}, console: {error() {}},
  };
  let downloads = 0, initializations = 0;
  const bridge = {initialize() { initializations++; return initialization.promise; }};
  const options = {host, loadScript() { downloads++; }, getBridge: () => bridge,
    notice: {slow: () => events.push('slow'), failed: () => events.push('failed'), clear: () => events.push('clear')}};
  const first = initializePlaygamaHost(options), second = initializePlaygamaHost(options);
  assert.equal(first, second); await settle(); await clock.advance(26000);
  assert.deepEqual(events, ['slow']); initialization.resolve(); assert.equal(await first, bridge);
  assert.deepEqual(events, ['slow', 'clear']); assert.equal(downloads, 1); assert.equal(initializations, 1);
});

test('focus guard suppresses only actual focus handoff to the game iframe', () => {
  const frame = {}, handlers = [], doc = {querySelector: () => frame, visibilityState: 'visible', hasFocus: () => true, activeElement: frame};
  const host = {document: doc, addEventListener(type, fn) { handlers.push([type, fn]); }};
  installIframeFocusGuard(host); installIframeFocusGuard(host); assert.equal(handlers.length, 1);
  let stopped = 0; const event = {target: host, stopImmediatePropagation() { stopped++; }};
  handlers[0][1](event); assert.equal(stopped, 1);
  doc.hasFocus = () => false; handlers[0][1](event); assert.equal(stopped, 1);
  doc.hasFocus = () => true; doc.visibilityState = 'hidden'; handlers[0][1](event); assert.equal(stopped, 1);
  doc.visibilityState = 'visible'; doc.activeElement = {}; handlers[0][1](event); assert.equal(stopped, 1);
});

function fakeDocument({body = true} = {}) {
  const ids = new Map(), listeners = [], doc = {
    getElementById: id => ids.get(id),
    addEventListener(type, fn) { listeners.push([type, fn]); },
    createElement(tag) { return {tag, children: [], setAttribute() {}, focus() { this.focused = true; },
      append(...nodes) { for (const node of nodes) { this.children.push(node); if (node.id) ids.set(node.id, node); } },
      remove() { ids.delete(this.id); this.removed = true; }}; },
  };
  doc.head = doc.createElement('head'); doc.body = body ? doc.createElement('body') : null;
  return {doc, ids, listeners};
}

test('SDK initialization shows connection progress while the game document is withheld',()=>{
  const {doc,ids}=fakeDocument();const notice=createPlaygamaConnectionNotice({document:doc});
  notice.pending();const panel=ids.get('platform-load-status');assert(panel);
  assert.equal(panel.children[0].textContent,'Connecting…');
  assert.equal(panel.children.find(node=>node.tag==='button').hidden,true);
  notice.slow();assert.equal(ids.get('platform-load-status').children.find(node=>node.tag==='button').hidden,false);
  notice.clear();assert.equal(ids.has('platform-load-status'),false);
});

test('slow notice is non-modal and disappears on late success; retry explicitly reloads', () => {
  const {doc, ids} = fakeDocument(); let reloads = 0;
  const notice = createPlaygamaConnectionNotice({document: doc, location: {reload() { reloads++; }}});
  notice.slow(); const panel = ids.get('platform-load-status'); assert(panel); assert.equal(ids.has('platform-load-error'), false);
  const retry = panel.children.find(n => n.tag === 'button'); assert.equal(retry.focused, undefined); retry.onclick(); assert.equal(reloads, 1);
  notice.clear(); assert.equal(ids.has('platform-load-status'), false); assert.equal(ids.has('platform-load-error'), false);
  notice.failed(); assert(ids.has('platform-load-error')); notice.clear(); assert.equal(ids.has('platform-load-error'), false);
});

test('late ready before DOMContentLoaded cannot resurrect a stale error or slow notice', () => {
  const {doc, ids, listeners} = fakeDocument({body: false});
  const notice = createPlaygamaConnectionNotice({document: doc}); notice.slow(); notice.slow(); assert.equal(listeners.length, 1);
  notice.clear(); doc.body = doc.createElement('body'); listeners[0][1]();
  assert.equal(ids.has('platform-load-status'), false); assert.equal(ids.has('platform-load-error'), false);
});

test('the script loader removes failed script nodes and uses the official external SDK', async () => {
  const {doc} = fakeDocument(), promise = loadPlaygamaScript({document: doc}, PLAYGAMA_BRIDGE_URL);
  const script = doc.head.children[0]; assert.equal(script.src, PLAYGAMA_BRIDGE_URL); assert.equal(script.async, true);
  script.onerror(); await assert.rejects(promise, /SDK download failed/); assert.equal(script.removed, true);
  assert.equal(script.onload, null); assert.equal(script.onerror, null);
});
