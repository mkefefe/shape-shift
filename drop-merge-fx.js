export const DROP_MERGE_DURATION=1.2;
export const DROP_MERGE_BURST_AT=.64;
const clamp=n=>Math.max(0,Math.min(1,n)),smooth=n=>n*n*(3-2*n),radiusOf=n=>Math.max(8,Math.min(128,Number(n)||21));
// Complete pieces shine, converge, hold at full size, then compress and release.
export function dropMergePose(age,radius,quiet=false){
 radius=radiusOf(radius);
 const travel=smooth(clamp((age-.14)/.26)),shrink=smooth(clamp((age-.52)/.18)),burst=clamp((age-DROP_MERGE_BURST_AT)/(DROP_MERGE_DURATION-DROP_MERGE_BURST_AT));
 return {travel:quiet?0:travel,scale:1-shrink,alpha:age<.70?1:0,glow:Math.max(10,radius*.42),burst,spread:(quiet?.35:1.65)*radius*(1-(1-burst)**2),particleRadius:Math.max(2.2,radius*.055)*(1-burst),visible:age>=0&&age<DROP_MERGE_DURATION};
}
function approachTrail(ctx,p,event,pose,age,index){
 const fade=smooth(clamp((age-.14)/.08))*(1-smooth(clamp((age-.30)/.14)));if(fade<=0)return;
 const r=radiusOf(p.tile.r),dx=event.x-p.x,dy=event.y-p.y,length=Math.hypot(dx,dy);if(length<1)return;
 const x=p.x+dx*pose.travel,y=p.y+dy*pose.travel,nx=-dy/length,ny=dx/length;
 // Start along the outer edge so the intact moving sprite does not hide the ribbon.
 const sx=p.x+nx*r*.9,sy=p.y+ny*r*.9,cx=(sx+x)/2+nx*r*1.25,cy=(sy+y)/2+ny*r*1.25;
 ctx.save();ctx.lineCap='round';ctx.globalAlpha=fade*.68;ctx.shadowColor='#ffd34e';ctx.shadowBlur=Math.min(18,r*.22);ctx.strokeStyle='#ffc734';ctx.lineWidth=Math.max(1.2,r*.045);
 ctx.beginPath();ctx.moveTo(sx,sy);ctx.quadraticCurveTo(cx,cy,x,y);ctx.stroke();ctx.globalAlpha=fade*.8;ctx.strokeStyle='#fff4bd';ctx.lineWidth=Math.max(.7,r*.014);ctx.stroke();ctx.restore();
}
function mergeCore(ctx,event,age,r,quiet){
 if(age<.42||age>=.94)return;
 const pulse=age<DROP_MERGE_BURST_AT?smooth((age-.42)/.22):1-smooth(clamp((age-DROP_MERGE_BURST_AT)/.30));
 const spread=r*(.34+.44*pulse);ctx.save();ctx.globalAlpha=pulse*(quiet?.32:.86);
 const glow=ctx.createRadialGradient(event.x,event.y,0,event.x,event.y,spread);glow.addColorStop(0,'#fff9d8');glow.addColorStop(.18,'#fff0a9ef');glow.addColorStop(.48,'#ffd44780');glow.addColorStop(1,'#ffc42d00');ctx.fillStyle=glow;ctx.fillRect(event.x-spread,event.y-spread,spread*2,spread*2);ctx.restore();
}

const colorBursts=new WeakMap(),burstColors=['#61e7ff','#ff79cd','#b99aff'];
// Seed once per merge: random spray trajectories stay stable between frames.
export function createDropColorBurst(event,rng=Math.random){
 const r=radiusOf(Math.max(...event.pieces.map(p=>p.tile.r))),count=Math.min(24,12+event.pieces.length*3);
 return Array.from({length:count},(_,i)=>({color:burstColors[i%3],angle:rng()*Math.PI*2,
  speed:r*(2.6+rng()*3.2),size:Math.max(1.5,r*(.028+rng()*.027)),
  delay:rng()*.035,life:.39+rng()*.12,offset:r*rng()*.08}));
}
function drawColorBurst(ctx,event,age,r,quiet){
 if(age<DROP_MERGE_BURST_AT)return;
 let particles=colorBursts.get(event);if(!particles){particles=createDropColorBurst(event);colorBursts.set(event,particles);}
 ctx.save();ctx.lineCap='round';
 for(const p of particles.slice(0,quiet?6:24)){
  const elapsed=age-DROP_MERGE_BURST_AT-p.delay;if(elapsed<0||elapsed>=p.life)continue;
  const t=elapsed/p.life,travel=quiet?r*.24*t:p.speed*(1-Math.exp(-elapsed*3))/3;
  const x=event.x+Math.cos(p.angle)*(p.offset+travel),y=event.y+Math.sin(p.angle)*(p.offset+travel)+(quiet?0:r*elapsed*elapsed*.65);
  const size=p.size*(1-t*.65);ctx.globalAlpha=(1-t)**.85;ctx.fillStyle=p.color;ctx.shadowColor=p.color;ctx.shadowBlur=quiet?0:Math.min(12,r*.17);
  if(!quiet){ctx.strokeStyle=p.color;ctx.lineWidth=Math.max(.6,size*.48);const tail=r*.14*(1-t);ctx.beginPath();ctx.moveTo(x-Math.cos(p.angle)*tail,y-Math.sin(p.angle)*tail);ctx.lineTo(x,y);ctx.stroke();}
  ctx.beginPath();ctx.arc(x,y,size,0,Math.PI*2);ctx.fill();
 }
 ctx.restore();
}

