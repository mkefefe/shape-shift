import test from 'node:test';import assert from 'node:assert/strict';import {createRun,matches,turnTime} from './combat.mjs';
const good=r=>r.state.board.findIndex(t=>matches(t,r.state.current));const clear=r=>{for(let i=0;r.state.status==='fight'&&i<200;i++)r.pick(good(r));};
test('ten upgrade levels allow 30 attack; six choices always include a match',()=>{const r=createRun(Math.random,30);assert.equal(r.state.damage,30);for(let i=0;i<5;i++){assert.equal(r.state.board.length,6);assert(good(r)>=0);clear(r);if(i<4){assert.equal(r.state.status,'cleared');r.advance();}else assert.equal(r.state.status,'won');}});
test('correct picks do not reset the independent attack clock',()=>{const r=createRun();r.state.clock=1;r.pick(good(r));assert.equal(r.state.clock,1);for(let i=0;i<4;i++)r.tick(.25);assert.equal(r.state.hp,2);assert.equal(r.state.clock,turnTime(r.state));});
test('wrong selection costs one heart without advancing or resetting enemy attack',()=>{const r=createRun();r.state.clock=2;const e=r.pick(r.state.board.findIndex(t=>!matches(t,r.state.current)));assert.equal(e.wrong,true);assert.equal(e.enemyAttack,false);assert.equal(r.state.hp,2);assert.equal(r.state.clock,2);});
test('defeating each enemy fills hearts and resets attack timer for next fight',()=>{const r=createRun();r.state.hp=1;clear(r);assert.equal(r.state.hp,3);r.advance();assert.equal(r.state.hp,3);assert.equal(r.state.started,true);assert.equal(r.state.clock,turnTime(r.state));});
test('boss rewards persist through normal board refreshes and consume once',()=>{const r=createRun(Math.random,10,1,'bomb');r.pick(good(r));assert(r.state.board.some(t=>t.special==='bomb'));const i=r.state.board.findIndex(t=>t.special);const e=r.pick(i);assert.equal(e.kind,'special');assert.equal(r.state.reward,null);assert(!r.state.board.some(t=>t.special));assert.equal(r.state.board.length,6);});
test('shield absorbs one timed attack and cannot block twice',()=>{const r=createRun(Math.random,10,0,'shield');r.pick(r.state.board.findIndex(t=>t.special));r.state.clock=.1;assert.equal(r.tick(.1).kind,'blocked');assert.equal(r.state.hp,3);assert.equal(r.state.shield,0);r.state.clock=.1;assert.equal(r.tick(.1).kind,'hurt');assert.equal(r.state.hp,2);});
test('starburst scales with board count, bomb with five attacks',()=>{for(const [kind,multiplier] of [['starburst',5],['bomb',5]]){const r=createRun(Math.random,10,5,kind);r.state.enemyHp=1000;const e=r.pick(r.state.board.findIndex(t=>t.special));const damage=kind==='starburst'?Array.from({length:e.count},()=>r.starburstHit().damage).reduce((a,b)=>a+b,0):e.damage;assert.equal(damage,10*multiplier);}});
test('loss cannot advance; retry starts the same set at fight one',()=>{const r=createRun(Math.random,10,2);r.state.hp=1;r.state.started=true;r.state.clock=.1;r.tick(.1);assert.equal(r.state.status,'lost');assert.equal(r.advance(),false);assert.equal(r.pick(good(r)),null);const retry=createRun(Math.random,10,2);assert.equal(retry.state.set,2);assert.equal(retry.state.stage,0);});

test('enemy attack clock runs immediately without waiting for a first tap',()=>{const r=createRun();for(let i=0;i<28;i++)r.tick(.25);assert.equal(r.state.hp,2);});

test('every enemy takes double damage from its own color, including both halves of the boss',()=>{for(let stage=0;stage<5;stage++){for(const low of [false,true]){const r=createRun(()=>.8);r.state.stage=stage;r.state.enemyMaxHp=1000;r.state.enemyHp=low?400:1000;const color=r.weak();r.state.current={shape:0,color:0};r.state.board=[{shape:0,color}];assert.equal(r.pick(0).damage,20);const other=createRun(()=>.8);other.state.stage=stage;other.state.enemyHp=1000;other.state.current={shape:0,color:0};other.state.board=[{shape:0,color:(color+1)%4}];assert.equal(other.pick(0).damage,10);}}});
test('unupgraded player can finish first set with a deliberate pick every 2.5 seconds',()=>{const r=createRun();let attacks=0;for(let fight=0;fight<5;fight++){for(let pick=0;r.state.status==='fight'&&pick<30;pick++){for(let t=0;t<10;t++){if(r.tick(.25))attacks++;}assert.notEqual(r.state.status,'lost');const i=r.state.board.findIndex(t=>t.color===r.weak()&&matches(t,r.state.current));assert(i>=0);r.pick(i);}assert.equal(r.state.hp,3);if(fight<4)assert(r.advance());}assert.equal(r.state.status,'won');assert(attacks>0);});

