import {shapeMask} from './slice-fragments.js?v=49439-web12';
// Bounded, local VFX only: particles never change hits, rewards or gameplay.
export function createSliceBurst(piece,from,to,color,quiet=false,rng=Math.random){
 const angle=Math.atan2(to.y-from.y,to.x-from.x),sparks=[];
 for(let i=0;i<(quiet?6:12);i++){
  const a=angle+i*2.39996+(rng()-.5)*.6,speed=(quiet?20:40)+rng()*(quiet?30:120);
  sparks.push({x:piece.x+Math.cos(a)*piece.r*.25,y:piece.y+Math.sin(a)*piece.r*.25,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed-35,age:0,life:quiet?.25:.35+rng()*.2,size:quiet?2:2+rng()*2,color:i%5===0?'#ffffff':color,kind:i%3,angle:a,spin:(rng()-.5)*12});
 }
 const dx=to.x-from.x,dy=to.y-from.y,lengthSquared=dx*dx+dy*dy;
 const crossing=lengthSquared?Math.max(0,Math.min(1,((piece.x-from.x)*dx+(piece.y-from.y)*dy)/lengthSquared)):0;
 return {sparks,flash:{x:lengthSquared?from.x+dx*crossing:piece.x,y:lengthSquared?from.y+dy*crossing:piece.y,r:piece.r,angle,color,age:0,life:quiet?.16:.34,quiet,splash:createSliceSplash(piece,from,to,quiet,rng)}};
}
const clamp01=n=>Math.max(0,Math.min(1,n));

