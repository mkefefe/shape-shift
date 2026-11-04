import test from 'node:test';
import assert from 'node:assert/strict';
import {gateFrame,GATE_TIMING,GATE_ZOOM_FRAMES,beginModeTransition,loadGateImage,prepareGateVisual} from './mode-transition.js';
import {readFile} from 'node:fs/promises';
test('gate holds closed until destination is ready, including slow loads',()=>{
 assert.equal(gateFrame(5000).rotation,0);assert.equal(gateFrame(5000).opening,0);
 const {close,turn,turnDuration,settle,openDuration}=GATE_TIMING;
 assert.equal(gateFrame(close,0).enter,1);assert.equal(gateFrame(turn-1,0).rotation,0);
 assert.equal(gateFrame(turn+turnDuration,0).rotation,Math.PI/2);
 assert.equal(gateFrame(turn+turnDuration+settle-1,0).opening,0);
 assert.equal(gateFrame(turn+turnDuration+settle+openDuration,0).done,true);
 assert.equal(gateFrame(6500,6500).rotation,0);
 assert.equal(gateFrame(6500+turnDuration+settle+openDuration,6500).done,true);
 assert(turn+turnDuration+settle+openDuration<=2200);
 assert(turn>close);

});
test('startup preparation uses its own barrier instead of blocking board readiness',async()=>{
 const old=globalThis.document;globalThis.document={documentElement:{classList:{contains:()=>true}},createElement(){throw Error('Unexpected gate');}};
 try{const gate=beginModeTransition('First board',{preparingStartup:true});await gate.reveal();gate.dispose();}finally{globalThis.document=old;}
});
test('destinations finish preparation and paint before their game clock is released',async()=>{
 const read=name=>readFile(new URL(name,import.meta.url),'utf8');const game=await read('game.js');
 assert.match(game,/await gate.covered;return await prepareRun/);
 assert.match(game,/nextBoard\(\);await gameplayScene.prepare\(\);/);
 assert.match(game,/await firstGate.covered;cover.hidden=true/);
 assert(game.indexOf('await firstGate.reveal(')<game.indexOf('showFirstLesson?.()'));
 assert.doesNotMatch(game,/loadBackgroundAssets\(/);assert.match(game,/await startupReadiness.prepare/);
 for(const name of ['shape-drop.js','shape-slice.js','piano-flow.js']){
  const source=await read(name);assert.match(source,/await gate.covered;document.getElementById\('games-hub'\)\?\.close\(\);if\(!dialog.open\)dialog.showModal\(\)/);
  assert.match(source,/await gate.reveal\(\(\)=>/);
 }
});

test('approved effects use settings-controlled bus, no separate unmuted context',async()=>{
 const audio=await readFile(new URL('audio.js',import.meta.url),'utf8');assert.match(audio,/function playGate[\s\S]*?sfxVolume<=0/);assert.match(audio,/source.connect\(gain\).connect\(effectsBus\)/);
 const gate=await readFile(new URL('mode-transition.js',import.meta.url),'utf8');assert.doesNotMatch(gate.slice(gate.indexOf('export function beginModeTransition')),/playGate|gateFrame|canvas/);assert.doesNotMatch(gate,/new AudioContext/);
});

test('ready mode switches add no loading dialog and retain launch ownership',async()=>{
 const gate=await readFile(new URL('mode-transition.js',import.meta.url),'utf8'),switcher=gate.slice(gate.indexOf('export function beginModeTransition'));
 assert.doesNotMatch(switcher,/createElement|showModal|Loading/);
 const hub=await readFile(new URL('games-hub.js',import.meta.url),'utf8');assert.doesNotMatch(hub,/close\(\);data.action\(\)/);
});

test('screen handoff locks input until painting finishes and always restores prior state',async()=>{
 const oldDocument=globalThis.document,oldRaf=globalThis.requestAnimationFrame;
 const app={inert:false},events=new Map(),frames=[];
 globalThis.document={getElementById:()=>app,addEventListener:(type,fn)=>events.set(type,fn),removeEventListener:type=>events.delete(type),createElement(){throw Error('Unexpected loading UI');}};
 globalThis.requestAnimationFrame=fn=>frames.push(fn);
 try{
  const one=beginModeTransition('Piano'),two=beginModeTransition('Slice');assert(app.inert);assert.equal(events.size,3);
  one.dispose();assert(app.inert);let release,painted=false;
  const done=two.reveal(()=>new Promise(resolve=>{release=()=>{painted=true;resolve();};}));
  await Promise.resolve();assert(!painted);assert(app.inert);release();await Promise.resolve();frames.shift()();frames.shift()();await done;
  assert.equal(app.inert,false);assert.equal(events.size,0);two.dispose();
  app.inert=true;const failed=beginModeTransition('Failed paint');await assert.rejects(failed.reveal(()=>{throw Error('paint failed');}),/paint failed/);assert.equal(app.inert,true);assert.equal(events.size,0);
 }finally{globalThis.document=oldDocument;globalThis.requestAnimationFrame=oldRaf;}
});

test('opening zoom never shrinks below the viewport or snaps at cleanup',()=>{
 const scales=GATE_ZOOM_FRAMES.map(f=>Number(f.transform.match(/scale\(([^)]+)\)/)[1]));
 assert.equal(scales[0],1);assert.equal(scales.at(-1),1);assert(Math.max(...scales)>1);
 for(let i=1;i<scales.length;i++)for(let step=0;step<=100;step++){
  const scale=scales[i-1]+(scales[i]-scales[i-1])*step/100;
  assert(scale>=1);for(const [w,h] of [[360,640],[480,784],[1280,720]]){assert(w*scale>=w);assert(h*scale>=h);}
 }
});

test('door artwork loads without depending on Image.decode support',async()=>{
 class AndroidImage{
  naturalWidth=0;complete=false;
  decode(){throw Error('WebView decode unavailable');}
  set src(value){assert(value.endsWith('/assets/transition-gate-v115.png'));queueMicrotask(()=>{this.naturalWidth=1254;this.complete=true;this.onload();});}
 }
 const image=await loadGateImage(AndroidImage);assert.equal(image.naturalWidth,1254);
});
test('slow or failed optional door audio cannot block the visual gate',async()=>{
 const image={naturalWidth:1254};
 assert.equal(await prepareGateVisual(()=>Promise.resolve(image),()=>new Promise(()=>{})),image);
 const warn=console.warn;console.warn=()=>{};
 try{assert.equal(await prepareGateVisual(()=>Promise.resolve(image),()=>{throw Error('No audio');}),image);await Promise.resolve();}finally{console.warn=warn;}
});
