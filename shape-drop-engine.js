import {frameRewardMultiplier} from './engine.js?v=494200';
import {miniGameCoins} from './mini-game-rewards.js?v=494200';
import {dropBodiesTouch,dropMatchTolerance} from './drop-contacts.js?v=494200';
import {createDropSequence} from './drop-sequence.js?v=494200';
export const DROP_WIDTH=320,DROP_HEIGHT=520,DROP_LINE=68,DROP_RADIUS=21;
export const DROP_HEADROOM=12;
// Extra portrait height should not provide permanent extra capacity. Preserve
// the opening, then gradually grow normal pieces on taller boards, once only.
export const dropViewportScale=(height,drops=0)=>1+(Math.min(1.3,Math.sqrt(Math.max(DROP_HEIGHT,height)/DROP_HEIGHT))-1)*Math.min(1,Math.max(0,(drops-80)/160));
// Larger held pieces sit a little farther into the opening instead of reserving
// a giant empty band above the entire container for every possible next piece.
export const dropSpawnY=tile=>Math.max(26,(tile.r??DROP_RADIUS)*1.23-DROP_HEADROOM);
export const DROP_SHAPES=['circle','triangle','square','star'];
export const DROP_COLORS=['red','blue','green','yellow'];
export const dropMatches=(a,b)=>!!a&&!!b&&!a.obstacle&&!b.obstacle&&!a.bomb&&!b.bomb&&(a.shape===b.shape||a.color===b.color);
export const dropInterval=n=>Math.max(2.5,6-Math.floor(n/12)*.3);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const dropAimMargin=tile=>Math.max(29,Math.ceil((tile.r??DROP_RADIUS)*1.23)+2);
export const DROP_IMPACT_MIN_SPEED=75,DROP_IMPACT_INTERVAL=.09,DROP_IMPACT_BODY_COOLDOWN=.18,DROP_IMPACT_PAIR_COOLDOWN=.28;

// Bodies retain their own outline, rotation and momentum.
export function makeDropBody(M,x,y,tile,r=tile.r??DROP_RADIUS){
 const opts={restitution:tile.obstacle?.12:tile.shape===0?.48:.24,friction:tile.obstacle?.65:.42,frictionStatic:.7,frictionAir:.008,density:tile.obstacle?.0035:.002,slop:.03,label:tile.obstacle?'drop-obstacle':'drop-piece'};
 let body;
 if(tile.geometry&&!tile.bomb){
  const parts=tile.geometry.parts.map(points=>{const vertices=points.map(p=>({x:p.x*r,y:p.y*r})),center=M.Vertices.centre(vertices);return M.Bodies.fromVertices(center.x,center.y,vertices,opts,true,.001,0,.001);});
  body=parts.length===1?parts[0]:M.Body.create({...opts,parts});M.Body.setPosition(body,{x,y});
 }else if(tile.shape===0)body=M.Bodies.circle(x,y,r,opts,24);
 else if(tile.shape===2)body=M.Bodies.rectangle(x,y,r*1.65,r*1.65,{...opts,chamfer:{radius:3}});
 else if(tile.shape===1){
  const size=r*1.23;body=M.Bodies.fromVertices(x,y,[{x:0,y:-size},{x:size*.866,y:size*.5},{x:-size*.866,y:size*.5}],opts);
 }else{
  const vertices=Array.from({length:10},(_,i)=>{const angle=-Math.PI/2+i*Math.PI/5,rad=r*(i%2?.52:1.23);return {x:Math.cos(angle)*rad,y:Math.sin(angle)*rad};});
  // Five convex kites cover the exact same concave outline as ten triangles.
  const parts=Array.from({length:5},(_,i)=>{const tip=i*2,points=[{x:0,y:0},vertices[(tip+9)%10],vertices[tip],vertices[(tip+1)%10]],center=M.Vertices.centre(points);return M.Bodies.fromVertices(center.x,center.y,points,opts);});
  body=M.Body.create({...opts,parts});M.Body.setPosition(body,{x,y});
 }
 body.drop={shape:tile.shape,color:tile.color,obstacle:!!tile.obstacle,bomb:!!tile.bomb,r,geometry:tile.geometry||null,born:0,clearAt:null,danger:0};
 M.Body.setAngle(body,tile.angle||0);return body;
}

