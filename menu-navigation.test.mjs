import test from 'node:test';
import assert from 'node:assert/strict';
import {bindMenuSwipe,menuBannerVisible,syncMenuBanner} from './menu-navigation.js';

function fixture(){
 const host=new EventTarget(),document=new EventTarget(),surface=new EventTarget();
 document.defaultView=host;surface.ownerDocument=document;surface.clientWidth=390;
 const captured=new Set(),directions=[],taps=[],paints=[];let enabled=true,cancels=0;
 surface.setPointerCapture=id=>captured.add(id);surface.hasPointerCapture=id=>captured.has(id);
 surface.releasePointerCapture=id=>{captured.delete(id);send('lostpointercapture',{pointerId:id});};
 const control=bindMenuSwipe(surface,{enabled:()=>enabled,modeAt:target=>target.mode??-1,
  paint:(...args)=>paints.push(args),swipe:direction=>directions.push(direction),
  tap:(...args)=>taps.push(args),cancel:()=>cancels++,now:()=>100});
 function send(type,values={},target=surface){
  const event=new Event(type,{cancelable:true});
  const {target:eventTarget,...fields}=values;
  Object.assign(event,{pointerId:1,isPrimary:true,button:0,clientX:260,clientY:300,...fields});
  Object.defineProperty(event,'target',{value:values.target??{mode:2,closest:()=>null}});
  target.dispatchEvent(event);return event;
 }
 function drag(id=1){send('pointerdown',{pointerId:id});send('pointermove',{pointerId:id,clientX:100});send('pointerup',{pointerId:id,clientX:100},host);}
 return {host,document,surface,control,send,drag,captured,directions,taps,paints,get cancels(){return cancels;},set enabled(value){enabled=value;}};
}

test('swipes complete and release capture before navigation opens a dialog',()=>{
 const f=fixture();f.drag();assert.deepEqual(f.directions,[1]);assert.equal(f.captured.size,0);assert.deepEqual(f.paints.at(-1),[0,false]);
 f.control.reset();f.drag(2);assert.deepEqual(f.directions,[1,1]);
});
test('interrupted capture and native lifecycle changes cannot leave swipes stuck',()=>{
 for(const interruption of ['lostpointercapture','pointercancel','resize','blur','androidpause','androidresume','shape-shift-input-reset']){
  const f=fixture();f.send('pointerdown');f.send('pointermove',{clientX:200});
  if(interruption==='lostpointercapture')f.send(interruption);
  else if(interruption==='pointercancel')f.send(interruption,{},f.host);
  else f.host.dispatchEvent(new Event(interruption));
  assert.deepEqual(f.paints.at(-1),[0,false],interruption);
  f.send('pointerup',{clientX:50},f.host);assert.deepEqual(f.directions,[],interruption);
  f.drag(2);assert.deepEqual(f.directions,[1],interruption);
 }
});
test('opening a menu mid-gesture cancels it and returning allows a fresh swipe',()=>{
 const f=fixture();f.send('pointerdown');f.enabled=false;f.control.reset();
 f.send('pointerup',{clientX:50},f.host);assert.equal(f.directions.length,0);
 f.enabled=true;f.drag(7);assert.deepEqual(f.directions,[1]);
});
test('only the active pointer finishes a swipe; capture failure still permits completion',()=>{
 const f=fixture();f.surface.setPointerCapture=()=>{throw Error('Pointer interrupted');};
 f.send('pointerdown');f.send('pointerup',{pointerId:2,clientX:30},f.host);assert.equal(f.directions.length,0);
 f.send('pointerup',{clientX:30},f.host);assert.deepEqual(f.directions,[1]);
});
test('successive taps remain available to double-tap logic',()=>{
 const f=fixture();for(let i=0;i<2;i++){f.send('pointerdown');f.send('pointerup',{},f.host);}
 assert.equal(f.taps.length,2);assert.equal(f.cancels,0);assert.equal(f.captured.size,0);
});
test('background swipes work without hijacking other buttons or secondary fingers',()=>{
 const f=fixture();const background={closest:()=>null};f.send('pointerdown',{target:background});f.send('pointerup',{clientX:30},f.host);
 assert.deepEqual(f.directions,[1]);assert.equal(f.taps.length,0);
 f.send('pointerdown',{target:{closest:()=>({})}});f.send('pointerup',{clientX:30},f.host);
 f.send('pointerdown',{isPrimary:false});f.send('pointerup',{clientX:30},f.host);assert.deepEqual(f.directions,[1]);
});
test('home pop-ups do not hide the banner, including nested dialogs',()=>{
 for(const id of ['settings-dialog','quests-dialog','shop-dialog','profile-dialog','achievements-dialog','games-hub','difficulty-dialog','coin-help-dialog']){
  assert.equal(menuBannerVisible('home',[id]),true,id);
 }
 assert.equal(menuBannerVisible('home',['settings-dialog','language-dialog']),true);
 const calls=[];let dialogs=[];
 const doc={getElementById:()=>({dataset:{screen:'home'}}),querySelectorAll:()=>dialogs.map(id=>({id}))};
 const bridge={setBannerVisible:value=>calls.push(value)};
 syncMenuBanner(doc,bridge);dialogs=['quests-dialog'];syncMenuBanner(doc,bridge);dialogs=[];syncMenuBanner(doc,bridge);
 assert.deepEqual(calls,[true,true,true]);
});
test('actual gameplay hides the banner even with a pause or result panel open',()=>{
 for(const id of ['shape-drop','shape-slice','piano-flow'])assert.equal(menuBannerVisible('home',[id,'quests-dialog']),false);
 for(const screen of ['game','map','result'])assert.equal(menuBannerVisible(screen,[]),false);
});

test('a fresh Play tap is not swallowed after a swipe without a synthetic click',()=>{
 const f=fixture();f.drag();const button={mode:-1,closest:()=>({})};
 f.send('pointerdown',{target:button});f.send('pointerup',{target:button},f.host);
 assert.equal(f.send('click',{target:button}).defaultPrevented,false);
});

test('story playback hides the native banner even when launched from home',()=>{assert.equal(menuBannerVisible('home',['story-scene']),false);});
