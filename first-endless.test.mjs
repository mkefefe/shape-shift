import test from 'node:test';import assert from 'node:assert/strict';
import {firstEndlessLaunch,FIRST_ENDLESS_KEY} from './first-endless.js';
import {TUTORIAL_KEY} from './onboarding.js';
const storage=initial=>{const values=new Map(Object.entries(initial||{}));return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};};
test('fresh install routes to Endless and an interrupted tutorial resumes after starter data is saved',()=>{const s=storage(),first=firstEndlessLaunch(s);assert(first.pending);s.setItem('shape-shift-profile-v1','{}');assert(firstEndlessLaunch(s).pending);first.complete();assert(!first.pending);assert(!firstEndlessLaunch(s).pending);});
test('existing profiles and Adventure progress stay on the menu without resetting anything',()=>{for(const existing of [{'shape-shift-profile-v1':'{}'},{'shape-shift-adventure-v1':'{"stars":[3]}'},{[TUTORIAL_KEY]:'true'},{[FIRST_ENDLESS_KEY]:'done'}]){const s=storage(existing);assert(!firstEndlessLaunch(s).pending);for(const [key,value] of Object.entries(existing))assert.equal(s.getItem(key),value);}});
test('finished tutorial prevents repeat auto-launch even if interrupted before the marker was finalized',()=>{const s=storage({[FIRST_ENDLESS_KEY]:'pending',[TUTORIAL_KEY]:'true'});assert(!firstEndlessLaunch(s).pending);assert.equal(s.getItem(FIRST_ENDLESS_KEY),'done');});
test('unavailable storage does not prevent startup',()=>{assert.doesNotThrow(()=>firstEndlessLaunch({getItem(){throw Error('blocked');}}).complete());});
