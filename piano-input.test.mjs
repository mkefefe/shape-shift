import test from 'node:test';
import assert from 'node:assert/strict';
import {createPianoGame,PIANO_STALL_SECONDS} from './piano-flow-engine.js';
import {createPianoInput,bindPianoKeyboard,pianoInputClock} from './piano-input.js';

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

test('action observer counts physical presses once before accepted-note feedback, not clock flushes',()=>{
 const events=[],game=createPianoGame({stripTap:true,rhythm:true,melodicStrips:true,fullSongs:true,rng:()=>0,onEvent:e=>{if(e.type==='input')events.push('accepted');}});
 game.start();game.notes=[note(1500,2,0)];game.beat=2;game.countdown=0;
 const input=createPianoInput({getGame:()=>game,onPress:()=>events.push('press')});
 input.flush();assert.deepEqual(events,[]);
 assert(input.press(0,'finger'));assert.deepEqual(events,['press','accepted']);
 input.press(0,'finger');input.flush();assert.deepEqual(events,['press','accepted']);
 input.press(-1,'invalid');assert.deepEqual(events,['press','accepted']);
 input.release('finger');game.pause();input.press(0,'paused');assert.deepEqual(events,['press','accepted']);
});
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

test('all four pointer strips start notes immediately high on screen and require holding long notes',()=>{
 for(let lane=0;lane<4;lane++)for(const hold of [0,2]){
  const a=note(900,4,lane,hold),f=fixture([a],{beat:0});assert(f.input.press(lane,17));assert.equal(f.game.hits,hold?0:1);if(hold)advance(f,hold+.05);assert.equal(f.game.hits,1);assert.equal(f.game.coins,1);
  f.input.release(17);assert.equal(a.status,'done');assert.equal(f.game.pressed.size,0);assert.equal(f.game.lives,f.game.maxLives);
 }
});

