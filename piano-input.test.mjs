import test from 'node:test';
import assert from 'node:assert/strict';
import {createPianoGame} from './piano-flow-engine.js';
import {createPianoInput,bindPianoKeyboard} from './piano-input.js';

const note=(id,beat,lane,hold=0)=>({id,beat,end:beat+hold,lane,hold,pitch:60+lane*2,shape:lane,color:0,duration:hold?hold+1.5:1,rapid:false,status:'waiting',awaiting:false});
function fixture(notes,{beat=2,countdown=0}={}){
 const events=[],game=createPianoGame({stripTap:true,rhythm:true,melodicStrips:true,fullSongs:true,rng:()=>0,onEvent:e=>events.push(e)});
 game.start();game.notes=notes;game.beat=beat;game.countdown=countdown;events.length=0;
 let enabled=true;
 const input=createPianoInput({getGame:()=>game,enabled:()=>enabled});
 return {game,input,events,setEnabled:value=>{enabled=value;}};
}
function advance(f,beat){
 for(let i=0;f.game.beat<beat&&i<10000;i++){f.game.step(1/240);f.input.flush();}
 assert(f.game.beat>=beat,'game clock reached the requested beat');
}
function element(){
 const classes=new Set(),children=[];
 return {children,hidden:false,classList:{add:name=>classes.add(name),remove:name=>classes.delete(name),contains:name=>classes.has(name),toggle(name,force){const on=force??!classes.has(name);if(on)classes.add(name);else classes.delete(name);return on;}},append:child=>children.push(child),setAttribute(){},querySelectorAll:()=>children};
}
function keyboardFixture(f,{fine=true}={}){
 const listeners=new Map(),mediaListeners=[],media={matches:fine,addEventListener:(_,fn)=>mediaListeners.push(fn)};
 const host={matchMedia:()=>media,addEventListener(type,fn){listeners.set(type,fn);}};
 const dialog=Object.assign(element(),{open:true,ownerDocument:{createElement:element}});
 let active=true,pauses=0;
 const keyboard=bindPianoKeyboard({host,dialog,active:()=>active,press:f.input.press,release:f.input.release,pause:()=>{pauses++;f.game.pause();}});
 keyboard.mount();
 function dispatch(type,key='',extra={}){
  const event={key,code:key?'Key'+key.toUpperCase():'',repeat:false,prevented:false,target:{closest:()=>null},preventDefault(){this.prevented=true;},...extra};
  listeners.get(type)?.(event);return event;
 }
 return {keyboard,dialog,row:dialog.children[0],dispatch,get pauses(){return pauses;},setActive:value=>{active=value;},setFine(value){media.matches=value;for(const fn of mediaListeners)fn();}};
}

test('all four pointer strips accept a quick tap and a resumable hold',()=>{
 for(let lane=0;lane<4;lane++){
  const tap=note(900,3,lane),f=fixture([tap]);
  assert(f.input.press(lane,17));assert.equal(tap.status,'done');assert.equal(f.game.hits,1);
  f.input.release(17);assert.equal(f.game.pressed.size,0);
  const hold=note(901,3,lane,1),h=fixture([hold]);
  assert(h.input.press(lane,18));advance(h,2.3);assert(hold.heldBeats>.29);
  h.input.release(18);const saved=hold.heldBeats;assert.equal(hold.status,'partial');
  advance(h,2.5);assert.equal(hold.heldBeats,saved);
  assert(h.input.press(lane,19));advance(h,3.3);
  assert.equal(hold.status,'done');assert.equal(h.game.hits,1);assert.equal(h.game.lives,h.game.maxLives);
 }
});

test('a continuous physical hold survives countdown and the early lead-in without OS repeats',()=>{
 const hold=note(900,2,2,1),f=fixture([hold],{beat:-3,countdown:3});
 assert(f.input.press(2,25));assert.equal(hold.status,'waiting');
 for(let i=0;i<360;i++){f.game.step(1/120);f.input.flush();}
 assert.equal(f.game.countdown,0);assert.equal(hold.status,'waiting');
 advance(f,-2.35);assert.equal(hold.status,'holding');assert(hold.heldBeats>0);
 advance(f,-1.3);assert.equal(hold.status,'done');assert.equal(f.game.hits,1);
 assert.equal(f.events.filter(e=>e.type==='miss').length,0);
 assert.equal(f.events.filter(e=>e.type==='input').length,1);
});

