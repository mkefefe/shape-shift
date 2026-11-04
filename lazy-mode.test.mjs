import test from 'node:test';
import assert from 'node:assert/strict';
import {createLazyMode} from './lazy-mode.js';

test('optional mode loads only on demand and concurrent taps open once',async()=>{
 let imports=0,opens=0,ready=0,release;
 const mode=createLazyMode(async()=>{imports++;await new Promise(resolve=>release=resolve);return {open(){opens++;}};},{onReady:()=>ready++});
 assert.equal(imports,0);
 const first=mode.open(),second=mode.open();
 await Promise.resolve();assert.equal(imports,1);release();
 await Promise.all([first,second]);
 assert.equal(opens,1);assert.equal(ready,1);
 await mode.open();assert.equal(imports,1);assert.equal(opens,2);
});

test('a failed optional load does not poison the next attempt',async()=>{
 let attempts=0,opens=0;
 const mode=createLazyMode(async()=>{if(++attempts===1)throw Error('offline');return {open(){opens++;}};});
 await assert.rejects(mode.open(),/offline/);
 await mode.open();assert.equal(attempts,2);assert.equal(opens,1);
});

test('a mode opening failure remains retryable without initializing twice',async()=>{
 let imports=0,opens=0;
 const mode=createLazyMode(()=>{imports++;return {open(){if(++opens===1)throw Error('art unavailable');}};});
 await assert.rejects(mode.open(),/art unavailable/);
 await mode.open();assert.equal(imports,1);assert.equal(opens,2);
});

test('closing the Games menu during download does not open the mode afterward',async()=>{
 let wanted=true,release,opens=0;
 const mode=createLazyMode(async()=>{await new Promise(resolve=>release=resolve);return {open(){opens++;}};});
 const attempt=mode.open({shouldOpen:()=>wanted});await Promise.resolve();wanted=false;release();
 assert.equal(await attempt,false);assert.equal(opens,0);
 await mode.open();assert.equal(opens,1);
});

test('the Games menu stays open through asset preparation and cancellation is rechecked',async()=>{
 let wanted=true,release,opens=0,prepared=0;
 const mode=createLazyMode(()=>({prepare(){prepared++;return new Promise(resolve=>release=resolve);},open(){opens++;}}));
 const attempt=mode.open({shouldOpen:()=>wanted});
 while(!release)await Promise.resolve();
 assert.equal(opens,0);wanted=false;release();
 assert.equal(await attempt,false);assert.equal(prepared,1);assert.equal(opens,0);
});

test('failed assets stay on the hub and retry without reinitializing the game',async()=>{
 let imports=0,attempts=0,opens=0;
 const mode=createLazyMode(()=>{imports++;return {prepare(){if(++attempts===1)throw Error('image offline');},open(){opens++;}};});
 await assert.rejects(mode.open(),/image offline/);assert.equal(opens,0);
 await mode.open();assert.equal(opens,1);assert.equal(imports,1);assert.equal(attempts,2);
});

test('launch lock covers preparation and the complete board handoff',async()=>{
 let release,opens=0;
 const mode=createLazyMode(()=>({prepare:async()=>{},open(){opens++;return new Promise(resolve=>release=resolve);}}));
 const first=mode.open();while(!release)await Promise.resolve();
 const second=mode.open();assert.equal(opens,1);release();await Promise.all([first,second]);assert.equal(opens,1);
});

test('startup prepare includes mode assets and later opening performs no preparation again',async()=>{
 let release,imports=0,assets=0,opens=0,ready=0;
 const mode=createLazyMode(()=>{imports++;return {prepare(){assets++;return new Promise(resolve=>release=resolve);},open(){opens++;}};},{onReady:()=>ready++});
 const first=mode.prepare(),second=mode.prepare();assert.equal(first,second);
 while(!release)await Promise.resolve();assert(!mode.isReady());assert.equal(ready,0);assert.equal(opens,0);
 release(true);await first;assert(mode.isReady());assert.equal(ready,1);
 await mode.open();await mode.open();assert.equal(imports,1);assert.equal(assets,1);assert.equal(opens,2);
});

test('a false readiness result cannot expose an unprepared mode',async()=>{
 let attempts=0,opens=0;const mode=createLazyMode(()=>({prepare:()=>++attempts>1,open:()=>opens++}));
 await assert.rejects(mode.open(),/assets unavailable/);assert(!mode.isReady());assert.equal(opens,0);
 await mode.prepare();assert(mode.isReady());assert.equal(opens,0);await mode.open();assert.equal(opens,1);
});
