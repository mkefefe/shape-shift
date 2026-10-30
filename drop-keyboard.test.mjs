import test from 'node:test';
import assert from 'node:assert/strict';
import {bindDropKeyboard} from './drop-keyboard.js';
function fixture(){
 const host=new EventTarget(),dialog=new EventTarget();dialog.ownerDocument=new EventTarget();
 let enabled=true,x=160,drops=0;
 const keys=bindDropKeyboard(dialog,{host,active:()=>enabled,move:dx=>x=Math.max(20,Math.min(300,x+dx)),drop:()=>drops++});
 const key=(code,type='keydown',repeat=false)=>{const event=new Event(type,{cancelable:true});Object.assign(event,{code,repeat});(type==='keyup'?host:dialog).dispatchEvent(event);};
 return {host,dialog,keys,key,get x(){return x;},get drops(){return drops;},set active(value){enabled=value;}};
}
test('held aim uses elapsed time, stops on release and clamps at the board edge',()=>{
 const a=fixture(),b=fixture();a.key('KeyD');b.key('KeyD');
 for(let i=0;i<30;i++)a.keys.step(1/60);for(let i=0;i<15;i++)b.keys.step(1/30);
 assert(Math.abs(a.x-b.x)<1e-8);assert(a.x>160&&a.x<300);
 a.key('KeyD','keyup');const stopped=a.x;a.keys.step(.05);assert.equal(a.x,stopped);
 b.keys.step(100);assert(b.x<300);for(let i=0;i<20;i++)b.keys.step(.05);assert.equal(b.x,300);
});
test('opposite directions cancel and S drops once per physical press',()=>{
 const f=fixture();f.key('KeyA');f.key('KeyD');f.keys.step(.05);assert.equal(f.x,160);
 f.key('KeyD','keyup');f.keys.step(.05);assert(f.x<160);
 f.key('KeyS');f.key('KeyS','keydown',true);assert.equal(f.drops,1);f.key('KeyS','keyup');f.key('KeyS');assert.equal(f.drops,2);
});
test('focus loss and pause clear held movement; inactive inputs cannot drop',()=>{
 const f=fixture();for(const [target,name] of [[f.host,'blur'],[f.host,'shape-shift-pause'],[f.host,'shape-shift-input-reset'],[f.dialog,'focusout'],[f.dialog.ownerDocument,'visibilitychange']]){
  f.key('KeyA');target.dispatchEvent(new Event(name));f.keys.step(.05);assert.equal(f.x,160);
 }
 f.key('KeyD');f.active=false;f.keys.step(.05);f.key('KeyS');f.active=true;f.keys.step(.05);assert.equal(f.x,160);assert.equal(f.drops,0);
});
