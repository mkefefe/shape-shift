// Water is lit in place. Never scroll strips of the landscape: they contain
// plants and cliffs as well as water, and wrapping them makes the banks move.
const TAU=Math.PI*2;
const scenes={
 garden:{width:941,height:1672,falls:[
  [65,530,79,652,17,21],[105,685,134,872,27,36],
  [65,852,82,1007,25,30],[174,927,203,1207,34,49],
  [345,1107,355,1171,16,21],[169,1264,200,1329,23,28],
  [468,1176,482,1208,12,18]
 ],pools:[
  [[240,1270],[406,1265],[522,1239],[647,1218],[644,1250],[569,1281],[529,1310],[426,1345],[363,1344],[356,1327],[402,1310],[291,1295]],
  [[8,1366],[152,1361],[252,1354],[365,1344],[442,1332],[399,1383],[367,1418],[380,1445],[416,1474],[465,1503],[523,1535],[457,1531],[342,1498],[257,1467],[193,1452],[139,1457],[101,1430],[63,1419],[23,1391]]
 ]},
 moon:{width:627,height:1254,falls:[
  [300,775,306,877,12,16],[331,774,337,885,17,20],
  [364,775,368,888,17,21],[391,777,393,876,13,17],
  [351,958,362,1019,17,22],[383,962,390,1022,22,25],
  [417,961,417,1019,15,20],[449,958,446,998,12,15]
 ],pools:[[[333,1048],[506,1048],[565,1065],[609,1076],[620,1105],[600,1142],[574,1149],[559,1176],[491,1170],[454,1141],[431,1122],[380,1116],[335,1126]]]},
 sunset:{width:627,height:1254,falls:[
  [560,612,558,744,22,27],[103,731,102,827,15,18],
  [208,836,207,908,10,14],[422,920,421,977,13,18]
 ],pools:[]}
};