// Intersect the same rotated mask used by the two visual halves. Separate
// intervals keep a star's concave gaps dry, and recuts use their remaining mask.
export function sliceSplashSeam(piece,from,to){
 const angle=Math.atan2(to.y-from.y,to.x-from.x),c=Math.cos(angle),s=Math.sin(angle),dx=piece.x-from.x,dy=piece.y-from.y;
 const along=dx*c+dy*s,x=from.x+along*c,y=from.y+along*s,rotation=(piece.angle||0)-angle,rc=Math.cos(rotation),rs=Math.sin(rotation);
 const centerX=(piece.x-x)*c+(piece.y-y)*s,centerY=-(piece.x-x)*s+(piece.y-y)*c;
 const mask=(piece.mask||shapeMask(piece.shape??0,piece.r)).map(p=>({x:centerX+p.x*rc-p.y*rs,y:centerY+p.x*rs+p.y*rc}));
 const crossings=[];
 for(let i=0;i<mask.length;i++){
  const a=mask[i],b=mask[(i+1)%mask.length];
  if((a.y>0)!==(b.y>0))crossings.push(a.x+(b.x-a.x)*(-a.y)/(b.y-a.y));
 }
 crossings.sort((a,b)=>a-b);const spans=[];
 for(let i=0;i+1<crossings.length;i+=2)if(crossings[i+1]-crossings[i]>.05)spans.push([crossings[i],crossings[i+1]]);
 return {x,y,angle,spans};
}
export function createSliceSplash(piece,from,to,quiet=false,rng=Math.random){
 const seam=sliceSplashSeam(piece,from,to),r=piece.r,total=seam.spans.reduce((sum,[a,b])=>sum+b-a,0),drops=[];
 const pick=u=>{let d=u*total;for(const [a,b] of seam.spans){if(d<=b-a)return a+d;d-=b-a;}return seam.spans.at(-1)?.[1]||0;};
 if(total>.05)for(let i=0;i<(quiet?4:10);i++){
  const side=i%2?1:-1;
  drops.push({x:pick((i+.3+rng()*.4)/(quiet?4:10)),y:side*r*.025,
   vx:quiet?0:(rng()-.5)*r*2.2,vy:quiet?0:side*r*(2.4+rng()*2.1),
   size:r*(.075+rng()*.065),life:quiet?.2:.36+rng()*.16,side});
 }
 return {...seam,r,quiet,life:quiet?.2:.52,vx:quiet?0:(piece.vx||0),vy:quiet?0:(piece.depth?(piece.vy||0):(piece.vy||0)*.2)-35,drops};
}
// Pure local poses allow bounds/size checks without allocating canvas textures.
export function sliceDropletPose(splash,drop,age){
 const t=clamp01(age/drop.life),travel=splash.quiet?0:(1-Math.exp(-age*2.5))/2.5;
 return {x:drop.x+drop.vx*travel,y:drop.y+drop.vy*travel,
  radius:drop.size*(1-t*.55),tail:splash.quiet?0:splash.r*.28*Math.sin(Math.PI*t),
  opacity:(1-t)**.8,angle:Math.atan2(drop.vy,drop.vx)};
}
function drawSliceSplash(ctx,f){
 const p=f.splash,age=f.age;if(!p||age>=p.life||!p.spans.length)return;
 ctx.save();ctx.translate(p.x+p.vx*age,p.y+p.vy*age+(p.quiet?0:age*age*85));ctx.rotate(p.angle);
 ctx.fillStyle=f.color;ctx.strokeStyle=f.color;ctx.lineCap='round';
 if(p.quiet){
  ctx.globalAlpha=(1-age/p.life)*.7;ctx.lineWidth=Math.max(2,p.r*.12);
  for(const [a,b] of p.spans){ctx.beginPath();ctx.moveTo(a,0);ctx.lineTo(b,0);ctx.stroke();}
 }else if(age<.25){
  const t=age/.25,opening=Math.sin(Math.PI*Math.min(1,t*1.2)/2),fade=(1-t)**.55;
  // Two soft irregular sheets peel off the real seam toward the separating halves.
  for(const [a,b] of p.spans)for(const side of [-1,1]){
   const width=b-a,inner=side*p.r*(.018+t*.12),outer=side*p.r*(.08+opening*.5);
   ctx.globalAlpha=fade*.68;ctx.beginPath();ctx.moveTo(a,inner);
   ctx.bezierCurveTo(a+width*.3,inner*.6,a+width*.7,inner*.7,b,inner);
   ctx.quadraticCurveTo(b+width*.045,outer*.4,b-width*.09,outer*.7);
   ctx.quadraticCurveTo(b-width*.19,outer*1.25,b-width*.31,outer*.7);
   ctx.quadraticCurveTo(a+width*.5,outer*.55,a+width*.43,outer*1.13);
   ctx.quadraticCurveTo(a+width*.36,outer*1.36,a+width*.24,outer*.75);
   ctx.quadraticCurveTo(a-width*.03,outer*.95,a,inner);ctx.closePath();ctx.fill();
   ctx.globalAlpha=fade*.58;ctx.strokeStyle='#ffffff';ctx.lineWidth=Math.max(.7,p.r*.025);
   ctx.beginPath();ctx.moveTo(a+width*.13,outer*.55);ctx.quadraticCurveTo(a+width*.28,outer*.63,a+width*.32,outer*.84);ctx.stroke();
  }
 }
 for(const d of p.drops){
  if(age>=d.life)continue;const pose=sliceDropletPose(p,d,age),r=pose.radius;
  ctx.save();ctx.translate(pose.x,pose.y);ctx.rotate(pose.angle);ctx.globalAlpha=pose.opacity*.9;
  ctx.fillStyle=f.color;ctx.beginPath();ctx.moveTo(-r-pose.tail,0);
  ctx.bezierCurveTo(-r,-r*.75,r*.8,-r*1.25,r,0);ctx.bezierCurveTo(r*.8,r*1.25,-r,r*.75,-r-pose.tail,0);ctx.closePath();ctx.fill();
  ctx.globalAlpha=pose.opacity*.7;ctx.fillStyle='#ffffff';ctx.beginPath();ctx.ellipse(r*.13,-r*.27,r*.35,r*.16,-.25,0,Math.PI*2);ctx.fill();ctx.restore();
 }
 ctx.restore();
}

