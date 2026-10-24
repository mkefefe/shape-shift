// Sunset clouds move only inside open sky. Their mask remains fixed against the
// painted islands and plants; padded source pixels prevent a moving image edge.
const TAU=Math.PI*2;
const CLOUD_TOP=940,CLOUD_WIDTH=426,CLOUD_HEIGHT=304,CLOUD_PADDING=72;
const CLOUD_OUTLINE=[[0,0],[299,0],[324,54],[403,69],[403,116],[357,139],[291,135],[256,156],[204,176],[139,209],[68,251],[0,298]];
function canvas(width,height){const result=document.createElement('canvas');result.width=width;result.height=height;return result;}
function featheredSkyMask(){
 const result=canvas(CLOUD_WIDTH,CLOUD_HEIGHT),ctx=result.getContext('2d'),pixels=ctx.createImageData(CLOUD_WIDTH,CLOUD_HEIGHT);
 for(let y=0;y<CLOUD_HEIGHT;y++)for(let x=0;x<CLOUD_WIDTH;x++){
  let inside=false,distance=Infinity;
  for(let i=0,j=CLOUD_OUTLINE.length-1;i<CLOUD_OUTLINE.length;j=i++){
   const [ax,ay]=CLOUD_OUTLINE[j],[bx,by]=CLOUD_OUTLINE[i],dx=bx-ax,dy=by-ay;
   if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
   // The left edge is the edge of the picture, not a bank: keep it covered.
   if(ax===0&&bx===0)continue;
   const u=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy)));
   distance=Math.min(distance,Math.hypot(x-ax-u*dx,y-ay-u*dy));
  }
  const f=Math.min(1,distance/26),k=(y*CLOUD_WIDTH+x)*4;
  pixels.data[k]=pixels.data[k+1]=pixels.data[k+2]=255;pixels.data[k+3]=inside?Math.round(f*f*(3-2*f)*240):0;
 }
 ctx.putImageData(pixels,0,0);return result;
}
export function createCloudDrift(atlas){
 const output=canvas(CLOUD_WIDTH,CLOUD_HEIGHT),ctx=output.getContext('2d'),mask=featheredSkyMask();
 // Mirror a generous strip before the source's left edge. Every moving layer
 // now covers the whole mask at every phase, including crossfade boundaries.
 const texture=canvas(627+CLOUD_PADDING*2,1254),source=texture.getContext('2d');
 // The atlas seam contains a thin blue edge from the neighboring forest.
 // Extend clean sky pixels across it before mirroring, or that edge travels.
 source.drawImage(atlas,629,0,625,1254,CLOUD_PADDING+2,0,625,1254);
 source.drawImage(atlas,629,0,1,1254,CLOUD_PADDING,0,2,1254);
 source.save();source.translate(CLOUD_PADDING,0);source.scale(-1,1);
 source.drawImage(atlas,629,0,CLOUD_PADDING,1254,0,0,CLOUD_PADDING,1254);source.restore();
 source.save();source.translate(CLOUD_PADDING+1254,0);source.scale(-1,1);
 source.drawImage(atlas,1254-CLOUD_PADDING,0,CLOUD_PADDING,1254,627-CLOUD_PADDING,0,CLOUD_PADDING,1254);source.restore();
 return {canvas:output,top:CLOUD_TOP,paint(time){
  const phase=(time/18000)%1,second=(phase+.5)%1;
  ctx.clearRect(0,0,CLOUD_WIDTH,CLOUD_HEIGHT);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
  // Complementary weights keep cloud opacity steady. Each reset occurs at
  // zero contribution, so texture motion has neither a seam nor a loop jump.
  ctx.drawImage(texture,-CLOUD_PADDING+phase*48,-CLOUD_TOP);
  ctx.globalAlpha=Math.sin(second*Math.PI)**2;ctx.drawImage(texture,-CLOUD_PADDING+second*48,-CLOUD_TOP);
  ctx.globalAlpha=1;ctx.globalCompositeOperation='destination-in';ctx.drawImage(mask,0,0);ctx.globalCompositeOperation='source-over';
  return output;
 }};
}
function glow(ctx,x,y,r,color,alpha){
 const fill=ctx.createRadialGradient(x,y,0,x,y,r);fill.addColorStop(0,`rgba(${color},${alpha})`);fill.addColorStop(.22,`rgba(${color},${alpha*.48})`);fill.addColorStop(1,`rgba(${color},0)`);ctx.fillStyle=fill;ctx.fillRect(x-r,y-r,r*2,r*2);
}
const MOTES=[
 [73,248],[131,346],[562,265],[594,365],[59,555],[607,610],
 [68,986],[118,1030],[184,1004],[242,1053],[285,1017],[329,1049],
 [74,1131],[143,1104],[215,1090],[312,1111],[564,1037],[599,1116],[575,1213],
 [445,1180],[47,1193],[359,240]
];
export function paintSunsetAtmosphere(ctx,time,scale=1){
 glow(ctx,377,673,56,'255,244,176',.08+.04*Math.sin(time*.0007));
 for(let i=0;i<MOTES.length;i++){
  const [px,py]=MOTES[i],pulse=.5+.5*Math.sin(time*.0011+i*1.77);
  const x=px+Math.sin(time*.00024+i*2.2)*10,y=py+Math.cos(time*.00032+i*1.7)*9;
  const radius=Math.max(.8,.7/scale)*(1+(i%3)*.09),alpha=.42+pulse*.5;
  glow(ctx,x,y,Math.max(6,3.7/scale),'255,243,180',.16+pulse*.25);
  ctx.fillStyle=`rgba(255,253,221,${alpha})`;ctx.beginPath();ctx.arc(x,y,radius,0,TAU);ctx.fill();
  if(i%5===0){ctx.strokeStyle=`rgba(255,250,211,${pulse*pulse*.42})`;ctx.lineWidth=.65/scale;ctx.beginPath();ctx.moveTo(x-2.6/scale,y);ctx.lineTo(x+2.6/scale,y);ctx.moveTo(x,y-2.6/scale);ctx.lineTo(x,y+2.6/scale);ctx.stroke();}
 }
}
