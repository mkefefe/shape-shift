// Color Beacon: a deterministic, lightweight story timeline shared by the game
// and exported previews. Painted art stays at native proportions throughout.
import {createStoryRestorationMap,createRestorationStage} from './story-restoration.js?v=49439-web12';
export {STORY_RESTORATION} from './story-restoration.js?v=49439-web12';
export const STORY_SCENES = Object.freeze({
 intro:{duration:9,title:'A little world',audio:'story-intro.ogg',description:'Clear 100 Adventure levels to fill the Color Beacon and restore your island.'},
 garden:{duration:5,title:'First Bloom',audio:'story-10.ogg'},
 river:{duration:5,title:'Let It Flow',audio:'story-20.ogg'},
 village:{duration:5,title:'Welcome Home',audio:'story-50.ogg'},
 sky:{duration:5,title:'A Sky Full of Color',audio:'story-75.ogg'},
 ending:{duration:25,title:'Color Comes Home',audio:'story-ending.ogg'},
 credits:{duration:12,title:'Made by MK',audio:'story-ending.ogg',audioOffset:13}
});
const COLORS=['#ff7775','#68d7ff','#9fe97a','#ffe388'];
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
const ease=(t,a,b)=>smooth((t-a)/(b-a));
const mix=(a,b,p)=>a+(b-a)*p;
const make=(w,h=w)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
const cache=new Map();
const absolute=(base,file)=>typeof base==='string'&&!/^(https?:|file:)/.test(base)?`${base.replace(/\/$/,'')}/${file}`:new URL(file,base).href;

// The river is painted as one object, including almost-white foam and detached
// droplets. Follow its actual blue/cyan pixels rather than fading an ellipse
// across its edges. Connected pale highlights belong to the same water object.
function waterObjectMask(image,n){
 const canvas=make(n),ctx=canvas.getContext('2d');ctx.drawImage(image,0,0,n,n);
 const pixels=ctx.getImageData(0,0,n,n),source=pixels.data,total=n*n;
 const selected=new Uint8Array(total),pale=new Uint8Array(total),queue=new Int32Array(total);
 let head=0,tail=0;
 for(let y=710;y<n;y++){
  const left=y<840?420:y<960?520:y<1090?550:530,right=y<840?760:y<1010?780:835;
  for(let x=left;x<Math.min(n,right);x++){
   const i=y*n+x,k=i*4,r=source[k],g=source[k+1],b=source[k+2];if(source[k+3]<8)continue;
   if(b>r+8&&g>r+4&&b>=g-24&&b>65){selected[i]=1;queue[tail++]=i;}
   else if(r>165&&g>=r-2&&b>=r-2)pale[i]=1;
  }
 }
 while(head<tail){const i=queue[head++];for(const offset of[-n-1,-n,-n+1,-1,1,n-1,n,n+1]){const next=i+offset;if(next>=0&&next<total&&pale[next]&&!selected[next]){selected[next]=1;queue[tail++]=next;}}}
 const mask=ctx.createImageData(n,n),data=mask.data;
 // One source-pixel fringe includes antialiased edges without coloring rocks.
 for(let i=0;i<tail;i++){const at=queue[i];for(const offset of[-n-1,-n,-n+1,-1,0,1,n-1,n,n+1]){const next=at+offset;if(next<0||next>=total)continue;const k=next*4;data[k]=data[k+1]=data[k+2]=data[k+3]=255;}}
 ctx.putImageData(mask,0,0);return canvas;
}

