export const VICTORY_DURATION=3200;

export function victoryTimeline(done,{visible=()=>true,update=()=>{},raf=window.ShapeShiftPlatform.requestAnimationFrame,caf=window.ShapeShiftPlatform.cancelAnimationFrame,now=()=>window.ShapeShiftPlatform.now()}={}){
 let elapsed=0,last=now(),frame,ended=false;
 const finish=()=>{if(ended)return;ended=true;caf(frame);done();};
 function tick(time){if(ended)return;const delta=Math.min(80,Math.max(0,time-last));last=time;if(visible())elapsed+=delta;update(elapsed/VICTORY_DURATION);if(elapsed>=VICTORY_DURATION)finish();else if(!ended)frame=raf(tick);}
 frame=raf(tick);return {finish,cancel(){ended=true;caf(frame);}};
}

export function showAdventureVictory({document,level,drawShape,sound,stopSound=()=>{},done,visible=()=>!document.hidden,reduced=false}){
 const dialog=document.createElement('dialog');dialog.id='adventure-victory';dialog.setAttribute('aria-labelledby','victory-title');
 const glow=document.createElement('div');glow.className='victory-glow';glow.setAttribute('aria-hidden','true');dialog.append(glow);
 const title=document.createElement('h2');title.id='victory-title';title.textContent='Level '+level+' complete!';
 const logo=document.createElement('img');logo.className='victory-logo';logo.src='assets/delivery-v144/logo-v2-cut.webp';logo.alt='Shape Shift';logo.draggable=false;
 dialog.append(logo,title);
 const pieces=[];
 if(!reduced)for(let i=0;i<64;i++){
  const piece=document.createElement('span');piece.className='victory-piece'+(i%3===0?' square':'');piece.setAttribute('aria-hidden','true');
  piece.style.setProperty('--spark-color',['#ffcf48','#55dfff','#ff6f86','#99ee74','#fff6ca'][i%5]);
  piece.style.setProperty('--spark-size',(3+i%5)+'px');dialog.append(piece);pieces.push(piece);
 }
 document.body.append(dialog);dialog.showModal();sound('victory');
 let finished=false;
 const clean=()=>{stopSound();dialog.close();dialog.remove();};
 const timeline=victoryTimeline(()=>{if(finished)return;finished=true;clean();done();},{visible,update:p=>{
  // A brief logo burst over the board, then a clear-board beat before results.
  const fade=p>.67?Math.max(0,1-(p-.67)/.13):1;
  dialog.style.setProperty('--victory-opacity',fade);
  const enter=Math.min(1,p/.16),exit=Math.max(0,(p-.67)/.13);
  const scale=reduced?1:p>.67?Math.max(.12,1-exit*.88):p<.16?.35+.65*(1-Math.pow(1-enter,3))+Math.sin(enter*Math.PI)*.16:1+Math.sin((p-.16)*Math.PI*4)*.025;
  logo.style.transform='translate(-50%,-50%) scale('+scale+') rotate('+(reduced?0:(1-enter)*-9)+'deg)';glow.style.transform='translate(-50%,-50%) rotate('+(reduced?0:p*50)+'deg)';
  for(let i=0;i<pieces.length;i++){
   const age=Math.max(0,p-(i%4)*.07),angle=i*2.39996;
   const distance=Math.min(innerWidth,innerHeight)*(.22+.30*(i%7)/6)*Math.min(1,age*2.9);
   pieces[i].style.transform=`translate(${Math.cos(angle)*distance}px,${Math.sin(angle)*distance+age*age*170}px) rotate(${age*(i%2?330:-330)}deg)`;
   pieces[i].style.opacity=String(Math.min(1,age*18)*Math.max(0,1-age)*fade);
  }
 }});
 dialog.addEventListener('cancel',event=>{event.preventDefault();timeline.finish();});
 return ()=>{if(finished)return;finished=true;timeline.cancel();clean();};
}