// The slash grows in the swipe direction, then its tail catches up. Its entire
// footprint stays beside the cut; it does not move the camera or add an overlay.
export function sliceSlashPose(f){
 const t=clamp01(f.age/f.life),head=f.quiet?.5:Math.min(1,.18+t*1.8),tail=f.quiet?.5:Math.max(0,(t-.2)/.8);
 return {head,tail,opacity:(1-t)**1.4,length:f.r*2.7,bend:f.r*.45,glint:f.quiet?0:f.r*.16*Math.sin(Math.PI*Math.min(1,t*1.35))};
}
function drawCutAccent(ctx,f){
 const pose=sliceSlashPose(f),t=clamp01(f.age/f.life);if(t>=1)return;
 ctx.save();ctx.translate(f.x,f.y);ctx.rotate(f.angle);ctx.lineCap='round';
 // Keep the original immediate cut highlight, scaled to the struck shape.
 ctx.globalAlpha=(1-t)*.65;ctx.strokeStyle='#fff7ff';ctx.lineWidth=Math.max(1.5,f.r*(f.quiet?.055:.08))*(1-t*.5);
 ctx.shadowColor=f.color;ctx.shadowBlur=f.quiet?0:Math.min(13,f.r*.35);
 ctx.beginPath();ctx.moveTo(-f.r*.8,0);ctx.lineTo(f.r*.8,0);ctx.stroke();
 if(!f.quiet){
  const point=u=>({x:(u-.5)*pose.length,y:-4*u*(1-u)*pose.bend});
  const path=()=>{ctx.beginPath();for(let i=0;i<=12;i++){const p=point(pose.tail+(pose.head-pose.tail)*i/12);if(i)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y);}};
  ctx.globalAlpha=pose.opacity*.8;ctx.strokeStyle=f.color;ctx.lineWidth=Math.max(2.5,f.r*.13)*(1-t*.4);ctx.shadowBlur=Math.min(15,f.r*.4);path();ctx.stroke();
  ctx.shadowBlur=0;ctx.strokeStyle='#f4ffff';ctx.lineWidth=Math.max(1,f.r*.035)*(1-t*.3);ctx.stroke();
  // One small four-point glint travels with the leading edge of the curved cut.
  if(pose.glint>.1){const head=point(pose.head),r=pose.glint;ctx.globalAlpha=pose.opacity;ctx.fillStyle='#fffce5';ctx.shadowColor=f.color;ctx.shadowBlur=7;ctx.beginPath();ctx.moveTo(head.x-r,head.y);ctx.lineTo(head.x-r*.2,head.y-r*.2);ctx.lineTo(head.x,head.y-r);ctx.lineTo(head.x+r*.2,head.y-r*.2);ctx.lineTo(head.x+r,head.y);ctx.lineTo(head.x+r*.2,head.y+r*.2);ctx.lineTo(head.x,head.y+r);ctx.lineTo(head.x-r*.2,head.y+r*.2);ctx.closePath();ctx.fill();}
 }
 ctx.restore();
}
export function stepSliceEffects(effects,dt){
 for(const p of effects.sparks){p.age+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.exp(-dt*1.1);p.vy+=180*dt;p.angle+=(p.spin||0)*dt;}
 for(const f of effects.flashes)f.age+=dt;
 effects.sparks=effects.sparks.filter(p=>p.age<p.life).slice(-96);
 effects.flashes=effects.flashes.filter(f=>f.age<Math.max(f.life,f.splash?.life||0)).slice(-24);
 return effects;
}
function shard(ctx,r,kind=0){
 ctx.beginPath();
 if(kind===1){ctx.moveTo(-r,-r*.7);ctx.lineTo(r*.8,-r*.3);ctx.lineTo(r*.35,r);ctx.lineTo(-r*.55,r*.35);}
 else{ctx.moveTo(0,-r);ctx.lineTo(r*.62,r*.55);ctx.lineTo(-r*.65,r*.8);}
 ctx.closePath();
}
export function drawSliceEffects(ctx,effects){
 ctx.save();ctx.lineCap='round';
 for(let i=Math.max(0,effects.flashes.length-12);i<effects.flashes.length;i++)drawSliceSplash(ctx,effects.flashes[i]);
 for(let i=Math.max(0,effects.flashes.length-24);i<effects.flashes.length;i++)drawCutAccent(ctx,effects.flashes[i]);
 for(const p of effects.sparks){
  const t=p.age/p.life,fade=Math.min(1,(1-t)*2.5);ctx.save();ctx.globalAlpha=fade;ctx.translate(p.x,p.y);ctx.rotate(p.angle);
  ctx.fillStyle=p.color;ctx.strokeStyle='#102746';ctx.lineWidth=1.2;
  if(p.kind===0){
   const length=p.size*(2.8-t);ctx.shadowColor=p.color;ctx.shadowBlur=7;ctx.strokeStyle=p.color;ctx.lineWidth=p.size*.65;
   ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,length);ctx.stroke();ctx.shadowBlur=0;ctx.strokeStyle='#ffffff';ctx.lineWidth=1;ctx.stroke();
  }else{
   shard(ctx,p.size*(1-t*.35),p.kind);ctx.stroke();ctx.fill();
   ctx.strokeStyle='#ffffffb0';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(-p.size*.2,-p.size*.3);ctx.lineTo(p.size*.2,0);ctx.stroke();
  }
  ctx.restore();
 }
 ctx.restore();
}