const aimBoundsCache=new WeakMap();
export function dropAimBounds(M,tile){
 const signature=[tile.shape,tile.r??DROP_RADIUS,tile.angle||0,!!tile.obstacle].join(':');
 const cached=aimBoundsCache.get(tile);if(cached?.signature===signature)return cached.bounds;
 const body=makeDropBody(M,0,0,tile);
 const left=Math.min(...body.vertices.map(v=>v.x)),right=Math.max(...body.vertices.map(v=>v.x));
 const bounds={min:-left+.15,max:DROP_WIDTH-right-.15};
 aimBoundsCache.set(tile,{signature,bounds});return bounds;
}

// Continuous vertical sweep against the actual convex physics parts. This
// predicts first contact, including rotated shapes and concave star notches.
function verticalContact(a,b){
 let enter=0,exit=Infinity;
 for(const vertices of [a,b])for(let i=0;i<vertices.length;i++){
  const v=vertices[i],w=vertices[(i+1)%vertices.length],nx=-(w.y-v.y),ny=w.x-v.x;
  if(Math.abs(nx)+Math.abs(ny)<1e-9)continue;
  const pa=a.map(p=>p.x*nx+p.y*ny),pb=b.map(p=>p.x*nx+p.y*ny);
  const lo=Math.min(...pb)-Math.max(...pa),hi=Math.max(...pb)-Math.min(...pa);
  if(Math.abs(ny)<1e-9){if(lo>0||hi<0)return Infinity;continue;}
  enter=Math.max(enter,Math.min(lo/ny,hi/ny));exit=Math.min(exit,Math.max(lo/ny,hi/ny));
  if(enter>exit)return Infinity;
 }
 return exit>=0?enter:Infinity;
}
const previewBodies=new WeakMap();
export function dropLandingY(M,tile,x,pieces,height=DROP_HEIGHT){
 const signature=[tile.shape,tile.r,tile.angle,!!tile.bomb].join(':');
 let cached=previewBodies.get(tile);
 if(!cached||cached.signature!==signature){cached={signature,body:makeDropBody(M,0,0,tile)};previewBodies.set(tile,cached);}
 const body=cached.body,start=dropSpawnY(tile);M.Body.setPosition(body,{x,y:start});
 let distance=Math.max(0,height-body.bounds.max.y);
 const parts=b=>b.parts.length>1?b.parts.slice(1):[b];
 for(const other of pieces){
  if(other.drop?.clearAt!=null||other.bounds.max.x<body.bounds.min.x||other.bounds.min.x>body.bounds.max.x)continue;
  for(const a of parts(body))for(const b of parts(other))distance=Math.min(distance,verticalContact(a.vertices,b.vertices));
 }
 return start+Math.max(0,distance);
}

