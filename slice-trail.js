export const SLICE_TRAIL_LIFETIME=.24,SLICE_TRAIL_WIDTH=7;
const palette=['#4cdeff','#b995ff','#ff88c7','#ffe077','#85ff9f'];
export const SLICE_COLOR_PERIOD=3,SLICE_COLOR_BLEND=.8;
// Only new samples receive the current colour. Stored points never get recoloured.
export function sliceTrailColor(seconds){
 const time=Math.max(0,Number.isFinite(seconds)?seconds:0),index=Math.floor(time/SLICE_COLOR_PERIOD),phase=time%SLICE_COLOR_PERIOD;
 const a=palette[index%palette.length],b=palette[(index+1)%palette.length];
 let t=Math.max(0,(phase-(SLICE_COLOR_PERIOD-SLICE_COLOR_BLEND))/SLICE_COLOR_BLEND);t=t*t*(3-2*t);
 return '#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-t)+parseInt(b.slice(i,i+2),16)*t).toString(16).padStart(2,'0')).join('');
}
export function slicePointerPoint(event,rect,transform){return {x:(event.clientX-rect.left-transform.x)/transform.scale,y:(event.clientY-rect.top-transform.y)/transform.scale};}
export function visibleSliceStrokes(points,now){
 const groups=[];let group;
 for(const p of points){if(now-p.time>=SLICE_TRAIL_LIFETIME)continue;
  if(!group||group.stroke!==p.stroke){group={stroke:p.stroke,color:p.color,points:[]};groups.push(group);}
  const last=group.points.at(-1);if(!last||Math.hypot(p.x-last.x,p.y-last.y)>=.4)group.points.push(p);
 }
 return groups;
}
const mix=(a,b,t)=>'#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-t)+parseInt(b.slice(i,i+2),16)*t).toString(16).padStart(2,'0')).join('');
// Smooth the centreline and its sampled colours together; curved swipes keep
// their colour progression even when the head returns beside an older section.
export function sliceRibbon(points){
 if(points.length<2)return points;
 const out=[points[0]];let start=points[0];
 for(let i=1;i<points.length;i++){
  const control=points[i],next=points[i+1],end=next?{x:(control.x+next.x)/2,y:(control.y+next.y)/2,color:mix(control.color,next.color,.5)}:control;
  const steps=Math.max(1,Math.ceil((Math.hypot(control.x-start.x,control.y-start.y)+Math.hypot(end.x-control.x,end.y-control.y))/5));
  for(let n=1;n<=steps;n++){const t=n/steps,u=1-t;out.push({x:u*u*start.x+2*u*t*control.x+t*t*end.x,y:u*u*start.y+2*u*t*control.y+t*t*end.y,color:mix(mix(start.color,control.color,t),mix(control.color,end.color,t),t)});}
  start=end;
 }
 return out;
}
export function drawSliceTrail(ctx,points,now,quiet=false){
 ctx.save();ctx.lineJoin='round';ctx.lineCap='round';
 for(const group of visibleSliceStrokes(points,now)){
  const list=sliceRibbon(group.points);if(!list.length)continue;
  if(list.length===1)list.push({...list[0],x:list[0].x+4,y:list[0].y-4});
  const first=list[0],last=list.at(-1),radius=(quiet?5:SLICE_TRAIL_WIDTH)/2;
  ctx.globalAlpha=Math.max(0,1-(now-group.points.at(-1).time)/SLICE_TRAIL_LIFETIME);
  const path=()=>{ctx.beginPath();ctx.moveTo(first.x,first.y);for(let i=1;i<list.length;i++)ctx.lineTo(list[i].x,list[i].y);};
  path();ctx.strokeStyle='#b8e9ff';ctx.shadowColor='#b8e9ff';ctx.shadowBlur=quiet?0:10;ctx.lineWidth=radius*2;ctx.stroke();ctx.shadowBlur=0;
  const edges=list.map((p,i)=>{const prev=list[Math.max(0,i-1)],next=list[Math.min(list.length-1,i+1)],dx=next.x-prev.x,dy=next.y-prev.y,len=Math.hypot(dx,dy)||1;return {x:-dy/len*radius,y:dx/len*radius};});
  for(let i=1;i<list.length;i++){
   const a=list[i-1],b=list[i],u=edges[i-1],v=edges[i],gradient=ctx.createLinearGradient(a.x,a.y,b.x,b.y);
   gradient.addColorStop(0,a.color);gradient.addColorStop(1,b.color);ctx.fillStyle=gradient;
   ctx.beginPath();ctx.moveTo(a.x+u.x,a.y+u.y);ctx.lineTo(b.x+v.x,b.y+v.y);ctx.lineTo(b.x-v.x,b.y-v.y);ctx.lineTo(a.x-u.x,a.y-u.y);ctx.closePath();ctx.fill();
  }
  // Only the two ends are round, not every sample along the slash.
  for(const p of [first,last]){ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,radius,0,Math.PI*2);ctx.fill();}
  path();ctx.strokeStyle='#f3ffff';ctx.lineWidth=2;ctx.stroke();
 }
 ctx.restore();
}
