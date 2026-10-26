import test from 'node:test';
import assert from 'node:assert/strict';
import {createSliceBurst,sliceSplashSeam,createSliceSplash,sliceDropletPose,sliceSlashPose,stepSliceEffects,drawSliceEffects} from './slice-effects.js';
import {cutShape,splitFragment,polygonArea} from './slice-fragments.js';
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
 const burst=createSliceBurst({x:20,y:30,r:40},{x:0,y:30},{x:80,y:30},'#49ceff',false,()=>.5);burst.flash.age=.08;delete burst.flash.splash;drawSliceEffects(ctx,{sparks:[],flashes:[burst.flash]});assert.equal(strokes,3);assert.equal(fills,1);assert.equal(saved,0);
 strokes=fills=0;burst.flash.quiet=true;drawSliceEffects(ctx,{sparks:[],flashes:[burst.flash]});assert.equal(strokes,1);assert.equal(fills,0);assert.equal(saved,0);
});

test('fluid starts on the actual off-center cut seam, rotates with the cut, and keeps concave star gaps dry',()=>{
 const p={x:100,y:100,r:40,shape:2,angle:0},a={x:20,y:116},b={x:180,y:116};
 const seam=sliceSplashSeam(p,a,b);assert.equal(seam.x,100);assert.equal(seam.y,116);assert.equal(seam.spans.length,1);
 assert(Math.abs(seam.spans[0][0]+33.2)<1e-9);assert(Math.abs(seam.spans[0][1]-33.2)<1e-9);
 const theta=.8,rotate=q=>({x:100+(q.x-100)*Math.cos(theta)-(q.y-100)*Math.sin(theta),y:100+(q.x-100)*Math.sin(theta)+(q.y-100)*Math.cos(theta)});
 const turned=sliceSplashSeam({...p,angle:theta},rotate(a),rotate(b));
 turned.spans[0].forEach((n,i)=>assert(Math.abs(n-seam.spans[0][i])<1e-8));assert(Math.abs(turned.angle-theta)<1e-8);
 const star={x:0,y:0,r:40,shape:3,angle:0};let found=false;
 for(let y=-39;y<39;y++){const s=sliceSplashSeam(star,{x:-60,y},{x:60,y});if(s.spans.length>1){found=true;const splash=createSliceSplash(star,{x:-60,y},{x:60,y},false,()=>.5);assert(splash.drops.every(d=>s.spans.some(([a,b])=>d.x>=a&&d.x<=b)));}}
 assert(found,'at least one star cut must cross separated arms');
});
test('fragment recuts spray from their remaining mask with a smaller footprint',()=>{
 const piece={x:100,y:100,r:48,shape:0,angle:0,vx:0,vy:0,spin:0},halves=cutShape(piece,{x:40,y:100},{x:160,y:100},1),f=halves[0];
 const a={x:f.x,y:f.y-90},b={x:f.x,y:f.y+90},parts=splitFragment(f,a,b,2);assert.equal(parts.length,2);
 const r=Math.min(f.r,Math.sqrt(polygonArea(f.mask)/Math.PI)),splash=createSliceSplash({...f,r},a,b,false,()=>.5);
 assert(r<f.r);assert.equal(splash.spans.length,1);assert(splash.spans[0][1]-splash.spans[0][0]<piece.r*1.1);
 assert.equal(splash.drops.length,10);assert(splash.drops.every(d=>d.size<r*.15));assert.equal(f.depth,1);
});
test('droplets scale with shape size, remain local, and reduced motion uses a short stationary cue',()=>{
 const make=(r,quiet=false)=>createSliceSplash({x:0,y:0,r,shape:0,vx:0,vy:0},{x:-r*2,y:0},{x:r*2,y:0},quiet,()=>.5);
 const small=make(24),large=make(60);assert.equal(large.drops.length,10);
 for(let i=0;i<small.drops.length;i++)for(const t of [.02,.1,.3,.48]){
  const a=sliceDropletPose(small,small.drops[i],t),b=sliceDropletPose(large,large.drops[i],t);
  for(const key of ['x','y','radius','tail'])assert(Math.abs(b[key]-a[key]*2.5)<1e-8);
  assert(Math.abs(a.x)+a.radius+a.tail<small.r*2);assert(Math.abs(a.y)+a.radius+a.tail<small.r*2);
 }
 const quiet=make(40,true);assert.equal(quiet.drops.length,4);assert.equal(quiet.life,.2);assert.equal(quiet.vx,0);assert.equal(quiet.vy,0);
 for(const d of quiet.drops){const a=sliceDropletPose(quiet,d,.03),b=sliceDropletPose(quiet,d,.15);assert.equal(a.x,b.x);assert.equal(a.y,b.y);assert.equal(a.tail,0);assert(b.opacity<a.opacity);}
});
test('splash outlives the short slash, then expires without leaving stale effects',()=>{
 const b=createSliceBurst({x:0,y:0,r:40,shape:2},{x:-80,y:0},{x:80,y:0},'#49ceff',false,()=>.5),effects={sparks:[],flashes:[b.flash]};
 stepSliceEffects(effects,.35);assert.equal(effects.flashes.length,1);assert.equal(sliceSlashPose(b.flash).opacity,0);assert(b.flash.age<b.flash.splash.life);
 stepSliceEffects(effects,.18);assert.equal(effects.flashes.length,0);
});
test('fluid rendering is capped, uses rounded paths, and restores every canvas save',()=>{
 let saved=0,fills=0,curves=0,ellipses=0;
 const ctx={save(){saved++;},restore(){saved--;},translate(){},rotate(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},stroke(){},fill(){fills++;},bezierCurveTo(){curves++;},quadraticCurveTo(){curves++;},ellipse(){ellipses++;}};
 const f=createSliceBurst({x:0,y:0,r:40,shape:2},{x:-80,y:0},{x:80,y:0},'#49ceff',false,()=>.5).flash;f.age=.1;
 drawSliceEffects(ctx,{sparks:[],flashes:Array(100).fill(f)});assert.equal(saved,0);assert(curves>0);assert.equal(ellipses,12*10);assert(fills<300);
});
