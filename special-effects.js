import {fitBoard} from './board-fit.js?v=49439-web5';
export const SPECIAL_DESTINATIONS=Object.freeze({heart:'health',crystal:'shield',hourglass:'timer',reset:'board'});
export const effectDuration=reduced=>reduced?400:1050;
const clamp=x=>Math.max(0,Math.min(1,x));
const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
export function flightPosition(source,destination,progress){const t=ease(progress);return {x:source.x+(destination.x-source.x)*t,y:source.y+(destination.y-source.y)*t-Math.sin(t*Math.PI)*45};}
export function rewindPosition(point,group,center,t){
 const a=ease((t-.03)/.19),b=ease((t-.27)/.19),c=ease((t-.51)/.19),d=ease((t-.75)/.19);
 return {x:point.x+(group.x-point.x)*a+(center.x-group.x)*c,y:point.y+(group.y-point.y)*b+(center.y-group.y)*d};
}
export function planRewind(changed){
 if(!changed.length)return changed;
 const xs=changed.map(p=>p.x),ys=changed.map(p=>p.y);
 const center={x:(Math.min(...xs)+Math.max(...xs))/2,y:(Math.min(...ys)+Math.max(...ys))/2};
 // Six cards fold vertically into three columns; other grids fold rows first.
 const vertical=changed.length===6,groups=new Map();
 for(const p of changed){const key=Math.round(vertical?p.x:p.y);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(p);}
 const survivors=[];
 for(const group of groups.values()){
  const target=vertical?{x:group[0].x,y:center.y}:{x:center.x,y:group[0].y};
  const keep=[...group].sort((a,b)=>Math.hypot(a.x-target.x,a.y-target.y)-Math.hypot(b.x-target.x,b.y-target.y)||a.y-b.y||a.x-b.x)[0];
  survivors.push(keep);
  for(const p of group){
   p.group=target;p.absorbStage=p===keep?4:1;
   p.path=[{x:p.x,y:p.y},{x:(p.x+target.x)/2,y:(p.y+target.y)/2},{...target},{...target},{...target}];
  }
 }
 const final=[...survivors].sort((a,b)=>Math.hypot(a.group.x-center.x,a.group.y-center.y)-Math.hypot(b.group.x-center.x,b.group.y-center.y)||a.y-b.y||a.x-b.x)[0];
 for(const p of survivors){p.absorbStage=p===final?4:3;p.path[3]={x:(p.group.x+center.x)/2,y:(p.group.y+center.y)/2};p.path[4]={...center};}
 return changed;
}
export function rewindPathPosition(path,t){
 // The midpoint of each fold is a waypoint, not another ease-in/ease-out.
 // Maintain velocity through it so cards never brake halfway along a row.
 const phase=clamp(t)*2,stage=phase<1?0:2,local=clamp(phase-stage/2);
 const a=path[stage],b=path[stage+2];
 return {x:a.x+(b.x-a.x)*local,y:a.y+(b.y-a.y)*local};
}
export function rewindTiming(tiles,reduced=false){
 const moves=(a,b)=>a.x!==b.x||a.y!==b.y;
 const stages=tiles.some(t=>moves(t.path[2],t.path[4]))?4:tiles.some(t=>moves(t.path[0],t.path[2]))?2:0;
 const mergeDuration=stages*(reduced?100:180);
 return {stages,mergeDuration,settleDuration:reduced?180:320,duration:mergeDuration+(reduced?180:320)};
}
// Settle the surviving card into the measured one-card layout, without stretching its art.
export function rewindLanding(center,size,target,progress){
 const t=ease(progress),mix=(a,b)=>a+(b-a)*t;
 return {x:mix(center.x,target.x),y:mix(center.y,target.y),width:mix(size.width,target.width),height:mix(size.height,target.height)};
}
function singleCardTarget(board){
 const columns=board.dataset.columns,count=board.dataset.count,layout=board.dataset.layout,boardStyle=board.getAttribute('style');
 const children=[...board.children],styles=children.map(el=>el.getAttribute('style'));
 const probe=document.createElement('button');probe.className='choice';probe.style.transition='none';
 const art=document.createElement('span');art.className='sprite';probe.append(art);
 try{
  children.forEach(el=>el.style.display='none');board.dataset.columns='1';board.dataset.count='1';board.dataset.layout='classic';board.style.gridTemplateColumns='';board.style.gridTemplateRows='';board.append(probe);fitBoard(board);
  const r=probe.getBoundingClientRect(),a=art.getBoundingClientRect();
  return {x:r.x+r.width/2,y:r.y+r.height/2,width:r.width,height:r.height,artSize:a.width};
 }finally{
  probe.remove();boardStyle===null?board.removeAttribute('style'):board.setAttribute('style',boardStyle);if(layout===undefined)delete board.dataset.layout;else board.dataset.layout=layout;
  if(columns===undefined)delete board.dataset.columns;else board.dataset.columns=columns;
  if(count===undefined)delete board.dataset.count;else board.dataset.count=count;
  children.forEach((el,i)=>styles[i]===null?el.removeAttribute('style'):el.setAttribute('style',styles[i]));
 }
}
export function createSpecialEffect(kind,boardElement,index,destinations,reduced=false,onCue=()=>{}){
 if(!SPECIAL_DESTINATIONS[kind])return null;
 const source=boardElement.children[index];if(!source)return null;
 const rect=source.getBoundingClientRect(),br=boardElement.getBoundingClientRect();
 const target=destinations[SPECIAL_DESTINATIONS[kind]]||boardElement,tr=target.getBoundingClientRect();
 const origin={x:rect.x+rect.width/2,y:rect.y+rect.height/2},end={x:tr.x+tr.width/2,y:tr.y+tr.height/2};
 const overlay=document.createElement('div');overlay.className='special-flight-layer';overlay.setAttribute('aria-hidden','true');document.body.append(overlay);
 const tint={heart:'#ff80b0',crystal:'#7ceaff',hourglass:'#b2a2ff',reset:'#9bf9eb'}[kind];overlay.style.setProperty('--effect-tint',tint);
 const ring=document.createElement('div');ring.className='special-arrival-ring';overlay.append(ring);
 const changed=[],boardStyle=boardElement.getAttribute('style');let flyer,trails=[],landing;
 if(kind==='reset'){
 landing=singleCardTarget(boardElement);
 // Read every original rectangle before taking any card out of grid flow.
 for(const el of boardElement.children){if(el.classList.contains('collected')||el.classList.contains('board-rock'))continue;const r=el.getBoundingClientRect(),art=el.querySelector('.sprite');changed.push({el,x:r.x+r.width/2,y:r.y+r.height/2,width:r.width,height:r.height,style:el.getAttribute('style'),art,artStyle:art?.getAttribute('style'),artSize:art?.getBoundingClientRect().width||0});}
 changed.forEach(p=>{const {el,x,y,width,height,art,artSize}=p;el.style.cssText+=';position:fixed;box-sizing:border-box;transition:none;animation:none;margin:0;left:'+(x-width/2)+'px;top:'+(y-height/2)+'px;width:'+width+'px;height:'+height+'px;z-index:7;will-change:transform;';if(art){art.style.setProperty('width',artSize+'px','important');art.style.setProperty('height',artSize+'px','important');}});


 }else{
 const art=source.querySelector('.sprite,.special');if(art){flyer=document.createElement('span');flyer.className='special-flying-art';flyer.style.backgroundImage="url('assets/specials-v13.webp')";flyer.style.backgroundSize='500% auto';flyer.style.backgroundPosition='calc('+art.style.getPropertyValue('--special')+' * 25%) center';flyer.style.backgroundRepeat='no-repeat';flyer.style.setProperty('--special',art.style.getPropertyValue('--special'));overlay.append(flyer);}
 for(let i=0;i<5;i++){const dot=document.createElement('i');dot.className='special-trail';overlay.append(dot);trails.push(dot);}
 }
 planRewind(changed);
 if(kind==='crystal'&&flyer){flyer.classList.add('shield-flying-art');flyer.style.backgroundImage="url('assets/abilities-v4.webp')";flyer.style.backgroundSize='300% 100%';flyer.style.backgroundPosition='right center';}
 const timing=rewindTiming(changed,reduced);
 const duration=kind==='reset'?timing.duration:effectDuration(reduced);let mergedCue=false,shieldArrived=false,mergeStage=0;
 const ringAt=(x,y,p)=>{ring.style.left=x+'px';ring.style.top=y+'px';ring.style.opacity=String(Math.sin(clamp(p)*Math.PI));ring.style.transform='translate(-50%,-50%) scale('+(0.6+p*2)+')';};
 return {duration,draw(elapsed){
 const t=clamp(elapsed/duration);
 if(kind==='crystal'){const badge=destinations.health.querySelector('.health-shield');badge?.classList.toggle('shield-forming',t<.72);if(t>=.72&&!shieldArrived){shieldArrived=true;badge?.classList.add('shield-restored');onCue('shield-arrive');}}
 if(reduced&&kind!=='reset'){if(flyer){flyer.style.left=end.x+'px';flyer.style.top=end.y+'px';flyer.style.transform='translate(-50%,-50%)';flyer.style.opacity=String(Math.sin(t*Math.PI));}trails.forEach(dot=>dot.style.display='none');ringAt(end.x,end.y,t);return;}
 if(kind==='reset'){
 const cx=br.x+br.width/2,cy=br.y+br.height/2;
 // Fold each line symmetrically, then converge its survivors at the board center.
 const mergeDone=elapsed>=timing.mergeDuration;
 const mergeT=mergeDone?1:clamp(elapsed/timing.mergeDuration)*timing.stages/4;
 // Keep the board bounds stable while the centered survivor grows into place.
 changed.forEach(({el,x,y,width,height,path,absorbStage,art,artSize})=>{
 const p=rewindPathPosition(path,mergeT);
 const landingT=clamp((elapsed-timing.mergeDuration)/timing.settleDuration);
 const frame=rewindLanding(path.at(-1),{width,height},landing,landingT);
 const final=absorbStage===4&&mergeDone;
 const w=final?frame.width:width,h=final?frame.height:height;
 el.style.transform='translate3d('+((final?frame.x:p.x)-x)+'px,'+((final?frame.y:p.y)-y)+'px,0) scale('+(w/width)+','+(h/height)+')';
 if(final&&art){const size=artSize+(landing.artSize-artSize)*ease(landingT);art.style.setProperty('width',(size/(w/width))+'px','important');art.style.setProperty('height',(size/(h/height))+'px','important');art.style.opacity=String(1-ease((landingT-.8)/.2));}
 const arrival=[.25,.5,.75,1][absorbStage];
 el.style.opacity=String(absorbStage===4?1:1-ease((mergeT-(arrival-.06))/.06));
 });
 const stage=mergeDone?timing.stages:Math.floor(mergeT*2)*2;
 if(stage>mergeStage){mergeStage=stage;onCue(mergeDone?'rewind-settle':'rewind-fold');}
 ringAt(landing.x,landing.y,clamp((elapsed-timing.mergeDuration)/timing.settleDuration));

 }else{
 const p=clamp(t/.72),pos=flightPosition(origin,end,p);
 if(flyer){flyer.style.left=pos.x+'px';flyer.style.top=pos.y+'px';flyer.style.transform=kind==='crystal'?'translate(-50%,-50%)':'translate(-50%,-50%) scale('+(1+.15*Math.sin(p*Math.PI)-.35*p)+') rotate('+(kind==='hourglass'?360*p:Math.sin(p*Math.PI)*-12)+'deg)';flyer.style.opacity=String(1-clamp((t-.75)/.18));}
 trails.forEach((dot,i)=>{const q=clamp(p-i*.045),v=flightPosition(origin,end,q);dot.style.left=v.x+'px';dot.style.top=v.y+'px';dot.style.opacity=String((1-i/6)*Math.sin(p*Math.PI)*.8);});
 ringAt(end.x,end.y,clamp((t-.62)/.38));
 }
 },clear(){if(kind==='reset'){boardStyle===null?boardElement.removeAttribute('style'):boardElement.setAttribute('style',boardStyle);}destinations.health?.querySelector('.health-shield')?.classList.remove('shield-forming','shield-restored');overlay.remove();changed.forEach(({el,style,art,artStyle})=>{style===null?el.removeAttribute('style'):el.setAttribute('style',style);if(art)artStyle===null?art.removeAttribute('style'):art.setAttribute('style',artStyle);});}};
}

