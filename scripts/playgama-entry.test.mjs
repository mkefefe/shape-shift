import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {findPlaygamaHost} from '../platforms/playgama/playgama-entry.mjs';

const source=readFileSync(new URL('../platforms/playgama/playgama-bootstrap.js',import.meta.url),'utf8');
const from=source.indexOf('async function start() {');
const to=source.indexOf('// Mouse/pen dragging',from);
assert(from>=0&&to>from);
const start=source.slice(from,to).replace(/await import\('\.\/game\.js\?v=\d+'\);/,'await loadGame();');
assert.notEqual(start,source.slice(from,to),'Exercise the real bootstrap with only its final module load intercepted');
const settle=async()=>{for(let n=0;n<16;n++)await Promise.resolve();};
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}

test('a direct entry owns Bridge even when its portal parent cannot be read',()=>{
  const host={ShapeShiftBridgeReady:Promise.resolve({})};
  Object.defineProperty(host,'parent',{get(){throw Error('Cross-origin parent must not be read');}});
  assert.equal(findPlaygamaHost(host),host);
});

test('legacy frames reuse their same-origin shell without creating a new SDK session',()=>{
  const parent={ShapeShiftBridgeReady:Promise.resolve({})},child={parent};
  assert.equal(findPlaygamaHost(child),parent);
  assert.equal(child.ShapeShiftBridgeReady,undefined);
});

test('a missing or cross-origin SDK owner fails instead of faking a platform',()=>{
  const host={};Object.defineProperty(host,'parent',{get(){throw Error('Cross-origin');}});
  assert.throws(()=>findPlaygamaHost(host),/Open the game from index.html/);
  assert.throws(()=>findPlaygamaHost({parent:{ShapeShiftBridgeReady:{}}}),/Open the game from index.html/);
});

function fixture({legacy=false}={}){
  const sdk=deferred(),art=deferred(),storage=deferred(),calls=[],errors=[];
  const retry={hidden:true},copy={textContent:''},cover={hidden:false,querySelector:selector=>selector==='button'?retry:copy};
  const app={inert:true},elements={'startup-ready':cover,app,'coins-ad-open':{},'leaderboard-open':{setAttribute(){}},'privacy-options':{}};
  const document={hidden:false,documentElement:{dataset:{},classList:{contains:()=>true}},
    getElementById:id=>elements[id],querySelector:()=>({textContent:''}),addEventListener(){}};
  const bridge={};
  const sdkHost={ShapeShiftBridgeReady:sdk.promise,location:{reload:()=>calls.push('reload-owner')}};
  const window=legacy?{parent:sdkHost}:sdkHost;
  window.addEventListener=()=>{};window.dispatchEvent=()=>{};
  if(!legacy)Object.defineProperty(window,'parent',{get(){throw Error('Cross-origin portal parent');}});
  const context=vm.createContext({window,document,location:{origin:'https://game.example'},findPlaygamaHost,
    console:{error:(...args)=>errors.push(args),warn(){}},Event:class {},Promise,
    prepareBootstrap(){calls.push('prepare-assets');return art.promise;},
    createPlaygamaPlatform({bridge:actual,host}){assert.equal(actual,bridge);assert.equal(host,window);return {
      supportsRewarded:false,audioAllowed:false,initialize(){calls.push('load-storage');return storage.promise;},
      syncInitialState(){calls.push('sync-platform');},setPauseReason(){},flush:async()=>{}};},
    pause(){},resume(){},syncAudio(){},showScores(){},showSaveState(){},observeDeferredImages(){},bindDesktopScroll(){},
    startWelcomeMusic(){calls.push('welcome-music');},loadGame:async()=>calls.push('load-game')});
  vm.runInContext('let platform; const media=new Set(), playingMedia=new Set();\n'+start,context);
  const running=vm.runInContext('start()',context);
  return {sdk,art,storage,bridge,calls,errors,retry,copy,running};
}

for(const legacy of [false,true])test(`bootstrap waits for SDK, required assets and saved progress before gameplay, legacy=${legacy}`,async()=>{
  const f=fixture({legacy});await settle();assert.deepEqual(f.calls,[]);
  f.sdk.resolve(f.bridge);await settle();assert(f.calls.includes('prepare-assets'));assert(f.calls.includes('load-storage'));
  assert.equal(f.calls.includes('load-game'),false);
  f.art.resolve();await settle();assert.equal(f.calls.includes('load-game'),false);
  f.storage.resolve();await f.running;
  assert.equal(f.calls.filter(call=>call==='load-game').length,1);assert.deepEqual(f.errors,[]);
});

for(const legacy of [false,true])test(`SDK failure retains loading and retry reloads only its SDK owner, legacy=${legacy}`,async()=>{
  const f=fixture({legacy});f.sdk.reject(Error('SDK unavailable'));await f.running;
  assert.deepEqual(f.calls,[]);assert.equal(f.errors.length,1);assert.equal(f.retry.hidden,false);
  f.retry.onclick();assert.deepEqual(f.calls,['reload-owner']);
});

test('an asset failure cannot import gameplay even after SDK and storage succeed',async()=>{
  const f=fixture();f.sdk.resolve(f.bridge);await settle();f.storage.resolve();f.art.reject(Error('Asset unavailable'));await f.running;
  assert.equal(f.calls.includes('load-game'),false);assert.equal(f.calls.includes('welcome-music'),false);
  assert.equal(f.errors.length,1);assert.equal(f.retry.hidden,false);
});
