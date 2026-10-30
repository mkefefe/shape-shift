import test from 'node:test';
import assert from 'node:assert/strict';
import {createAssetReadiness,bindPreparedDialog,initMenuReadiness} from './menu-readiness.js';
import {loadDestination} from './destination-loader.js';

const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const settle=()=>new Promise(resolve=>setImmediate(resolve));

function node(tag='div'){
 const events=new Map();
 return {tagName:tag.toUpperCase(),children:[],dataset:{},open:false,isConnected:true,showCount:0,focusCount:0,hidden:false,
  append(...children){this.children.push(...children);},setAttribute(){},querySelector(query){if(query==='h2')return {textContent:'Test menu'};return {focus:()=>this.focusCount++};},
  addEventListener(type,fn){if(!events.has(type))events.set(type,new Set());events.get(type).add(fn);},removeEventListener(type,fn){events.get(type)?.delete(fn);},
  dispatch(type,event={}){this['on'+type]?.(event);for(const fn of events.get(type)||[])fn(event);},
  showModal(){this.open=true;this.showCount++;},close(){if(!this.open)return;this.open=false;this.dispatch('close');},remove(){this.isConnected=false;}
 };
}
function mockDocument(){const created=[];const doc={baseURI:'https://game.example/',body:node('body'),createElement(tag){const value=node(tag);created.push(value);return value;}};return {doc,created,dialog:()=>created.find(n=>n.tagName==='DIALOG'),buttons:()=>created.filter(n=>n.tagName==='BUTTON')};}
function setGlobal(name,value){const old=globalThis[name];globalThis[name]=value;return ()=>{if(old===undefined)delete globalThis[name];else globalThis[name]=old;};}

test('readiness waits for decoded assets and shares simultaneous canonical requests',async()=>{
 const gate=deferred(),calls=[],restore=setGlobal('document',{baseURI:'https://game.example/'});
 try{const assets=createAssetReadiness(src=>{calls.push(src);return gate.promise;});const first=assets.prepare(['art.webp']),second=assets.prepare(['./art.webp']);await settle();assert.equal(calls.length,1);assert.equal(assets.has(['art.webp']),false);gate.resolve();await Promise.all([first,second]);assert.equal(assets.has(['./art.webp']),true);await assets.prepare(['art.webp']);assert.equal(calls.length,1);}finally{restore();}
});

test('failed decoding is retryable while already decoded assets are reused',async()=>{
 const calls=[];let fail=true;const assets=createAssetReadiness(async src=>{calls.push(src);if(src==='bad.webp'&&fail)throw Error('decode failed');});
 await assert.rejects(assets.prepare(['bad.webp','good.webp']),/decode failed/);assert.equal(assets.has(['good.webp']),true);assert.equal(assets.has(['bad.webp']),false);fail=false;await assets.prepare(['bad.webp','good.webp']);assert.equal(assets.has(['bad.webp','good.webp']),true);assert.deepEqual(calls,['bad.webp','good.webp','bad.webp']);
});

test('asset preparation caps concurrent decode work at two jobs',async()=>{
 let active=0,peak=0;const assets=createAssetReadiness(async()=>{active++;peak=Math.max(peak,active);await settle();active--;});await assets.prepare(['a','b','c','d']);assert.equal(peak,2);
});

test('prepared dialog stays closed until assets and extra preparation finish',async()=>{
 const assetGate=deferred(),extraGate=deferred(),dialog=node('dialog'),assets=createAssetReadiness(()=>assetGate.promise);let loads=0;
 bindPreparedDialog(dialog,{sources:()=>['menu.webp'],assets,extra:()=>extraGate.promise,load:async(title,prepare)=>{loads++;await prepare();return true;}});
 dialog.showModal();dialog.showModal();await settle();assert.equal(loads,1);assert.equal(dialog.open,false);assetGate.resolve();await settle();assert.equal(dialog.open,false);extraGate.resolve();await settle();assert.equal(dialog.showCount,1);assert.equal(dialog.focusCount,1);
});

