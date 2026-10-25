import test from 'node:test';
import assert from 'node:assert/strict';
import {sceneryStage,sceneryPalette,createSceneryProgress,SKY_PALETTES} from './scenery-progress.js';
test('score milestones and active-time fallback',()=>{assert.equal(sceneryStage(49,119),0);assert.equal(sceneryStage(50,0),1);assert.equal(sceneryStage(0,120),1);assert.equal(sceneryStage(100,120),2);});
test('smooth transitions, bounded speed and no rewind after score loss',()=>{const p=createSceneryProgress();const first=p.step(.1,50);assert(first.phase>0&&first.phase<.02);let next;for(let i=0;i<240;i++)next=p.step(.1,150);assert.equal(next.phase,3);assert.deepEqual(next.palette,SKY_PALETTES[3]);assert.equal(p.step(.1,0).stage,3);for(let i=0;i<20;i++)next=p.step(.1,100000);assert(next.speed<=1.72);});
test('time freezes when not stepped and a fresh run starts at original palette',()=>{const p=createSceneryProgress();for(let i=0;i<1200;i++)p.step(.1,0);assert.equal(p.step(.1).stage,1);assert.deepEqual(createSceneryProgress().step(0).palette,SKY_PALETTES[0]);assert.deepEqual(sceneryPalette(5),SKY_PALETTES[0]);});
