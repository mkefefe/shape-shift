import {createCardWater} from './card-water.js?v=49460';
import {createWaterSurface} from './water-surface.js?v=49458';
import {createCloudDrift,paintSunsetAtmosphere} from './sunset-atmosphere.js?v=49458';
export {createWaterSurface,createCloudDrift};
// Water is lit in place. Never scroll strips of the landscape: they contain
// plants and cliffs as well as water, and wrapping them makes the banks move.
const TAU=Math.PI*2;
export const scenes={
 garden:{width:941,height:1672,falls:[
  [65,530,75,620,14,17],[105,685,125,815,23,25],
  [65,852,82,1007,25,30],[174,927,203,1207,34,49],
  [348,1112,359,1167,9,12],[169,1264,200,1329,23,28],
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
 ],pools:[[[347,1052],[506,1052],[565,1068],[601,1080],[611,1104],[589,1131],[569,1139],[552,1164],[496,1161],[461,1135],[435,1115],[389,1106],[371,1100]]]},
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
 for(let i=0;i<5;i++){
  const phase=(time*(.00046+i%3*.00004)+i*.193+index*.27)%1;
  const length=Math.min(54,h*.42),y=y0+phase*(h+length)-length;
  const v=Math.max(0,Math.min(1,(y-y0)/h)),spread=(i+.5)/5-.5;
  const x=x0+(x1-x0)*v+spread*(w0+(w1-w0)*v)*.78,dx=(x1-x0)*length/h;
  const taper=Math.min(1,phase*8,(1-phase)*8);
  for(const shade of [true,false]){
   const rgb=shade?(warm?'142,101,146':'0,130,180'):(warm?'255,250,226':'243,255,255');
   const alpha=(shade?.12:.42)*taper,g=ctx.createLinearGradient(x,y,x+dx,y+length);
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
 // A few uneven flecks of foam complement the moving painted reflections.
 for(let i=0;i<14;i++){
  const phase=(time*.00013+i*.137+index*.19)%1;
  const x=left+((i*.618)%1)*width-Math.sin(phase*Math.PI)*18,y=top+phase*height;
  const a=Math.sin(phase*Math.PI)*(.18+.13*Math.sin(time*.0015+i)**2),r=5+i%5;
  ctx.strokeStyle=`rgba(235,255,255,${a})`;ctx.lineWidth=Math.max(1,.7/scale);ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(x-r,y);ctx.bezierCurveTo(x-r*.4,y-1.4,x+r*.15,y+1.8,x+r,y+.2);ctx.stroke();
 }ctx.restore();
}

function firefly(ctx,px,py,time,i,color,scale){
 const pulse=.5+.5*Math.sin(time*.0015+i*1.7),x=px+Math.sin(time*.00065+i)*11,y=py+Math.cos(time*.00085+i)*8;
 glow(ctx,x,y,11,color,.25+pulse*.3);ctx.fillStyle=`rgba(${color},${.4+pulse*.5})`;ctx.beginPath();ctx.arc(x,y,Math.max(1.25,1.05/scale),0,TAU);ctx.fill();
}
export function paintLivingBackground(ctx,world,width,height,time,clouds,waterSurfaces={}){
 const scene=scenes[world]||scenes.garden,{scale,x,y}=backgroundTransform(world,width,height);
 ctx.clearRect(0,0,width,height);ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
 if(world==='sunset'&&clouds)ctx.drawImage(clouds.paint(time),0,clouds.top);
 const water=waterSurfaces[world];if(water)ctx.drawImage(water.paint(time),water.left,water.top);
 scene.falls.forEach((fall,i)=>waterfall(ctx,fall,time,i,world==='sunset',scale));
 scene.pools.forEach((points,i)=>pool(ctx,points,time,i,scale,world==='moon'));
 if(world==='moon'){
  for(const [i,[px,py]] of [[73,659],[140,774],[200,913],[542,942],[284,1133],[69,1084],[565,704],[585,842],[82,1050],[201,1088],[544,1105],[36,365],[566,407],[81,500],[170,1155],[600,1008],[40,585],[110,615],[168,706],[229,866],[52,949],[123,1020],[248,1086],[310,1146],[539,1000],[590,921],[550,793],[479,720],[602,1168],[340,1068],[436,1160],[94,1170],[176,1210],[584,540],[70,428],[250,686],[457,882],[517,1195]].entries())firefly(ctx,px,py,time,i,'237,255,167',scale);
  for(const [i,[sx,sy]] of [[393,211],[532,39],[427,395],[187,251]].entries())glow(ctx,sx,sy,6,'216,242,255',.15+.35*(.5+.5*Math.sin(time*.0015+i*2)));
 }else if(world==='sunset')paintSunsetAtmosphere(ctx,time,scale);
 ctx.restore();
}

export function initLivingBackground(app,home){
 const canvas=document.createElement('canvas');canvas.id='living-water';canvas.setAttribute('aria-hidden','true');home.prepend(canvas);
 const ctx=canvas.getContext('2d'),motion=matchMedia('(prefers-reduced-motion: reduce)');let frame=0,last=-Infinity,clouds=null,cardWater=null;const waterSurfaces={};
 const atlas=new Image();atlas.src=new URL('./assets/worlds-v12.webp',import.meta.url).href;
 atlas.decode().then(()=>{clouds=createCloudDrift(atlas);waterSurfaces.moon=createWaterSurface(atlas,'moon',scenes.moon);waterSurfaces.sunset=createWaterSurface(atlas,'sunset',scenes.sunset);}).catch(()=>{});
 const garden=new Image();garden.src=new URL('./assets/home-world-v101.webp',import.meta.url).href;
 garden.decode().then(()=>{waterSurfaces.garden=createWaterSurface(garden,'garden',scenes.garden);}).catch(()=>{});
 const cards=new Image();cards.src=new URL('./assets/mode-cards-v101.webp',import.meta.url).href;
 cards.decode().then(()=>{cardWater=createCardWater(cards,home);}).catch(()=>{});
 const running=()=>app.dataset.screen==='home'&&!document.hidden&&!document.body.classList.contains('reduce-motion')&&!motion.matches&&!document.querySelector('dialog[open]');
 function paint(time){
  frame=0;if(!running())return;frame=requestAnimationFrame(paint);if(time-last<33)return;last=time;
  const w=home.clientWidth,h=home.clientHeight,dpr=Math.min(devicePixelRatio||1,2);
  if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
  ctx.setTransform(dpr,0,0,dpr,0,0);paintLivingBackground(ctx,app.dataset.background,w,h,time,clouds,waterSurfaces);cardWater?.paint(time);
 }
 function refresh(){if(frame)cancelAnimationFrame(frame);frame=0;last=-Infinity;canvas.hidden=!running();if(canvas.hidden)cardWater?.hide();ctx.clearRect(0,0,canvas.width,canvas.height);if(running())frame=requestAnimationFrame(paint);}
 new MutationObserver(refresh).observe(app,{attributes:true,attributeFilter:['data-screen','data-background']});
 new MutationObserver(refresh).observe(document.body,{attributes:true,attributeFilter:['class','open'],subtree:true});
 document.addEventListener('visibilitychange',refresh);motion.addEventListener('change',refresh);refresh();
}
