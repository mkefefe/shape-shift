import test from 'node:test';
import assert from 'node:assert/strict';
import {createSliceBurst,sliceSlashPose,stepSliceEffects,drawSliceEffects} from './slice-effects.js';
test('successful-cut accent follows swipe direction and anchors to the actual crossing',()=>{
 const piece={x:100,y:100,r:32},a={x:40,y:84},b={x:160,y:84};
 const forward=createSliceBurst(piece,a,b,'#49ceff',false,()=>.5),reverse=createSliceBurst(piece,b,a,'#49ceff',false,()=>.5);
 assert.equal(forward.flash.x,100);assert.equal(forward.flash.y,84);assert.equal(forward.flash.angle,0);assert.equal(Math.abs(reverse.flash.angle),Math.PI);
 assert.equal(forward.sparks.length,12);assert(forward.sparks.some(p=>p.x!==forward.flash.x));assert.deepEqual(piece,{x:100,y:100,r:32});
 const stationary=createSliceBurst(piece,piece,piece,'#fff',false,()=>.5);assert.equal(stationary.flash.x,100);assert.equal(stationary.flash.y,100);
});
test('curved slash advances from its leading edge, fades, and scales with shape size',()=>{
 const small={r:24,age:.08,life:.34},large={...small,r:60};const a=sliceSlashPose(small),b=sliceSlashPose(large);
 assert(a.head>a.tail);for(const key of ['length','bend','glint'])assert(Math.abs(b[key]/a[key]-2.5)<1e-9);
 const later=sliceSlashPose({...small,age:.25});assert(later.head>=a.head);assert(later.tail>a.tail);assert(later.opacity<a.opacity);assert.equal(sliceSlashPose({...small,age:.34}).opacity,0);
});
test('reduced motion keeps a static local highlight without the traveling slash or glint',()=>{
 const burst=createSliceBurst({x:20,y:30,r:40},{x:0,y:30},{x:80,y:30},'#49ceff',true,()=>.5),a=sliceSlashPose(burst.flash),b=sliceSlashPose({...burst.flash,age:.08});
 assert.equal(a.glint,0);assert.equal(b.glint,0);assert.equal(a.head,b.head);assert.equal(a.tail,b.tail);assert.equal(burst.flash.life,.16);assert.equal(burst.sparks.length,6);
});
test('accent and existing particles retain bounded queues and expire completely',()=>{
 const effects={sparks:[],flashes:[]};for(let i=0;i<100;i++){const b=createSliceBurst({x:i,y:10,r:30},{x:0,y:10},{x:120,y:10},'#49ceff',false,()=>.5);effects.sparks.push(...b.sparks);effects.flashes.push(b.flash);}
 stepSliceEffects(effects,.01);assert.equal(effects.flashes.length,24);assert.equal(effects.sparks.length,96);stepSliceEffects(effects,.6);assert.equal(effects.flashes.length,0);assert.equal(effects.sparks.length,0);
});
test('drawing a cut adds only local paths and restores canvas state',()=>{
 let saved=0,strokes=0,fills=0;const ctx={save(){saved++;},restore(){saved--;},translate(){},rotate(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},stroke(){strokes++;},fill(){fills++;}};
 const burst=createSliceBurst({x:20,y:30,r:40},{x:0,y:30},{x:80,y:30},'#49ceff',false,()=>.5);burst.flash.age=.08;drawSliceEffects(ctx,{sparks:[],flashes:[burst.flash]});assert.equal(strokes,3);assert.equal(fills,1);assert.equal(saved,0);
 strokes=fills=0;burst.flash.quiet=true;drawSliceEffects(ctx,{sparks:[],flashes:[burst.flash]});assert.equal(strokes,1);assert.equal(fills,0);assert.equal(saved,0);
});
