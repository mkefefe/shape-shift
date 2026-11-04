import {createSceneryProgress,sceneryPalette} from './scenery-progress.js?v=494235';
// Gameplay-only scenery. Uses the game's clock so pause, ads and slow-time stay in sync.
export function createGameplayScene(app){
 const canvas=document.createElement('canvas');canvas.id='gameplay-scene';canvas.setAttribute('aria-hidden','true');app.prepend(canvas);
 const ctx=canvas.getContext('2d',{alpha:false}),back=document.createElement('canvas'),bg=back.getContext('2d');
 const economical=(navigator.deviceMemory>0&&navigator.deviceMemory<=2)||(navigator.hardwareConcurrency>0&&navigator.hardwareConcurrency<=4);
 let journey=createSceneryProgress(),mood={palette:sceneryPalette(0),speed:1},colorClock=0;
 let mode=null,level=1,w=1,h=1,dpr=1,phase=0,speed=1,lastDraw=0,backdropKey='';
 const particles=Array.from({length:90},(_,i)=>({x:((i*61.7)%101)/101,y:((i*37.3)%103)/103,z:.25+(i%7)/8,r:.6+(i%4)*.45}));
 // Load on first Adventure run; cache the painted sky at the viewport size.
 const sky=new Image();
 sky.onload=()=>{if(mode==='adventure'){backdrop();draw();}};
 function backdrop(){
  const key=[mode,w,h,dpr,...(mode==='endless'?mood.palette:[sky.naturalWidth||0,level>60?2:level>25?1:0])].join('|');
  if(key===backdropKey&&back.width===canvas.width&&back.height===canvas.height)return;
  backdropKey=key;
  // Resizing a canvas discards its backing bitmap even if the value is unchanged.
  // Palette animation repaints that bitmap; it must not reallocate it five times/sec.
  if(back.width!==canvas.width)back.width=canvas.width;
  if(back.height!==canvas.height)back.height=canvas.height;
  bg.setTransform(dpr,0,0,dpr,0,0);
  const g=bg.createLinearGradient(0,0,w,h);g.addColorStop(0,mode==='endless'?mood.palette[0]:'#4caaf0');g.addColorStop(1,mode==='endless'?mood.palette[1]:'#a1e1fb');bg.fillStyle=g;bg.fillRect(0,0,w,h);
  if(mode==='adventure'){
   if(sky.complete&&sky.naturalWidth){
    const scale=Math.max(w/sky.naturalWidth,h/sky.naturalHeight);
    const sw=sky.naturalWidth*scale,sh=sky.naturalHeight*scale;
    bg.filter=level>60?'sepia(.22) saturate(.85)':level>25?'hue-rotate(28deg) saturate(.65) brightness(.65)':'none';
    bg.drawImage(sky,(w-sw)/2,(h-sh)/2,sw,sh);bg.filter='none';
    const shade=bg.createLinearGradient(0,0,0,h);shade.addColorStop(0,'#052d4930');shade.addColorStop(.5,'#052d4915');shade.addColorStop(1,'#052d4940');bg.fillStyle=shade;bg.fillRect(0,0,w,h);
   }
   return;
  }
  for(let i=0;i<4;i++){const x=i%2?w*.95:0,y=h*(.1+i*.25),r=w*(.7+i*.08),glow=bg.createRadialGradient(x,y,0,x,y,r);glow.addColorStop(0,mood.palette[i%2?3:2]+'42');glow.addColorStop(1,'#00000000');bg.fillStyle=glow;bg.fillRect(0,0,w,h);}
 }
 function resize(){if(!mode){canvas.width=canvas.height=back.width=back.height=1;return;}const rect=app.getBoundingClientRect();const nextW=Math.max(1,rect.width),nextH=Math.max(1,Math.min(rect.height,window.innerHeight));const nextDpr=Math.min(economical?1:1.5,window.devicePixelRatio||1);if(w===nextW&&h===nextH&&dpr===nextDpr&&canvas.width>1)return;w=nextW;h=nextH;dpr=nextDpr;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);backdrop();draw();}
 function draw(){if(!mode)return;ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(back,0,0);ctx.setTransform(dpr,0,0,dpr,0,0);
  const endless=mode==='endless';
  for(let i=0;i<(endless?(economical?54:90):(economical?6:10));i++){const p=particles[i],x=p.x*w+Math.sin(phase*.015+i)*(endless?4:18),y=((p.y*h+phase*(endless?p.z:(.75+p.z*.7)))%(h+40)+h+40)%(h+40)-20;const edge=.35+.65*Math.abs(x/w-.5)*2;
   ctx.globalAlpha=edge*(.3+p.z*.45);ctx.strokeStyle=endless?'#c1ddff':'#287eb3';ctx.fillStyle=i%5===0?'#dfc5ff':'#c5edff';
   if(endless){const tail=Math.max(0,(speed-1)*p.z*7);if(tail>1){const trail=ctx.createLinearGradient(x,y-tail,x,y);trail.addColorStop(0,'#8bcaff00');trail.addColorStop(1,'#a8dfff');ctx.strokeStyle=trail;ctx.lineWidth=p.r*.8;ctx.beginPath();ctx.moveTo(x,y-tail);ctx.lineTo(x,y);ctx.stroke();}ctx.beginPath();ctx.arc(x,y,p.r,0,Math.PI*2);ctx.fill();if(i%13===0){ctx.globalAlpha*=.6+.4*Math.sin(phase*.06+i);ctx.fillRect(x-3,y-.4,6,.8);ctx.fillRect(x-.4,y-3,.8,6);}}
   else{const moteX=(i%2?w*(.91+p.x*.08):w*(.01+p.x*.08));ctx.globalAlpha=.2+.2*Math.sin(phase*.025+i)**2;ctx.fillStyle='#fff8cf';ctx.beginPath();ctx.arc(moteX,h-y,p.r,0,Math.PI*2);ctx.fill();}
  }ctx.globalAlpha=1;
 }
 new ResizeObserver(resize).observe(app);
 return {async prepare(){if(mode==='adventure'){await sky.decode();}resize();draw();},scene(next,n=1){mode=next==='endless'||next==='adventure'?next:null;level=n;canvas.hidden=!mode;if(mode==='adventure'&&!sky.getAttribute('src'))sky.src='./assets/adventure-garden-v209.webp';if(mode){journey=createSceneryProgress();mood={palette:sceneryPalette(0),speed:1};colorClock=0;speed=1;phase=0;canvas.width=1;}resize();},tick(delta,state){if(!mode||window.ShapeShiftPlatform.paused)return;if(mode==='endless'){mood=journey.step(delta/1000,state.score,state.reduced);colorClock+=delta;if(colorClock>=200){colorClock=0;backdrop();}}const target=(mode==='endless'?Math.min(3.4,Math.max(.65,3200/Math.max(1100,state.duration))*mood.speed):1)*(state.slowRate??(state.slow?.5:1));speed+=(target-speed)*Math.min(1,delta/700);phase+=(state.reduced?0:delta)*(mode==='endless'?.015:.032)*speed;lastDraw+=delta;if(lastDraw>=32){lastDraw=0;draw();}}};
}
