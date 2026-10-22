import test from 'node:test';
import assert from 'node:assert/strict';
import {boostPrice,buy,freshProfile} from './economy.js';
test('growing boost prices use clean multiples of five',()=>{
 for(const item of ['shield','freeze','boost']){
  const prices=Array.from({length:5},(_,n)=>boostPrice({purchases:{[item]:n}},item));assert.deepEqual(prices,[100,125,155,195,245]);
  for(let n=0;n<1000;n++){const price=boostPrice({purchases:{[item]:n}},item);assert(Number.isSafeInteger(price));assert.equal(price%5,0);}
 }
});
test('purchase charges exactly the displayed rounded price and preserves progression',()=>{
 const p={...freshProfile(),coins:155,purchases:{shield:2}};const next=buy(p,'shield');assert.equal(next.coins,0);assert.equal(next.inventory.shield,1);assert.equal(next.purchases.shield,3);assert.equal(boostPrice(next,'shield'),195);assert.equal(buy({...p,coins:154},'shield').coins,154);
});