test('dialog awaits actual DOM image paint readiness and rechecks replaced images',async()=>{
 let gate=deferred(),painted=false,paintCalls=0;const dialog=node('dialog');
 bindPreparedDialog(dialog,{sources:()=>['cached.webp'],assets:{has:()=>true,prepare:async()=>{}},paintReady:()=>painted,paint:async()=>{paintCalls++;await gate.promise;painted=true;},load:async(title,prepare)=>{await prepare();return true;}});
 dialog.showModal();await settle();assert.equal(dialog.open,false);assert.equal(paintCalls,1);gate.resolve();await settle();assert.equal(dialog.open,true);dialog.close();painted=false;gate=deferred();dialog.showModal();await settle();assert.equal(dialog.open,false);assert.equal(paintCalls,2);gate.resolve();await settle();assert.equal(dialog.open,true);
});

test('closing a pending dialog aborts its loader and prevents a late reopen',async()=>{
 const gate=deferred(),dialog=node('dialog');let signal;bindPreparedDialog(dialog,{sources:()=>['menu.webp'],assets:{has:()=>false,prepare:()=>gate.promise},load:async(title,prepare,options)=>{signal=options.signal;await prepare();return true;}});
 dialog.showModal();dialog.close();assert.equal(signal.aborted,true);gate.resolve();await settle();assert.equal(dialog.showCount,0);
});

test('cancelled loading can be opened again without the cancelled attempt winning',async()=>{
 const dialog=node('dialog'),gates=[deferred(),deferred()];let calls=0;bindPreparedDialog(dialog,{sources:()=>['menu.webp'],assets:{has:()=>false},load:()=>gates[calls++].promise});
 dialog.showModal();dialog.close();dialog.showModal();gates[0].resolve(true);await settle();assert.equal(dialog.showCount,0);gates[1].resolve(true);await settle();assert.equal(dialog.showCount,1);
});

test('a failed extra preparation is not bypassed when reopening cached artwork',async()=>{
 let ready=false,extraCalls=0;const dialog=node('dialog'),assets={has:()=>ready,prepare:async()=>{ready=true;}};
 bindPreparedDialog(dialog,{sources:()=>['menu.webp'],assets,extra:async()=>{extraCalls++;if(extraCalls===1)throw Error('skin unavailable');},load:async(title,prepare)=>{try{await prepare();return true;}catch{return false;}}});
 dialog.showModal();await settle();assert.equal(dialog.open,false);dialog.showModal();await settle();assert.equal(extraCalls,2);assert.equal(dialog.open,true);
});

test('destination loader waits for preparation and removes itself on success',async()=>{
 const env=mockDocument(),restore=setGlobal('document',env.doc),gate=deferred();try{let complete=false;const result=loadDestination('Shop',()=>gate.promise).then(v=>{complete=true;return v;});await settle();assert.equal(complete,false);assert.equal(env.dialog().open,false);gate.resolve();assert.equal(await result,true);assert.equal(env.dialog().isConnected,false);}finally{restore();}
});

test('destination loader exposes retry after failure and succeeds on retry',async()=>{
 const env=mockDocument(),restore=setGlobal('document',env.doc);let calls=0;try{const result=loadDestination('Shop',async()=>{if(++calls===1)throw Error('offline');});await settle();const retry=env.buttons()[0];assert.equal(retry.hidden,false);retry.onclick();assert.equal(await result,true);assert.equal(calls,2);}finally{restore();}
});

test('Back, Escape and abort cancel loading; late completion cannot reopen it',async()=>{
 for(const cancel of ['back','escape','abort']){const env=mockDocument(),restore=setGlobal('document',env.doc),gate=deferred(),controller=new AbortController();try{const result=loadDestination('Shop',()=>gate.promise,{signal:controller.signal});if(cancel==='back')env.buttons()[1].onclick();else if(cancel==='escape')env.dialog().dispatch('cancel',{preventDefault(){}});else controller.abort();assert.equal(await result,false);gate.resolve();await settle();assert.equal(env.dialog().showCount,0);assert.equal(env.dialog().isConnected,false);}finally{restore();}}
});

test('programmatic close resolves cancellation and cannot strand the next screen',async()=>{
 const env=mockDocument(),restore=setGlobal('document',env.doc),gate=deferred();try{let result;loadDestination('Shop',()=>gate.promise).then(value=>result=value);env.dialog().close();await settle();assert.equal(result,false);assert.equal(env.dialog().isConnected,false);gate.resolve();await settle();assert.equal(result,false);}finally{restore();}
});

