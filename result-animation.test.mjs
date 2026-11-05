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
 return {host,get,d,root,rows,slots,platform,advance(ms){for(let passed=0;passed<ms;passed+=20){time+=20;const work=[...frames.values()];frames.clear();work.forEach(fn=>fn(time));[...timers.values()].forEach(fn=>fn());}}};
}

test('Adventure fills missions, flies earned stars, marks failures red, then starts XP',()=>{
 const f=fixture(),cues=[];let done=0;
 const oldDocument=globalThis.document;globalThis.document=f.host.document;
 f.rows[1].dataset.earned='false';
 try{
  revealAdventureRewards(f.root,cue=>cues.push(cue),()=>done++,{visible:()=>!f.platform.paused,raf:f.platform.requestAnimationFrame,caf:f.platform.cancelAnimationFrame,now:f.platform.now});
  f.advance(120);assert(f.rows[0].classList.contains('reward-charging'));assert.equal(f.slots.filter(s=>s.classList.contains('earned')).length,0);
  f.platform.paused=true;f.advance(2000);assert.deepEqual(cues,['objective-fill']);assert.equal(done,0);
  f.platform.paused=false;f.advance(260);assert(f.rows[0].classList.contains('reward-converted'));assert.deepEqual(cues,['objective-fill','star-flight']);
  f.advance(260);assert(f.slots[0].classList.contains('earned'));assert.equal(done,0);
  f.advance(80);assert(f.rows[1].classList.contains('reward-failed'));
  f.advance(1000);assert.deepEqual(cues,['objective-fill','star-flight','star-land-1','objective-fill','star-flight','star-land-2']);
  assert.equal(f.slots.filter(s=>s.classList.contains('earned')).length,2);assert.equal(done,1);assert(f.root.classList.contains('rewards-settled'));
  f.advance(2000);assert.equal(done,1);
 }finally{globalThis.document=oldDocument;}
});

for(const skip of [false,true])test('mini Adventure XP starts after stars become visible'+(skip?' when skipped':''),()=>{
 const f=fixture(),oldWindow=globalThis.window,oldDocument=globalThis.document;globalThis.window=f.host;globalThis.document=f.host.document;let left=0;
 try{
  createMiniResults({host:f.host}).show({title:'Complete',score:32,best:38,coins:8,xpBefore:0,xpAfter:20,adventure:true,adventureMarkup:'three earned stars',finish:()=>left++,restart:()=>left++});
  const initial=f.get('result-xp-label').textContent;f.advance(400);assert.equal(f.get('result-xp-label').textContent,initial,'hidden XP must not count before the star reveal');
  if(skip){f.d.emit('click');assert.equal(left,0,'first tap completes the star animation without dismissing the result');assert(f.d.open);}else f.advance(1900);
  assert(f.root.classList.contains('rewards-settled'));f.advance(500);assert.notEqual(f.get('result-xp-label').textContent,initial,'visible XP animates');
  f.advance(2000);assert.equal(f.get('level-progress').value,20);assert.equal(f.get('final-coins').textContent,'+8');
  f.d.emit('click');assert.equal(left,1);assert.equal(f.d.open,false);
 }finally{globalThis.window=oldWindow;globalThis.document=oldDocument;}
});


test('victory replaces every cell with a fresh round without mutating the finished run',async()=>{
 const {refreshVictoryChoices,freshVictoryBoard}=await import('./adventure-victory.js');
 const {seededRandom}=await import('./engine.js');
 const state={mode:'adventure',current:{shape:0,color:0},picks:4,score:4,heldBoard:[{special:'heart'}],pendingSpecials:[{special:'heart'}]},saved=structuredClone(state),old=[{shape:0,color:0},{shape:2,color:1,collected:true}];
 const tiles=freshVictoryBoard(state,old,4,seededRandom(12));assert.deepEqual(state,saved);assert.equal(tiles.length,4);assert(tiles.every(t=>!t.special&&!t.collected));for(let i=0;i<old.length;i++)assert(tiles[i].shape!==old[i].shape||tiles[i].color!==old[i].color);
 const drawn=[],node=()=>({style:{},children:[],setAttribute(){},append(n){this.children.push(n);}});
 const root={...node(),classList:{remove(){}},ownerDocument:{createElement:node},replaceChildren(){this.children=[];}};
 const oldChoice={old:true};root.children=[oldChoice];refreshVictoryChoices(root,tiles,(_,tile)=>drawn.push(tile));
 assert(!root.children.includes(oldChoice));assert.equal(drawn.length,4);assert(root.children.every(c=>c.disabled&&c.children[0].className==='sprite'));
});
