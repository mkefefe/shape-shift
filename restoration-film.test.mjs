import test from 'node:test';
import assert from 'node:assert/strict';
import {restorationFilmFrame,restorationPixelGroup} from './restoration-film.js';
test('one charge precedes four sequential outward beams on every island',()=>{
 for(let island=0;island<10;island++){
  for(const t of [0,.7,1.6,1.99]){const f=restorationFilmFrame(t,island);assert.equal(f.kind,'restore');assert.equal(f.index,0);assert(f.time<0);}
  for(let i=0;i<4;i++){const launch=2+i*3.9,f=restorationFilmFrame(launch,island);assert.equal(f.kind,'restore');assert.equal(f.index,i);assert(Math.abs(f.time)<1e-9);assert.equal(f.chargeShape,2);assert.equal(restorationFilmFrame(launch+3.89,island).index,i);}
  assert.equal(restorationFilmFrame(17.6,island).kind,'lanterns');
  assert(restorationFilmFrame(24,island).time>restorationFilmFrame(23,island).time,'lantern clock keeps moving if the next island loads late');
 }
});
test('only the tenth island proceeds into the ending credits',()=>{
 for(let i=0;i<9;i++)for(let t=17.6;t<=40;t+=.1)assert.equal(restorationFilmFrame(t,i).kind,'lanterns');
 assert.equal(restorationFilmFrame(22.1,9).kind,'credits');assert.equal(restorationFilmFrame(34.6,9).time,25);
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
 const color=17.6/1.3;assert.equal(restorationPresentation(5).filmSeconds,6.5);
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
