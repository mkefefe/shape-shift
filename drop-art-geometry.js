// Collision data is extracted once when an atlas is prepared, never while painting.
// The picture remains intact; only the invisible body follows its opaque edge.
const cross=(a,b,c)=>(b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x);
const area=points=>points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p.x*q.y-q.x*p.y;},0)/2;
export function polygonCenter(points){
 let x=0,y=0,sum=0;for(let i=0;i<points.length;i++){const p=points[i],q=points[(i+1)%points.length],a=p.x*q.y-q.x*p.y;sum+=a;x+=(p.x+q.x)*a;y+=(p.y+q.y)*a;}
 return Math.abs(sum)<1e-8?{x:0,y:0}:{x:x/(3*sum),y:y/(3*sum)};
}
function hull(points){
 const sorted=[...points].sort((a,b)=>a.x-b.x||a.y-b.y),half=[];
 for(const p of sorted){while(half.length>1&&cross(half.at(-2),half.at(-1),p)<=0)half.pop();half.push(p);}const lower=half.splice(0);
 for(const p of sorted.reverse()){while(half.length>1&&cross(half.at(-2),half.at(-1),p)<=0)half.pop();half.push(p);}return [...lower.slice(0,-1),...half.slice(0,-1)];
}
// Every shipped shape is star-convex. Merge neighboring fan sectors into convex
// parts, retaining a star's five open notches instead of using a convex hull.
export function convexDropParts(points){
 const convex=hull(points);if(Math.abs(area(convex))<=Math.abs(area(points))*1.012)return [convex];
 const parts=points.map((p,i)=>[{x:0,y:0},p,points[(i+1)%points.length]]);
 for(let i=0;i<parts.length-1;){const joined=[...parts[i].slice(0,-1),...parts[i+1].slice(1)],ok=Math.abs(area(hull(joined)))-Math.abs(area(joined))<.003;if(ok){parts.splice(i,2,joined);}else i++;}
 return parts.map(hull);
}
export function dropArtworkGeometry(data,width,height,shape,aspect=width/height){
 const nominal=shape===0?2:shape===2?1.65:shape===1?1.23*Math.sqrt(3):1.23*Math.sin(Math.PI*2/5)*2;
 const cx=(width-1)/2,cy=(height-1)/2,opaque=(x,y)=>{x=Math.round(x);y=Math.round(y);return x>=0&&x<width&&y>=0&&y<height&&data[(y*width+x)*4+3]>=176;};
 const points=[];
 for(let i=0;i<160;i++){
  const a=-Math.PI/2+i*Math.PI*2/160,dx=Math.cos(a),dy=Math.sin(a);let edge=0,run=0;
  for(let d=0;d<Math.hypot(width,height)/2;d+=.5){if(opaque(cx+dx*d,cy+dy*d)){if(++run>=3)edge=d;}else run=0;}
  points.push({x:(cx+dx*(edge+.3)+.5-width/2)/width*nominal,y:(cy+dy*(edge+.3)+.5-height/2)/height*nominal/aspect});
 }
 // Remove pixel-scale staircase detail while retaining the illustrated corners.
 let changed=true;while(changed&&points.length>12){changed=false;for(let i=0;i<points.length&&points.length>12;i++){const a=points[(i+points.length-1)%points.length],p=points[i],b=points[(i+1)%points.length],dx=b.x-a.x,dy=b.y-a.y,dist=Math.abs(dx*(a.y-p.y)-(a.x-p.x)*dy)/Math.hypot(dx,dy);if(dist<.008){points.splice(i,1);changed=true;i--;}}}
 if(Math.abs(area(points))<nominal*nominal*.08){
  points.length=0;const count=shape===0?32:shape===1?3:shape===2?4:10;
  for(let i=0;i<count;i++){const a=-Math.PI/2+i*Math.PI*2/count,inner=shape===3&&i%2?.5:1;points.push({x:Math.cos(a)*nominal*.47*inner,y:Math.sin(a)*nominal/aspect*.47*inner});}
 }
 const parts=convexDropParts(points),mass=parts.reduce((sum,p)=>sum+Math.abs(area(p)),0);
 const center=parts.reduce((sum,p)=>{const c=polygonCenter(p),weight=Math.abs(area(p))/mass;return {x:sum.x+c.x*weight,y:sum.y+c.y*weight};},{x:0,y:0});
 return {aspect,width:nominal,center,points:points.map(p=>({x:p.x-center.x,y:p.y-center.y})),parts:parts.map(part=>part.map(p=>({x:p.x-center.x,y:p.y-center.y})))};
}