test('timed guard cancels strike without spending health or a shield',()=>{const r=createRun();r.state.shield=1;r.state.clock=.7;assert.equal(r.guard().kind,'parry');assert.equal(r.state.clock,turnTime(r.state));assert.equal(r.state.hp,3);assert.equal(r.state.shield,1);assert.equal(r.guard(),null);});
test('early guard does not postpone enemy attack and briefly locks repeat taps',()=>{const r=createRun();r.state.clock=1.2;assert.equal(r.guard().kind,'guard-miss');assert.equal(r.state.clock,1.2);r.tick(.25);assert.equal(r.guard(),null);r.tick(.25);assert.equal(r.guard().kind,'parry');});
test('guard cannot revive a lost fight',()=>{const r=createRun();r.state.status='lost';r.state.clock=.5;assert.equal(r.guard(),null);});

test('three correct matches shift to a different color without changing shape',()=>{const r=createRun(Math.random,10,5);r.state.enemyHp=1000;for(let i=0;i<3;i++){const t=r.state.board.findIndex(t=>matches(t,r.state.current)),tile={...r.state.board[t]},e=r.pick(t);if(i===2){assert(e.colorShift);assert.notEqual(r.state.current.color,tile.color);assert.equal(r.state.current.shape,tile.shape);assert.equal(r.state.colorTurns,0);}else assert.equal(e.colorShift,false);}});

import {ROSTER,encounter} from './roster.mjs';
test('all thirty campaign fights have distinct identities and sprites',()=>{assert.equal(ROSTER.length,30);assert.equal(new Set(ROSTER.map(e=>e.name)).size,30);assert.equal(new Set(ROSTER.map(e=>e.sprite)).size,30);assert.equal(ROSTER.filter(e=>e.boss).length,6);for(let set=0;set<6;set++){const r=createRun(Math.random,10,set);for(let stage=0;stage<5;stage++){assert.equal(encounter(r.state).id,set*5+stage+1);assert.equal(r.state.enemyMaxHp,encounter(r.state).hp);assert(turnTime(r.state)>=5.4);clear(r);assert.equal(r.state.hp,3);if(stage<4)assert(r.advance());else assert.equal(r.state.status,'won');}}});

test('color weakness is separate from occasional +2 bonus hits',()=>{
 for(const [roll,bonus] of [[.8,0],[.1,2]])for(const weak of [false,true]){
  const r=createRun(()=>roll);r.state.enemyHp=1000;r.state.current={shape:0,color:0};r.state.board=[{shape:0,color:(r.weak()+(weak?0:1))%4}];
  const hit=r.pick(0);assert.equal(hit.weakness,weak);assert.equal(hit.critical,bonus===2);assert.equal(hit.bonusDamage,bonus);assert.equal(hit.damage,(weak?20:10)+bonus);
 }
});

test('Starburst applies five individual impacts and freezes enemy timer during volley',()=>{
 const r=createRun(()=>.8,10,5,'starburst');r.state.enemyHp=1000;const before=r.state.clock;const effect=r.pick(r.state.board.findIndex(t=>t.special));assert.equal(effect.count,5);assert.equal(r.state.enemyHp,1000);assert.equal(r.pick(0),null);
 for(let i=0;i<5;i++){r.tick(.25);assert.equal(r.state.clock,before);assert.equal(r.starburstHit().damage,10);assert.equal(r.state.enemyHp,1000-(i+1)*10);}
 assert.equal(r.starburstHit(),null);r.tick(.25);assert(r.state.clock<before);
});


test('Starburst launches only other ordinary shapes and preserves their appearance',()=>{
 const r=createRun(()=>.8,10,5,'starburst');r.state.enemyHp=1000;
 const source=r.state.board.findIndex(t=>t.special);const other=(source+1)%6;
 r.state.board[other]={special:'shield'};
 const before=structuredClone(r.state.board),e=r.pick(source);
 assert.equal(e.count,4);assert.equal(e.targets.length,4);
 for(const target of e.targets){assert.notEqual(target.index,source);assert.notEqual(target.index,other);assert.deepEqual(target.tile,before[target.index]);}
 for(let i=0;i<4;i++)r.starburstHit();
 assert.equal(r.state.enemyHp,960);assert(r.state.board.some(t=>t.special==='shield'));
});
