import test from 'node:test';
import assert from 'node:assert/strict';
import {createCoinFlight,copyFlightArt,flightArtBounds,COIN_FLIGHT_MS,COIN_PICKUP_MS} from './coin-flight.js';
test('memory art stays visible before flight and reward arrival includes the reveal time',()=>{
 const previous=globalThis.document;
 const element=()=>({style:{visibility:''},setAttribute(){},removeAttribute(){},append(){},remove(){},querySelectorAll(){return []},getBoundingClientRect(){return {x:10,y:10,width:60,height:60}},cloneNode(){return element()}});
 const art=element();globalThis.document={createElement:element,body:{append(){}}};
 try{
  const effect=createCoinFlight({querySelector:()=>art},element(),false,650);
  effect.draw(0);effect.draw(649);assert.equal(art.style.visibility,'');
  effect.draw(650);assert.equal(art.style.visibility,'hidden');assert.equal(effect.duration,650+COIN_PICKUP_MS+COIN_FLIGHT_MS);
  effect.clear();assert.equal(art.style.visibility,'');
 }finally{globalThis.document=previous;}
});

test('a flying skin retains its painted canvas instead of cloning a blank bitmap',()=>{
 const original={width:144,height:144},other={width:72,height:72},draws=[];
 const copies=[0,1].map(index=>({width:0,height:0,getContext:()=>({drawImage:(...args)=>draws.push({index,args})})}));
 const clone={removeAttribute(){},querySelectorAll:()=>copies};
 const art={cloneNode:()=>clone,querySelectorAll:()=>[original,other]};
 assert.equal(copyFlightArt(art),clone);
 assert.deepEqual(copies.map(c=>[c.width,c.height]),[[144,144],[72,72]]);
 assert.deepEqual(draws,[{index:0,args:[original,0,0]},{index:1,args:[other,0,0]}]);
});

test('collection lifts the visible shape before travel, without per-frame layout writes',()=>{
 const previous=globalThis.document,appended=[];
 const element=()=>({style:{visibility:''},setAttribute(){},removeAttribute(){},append(){},remove(){this.removed=true},querySelectorAll(){return []},getBoundingClientRect(){return {x:100,y:300,width:60,height:60}},cloneNode(){return element()}});
 const art=element(),target=element();target.getBoundingClientRect=()=>({x:200,y:20,width:24,height:24});
 globalThis.document={createElement:element,body:{append(el){appended.push(el)}}};
 try{
  const effect=createCoinFlight({querySelector:()=>art},target);
  effect.draw(0);assert.equal(appended[0].style.opacity,'1');assert.equal(art.style.visibility,'hidden');
  const departure=appended[0].style.transform;
  effect.draw(COIN_PICKUP_MS/2);assert.notEqual(appended[0].style.transform,departure);assert.ok(Number(appended[1].style.opacity)>0);
  effect.draw(COIN_PICKUP_MS+COIN_FLIGHT_MS/2);assert.equal(appended[0].style.left,'0px');assert.equal(appended[0].style.top,'0px');assert.equal(appended[0].style.opacity,'1');
  effect.draw(effect.duration);assert.equal(appended[0].style.opacity,'0');effect.clear();assert(appended.every(el=>el.removed));assert.equal(art.style.visibility,'');
 }finally{globalThis.document=previous;}
});

test('a pressed or flipping card cannot flatten its flying shape',()=>{
 const art={offsetWidth:100,offsetHeight:100,getBoundingClientRect:()=>({x:50,y:200,width:12,height:90})};
 const bounds=flightArtBounds(art);assert.equal(bounds.width,90);assert.equal(bounds.height,90);
 assert.equal(bounds.x+bounds.width/2,56);assert.equal(bounds.y+bounds.height/2,245);
 const wide={offsetWidth:120,offsetHeight:80,getBoundingClientRect:()=>({x:0,y:0,width:30,height:60})};
 const b=flightArtBounds(wide);assert.equal(b.width/b.height,1.5);
});