// A full-health refill becomes a local reward burst rather than flying to the HUD.
export function createHeartOverflow(boardElement,index,reduced=false){
 const source=boardElement.children[index];if(!source)return null;
 const r=source.getBoundingClientRect(),layer=document.createElement('div');
 layer.className='special-flight-layer';layer.setAttribute('aria-hidden','true');document.body.append(layer);
 const particles=Array.from({length:reduced?6:10},(_,i)=>{
  const dot=document.createElement('i');const angle=i*Math.PI*2/(reduced?6:10)+.17;
  dot.style.cssText='position:absolute;left:'+(r.x+r.width/2)+'px;top:'+(r.y+r.height/2)+'px;width:8px;height:8px;border-radius:50%;background:'+(i%2?'#ffd971':'#ff8fbb')+';box-shadow:0 0 7px currentColor;pointer-events:none;';
  dot.style.color=i%2?'#ffd971':'#ff8fbb';layer.append(dot);return {dot,angle,distance:(reduced?20:35)+(i%3)*9};
 });
 const duration=reduced?300:520;
 return {duration,draw(elapsed){const t=clamp(elapsed/duration),travel=1-(1-t)**3;
  for(const {dot,angle,distance} of particles){dot.style.transform='translate('+(-4+Math.cos(angle)*distance*travel)+'px,'+(-4+Math.sin(angle)*distance*travel)+'px) scale('+(1-t*.6)+')';dot.style.opacity=String((1-t)*Math.min(1,t*12));}
 },clear(){layer.remove();}};
}