export function createDropGame(M,{rng=Math.random,autoDrop=true,practice=false,onClear=()=>{},onEnd=()=>{},onBomb=()=>{},onImpact=()=>{},height=DROP_HEIGHT,frame='none',geometryFor=()=>null}={}){
 height=Number.isFinite(height)?clamp(height,DROP_HEIGHT,1200):DROP_HEIGHT;
 const engine=M.Engine.create({enableSleeping:true,positionIterations:8,velocityIterations:8});engine.gravity.y=1.05;
 const world=engine.world;
 // Keep the sides continuous above the spawn area too. Large rotating pieces
 // can rebound above the visible rim; they must not go around the wall ends.
 const wallHeight=height+2048,wallY=height-wallHeight/2;
 const floor=M.Bodies.rectangle(160,height+20,360,40,{isStatic:true});
 M.Composite.add(world,[M.Bodies.rectangle(-20,wallY,40,wallHeight,{isStatic:true}),M.Bodies.rectangle(340,wallY,40,wallHeight,{isStatic:true}),floor]);
 const random=createDropSequence(rng);let game;
 const next=()=>{
  const turn=game?game.drops+game.queue.length:0,tile=random(game?.pieces||[],turn,game?.queue||[],game?.score||0);
  if(!tile.bomb&&!tile.obstacle)tile.r*=dropViewportScale(height,turn);
  tile.geometry=geometryFor(tile);return tile;
 };
 game={practice,frame,engine,height,pieces:[],queue:[next()],time:0,score:0,matches:0,bombPoints:0,cleared:0,drops:0,combo:0,bestCombo:0,lastClear:-100,aim:160,countdown:6,cooldown:0,over:false,danger:0,events:[]};
 game.queue.push(next());
 let accumulator=0,frameReady=null,frameMerges=0,frameGroups=[],supportCheckAt=0;
 const pendingImpacts=new Map(),impactPairs=new Map(),impactBodies=new WeakMap();let lastImpactAt=-Infinity,impactCleanupAt=0;
 // collisionStart occurs after beforeSolve and before the velocity solver in
 // Matter 0.20. Measure incoming contact velocity here, not the rebound speed.
 function captureImpacts(event){
  if(game.over||game.time-lastImpactAt<DROP_IMPACT_INTERVAL)return;
  for(const pair of event.pairs){
   const collision=pair.collision,a=collision.parentA,b=collision.parentB;
   if(pair.isSensor||a.isSensor||b.isSensor||(!a.drop&&!b.drop)||a.drop?.bomb||b.drop?.bomb||a.drop?.clearAt!=null||b.drop?.clearAt!=null)continue;
   const contacts=pair.contacts.slice(0,pair.contactCount).map(c=>c.vertex);if(!contacts.length)continue;
   const point=contacts.reduce((p,v)=>({x:p.x+v.x/contacts.length,y:p.y+v.y/contacts.length}),{x:0,y:0});
   const velocity=body=>{if(body.isStatic||body.isSleeping)return {x:0,y:0};const v=M.Body.getVelocity(body),w=M.Body.getAngularVelocity(body);return {x:v.x-w*(point.y-body.position.y),y:v.y+w*(point.x-body.position.x)};};
   const va=velocity(a),vb=velocity(b),speed=-((va.x-vb.x)*collision.normal.x+(va.y-vb.y)*collision.normal.y)*60;
   if(!Number.isFinite(speed)||speed<DROP_IMPACT_MIN_SPEED)continue;
   const key=a.id<b.id?a.id+':'+b.id:b.id+':'+a.id;
   if(speed<=(pendingImpacts.get(key)?.speed??0))continue;
   const body=a.drop?a:b,other=body===a?b:a,type=a===floor||b===floor?'floor':a.drop&&b.drop?'piece':'wall';
   pendingImpacts.set(key,{key,a,b,type,speed,strength:clamp(speed/720,.1,1),radius:Math.max(a.drop?.r||0,b.drop?.r||0),locked:!!(a.drop?.obstacle||b.drop?.obstacle),x:point.x,y:point.y,time:game.time,bodyId:body.id,otherId:other.id});
  }
 }
 function emitImpacts(){
  // Resolve bomb/merge removals first, so a disappearing piece cannot also
  // produce a landing cue. Resting contacts never enter this start-only path.
  const live=pendingImpacts.size?new Set(game.pieces.filter(body=>body.drop.clearAt===null)):null;
  for(const impact of [...pendingImpacts.values()].sort((a,b)=>b.speed-a.speed)){
   const {a,b,key,...event}=impact;
   if((a.drop&&!live.has(a))||(b.drop&&!live.has(b))||a.isSensor||b.isSensor)continue;
   if(game.time-lastImpactAt<DROP_IMPACT_INTERVAL||game.time-(impactPairs.get(key)??-Infinity)<DROP_IMPACT_PAIR_COOLDOWN)continue;
   if([a,b].some(body=>body.drop&&game.time-(impactBodies.get(body)??-Infinity)<DROP_IMPACT_BODY_COOLDOWN))continue;
   lastImpactAt=game.time;impactPairs.set(key,game.time);for(const body of [a,b])if(body.drop)impactBodies.set(body,game.time);
   onImpact(event);
  }
  pendingImpacts.clear();
  if(game.time>=impactCleanupAt){for(const [key,at] of impactPairs)if(game.time-at>=DROP_IMPACT_PAIR_COOLDOWN)impactPairs.delete(key);impactCleanupAt=game.time+.5;}
 }
 function containPieces(){
  for(const body of game.pieces){
   if(body.drop.clearAt!==null||body.isStatic)continue;
   // Use the actual outline, not velocity-expanded broad-phase bounds. Dense
   // collisions can push a small piece through a rail despite solver iterations.
   let left=Infinity,right=-Infinity,bottom=-Infinity;
   for(const v of body.vertices){left=Math.min(left,v.x);right=Math.max(right,v.x);bottom=Math.max(bottom,v.y);}
   const dx=left<-.5?-left:right>DROP_WIDTH+.5?DROP_WIDTH-right:0,dy=bottom>height+.5?height-bottom:0;
   if(!dx&&!dy)continue;
   const velocity={...body.velocity};
   M.Body.translate(body,{x:dx,y:dy});M.Sleeping.set(body,false);
   if(dx*velocity.x<0)velocity.x=-velocity.x*body.restitution;
   if(dy&&velocity.y>0)velocity.y=-velocity.y*body.restitution;
   M.Body.setVelocity(body,velocity);
  }
 }
 function wakeUnsupported(){
  const live=game.pieces.filter(b=>b.drop.clearAt===null);
  if(!live.some(b=>b.isSleeping&&!b.isStatic))return;
  // Sleeping collision pairs may be stale after a slow support moves away.
  // Follow current physical contacts from the floor, using compound outlines
  // rather than star hulls. A floating group cannot support itself, and a
  // vertical wall alone is not a floor. Properly supported piles keep sleeping.
  const pending=new Set(live),supported=[floor];
  for(const body of live)if(body.isStatic){pending.delete(body);supported.push(body);}
  for(let i=0;i<supported.length;i++)for(const body of pending){
   if(dropBodiesTouch(M,supported[i],body)){pending.delete(body);supported.push(body);}
  }
  for(const body of pending)if(body.isSleeping)M.Sleeping.set(body,false);
 }
 function clearTouching(){
  if(!frameReady)return;
  const alive=game.pieces.filter(b=>b.drop.clearAt===null&&!b.drop.obstacle).sort((a,b)=>a.bounds.min.x-b.bounds.min.x),contacts=[];
  for(let i=0;i<alive.length;i++)for(let j=i+1;j<alive.length;j++){
   const a=alive[i],b=alive[j];if(b.bounds.min.x>a.bounds.max.x+4)break;
   if(dropMatches(a.drop,b.drop)&&dropBodiesTouch(M,a,b,dropMatchTolerance(a,b)))contacts.push([a,b]);
  }
  contacts.sort((p,q)=>Math.min(p[0].id,p[1].id)-Math.min(q[0].id,q[1].id)||Math.max(p[0].id,p[1].id)-Math.max(q[0].id,q[1].id));
  // Snapshot every matching edge before removing anything. A bridge may match
  // by shape on one side and by colour on the other; all members clear once.
  // A connected group earns one point per additional merged piece. Cycles
  // do not multiply the score, and independent pairs each earn one point.
  const roots=new Map();const root=b=>{while(roots.has(b))b=roots.get(b);return b;};
  for(const [a,b] of contacts){const x=root(a),y=root(b);if(x!==y){roots.set(x,y);frameMerges++;}}
  const groups=new Map();for(const body of new Set(contacts.flat())){const key=root(body);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(body);}frameGroups.push(...groups.values());
  for(const pair of contacts)for(const body of pair)if(!frameReady.has(body)){
   frameReady.add(body);body.drop.clearAt=game.time;M.Body.setStatic(body,true);body.isSensor=true;for(const part of body.parts)part.isSensor=true;
  }
  for(const pair of engine.pairs.list)if(pair.bodyA.parent.drop?.clearAt!=null||pair.bodyB.parent.drop?.clearAt!=null)pair.isSensor=true;
 }
 // Capture new falling contacts before the solver can bounce matching pieces apart.
 M.Events.on(engine,'beforeSolve',clearTouching);
 M.Events.on(engine,'collisionStart',captureImpacts);
 function add(tile,x,y=dropSpawnY(tile)){if(!tile.geometry)tile.geometry=geometryFor(tile);const limits=dropAimBounds(M,tile),body=makeDropBody(M,clamp(x,limits.min,limits.max),y,tile);body.drop.born=game.time;game.pieces.push(body);M.Composite.add(world,body);return body;}
 function drop(){
  if(game.over||game.cooldown>0)return false;
  if(game.pieces.length>=110){end('overflow');return false;}
  // The held piece is fixed until released. Choose its replacement from the
  // existing surface before this new body appears at the top of every column.
  const upcoming=next(),body=add(game.queue.shift(),game.aim);M.Body.setVelocity(body,{x:0,y:1.4});game.queue.push(upcoming);aim(game.aim);game.drops++;game.countdown=dropInterval(game.drops);game.cooldown=.42;game.events.push({type:'drop',body});return true;
 }
 function aim(x){if(Number.isFinite(x)){const limits=dropAimBounds(M,game.queue[0]);game.aim=clamp(x,limits.min,limits.max);}}
 function rotate(){if(!game.over){game.queue[0].angle+=Math.PI/4;aim(game.aim);}}
 function end(reason='quit'){if(game.over)return;game.over=true;game.endReason=reason;onEnd({reason,score:game.score,cleared:game.cleared,bestCombo:game.bestCombo,drops:game.drops});}
 function tick(dt){
  game.time+=dt;game.cooldown=Math.max(0,game.cooldown-dt);
  const alive=game.pieces.filter(b=>b.drop.clearAt===null),ready=new Set();frameReady=ready;frameMerges=0;frameGroups=[];pendingImpacts.clear();
  // Also capture an existing touch before velocity moves either body away.
  clearTouching();M.Engine.update(engine,dt*1000);containPieces();frameReady=null;
  for(const bomb of [...game.pieces])if(bomb.drop.bomb&&bomb.drop.clearAt===null){
   const contacts=M.Query.collides(bomb,[floor,...game.pieces.filter(b=>b!==bomb&&b.drop.clearAt===null)]);
   if(!contacts.length)continue;
   const impacted=contacts.flatMap(contact=>[contact.bodyA.parent,contact.bodyB.parent]).filter(body=>body!==bomb&&body?.drop);
   const {x,y}=bomb.position;bomb.drop.clearAt=game.time;M.Composite.remove(world,bomb);game.pieces=game.pieces.filter(b=>b!==bomb);
   const pieces=bombAt(x,y,impacted);onBomb({x,y,pieces});game.events.push({type:"bomb",x,y,pieces});
  }
  if(ready.size){
   game.combo=game.time-game.lastClear<1.7?Math.min(8,game.combo+1):1;game.bestCombo=Math.max(game.bestCombo,game.combo);game.lastClear=game.time;
   const gained=frameMerges;game.matches+=gained;game.score+=gained*frameRewardMultiplier(frame);game.cleared+=ready.size;
   const cleared=[...ready];for(const body of cleared)M.Composite.remove(world,body);
   // Removing a support does not wake sleeping Matter bodies. Wake the whole
   // remaining pile, including blocks, so stacked dependants can fall too.
   // Do not add an impulse or reset velocity: gravity resolves the new support.
   for(const body of game.pieces)if(body.drop.clearAt===null&&!body.isStatic)M.Sleeping.set(body,false);
   const event={type:'clear',pieces:cleared,groups:frameGroups,score:gained*frameRewardMultiplier(frame),combo:game.combo};game.events.push(event);onClear(event);
  }
  for(const body of game.pieces){if(body.drop.clearAt!==null&&game.time-body.drop.clearAt>.12)M.Composite.remove(world,body);}
  game.pieces=game.pieces.filter(b=>b.drop.clearAt===null||game.time-b.drop.clearAt<=.12);
  emitImpacts();
  // Matches already wake their dependants immediately. Audit other sleeping
  // supports ten times a second instead of walking the whole pile at 120 Hz.
  if(game.time>=supportCheckAt){wakeUnsupported();supportCheckAt=game.time+.1;}
  // An overcrowded pile must not evade overflow by continually jostling.
  // Freshly dropped bodies have time to fall past the line before they count.
  let crowded=false;
  for(const body of alive){
   const high=body.drop.clearAt===null&&body.bounds.min.y<DROP_LINE&&game.time-body.drop.born>1.3;
   body.drop.danger=high?body.drop.danger+dt:0;crowded ||= high;
  }
  game.danger=crowded?game.danger+dt:Math.max(0,game.danger-dt*2);
  if(!game.practice&&game.danger>=.8){end('overflow');return;}
  if(autoDrop){game.countdown-=dt;if(game.countdown<=0)drop();}
 }
 function step(seconds){if(game.over||!Number.isFinite(seconds))return;accumulator+=clamp(seconds,0,.05);while(accumulator>=1/120&&!game.over){tick(1/120);accumulator-=1/120;}}
 function bombAt(x,y,impacted=[]){
  if(game.over||!Number.isFinite(x)||!Number.isFinite(y))return [];
  // A tip or corner of a large shape can be farther from its center than the
  // blast cutoff. Direct hits must still clear it; keep the five-piece cap.
  const direct=new Set(impacted);
  const distance=b=>Math.hypot(b.position.x-x,b.position.y-y);
  const targets=game.pieces.filter(b=>b.drop.clearAt===null&&!b.drop.bomb&&(direct.has(b)||distance(b)<=90+b.drop.r*.4)).sort((a,b)=>Number(direct.has(b))-Number(direct.has(a))||distance(a)-distance(b)).slice(0,5);
  if(!targets.length)return [];
  for(const body of targets){body.drop.clearAt=game.time;M.Composite.remove(world,body);}
  game.pieces=game.pieces.filter(b=>!targets.includes(b));for(const b of game.pieces)M.Sleeping.set(b,false);
  game.bombPoints+=targets.length;game.score+=targets.length*frameRewardMultiplier(frame);game.cleared+=targets.length;game.danger=0;return targets;
 }
 function dispose(){M.Events.off(engine,'beforeSolve',clearTouching);M.Events.off(engine,'collisionStart',captureImpacts);pendingImpacts.clear();impactPairs.clear();M.Composite.clear(world,false);M.Engine.clear(engine);game.pieces=[];game.events=[];}
 function revive(){if(!game.over||game.endReason!=='overflow')return false;
  const removed=game.pieces.filter(b=>b.bounds.min.y<height*.55);for(const b of removed)M.Composite.remove(world,b);
  game.pieces=game.pieces.filter(b=>!removed.includes(b));for(const b of game.pieces)M.Sleeping.set(b,false);
  game.over=false;game.endReason=null;game.danger=0;game.cooldown=1.5;game.combo=0;accumulator=0;return true;
 }
 return Object.assign(game,{landingY:()=>dropLandingY(M,game.queue[0],game.aim,game.pieces,height),bombAt,revive,step,drop,aimAt:aim,rotate,end,dispose,addPiece:add});
}

