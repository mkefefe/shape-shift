import test from 'node:test';
import assert from 'node:assert/strict';
import {enableHoldBuying} from './hold-buy.js';

test('ad reset stops a held purchase and removes its stale click guard',()=>{
 const priorWindow=globalThis.window,priorDocument=globalThis.document;
 const host=new EventTarget(),doc=new EventTarget(),dialog=new EventTarget(),timers=new Map();let nextId=0,purchases=0;
 const button={disabled:false,dataset:{repeatBuy:'shield'},onclick(){purchases++;},closest(){return this;}};
 host.ShapeShiftPlatform={paused:false,setTimeout(fn){const id=++nextId;timers.set(id,fn);return id;},clearTimeout(id){timers.delete(id);}};
 dialog.open=true;dialog.contains=()=>true;doc.elementFromPoint=()=>button;
 globalThis.window=host;globalThis.document=doc;
 const send=(target,type,properties={})=>{const e=new Event(type,{cancelable:true});Object.assign(e,{pointerId:1,button:0,isPrimary:true,clientX:20,clientY:20,detail:1,...properties});Object.defineProperty(e,'target',{value:button});target.dispatchEvent(e);return e;};
 try{
  enableHoldBuying(dialog);send(dialog,'pointerdown');assert.equal(timers.size,1);
  const [id,fn]=[...timers][0];timers.delete(id);fn();assert.equal(purchases,1);assert.equal(timers.size,1);
  send(host,'shape-shift-input-reset');assert.equal(timers.size,0);
  assert.equal(send(dialog,'click').defaultPrevented,false);
  send(doc,'pointerup');assert.equal(purchases,1);
  send(dialog,'pointerdown');assert.equal(timers.size,1);
 }finally{globalThis.window=priorWindow;globalThis.document=priorDocument;}
});
