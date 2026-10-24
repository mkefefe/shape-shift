import test from 'node:test';
import assert from 'node:assert/strict';
import {showStoryScene} from './story-scene.js';
import {STORY_SCENES} from './story-renderer.js';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function fixture({duration=.3,load=async()=>({}),audio=false,rejectAudio=()=>false}={}){
 const frames=new Map(),elements=[],draws=[];let frame=0,time=0,paused=false;
 class Element extends EventTarget{
  constructor(tag){super();this.tagName=tag;this.dataset={};this.children=[];this.isConnected=false;this.open=false;this.paused=true;this.currentTime=0;this.readyState=1;this.hidden=false;}
  setAttribute(){} removeAttribute(){} append(...children){for(const e of children){this.children.push(e);e.isConnected=true;}} remove(){this.isConnected=false;} showModal(){this.open=true;} close(){this.open=false;this.dispatchEvent(new Event('close'));} focus(){doc.activeElement=this;} getContext(){return{};} load(){} play(){this.paused=false;return rejectAudio()?Promise.reject(Error('gesture required')):Promise.resolve();} pause(){this.paused=true;}
 }
 const view=new EventTarget(),doc=new EventTarget();
 const platform={get paused(){return paused;},now:()=>time,requestAnimationFrame:fn=>{const id=++frame;frames.set(id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id),setTimeout,clearTimeout,registerMedia:()=>()=>{}};
 Object.assign(view,{performance:{now:()=>time},requestAnimationFrame:platform.requestAnimationFrame,cancelAnimationFrame:platform.cancelAnimationFrame,matchMedia:()=>({matches:false})});
 Object.assign(doc,{defaultView:view,hidden:false,createElement:tag=>{const e=new Element(tag);elements.push(e);return e;}});doc.body=new Element('body');doc.activeElement=new Element('button');doc.activeElement.isConnected=true;const previous=doc.activeElement;
 globalThis.window={ShapeShiftPlatform:platform};
 const renderer={scenes:{ending:{duration,title:'Finale',audio:audio?'story-ending.ogg':''}},load,draw:(_ctx,_a,_scene,t,options)=>draws.push({t,options})};
 return{doc,view,draws,previous,elements,get dialog(){return elements.find(e=>e.tagName==='dialog');},get button(){return elements.find(e=>e.className==='story-scene-sound');},get frames(){return frames.size;},get sound(){return elements.find(e=>e.tagName==='audio');},launch:options=>showStoryScene({scene:'ending',document:doc,volume:audio?1:0,effectsVolume:0,...options},renderer),tick(ms=100){time+=ms;const ready=[...frames.values()];frames.clear();for(const fn of ready)fn(time);},pause(value){paused=value;doc.hidden=value;doc.dispatchEvent(new Event('visibilitychange'));}};
}

test('one Restore island click plays a complete finale without a second charge prompt',async()=>{
 const f=fixture();let calls=0;const run=f.launch({autoplay:true,done:()=>calls++});await flush();
 assert.equal(f.dialog.dataset.stage,'revealing');assert.equal(f.button.hidden,true);assert.equal(f.draws[0].t,0);
 for(let n=0;n<5;n++)f.tick();
 assert.equal(f.dialog.dataset.stage,'complete');assert.equal(f.draws.at(-1).t,.3);assert.equal(f.button.textContent,'Tap to continue');assert.equal(calls,0);
 f.button.dispatchEvent(new Event('click',{cancelable:true}));assert.deepEqual(await run,{completed:true,skipped:false,returnToMap:true});
 assert.equal(calls,1);assert.equal(f.dialog.isConnected,false);assert.equal(f.frames,0);assert.equal(f.doc.activeElement,f.previous);
});

test('automatic post-results presentation waits for one tap, then keeps playing through further taps',async()=>{
 const f=fixture({duration:.7}),run=f.launch();await flush();for(let n=0;n<10;n++)f.tick();assert.equal(f.draws.at(-1).t,0);assert.equal(f.dialog.dataset.stage,'waiting');assert.equal(f.button.textContent,'Restore island');
 f.button.dispatchEvent(new Event('click',{cancelable:true}));f.tick();f.tick();const before=f.draws.at(-1).t;f.dialog.dispatchEvent(new Event('click',{cancelable:true}));f.tick();assert(f.draws.at(-1).t>before);assert.equal(f.dialog.dataset.stage,'revealing');run.cancel();await run;
});

test('credits remain in the same finale and use the existing complete soundtrack',()=>{
 assert.equal(STORY_SCENES.ending.duration,25);assert.equal(STORY_SCENES.ending.audio,'story-ending.ogg');assert.equal(STORY_SCENES.credits.audioOffset,13);
});

test('canceling during loading never starts a stale finale',async()=>{
 let resolve;const f=fixture({load:()=>new Promise(done=>resolve=done)}),run=f.launch({autoplay:true});run.cancel();assert.deepEqual(await run,{completed:false,skipped:true});resolve({});await flush();assert.equal(f.draws.length,0);assert.equal(f.frames,0);assert.equal(f.dialog.isConnected,false);
});

test('a missing painting exits cleanly without completing the finale',async()=>{
 const f=fixture({load:async()=>{throw Error('missing');}});assert.deepEqual(await f.launch({autoplay:true}),{completed:false,skipped:false,failed:true});assert.equal(f.dialog.isConnected,false);assert.equal(f.frames,0);
});

test('a paused app freezes the finale and resumes without jumping over the restoration',async()=>{
 const f=fixture({duration:2}),run=f.launch({autoplay:true});await flush();f.tick();f.tick();const before=f.draws.at(-1).t;f.pause(true);f.tick(10000);assert.equal(f.draws.at(-1).t,before);f.pause(false);f.tick();assert.equal(f.draws.at(-1).t,before);f.tick();assert(f.draws.at(-1).t>before);assert(f.draws.at(-1).t<.4);run.cancel();await run;
});

test('reduced motion is passed through each frame and foreground stalls stay bounded',async()=>{
 const f=fixture({duration:2}),run=f.launch({autoplay:true,reduced:true});await flush();f.tick();const before=f.draws.at(-1).t;f.tick(10000);assert(Math.abs(f.draws.at(-1).t-before-.1)<.000001);assert(f.draws.every(d=>d.options.reduced));run.cancel();await run;
});

test('blocked audio keeps the first frame and offers a working retry',async()=>{
 let blocked=true;const f=fixture({audio:true,rejectAudio:()=>blocked}),run=f.launch({autoplay:true});await flush();await flush();for(let i=0;i<5;i++)f.tick();assert.equal(f.draws.at(-1).t,0);assert.equal(f.button.hidden,false);assert.equal(f.button.textContent,'Tap to play');blocked=false;f.button.dispatchEvent(new Event('click',{cancelable:true}));await flush();for(let i=0;i<5;i++)f.tick();assert.equal(f.dialog.dataset.stage,'complete');f.button.dispatchEvent(new Event('click',{cancelable:true}));assert.equal((await run).completed,true);assert.equal(f.sound.paused,true);
});

test('Escape cancels the finale once and removes pending work',async()=>{
 const f=fixture(),run=f.launch({autoplay:true});await flush();const event=new Event('keydown',{cancelable:true});Object.defineProperty(event,'key',{value:'Escape'});f.dialog.dispatchEvent(event);assert.equal(event.defaultPrevented,true);assert.deepEqual(await run,{completed:false,skipped:true});assert.equal(f.frames,0);
});