test('already aborted destinations do not open or start preparation',async()=>{
 const env=mockDocument(),restore=setGlobal('document',env.doc),controller=new AbortController();controller.abort();try{let calls=0;assert.equal(await loadDestination('Shop',()=>calls++,{signal:controller.signal}),false);assert.equal(calls,0);assert.equal(env.created.length,0);}finally{restore();}
});

test('home readiness prepares selected world and frame density, then promotes images',async()=>{
 const sources=[],image={dataset:{src:'assets/test-deferred-home.webp'},loading:'lazy',getAttribute:()=>null,decode:async()=>{}};let world='garden';
 const root={querySelector:selector=>({querySelectorAll:()=>selector==='#home'?[image]:[]}),getElementById:()=>null};
 const restoreImage=setGlobal('Image',class{set src(value){sources.push(value);}async decode(){}}),restoreDpr=setGlobal('devicePixelRatio',2.5);
 try{const menus=initMenuReadiness({root,getProfile:()=>({equipped:{background:world,frame:'ice'}})});assert.equal(menus.homeReady(),false);await menus.prepareHome();assert.equal(menus.homeReady(),true);assert.ok(sources.includes('assets/delivery-v144/home-world-v101.webp'));assert.ok(sources.includes('assets/avatar-frame-ice-3x-v49462.webp'));assert.equal(sources.some(src=>src.includes('avatar-frame-gold')),false);assert.equal(image.src,'assets/test-deferred-home.webp');assert.equal(image.loading,'eager');world='moon';assert.equal(menus.homeReady(),false);await menus.prepareHome();assert.ok(sources.includes('assets/worlds-v12.webp'));assert.equal(menus.homeReady(),true);}finally{restoreImage();restoreDpr();}
});

test('home waits for actual floating avatar decode, even with complete cached image metadata',async()=>{
 const gate=deferred();let decodeCalls=0,finished=false;
 const makeImage=decode=>({dataset:{},src:'assets/avatars-v7.webp',currentSrc:'assets/avatars-v7.webp',getAttribute:()=> 'assets/avatars-v7.webp',complete:true,naturalWidth:1254,loading:'lazy',decode});
 let image=makeImage(()=>{decodeCalls++;return gate.promise;});
 const root={querySelector:selector=>({querySelectorAll:()=>selector==='#profile-open'?[image]:[]}),getElementById:()=>null};
 const restore=setGlobal('Image',class{async decode(){}});
 try{const menus=initMenuReadiness({root,getProfile:()=>({equipped:{background:'garden',frame:'none'}})});const pending=menus.prepareHome().then(()=>finished=true);await settle();assert.equal(decodeCalls,1);assert.equal(image.loading,'eager');assert.equal(finished,false);assert.equal(menus.homeReady(),false);gate.resolve();await pending;assert.equal(menus.homeReady(),true);
  const replacement=deferred();image=makeImage(()=>replacement.promise);assert.equal(menus.homeReady(),false);const next=menus.prepareHome();await settle();assert.equal(menus.homeReady(),false);replacement.resolve();await next;assert.equal(menus.homeReady(),true);
 }finally{restore();}
});

test('failed actual DOM avatar decode stays unready and can be retried',async()=>{
 let fail=true,calls=0;const image={dataset:{},currentSrc:'assets/avatars-v7.webp',getAttribute:()=> 'assets/avatars-v7.webp',loading:'lazy',async decode(){calls++;if(fail)throw Error('DOM decode failed');}};
 const root={querySelector:selector=>({querySelectorAll:()=>selector==='#profile-open'?[image]:[]}),getElementById:()=>null};const restore=setGlobal('Image',class{async decode(){}});
 try{const menus=initMenuReadiness({root,getProfile:()=>({equipped:{background:'garden',frame:'none'}})});await assert.rejects(menus.prepareHome(),/DOM decode failed/);assert.equal(menus.homeReady(),false);fail=false;await menus.prepareHome();assert.equal(calls,2);assert.equal(menus.homeReady(),true);}finally{restore();}
});


test('startup can prepare a menu without displaying it, then open it immediately',async()=>{
 const gate=deferred(),dialog=node('dialog');let painted=false,loads=0,extras=0;
 const assets=createAssetReadiness(()=>gate.promise);
 const prepared=bindPreparedDialog(dialog,{sources:()=>['startup-menu.webp'],assets,extra:async()=>{extras++;},paint:async()=>{painted=true;},paintReady:()=>painted,load:()=>{loads++;}});
 const work=prepared.prepare();await settle();assert.equal(dialog.open,false);assert.equal(painted,false);gate.resolve();await work;assert.equal(dialog.open,false);dialog.showModal();assert.equal(dialog.open,true);assert.equal(loads,0);assert.equal(extras,1);
});

