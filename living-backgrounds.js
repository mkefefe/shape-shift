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
function waterfall(ctx,fall,time,index,warm){
 const [x0,y0,x1,y1,w0,w1]=fall,h=y1-y0;
 ctx.save();polygon(ctx,[[x0-w0/2,y0],[x0+w0/2,y0],[x1+w1/2,y1],[x1-w1/2,y1]]);ctx.clip();
 // Separate, tapered threads travel downstream. Both ends fade before they
 // wrap so the animation has no seams or moving rectangular edges.
 for(let i=0;i<11;i++){
  const phase=(time*(.00038+i%3*.000035)+i*.193+index*.27)%1;
  const length=Math.min(42,h*.28),y=y0+phase*(h+length)-length;
  const v=Math.max(0,Math.min(1,(y-y0)/h)),spread=(i+.5)/11-.5;
  const x=x0+(x1-x0)*v+spread*(w0+(w1-w0)*v)*.84;
  const dx=(x1-x0)*length/h,alpha=.12+.13*(.5+.5*Math.sin(time*.0013+i));
  const g=ctx.createLinearGradient(x,y,x+dx,y+length);
  const rgb=warm?'255,239,209':'223,253,255';
  g.addColorStop(0,`rgba(${rgb},0)`);g.addColorStop(.55,`rgba(${rgb},${alpha})`);g.addColorStop(1,`rgba(${rgb},0)`);
  ctx.strokeStyle=g;ctx.lineWidth=1.1+i%3*.55;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+dx*.35+Math.sin(i+time*.001)*.7,y+length*.55,x+dx,y+length);ctx.stroke();
 }
 ctx.restore();
 // Mist brightens the existing splash without expanding onto the rocks.
 glow(ctx,x1,y1+2,w1*.65,warm?'255,241,221':'220,251,255',.055+.025*Math.sin(time*.0018+index));
}
function pool(ctx,points,time,index){
 ctx.save();polygon(ctx,points);ctx.clip();
 const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
 const left=Math.min(...xs),top=Math.min(...ys),width=Math.max(...xs)-left,height=Math.max(...ys)-top;
 for(let i=0;i<42;i++){
  const phase=(time*.00009+i*.137+index*.19)%1;
  const x=left+((i*.618)%1)*width+Math.sin(time*.0007+i)*3,y=top+phase*height;
  const alpha=Math.sin(phase*Math.PI)*(.09+.12*(.5+.5*Math.sin(time*.0015+i)));
  ctx.strokeStyle=`rgba(224,253,255,${alpha})`;ctx.lineWidth=1.1;ctx.beginPath();ctx.ellipse(x,y,3+i%8,1.1,0,0,Math.PI);ctx.stroke();
 }ctx.restore();
}
export function paintLivingBackground(ctx,world,width,height,time){
 const scene=scenes[world]||scenes.garden,{scale,x,y}=backgroundTransform(world,width,height);
 ctx.clearRect(0,0,width,height);ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
 scene.falls.forEach((fall,i)=>waterfall(ctx,fall,time,i,world==='sunset'));
 scene.pools.forEach((points,i)=>pool(ctx,points,time,i));
 if(world==='moon'){
  // Fireflies follow the forest edges, away from the menu text.
  for(const [i,[px,py]] of [[73,659],[140,774],[200,913],[542,942],[284,1133],[69,1084],[565,704],[585,842]].entries()){
   const pulse=.5+.5*Math.sin(time*.0012+i*1.7),fx=px+Math.sin(time*.0005+i)*6,fy=py+Math.cos(time*.0007+i)*5;
   glow(ctx,fx,fy,7,'227,255,129',.12+pulse*.25);ctx.fillStyle=`rgba(245,255,197,${.25+pulse*.55})`;ctx.beginPath();ctx.arc(fx,fy,.8+pulse*.4,0,TAU);ctx.fill();
  }
  for(const [i,[sx,sy]] of [[393,211],[532,39],[427,395],[187,251]].entries())glow(ctx,sx,sy,4,'216,242,255',.08+.14*(.5+.5*Math.sin(time*.0009+i*2)));
 }else if(world==='sunset'){
  // A restrained warm shimmer around the painted sun; clouds stay still.
  glow(ctx,377,673,56,'255,244,176',.045+.018*Math.sin(time*.0007));
  // The lower-left sky remains visible beside the cards and Play button.
  // Feathered light drifts over those clouds without displacing their edges.
  for(const [i,[cx,cy]] of [[69,1020],[145,1084],[49,1174]].entries()){
   ctx.save();ctx.translate(cx+Math.sin(time*.00023+i)*12,cy+Math.cos(time*.00031+i)*3);ctx.scale(2.2,.65);
   glow(ctx,0,0,30,'255,236,194',.08+.035*Math.sin(time*.0008+i));ctx.restore();
  }
  for(const [i,[px,py]] of [[42,1029],[97,1106],[162,1053],[43,1162],[126,999]].entries()){
   const pulse=.5+.5*Math.sin(time*.0013+i*1.9),fx=px+Math.sin(time*.00038+i)*9,fy=py+Math.cos(time*.0005+i)*7;
   glow(ctx,fx,fy,5,'255,237,155',.12+pulse*.2);ctx.fillStyle=`rgba(255,250,211,${.2+pulse*.5})`;ctx.beginPath();ctx.arc(fx,fy,.7+pulse*.45,0,TAU);ctx.fill();
  }
 }
 ctx.restore();
}

export function initLivingBackground(app,home){
 const canvas=document.createElement('canvas');canvas.id='living-water';canvas.setAttribute('aria-hidden','true');home.prepend(canvas);
 const ctx=canvas.getContext('2d'),motion=matchMedia('(prefers-reduced-motion: reduce)');let frame=0,last=-Infinity;
 const running=()=>app.dataset.screen==='home'&&!document.hidden&&!document.body.classList.contains('reduce-motion')&&!motion.matches&&!document.querySelector('dialog[open]');
 function paint(time){
  frame=0;if(!running())return;frame=requestAnimationFrame(paint);if(time-last<50)return;last=time;
  const w=home.clientWidth,h=home.clientHeight,dpr=Math.min(devicePixelRatio||1,2);
  if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
  ctx.setTransform(dpr,0,0,dpr,0,0);paintLivingBackground(ctx,app.dataset.background,w,h,time);
 }
 function refresh(){if(frame)cancelAnimationFrame(frame);frame=0;last=-Infinity;canvas.hidden=!running();ctx.clearRect(0,0,canvas.width,canvas.height);if(running())frame=requestAnimationFrame(paint);}
 new MutationObserver(refresh).observe(app,{attributes:true,attributeFilter:['data-screen','data-background']});
 new MutationObserver(refresh).observe(document.body,{attributes:true,attributeFilter:['class','open'],subtree:true});
 document.addEventListener('visibilitychange',refresh);motion.addEventListener('change',refresh);refresh();
}