export function loadStoryAssets({baseURL=new URL('./assets/story-beacon/',import.meta.url),commonURL=new URL('./assets/',import.meta.url)}={}){
 const key=String(baseURL)+'|'+String(commonURL);
 if(cache.has(key))return cache.get(key);
 const promise=(async()=>{
  const sources={island:absolute(baseURL,'island.webp'),sky:absolute(baseURL,'sky.webp'),lanterns:absolute(baseURL,'lanterns.webp'),shapes:absolute(commonURL,'shapes-v2.webp'),logo:absolute(commonURL,'logo-v2-cut.webp')};
  const a=Object.fromEntries(await Promise.all(Object.entries(sources).map(async([name,src])=>{const im=new Image();im.src=src;await im.decode();return[name,im];})));
  const n=a.island.width;
  a.gray=make(n);let g=a.gray.getContext('2d');g.filter='grayscale(1) brightness(.72)';g.drawImage(a.island,0,0,n,n);
  // One canonical map assigns each painted object to a cumulative ten-step
  // restoration state. A bounded cache avoids keeping ten 1254px canvases in
  // mobile memory; repeated animation frames reuse their cached paintings.
  const original=make(n),originalCtx=original.getContext('2d');originalCtx.drawImage(a.island,0,0,n,n);
  const source=originalCtx.getImageData(0,0,n,n).data,gray=a.gray.getContext('2d').getImageData(0,0,n,n).data;
  const water=waterObjectMask(a.island,n).getContext('2d').getImageData(0,0,n,n).data;
  a.restorationMap=createStoryRestorationMap(source,water,n);
  const stages=new Map();
  a.restorationStage=percent=>{
   const level=Math.max(0,Math.min(100,Math.floor(Number(percent)||0)));
   if(level<10)return a.gray;if(level>=100)return a.island;
   const step=level>=75&&level<80?75:level>=25&&level<30?25:Math.floor(level/10)*10;
   if(stages.has(step)){const c=stages.get(step);stages.delete(step);stages.set(step,c);return c;}
   const c=make(n);createRestorationStage(source,gray,a.restorationMap,step,c.getContext('2d'));stages.set(step,c);
   if(stages.size>5)stages.delete(stages.keys().next().value);
   return c;
  };
  // Warm the first two chapters. Later chapter preparation is also performed
  // before its first visible frame by the scene player through drawStory.
  a.restorationStage(10);a.restorationStage(25);
  a.reveal=make(720,1280);
  a.glows=COLORS.concat(['#ffe8b0','#a8f2e8','#ffffff']).map(color=>{const c=make(128),q=c.getContext('2d'),r=q.createRadialGradient(64,64,0,64,64,64);r.addColorStop(0,color+'dc');r.addColorStop(.16,color+'8a');r.addColorStop(.5,color+'25');r.addColorStop(1,color+'00');q.fillStyle=r;q.fillRect(0,0,128,128);return c;});
  await document.fonts?.load('900 32px BeaconStory').catch(()=>{});
  return a;
 })();cache.set(key,promise);promise.catch(()=>cache.delete(key));return promise;
}

// A static story-library illustration uses the same restored districts as the
// film. The beacon shows the player's actual progress, not the next milestone.
export function drawStoryIsland(ctx,a,percent=0){
 const progress=clamp((Number(percent)||0)/100),level=progress*100;
 const width=ctx.canvas.width,height=ctx.canvas.height,n=a.island.width;
 if(!(width>0&&height>0&&n>0))return;
 const scale=Math.min(width/n,height/n),x=(width-n*scale)/2,y=(height-n*scale)/2;
 ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,width,height);
 ctx.imageSmoothingQuality='high';ctx.translate(x,y);ctx.scale(scale,scale);
 ctx.drawImage(a.restorationStage(level),0,0,n,n);
 const lamp={x:620,y:294,rx:104,ry:108};
 ctx.save();ctx.beginPath();ctx.ellipse(lamp.x,lamp.y,lamp.rx,lamp.ry,0,0,Math.PI*2);ctx.clip();
 const glass=ctx.createRadialGradient(lamp.x-28,lamp.y-28,0,lamp.x,lamp.y,160);
 glass.addColorStop(0,'#254e67');glass.addColorStop(1,'#102e43');ctx.fillStyle=glass;
 ctx.fillRect(lamp.x-lamp.rx,lamp.y-lamp.ry,lamp.rx*2,lamp.ry*2);
 const top=lamp.y+lamp.ry-lamp.ry*2*progress;
 const liquid=ctx.createLinearGradient(0,lamp.y-lamp.ry,0,lamp.y+lamp.ry);
 liquid.addColorStop(0,'#ffe69e');liquid.addColorStop(.3,'#b8edb4');liquid.addColorStop(.65,'#86dcee');liquid.addColorStop(1,'#e3a2c0');
 ctx.fillStyle=liquid;ctx.fillRect(lamp.x-lamp.rx,top,lamp.rx*2,lamp.ry*2*progress);
 ctx.fillStyle='#ffffff4a';ctx.beginPath();ctx.ellipse(lamp.x-40,lamp.y-43,13,38,.55,0,Math.PI*2);ctx.fill();
 ctx.restore();ctx.restore();
}

