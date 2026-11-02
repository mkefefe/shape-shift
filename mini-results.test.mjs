import test from 'node:test';
import assert from 'node:assert/strict';
import {createMiniResults} from './mini-results.js';
function fixture(){
 const nodes=new Map(),handlers=new Map();
 const make=()=>({dataset:{},textContent:'',hidden:false,disabled:false,className:'',firstChild:{textContent:'Best'},classList:{remove(){},contains(){return false;}},setAttribute(){},focus(){},contains(target){return target===this;}});
 const get=id=>{if(!nodes.has(id))nodes.set(id,make());return nodes.get(id);};
 const d=get('over-dialog');Object.assign(d,{open:false,querySelector:selector=>get(selector),showModal(){this.open=true;},close(){this.open=false;},addEventListener(type,fn){handlers.set(type,fn);},removeEventListener(type,fn){if(handlers.get(type)===fn)handlers.delete(type);}});
 get('continue-ad').querySelector=()=>get('strong');
 const host={document:{getElementById:get,body:make()},gameAudio:{ui(){}},ShapeShiftPlatform:{now:()=>0,setInterval:()=>1,clearInterval(){},paused:false}};
 return {host,get,leaveMode:()=>handlers.get('restoration:leave-mode')?.(),click:target=>handlers.get('click')?.({target,stopImmediatePropagation(){},preventDefault(){}})};
}
for(const stored of [true,false])test(stored?'Continue leaves a saved run without replaying':'Unsaved result retries saving instead of discarding the run',()=>{
 const f=fixture(),old=globalThis.window;globalThis.window=f.host;let restart=0,save=0,home=0;
 try{const results=createMiniResults({host:f.host});results.show({score:12,best:20,coins:4,xpBefore:0,xpAfter:12,stored,retry:()=>save++,restart:()=>restart++,finish:()=>home++});
 assert.equal(f.get('adventure-continue').textContent,stored?'Continue':'Save results');f.click(f.get('adventure-continue'));
 assert.equal(restart,0);assert.equal(save,stored?0:1);assert.equal(home,stored?1:0);assert.equal(f.get('over-dialog').open,false);
 f.click(f.get('adventure-continue'));assert.equal(restart,0);
 }finally{globalThis.window=old;}
});
test('tapping outside saved results returns to Games without replaying',()=>{
 const f=fixture(),old=globalThis.window;globalThis.window=f.host;let home=0,restart=0;
 try{createMiniResults({host:f.host}).show({score:1,best:1,coins:1,xpBefore:0,xpAfter:1,retry(){},restart:()=>restart++,finish:()=>home++});f.click(f.get('over-dialog'));assert.equal(home,1);assert.equal(restart,0);}finally{globalThis.window=old;}
});

test('island navigation closes the old mini mode and clears its result handlers',()=>{
 const f=fixture(),old=globalThis.window;globalThis.window=f.host;let home=0,restart=0;
 try{f.get('over-dialog').dataset.resultMode='adventure';const results=createMiniResults({host:f.host});results.show({score:1,best:1,coins:1,xpBefore:0,xpAfter:1,retry(){},restart:()=>restart++,finish:()=>home++});assert.equal(f.get('over-dialog').dataset.resultMode,'mini');f.leaveMode();assert.equal(home,1);assert.equal(f.get('over-dialog').dataset.resultMode,'adventure');f.click(f.get('adventure-continue'));assert.equal(restart,0);f.leaveMode();assert.equal(home,1);}finally{globalThis.window=old;}
});

test('async next-level handoff holds results, blocks double taps, and recovers after failure',async()=>{
 const f=fixture(),old=globalThis.window;globalThis.window=f.host;let calls=0,reject;
 try{const results=createMiniResults({host:f.host});results.show({score:1,best:1,coins:1,xpBefore:0,xpAfter:1,retry(){},restart(){},finish:()=>{calls++;return new Promise((_,fail)=>reject=fail);}});
 f.click(f.get('adventure-continue'));f.click(f.get('adventure-continue'));assert.equal(calls,1);assert.equal(f.get('over-dialog').open,true);assert.equal(f.get('adventure-continue').disabled,true);
 reject(Error('destination unavailable'));await Promise.resolve();assert.equal(f.get('over-dialog').open,true);assert.equal(f.get('adventure-continue').disabled,false);assert.match(f.get('ad-status').textContent,/try again/);
 results.reset();
 }finally{globalThis.window=old;}
});
test('async next-level handoff closes results only after destination succeeds',async()=>{
 const f=fixture(),old=globalThis.window;globalThis.window=f.host;let resolve;
 try{createMiniResults({host:f.host}).show({score:1,best:1,coins:1,xpBefore:0,xpAfter:1,retry(){},restart(){},finish:()=>new Promise(done=>resolve=done)});
 f.click(f.get('adventure-continue'));assert.equal(f.get('over-dialog').open,true);resolve(true);await Promise.resolve();assert.equal(f.get('over-dialog').open,false);
 }finally{globalThis.window=old;}
});
