export const VICTORY_DURATION=5000;
const clamp=n=>Math.max(0,Math.min(1,n));
const ease=n=>{n=clamp(n);return n*n*(3-2*n);};
export function victoryPose(ms){return {dim:ease(ms/420),enter:ease((ms-1700)/650),gather:ease((ms-600)/850),dock:ease((ms-3650)/1100),panel:ease((ms-3900)/900)};}

export function victoryTimeline(done,{visible=()=>true,update=()=>{},raf=requestAnimationFrame,caf=cancelAnimationFrame,now=()=>window.ShapeShiftPlatform.now()}={}){
 let elapsed=0,last=now(),frame,ended=false;
 const finish=()=>{if(ended)return;ended=true;caf(frame);done();};
 function tick(time){if(ended)return;const delta=Math.min(80,Math.max(0,time-last));last=time;if(visible())elapsed+=delta;update(elapsed/VICTORY_DURATION);if(elapsed>=VICTORY_DURATION)finish();else if(!ended)frame=raf(tick);}
 frame=raf(tick);return {finish,cancel(){ended=true;caf(frame);}};
}

export function showAdventureVictory({document,points=[],level,sound,stopSound=()=>{},done,reveal=()=>{},resultDialog=document.getElementById('over-dialog'),visible=()=>!window.ShapeShiftPlatform.paused,reduced=false}){
 const dialog=document.createElement('dialog');dialog.id='adventure-victory';dialog.setAttribute('aria-labelledby','victory-title');
 const glow=document.createElement('div');glow.className='victory-glow';glow.setAttribute('aria-hidden','true');dialog.append(glow);
 const title=document.createElement('h2');title.id='victory-title';title.textContent='Level '+level+' complete!';
 const logo=document.createElement('img');logo.className='victory-logo';logo.src='assets/delivery-v144/logo-v2-cut.webp';logo.alt='Shape Shift';logo.draggable=false;dialog.append(logo,title);
 const pieces=[],orbs=[],choices=[];
 {
  for(const [index,choice] of [...document.querySelectorAll('#board .choice')].entries()){
   if(points.length&&!(points[index]>0))continue;
   const rect=choice.getBoundingClientRect();if(!rect.width||!rect.height)continue;
   const orb=document.createElement('i');orb.className='victory-orb';orb.setAttribute('aria-hidden','true');dialog.append(orb);orbs.push({orb,x:rect.x+rect.width/2,y:rect.y+rect.height/2});choices.push({choice,transform:choice.style.transform,opacity:choice.style.opacity});
  }
  for(let i=0;i<(reduced?20:60);i++){
   const piece=document.createElement('span');piece.className='victory-piece'+(i%3===0?' square':'');piece.setAttribute('aria-hidden','true');
   piece.style.setProperty('--spark-color',['#ffcf48','#55dfff','#ff6f86','#99ee74','#fff6ca'][i%5]);piece.style.setProperty('--spark-size',(7+i%6)+'px');dialog.append(piece);pieces.push(piece);
  }
 }
 document.body.append(dialog);dialog.showModal();
 let finished=false,revealed=false,target;
 const viewport=document.documentElement,field=document.getElementById('app');
 let layout={};const measure=()=>{layout={w:viewport.clientWidth,h:viewport.clientHeight,field:field?.getBoundingClientRect()};target=null;};
 measure();const resize=()=>measure();document.defaultView.addEventListener('resize',resize);
 function prepareResults(){
  if(revealed)return;revealed=true;
  if(resultDialog){resultDialog.classList.add('victory-result','victory-arriving');resultDialog.style.opacity='0';}
  reveal();
  // Keep the celebration on top while the real result panel fades in beneath it.
  // Both modal operations happen in one frame: there is no intermediate board flash.
  dialog.close();dialog.showModal();
 }
 function clean(cancelled=false){
  stopSound();document.defaultView.removeEventListener('resize',resize);dialog.close();dialog.remove();
  for(const {choice,transform,opacity} of choices){choice.style.transform=transform;choice.style.opacity=opacity;}
  if(resultDialog){resultDialog.classList.remove('victory-arriving','victory-quiet');resultDialog.style.removeProperty('opacity');resultDialog.style.removeProperty('transform');
   if(cancelled){resultDialog.classList.remove('victory-result');if(revealed)resultDialog.close();}
   else resultDialog.querySelector('#record')?.focus({preventScroll:true});}
 }
 const cues=new Set();
 const timeline=victoryTimeline(()=>{if(finished)return;finished=true;prepareResults();clean();done();},{visible,update:p=>{
  const ms=p*VICTORY_DURATION,pose=victoryPose(ms),{w,h}=layout;
  for(const [at,name] of [[0,'victory-transform'],[600,'victory-gather'],[1450,'victory-burst'],[1700,'victory'],[2000,'victory-spark'],[2300,'victory-spark'],[2600,'victory-spark'],[2900,'victory-spark'],[3900,'victory-panel']]){if(ms>=at&&!cues.has(at)){cues.add(at);sound(name);}}
  if(ms>=3650)prepareResults();
  if(revealed&&resultDialog){
   if(!target){const previous=resultDialog.style.transform;resultDialog.style.transform='none';const mark=resultDialog.querySelector('.result-mark')?.getBoundingClientRect();resultDialog.style.transform=previous;if(mark)target={x:mark.x,y:mark.y,width:mark.width,height:mark.height};}
   resultDialog.style.opacity=String(pose.panel);resultDialog.style.transform=reduced?'none':`translateY(${(1-pose.panel)*32}px)`;
   
  }
  const center={x:w/2,y:h*.44},baseWidth=Math.min(w*.68,330),dock=pose.dock;
  const x=center.x+(target?target.x+target.width/2-center.x:0)*dock;
  const y=center.y+(target?target.y+target.height/2-center.y:0)*dock+(reduced?0:(1-pose.enter)*70);
  const width=baseWidth+(target?target.width-baseWidth:0)*dock;
  logo.style.width=width+'px';logo.style.left=x+'px';logo.style.top=y+'px';logo.style.opacity=String(pose.enter);
  logo.style.transform=`translate(-50%,-50%) scale(${reduced?1:.82+pose.enter*.18+Math.sin(pose.enter*Math.PI)*.1})`;
  dialog.style.setProperty('--victory-dim',String(revealed?0:pose.dim));
  glow.style.opacity=String(pose.enter*(1-pose.dock)*.8);glow.style.transform=`translate(-50%,-50%) rotate(${reduced?0:p*30}deg)`;
  const shrink=ease(ms/500);
  for(const {choice} of choices){choice.style.transform=`scale(${1-shrink*.85})`;choice.style.opacity=String(1-shrink);}
  for(const {orb,x:ox,y:oy} of orbs){
   orb.style.left=(ox+(center.x-ox)*pose.gather)+'px';orb.style.top=(oy+(center.y-oy)*pose.gather)+'px';
   orb.style.opacity=String(ease(ms/350)*(1-ease((ms-1400)/160)));
   orb.style.transform=`translate(-50%,-50%) scale(${.5+shrink*.7-pose.gather*.3})`;
  }
  const field=layout.field;
  const fieldWidth=Math.min(w,field?.width||w),fieldLeft=(w-fieldWidth)/2;
  for(let i=0;i<pieces.length;i++){
   const count=reduced?4:12,group=Math.floor(i/count),burstAt=group===0?1450:1700+group*300;
   const age=(ms-burstAt)/1750,live=age>0&&age<1,angle=(i%count)*Math.PI*2/count;
   const distance=Math.min(fieldWidth,h)*(reduced?.25:group===0?.68:.36)*Math.max(0,age)**.65*(.7+(i%4)*.1);
   const destinations=[[.5,.44],[.22,.27],[.78,.29],[.24,.70],[.76,.72]],destination=destinations[group];
   const travel=ease((ms-1450)/(burstAt-1450||1));
   const originX=fieldLeft+fieldWidth*(.5+(destination[0]-.5)*travel),originY=h*(.44+(destination[1]-.44)*travel);
   pieces[i].style.left=originX+'px';pieces[i].style.top=originY+'px';
   pieces[i].style.transform=`translate(${Math.cos(angle)*distance}px,${Math.sin(angle)*distance+Math.max(0,age)**2*65}px) scale(${1-Math.max(0,age)*.3})`;
   pieces[i].style.opacity=group>0&&i%count===0&&ms>=1450&&ms<burstAt?'1':live?String(Math.min(1,age*18)*(1-age)**.4):'0';
  }
 }});
 dialog.addEventListener('cancel',event=>{event.preventDefault();timeline.finish();});
 return ()=>{if(finished)return;finished=true;timeline.cancel();clean(true);};
}