export function drawStory(ctx,a,sceneId,seconds,{reduced=false}={}){
 const config=STORY_SCENES[sceneId];if(!config)throw new Error('Unknown story chapter');
 let t=Math.max(0,Math.min(config.duration,seconds));if(sceneId==='credits'){sceneId='ending';t+=13;}
 const finale=sceneId==='ending',intro=sceneId==='intro';
 const chapter={garden:1,river:2,village:3,sky:4}[sceneId]||0;
 const level={garden:10,river:25,village:50,sky:75}[sceneId]||0;
 const rise=finale?ease(t,3,6):ease(t,1,3.2);
 // The sky restored at level 75 stays restored at the start of level 100.
 const skyPower=finale?mix(.65,1,ease(t,3,7)):sceneId==='sky'?mix(.035,.65,rise):.035;
 const credit=finale?ease(t,11.5,13):0;
 ctx.save();ctx.scale(ctx.canvas.width/720,ctx.canvas.height/1280);ctx.imageSmoothingQuality='high';
 ctx.fillStyle='#102d43';ctx.fillRect(0,0,720,1280);
 ctx.globalAlpha=.16+skyPower*.84;ctx.drawImage(a.sky,0,0,720,1280);ctx.globalAlpha=1;
 const shade=ctx.createLinearGradient(0,0,0,1280);shade.addColorStop(0,'#071c3388');shade.addColorStop(.5,'#102c4424');shade.addColorStop(1,'#092c4420');ctx.fillStyle=shade;ctx.fillRect(0,0,720,1280);
 const image=(im,x,y,w,h,alpha=1,angle=0)=>{if(alpha<=.001)return;ctx.save();ctx.globalAlpha=clamp(alpha);ctx.translate(x,y);ctx.rotate(angle);ctx.drawImage(im,-w/2,-h/2,w,h);ctx.restore();};
 const glow=(x,y,size,color=4,alpha=1)=>image(a.glows[color],x,y,size,size,alpha);
 const text=(str,x,y,size,alpha=1,color='#fff5df')=>{if(alpha<=.001)return;ctx.save();ctx.globalAlpha=clamp(alpha);ctx.font=`900 ${size}px BeaconStory`;ctx.textAlign='center';ctx.fillStyle=color;ctx.fillText(str,x,y);ctx.restore();};
 const shape=(i,x,y,size,alpha=1,angle=0)=>{if(alpha<=.001)return;const cell=a.shapes.width/4,col=[2,0,1,3][i];ctx.save();ctx.globalAlpha=clamp(alpha);ctx.translate(x,y);ctx.rotate(angle);ctx.drawImage(a.shapes,col*cell,i*cell,cell,cell,-size/2,-size/2,size,size);ctx.restore();};
 const lantern=(i,x,y,size,alpha=1,angle=0)=>{const cell=a.lanterns.width/2;ctx.save();ctx.globalAlpha=clamp(alpha);ctx.translate(x,y);ctx.rotate(angle);ctx.drawImage(a.lanterns,(i%2)*cell,Math.floor(i/2)*cell,cell,cell,-size/2,-size/2,size,size);ctx.restore();};
 const particles=(x,y,age,color=4,count=14,range=115)=>{if(age<0||age>2)return;const p=clamp(age/2),alpha=Math.sin(Math.PI*Math.min(1,p*3))*(1-p);for(let i=0;i<count;i++){const angle=i*2.39996,r=(18+range*(.6+(i%3)*.15))*smooth(p);glow(x+Math.cos(angle)*r,y+Math.sin(angle)*r-age*9,9+(i%3)*5,color,alpha*.7);}};
 const ambientTime=reduced?0:t;
 for(let i=0;i<20;i++){const x=40+i*191%650,y=90+i*213%1090;glow(x+Math.sin(ambientTime*.23+i)*5,y,6,i%4,.19+.1*Math.sin(ambientTime+i));}
 glow(360,760,1000,5,.17+skyPower*.12);
 // The island gently settles lower for the credits. Reduced motion keeps the
 // painting stationary throughout the ending, including its credit cards.
 const islandDock=reduced&&finale?1:credit;
 const iw=mix(700,520,islandDock),ix=(720-iw)/2,iy=mix(410,838,islandDock),u=iw/a.island.width;
 const lamp={x:ix+620*u,y:iy+294*u,rx:104*u,ry:108*u};
 const focus=chapter&&!reduced?Math.sin(ease(t,0,4.4)*Math.PI)*.035:0;
 ctx.save();ctx.translate(360,800);ctx.scale(1+focus,1+focus);ctx.translate(-360,-800);
 const before=intro?0:finale?90:{garden:0,river:10,village:40,sky:70}[sceneId];
 const after=a.restorationStage(finale?100:level);
 ctx.drawImage(a.restorationStage(before),ix,iy,iw,iw);
 if(!intro&&rise>=1){
  // Settled districts are cached: avoid a full-screen offscreen clear and
  // composite on every frame after the color reveal has finished.
  ctx.drawImage(after,ix,iy,iw,iw);
 }else if(!intro&&rise>0){
  const q=a.reveal.getContext('2d');q.clearRect(0,0,720,1280);q.globalCompositeOperation='source-over';q.drawImage(after,ix,iy,iw,iw);
  if(rise<1){const radius=10+rise*900,grad=q.createRadialGradient(lamp.x,lamp.y,Math.max(0,radius-140),lamp.x,lamp.y,radius);grad.addColorStop(0,'#fff');grad.addColorStop(1,'#fff0');q.globalCompositeOperation='destination-in';q.fillStyle=grad;q.fillRect(0,0,720,1280);q.globalCompositeOperation='source-over';}
  ctx.drawImage(a.reveal,0,0);
 }
 const fill=intro?ease(t,3.5,4.7)*.01:finale?mix(.99,1,ease(t,1.6,2.5)):mix((level-1)/100,level/100,ease(t,.8,1.4));
 ctx.save();ctx.beginPath();ctx.ellipse(lamp.x,lamp.y,lamp.rx,lamp.ry,0,0,Math.PI*2);ctx.clip();
 const glass=ctx.createRadialGradient(lamp.x-20,lamp.y-20,0,lamp.x,lamp.y,100*u*2);glass.addColorStop(0,'#254e67');glass.addColorStop(1,'#102e43');ctx.fillStyle=glass;ctx.fillRect(lamp.x-80,lamp.y-80,160,160);
 const waterTop=lamp.y+lamp.ry-2-lamp.ry*1.9*fill;
 ctx.beginPath();ctx.moveTo(lamp.x-lamp.rx-3,lamp.y+lamp.ry+3);ctx.lineTo(lamp.x-lamp.rx-3,waterTop);for(let x=-lamp.rx-3;x<=lamp.rx+3;x+=3)ctx.lineTo(lamp.x+x,waterTop+Math.sin(x*.07+ambientTime*2)*1.4);ctx.lineTo(lamp.x+lamp.rx+3,lamp.y+lamp.ry+3);ctx.closePath();
 const liquid=ctx.createLinearGradient(0,lamp.y-lamp.ry,0,lamp.y+lamp.ry);liquid.addColorStop(0,'#ffe69e');liquid.addColorStop(.3,'#b8edb4');liquid.addColorStop(.65,'#86dcee');liquid.addColorStop(1,'#e3a2c0');ctx.fillStyle=liquid;ctx.fill();
 ctx.fillStyle='#ffffff4a';ctx.beginPath();ctx.ellipse(lamp.x-23*u*1.8,lamp.y-24*u*1.8,7*u*1.8,21*u*1.8,.55,0,Math.PI*2);ctx.fill();ctx.restore();
 glow(lamp.x,lamp.y,150+rise*80,4,.14+fill*.3);
 const active=finale||chapter>1?1:0;
 if(active){
  if(chapter>=2||finale){ctx.save();ctx.lineCap='round';for(let i=0;i<8;i++){const p=(ambientTime*.62+i*.137)%1;ctx.globalAlpha=active*Math.sin(p*Math.PI)*.28;ctx.strokeStyle='#e4ffff';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(ix+(604+i%3*28)*u,iy+(883+p*166)*u);ctx.lineTo(ix+(604+i%3*28)*u,iy+(910+p*166)*u);ctx.stroke();}ctx.restore();}
  if(chapter>=3||finale)for(const [x,y]of[[402,500],[855,474],[923,623],[300,567]])glow(ix+x*u,iy+y*u,45*u*1.8,4,active*.47);
 }
 if(chapter===1||finale){for(let i=0;i<3;i++){const born=finale?4.5:1.3,age=t-born-i*.18;if(age<0)continue;const xx=ix+(250+i*330)*u+Math.sin(ambientTime*1.4+i)*12,yy=iy+(760-i%2*90)*u-(reduced?0:Math.min(90,age*18));ctx.save();ctx.translate(xx,yy);ctx.scale(reduced?1:.3+.7*Math.abs(Math.sin(t*7+i)),1);shape(i,-5,0,18,ease(age,0,.4));shape(i,5,0,18,ease(age,0,.4));ctx.restore();}}
 ctx.restore();
 // A readable match-to-beacon action links the story directly to the game.
 const hit=intro?3.2:finale?1.3:.7,age=t-hit;
 if(t<hit){const p=ease(t,Math.max(0,hit-1.1),hit),gap=mix(160,23,p),index=intro?0:finale?3:(chapter-1);shape(index,360-gap,340-Math.sin(p*Math.PI)*24,88,1-ease(p,.95,1),p*.2);shape(index,360+gap,340+Math.sin(p*Math.PI)*24,88,1-ease(p,.95,1),-p*.2);}
 if(age>=0&&age<.9){const p=ease(age,0,.9),x=360+Math.sin(p*Math.PI)*65,y=mix(340,lamp.y,p);for(let i=5;i>=0;i--){const pp=Math.max(0,p-i*.025);glow(360+Math.sin(pp*Math.PI)*65,mix(340,lamp.y,pp),24-i*2,(chapter+2)%4,.45-i*.06);}glow(x,y,40,4,1-ease(age,.7,.9));}
 if(!reduced)particles(lamp.x,lamp.y,age-.7,4,14,100);
 // Lanterns celebrate the completed world only. Level 75 instead restores the
 // permanent aurora/starlight, which remains visible in the finale opening.
 if(finale&&t>6.8){
  const start=6.8,count=reduced?8:22;
  for(let i=0;i<count;i++){const born=start+i*.61,age=t-born;if(age<0)continue;const side=i%2?-1:1,x=reduced?360+side*250:360+side*(215+(i%3)*26)+Math.sin(age*.55+i)*16,y=reduced?1115-Math.floor(i/2)*210:1230-age*94;if(y< -130)continue;const size=92+(i%3)*17;glow(x,y-4,size*1.2,i%4,.2*(reduced?ease(age,0,.5):1));lantern(i%4,x,y,size,ease(age,0,.5),reduced?0:Math.sin(age*.7+i)*.065);}
 }
 if(intro){
  const first=ease(t,0,.6)*(1-ease(t,4.6,5.2));text('A little world.',360,160,43,first);text('Waiting for color.',360,214,40,first,'#c9e5e5');
  const next=ease(t,5.1,5.8);text('Fill the Color Beacon.',360,160,39,next);text('Bring color home.',360,214,39,next,'#ffe3a0');
  text('100 levels. One bright adventure.',360,1157,29,ease(t,5.6,6.3));
  text('Every first clear adds a spark.',360,1200,26,ease(t,6,6.7),'#c9e5e5');
 }else if(!finale){
  text(`CHAPTER · ${level} / 100`,360,147,22,ease(t,0,.35),'#bde6e8');
  text(config.title,360,203,42,ease(t,.12,.6));
  const line={garden:'The garden wakes.',river:'The river runs again.',village:'Every window finds its light.',sky:'Even the sky remembers.'}[sceneId];
  text(line,360,1155,30,ease(t,2.4,3.2),'#ffe3a0');text(`${level}% of the beacon restored`,360,1200,24,ease(t,2.7,3.3),'#c9e5e5');
 }else{
  const headline=ease(t,0,.55)*(1-ease(t,10.3,11.3));text('The last spark.',360,160,42,headline*(1-ease(t,2.4,3.2)));text('Color comes home.',360,160,44,headline*ease(t,3.1,4));
  text('100 / 100',360,219,25,headline,'#ffe3a0');
  text('You brought this world to life.',360,1195,29,ease(t,6,7)*(1-ease(t,10.2,11.2)),'#fff2ca');
  if(t>=12.5){
   const p=clamp((t-13)/9),y=reduced?300:mix(580,-150,p),alpha=ease(t,12.5,13.5)*(1-ease(t,21.4,22.2));
   image(a.logo,360,y,380,380*a.logo.height/a.logo.width,alpha);
   const creditText=(str,yy,size,color)=>text(str,360,yy,size,alpha*(1-ease(yy,700,805)),color);
   creditText('CREATED BY',y+187,24,'#c9e5e5');creditText('MK',y+263,73);
   creditText('A little world.',y+410,31);creditText('A little brighter.',y+452,31,'#ffe3a0');
   const thanks=ease(t,21.7,22.6);image(a.logo,360,235,370,370*a.logo.height/a.logo.width,thanks);text('Thank you for playing.',360,450,37,thanks);text('Your adventure is complete.',360,505,28,thanks,'#ffe3a0');
  }
 }
 ctx.restore();
}
