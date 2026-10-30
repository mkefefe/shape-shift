import test from 'node:test';
import assert from 'node:assert/strict';
import {createCoinFlight} from './coin-flight.js';
test('memory art stays visible before flight and reward arrival includes the reveal time',()=>{
 const previous=globalThis.document;
 const element=()=>({style:{visibility:''},setAttribute(){},removeAttribute(){},append(){},remove(){},getBoundingClientRect(){return {x:10,y:10,width:60,height:60}},cloneNode(){return element()}});
 const art=element();globalThis.document={createElement:element,body:{append(){}}};
 try{
  const effect=createCoinFlight({querySelector:()=>art},element(),false,650);
  effect.draw(0);effect.draw(649);assert.equal(art.style.visibility,'');
  effect.draw(650);assert.equal(art.style.visibility,'hidden');assert.equal(effect.duration,1370);
  effect.clear();assert.equal(art.style.visibility,'');
 }finally{globalThis.document=previous;}
});
