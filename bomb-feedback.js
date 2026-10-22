// Small bursts at the actual cleared cells make the blast footprint readable.
export function bombDebris(host,points,reduced=false){
 const layer=document.createElement('div');layer.className='bomb-particles';layer.setAttribute('aria-hidden','true');host.append(layer);
 const r=host.getBoundingClientRect();
 for(const point of points)for(let i=0;i<(reduced?3:7);i++){
  const dot=document.createElement('i'),angle=i*2.39996,distance=16+(i%4)*9;
  dot.style.cssText=`left:${point.x-r.left}px;top:${point.y-r.top}px;background:${['#fff8cb','#ffd56a','#ffffff'][i%3]};width:${4+i%3}px;height:${4+i%3}px`;layer.append(dot);
  dot.animate([{transform:'translate(-50%,-50%) scale(1)',opacity:1},{transform:`translate(calc(-50% + ${Math.cos(angle)*distance}px),calc(-50% + ${Math.sin(angle)*distance}px)) scale(.2)`,opacity:0}],{duration:reduced?250:500+i*30,fill:'forwards',easing:'ease-out'});
 }
 window.ShapeShiftPlatform.setTimeout(()=>layer.remove(),750);
}
export function bombFeedback(host,x,y,reduced=false){
 const layer=document.createElement('div');layer.className='bomb-particles';host.append(layer);
 const r=host.getBoundingClientRect();
 for(let i=0;i<(reduced?8:28);i++){
  const dot=document.createElement('i'),angle=i*2.39996,distance=30+(i%7)*12;
  dot.style.cssText=`left:${x-r.left}px;top:${y-r.top}px;background:${['#fff5b0','#ffbe40','#ff7650'][i%3]};width:${4+i%4}px;height:${4+i%4}px`;layer.append(dot);
  dot.animate([{transform:'translate(-50%,-50%) scale(1.5)',opacity:1},{transform:`translate(calc(-50% + ${Math.cos(angle)*distance}px),calc(-50% + ${Math.sin(angle)*distance}px)) scale(.2)`,opacity:0}],{duration:reduced?250:600+i%5*40,fill:'forwards',easing:'ease-out'});
 }
 if(!reduced)host.animate([{translate:'0 0'},{translate:'-3px 1px'},{translate:'3px -1px'},{translate:'0 0'}],{duration:240});
 window.ShapeShiftPlatform.setTimeout(()=>layer.remove(),850);
}

// Shape Drop uses a warmer, wider blast than the board-cell feedback.
export function dropBombFeedback(host,x,y,reduced=false){
 const layer=document.createElement('div');
 layer.className='bomb-particles drop-bomb-burst';layer.setAttribute('aria-hidden','true');
 layer.style.cssText='position:absolute;inset:0;pointer-events:none;z-index:30;overflow:hidden;display:block';
 host.append(layer);
 const r=host.getBoundingClientRect(),count=reduced?12:64;
 const radius=Math.min(220,Math.max(110,r.width*.42));
 for(let i=0;i<count;i++){
  const spark=document.createElement('i'),angle=i*2.39996323;
  const streak=i%3===0,size=streak?6:7+i%5;
  const distance=(reduced?32:radius)*(.35+.65*((i*17)%count)/count);
  const dx=Math.cos(angle)*distance,dy=Math.sin(angle)*distance;
  const color=['#ff4038','#ff6240','#ff982f','#ff343f','#ffb35a'][i%5];
  spark.style.cssText=`position:absolute;left:${x-r.left}px;top:${y-r.top}px;width:${streak?24:size}px;height:${size}px;border-radius:50%;background:${color};box-shadow:0 0 7px ${color};pointer-events:none`;
  layer.append(spark);
  const pose=(px,py,scale)=>`translate(calc(-50% + ${px}px),calc(-50% + ${py}px)) rotate(${angle}rad) scale(${scale})`;
  spark.animate([
   {transform:pose(0,0,1.6),opacity:1,offset:0},
   {transform:pose(dx*.78,dy*.78,1),opacity:1,offset:.45},
   {transform:pose(dx,dy+(reduced?4:28),.15),opacity:0,offset:1}
  ],{duration:reduced?380:750+(i%7)*65,fill:'forwards',easing:'linear'});
 }
 if(!reduced)host.animate([{translate:'0 0'},{translate:'-3px 2px'},{translate:'3px -2px'},{translate:'-1px 1px'},{translate:'0 0'}],{duration:220});
 window.ShapeShiftPlatform.setTimeout(()=>layer.remove(),1200);
}
