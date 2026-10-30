export const DROP_MERGE_DURATION=1.45;
export const DROP_MERGE_BURST_AT=.58;
const clamp=n=>Math.max(0,Math.min(1,n)),smooth=n=>n*n*(3-2*n),radiusOf=n=>Math.max(8,Math.min(128,Number(n)||21));
const colors=['#ff4f69','#36caff','#65f078','#ffe367'];
const colorOf=p=>colors[p.tile.color]||'#a9eaff';
export function dropMergePose(age,radius,quiet=false){
 radius=radiusOf(radius);
 const travel=smooth(clamp((age-.09)/.43)),compression=smooth(clamp((age-.44)/.14));
 const burst=clamp((age-DROP_MERGE_BURST_AT)/(DROP_MERGE_DURATION-DROP_MERGE_BURST_AT));
 return {travel:quiet?0:travel,scale:(1+.10*Math.sin(clamp(age/.44)*Math.PI))*(1-compression),alpha:age<DROP_MERGE_BURST_AT?1:0,glow:radius*.25,burst,spread:radius*2.2*burst,particleRadius:Math.max(2.8,radius*.075)*(1-burst),visible:age>=0&&age<DROP_MERGE_DURATION};
}
// The contact draws both pieces along a shallow curved path. Their color and
// silhouette remain intact until the brief compression at the impact point.
function position(p,event,age,quiet){
 const pose=dropMergePose(age,p.tile.r,quiet),dx=event.x-p.x,dy=event.y-p.y,length=Math.hypot(dx,dy)||1;
 const arc=quiet?0:Math.sin(pose.travel*Math.PI)*Math.min(radiusOf(p.tile.r)*.24,length*.22);
 return {pose,x:p.x+dx*pose.travel-dy/length*arc,y:p.y+dy*pose.travel+dx/length*arc};
}
const bursts=new WeakMap();
export function createDropColorBurst(event,rng=Math.random){
 const r=radiusOf(Math.max(...event.pieces.map(p=>p.tile.r))),count=Math.min(36,20+event.pieces.length*2);
 return Array.from({length:count},(_,i)=>({color:i%5===0?'#f2ffff':colorOf(event.pieces[i%event.pieces.length]),angle:(i+rng()*.7)/count*Math.PI*2,
  speed:r*(3.7+rng()*2.8),size:Math.max(2.3,r*(.055+rng()*.045)),delay:rng()*.035,life:.62+rng()*.18,offset:r*rng()*.08}));
}
function drawBurst(ctx,event,age,r,quiet){
 const elapsed=age-DROP_MERGE_BURST_AT;if(elapsed<0)return;
 let particles=bursts.get(event);if(!particles){particles=createDropColorBurst(event);bursts.set(event,particles);}
 ctx.save();ctx.lineCap='round';
 for(const p of particles.slice(0,quiet?8:36)){
  const time=elapsed-p.delay;if(time<0||time>=p.life)continue;
  const t=time/p.life,distance=p.offset+p.speed*(1-Math.exp(-time*3.1))/3.1*(quiet?.25:1);
  const x=event.x+Math.cos(p.angle)*distance,y=event.y+Math.sin(p.angle)*distance+r*time*time*.42;
  const size=p.size*(1-t*.72);ctx.globalAlpha=Math.sin(Math.min(1,t*8)*Math.PI/2)*(1-t)**.85;
  ctx.fillStyle=p.color;ctx.strokeStyle=p.color;ctx.shadowColor=p.color;ctx.shadowBlur=8;
  ctx.lineWidth=Math.max(.8,size*.6);ctx.beginPath();ctx.moveTo(x-Math.cos(p.angle)*size*2.5,y-Math.sin(p.angle)*size*2.5);ctx.lineTo(x,y);ctx.stroke();
  ctx.beginPath();ctx.arc(x,y,size,0,Math.PI*2);ctx.fill();
 }
 // Two soft, expanding color rings replace the old solid gold flash.
 const t=clamp(elapsed/.5);
 if(t<1){for(let i=0;i<2;i++){ctx.globalAlpha=(1-t)**2*.65;ctx.shadowBlur=10;ctx.strokeStyle=colorOf(event.pieces[i%event.pieces.length]);ctx.shadowColor=ctx.strokeStyle;ctx.lineWidth=2.5*(1-t)+.5;ctx.beginPath();ctx.arc(event.x,event.y,r*(.25+(1-(1-t)**3)*(1.25+i*.3)),0,Math.PI*2);ctx.stroke();}}
 ctx.restore();
}
export function drawDropMerge(ctx,event,age,drawPiece,{quiet=false}={}){
 if(age<0||age>=DROP_MERGE_DURATION||!event.pieces?.length)return;
 const r=radiusOf(Math.max(...event.pieces.map(p=>p.tile.r)));
 // Light stays local to each moving piece; no stationary connecting lines.
 if(age<DROP_MERGE_BURST_AT){for(const p of event.pieces){const {pose,x,y}=position(p,event,age,quiet);if(pose.scale<=.01)continue;
  ctx.save();ctx.translate(x,y);ctx.rotate(p.angle*(1-pose.travel));ctx.shadowColor=colorOf(p);ctx.shadowBlur=pose.glow;drawPiece(ctx,p.tile,pose.scale,false);ctx.restore();
 }}
 const impact=clamp(1-Math.abs(age-DROP_MERGE_BURST_AT)/.15);
 if(impact>0){const size=r*(.18+.38*impact);ctx.save();ctx.globalAlpha=impact*.75;const glow=ctx.createRadialGradient(event.x,event.y,0,event.x,event.y,size);glow.addColorStop(0,'#ffffff');glow.addColorStop(.28,'#eaffffc0');glow.addColorStop(1,'#eaffff00');ctx.fillStyle=glow;ctx.fillRect(event.x-size,event.y-size,size*2,size*2);ctx.restore();}
 drawBurst(ctx,event,age,r,quiet);
}