export function drawDropMerge(ctx,event,age,drawPiece,{quiet=false}={}){
 if(age<0||age>=DROP_MERGE_DURATION||!event.pieces?.length)return;
 const largest=event.pieces.reduce((best,p)=>p.tile.r>best.tile.r?p:best,event.pieces[0]),stride=Math.max(1,Math.ceil(event.pieces.length/10));
 // One lightweight curve per contributing piece, capped for very large chains.
 if(!quiet&&age<.44)for(let index=0;index<event.pieces.length;index+=stride){const p=event.pieces[index];approachTrail(ctx,p,event,dropMergePose(age,p.tile.r),age,index);}
 for(const [index,p] of event.pieces.entries()){
  const r=radiusOf(p.tile.r),pose=dropMergePose(age,r,quiet),x=p.x+(event.x-p.x)*pose.travel,y=p.y+(event.y-p.y)*pose.travel;
  if(pose.scale>.01&&pose.alpha&&(age<.40||p===largest||quiet)){ctx.save();ctx.translate(x,y);ctx.rotate(p.angle*(1-pose.travel*.5));ctx.shadowColor='#ffd334';ctx.shadowBlur=pose.glow;drawPiece(ctx,p.tile,pose.scale,true);ctx.restore();}
  if(age>=DROP_MERGE_BURST_AT&&index%stride===0){
   const t=pose.burst;ctx.save();ctx.shadowColor='#ffd34e';ctx.shadowBlur=Math.min(22,Math.max(8,r*.18));ctx.lineCap='round';
   for(let k=0;k<(quiet?3:6);k++){
    const seed=(index*7+k*13)%17/17,a=k*Math.PI/3+index*.61+Math.sin(k*2.4+index)*.12,speed=.76+seed*.42,spread=pose.spread*speed;
    const px=event.x+Math.cos(a)*spread,py=event.y+Math.sin(a)*spread+t*t*r*(.20+seed*.15),size=Math.max(.1,pose.particleRadius*(.62+seed*.4));
    const twinkle=quiet?1:.72+.28*Math.sin((t*2.3+seed)*Math.PI)**2;ctx.globalAlpha=(1-t)**1.3*twinkle;ctx.fillStyle=k%3===0?'#fff7cd':k%3===1?'#ffd245':'#ffe888';
    if(!quiet){ctx.strokeStyle='#ffdc6b';ctx.lineWidth=Math.max(.65,r*.019)*(1-t);ctx.beginPath();ctx.moveTo(px-Math.cos(a)*r*.18*(1-t),py-Math.sin(a)*r*.18*(1-t));ctx.lineTo(px,py);ctx.stroke();}
    ctx.beginPath();ctx.arc(px,py,size,0,Math.PI*2);ctx.fill();
    if(!quiet&&k%3===0){const arm=size*(1.6+twinkle*.9);ctx.strokeStyle='#fff9dc';ctx.lineWidth=Math.max(.65,size*.28);ctx.beginPath();ctx.moveTo(px-arm,py);ctx.lineTo(px+arm,py);ctx.moveTo(px,py-arm);ctx.lineTo(px,py+arm);ctx.stroke();}
   }
   ctx.restore();
  }
 }
 mergeCore(ctx,event,age,radiusOf(largest.tile.r),quiet);
 drawColorBurst(ctx,event,age,radiusOf(largest.tile.r),quiet);
}
