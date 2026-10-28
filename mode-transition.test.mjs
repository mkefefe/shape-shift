import test from 'node:test';
import assert from 'node:assert/strict';
import {gateFrame,GATE_TIMING,beginModeTransition} from './mode-transition.js';
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
test('first tutorial and every mode await gate; return to menu does not',async()=>{
 const read=name=>readFile(new URL(name,import.meta.url),'utf8');const game=await read('game.js');
 assert.match(game,/if\(launch\)\{const firstGate=beginModeTransition\('Your first game'\);try\{await firstGate.reveal\(\);\}finally\{firstGate.dispose\(\);\}\}/);
 assert(game.indexOf('await firstGate.reveal()')<game.indexOf('showFirstLesson',game.indexOf('await firstGate.reveal()')));
 assert.match(game,/nextBoard\(\);await gate.reveal\(\)/);
 for(const name of ['shape-drop.js','shape-slice.js','piano-flow.js'])assert.match(await read(name),/await gate.reveal\(\)/);
});
test('approved effects use settings-controlled bus, no separate unmuted context',async()=>{
 const audio=await readFile(new URL('audio.js',import.meta.url),'utf8');assert.match(audio,/function playGate[\s\S]*?sfxVolume<=0/);assert.match(audio,/source.connect\(gain\).connect\(effectsBus\)/);
 const gate=await readFile(new URL('mode-transition.js',import.meta.url),'utf8');assert.match(gate,/observer.disconnect\(\)/);assert.match(gate,/cancelAnimationFrame\(raf\)/);assert.doesNotMatch(gate,/new AudioContext/);
});
