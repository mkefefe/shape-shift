import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeMenuImage} from './menu-preload.js';
test('decoded image is reused until its source changes',async()=>{
 let calls=0;const image={src:'garden.webp',decode:async()=>{calls++;}};
 await Promise.all([decodeMenuImage(image),decodeMenuImage(image)]);await decodeMenuImage(image);assert.equal(calls,1);
 image.src='moon.webp';await decodeMenuImage(image);assert.equal(calls,2);
});
test('failed decode can retry without discarding successful images',async()=>{
 let calls=0;const image={src:'garden.webp',decode:async()=>{if(++calls===1)throw Error('offline');}};
 await assert.rejects(decodeMenuImage(image),/offline/);await decodeMenuImage(image);await decodeMenuImage(image);assert.equal(calls,2);
});

test('map retains all fifty painted sections across visits without another decode or draw',async()=>{
 const {createMapScenery}=await import('./map-scenery.js');let loads=0,draws=0,serial=0;
 const doc={createElement(){return {id:++serial,setAttribute(){},getContext(){return {drawImage(){draws++;},createLinearGradient(){return {addColorStop(){}};},fillRect(){}};}};}};
 const map=createMapScenery({document:doc,load:async()=>{loads++;return {};}});
 await Promise.all([map.prepare(),map.prepare()]);const first=map.get(0),last=map.get(49);await map.prepare();
 assert.equal(map.get(0),first);assert.equal(map.get(49),last);assert.notEqual(first,last);assert.equal(loads,1);assert.equal(draws,50);
});
