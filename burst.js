export const BURST_MS=4000;
export const BURST_REWARD_GAP_MS=120;
export function burstDuration(targets,reduced=false){return targets>0?(reduced?810:1930)+(targets-1)*BURST_REWARD_GAP_MS+140:400;}
export function burstTargets(board){return board.map((tile,index)=>({tile,index})).filter(({tile})=>!tile.special&&!tile.collected&&!tile.memory).map(({index})=>index);}
const clamp=n=>Math.max(0,Math.min(1,n));
export function burstPointLabel(elapsed,reduced=false){
 const t=clamp(elapsed/1350);return {opacity:Math.min(clamp(t/.14),1-clamp((t-.68)/.32)),offsetY:reduced?0:18-66*t};
}
const floatingPoints=new Set();
export function clearFloatingPoints(){for(const label of floatingPoints)label.remove();floatingPoints.clear();}
export function showFloatingPoints(x,y,amount,reduced=false){
 const label=document.createElement('strong');label.className='floating-points';label.textContent='+'+amount;label.setAttribute('aria-hidden','true');
 label.style.left=x+'px';label.style.top=y+'px';document.body.append(label);floatingPoints.add(label);
 const frames=[0,.14,.68,1].map(t=>{const p=burstPointLabel(t*1350,reduced);return {offset:t,opacity:p.opacity,transform:'translate(-50%,calc(-50% + '+p.offsetY+'px))'};});
 const animation=label.animate(frames,{duration:1350,easing:'linear',fill:'both'});
 const remove=()=>{label.remove();floatingPoints.delete(label);};animation.finished.then(remove,remove);
 return label;
}
export function burstPath(from,to,t,bend=40){t=clamp(t);return {x:from.x+(to.x-from.x)*t+Math.sin(t*Math.PI*2)*bend*.35,y:from.y+(to.y-from.y)*t-Math.sin(t*Math.PI)*bend};}
export function createStarburst(boardElement,board,sourceIndex,scoreElement,multiplier=1,reduced=false,onCue=()=>{},onCollect=()=>{}){
 const buttons=[...boardElement.children],origin=buttons[sourceIndex]?.getBoundingClientRect();if(!origin)return null;
 const layer=document.createElement('div');layer.className='starburst-overlay burst-dom';layer.setAttribute('aria-hidden','true');document.body.append(layer);
 const br=boardElement.getBoundingClientRect(),source={x:origin.x+origin.width/2,y:origin.y+origin.height/2},hub={x:br.x+br.width/2,y:br.y+br.height/2},dest=scoreElement.getBoundingClientRect(),end={x:dest.x+dest.width/2,y:dest.y+dest.height/2};
 const orb=document.createElement('i');orb.className='burst-energy-orb';layer.append(orb);const sourceEl=buttons[sourceIndex];
 const targets=burstTargets(board).map(index=>{const el=buttons[index],r=el.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;
  const trails=Array.from({length:9},()=>{const dot=document.createElement('i');dot.className='burst-moving-trail';layer.append(dot);return dot;});
  const head=document.createElement('i');head.className='burst-energy-head';layer.append(head);
  const flash=document.createElement('i');flash.className='burst-tile-flash';Object.assign(flash.style,{left:r.x+'px',top:r.y+'px',width:r.width+'px',height:r.height+'px'});layer.append(flash);
  const spark=document.createElement('i');spark.className='burst-impact';spark.style.left=x+'px';spark.style.top=y+'px';layer.append(spark);return {index,el,x,y,trails,head,flash,spark,hit:false,labelShown:false};
 });
 const duration=burstDuration(targets.length,reduced);
 return {duration,draw(elapsed){
  const charge=clamp(elapsed/450),gather=burstPath(source,hub,charge,30);sourceEl.style.filter='drop-shadow(0 0 '+(Math.sin(charge*Math.PI)*22)+'px #ffe77e)';
  orb.style.left=gather.x+'px';orb.style.top=gather.y+'px';orb.style.opacity=reduced?'0':String(elapsed<600?1:1-clamp((elapsed-600)/550));orb.style.transform='translate(-50%,-50%) scale('+(1+.3*Math.sin(charge*Math.PI))+')';
  targets.forEach((target,i)=>{const {el,x,y,trails,head,flash,spark}=target,start=650+i*BURST_REWARD_GAP_MS,hit=reduced?250+i*BURST_REWARD_GAP_MS:start+720;
   const travel=(elapsed-start)/720,at=p=>burstPath(hub,{x,y},p,35+(i%3)*18);
   const pos=at(travel);head.style.left=pos.x+'px';head.style.top=pos.y+'px';head.style.opacity=!reduced&&travel>=0&&travel<1?'1':'0';
   trails.forEach((dot,j)=>{const q=travel-j*.028,a=at(q),b=at(q-.035);dot.style.left=b.x+'px';dot.style.top=b.y+'px';dot.style.width=Math.hypot(a.x-b.x,a.y-b.y)+'px';dot.style.transform='rotate('+Math.atan2(a.y-b.y,a.x-b.x)+'rad)';dot.style.opacity=!reduced&&q>0&&q<1?String((1-j/10)*.9):'0';});
   if(elapsed>=hit&&!target.hit){target.hit=true;onCue('special-impact');}
   const impact=clamp((elapsed-hit)/380),vanish=clamp((elapsed-hit-320)/230);
   el.style.opacity=String(1-vanish);el.style.filter=elapsed>=hit?'brightness('+(1+Math.sin(impact*Math.PI)*.8)+')':'';
   flash.style.opacity=elapsed<hit?'0':String((1-vanish)*Math.min(1,(elapsed-hit)/70)*.82);
   spark.style.opacity=String(Math.sin(impact*Math.PI)*.8);spark.style.transform='translate(-50%,-50%) scale('+(reduced?1:.5+impact*1.5)+')';
   if(elapsed>=hit+560&&!target.labelShown){target.labelShown=true;showFloatingPoints(x,y,multiplier,reduced);onCue('special-point');onCollect(target.index);}
  });
 },clear(){layer.remove();sourceEl.style.removeProperty('filter');targets.forEach(({el})=>{el.style.removeProperty('filter');el.style.removeProperty('opacity');});}};
}