test('releasing a pending tap during countdown or before the input window cancels it',()=>{
 for(const countdown of [0,3]){
  const a=note(900,2,0),f=fixture([a],{beat:-3,countdown});
  assert(f.input.press(0,31));f.input.release(31);advance(f,-2.2);
  assert.equal(a.status,'waiting');assert.equal(f.game.hits,0);assert.equal(f.game.pressed.size,0);
  assert.equal(f.events.filter(e=>e.type==='input'||e.type==='miss').length,0);
 }
});

test('the newest pointer owns the strip and an older finger release cannot stop it',()=>{
 const a=note(900,2,0),b=note(901,2.2,1,1),f=fixture([a,b]);
 assert(f.input.press(0,41));assert.equal(a.status,'done');
 assert(f.input.press(1,42));assert.equal(b.status,'holding');
 f.input.release(41);assert.deepEqual([...f.game.pressed],[1]);
 advance(f,2.3);assert(b.heldBeats>.29);
 f.input.release(42);assert.equal(b.status,'partial');assert.equal(f.game.pressed.size,0);
});

test('a wrong physical press is charged once and flush or repeated events do not retry it',()=>{
 const a=note(900,3,0),f=fixture([a]);
 assert(f.input.press(1,51));assert.equal(f.game.lives,f.game.maxLives-1);
 for(let i=0;i<100;i++){f.input.press(1,51);f.input.flush();f.game.step(1/240);}
 assert.equal(f.events.filter(e=>e.type==='miss').length,1);assert.equal(a.status,'waiting');
 f.input.release(51);assert(f.input.press(0,52));assert.equal(a.status,'done');assert.equal(f.game.hits,1);
});

test('holding or repeating the same physical press cannot collect successive short notes',()=>{
 const a=note(900,2,3),b=note(901,2.3,3),f=fixture([a,b]);
 f.input.press(3,61);advance(f,2.4);
 for(let i=0;i<10;i++){f.input.press(3,61);f.input.flush();}
 assert.equal(a.status,'done');assert.equal(b.status,'waiting');assert.equal(f.game.hits,1);
 f.input.release(61);assert(f.input.press(3,62));assert.equal(b.status,'done');assert.equal(f.game.hits,2);
});

test('reset clears active and pending ownership so a reused pointer ID works',()=>{
 const a=note(900,3,0,1),f=fixture([a]);
 f.input.press(0,71);advance(f,2.2);f.input.reset();
 assert.equal(f.game.pressed.size,0);assert.equal(a.status,'partial');
 assert(f.input.press(0,71));assert.equal(a.status,'holding');
 f.input.reset();f.input.reset();
 const pending=fixture([note(901,2,1)],{beat:-3,countdown:3});
 pending.input.press(1,72);pending.input.reset();advance(pending,-2.2);
 assert.equal(pending.game.hits,0);assert.equal(pending.game.notes[0].status,'waiting');
});

test('paused, ended and disabled games reject new input without leaving a blocked owner',()=>{
 const a=note(900,3,0),f=fixture([a]);
 f.game.pause();assert.equal(f.input.press(0,81),false);f.game.resume();
 f.setEnabled(false);assert.equal(f.input.press(0,81),false);f.setEnabled(true);
 assert(f.input.press(0,81));assert.equal(a.status,'done');
 f.input.reset();f.game.end();assert.equal(f.input.press(0,81),false);
});

test('A S D F tap all four strips on touch-primary hardware and reveal keyboard hints',()=>{
 const notes=[0,1,2,3].map(lane=>note(900+lane,2+lane*.2,lane)),f=fixture(notes),k=keyboardFixture(f,{fine:false});
 assert(k.row.hidden);
 for(const [lane,key] of ['a','s','d','f'].entries()){
  assert(k.dispatch('keydown',key).prevented);assert.equal(notes[lane].status,'done');
  assert(k.row.children[lane].classList.contains('pressed'));
  k.dispatch('keyup',key);assert.equal(f.game.pressed.size,0);
 }
 assert.equal(k.row.hidden,false);assert(k.dialog.classList.contains('piano-desktop-keys'));
 assert.equal(f.game.hits,4);assert.equal(f.game.lives,f.game.maxLives);
});

