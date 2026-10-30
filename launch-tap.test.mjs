import test from 'node:test';
import assert from 'node:assert/strict';
import {bindLaunchTap} from './menu-navigation.js';
function fixture(){
 const button=new EventTarget(),host=new EventTarget(),doc=new EventTarget();doc.defaultView=host;button.ownerDocument=doc;
 button.isConnected=true;button.disabled=false;button.closest=()=>null;button.getClientRects=()=>[{}];button.getBoundingClientRect=()=>({left:10,right:110,top:10,bottom:60});let calls=0;
 bindLaunchTap(button,()=>calls++);
 function send(type,values={},target=type==='pointerdown'||type==='click'?button:host){const e=new Event(type,{cancelable:true});Object.assign(e,{pointerId:1,isPrimary:true,button:0,clientX:50,clientY:30,detail:1,...values});target.dispatchEvent(e);return e;}
 return {button,host,doc,send,get calls(){return calls;}};
}
test('one completed tap launches even when the browser produces no click',()=>{const f=fixture();f.send('pointerdown');f.send('pointerup');assert.equal(f.calls,1);});
test('the following native click cannot launch twice, but the next tap works',()=>{const f=fixture();for(let i=1;i<=3;i++){f.send('pointerdown');f.send('pointerup');f.send('click');assert.equal(f.calls,i);}});
test('keyboard and assistive clicks still launch',()=>{const f=fixture();f.send('click',{detail:0});assert.equal(f.calls,1);});
test('dragging away and back does not launch or swallow the next tap',()=>{const f=fixture();f.send('pointerdown');f.send('pointermove',{clientX:100});f.send('pointerup');f.send('click');assert.equal(f.calls,0);f.send('pointerdown');f.send('pointerup');assert.equal(f.calls,1);});
test('cancelled or interrupted presses do not launch',()=>{for(const name of ['pointercancel','blur','pagehide','androidpause','shape-shift-input-reset']){const f=fixture();f.send('pointerdown');f.send(name);f.send('pointerup');f.send('click');assert.equal(f.calls,0,name);}});
test('disabled, hidden, disconnected and inert buttons reject taps',()=>{for(const change of [b=>b.disabled=true,b=>b.isConnected=false,b=>b.closest=()=>({}),b=>b.getClientRects=()=>[]]){const f=fixture();f.send('pointerdown');change(f.button);f.send('pointerup');assert.equal(f.calls,0);}});
test('edge taps survive the visual shrinking of a pressed button',()=>{const f=fixture();f.send('pointerdown',{clientX:8});f.send('pointerup',{clientX:8});assert.equal(f.calls,1);});
test('secondary pointers do not complete a primary press',()=>{const f=fixture();f.send('pointerdown');f.send('pointerup',{pointerId:2});assert.equal(f.calls,0);f.send('pointerup');assert.equal(f.calls,1);});

test('a retargeted native click on a new dialog is consumed, then a fresh gesture works',()=>{
 const f=fixture();f.send('pointerdown');f.send('pointerup');
 assert.equal(f.send('click',{},f.doc).defaultPrevented,true);
 f.send('pointerdown',{},f.doc);assert.equal(f.send('click',{},f.doc).defaultPrevented,false);
});

test('an ad input reset releases an old launch click gate and accepts the next tap',()=>{
 const f=fixture();f.send('pointerdown');f.send('pointerup');
 assert.equal(f.send('click',{},f.doc).defaultPrevented,true);
 f.send('shape-shift-input-reset');assert.equal(f.send('click',{},f.doc).defaultPrevented,false);
 f.send('pointerdown');f.send('pointerup');assert.equal(f.calls,2);
});
