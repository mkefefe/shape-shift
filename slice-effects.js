// Bounded, local VFX only: particles never change hits, rewards or gameplay.
export function createSliceBurst(piece,from,to,color,quiet=false,rng=Math.random){
 const angle=Math.atan2(to.y-from.y,to.x-from.x),sparks=[];
 for(let i=0;i<(quiet?6:12);i++){
  const a=angle+i*2.39996+(rng()-.5)*.6,speed=(quiet?20:40)+rng()*(quiet?30:120);
  sparks.push({x:piece.x+Math.cos(a)*piece.r*.25,y:piece.y+Math.sin(a)*piece.r*.25,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed-35,age:0,life:quiet?.25:.35+rng()*.2,size:quiet?2:2+rng()*2,color:i%5===0?'#ffffff':color,kind:i%3,angle:a,spin:(rng()-.5)*12});
 }
 return {sparks,flash:{x:piece.x,y:piece.y,r:piece.r,angle,color,age:0,life:quiet?.16:.22,quiet}};
}
export function stepSliceEffects(effects,dt){
 for(const p of effects.sparks){p.age+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.exp(-dt*1.1);p.vy+=180*dt;p.angle+=(p.spin||0)*dt;}
 for(const f of effects.flashes)f.age+=dt;
 effects.sparks=effects.sparks.filter(p=>p.age<p.life).slice(-96);
 effects.flashes=effects.flashes.filter(f=>f.age<f.life).slice(-24);
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
 for(const f of effects.flashes){
  const t=f.age/f.life;ctx.save();ctx.globalAlpha=(1-t)*.9;ctx.translate(f.x,f.y);ctx.rotate(f.angle);
  ctx.shadowColor=f.color;ctx.shadowBlur=f.quiet?0:14;ctx.strokeStyle='#fff5ff';ctx.lineWidth=(1-t)*(f.quiet?2:5);
  ctx.beginPath();ctx.moveTo(-f.r*(1+t),0);ctx.lineTo(f.r*(1+t),0);ctx.stroke();ctx.restore();
 }
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
