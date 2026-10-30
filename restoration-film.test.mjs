import test from 'node:test';
import assert from 'node:assert/strict';
import {restorationFilmFrame,restorationPixelGroup} from './restoration-film.js';
test('every island has exactly four complete restoration cycles before lanterns',()=>{
 for(let island=0;island<10;island++){
  for(let i=0;i<4;i++){const f=restorationFilmFrame(i*5,island);assert.equal(f.kind,'restore');assert.equal(f.index,i);assert.equal(f.time,0);assert.equal(restorationFilmFrame(i*5+4.99,island).index,i);}
  assert.equal(restorationFilmFrame(20,island).kind,'lanterns');
 }
});
test('only the tenth island proceeds into the ending credits',()=>{
 for(let i=0;i<9;i++)for(let t=20;t<=40;t+=.1)assert.equal(restorationFilmFrame(t,i).kind,'lanterns');
 assert.equal(restorationFilmFrame(24.5,9).kind,'credits');assert.equal(restorationFilmFrame(37,9).time,25);
});
test('the original island preserves authored object masks and covers all four districts',()=>{
 assert.equal(restorationPixelGroup(10),0);assert.equal(restorationPixelGroup(30),0);assert.equal(restorationPixelGroup(40),0);
 assert.equal(restorationPixelGroup(25),1);assert.equal(restorationPixelGroup(50),2);assert.equal(restorationPixelGroup(70),2);assert.equal(restorationPixelGroup(100),3);
 assert.equal(restorationPixelGroup(null,40,190,60),0);assert.equal(restorationPixelGroup(null,30,100,220),1);
});
