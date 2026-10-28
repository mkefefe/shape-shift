import test from 'node:test';
import assert from 'node:assert/strict';
import {gateFrame,GATE_TIMING,GATE_ZOOM_FRAMES,beginModeTransition} from './mode-transition.js';
import {readFile} from 'node:fs/promises';
test('gate holds closed until destination is ready, including slow loads',()=>{
 assert.equal(gateFrame(5000).rotation,0);assert.equal(gateFrame(5000).opening,0);
 assert.equal(gateFrame(720,0).enter,1);assert.equal(gateFrame(2119,0).rotation,0);
 assert.equal(gateFrame(3920,0).rotation,Math.PI/2);assert.equal(gateFrame(4119,0).opening,0);
 assert.equal(gateFrame(5420,0).done,true);
 assert.equal(gateFrame(6500,6500).rotation,0);assert.equal(gateFrame(9800,6500).done,true);
 assert.equal(GATE_TIMING.turn-GATE_TIMING.close,1400);
});
test('startup preparation uses its own barrier instead of blocking board readiness',async()=>{
 const old=globalThis.document;globalThis.document={documentElement:{classList:{contains:()=>true}},createElement(){throw Error('Unexpected gate');}};
 try{const gate=beginModeTransition('First board');await gate.reveal();gate.dispose();}finally{globalThis.document=old;}
});
test('destinations paint under the closed gate before reveal',async()=>{
 const read=name=>readFile(new URL(name,import.meta.url),'utf8');const game=await read('game.js');
 assert.match(game,/await gate.covered;return await prepareRun/);
 assert.match(game,/nextBoard\(\);await gameplayScene.prepare\(\);/);
 assert.match(game,/await firstGate.covered;cover.hidden=true/);
 assert(game.indexOf('await firstGate.reveal(')<game.indexOf('showFirstLesson?.()'));
 assert.doesNotMatch(game,/loadBackgroundAssets\(/);
 for(const name of ['shape-drop.js','shape-slice.js','piano-flow.js']){
  const source=await read(name);assert.match(source,/await gate.covered;document.getElementById\('games-hub'\)\?\.close\(\);if\(!dialog.open\)dialog.showModal\(\)/);
  assert.match(source,/await gate.reveal\(\(\)=>/);
 }
});

test('approved effects use settings-controlled bus, no separate unmuted context',async()=>{
 const audio=await readFile(new URL('audio.js',import.meta.url),'utf8');assert.match(audio,/function playGate[\s\S]*?sfxVolume<=0/);assert.match(audio,/source.connect\(gain\).connect\(effectsBus\)/);
 const gate=await readFile(new URL('mode-transition.js',import.meta.url),'utf8');assert.match(gate,/observer.disconnect\(\)/);assert.match(gate,/cancelAnimationFrame\(raf\)/);assert.doesNotMatch(gate,/new AudioContext/);
});

test('curtain is isolated from global panel styles and hub stays until covered',async()=>{
 const gate=await readFile(new URL('mode-transition.js',import.meta.url),'utf8');
 assert.match(gate,/host.attachShadow/);assert.match(gate,/shadow.append\(style,cover\)/);assert.match(gate,/host.remove\(\)/);
 const hub=await readFile(new URL('games-hub.js',import.meta.url),'utf8');assert.doesNotMatch(hub,/close\(\);data.action\(\)/);
});

test('opening zoom never shrinks below the viewport or snaps at cleanup',()=>{
 const scales=GATE_ZOOM_FRAMES.map(f=>Number(f.transform.match(/scale\(([^)]+)\)/)[1]));
 assert.equal(scales[0],1);assert.equal(scales.at(-1),1);assert(Math.max(...scales)>1);
 for(let i=1;i<scales.length;i++)for(let step=0;step<=100;step++){
  const scale=scales[i-1]+(scales[i]-scales[i-1])*step/100;
  assert(scale>=1);for(const [w,h] of [[360,640],[480,784],[1280,720]]){assert(w*scale>=w);assert(h*scale>=h);}
 }
});
