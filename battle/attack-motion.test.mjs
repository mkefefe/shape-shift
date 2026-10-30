import test from 'node:test';import assert from 'node:assert/strict';import {attackPosition} from './attack-motion.mjs';
test('attack targets remain in arena and do not repeat consecutively',()=>{for(const [w,h]of [[284,80],[354,180],[444,330]]){let previous=-1;for(let i=0;i<100;i++){const p=attackPosition(w,h,previous);assert.notEqual(p.index,previous);assert(p.x>=33&&p.x<=w-33);assert(p.y>=33&&p.y<=h-33);assert(Math.abs(p.enemyX)<w/2);previous=p.index;}}});

import {cameraAttackMotion,cameraRecoilMotion,ATTACK_PEAK_SCALE} from './attack-motion.mjs';
test('camera lunge preserves warning time and rushes forward only at the end',()=>{
 for(const seconds of [1.6,1,.3,.05]){
  const {keyframes,options,rush}=cameraAttackMotion(seconds);
  assert.equal(options.duration,seconds*1000);
  assert(rush<=200);
  assert(Math.abs((1-keyframes[2].offset)*options.duration-rush)<.0001);
  assert.deepEqual(keyframes.map(k=>k.offset),keyframes.map(k=>k.offset).sort((a,b)=>a-b));
  assert.equal(keyframes.at(-1).transform,`scale(${ATTACK_PEAK_SCALE})`);
  assert(keyframes.every(k=>!k.transform.includes('translate')));
 }
});
test('impact retains peak size before returning and parry recoils immediately',()=>{
 const hit=cameraRecoilMotion('matrix(2.05,0,0,2.05,0,0)',false);
 assert.equal(hit.keyframes[0].transform,'matrix(2.05,0,0,2.05,0,0)');
 assert.equal(hit.keyframes[1].transform,`scale(${ATTACK_PEAK_SCALE})`);
 assert.equal(hit.keyframes.at(-1).transform,'scale(1)');
 assert(hit.options.duration<400);
 const block=cameraRecoilMotion('none',true);
 assert.equal(block.keyframes[1].transform,'scale(.86)');
 assert.equal(block.options.duration,300);
});
