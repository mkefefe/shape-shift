import test from 'node:test';
import assert from 'node:assert/strict';
import {sceneryStage,sceneryPalette,createSceneryProgress,createSceneryTint,SKY_PALETTES} from './scenery-progress.js';
test('score milestones and active-time fallback',()=>{assert.equal(sceneryStage(49,119),0);assert.equal(sceneryStage(50,0),1);assert.equal(sceneryStage(0,120),1);assert.equal(sceneryStage(100,120),2);});
test('smooth transitions, bounded speed and no rewind after score loss',()=>{const p=createSceneryProgress();const first=p.step(.1,50);assert(first.phase>0&&first.phase<.02);let next;for(let i=0;i<240;i++)next=p.step(.1,150);assert.equal(next.phase,3);assert.deepEqual(next.palette,SKY_PALETTES[3]);assert.equal(p.step(.1,0).stage,3);for(let i=0;i<20;i++)next=p.step(.1,100000);assert(next.speed<=1.72);});
test('time freezes when not stepped and a fresh run starts at original palette',()=>{const p=createSceneryProgress();for(let i=0;i<1200;i++)p.step(.1,0);assert.equal(p.step(.1).stage,1);assert.deepEqual(createSceneryProgress().step(0).palette,SKY_PALETTES[0]);assert.deepEqual(sceneryPalette(5),SKY_PALETTES[0]);});

test('scenery tints reach milestones smoothly, reset on retry, and keep garden hues restrained',()=>{
 const sky={style:{}},garden={style:{setProperty(k,v){this[k]=v;}}};const a=createSceneryTint(sky),b=createSceneryTint(garden,{garden:true});
 a.step(.1,50);assert(!sky.style.filter.includes('72deg'));
 for(let i=0;i<70;i++){a.step(.1,50);b.step(.1,50);}
 assert(sky.style.filter.includes('72deg'));assert.equal(garden.style.filter,'none');assert.equal(garden.style['--night'],1/3);
 const before=sky.style.filter;assert.equal(sky.style.filter,before);
 createSceneryTint(sky).step(.1,0);assert(sky.style.filter.includes('0deg'));
 const slow={style:{}},c=createSceneryTint(slow);for(let i=0;i<60;i++)c.step(.1,50,true);
 assert(!slow.style.filter.includes('72deg'));
});

test('garden reaches night monotonically and resets on a fresh run',()=>{
 const element={style:{setProperty(k,v){this[k]=v;}}},scene=createSceneryTint(element,{garden:true});
 for(let i=0;i<200;i++)scene.step(.1,150);
 assert.equal(element.style['--night'],1);scene.step(.1,0);assert.equal(element.style['--night'],1);
 createSceneryTint(element,{garden:true}).step(.1,0);assert.equal(element.style['--night'],0);
});
