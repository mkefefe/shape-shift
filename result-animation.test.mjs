import test from 'node:test';
import assert from 'node:assert/strict';
import {revealAdventureRewards} from './adventure-rewards.js';
import {createMiniResults} from './mini-results.js';

function fixture(){
 let time=0,serial=0;const frames=new Map(),timers=new Map(),nodes=new Map();
 const make=()=>{const classes=new Set(),listeners=new Map();return {
  dataset:{},hidden:false,disabled:false,textContent:'',firstChild:{textContent:'Best'},className:'',
  classList:{add:(...names)=>names.forEach(n=>classes.add(n)),remove:(...names)=>names.forEach(n=>classes.delete(n)),contains:n=>classes.has(n)},
  style:{setProperty(){}},setAttribute(){},focus(){},contains(target){return target===this;},remove(){},append(){},
  getBoundingClientRect:()=>({left:0,top:0,width:60,height:60}),
  addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(fn);},
  removeEventListener(type,fn){listeners.get(type)?.delete(fn);},
  emit(type){const e={target:this,preventDefault(){},stopImmediatePropagation(){this.stopped=true;}};for(const fn of [...listeners.get(type)||[]]){fn(e);if(e.stopped)break;}}
 };};
 const get=id=>{if(!nodes.has(id))nodes.set(id,make());return nodes.get(id);};
 const d=get('over-dialog');Object.assign(d,{open:false,querySelector:get,showModal(){this.open=true;},close(){this.open=false;}});
 get('continue-ad').querySelector=get;
 const rows=[true,true,true].map(earned=>Object.assign(make(),{dataset:{earned:String(earned)}})),slots=rows.map(make),root=get('adventure-result');
 root.querySelectorAll=s=>s==='li'?rows:slots;root.closest=()=>d;
 const platform={paused:false,now:()=>time,requestAnimationFrame:fn=>{frames.set(++serial,fn);return serial;},cancelAnimationFrame:id=>frames.delete(id),setInterval:fn=>{timers.set(++serial,fn);return serial;},clearInterval:id=>timers.delete(id)};
 const host={document:{getElementById:get,body:make(),createElement:make},ShapeShiftPlatform:platform,gameAudio:{ui(){}}};
 return {host,get,d,root,slots,platform,advance(ms){for(let passed=0;passed<ms;passed+=20){time+=20;const work=[...frames.values()];frames.clear();work.forEach(fn=>fn(time));[...timers.values()].forEach(fn=>fn());}}};
}

test('compact Adventure results reveal stars one by one, pause in the background, then start XP',()=>{
 const f=fixture(),cues=[];let done=0;
 revealAdventureRewards(f.root,cue=>cues.push(cue),()=>done++,{compact:true,visible:()=>!f.platform.paused,raf:f.platform.requestAnimationFrame,caf:f.platform.cancelAnimationFrame,now:f.platform.now});
 assert.equal(f.slots.filter(s=>s.classList.contains('earned')).length,0);
 f.advance(200);assert.equal(f.slots.filter(s=>s.classList.contains('earned')).length,1);assert.equal(done,0);
 f.platform.paused=true;f.advance(2000);assert.equal(cues.length,1);assert.equal(done,0);
 f.platform.paused=false;f.advance(1800);assert.deepEqual(cues,['star-land-1','star-land-2','star-land-3']);assert.equal(done,1);assert(f.root.classList.contains('rewards-settled'));
 f.advance(2000);assert.equal(done,1);
});

for(const skip of [false,true])test('mini Adventure XP starts after stars become visible'+(skip?' when skipped':''),()=>{
 const f=fixture(),oldWindow=globalThis.window,oldDocument=globalThis.document;globalThis.window=f.host;globalThis.document=f.host.document;let left=0;
 try{
  createMiniResults({host:f.host}).show({title:'Complete',score:32,best:38,coins:8,xpBefore:0,xpAfter:20,adventure:true,adventureMarkup:'three earned stars',finish:()=>left++,restart:()=>left++});
  const initial=f.get('result-xp-label').textContent;f.advance(1000);assert.equal(f.get('result-xp-label').textContent,initial,'hidden XP must not count before the star reveal');
  if(skip){f.d.emit('click');assert.equal(left,0,'first tap completes the star animation without dismissing the result');assert(f.d.open);}else f.advance(2100);
  assert(f.root.classList.contains('rewards-settled'));f.advance(500);assert.notEqual(f.get('result-xp-label').textContent,initial,'visible XP animates');
  f.advance(2000);assert.equal(f.get('level-progress').value,20);assert.equal(f.get('final-coins').textContent,'+8');
  f.d.emit('click');assert.equal(left,1);assert.equal(f.d.open,false);
 }finally{globalThis.window=oldWindow;globalThis.document=oldDocument;}
});
