import {ROSTER,encounter} from './roster.mjs';
export const COLORS=['Red','Blue','Green','Gold'];
export const SHAPES=['Circle','Triangle','Square','Star'];
export const ENCOUNTERS=ROSTER.slice(0,5);
export const SPECIALS=['bomb','starburst','shield'];
export const turnTime=s=>encounter(s).interval;
export function matches(a,b){return !a.special&&(a.shape===b.shape||a.color===b.color);}
export function createRun(random=Math.random,attackPower=10,setIndex=0,reward=null,{practice=false}={}){
 const set=Math.min(5,Math.max(0,Math.floor(Number(setIndex)||0)));
 const r={set,enemyMaxHp:Math.round(ROSTER[Math.min(set,5)*5].hp),stage:0,hp:3,maxHp:3,shield:0,damage:Math.max(10,Math.min(30,Number(attackPower)||10)),score:0,hits:0,misses:0,combo:0,enemyHp:Math.round(ROSTER[Math.min(set,5)*5].hp),clock:5,current:{shape:1,color:1},board:[],status:'fight',started:true,colorTurns:0,elapsed:0,guardLock:0,reward:SPECIALS.includes(reward)?reward:null};
 const rand=n=>Math.min(n-1,Math.floor(random()*n));
 function weak(){return encounter(r).color;}
 function normal(){return {shape:rand(4),color:rand(4)};}
 function board(){
  const retained=r.board.find(t=>t.special);const all=[];for(let color=0;color<4;color++)for(let shape=0;shape<4;shape++)all.push({shape,color});
  const valid=all.filter(t=>matches(t,r.current)),chosen=[valid[rand(valid.length)]];
  const w=weak();if(w!==undefined){const t={shape:r.current.shape,color:w};if(!chosen.some(x=>x.color===t.color&&x.shape===t.shape))chosen.push(t);}
  const pool=all.filter(t=>!chosen.some(x=>x.shape===t.shape&&x.color===t.color));while(chosen.length<6)chosen.push(pool.splice(rand(pool.length),1)[0]);
  if(retained)chosen[5]=retained;else if(r.reward)chosen[5]={special:r.reward};
  for(let i=chosen.length-1;i>0;i--){const j=rand(i+1);[chosen[i],chosen[j]]=[chosen[j],chosen[i]];}r.board=chosen;
 }
 function hurt(wrong=false){if(practice)return {kind:'practice-miss',wrong};r.combo=0;if(!wrong&&r.shield>0){r.shield--;return {kind:'blocked',enemyAttack:true};}r.hp=Math.max(0,r.hp-1);if(!r.hp)r.status='lost';return {kind:'hurt',wrong,enemyAttack:!wrong};}
 function damage(amount){const actual=Math.min(amount,practice?Math.max(0,r.enemyHp-1):r.enemyHp);r.enemyHp-=actual;r.score+=actual;if(!r.enemyHp){r.status=r.stage===4?'won':'cleared';r.hp=r.maxHp;}return actual;}
 function pick(index){
  if(r.status!=='fight'||r.volley>0||!r.board[index])return null;const tile=r.board[index];r.started=true;
  if(tile.special){const special=tile.special;r.reward=null;r.board[index]=normal();if(special==='shield'){r.shield=1;return {kind:'special',special,damage:0};}const count=r.board.length;if(special==='starburst'){const targets=r.board.flatMap((t,i)=>i!==index&&!t.special?[{index:i,tile:{...t}}]:[]);r.volley=targets.length;return {kind:'special',special,damage:0,count:targets.length,targets};}const dealt=damage(r.damage*5);return {kind:'special',special,damage:dealt,count};}
  if(!matches(tile,r.current)){r.misses++;const event=hurt(true);if(!practice)board();return event;}
  const previousWeak=weak();r.current={...tile};r.hits++;r.combo++;
  const weakness=tile.color===previousWeak,critical=random()<.15,interrupt=!!encounter(r).interrupt&&r.combo%3===0;
  const dealt=damage((r.damage+(r.combo>=3?4:0)+(interrupt?6:0))*(weakness?2:1)+(critical?2:0));r.colorTurns++;let colorShift=false;if(r.colorTurns>=3){r.colorTurns=0;r.current.color=(r.current.color+1+rand(3))%4;colorShift=true;}board();return {kind:'hit',damage:dealt,critical,weakness,bonusDamage:critical?2:0,interrupt,colorShift};
 }
 function starburstHit(){if(!(r.volley>0))return null;r.volley--;const dealt=damage(r.damage);if(!r.volley)board();return {damage:dealt,remaining:r.volley};}
 function tick(dt){if(r.status!=='fight'||r.volley>0||!r.started)return null;dt=Math.max(0,Math.min(dt,.25));r.elapsed+=dt;r.guardLock=Math.max(0,r.guardLock-dt);r.clock-=dt;if(r.clock>0)return null;r.clock+=turnTime(r);return hurt();}
 function guard(){if(r.status!=='fight'||r.guardLock>0)return null;r.guardLock=.35;if(r.clock>1||r.clock<=0)return {kind:'guard-miss'};r.clock=turnTime(r);return {kind:'parry'};}
 function advance(){if(r.status!=='cleared')return false;r.stage++;const e=encounter(r);r.enemyMaxHp=e.hp;r.enemyHp=r.enemyMaxHp;r.clock=turnTime(r);r.hp=3;r.shield=0;r.combo=0;r.colorTurns=0;r.status='fight';r.started=true;board();return true;}
 r.clock=turnTime(r);board();return {state:r,pick,tick,advance,weak,guard,starburstHit};
}
