import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameplayScene} from './gameplay-scene.js';
import {createSceneryProgress,createSceneryTint} from './scenery-progress.js';
import {createWaterSurface} from './water-surface.js';

function globals(values){const descriptors=new Map(Object.keys(values).map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));for(const [key,value]of Object.entries(values))Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});return()=>{for(const [key,descriptor]of descriptors)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];};}

test('unchanged scenery reuses its backing bitmap while particles keep drawing',()=>{
 const canvases=[];let gradientCalls=0,draws=0;
 const ctx=new Proxy({createLinearGradient(){gradientCalls++;return{addColorStop(){}}},createRadialGradient(){gradientCalls++;return{addColorStop(){}}},drawImage(){draws++;}}, {get(target,key){return target[key]||(()=>{});}});
 const restore=globals({document:{createElement(){let width=300,height=150;const canvas={resizes:0,setAttribute(){},getContext:()=>ctx,get width(){return width},set width(v){width=v;this.resizes++},get height(){return height},set height(v){height=v;this.resizes++}};canvases.push(canvas);return canvas;}},navigator:{hardwareConcurrency:8},window:{innerHeight:800,devicePixelRatio:1,ShapeShiftPlatform:{paused:false}},Image:class{getAttribute(){return null}},ResizeObserver:class{observe(){}}});
 try{const scene=createGameplayScene({prepend(){},getBoundingClientRect:()=>({width:400,height:800})});scene.scene('endless');const allocations=canvases[1].resizes,gradients=gradientCalls;
  for(let frame=0;frame<600;frame++)scene.tick(1000/60,{score:0,duration:3200});
  assert.equal(canvases[1].resizes,allocations);assert.equal(gradientCalls,gradients);assert(draws>250,'particles still paint throughout the run');
  scene.tick(250,{score:100,duration:3200});assert(gradientCalls>gradients,'score advancement still changes scenery');assert.equal(canvases[1].resizes,allocations,'color change repaints without resizing');
 }finally{restore();}
});

test('stationary scenery avoids palette and style churn but still advances colors',()=>{
 const progress=createSceneryProgress(),first=progress.step(.1,0);
 for(let i=0;i<100;i++)assert.equal(progress.step(.1,0).palette,first.palette);
 assert.notDeepEqual(progress.step(.1,100).palette,first.palette);
 let writes=0;const style={setProperty(){writes++;},set filter(_){writes++;}};const tint=createSceneryTint({style},{garden:true});
 for(let i=0;i<100;i++)tint.step(.1,0);assert.equal(writes,3);tint.step(.1,100);assert(writes>3);
});

test('water mask reuse keeps alpha identical to reference polygon distances',()=>{
 const scene={width:32,height:32,falls:[[7,3,11,20,9,9]],pools:[[[4,18],[22,16],[28,23],[19,29],[5,27]]]};
 const masks=[];const restore=globals({document:{createElement(){return{width:0,height:0,getContext(type){if(type==='webgl')return null;return{drawImage(){},createImageData(width,height){return{width,height,data:new Uint8ClampedArray(width*height*4)}},putImageData(image){masks.push(image);}};}};}}});
 function distance(x,y,points){let inside=false,min=Infinity;for(let i=0,j=points.length-1;i<points.length;j=i++){const [ax,ay]=points[j],[bx,by]=points[i],dx=bx-ax,dy=by-ay;if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;const t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy)));min=Math.min(min,Math.hypot(x-ax-t*dx,y-ay-t*dy));}return inside?min:0;}
 try{const first=createWaterSurface({},'garden',scene);createWaterSurface({},'garden',scene);assert.equal(masks.length,1,'same scene mask is built once');const mask=masks[0];
  const regions=[{points:scene.pools[0],feather:10},{points:[[2.5,3],[11.5,3],[15.5,20],[6.5,20]],feather:4}];
  for(let y=0;y<mask.height;y++)for(let x=0;x<mask.width;x++){const alpha=Math.max(...regions.map(r=>{const f=Math.max(0,Math.min(1,(distance(x+first.left+.5,y+first.top+.5,r.points)-1.5)/r.feather));return Math.round(f*f*(3-2*f)*255);}));assert.equal(mask.data[(y*mask.width+x)*4+3],alpha);}
 }finally{restore();}
});
