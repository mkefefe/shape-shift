import test from 'node:test';
import assert from 'node:assert/strict';
import {restorationFilmFrame,restorationPixelGroup} from './restoration-film.js';
test('every island has exactly four complete restoration cycles before lanterns',()=>{
 for(let island=0;island<10;island++){
  for(let i=0;i<4;i++){const f=restorationFilmFrame(i*4.4,island);assert.equal(f.kind,'restore');assert.equal(f.index,i);assert(Math.abs(f.time)<1e-9);assert.equal(restorationFilmFrame(i*4.4+4.39,island).index,i);}
  assert.equal(restorationFilmFrame(17.6,island).kind,'lanterns');
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
