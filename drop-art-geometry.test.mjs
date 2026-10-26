import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {dropArtworkGeometry} from './drop-art-geometry.js';
import {makeDropBody,createDropGame} from './shape-drop-engine.js';
import {dropMergePose,drawDropMerge,DROP_MERGE_DURATION} from './drop-merge-fx.js';
const context={console};vm.runInNewContext(fs.readFileSync(new URL('./assets/vendor/matter-0.20.0.min.js',import.meta.url),'utf8'),context);const M=context.Matter;
function mask(predicate,width=160,height=144){const data=new Uint8ClampedArray(width*height*4);for(let y=0;y<height;y++)for(let x=0;x<width;x++)data[(y*width+x)*4+3]=predicate((x+.5-width/2)/(width/2),(y+.5-height/2)/(height/2))?255:0;return {data,width,height};}
const profile=(m,shape=2)=>dropArtworkGeometry(m.data,m.width,m.height,shape);
test('alpha geometry follows the opaque edge, including rounded artwork and native aspect',()=>{
 const p=profile(mask((x,y)=>Math.abs(x)<.92&&Math.abs(y)<.92&&Math.hypot(Math.max(0,Math.abs(x)-.65),Math.max(0,Math.abs(y)-.65))<.27));
 assert.equal(p.parts.length,1);assert(p.points.length>8);assert.equal(p.aspect,160/144);
 for(const angle of [0,.4,Math.PI/2,Math.PI])for(const r of [25,80]){const b=makeDropBody(M,100,200,{shape:2,color:0,r,angle,geometry:p});assert(b.vertices.length>=8);for(const v of b.vertices){const x=(v.x-100)*Math.cos(angle)+(v.y-200)*Math.sin(angle),y=-(v.x-100)*Math.sin(angle)+(v.y-200)*Math.cos(angle);assert(Math.abs(x)<r*.8&&Math.abs(y)<r*.8);}}
});
test('hollow-center alpha and completely transparent inputs do not create zero-area bodies',()=>{
 for(const m of [mask((x,y)=>Math.hypot(x,y)>.45&&Math.hypot(x,y)<.9),mask(()=>false)])for(const shape of [0,1,2,3]){
  const p=profile(m,shape),b=makeDropBody(M,0,0,{shape,color:0,r:40,geometry:p});assert(Number.isFinite(b.mass)&&b.mass>0);assert(b.area>200);assert(p.points.length>=3);
 }
});
test('concave stars retain open notches instead of gaining an invisible convex hull',()=>{
 const m=mask((x,y)=>{const a=Math.atan2(y,x)+Math.PI/2,sector=((a%(Math.PI*2)+Math.PI*2)%(Math.PI*2))/(Math.PI/5),t=sector%1,edge=Math.floor(sector)%2?.43+.45*t:.88-.45*t;return Math.hypot(x,y)<edge;},192,192),p=profile(m,3),b=makeDropBody(M,0,0,{shape:3,color:0,r:60,geometry:p});
 assert(p.parts.length>1&&p.parts.length<15);const a=-Math.PI/2+Math.PI/5,r=60*1.23*.73;
 assert.equal(M.Query.point([b],{x:Math.cos(a)*r,y:Math.sin(a)*r}).length,0);assert.equal(M.Query.point([b],{x:0,y:-60*1.23*.8}).length,1);
});
test('sprite-shaped bodies settle to the floor and nearby same-shape pieces only clear on contact',()=>{
 const p=profile(mask((x,y)=>Math.abs(x)<.92&&Math.abs(y)<.92));let cleared=0;const g=createDropGame(M,{autoDrop:false,geometryFor:()=>p,onClear:e=>cleared+=e.pieces.length});
 const a=g.addPiece({shape:2,color:0,r:40,obstacle:true},100,400);for(let i=0;i<720;i++)g.step(1/120);
 assert(Math.abs(Math.max(...a.vertices.map(v=>v.y))-g.height)<.2);
 const b=g.addPiece({shape:2,color:0,r:40},180,350),c=g.addPiece({shape:2,color:1,r:40},260,350);g.step(1/120);assert.equal(cleared,0);M.Body.setPosition(c,{x:b.position.x+60,y:b.position.y});g.step(1/120);assert.equal(cleared,2);g.dispose();
});
test('merge shines at full size, holds one joined shape, and scales burst to the original size',()=>{
 const before=dropMergePose(.1,25),joined=dropMergePose(.46,25),collapsed=dropMergePose(.71,25);assert.equal(before.scale,1);assert.equal(before.travel,0);assert.equal(joined.scale,1);assert.equal(joined.travel,1);assert.equal(collapsed.scale,0);
 const small=dropMergePose(.9,25),large=dropMergePose(.9,80);assert(large.spread>small.spread*3);assert(large.glow>small.glow*3);assert(large.particleRadius>small.particleRadius);assert.equal(dropMergePose(DROP_MERGE_DURATION,25).visible,false);
 const calls=[],ctx={save(){},restore(){},translate(){},rotate(){},createRadialGradient(){return {addColorStop(){}};},fillRect(){},beginPath(){},arc(){},fill(){},moveTo(){},lineTo(){},stroke(){}},event={x:100,y:200,pieces:[{x:60,y:200,angle:0,tile:{r:25}},{x:140,y:200,angle:0,tile:{r:70}}]};
 drawDropMerge(ctx,event,.46,(_c,tile,scale)=>calls.push({tile,scale}));assert.equal(calls.length,1);assert.equal(calls[0].tile.r,70);assert.equal(calls[0].scale,1);let particles=0;ctx.arc=()=>particles++;drawDropMerge(ctx,event,.9,()=>{});assert.equal(particles,12);
});