test('a stale held key from countdown cannot become a timed note without a new press',()=>{
 const hold=note(900,2,2,1),f=fixture([hold],{beat:-3,countdown:3});
 assert(f.input.press(2,25));assert.equal(hold.status,'waiting');
 for(let i=0;i<360;i++){f.game.step(1/120);f.input.flush();}
 assert.equal(f.game.countdown,0);assert.equal(hold.status,'waiting');
 advance(f,2);assert.equal(hold.status,'waiting');assert.equal(f.game.hits,0);
 f.input.release(25);assert(f.input.press(2,26));advance(f,3.01);assert.equal(hold.status,'done');assert.equal(f.game.hits,1);
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

test('different fingers keep independent strips and replacing one strip ignores the old finger release',()=>{
 const a=note(900,2,0,2),b=note(901,3,1,2),c=note(902,4,0,2),f=fixture([a,b,c],{beat:0});
 f.input.press(0,41);f.input.press(1,42);advance(f,2.05);assert.equal(f.game.hits,2);assert.deepEqual([...f.game.pressed],[0,1]);
 f.input.press(0,43);assert.equal(f.game.hits,2);assert.equal(a.status,'done');assert.equal(c.status,'holding');
 f.input.release(41);assert(c.status==='holding');assert(f.game.pressed.has(0));assert(f.game.pressed.has(1));
 f.input.release(42);assert.equal(b.status,'done');assert(c.status==='holding');advance(f,4.1);f.input.release(43);assert.equal(c.status,'done');assert.equal(f.game.pressed.size,0);
});

test('a wrong physical press is charged once and flush or repeated events do not retry it',()=>{
 const a=note(900,2,0),f=fixture([a]);
 assert(f.input.press(1,51));assert.equal(f.game.lives,f.game.maxLives-1);
 for(let i=0;i<100;i++){f.input.press(1,51);f.input.flush();f.game.step(1/1000);}
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

test('reset clears every active input and reused pointer IDs can play the next visible note',()=>{
 const a=note(900,2,0,1),b=note(901,3,1,1),c=note(902,4,0),f=fixture([a,b,c],{beat:0});
 f.input.press(0,71);f.input.press(1,72);advance(f,1.05);f.input.reset();assert.equal(f.game.pressed.size,0);assert.equal(a.status,'done');assert.equal(b.status,'done');
 assert(f.input.press(0,71));assert.equal(c.status,'done');assert.equal(f.game.hits,3);f.input.reset();f.input.reset();
 const pending=fixture([note(901,2,1)],{beat:-3,countdown:3});pending.input.press(1,72);pending.input.reset();advance(pending,-2.2);assert.equal(pending.game.hits,0);
});

test('paused, ended and disabled games reject new input without leaving a blocked owner',()=>{
 const a=note(900,2,0),f=fixture([a]);
 f.game.pause();assert.equal(f.input.press(0,81),false);f.game.resume();
 f.setEnabled(false);assert.equal(f.input.press(0,81),false);f.setEnabled(true);
 assert(f.input.press(0,81));assert.equal(a.status,'done');
 f.input.reset();f.game.end();assert.equal(f.input.press(0,81),false);
});

test('A S D F tap all four strips on touch-primary hardware and reveal keyboard hints',()=>{
 const notes=[0,1,2,3].map(lane=>note(900+lane,2+lane*.2,lane)),f=fixture(notes,{beat:0}),k=keyboardFixture(f,{fine:false});
 assert(k.row.hidden);
 for(const [lane,key] of ['a','s','d','f'].entries()){
  assert(f.game.beat<notes[lane].beat,'physical key plays a visible note before its nominal onset');
  assert(k.dispatch('keydown',key).prevented);assert.equal(notes[lane].status,'done');
  assert(k.row.children[lane].classList.contains('pressed'));
  k.dispatch('keyup',key);assert.equal(f.game.pressed.size,0);
 }
 assert.equal(k.row.hidden,false);assert(k.dialog.classList.contains('piano-desktop-keys'));
 assert.equal(f.game.hits,4);assert.equal(f.game.lives,f.game.maxLives);
});

test('ASDF holds require sustained input on all four strips and survive pointer capability changes',()=>{
 for(const [lane,key] of ['a','s','d','f'].entries()){
  const a=note(900,2,lane,1),f=fixture([a]),k=keyboardFixture(f);
  k.dispatch('keydown',key);advance(f,2.2);k.setFine(false);advance(f,2.4);
  assert(a.heldBeats>.39);assert.equal(a.status,'holding');
  advance(f,3.05);k.dispatch('keyup',key);assert.equal(a.status,'done');assert.equal(f.game.pressed.size,0);assert.equal(f.game.hits,1);
 }
});

test('simultaneous A S D F keydowns each score and show an independent held hint',()=>{
 const notes=[0,1,2,3].map(lane=>note(900+lane,2+lane*.2,lane,2)),f=fixture(notes,{beat:0}),k=keyboardFixture(f);
 for(const key of ['a','s','d','f'])k.dispatch('keydown',key);
 assert.equal(f.game.hits,0);assert.equal(f.game.pressed.size,4);assert(k.row.children.every(e=>e.classList.contains('pressed')));
 k.dispatch('keyup','s');assert.equal(notes[1].status,'partial');assert.equal(notes[0].status,'holding');assert(k.row.children[0].classList.contains('pressed'));
 k.dispatch('keydown','s');advance(f,2.05);for(const key of ['a','s','d','f'])k.dispatch('keyup',key);assert.equal(f.game.pressed.size,0);assert.equal(f.game.hits,4);
});

test('keyboard repeat does not retrigger a note, and reset recovers a stale held key',()=>{
 const a=note(900,2,0),b=note(901,2.3,0),f=fixture([a,b]),k=keyboardFixture(f);
 k.dispatch('keydown','a');advance(f,2.4);
 for(let i=0;i<20;i++)k.dispatch('keydown','a',{repeat:true});
 assert.equal(f.game.hits,1);assert.equal(b.status,'waiting');
 k.keyboard.reset();assert.equal(f.game.pressed.size,0);
 k.dispatch('keydown','a',{repeat:true});assert.equal(b.status,'done');assert.equal(f.game.hits,2);
});

test('blur preserves partial hold progress and resume requires finishing it',()=>{
 const a=note(900,2,2,1),b=note(901,3,2),f=fixture([a,b]),k=keyboardFixture(f);
 k.dispatch('keydown','d');advance(f,2.2);k.dispatch('blur');assert.equal(k.pauses,1);assert(f.game.paused);assert.equal(a.status,'partial');assert.equal(f.game.hits,0);
 const beat=f.game.beat;f.game.step(.05);assert.equal(f.game.beat,beat);f.game.resume();k.dispatch('keydown','d');advance(f,3.1);k.dispatch('keyup','d');k.dispatch('keydown','d');assert.equal(b.status,'done');assert.equal(f.game.hits,2);
});

test('ad reset releases held keys without another pause menu and never replays an earned note',()=>{
 const a=note(900,2,2,1),b=note(901,3,2),f=fixture([a,b]),k=keyboardFixture(f);
 k.dispatch('keydown','d');advance(f,3.05);k.dispatch('shape-shift-input-reset');assert.equal(k.pauses,0);assert.equal(f.game.pressed.size,0);assert.equal(a.status,'done');
 k.dispatch('keydown','d');assert.equal(b.status,'done');assert.equal(f.game.hits,2);
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


test('physical event time maps to paused platform time without rewinding a rendered frame',()=>{
 assert.equal(pianoInputClock(980,1000,600,550),580);
 assert.equal(pianoInputClock(900,1000,600,550),550);
 assert.equal(pianoInputClock(undefined,1000,600,550),600);
 assert.equal(pianoInputClock(0,1000,600,550),600);
 assert.equal(pianoInputClock(1000000000000,1000,600,550),600);
});

test('a queued key after a foreground stall cannot split the gap into damaging ordinary frames',()=>{
 for(const eventTime of [1001,1500,2199]){
  const f=fixture([note(900,4,0),note(901,4.5,1)],{beat:3});let gameLast=1000;
  const advance=now=>{const dt=Math.max(0,(now-gameLast)/1000);gameLast=Math.max(gameLast,now);f.game.step(dt);};
  const deliveredAt=2200;
  advance(pianoInputClock(eventTime,deliveredAt,deliveredAt,gameLast,PIANO_STALL_SECONDS*1000));
  assert.equal(gameLast,deliveredAt);assert.equal(f.game.beat,3);assert.equal(f.game.time,0);
  assert(f.input.press(0,'key-a'));assert(f.input.press(1,'key-s'));
  advance(deliveredAt);f.input.flush();
  assert.equal(f.game.beat,3);assert.equal(f.game.time,0);assert.equal(f.game.lives,f.game.maxLives);
  assert.equal(f.game.hits,2);assert.equal(f.game.paused,false);
  assert.equal(f.events.filter(e=>e.type==='stall').length,1);assert.equal(f.events.filter(e=>e.type==='miss').length,0);
  advance(deliveredAt+16);f.input.flush();
  assert(f.game.beat>3&&f.game.beat<3.05);assert.equal(f.game.time,.016);assert.equal(f.game.hits,2);
 }
});

test('keyboard forwards physical timestamps for both the attack and release',()=>{
 const f=fixture([note(900,2,0)]),calls=[];
 const press=f.input.press,release=f.input.release;
 f.input.press=(lane,id,at)=>{calls.push(['down',at]);return press(lane,id);};
 f.input.release=(id,at)=>{calls.push(['up',at]);release(id);};
 const k=keyboardFixture(f);k.dispatch('keydown','a',{timeStamp:1234});k.dispatch('keyup','a',{timeStamp:1274});
 assert.deepEqual(calls,[['down',1234],['up',1274]]);
});
