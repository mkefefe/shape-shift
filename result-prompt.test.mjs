import test from 'node:test';
import assert from 'node:assert/strict';
import {bindResultPrompt} from './result-prompt.js';

test('result prompt follows the midpoint below the frame after resize and reward expansion',()=>{
 let bottom=800,height=600,viewportHeight=1000,queued,resize,mutation,gap;
 const dialog={open:true,offsetHeight:600,getBoundingClientRect:()=>({bottom,height}),style:{setProperty:(name,value)=>{assert.equal(name,'--result-prompt-gap');gap=parseFloat(value);}},addEventListener(){},removeEventListener(){}};
 const host={innerHeight:1000,visualViewport:{get height(){return viewportHeight;},offsetTop:0,addEventListener(){},removeEventListener(){}},requestAnimationFrame:f=>(queued=f,1),cancelAnimationFrame(){},addEventListener(){},removeEventListener(){},ResizeObserver:class{constructor(f){resize=f;}observe(){}disconnect(){}},MutationObserver:class{constructor(f){mutation=f;}observe(){}disconnect(){}}};
 const cleanup=bindResultPrompt(dialog,{},host);queued();assert.equal(bottom+gap,900);
 bottom=850;height=700;dialog.offsetHeight=700;resize();queued();assert.equal(bottom+gap,925);
 viewportHeight=700;bottom=620;height=540;dialog.offsetHeight=540;resize();queued();assert.equal(bottom+gap,660);
 // A transformed panel needs local coordinates while retaining screen midpoint.
 viewportHeight=1000;bottom=800;height=300;dialog.offsetHeight=600;mutation();queued();assert.equal(bottom+gap*.5,900);
 cleanup();
});
