import {SLICE_DEFAULT_BOUNDS} from './slice-viewport.js?v=49439-web4';
import {sliceOutline} from './shape-slice-engine.js?v=49439-web4';
export const MAX_FRAGMENT_DEPTH=4,FRAGMENT_RECUT_DELAY=.06;
export function polygonArea(poly){return Math.abs(poly.reduce((sum,p,i)=>{const q=poly[(i+1)%poly.length];return sum+p.x*q.y-q.x*p.y;},0))/2;}
export function shapeMask(shape,r){return shape===0?Array.from({length:40},(_,i)=>({x:Math.cos(i*Math.PI/20)*r,y:Math.sin(i*Math.PI/20)*r})):sliceOutline(shape,r);}
export function artworkBox(shape,r){const points=shapeMask(shape,r),xs=points.map(p=>p.x),ys=points.map(p=>p.y);return {width:Math.max(...xs)-Math.min(...xs),y:(Math.max(...ys)+Math.min(...ys))/2};}
const cross=(a,b,p)=>(b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x);
function clip(poly,a,b,side){const out=[];for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length],u=cross(a,b,p)*side,v=cross(a,b,q)*side;if(u>=0)out.push(p);if((u<0)!==(v<0)){const t=u/(u-v);out.push({x:p.x+(q.x-p.x)*t,y:p.y+(q.y-p.y)*t});}}return out;}
function inside(poly,p){let hit=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)hit=!hit;}return hit;}
function segmentHits(poly,a,b){return inside(poly,a)||inside(poly,b)||poly.some((p,i)=>{const q=poly[(i+1)%poly.length];return cross(a,b,p)*cross(a,b,q)<=0&&cross(p,q,a)*cross(p,q,b)<=0&&Math.max(Math.min(a.x,b.x),Math.min(p.x,q.x))<=Math.min(Math.max(a.x,b.x),Math.max(p.x,q.x))&&Math.max(Math.min(a.y,b.y),Math.min(p.y,q.y))<=Math.min(Math.max(a.y,b.y),Math.max(p.y,q.y));});}
// Fragments are visual bodies only: this module never changes a run's score or rewards.
export function splitFragment(f,from,to,stroke){
 if(f.depth>=MAX_FRAGMENT_DEPTH||(f.lastStroke===stroke&&f.age-(f.lastCutAge??0)<FRAGMENT_RECUT_DELAY)||![from.x,from.y,to.x,to.y].every(Number.isFinite)||Math.hypot(to.x-from.x,to.y-from.y)<2)return null;
 const c=Math.cos(f.angle),s=Math.sin(f.angle),local=p=>({x:(p.x-f.x)*c+(p.y-f.y)*s,y:-(p.x-f.x)*s+(p.y-f.y)*c}),a=local(from),b=local(to);
 if(!segmentHits(f.mask,a,b))return null;
 const halves=[clip(f.mask,a,b,-1),clip(f.mask,a,b,1)];if(halves.some(poly=>poly.length<3||polygonArea(poly)<12))return null;
 const angle=Math.atan2(to.y-from.y,to.x-from.x),nx=-Math.sin(angle),ny=Math.cos(angle);
 return halves.map((mask,i)=>{const side=i?1:-1,center=mask.reduce((p,q)=>({x:p.x+q.x/mask.length,y:p.y+q.y/mask.length}),{x:0,y:0});return {...f,x:f.x+center.x*c-center.y*s,y:f.y+center.x*s+center.y*c,mask:mask.map(p=>({x:p.x-center.x,y:p.y-center.y})),artX:f.artX-center.x,artY:f.artY-center.y,vx:f.vx+nx*side*85,vy:(f.depth?f.vy:f.vy*.2)+ny*side*85-35,spin:f.spin+side*1.3,depth:f.depth+1,lastStroke:stroke,lastCutAge:f.age};});
}
export function cutShape(piece,from,to,stroke){const f={...piece,mask:shapeMask(piece.shape,piece.r),artX:0,artY:0,depth:0,age:0,lastStroke:-1};return splitFragment(f,from,to,stroke)||[];}
export function fragmentOnScreen(f,bounds=SLICE_DEFAULT_BOUNDS,margin=24){
 const c=Math.cos(f.angle),s=Math.sin(f.angle),points=f.mask.map(p=>({x:f.x+p.x*c-p.y*s,y:f.y+p.x*s+p.y*c}));
 return Math.max(...points.map(p=>p.x))>=bounds.left-margin&&Math.min(...points.map(p=>p.x))<=bounds.right+margin&&Math.min(...points.map(p=>p.y))<=bounds.bottom+margin;
}
export function stepFragments(fragments,dt,bounds=SLICE_DEFAULT_BOUNDS){for(const f of fragments){f.age+=dt;f.vy+=480*dt;f.x+=f.vx*dt;f.y+=f.vy*dt;f.angle+=f.spin*dt;}return fragments.filter(f=>fragmentOnScreen(f,bounds));}