export function backgroundTransform(world,width,height){
 const scene=scenes[world]||scenes.garden;
 const scale=Math.max(width/scene.width,height/scene.height);
 const x=world==='moon'?0:world==='sunset'?width-scene.width*scale:(width-scene.width*scale)/2;
 return {scale,x,y:(height-scene.height*scale)/2};
}
function polygon(ctx,points){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();}
function glow(ctx,x,y,r,color,alpha){
 const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(${color},${alpha})`);g.addColorStop(.25,`rgba(${color},${alpha*.45})`);g.addColorStop(1,`rgba(${color},0)`);ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
}
// Contrast as well as light makes white water read as moving on a small screen.
function waterfall(ctx,fall,time,index,warm,scale){
 const [x0,y0,x1,y1,w0,w1]=fall,h=y1-y0;
 ctx.save();polygon(ctx,[[x0-w0/2,y0],[x0+w0/2,y0],[x1+w1/2,y1],[x1-w1/2,y1]]);ctx.clip();
 for(let i=0;i<12;i++){
  const phase=(time*(.00046+i%3*.00004)+i*.193+index*.27)%1;
  const length=Math.min(54,h*.42),y=y0+phase*(h+length)-length;
  const v=Math.max(0,Math.min(1,(y-y0)/h)),spread=(i+.5)/12-.5;
  const x=x0+(x1-x0)*v+spread*(w0+(w1-w0)*v)*.78,dx=(x1-x0)*length/h;
  const taper=Math.min(1,phase*8,(1-phase)*8);
  for(const shade of [true,false]){
   const rgb=shade?(warm?'142,101,146':'0,130,180'):(warm?'255,250,226':'243,255,255');
   const alpha=(shade?.25:.72)*taper,g=ctx.createLinearGradient(x,y,x+dx,y+length);
   g.addColorStop(0,`rgba(${rgb},0)`);g.addColorStop(.42,`rgba(${rgb},${alpha})`);g.addColorStop(1,`rgba(${rgb},0)`);
   ctx.strokeStyle=g;ctx.lineWidth=shade?Math.max(3.4,1.7/scale):Math.max(1.6,.95/scale);ctx.lineCap='round';
   const offset=shade?1.5:0;ctx.beginPath();ctx.moveTo(x+offset,y);ctx.quadraticCurveTo(x+dx*.35+offset+Math.sin(i+time*.001)*.9,y+length*.55,x+dx+offset,y+length);ctx.stroke();
  }
 }
 ctx.restore();
 // Droplets stay close to the painted splash, rather than lifting the banks.
 for(let i=0;i<5;i++){
  const phase=(time*.0006+i*.2+index*.13)%1;
  const sx=x1+Math.sin(i*4.7)*w1*.38*phase,sy=y1+2-Math.sin(phase*Math.PI)*w1*.2;
  glow(ctx,sx,sy,w1*.24,'227,253,255',Math.sin(phase*Math.PI)*.23);
 }
}
function pool(ctx,points,time,index,scale,moon){
 ctx.save();polygon(ctx,points);ctx.clip();
 const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
 const left=Math.min(...xs),top=Math.min(...ys),width=Math.max(...xs)-left,height=Math.max(...ys)-top;
 // Long, low ripples travel with the current, with soft blue troughs below.
 for(let i=0;i<34;i++){
  const phase=(time*.00015+i*.137+index*.19)%1;
  const x=left+((i*.618)%1)*width+Math.sin(phase*Math.PI)*(-18),y=top+phase*height;
  const alpha=Math.sin(phase*Math.PI)*(.3+.22*(.5+.5*Math.sin(time*.0015+i)));
  const radius=7+i%8*2.1;
  ctx.strokeStyle=`rgba(${moon?'22,82,158':'0,116,153'},${alpha*.58})`;ctx.lineWidth=Math.max(3,1.5/scale);
  ctx.beginPath();ctx.ellipse(x,y+2,radius,1.8,0,.05,Math.PI-.05);ctx.stroke();
  ctx.strokeStyle=`rgba(230,255,255,${alpha})`;ctx.lineWidth=Math.max(1.6,.95/scale);
  ctx.beginPath();ctx.ellipse(x,y,radius,1.8,0,.05,Math.PI-.05);ctx.stroke();
 }
 // Expanding foam rings at the real entry points keep the flow legible.
 const centers=moon?[[385,1056],[555,1081]]:index===0?[[266,1285],[494,1267]]:[[233,1369],[345,1424]];
 for(const [j,[cx,cy]] of centers.entries())for(let i=0;i<3;i++){
  const phase=(time*.00027+i/3+j*.21)%1,radius=8+phase*50;
  ctx.strokeStyle=`rgba(235,255,255,${Math.sin(phase*Math.PI)*(moon?.4:.5)})`;ctx.lineWidth=Math.max(1.6,1/scale);
  ctx.beginPath();ctx.ellipse(cx,cy+phase*9,radius,radius*.17,0,.12,Math.PI*.87);ctx.stroke();
  ctx.globalAlpha=.55;ctx.beginPath();ctx.ellipse(cx+2,cy+phase*9,radius*.92,radius*.15,0,Math.PI*1.13,Math.PI*1.78);ctx.stroke();ctx.globalAlpha=1;
 }
 ctx.restore();
}

// Sample only the open Sunset sky. A stationary feathered mask excludes every
// island, plant and ledge; no scenery is translated with the moving clouds.
export function createCloudDrift(atlas){
 const width=264,height=250,top=940,canvas=document.createElement('canvas'),mask=document.createElement('canvas');
 canvas.width=mask.width=width;canvas.height=mask.height=height;
 const ctx=canvas.getContext('2d'),m=mask.getContext('2d'),pixels=m.createImageData(width,height);
 const points=[[0,0],[207,0],[240,80],[218,137],[156,173],[65,208],[0,238]];
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  let inside=false,distance=Infinity;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
   const [ax,ay]=points[j],[bx,by]=points[i],dx=bx-ax,dy=by-ay;
   if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
   const t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy)));
   distance=Math.min(distance,Math.hypot(x-ax-t*dx,y-ay-t*dy));
  }
  const fade=Math.min(1,distance/24),a=inside?fade*fade*(3-2*fade)*255:0;
  const k=(y*width+x)*4;pixels.data[k]=pixels.data[k+1]=pixels.data[k+2]=255;pixels.data[k+3]=a;
 }
 m.putImageData(pixels,0,0);
 return {canvas,paint(time){
  ctx.clearRect(0,0,width,height);ctx.globalCompositeOperation='source-over';
  for(let i=0;i<2;i++){
   const phase=(time/11000+i*.5)%1;
   ctx.globalAlpha=Math.sin(phase*Math.PI)**2*.92;
   ctx.drawImage(atlas,627,0,627,1254,phase*64,-top+Math.sin(time*.00035+i)*3,627,1254);
  }
  ctx.globalAlpha=1;ctx.globalCompositeOperation='destination-in';ctx.drawImage(mask,0,0);ctx.globalCompositeOperation='source-over';
  return canvas;
 },top};
}
function firefly(ctx,px,py,time,i,color,scale){
 const pulse=.5+.5*Math.sin(time*.0015+i*1.7),x=px+Math.sin(time*.00065+i)*11,y=py+Math.cos(time*.00085+i)*8;
 glow(ctx,x,y,11,color,.25+pulse*.3);ctx.fillStyle=`rgba(${color},${.4+pulse*.5})`;ctx.beginPath();ctx.arc(x,y,Math.max(1.25,1.05/scale),0,TAU);ctx.fill();
}
export function paintLivingBackground(ctx,world,width,height,time,clouds){
 const scene=scenes[world]||scenes.garden,{scale,x,y}=backgroundTransform(world,width,height);
 ctx.clearRect(0,0,width,height);ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
 if(world==='sunset'&&clouds)ctx.drawImage(clouds.paint(time),0,clouds.top);
 scene.falls.forEach((fall,i)=>waterfall(ctx,fall,time,i,world==='sunset',scale));
 scene.pools.forEach((points,i)=>pool(ctx,points,time,i,scale,world==='moon'));
 if(world==='moon'){
  for(const [i,[px,py]] of [[73,659],[140,774],[200,913],[542,942],[284,1133],[69,1084],[565,704],[585,842],[82,1050],[201,1088],[544,1105]].entries())firefly(ctx,px,py,time,i,'237,255,167',scale);
  for(const [i,[sx,sy]] of [[393,211],[532,39],[427,395],[187,251]].entries())glow(ctx,sx,sy,6,'216,242,255',.15+.35*(.5+.5*Math.sin(time*.0015+i*2)));
 }else if(world==='sunset'){
  glow(ctx,377,673,56,'255,244,176',.08+.04*Math.sin(time*.0007));
  for(const [i,[px,py]] of [[72,1029],[137,1086],[192,1053],[73,1142],[166,999]].entries())firefly(ctx,px,py,time,i,'255,248,193',scale);
 }
 ctx.restore();
}

export function initLivingBackground(app,home){
 const canvas=document.createElement('canvas');canvas.id='living-water';canvas.setAttribute('aria-hidden','true');home.prepend(canvas);
 const ctx=canvas.getContext('2d'),motion=matchMedia('(prefers-reduced-motion: reduce)');let frame=0,last=-Infinity,clouds=null;
 const atlas=new Image();atlas.src=new URL('./assets/worlds-v12.webp',import.meta.url).href;
 atlas.decode().then(()=>{clouds=createCloudDrift(atlas);}).catch(()=>{});
 const running=()=>app.dataset.screen==='home'&&!document.hidden&&!document.body.classList.contains('reduce-motion')&&!motion.matches&&!document.querySelector('dialog[open]');
 function paint(time){
  frame=0;if(!running())return;frame=requestAnimationFrame(paint);if(time-last<33)return;last=time;
  const w=home.clientWidth,h=home.clientHeight,dpr=Math.min(devicePixelRatio||1,2);
  if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
  ctx.setTransform(dpr,0,0,dpr,0,0);paintLivingBackground(ctx,app.dataset.background,w,h,time,clouds);
 }
 function refresh(){if(frame)cancelAnimationFrame(frame);frame=0;last=-Infinity;canvas.hidden=!running();ctx.clearRect(0,0,canvas.width,canvas.height);if(running())frame=requestAnimationFrame(paint);}
 new MutationObserver(refresh).observe(app,{attributes:true,attributeFilter:['data-screen','data-background']});
 new MutationObserver(refresh).observe(document.body,{attributes:true,attributeFilter:['class','open'],subtree:true});
 document.addEventListener('visibilitychange',refresh);motion.addEventListener('change',refresh);refresh();
}
