import {CORE_STARTUP_ASSETS,FULL_STARTUP_ASSETS,BACKGROUND_ASSETS,OPENING_ASSETS,HOME_STARTUP_ASSETS} from './startup-plan.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {loadStartupAssets,loadBackgroundAssets,prepareBootstrap,createStartupReadiness} from './startup-loader.js';
import {prepareMenuImage,awaitReady,createPreparationQueue} from './menu-preload.js';
import {STARTUP_ASSETS} from './startup-assets.js';
import {observeDeferredImages} from './deferred-images.js';
import {createBattlePreloader} from './battle-menu.js';
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

test('startup includes live mode, map and cosmetic artwork without decoding archive media',()=>{
 assert.deepEqual(new Set([...FULL_STARTUP_ASSETS,...BACKGROUND_ASSETS]),new Set(STARTUP_ASSETS));
 assert.deepEqual(FULL_STARTUP_ASSETS.slice(0,CORE_STARTUP_ASSETS.length),CORE_STARTUP_ASSETS);
 for(const source of ['assets/delivery-v144/settings-v351.webp','assets/delivery-v144/quests-v351.webp','assets/pause-v30.webp'])assert(FULL_STARTUP_ASSETS.includes(source));
 for(const source of ['assets/slice-galaxy-v49476.webp','assets/piano-sky-v281.webp','assets/skin-classic-wrapped-v318.webp','assets/drop-garden-v491.webp']){assert(FULL_STARTUP_ASSETS.includes(source));assert(!BACKGROUND_ASSETS.includes(source));}
 assert.equal(new Set(FULL_STARTUP_ASSETS).size,FULL_STARTUP_ASSETS.length);
});
test('startup waits for the complete live art set before reporting completion',async()=>{
 let release,finished=false;const waiting=new Promise(resolve=>{release=resolve;}),sources=[],delayed='assets/delivery-v144/settings-v351.webp';
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

test('the small welcome screen leads into the complete live session preparation',()=>{
 assert(OPENING_ASSETS.length<=5);
 for(const asset of ['assets/delivery-v144/home-world-v101.webp','assets/mode-cards-v101.webp']){
  assert(FULL_STARTUP_ASSETS.includes(asset));assert(HOME_STARTUP_ASSETS.includes(asset));
 }
 assert(!FULL_STARTUP_ASSETS.some(src=>src.includes('/music/')),'audio readiness owns its decoded/streaming resources');
 assert(FULL_STARTUP_ASSETS.some(src=>src.includes('skin-')));
});

test('all reachable destinations are included while superseded atlases stay archived',()=>{
 for(const asset of ['assets/map-meadow-v212.webp','assets/worlds-v12.webp','assets/achievement-medals-v208.webp','assets/hub-drop-v291.webp','assets/hub-slice-v291.webp','assets/hub-piano-v292.webp','assets/battle-lock-v175.png']){
  assert(FULL_STARTUP_ASSETS.includes(asset),asset);
 }
 for(const asset of ['assets/adventure-map-v101.webp','assets/map-route-v102.webp','assets/frames-v12.webp'])assert(!FULL_STARTUP_ASSETS.includes(asset));
 assert(HOME_STARTUP_ASSETS.includes('assets/delivery-v144/battle-icon-v133.webp'));
});

test('session readiness deduplicates callers, caps active groups and reports actual completions',async()=>{
 let active=0,maximum=0,calls=0;const gates=[],progress=[];
 const session=createStartupReadiness(Array.from({length:5},(_,i)=>({id:'mode-'+i,prepare:()=>new Promise(resolve=>{calls++;active++;maximum=Math.max(maximum,active);gates.push(()=>{active--;resolve(true);});})})),{concurrency:2});
 const first=session.prepare((done,total)=>progress.push([done,total])),second=session.prepare();
 assert.equal(session.isReady(),false);assert.equal(calls,2);assert(progress.every(([done])=>done===0));
 while(gates.length||calls<5){gates.shift()?.();await new Promise(resolve=>setImmediate(resolve));}
 await Promise.all([first,second]);assert.equal(maximum,2);assert.equal(calls,5);assert(session.isReady());assert.deepEqual(progress.at(-1),[5,5]);
 await session.prepare();assert.equal(calls,5);
});

test('failed or false preparations block play and retry only the failed group',async()=>{
 let attempts=0,good=0;
 const session=createStartupReadiness([{id:'cached',prepare:async()=>{good++;}},{id:'retry',prepare:async()=>++attempts>1}]);
 await assert.rejects(session.prepare(),/could not be prepared/);assert(!session.isReady());assert.equal(good,1);
 await session.prepare();assert(session.isReady());assert.equal(good,1);assert.equal(attempts,2);
});

test('a slow final mode keeps readiness below completion even after all other work finishes',async()=>{
 let release,finished=false;const updates=[];
 const session=createStartupReadiness([{id:'art',prepare:async()=>true},{id:'mode',prepare:()=>new Promise(resolve=>release=resolve)}]);
 const work=session.prepare((done,total)=>updates.push([done,total])).then(()=>{finished=true;});
 await new Promise(resolve=>setImmediate(resolve));assert.equal(finished,false);assert(!session.isReady());assert(!updates.some(([done,total])=>done===total));
 release(true);await work;assert(session.isReady());
});

test('shared image queue limits work across callers and releases failed slots',async()=>{
 const queue=createPreparationQueue(2),gates=[];let active=0,peak=0;
 const jobs=Array.from({length:6},(_,i)=>queue(()=>new Promise((resolve,reject)=>{active++;peak=Math.max(peak,active);gates.push(()=>{active--;i===1?reject(Error('decode failed')):resolve(i);});})));
 const settled=Promise.allSettled(jobs);await new Promise(resolve=>setImmediate(resolve));assert.equal(gates.length,2);
 for(let done=0;done<6;done++){gates.shift()();await new Promise(resolve=>setImmediate(resolve));}
 const results=await settled;assert.equal(peak,2);assert.equal(results.filter(r=>r.status==='rejected').length,1);assert.equal(results.filter(r=>r.status==='fulfilled').length,5);
});

test('Battle preparation waits for the child ready signal and reuses the retained frame',async()=>{
 let loads=0,unloads=0,done=false;const battle=createBattlePreloader({load:()=>loads++,unload:()=>unloads++});
 const one=battle.prepare(),two=battle.prepare();assert.equal(one,two);one.then(()=>{done=true;});
 await Promise.resolve();assert(!done);assert(!battle.isReady());assert.equal(loads,1);
 battle.complete(true);await one;assert(battle.isReady());assert.equal(unloads,0);
 await battle.prepare();assert.equal(loads,1);
});

test('Battle preparation failures discard the incomplete child and allow a clean retry',async()=>{
 let loads=0,unloads=0;const battle=createBattlePreloader({load:()=>loads++,unload:()=>unloads++});
 const first=battle.prepare();battle.complete(false);await assert.rejects(first,/assets unavailable/);
 assert(!battle.isReady());assert.equal(unloads,1);const retry=battle.prepare();assert.equal(loads,2);
 battle.complete(true);await retry;assert(battle.isReady());
});

test('a silent Battle child times out instead of releasing gameplay controls',async()=>{
 let unloaded=0;const battle=createBattlePreloader({load(){},unload:()=>unloaded++,timeout:5});
 await assert.rejects(battle.prepare(),/timed out/);assert(!battle.isReady());assert.equal(unloaded,1);
});

test('opening, audio and save initialization overlap, but first-play warmup follows successful opening',async()=>{
 let release,finished=false,warmed=false;const waiting=new Promise(r=>release=r),started=[];
 const job=prepareBootstrap({initialize:()=>{started.push('save');return waiting;},loadAudio:()=>{started.push('audio');return waiting;},opening:()=>{started.push('opening');return waiting;},warm:()=>{warmed=true;}}).then(()=>{finished=true;});
 assert.deepEqual(started,['save','audio','opening']);assert.equal(warmed,false);assert.equal(finished,false);
 release();await job;assert.equal(finished,true);assert.equal(warmed,true);
});

test('a failed saved-game load cannot pass the boot barrier or start the game',async()=>{
 let warmed=false;
 await assert.rejects(prepareBootstrap({initialize:async()=>{throw Error('save offline');},loadAudio:async()=>{},opening:async()=>{},warm:()=>{warmed=true;}}),/save offline/);
 assert.equal(warmed,false);
});

test('concurrent warmup and startup share an in-flight resource, including URL aliases',async()=>{
 let release,calls=0;const gate=new Promise(r=>release=r),progress=[];
 const prepareImage=()=>{calls++;return gate;};
 const warm=loadStartupAssets(()=>{},{assets:['./test-shared-boot.webp'],prepareImage});
 const foreground=loadStartupAssets(n=>progress.push(n),{assets:['test-shared-boot.webp'],prepareImage});
 await new Promise(resolve=>setImmediate(resolve));assert.equal(calls,1);assert.deepEqual(progress,[]);
 release();await Promise.all([warm,foreground]);assert.deepEqual(progress,[1]);
});

test('the game font uses the font set request instead of downloading a second copy',async()=>{
 const original=globalThis.document;let fontCalls=0,fetchCalls=0;
 globalThis.document={fonts:{load:async font=>{assert.equal(font,'900 20px Nunito');fontCalls++;return [{}];}}};
 try{await loadStartupAssets(()=>{},{assets:['font-request-test/Nunito.ttf'],fetcher:async()=>{fetchCalls++;throw Error('duplicate fetch');}});assert.equal(fontCalls,1);assert.equal(fetchCalls,0);}finally{globalThis.document=original;}
});

test('retained images share relative and absolute URL aliases without a second decode',async()=>{
 const originalImage=globalThis.Image,originalDocument=globalThis.document;let calls=0;
 globalThis.document={baseURI:'https://game.example/preview/'};
 globalThis.Image=class{async decode(){calls++;}};
 try{const one=await prepareMenuImage('test-canonical.webp'),two=await prepareMenuImage('https://game.example/preview/test-canonical.webp');assert.equal(one,two);assert.equal(calls,1);}finally{globalThis.Image=originalImage;globalThis.document=originalDocument;}
});
