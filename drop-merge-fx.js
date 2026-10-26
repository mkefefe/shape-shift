export const DROP_MERGE_DURATION=1.2;
const clamp=n=>Math.max(0,Math.min(1,n)),smooth=n=>n*n*(3-2*n);
// First illuminate complete pieces, then converge while still substantial.
// Only after they meet do they compress into the shared particle burst.
export function dropMergePose(age,radius,quiet=false){
 const travel=smooth(clamp((age-.14)/.26)),shrink=smooth(clamp((age-.52)/.18)),burst=clamp((age-.64)/.56);
 return {travel:quiet?0:travel,scale:1-shrink,alpha:age<.70?1:0,glow:Math.max(10,radius*.42),burst,spread:(quiet?.35:1.65)*radius*(1-(1-burst)**2),particleRadius:Math.max(2.2,radius*.055)*(1-burst),visible:age>=0&&age<DROP_MERGE_DURATION};
}
export function drawDropMerge(ctx,event,age,drawPiece,{quiet=false}={}){
 if(age<0||age>=DROP_MERGE_DURATION)return;
 const largest=event.pieces.reduce((best,p)=>p.tile.r>best.tile.r?p:best,event.pieces[0]);
 for(const [index,p] of event.pieces.entries()){
  const pose=dropMergePose(age,p.tile.r,quiet),x=p.x+(event.x-p.x)*pose.travel,y=p.y+(event.y-p.y)*pose.travel;
  if(pose.scale>.01&&pose.alpha&&(age<.40||p===largest||quiet)){ctx.save();ctx.translate(x,y);ctx.rotate(p.angle*(1-pose.travel*.5));ctx.shadowColor='#ffd334';ctx.shadowBlur=pose.glow;drawPiece(ctx,p.tile,pose.scale,true);ctx.restore();}
  if(age>=.64){
   const t=pose.burst,spread=pose.spread;ctx.save();ctx.globalAlpha=(1-t)**1.3;ctx.shadowColor='#ffc32a';ctx.shadowBlur=Math.max(8,p.tile.r*.18);
   for(let k=0;k<(quiet?3:6);k++){const a=k*Math.PI/3+index*.47,px=event.x+Math.cos(a)*spread,py=event.y+Math.sin(a)*spread+t*t*p.tile.r*.3;ctx.fillStyle=k%2?'#fff5bd':'#ffd245';ctx.beginPath();ctx.arc(px,py,Math.max(.1,pose.particleRadius),0,Math.PI*2);ctx.fill();if(!quiet){ctx.strokeStyle='#ffe27c';ctx.lineWidth=Math.max(1,p.tile.r*.025)*(1-t);ctx.beginPath();ctx.moveTo(px-Math.cos(a)*p.tile.r*.2*(1-t),py-Math.sin(a)*p.tile.r*.2*(1-t));ctx.lineTo(px,py);ctx.stroke();}}
   ctx.restore();
  }
 }
 if(age>=.52&&age<.85){const t=(age-.52)/.33,r=Math.max(...event.pieces.map(p=>p.tile.r));ctx.save();ctx.globalAlpha=(1-t)*.65;const glow=ctx.createRadialGradient(event.x,event.y,0,event.x,event.y,r*.8);glow.addColorStop(0,'#fff8cb');glow.addColorStop(.25,'#ffd44799');glow.addColorStop(1,'#ffc42d00');ctx.fillStyle=glow;ctx.fillRect(event.x-r,event.y-r,r*2,r*2);ctx.restore();}
}
