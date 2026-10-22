import {SLICE_DEFAULT_BOUNDS,normalizeSliceBounds} from './slice-viewport.js?v=49439-web1';
import {maxLivesForFrame,frameRewardMultiplier} from './engine.js?v=49439-web1';
import {miniGameCoins} from './mini-game-rewards.js?v=49439-web1';
export const SLICE_WIDTH=360,SLICE_HEIGHT=560;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const finite=n=>Number.isFinite(n);
const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
function intersects(a,b,c,d){const eps=.0001;const x=cross(a,b,c),y=cross(a,b,d),z=cross(c,d,a),w=cross(c,d,b);return x*y<=eps&&z*w<=eps&&Math.max(Math.min(a.x,b.x),Math.min(c.x,d.x))<=Math.min(Math.max(a.x,b.x),Math.max(c.x,d.x))+eps&&Math.max(Math.min(a.y,b.y),Math.min(c.y,d.y))<=Math.min(Math.max(a.y,b.y),Math.max(c.y,d.y))+eps;}
export function sliceOutline(shape,r){
 if(shape===2)return [{x:-r*.83,y:-r*.83},{x:r*.83,y:-r*.83},{x:r*.83,y:r*.83},{x:-r*.83,y:r*.83}];
 const count=shape===1?3:10;return Array.from({length:count},(_,i)=>{const a=-Math.PI/2+i*Math.PI*2/count,rad=shape===3&&i%2?r*.52:r;return {x:Math.cos(a)*rad,y:Math.sin(a)*rad};});
}
export function sliceHits(piece,a,b){
 if(![a.x,a.y,b.x,b.y,piece.x,piece.y].every(finite))return false;
 const local=p=>{const x=p.x-piece.x,y=p.y-piece.y,c=Math.cos(-piece.angle),s=Math.sin(-piece.angle);return {x:x*c-y*s,y:x*s+y*c};};a=local(a);b=local(b);
 if(piece.hazard||piece.shape===0){const dx=b.x-a.x,dy=b.y-a.y,t=clamp(-(a.x*dx+a.y*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(a.x+t*dx,a.y+t*dy)<=piece.r*(piece.hazard?.84:1);}
 const polygon=sliceOutline(piece.shape,piece.r);
 const inside=p=>{let hit=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const v=polygon[i],w=polygon[j];if((v.y>p.y)!==(w.y>p.y)&&p.x<(w.x-v.x)*(p.y-v.y)/(w.y-v.y)+v.x)hit=!hit;}return hit;};
 return inside(a)||inside(b)||polygon.some((p,i)=>intersects(a,b,p,polygon[(i+1)%polygon.length]));
}
// Keep a clear swipe margin around targets for their entire flight,
// including later waves and wall rebounds. Use the same fixed-step motion as play.
export const SLICE_SAFE_GAP=22;
const flightStep=1/120;
function movePiece(p,dt,bounds=SLICE_DEFAULT_BOUNDS){
 p.vy+=620*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.angle+=p.spin*dt;
 if(p.x<bounds.left+p.r){p.x=bounds.left+p.r;p.vx=Math.abs(p.vx);}
 if(p.x>bounds.right-p.r){p.x=bounds.right-p.r;p.vx=-Math.abs(p.vx);}
}
const safetyRadius=p=>p.r*(p.hazard?1.5:1.18);
const visible=(p,bounds)=>p.y-safetyRadius(p)<bounds.bottom&&p.y+safetyRadius(p)>bounds.top;
const departed=(p,bounds)=>p.vy>0&&p.y-safetyRadius(p)>bounds.bottom+12;
export function slicePathsConflict(candidate,pieces,bounds=SLICE_DEFAULT_BOUNDS){
 const others=pieces.filter(p=>p.hazard!==candidate.hazard).map(p=>({...p}));
 if(!others.length)return false;
 const next={...candidate};
 // Normal launch flights last under four seconds; six also covers higher throws.
 for(let frame=0;frame<720;frame++){
  for(const other of others){
   if(departed(other,bounds))continue;
   if(visible(next,bounds)&&visible(other,bounds)&&Math.hypot(next.x-other.x,next.y-other.y)<safetyRadius(next)+safetyRadius(other)+SLICE_SAFE_GAP)return true;
  }
  movePiece(next,flightStep,bounds);if(departed(next,bounds))break;
  for(const other of others)if(!departed(other,bounds))movePiece(other,flightStep,bounds);
 }
 return false;
}
// Mix clustered and split waves; separated groups keep their own flight lanes.
export function sliceWaveLayout(count,bounds,rng=Math.random,previous=-1){
 const patterns=count>=4?[[count],[count-1,1],[2,count-2],Array(count).fill(1)]:count===3?[[3],[2,1],[1,1,1]]:count===2?[[2],[1,1]]:[[1]];
 const choices=patterns.map((_,i)=>i).filter(i=>i!==previous);
 const pattern=choices[Math.min(choices.length-1,Math.floor(rng()*choices.length))]??0;
 const groups=patterns[pattern],width=bounds.right-bounds.left,mirror=rng()<.5,items=[];
 for(let g=0;g<groups.length;g++){
  const fraction=groups.length===1?.25+rng()*.5:(g+.5)/groups.length;
  const center=bounds.left+48+(width-96)*(mirror?1-fraction:fraction);
  for(let i=0;i<groups[g];i++)items.push({x:clamp(center+(i-(groups[g]-1)/2)*25,bounds.left+38,bounds.right-38),y:bounds.bottom+70+i*22+g*38,vx:(rng()-.5)*24,group:g});
 }
 return {pattern,items};
}
export function createSliceGame({rng=Math.random,onEvent=()=>{},autoSpawn=true,frame='none',upgrade=0,bounds:initialBounds=SLICE_DEFAULT_BOUNDS}={}){
 let bounds=normalizeSliceBounds(initialBounds);
 const maxLives=maxLivesForFrame(frame,upgrade);
 const game={frame,time:0,score:0,sliced:0,bestCombo:0,maxLives,lives:maxLives,missed:0,hazards:0,over:false,pieces:[],wave:0,untilWave:.65,stroke:null};let serial=0,accumulator=0,lastPattern=-1;const missedWaves=new Set();
 const random=()=>clamp(rng(),0,.999999);
 function emit(event){onEvent({...event,time:game.time});}
 function makePiece(options={}){
  const x=options.x??(bounds.left+48+random()*(bounds.right-bounds.left-96)),y=options.y??(bounds.bottom+70);
  const piece={id:++serial,wave:game.wave,x,y,vx:((bounds.left+bounds.right)/2-x)*(.25+random()*.35),vy:-(700+random()*100),angle:random()*Math.PI*2,spin:(random()-.5)*3,shape:Math.floor(random()*4),color:Math.floor(random()*4),r:25+random()*9,hazard:false,entered:y<bounds.bottom-27,...options};
  if(options.vy===undefined){
   const height=bounds.bottom-bounds.top,ceiling=bounds.launchTop??bounds.top+Math.min(140,height*.25);
   const apex=ceiling+piece.r+random()*height*.08;
   piece.vy=-Math.sqrt(2*620*Math.max(100,y-apex));
  }
  return piece;
 }
 function spawn(options={}){const piece=makePiece(options);game.pieces.push(piece);return piece;}
 function spawnFair(options){
  for(let attempt=0;attempt<24;attempt++){
   const candidate=options.hazard?{...options,vx:(random()-.5)*180}:attempt>0?{...options,x:attempt<8?clamp(options.x+(random()-.5)*60,bounds.left+38,bounds.right-38):bounds.left+48+random()*(bounds.right-bounds.left-96)}:options;
   const piece=makePiece(candidate);
   if(!slicePathsConflict(piece,game.pieces,bounds)){game.pieces.push(piece);return piece;}
  }
  // If no safe trajectory fits, omit this item instead of forcing a lost heart.
  return null;
 }
 function launch(){
  game.wave++;const count=Math.min(4,1+Math.floor(game.time/22))+Math.floor(random()*2);
  if(game.time>7&&random()<Math.min(.65,.2+game.time/180))spawnFair({hazard:true,r:25,y:bounds.bottom+90});
  const formation=sliceWaveLayout(count,bounds,random,lastPattern);lastPattern=formation.pattern;
  for(const item of formation.items)spawnFair(item);
  game.untilWave=Math.max(.75,2.1-game.time/110);emit({type:'launch'});
 }
 function end(){if(game.over)return;game.over=true;game.stroke=null;emit({type:'end'});}
 function strike(kind,piece){if(game.over)return;game.lives--;if(kind==='hazard')game.hazards++;emit({type:kind,piece,lives:game.lives});if(game.lives<=0)end();}
 function beginStroke(){if(game.over)return;game.stroke={count:0,hazard:false,lastHit:-100};}
 function endStroke(){game.stroke=null;}
 function slice(a,b){
  if(game.over||!game.stroke||!a||!b||!finite(a.x)||!finite(a.y)||!finite(b.x)||!finite(b.y)||Math.hypot(b.x-a.x,b.y-a.y)<2)return [];
  const hits=game.pieces.filter(p=>visible(p,bounds)&&sliceHits(p,a,b));
  // Resolve hazards first so a swipe through danger cannot earn a combo bonus.
  hits.sort((x,y)=>Number(y.hazard)-Number(x.hazard));const cut=[];
  for(const p of hits){if(game.over)break;game.pieces=game.pieces.filter(x=>x!==p);cut.push(p);
   if(p.hazard){game.stroke.hazard=true;game.stroke.count=0;strike('hazard',p);continue;}
   const stroke=game.stroke;if(game.time-stroke.lastHit>.35)stroke.count=0;stroke.lastHit=game.time;stroke.count++;game.sliced++;const combo=stroke.hazard?1:stroke.count;game.bestCombo=Math.max(game.bestCombo,combo);const points=frameRewardMultiplier(frame);game.score=game.sliced*points;
   emit({type:'slice',piece:p,from:{...a},to:{...b},angle:Math.atan2(b.y-a.y,b.x-a.x),points,combo});
  }return cut;
 }
 function tick(dt){game.time+=dt;for(const p of game.pieces){const rising=p.vy<0;movePiece(p,dt,bounds);if(rising&&p.vy>=0)emit({type:'fall',piece:p});if(p.y+p.r<bounds.bottom)p.entered=true;}
  const fallen=game.pieces.filter(p=>departed(p,bounds));game.pieces=game.pieces.filter(p=>!fallen.includes(p));for(const p of fallen){
   if(!p.hazard&&p.entered){game.missed++;if(!missedWaves.has(p.wave)){missedWaves.add(p.wave);strike('miss',p);}}
   if(game.over)return;
  }
  // Keep the receipt until the last member leaves, even when a batch lands in stages.
  for(const wave of missedWaves)if(!game.pieces.some(p=>p.wave===wave))missedWaves.delete(wave);
  if(autoSpawn){game.untilWave-=dt;if(game.untilWave<=0)launch();}
 }
 function step(seconds){if(game.over||!finite(seconds))return;accumulator+=clamp(seconds,0,.05);while(accumulator>=1/120&&!game.over){tick(1/120);accumulator-=1/120;}}
 function setBounds(next){
  const updated=normalizeSliceBounds(next);
  if(updated.left===bounds.left&&updated.top===bounds.top&&updated.right===bounds.right&&updated.bottom===bounds.bottom&&updated.launchTop===bounds.launchTop)return;
  const ratio=(updated.right-updated.left)/(bounds.right-bounds.left);
  for(const p of game.pieces){p.x=updated.left+(p.x-bounds.left)*ratio;p.y+=updated.bottom-bounds.bottom;p.vx*=ratio;}
  bounds=updated;
 }
 return Object.assign(game,{revive(){if(!game.over||game.lives>0)return false;game.over=false;game.lives=game.maxLives;game.pieces=[];game.stroke=null;game.untilWave=2;missedWaves.clear();accumulator=0;return true;},setBounds,spawn,step,slice,beginStroke,endStroke,end,dispose(){game.pieces=[];game.stroke=null;missedWaves.clear();}});
}
const safe=n=>Number.isSafeInteger(n)&&n>=0?n:0;
const valid=e=>e&&/^shape-slice-[a-f0-9-]{36}$/.test(e.id)&&Number.isSafeInteger(e.sliced)&&e.sliced>=0&&e.sliced<=100000;
export function sliceProgress(raw){return {best:raw?.scoreVersion===2?safe(raw?.best):0,scoreVersion:2,legacyBest:Math.max(safe(raw?.legacyBest),raw?.scoreVersion===2?0:safe(raw?.best)),sliced:safe(raw?.sliced),bestCombo:safe(raw?.bestCombo),runs:safe(raw?.runs),pending:Array.isArray(raw?.pending)?raw.pending.filter(valid):[]};}
export function finishSliceProgress(raw,result,id){const p=sliceProgress(raw);if(p.pending.some(e=>e.id===id))return p;return {...p,best:Math.max(p.best,safe(result.sliced)*frameRewardMultiplier(result.frame)),sliced:p.sliced+safe(result.sliced),bestCombo:Math.max(p.bestCombo,safe(result.bestCombo)),runs:p.runs+1,pending:[...p.pending,{id,sliced:safe(result.sliced),rewardVersion:3,xpMultiplier:frameRewardMultiplier(result.frame)}]};}
export function claimSliceReward(profile,entry){if(!valid(entry))return profile;const receipts=Array.isArray(profile.sliceRewards)?profile.sliceRewards:[];if(receipts.includes(entry.id))return profile;const coins=profile.coins+miniGameCoins(entry.sliced,entry.rewardVersion??1),xp=profile.xp+Math.min(200,entry.sliced)*(entry.xpMultiplier===2?2:1);if(!Number.isSafeInteger(coins)||!Number.isSafeInteger(xp))return profile;return {...profile,coins,xp,sliceRewards:[...receipts,entry.id]};}
