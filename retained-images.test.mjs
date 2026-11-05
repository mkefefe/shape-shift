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
