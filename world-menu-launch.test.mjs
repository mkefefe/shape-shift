import test from 'node:test';
import assert from 'node:assert/strict';
import {adventureLaunchLevel,normalizeAdventure,unlockedLevel} from './world-menu.js';

test('Adventure launches only unlocked levels and accepts earlier replay levels',()=>{
 const progress=normalizeAdventure({cleared:[true,true,true,true]});
 assert.equal(unlockedLevel(progress),5);
 assert.equal(adventureLaunchLevel(99,progress),5);
 assert.equal(adventureLaunchLevel(3,progress),3);
 assert.equal(adventureLaunchLevel('4.9',progress),4);
 assert.equal(adventureLaunchLevel(0,progress),1);
 assert.equal(adventureLaunchLevel(-20,progress),1);
 for(const value of [undefined,NaN,Infinity,'invalid'])assert.equal(adventureLaunchLevel(value,progress),5);
});

test('admin level selection bypasses unlock only, never the campaign limits',()=>{
 const progress=normalizeAdventure();
 assert.equal(adventureLaunchLevel(77,progress,true),77);
 assert.equal(adventureLaunchLevel(999,progress,true),100);
 assert.equal(adventureLaunchLevel(-3,progress,true),1);
 assert.equal(adventureLaunchLevel(undefined,progress,true),1);
});

test('first launch and completed campaigns both resolve to a valid current level',()=>{
 assert.equal(adventureLaunchLevel(undefined,normalizeAdventure()),1);
 const completed=normalizeAdventure({cleared:Array(100).fill(true)});
 assert.equal(adventureLaunchLevel(undefined,completed),100);
 assert.equal(adventureLaunchLevel(101,completed),100);
});
