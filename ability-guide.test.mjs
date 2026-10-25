import test from 'node:test';
import assert from 'node:assert/strict';
import {guideActivationKey} from './ability-guide.js';

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