test('ASDF holds fill all four strips and survive pointer capability changes',()=>{
 for(const [lane,key] of ['a','s','d','f'].entries()){
  const a=note(900,3,lane,1),f=fixture([a]),k=keyboardFixture(f);
  k.dispatch('keydown',key);advance(f,2.2);k.setFine(false);advance(f,2.4);
  assert(a.heldBeats>.39);assert.equal(a.status,'holding');
  k.dispatch('keyup',key);assert.equal(a.status,'partial');assert.equal(f.game.pressed.size,0);
 }
});

test('overlapping A/S keydowns transfer ownership without the old keyup releasing S',()=>{
 const a=note(900,2,0),b=note(901,2.2,1,1),f=fixture([a,b]),k=keyboardFixture(f);
 k.dispatch('keydown','a');k.dispatch('keydown','s');k.dispatch('keyup','a');
 assert.deepEqual([...f.game.pressed],[1]);advance(f,2.3);assert(b.heldBeats>.29);
 assert(k.row.children[1].classList.contains('pressed'));
 k.dispatch('keyup','s');assert.equal(b.status,'partial');assert.equal(f.game.pressed.size,0);
});

test('keyboard repeat does not retrigger a note, and reset recovers a stale held key',()=>{
 const a=note(900,2,0),b=note(901,2.3,0),f=fixture([a,b]),k=keyboardFixture(f);
 k.dispatch('keydown','a');advance(f,2.4);
 for(let i=0;i<20;i++)k.dispatch('keydown','a',{repeat:true});
 assert.equal(f.game.hits,1);assert.equal(b.status,'waiting');
 k.keyboard.reset();assert.equal(f.game.pressed.size,0);
 k.dispatch('keydown','a',{repeat:true});assert.equal(b.status,'done');assert.equal(f.game.hits,2);
});

test('blur releases the physical key and pauses; resume accepts the same key again',()=>{
 const a=note(900,3,2,1),f=fixture([a]),k=keyboardFixture(f);
 k.dispatch('keydown','d');advance(f,2.2);const credited=a.heldBeats;
 k.dispatch('blur');assert.equal(k.pauses,1);assert(f.game.paused);assert.equal(f.game.pressed.size,0);
 const beat=f.game.beat;f.game.step(.05);assert.equal(f.game.beat,beat);assert.equal(a.heldBeats,credited);
 f.game.resume();k.dispatch('keydown','d');advance(f,2.4);assert(a.heldBeats>credited);
 k.dispatch('keyup','d');assert.equal(a.status,'partial');
});

test('ad input reset releases a held piano key without adding a second pause menu',()=>{
 const a=note(900,3,2,1),f=fixture([a]),k=keyboardFixture(f);
 k.dispatch('keydown','d');advance(f,2.2);const credited=a.heldBeats;
 k.dispatch('shape-shift-input-reset');assert.equal(k.pauses,0);assert.equal(f.game.pressed.size,0);
 assert.equal(a.status,'partial');k.dispatch('keydown','d');advance(f,2.4);assert(a.heldBeats>credited);
});

test('keyboard respects dialog/editable focus and modifiers while physical key codes stay usable',()=>{
 const a=note(900,2,0),f=fixture([a]),k=keyboardFixture(f);
 for(const extra of [{ctrlKey:true},{metaKey:true},{altKey:true},{target:{closest:()=>({})}}]){
  assert.equal(k.dispatch('keydown','a',extra).prevented,false);
 }
 k.setActive(false);k.dispatch('keydown','a');k.setActive(true);
 k.dialog.open=false;k.dispatch('keydown','a');k.dialog.open=true;
 assert.equal(a.status,'waiting');
 k.dispatch('keydown','q',{code:'KeyA'});assert.equal(a.status,'done');
 k.dispatch('keyup','q',{code:'KeyA'});assert.equal(f.game.pressed.size,0);
});

test('focusing the pause button does not swallow piano letters during active play',()=>{
 const a=note(900,2,0),f=fixture([a]),k=keyboardFixture(f);
 const target={closest:selector=>selector.split(',').includes('button')?{}:null};
 assert(k.dispatch('keydown','a',{target}).prevented);assert.equal(a.status,'done');
 k.dispatch('keyup','a',{target});assert.equal(f.game.pressed.size,0);
});
