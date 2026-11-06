import test from 'node:test';
import assert from 'node:assert/strict';
import {restorationFilmFrame,restorationPixelGroup,RESTORATION_CHARGE_SECONDS,RESTORATION_COLOR_SECONDS} from './restoration-film.js';
test('one charge launches four distinct colored beams on the same frame on every island',()=>{
 for(let island=0;island<10;island++){
  const before=restorationFilmFrame(RESTORATION_CHARGE_SECONDS-.01,island);assert(before.time<0);
  const shot=restorationFilmFrame(RESTORATION_CHARGE_SECONDS,island);assert.equal(shot.time,0);assert.equal(shot.beams.length,4);assert.equal(new Set(shot.beams.map(b=>b.shape)).size,4);assert(shot.beams.every(b=>b.launch===RESTORATION_CHARGE_SECONDS));
  assert.equal(restorationFilmFrame(RESTORATION_COLOR_SECONDS-.01,island).kind,'restore');assert.equal(restorationFilmFrame(RESTORATION_COLOR_SECONDS,island).kind,'lanterns');
  assert(restorationFilmFrame(24,island).time>restorationFilmFrame(23,island).time);
 }
});
test('only the tenth island proceeds into the ending credits',()=>{
 for(let i=0;i<9;i++)for(let t=RESTORATION_COLOR_SECONDS;t<=40;t+=.1)assert.equal(restorationFilmFrame(t,i).kind,'lanterns');
 assert.equal(restorationFilmFrame(RESTORATION_COLOR_SECONDS+4.5,9).kind,'credits');assert(Math.abs(restorationFilmFrame(RESTORATION_COLOR_SECONDS+17,9).time-25)<1e-9);
});
test('the original island preserves authored object masks and covers all four districts',()=>{
 assert.equal(restorationPixelGroup(10),0);assert.equal(restorationPixelGroup(30),0);assert.equal(restorationPixelGroup(40),0);
 assert.equal(restorationPixelGroup(25),1);assert.equal(restorationPixelGroup(50),2);assert.equal(restorationPixelGroup(70),2);assert.equal(restorationPixelGroup(100),3);
 assert.equal(restorationPixelGroup(null,40,190,60),0);assert.equal(restorationPixelGroup(null,30,100,220),1);
});

import {restorationFraming} from './story-renderer.js';
test('expansion starts with the card square and ends at exactly the film framing',()=>{
 for(const [w,h] of [[300,180],[390,844],[1094,300]]){
  const scale=Math.min(w/720,h/1280),first=restorationFraming(w,h,0);
  assert(Math.abs(first.size*scale-Math.min(w,h))<1e-8);
  assert.equal(first.y,(1280-first.size)/2);
  assert.deepEqual(restorationFraming(w,h,1),{size:700,y:410});
  const last=restorationFraming(w,h,1-1e-8);assert(Math.abs(last.y-410)<.0001);assert(Math.abs(last.size-700)<.0001);
 }
});

import {restorationPresentation} from './restoration-film.js';
test('visual restoration is faster and docks smoothly while lanterns are still moving',()=>{
 const color=RESTORATION_COLOR_SECONDS/1.3;assert.equal(restorationPresentation(2).filmSeconds,2.6);
 const begin=restorationPresentation(color+.7),middle=restorationPresentation(color+1.45),end=restorationPresentation(color+2.2);
 assert.equal(begin.dock,0);assert(Math.abs(middle.dock-.5)<1e-9);assert.equal(end.dock,1);assert(end.filmSeconds>middle.filmSeconds);assert(end.duration<22.6);
 assert.equal(restorationPresentation(color+2,9).dock,0);
});

import {restorationTransition,restorationEase} from './restoration-film.js';
test('card expansion keeps the island square and follows one continuous screen-space path',()=>{
 for(const viewport of [{w:390,h:844},{w:1280,h:720}]){
  const card={x:30,y:160,w:330,h:210},start=restorationTransition(card,viewport,0),end=restorationTransition(card,viewport,1);
  assert.equal(start.image.size,210);assert.equal(start.image.x,60);assert.equal(start.image.y,0);
  assert.equal(end.x,0);assert.equal(end.y,0);assert.equal(end.w,viewport.w);assert.equal(end.h,viewport.h);
  let previous=start.image.size;
  for(let i=1;i<=100;i++){const p=i/100,m=restorationTransition(card,viewport,p);assert(Math.abs(m.image.size-(210+(end.image.size-210)*p))<1e-8);assert(Math.abs(m.image.size-previous)<5);previous=m.image.size;}
 }
 assert.equal(restorationEase(0),0);assert.equal(restorationEase(1),1);assert.equal(restorationEase(.5),.5);assert(restorationEase(.001)<1e-7);
});
