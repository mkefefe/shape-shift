import test from 'node:test';
import assert from 'node:assert/strict';
import {guideActivationKey,adventureAbilitiesAvailable,adventurePickupBoard,BOOST_LESSONS,SPECIAL_LESSONS} from './ability-guide.js';

test('ability practice accepts only its own number from either keyboard number row',()=>{
 for(const shortcut of ['1','2','3']){
  for(const prefix of ['Digit','Numpad'])for(const key of ['1','2','3']){
   assert.equal(guideActivationKey({key,code:prefix+key},shortcut),key===shortcut);
  }
 }
});

test('held keys and modified shortcuts cannot consume an ability during its guide',()=>{
 for(const blocked of ['repeat','ctrlKey','altKey','metaKey','shiftKey','isComposing']){
  assert.equal(guideActivationKey({key:'1',code:'Digit1',[blocked]:true},'1'),false);
  assert.equal(guideActivationKey({key:' ',code:'Space',[blocked]:true},'1'),false);
 }
});

test('generic card guides retain Space and Enter without accepting ability numbers',()=>{
 assert.equal(guideActivationKey({key:' ',code:'Space'}),true);
 assert.equal(guideActivationKey({key:'Enter',code:'Enter'}),true);
 assert.equal(guideActivationKey({key:'1',code:'Digit1'}),false);
 assert.equal(guideActivationKey({key:'2',code:'Numpad2'}),false);
 assert.equal(guideActivationKey({key:'a',code:'KeyA'},'1'),false);
});

test('early Adventure suppresses pickups despite later unlocks, without altering its board size',()=>{
 const board=[{special:'heart'},{shape:1,color:2},{special:'crystal'}],saved=structuredClone(board);
 for(const level of [1,2,3,4,5]){assert.equal(adventureAbilitiesAvailable(level),false);const clean=adventurePickupBoard(level,board,{shape:0,color:0});assert.equal(clean.length,board.length);assert(clean.every(t=>!t.special));}
 assert.deepEqual(board,saved);assert.equal(adventurePickupBoard(6,board,{}),board);
});
test('ability and pickup explanations fit brief one- or two-line HUD tips',()=>{
 for(const [,copy] of Object.values({...BOOST_LESSONS,...SPECIAL_LESSONS})){assert(copy.length<=100,copy);assert(!copy.includes('Continue'));}
});