// Staggered jets fill the burst, rather than forming one expanding outline.
export function createBombImpact(piece,quiet=false,rng=Math.random){
 const count=quiet?12:36;
 return {x:piece.x,y:piece.y,r:piece.r,age:0,life:1.4,quiet,
  sparks:Array.from({length:count},(_,i)=>{
   const angle=i*2.39996+(rng()-.5)*.9,kind=i%8===0?'smoke':'ember';
   return {angle,kind,delay:quiet?0:rng()*.14,
    originX:(rng()-.5)*piece.r*.8,originY:(rng()-.5)*piece.r*.8,
    speed:quiet?20+rng()*45:kind==='smoke'?25+rng()*95:65+rng()**1.5*520,
    size:kind==='smoke'?14+rng()*15:2.5+rng()*4.5,
    life:kind==='smoke'?1.25:.65+rng()*.6,
    color:i%3===0?'#fff2b4':i%3===1?'#ffc85c':'#ff783d'};
  })};
}
export function stepBombImpacts(impacts,dt){
 for(const impact of impacts)impact.age+=Math.max(0,dt);
 return impacts.filter(p=>p.age<p.life).slice(-4);
}
// Let the explosion read before the result panel covers the final lost heart.
export const bombImpactPending=impacts=>impacts.some(p=>p.age<.85);
export function bombCameraOffset(impacts){
 const p=impacts.findLast(p=>!p.quiet&&p.age<.42);
 if(!p)return {x:0,y:0};
 const strength=10*(1-p.age/.42)**2;
 return {x:Math.cos(p.age*91)*strength,y:Math.sin(p.age*113+1)*strength*.75};
}
export function bombHaptic(quiet=false,native=globalThis.window?.ShapeShiftFeedback,device=globalThis.navigator){
 if(quiet)return false;
 try{if(native?.bombHit){native.bombHit();return true;}return device?.vibrate?.(65)??false;}catch{return false;}
}
export function drawBombImpacts(ctx,impacts){
 for(const p of impacts){
  ctx.save();ctx.translate(p.x,p.y);
  for(const s of p.sparks){
   if(s.kind!=='smoke')continue;
   const age=p.age-s.delay,t=age/s.life;if(age<0||t>=1)continue;
   const x=s.originX+Math.cos(s.angle)*s.speed*age,y=s.originY+Math.sin(s.angle)*s.speed*age-age*age*65;
   const size=s.size*(.5+t*2);ctx.globalAlpha=Math.min(1,t*8)*(1-t)*.45;
   const smoke=ctx.createRadialGradient(x,y,0,x,y,size);smoke.addColorStop(0,'#a68181');smoke.addColorStop(.45,'#5b405b');smoke.addColorStop(1,'#241d3900');
   ctx.fillStyle=smoke;ctx.fillRect(x-size,y-size,size*2,size*2);
  }
  ctx.lineCap='round';
  for(const s of p.sparks){
   if(s.kind!=='ember')continue;
   const age=p.age-s.delay,t=age/s.life;if(age<0||t>=1)continue;
   const previous=Math.max(0,age-(p.quiet?.015:.045)),travel=a=>s.speed*(1-Math.exp(-a*1.6))/1.6;
   const position=a=>({x:s.originX+Math.cos(s.angle)*travel(a),y:s.originY+Math.sin(s.angle)*travel(a)+a*a*145});
   const head=position(age),tail=position(previous),size=s.size*(1-t*.6);
   ctx.globalAlpha=Math.min(1,(1-t)*2.2);ctx.strokeStyle=s.color;
   ctx.shadowColor='#ff8a35';ctx.shadowBlur=p.quiet?0:9;ctx.lineWidth=size;
   ctx.beginPath();ctx.moveTo(tail.x,tail.y);ctx.lineTo(head.x+.01,head.y);ctx.stroke();
   // Thin hot cores turn into orange embers as the particles fall.
   ctx.shadowBlur=0;ctx.strokeStyle=t<.45?'#fff9df':'#ffd37b';ctx.lineWidth=Math.max(.8,size*.28);ctx.stroke();
  }
  ctx.restore();
 }
}
