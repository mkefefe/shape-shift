const clampRandom=rng=>Math.max(0,Math.min(.999999,Number(rng())||0));
export const DROP_SIZE_SCALES=Object.freeze([1,1.25,1.5,2]);
export const DROP_MAX_RADIUS=80;
export function dropPieceRadius(index,variation){
 const base=25+Math.min(15,Math.floor(Math.max(0,index)/8)*2.5);
 return base*DROP_SIZE_SCALES[variation%DROP_SIZE_SCALES.length];
}
function weightedChoice(items,weight,rng){
 let pick=clampRandom(rng)*items.reduce((sum,item)=>sum+weight(item),0);
 return items.find(item=>(pick-=weight(item))<0)??items.at(-1);
}
// Keep the opening intact, then continue increasing pressure using either
// persistence or scoring. There is no final bomb-rate floor or cooldown cap.
// Pieces remain physically bounded; this does not force a loss at any score.
export function dropDifficulty(drops=0,score=0){
 const progress=Math.min(Number.MAX_SAFE_INTEGER,Math.max(0,Number(drops)||0,2*(Number(score)||0))),late=Math.max(0,progress-100);
 return {
  progress,
  surfaceStrength:.6+7.4*progress/(progress+120)+2.5*Math.log1p(late/120),
  uniformShare:.3/(1+late/220),
  bombChance:(.026-.006*progress/(progress+160))/(1+late/120),
  bombGap:16+Math.floor(late/3)
 };
}
const tileOf=piece=>piece.drop||piece;
const isLive=piece=>tileOf(piece).clearAt==null;
const isMatchable=tile=>!tile.obstacle&&!tile.bomb&&Number.isInteger(tile.shape)&&tile.shape>=0&&tile.shape<4&&Number.isInteger(tile.color)&&tile.color>=0&&tile.color<4;
function outlinesOf(piece){
 if(piece.vertices?.length)return (piece.parts?.length>1?piece.parts.slice(1):[piece]).map(part=>part.vertices);
 const b=piece.bounds;
 return b?[ [{x:b.min.x,y:b.min.y},{x:b.max.x,y:b.min.y},{x:b.max.x,y:b.max.y},{x:b.min.x,y:b.max.y}] ]:[];
}
function topAt(outlines,x){
 let top=Infinity;
 for(const vertices of outlines)for(let i=0;i<vertices.length;i++){
  const a=vertices[i],b=vertices[(i+1)%vertices.length];
  if(x<Math.min(a.x,b.x)||x>Math.max(a.x,b.x))continue;
  const y=a.x===b.x?Math.min(a.y,b.y):a.y+(x-a.x)/(b.x-a.x)*(b.y-a.y);
  top=Math.min(top,y);
 }
 return top;
}
// Sample the actual upper silhouette. Buried pieces do not dilute the exposed
// matches; blocks hide what is beneath them without lending a decorative color.
// Compound parts preserve the open notches of stars and rotated triangles.
export function dropSurface(pieces=[]){
 const live=pieces.filter(isLive),geometry=live.map(piece=>({tile:tileOf(piece),outlines:outlinesOf(piece),hits:0}));
 if(!geometry.some(entry=>entry.outlines.length))return live.map(piece=>({tile:tileOf(piece),exposure:1/live.length}));
 let occupied=0;
 for(let x=2;x<320;x+=4){
  let top=Infinity,winner=null;
  for(const entry of geometry){const y=topAt(entry.outlines,x);if(y<top){top=y;winner=entry;}}
  if(winner){winner.hits++;occupied++;}
 }
 return geometry.filter(entry=>entry.hits).map(entry=>({tile:entry.tile,exposure:entry.hits/occupied}));
}
// Both surface discrimination and the uniform share keep changing in long runs.
// Every combination remains possible, even as easy recovery draws get rarer.
export function dropBoardWeights(pieces=[],turn=0,pending=[],score=0){
 let surface=dropSurface(pieces).filter(entry=>isMatchable(entry.tile));
 const departing=pending.map(tileOf).filter(isMatchable);
 // The released tile may survive on top. Reserve half the forecast for it,
 // without using the aim position or pretending its airborne spawn is a lid.
 if(departing.length){const share=surface.length?.5:1;surface=[...surface.map(entry=>({...entry,exposure:entry.exposure*(1-share)})),...departing.map(tile=>({tile,exposure:share/departing.length}))];}
 const difficulty=dropDifficulty(turn,score);
 const choices=Array.from({length:16},(_,i)=>{
  const shape=i%4,color=Math.floor(i/4),coverage=surface.reduce((sum,{tile,exposure})=>sum+((tile.shape===shape||tile.color===color)?exposure:0),0);
  return {shape,color,coverage};
 });
 // Subtract the minimum coverage before exponentiation so very long
 // runs never underflow all the candidates and silently fall back to one tile.
 const least=Math.min(...choices.map(p=>p.coverage));
 const weighted=choices.map(({shape,color,coverage})=>({shape,color,weight:Math.exp(-difficulty.surfaceStrength*(coverage-least))}));
 const mean=weighted.reduce((sum,p)=>sum+p.weight,0)/16;
 return weighted.map(p=>({...p,weight:difficulty.uniformShare+(1-difficulty.uniformShare)*p.weight/mean}));
}
// Blocks keep arriving even with existing obstacles. Bombs remain rare.
export function createDropSequence(rng=Math.random){
 let index=0,lastBomb=-Infinity,nextBlock=16,lastSpecial=-100,lastSizes=[],previous=null;
 return (pieces=[],turn=index,pending=[],score=0)=>{
  const at=index++,difficulty=dropDifficulty(Math.max(at,Number(turn)||0),score),{progress}=difficulty,ramp=progress/(progress+160);
  if(at>=16&&at-lastSpecial>=5){
   if(at>=nextBlock){
    const minGap=progress>=300?6:progress>=100?8:12;
    nextBlock=at+minGap+Math.floor(clampRandom(rng)*5);
    lastSpecial=at;return {obstacle:true,shape:2,color:0,r:36+14*ramp,angle:0};
   }
   const bombChance=at-lastBomb>=difficulty.bombGap?difficulty.bombChance:0;
   const roll=clampRandom(rng);
   if(roll<bombChance){lastBomb=lastSpecial=at;return {bomb:true,shape:0,color:0,r:24,angle:0};}
  }
  // Retain the original anti-repeat weighting: otherwise the replacement can
  // freely match the piece just released, bypassing the placement puzzle.
  // Neither attribute is excluded; even an identical tile stays possible.
  const tile=weightedChoice(dropBoardWeights(pieces,progress,pending),p=>p.weight*(p.shape===previous?.shape?.15:1)*(p.color===previous?.color?.15:1),rng);
  previous=tile;
  // Keep the pieces substantial: no half-size fillers. Later draws also retire
  // the smallest regular classes. Large pieces gradually become more common,
  // but a third consecutive 2x draw is always replaced by a smaller class.
  const largeChance=.3+.5*Math.min(1,Math.max(0,at-24)/76);
  const weights=at<8?[.6,.4,0,0]:at<24?[.25,.5,.25,0]:at<100?[0,.12,.88-largeChance,largeChance]:[0,0,.2,.8];
  if(lastSizes.length===2&&lastSizes.every(size=>size===3))weights[3]=0;
  const size=weightedChoice([0,1,2,3],i=>weights[i],rng);
  lastSizes=[...lastSizes.slice(-1),size];
  return {shape:tile.shape,color:tile.color,angle:0,sizeScale:DROP_SIZE_SCALES[size],r:dropPieceRadius(at,size)};
 };
}