test('full startup prepares hidden home and menu DOM images before first tutorial',async()=>{
 const gate=deferred();let decoded=false,skinCalls=0,finished=false;
 const image={dataset:{src:'assets/startup-dialog.webp'},loading:'lazy',getAttribute:()=>null,decode:async()=>{await gate.promise;decoded=true;}};
 const dialog=node('dialog');dialog.id='shop-dialog';dialog.querySelectorAll=()=>[image];
 const root={querySelector:()=>({querySelectorAll:()=>[]}),getElementById:id=>id==='shop-dialog'?dialog:null};
 const restore=setGlobal('Image',class{async decode(){}});
 try{const menus=initMenuReadiness({root,getProfile:()=>({equipped:{background:'garden'}}),prepareSkins:async()=>{skinCalls++;}});const work=menus.prepareAll().then(()=>{finished=true;});await settle();assert.equal(finished,false);assert.equal(dialog.open,false);assert.equal(image.loading,'eager');assert.equal(image.src,'assets/startup-dialog.webp');gate.resolve();await work;assert.equal(decoded,true);assert.equal(menus.homeReady(),true);assert(skinCalls>0);dialog.showModal();assert.equal(dialog.open,true);}finally{restore();}
});

test('leaderboard opens without waiting for slow or failed player portraits',async()=>{
 let portraitDecodes=0;const requested=[];
 const portrait={dataset:{},loading:'lazy',getAttribute:()=> 'https://scores.example/slow-photo',closest:()=>({}),decode:async()=>{portraitDecodes++;throw Error('portrait unavailable');}};
 const dialog=node('dialog');dialog.id='leaderboard-dialog';dialog.querySelectorAll=()=>[portrait];
 const root={querySelector:()=>({querySelectorAll:()=>[]}),getElementById:id=>id===dialog.id?dialog:null};
 const restore=setGlobal('Image',class{set src(value){requested.push(value);}async decode(){}});
 try{
  const menus=initMenuReadiness({root,getProfile:()=>({equipped:{}})});await menus.prepareAll();dialog.showModal();
  assert.equal(dialog.open,true);assert.equal(portraitDecodes,0);assert.equal(requested.includes('https://scores.example/slow-photo'),false);
 }finally{restore();}
});

test('menu images replaced during asset loading are promoted before hidden decoding',async()=>{
 let decoded=false;
 const replacement={dataset:{src:'assets/new-menu-image.webp'},loading:'lazy',getAttribute:()=>null,async decode(){assert.equal(this.loading,'eager');assert.equal(this.src,'assets/new-menu-image.webp');decoded=true;}};
 let image={dataset:{src:'assets/old-menu-image.webp'},loading:'lazy',getAttribute:()=>null,decode:async()=>{throw Error('stale image decoded');}};
 const dialog=node('dialog');dialog.id='settings-dialog';dialog.querySelectorAll=()=>[image];
 const root={querySelector:()=>({querySelectorAll:()=>[]}),getElementById:id=>id===dialog.id?dialog:null};
 const restore=setGlobal('Image',class{set src(value){this.source=value;}async decode(){if(this.source==='assets/old-menu-image.webp')image=replacement;}});
 try{const menus=initMenuReadiness({root,getProfile:()=>({equipped:{}})});await menus.prepareAll();assert.equal(decoded,true);}finally{restore();}
});

test('Back on the real destination loader cannot open the pending leaderboard later',async()=>{
 const env=mockDocument(),restore=setGlobal('document',env.doc),gate=deferred(),dialog=node('dialog');
 try{
  bindPreparedDialog(dialog,{sources:()=>['avatar.webp'],assets:createAssetReadiness(()=>gate.promise)});
  dialog.showModal();await settle();env.buttons()[1].onclick();await settle();
  assert.equal(dialog.open,false);gate.resolve();await settle();assert.equal(dialog.showCount,0);
  dialog.showModal();await settle();assert.equal(dialog.open,true);
 }finally{restore();}
});