const safe=n=>Number.isSafeInteger(n)&&n>=0?n:0;
export function dropProgress(raw={}){return {best:raw?.scoreVersion===2?safe(raw?.best):0,scoreVersion:2,legacyBest:Math.max(safe(raw?.legacyBest),raw?.scoreVersion===2?0:safe(raw?.best)),cleared:safe(raw?.cleared),bestCombo:Math.min(8,safe(raw?.bestCombo)),runs:safe(raw?.runs),pending:Array.isArray(raw?.pending)?raw.pending.filter(p=>typeof p?.id==='string'&&/^shape-drop-[a-f0-9-]{36}$/.test(p.id)&&Number.isSafeInteger(p.cleared)&&p.cleared>=0&&p.cleared<=100000).slice(-100):[]};}
export function finishDropProgress(raw,result,id){const p=dropProgress(raw);if(p.pending.some(x=>x.id===id))return p;const cleared=safe(result.cleared);return {...p,best:Math.max(p.best,(safe(result.matches)+safe(result.bombPoints))*frameRewardMultiplier(result.frame)),cleared:p.cleared+cleared,bestCombo:Math.max(p.bestCombo,Math.min(8,safe(result.bestCombo))),runs:p.runs+1,pending:[...p.pending,{id,cleared,rewardVersion:2,xpMultiplier:frameRewardMultiplier(result.frame)}].slice(-100)};}
export function claimDropReward(profile,entry){
 if(!entry||!/^shape-drop-[a-f0-9-]{36}$/.test(entry.id)||!Number.isSafeInteger(entry.cleared)||entry.cleared<0||entry.cleared>100000)return profile;
 const receipts=Array.isArray(profile.dropRewards)?profile.dropRewards:[];if(receipts.includes(entry.id))return profile;
 const coins=miniGameCoins(entry.cleared,entry.rewardVersion??1),xp=Math.min(200,entry.cleared)*(entry.xpMultiplier===2?2:1);
 if(!Number.isSafeInteger(profile.coins+coins)||!Number.isSafeInteger(profile.xp+xp))return profile;
 return {...profile,coins:profile.coins+coins,xp:profile.xp+xp,dropRewards:[...receipts,entry.id]};
}
