import test from 'node:test';
import assert from 'node:assert/strict';
import {applyWelcomeStatistics,choice,CONSENT_KEY,engagement} from './telemetry.js';
import {AUDIENCE_KEY,ageGroupFor} from './audience.js';

test('original picker supplies broad adult bands, never exact age or a fabricated child band',()=>{
 for(const [age,band] of [[18,'18-24'],[24,'18-24'],[25,'25-34'],[35,'35-44'],[45,'45-54'],[55,'55-plus'],[120,'55-plus'],[12,'unknown'],[17,'unknown'],[null,'unknown']])assert.equal(ageGroupFor(age),band);
});
test('welcome choice respects refusal and protected ages without opening another dialog',async()=>{
 const rows=new Map();globalThis.localStorage={getItem:k=>rows.get(k)||null,setItem:(k,v)=>rows.set(k,v),removeItem:k=>rows.delete(k)};
 try{
  rows.set(AUDIENCE_KEY,JSON.stringify('adult'));rows.set(CONSENT_KEY,JSON.stringify({enabled:true,age:'25-34'}));
  await applyWelcomeStatistics(true);assert.equal(choice().enabled,true);assert.equal(choice().age,'25-34');assert(engagement.snapshot());
  await applyWelcomeStatistics(false);assert.equal(choice().enabled,false);assert.equal(engagement.snapshot(),null);
  await applyWelcomeStatistics(true);assert.equal(choice().enabled,false,'an existing refusal must not become opt-in');
  rows.set(CONSENT_KEY,JSON.stringify({enabled:true,age:'18-24'}));rows.set(AUDIENCE_KEY,JSON.stringify('protected'));
  await applyWelcomeStatistics(true);assert.deepEqual(choice(),{enabled:false,age:'unknown'});assert.equal(engagement.snapshot(),null);
 }finally{await engagement.disable();delete globalThis.localStorage;}
});

import {ensureTerms,TERMS_VERSION} from './terms.js';
test('current terms choice is remembered without creating a startup dialog',async()=>{
 const rows=new Map([['shape-shift-terms',TERMS_VERSION],['shape-shift-statistics','no']]);
 globalThis.localStorage={getItem:k=>rows.get(k)||null};
 try{assert.equal(await ensureTerms(),false);rows.set('shape-shift-statistics','yes');assert.equal(await ensureTerms(),true);}finally{delete globalThis.localStorage;}
});
