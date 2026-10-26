import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createDropGame,DROP_IMPACT_MIN_SPEED,DROP_IMPACT_INTERVAL} from './shape-drop-engine.js';
const context={console};vm.runInNewContext(fs.readFileSync(new URL('./assets/vendor/matter-0.20.0.min.js',import.meta.url),'utf8'),context);const M=context.Matter;
const advance=(g,seconds)=>{for(let i=0;i<Math.ceil(seconds*120);i++)g.step(1/120);};
const setup=options=>{const impacts=[],g=createDropGame(M,{autoDrop:false,onImpact:e=>impacts.push(e),...options});return {g,impacts};};
const valid=event=>{assert(['floor','piece','wall'].includes(event.type));for(const key of ['strength','speed','radius','x','y','time','bodyId','otherId'])assert(Number.isFinite(event[key]),key);assert(event.strength>=.1&&event.strength<=1);assert(event.speed>=DROP_IMPACT_MIN_SPEED);assert.equal(typeof event.locked,'boolean');};
test('falling pieces report a real floor impact with finite approach strength; resting piles stay quiet',()=>{
 const {g,impacts}=setup();g.addPiece({shape:0,color:0,r:25},160,200);advance(g,2);assert(impacts.length>0&&impacts.length<=4);assert(impacts.every(e=>e.type==='floor'));impacts.forEach(valid);
 advance(g,3);const settledCount=impacts.length;advance(g,5);assert.equal(impacts.length,settledCount);g.dispose();
});
test('a falling nonmatching piece reports contact with another piece separately from the floor',()=>{
 const {g,impacts}=setup(),base=g.addPiece({shape:2,color:0,r:45,obstacle:true},160,480);M.Body.setStatic(base,true);g.addPiece({shape:0,color:1,r:25},160,220);advance(g,1.5);
 assert(impacts.some(e=>e.type==='piece'&&e.locked));impacts.forEach(valid);assert.equal(g.score,0);g.dispose();
});
test('side-rail hits report wall contact, while tangential floor motion stays silent',()=>{
 const wall=setup();wall.g.engine.gravity.y=0;const ball=wall.g.addPiece({shape:0,color:0,r:25},80,250);M.Body.setVelocity(ball,{x:-8,y:0});advance(wall.g,.6);assert(wall.impacts.some(e=>e.type==='wall'));wall.impacts.forEach(valid);wall.g.dispose();
 const slide=setup();slide.g.engine.gravity.y=0;const square=slide.g.addPiece({shape:2,color:0,r:30},80,495.25);M.Body.setVelocity(square,{x:4,y:0});advance(slide.g,.25);assert.equal(slide.impacts.length,0);slide.g.dispose();
});
test('matching pieces and exploding bombs do not also produce contact cues',()=>{
 let clears=0;const match=setup({onClear:e=>clears+=e.pieces.length}),base=match.g.addPiece({shape:2,color:0,r:30},160,450);M.Body.setStatic(base,true);match.g.addPiece({shape:2,color:1,r:30},160,250);advance(match.g,1.5);assert.equal(clears,2);assert.equal(match.g.score,1);assert.equal(match.impacts.length,0);match.g.dispose();
 let bombs=0;const bomb=setup({onBomb:()=>bombs++});bomb.g.addPiece({shape:0,color:0,r:24,bomb:true},160,350);advance(bomb.g,1);assert.equal(bombs,1);assert.equal(bomb.impacts.length,0);bomb.g.dispose();
});
test('compound star contacts are deduplicated by parent body, even with two simultaneous floor tips',()=>{
 const {g,impacts}=setup(),raw=[];M.Events.on(g.engine,'collisionStart',e=>raw.push({time:g.time,count:e.pairs.filter(p=>p.collision.parentA.drop||p.collision.parentB.drop).length}));
 g.addPiece({shape:3,color:0,r:40,angle:0},160,400);advance(g,1.5);assert(impacts.length>0);assert(raw.some(e=>e.count>=2));const first=impacts[0];assert.equal(impacts.filter(e=>e.time===first.time).length,1);impacts.forEach(valid);g.dispose();
});
test('simultaneous and repeated contact bursts respect the game-clock global limiter',()=>{
 const {g,impacts}=setup();for(const x of [40,120,200,280])g.addPiece({shape:0,color:0,r:22,obstacle:true},x,350);advance(g,3);assert(impacts.length>0);
 for(let i=1;i<impacts.length;i++)assert(impacts[i].time-impacts[i-1].time>=DROP_IMPACT_INTERVAL-1e-9);
 const time=g.time,count=impacts.length;g.step(0);assert.equal(g.time,time);assert.equal(impacts.length,count);g.dispose();
});
test('same-pair recontacts wait longer than the global limiter before sounding again',()=>{
 const {g,impacts}=setup();g.engine.gravity.y=0;const body=g.addPiece({shape:0,color:0,r:25},160,250);
 const strike=()=>{M.Sleeping.set(body,false);M.Body.setPosition(body,{x:160,y:497});M.Body.setVelocity(body,{x:0,y:8});g.step(1/120);};
 const separate=seconds=>{M.Body.setPosition(body,{x:160,y:250});M.Body.setVelocity(body,{x:0,y:0});advance(g,seconds);};
 strike();assert.equal(impacts.length,1);separate(.1);strike();assert.equal(impacts.length,1);separate(.08);strike();assert.equal(impacts.length,1);separate(.09);strike();assert.equal(impacts.length,2);g.dispose();
});
test('one body cannot sound on floor then rail in immediate succession despite different pairs',()=>{
 const {g,impacts}=setup();g.engine.gravity.y=0;const body=g.addPiece({shape:0,color:0,r:25},160,497);M.Body.setVelocity(body,{x:0,y:8});g.step(1/120);assert.equal(impacts.length,1);
 const separate=()=>{M.Body.setPosition(body,{x:160,y:250});M.Body.setVelocity(body,{x:0,y:0});advance(g,.1);};
 const wall=()=>{M.Sleeping.set(body,false);M.Body.setPosition(body,{x:23,y:250});M.Body.setVelocity(body,{x:-8,y:0});g.step(1/120);};
 separate();wall();assert.equal(impacts.length,1);separate();wall();assert.equal(impacts.length,2);assert.equal(impacts[1].type,'wall');g.dispose();
});
test('disposing removes impact listeners and a fresh run has independent cooldowns',()=>{
 const first=setup();first.g.addPiece({shape:2,color:0,r:25},160,400);advance(first.g,.8);assert(first.impacts.length>0);first.g.dispose();assert.equal(first.g.engine.events.collisionStart.length,0);
 const second=setup();second.g.addPiece({shape:2,color:0,r:25},160,400);advance(second.g,.8);assert(second.impacts.length>0);assert.equal(second.impacts[0].time,first.impacts[0].time);second.g.dispose();
});
