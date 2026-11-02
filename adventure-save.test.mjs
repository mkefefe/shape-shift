import test from 'node:test';
import assert from 'node:assert/strict';
import {createAdventureSave} from './adventure-save.js';
import {normalizeAdventure,saveObjectiveStars,unlockedLevel} from './world-menu.js';
test('failed Adventure persistence retains the earned level and stars for a retry',()=>{
 let blocked=true,value=null,writes=0;
 const save=createAdventureSave({setItem(key,data){writes++;assert.equal(key,'shape-shift-adventure-v1');if(blocked)throw Error('QuotaExceededError');value=data;}});
 const won=saveObjectiveStars(normalizeAdventure(),1,3);
 assert.equal(save.write(won),false);assert(save.hasPending());assert.equal(value,null);
 // Preserve the result snapshot even if a caller subsequently changes its object.
 won.stars[0]=0;assert.equal(save.retry(),false);
 blocked=false;assert.equal(save.retry(),true);assert.equal(save.hasPending(),false);
 const restored=normalizeAdventure(JSON.parse(value));assert.equal(restored.stars[0],3);assert.equal(unlockedLevel(restored),2);
 const count=writes;assert.equal(save.retry(),true);assert.equal(writes,count);
});
test('later campaign state replaces a failed pending snapshot without losing previous clears',()=>{
 let blocked=true,value;const save=createAdventureSave({setItem(key,data){if(blocked)throw Error();value=data;}});
 let progress=saveObjectiveStars(normalizeAdventure(),1,2);save.write(progress);
 progress=saveObjectiveStars(progress,2,1);save.write(progress);
 blocked=false;assert(save.retry());const restored=normalizeAdventure(JSON.parse(value));assert.deepEqual(restored.stars.slice(0,2),[2,1]);assert.equal(unlockedLevel(restored),3);
});
