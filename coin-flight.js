// Fly the picked raster shape into the wallet; persistence does not wait for animation.
export const COIN_FLIGHT_MS=720;
export function coinFlightPoint(from,to,t){t=Math.max(0,Math.min(1,t));const p=t*t*(3-2*t);return {x:from.x+(to.x-from.x)*p,y:from.y+(to.y-from.y)*p-Math.sin(t*Math.PI)*30};}
export function createCoinFlight(source,target,reduced=false,revealMs=0){
 const art=source?.querySelector('.sprite');
 if(!art||!target)return null;
 const a=art.getBoundingClientRect(),b=target.getBoundingClientRect();
 const from={x:a.x+a.width/2,y:a.y+a.height/2},to={x:b.x+b.width/2,y:b.y+b.height/2};
 const flight=document.createElement('span');flight.className='shape-coin-flight';flight.setAttribute('aria-hidden','true');
 const copy=art.cloneNode(true);copy.removeAttribute('id');
 Object.assign(copy.style,{width:a.width+'px',height:a.height+'px',transform:'none',animation:'none',visibility:'visible'});
 flight.append(copy);flight.style.width=a.width+'px';flight.style.height=a.height+'px';document.body.append(flight);
 const visibility=art.style.visibility;if(!revealMs)art.style.visibility='hidden';
 const endScale=Math.min(1,Math.max(b.width,b.height)/Math.max(a.width,a.height));
 const travelMs=reduced?180:COIN_FLIGHT_MS;
 return {duration:revealMs+travelMs,elapsed:0,draw(elapsed){
  if(elapsed<revealMs){flight.style.opacity='0';return;}
  art.style.visibility='hidden';
  const t=Math.max(0,Math.min(1,(elapsed-revealMs)/travelMs)),p=reduced?to:coinFlightPoint(from,to,t);
  // Keep the complete gem visible on its journey, then dissolve into the counter.
  const shrink=Math.max(0,(t-.38)/.62),scale=1+(endScale-1)*shrink;
  flight.style.left=p.x+'px';flight.style.top=p.y+'px';flight.style.opacity=String(t>.9?(1-t)/.1:1);
  flight.style.transform='translate(-50%,-50%) scale('+scale+')';
 },clear(){flight.remove();art.style.visibility=visibility;}};
}

// Lives in the top layer so reward coins remain visible above the quest dialog.
export async function showQuestReward(source,target,amount,balance,reduced=false,options={}){
 const b=target.getBoundingClientRect();
 const to=b.width?{x:b.x+b.width/2,y:b.y+b.height/2}:{x:80,y:38};
 const groups=options.rewards?.length?options.rewards:[{amount,source}];
 const layer=document.createElement('div');layer.className='quest-reward-flight';layer.setAttribute('popover','manual');layer.setAttribute('aria-hidden','true');document.body.append(layer);
 if(layer.showPopover)layer.showPopover();else (document.querySelector('dialog[open]')||document.body).append(layer);
 const badge=document.createElement('img');badge.src='assets/coin-v10.webp';badge.alt='';
 const wallet=document.createElement('span');wallet.className='reward-wallet';wallet.style.left=to.x+'px';wallet.style.top=to.y+'px';const icon=badge.cloneNode();const count=document.createElement('strong');count.textContent=balance;wallet.append(icon,count);layer.append(wallet);
 const animations=[],arrivals=[];let credited=0;
 try{
  for(let groupIndex=0;groupIndex<groups.length;groupIndex++){
   if(groupIndex)await new Promise(resolve=>window.ShapeShiftPlatform.setTimeout(resolve,320));
   const group=groups[groupIndex],a=(group.source||source).getBoundingClientRect(),from={x:a.x+a.width/2,y:a.y+a.height/2};
   options.onCollect?.(group.amount,groupIndex);
   const receipt=document.createElement('strong');receipt.className='quest-reward-receipt';receipt.style.left=from.x+'px';receipt.style.top=from.y+'px';receipt.append('+'+group.amount,badge.cloneNode());layer.append(receipt);
   animations.push(receipt.animate([{opacity:0,transform:'translate(-50%,-35%)'},{opacity:1,transform:'translate(-50%,-65%)',offset:.2},{opacity:1,offset:.7},{opacity:0,transform:'translate(-50%,-90%)'}],{duration:reduced?260:1150,fill:'forwards'}));
   const flights=[];
   for(let i=0;i<(reduced?1:7);i++){
    const coin=badge.cloneNode();coin.className='quest-flying-coin';layer.append(coin);const spread=(i-3)*12;
    const flight=coin.animate([{opacity:0,transform:`translate(${from.x-13}px,${from.y-13}px)`},{opacity:1,offset:.12,transform:`translate(${from.x+spread-13}px,${from.y-45}px)`},{opacity:1,offset:.85},{opacity:0,transform:`translate(${to.x-13}px,${to.y-13}px)`}],{duration:reduced?180:680,delay:reduced?0:200+i*45,easing:'cubic-bezier(.25,.6,.4,1)',fill:'both'});
    animations.push(flight);flights.push(flight.finished);
   }
   // Tie the wallet sound and count to the actual last coin, not dialog cleanup.
   arrivals.push(Promise.all(flights).then(()=>{credited+=group.amount;count.textContent=balance+credited;options.onArrive?.(group.amount,groupIndex);wallet.animate([{filter:'brightness(1.5)'},{filter:'brightness(1)'}],{duration:180});}));
  }
  await Promise.all([...animations.map(a=>a.finished),...arrivals]);
  await new Promise(resolve=>window.ShapeShiftPlatform.setTimeout(resolve,180));
 }finally{layer.remove();}
}
