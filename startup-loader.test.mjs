import {CORE_STARTUP_ASSETS,FULL_STARTUP_ASSETS,BACKGROUND_ASSETS} from './startup-plan.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {loadStartupAssets,loadBackgroundAssets} from './startup-loader.js';
import {prepareMenuImage,awaitReady} from './menu-preload.js';
import {STARTUP_ASSETS} from './startup-assets.js';
import {observeDeferredImages} from './deferred-images.js';
test('startup awaits decoded images and completely downloaded audio',async()=>{
 let release,done=false;const gate=new Promise(r=>release=r),progress=[];
 const loading=loadStartupAssets((n,total)=>progress.push([n,total]),{assets:['test-delayed.webp','test-audio.ogg'],prepareImage:()=>gate,fetcher:async()=>({ok:true,arrayBuffer:async()=>gate})}).then(()=>done=true);
 await Promise.resolve();assert.equal(done,false);assert.deepEqual(progress,[]);release();await loading;assert.equal(done,true);assert.deepEqual(progress,[[1,2],[2,2]]);
});
test('failed artwork keeps startup blocked and is retried; completed assets are reused',async()=>{
 let failed=true,calls=0;const options={assets:['test-failure.png','test-ready.png'],prepareImage:async src=>{calls++;if(failed&&src==='test-failure.png')throw Error('decode failed');}};
 await assert.rejects(loadStartupAssets(()=>{},options),/decode failed/);assert.equal(calls,2);failed=false;await loadStartupAssets(()=>{},options);assert.equal(calls,3);
});
test('HTTP failures cannot count as loaded assets',async()=>{
 await assert.rejects(loadStartupAssets(()=>{throw Error('must not report progress');},{assets:['test-missing.ogg'],fetcher:async()=>({ok:false})}),/Could not load/);
});
test('image preparation shares pending work, retains success and retries failures',async()=>{
 const original=globalThis.Image;let count=0,fail=true;globalThis.Image=class{constructor(){count++;}async decode(){if(fail)throw Error('offline');}};
 try{const first=prepareMenuImage('test-retained.png');assert.equal(first,prepareMenuImage('test-retained.png'));await assert.rejects(first,/offline/);fail=false;const image=await prepareMenuImage('test-retained.png');assert.equal(await prepareMenuImage('test-retained.png'),image);assert.equal(count,2);}finally{globalThis.Image=original;}
});

test('shared UI blocks startup while mode media is reserved for background preparation',()=>{
 assert.deepEqual(new Set([...FULL_STARTUP_ASSETS,...BACKGROUND_ASSETS]),new Set(STARTUP_ASSETS));
 assert.deepEqual(FULL_STARTUP_ASSETS.slice(0,CORE_STARTUP_ASSETS.length),CORE_STARTUP_ASSETS);
 for(const source of ['assets/music/menu-garden-v49458.ogg','assets/achievement-medals-v208.webp','assets/settings-v351.png'])assert(FULL_STARTUP_ASSETS.includes(source));
 for(const source of ['assets/slice-galaxy-v49476.webp','assets/piano-sky-v281.webp','assets/skin-classic-wrapped-v318.webp','assets/drop-garden-v491.webp']){assert(BACKGROUND_ASSETS.includes(source));assert(!FULL_STARTUP_ASSETS.includes(source));}
 assert.equal(new Set(FULL_STARTUP_ASSETS).size,FULL_STARTUP_ASSETS.length);
});
test('startup waits for shared menus without requesting mode-only assets',async()=>{
 let release,finished=false;const waiting=new Promise(resolve=>{release=resolve;}),sources=[],delayed='assets/settings-v351.png';
 const work=loadStartupAssets(()=>{},{prepareImage:async source=>{sources.push(source);if(source===delayed)await waiting;},fetcher:async source=>{sources.push(source);return {ok:true,arrayBuffer:async()=>new ArrayBuffer(0)};}}).then(()=>{finished=true;});
 await new Promise(resolve=>setImmediate(resolve));assert.equal(finished,false);assert(sources.includes(delayed));assert(!sources.some(src=>BACKGROUND_ASSETS.includes(src)));release();await work;assert.equal(finished,true);assert.deepEqual(new Set(sources),new Set(FULL_STARTUP_ASSETS));
});
test('stalled preparation rejects instead of leaving an endless loading screen',async()=>{
 await assert.rejects(awaitReady(new Promise(()=>{}),'Test artwork',5),/Test artwork timed out/);
 assert.equal(await awaitReady(Promise.resolve('ready'),'Test artwork',5),'ready');
});
test('background work is scheduled after startup and continues past optional failures',async()=>{
 const scheduled=[],calls=[],errors=[];
 const job=loadBackgroundAssets({assets:['optional-broken.webp','optional-good.webp'],schedule:fn=>scheduled.push(fn),paused:()=>false,onError:src=>errors.push(src),fetcher:async(src,options)=>{calls.push(src);assert.equal(options.priority,'low');return {ok:src.includes('good'),arrayBuffer:async()=>new ArrayBuffer(0)};}});
 assert.deepEqual(calls,[]);await scheduled.shift()();await scheduled.shift()();assert.equal(calls.length,2);assert.deepEqual(errors,['optional-broken.webp']);job.stop();
});
test('background loading yields while paused and can be cancelled',async()=>{
 const scheduled=[];let paused=true,calls=0;const job=loadBackgroundAssets({assets:['unused.webp'],schedule:fn=>scheduled.push(fn),paused:()=>paused,fetcher:async()=>{calls++;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(0)};}});
 await scheduled.shift()();assert.equal(calls,0);paused=false;job.stop();await scheduled.shift()();assert.equal(calls,0);
});

test('hidden menu images do not download behind startup; visible images load when revealed',()=>{
 const originalObserver=globalThis.MutationObserver,originalRaf=globalThis.requestAnimationFrame;
 let notify,starting=true,visible=false;
 const image={dataset:{src:'menu.webp'},getClientRects:()=>visible?[{}]:[]};
 const root={documentElement:{classList:{contains:()=>starting}},querySelectorAll:()=>image.dataset.src?[image]:[]};
 globalThis.MutationObserver=class{constructor(callback){notify=callback;}observe(){}};globalThis.requestAnimationFrame=fn=>fn();
 try{observeDeferredImages(root);visible=true;notify();assert.equal(image.src,undefined);starting=false;visible=false;notify();assert.equal(image.src,undefined);visible=true;notify();assert.equal(image.src,'menu.webp');assert.equal(image.dataset.src,undefined);}finally{globalThis.MutationObserver=originalObserver;globalThis.requestAnimationFrame=originalRaf;}
});
