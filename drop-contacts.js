// A sub-pixel contact tolerance bridges solver slop without clearing nearby pieces.
export const DROP_CONTACT_TOLERANCE=.8;
// Matching gets a small visual allowance, especially for large rounded artwork.
// Keep physical support checks on the stricter tolerance above.
export const dropMatchTolerance=(a,b)=>Math.max(DROP_CONTACT_TOLERANCE,Math.min(4,Math.min(a.drop.r,b.drop.r)*.06));
const nearBounds=(a,b,t)=>a.min.x<=b.max.x+t&&a.max.x+t>=b.min.x&&a.min.y<=b.max.y+t&&a.max.y+t>=b.min.y;
function pointEdgeSquared(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return (p.x-a.x-t*dx)**2+(p.y-a.y-t*dy)**2;}
export function dropBodiesTouch(M,a,b,tolerance=DROP_CONTACT_TOLERANCE){
 if(!nearBounds(a.bounds,b.bounds,tolerance))return false;
 const parts=body=>body.parts.length>1?body.parts.slice(1):[body];
 for(const pa of parts(a))for(const pb of parts(b)){
  if(!nearBounds(pa.bounds,pb.bounds,tolerance))continue;
  if(M.Collision.collides(pa,pb))return true;
  const av=pa.vertices,bv=pb.vertices,limit=tolerance*tolerance;
  for(let i=0;i<av.length;i++)for(let j=0;j<bv.length;j++)if(pointEdgeSquared(av[i],bv[j],bv[(j+1)%bv.length])<=limit||pointEdgeSquared(bv[j],av[i],av[(i+1)%av.length])<=limit)return true;
 }
 return false;
}
