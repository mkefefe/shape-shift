// Presentation only: rewards are saved before this animation starts.
export async function animateQuestRedemption(cards,{reduced=false,sound=()=>{}}={}){
 const animations=[],layers=[],duration=reduced?180:1450;
 const clock=window.ShapeShiftPlatform||window;
 const timer=clock.setTimeout(()=>{
  if(cards.some(card=>card.isConnected&&card.closest('dialog')?.open))sound('quest-release');
 },reduced?100:950);
 let ending;
 if(!reduced){ending=document.createElement('div');ending.className='quest-ending-layer';ending.setAttribute('popover','manual');ending.setAttribute('aria-hidden','true');document.body.append(ending);if(ending.showPopover)ending.showPopover();layers.push(ending);}
 try{
  for(const card of cards){
   card.classList.add('quest-redeeming');card.classList.toggle('quest-redeeming-reduced',reduced);
   if(!reduced){
    const bounds=card.getBoundingClientRect(),ns='http://www.w3.org/2000/svg';
    const rim=document.createElementNS(ns,'svg');rim.classList.add('quest-ending-rim');rim.setAttribute('viewBox',`0 0 ${bounds.width} ${bounds.height}`);Object.assign(rim.style,{left:bounds.left+'px',top:bounds.top+'px',width:bounds.width+'px',height:bounds.height+'px'});ending.append(rim);
    const left=3,right=bounds.width-3,top=3,bottom=bounds.height-3,mid=bounds.height/2,r=Math.min(18,(bounds.height-6)/2);
    const paths=[`M ${left} ${mid} V ${top+r} Q ${left} ${top} ${left+r} ${top} H ${right-r} Q ${right} ${top} ${right} ${top+r} V ${mid}`,`M ${left} ${mid} V ${bottom-r} Q ${left} ${bottom} ${left+r} ${bottom} H ${right-r} Q ${right} ${bottom} ${right} ${bottom-r} V ${mid}`];
    for(const d of paths){
     const outline=document.createElementNS(ns,'path');for(const [key,value] of Object.entries({d,pathLength:1,fill:'none',stroke:'#fff2b2','stroke-width':2.5,'stroke-linecap':'round'}))outline.setAttribute(key,value);rim.append(outline);
     animations.push(outline.animate([{strokeDasharray:'1 1',strokeDashoffset:1,opacity:0},{strokeDashoffset:.97,opacity:1,offset:.08},{strokeDashoffset:0,opacity:1,offset:.75},{strokeDashoffset:0,opacity:0}],{duration:850,delay:100,easing:'ease-in-out',fill:'both'}));
    }
    const pulse=rim.cloneNode(true);pulse.classList.add('quest-ending-pulse');ending.append(pulse);for(const path of pulse.children)path.setAttribute('stroke-width','1.5');
    animations.push(pulse.animate([{opacity:0,transform:'scale(.99)'},{opacity:.95,transform:'scale(1)',offset:.15},{opacity:0,transform:'scale(1.055,1.14)'}],{duration:480,delay:900,easing:'ease-out',fill:'both'}));
    for(let i=0;i<18;i++){
     const angle=i*Math.PI*2/18,cx=bounds.left+bounds.width/2,cy=bounds.top+bounds.height/2;
     const spark=document.createElement('i');spark.className='quest-ending-ember';Object.assign(spark.style,{left:cx+Math.cos(angle)*bounds.width*.44+'px',top:cy+Math.sin(angle)*bounds.height*.43+'px'});ending.append(spark);
     animations.push(spark.animate([{opacity:0,transform:'translate(0,0) scale(.3)'},{opacity:1,offset:.14},{opacity:.7,offset:.45},{opacity:0,transform:`translate(${Math.cos(angle)*(20+i%3*8)}px,${Math.sin(angle)*25-10}px) scale(.1)`}],{duration:500,delay:900+i%3*25,easing:'ease-out',fill:'both'}));
    }
    const layer=document.createElement('span');layer.className='quest-finish-light';layer.setAttribute('aria-hidden','true');card.append(layer);layers.push(layer);
    const fill=document.createElement('i');fill.className='quest-finish-fill';layer.append(fill);animations.push(fill.animate([{clipPath:'inset(0 100% 0 0)',opacity:0},{clipPath:'inset(0 90% 0 0)',opacity:.9,offset:.12},{clipPath:'inset(0 0% 0 0)',opacity:.9,offset:.64},{clipPath:'inset(0 0% 0 0)',opacity:.9,offset:.83},{clipPath:'inset(0 0% 0 0)',opacity:0}],{duration:1150,easing:'ease-in-out',fill:'both'}));
    for(let i=0;i<7;i++){
     const twinkle=document.createElement('i');twinkle.className='quest-finish-twinkle';twinkle.style.left=(12+i*12)+'%';twinkle.style.top=([20,65,32,72,22,60,38][i])+'%';layer.append(twinkle);
     animations.push(twinkle.animate([{opacity:0,transform:'translateY(3px) scale(.15) rotate(-15deg)'},{opacity:1,transform:'translateY(0) scale(1) rotate(0deg)',offset:.35},{opacity:0,transform:'translateY(-7px) scale(.2) rotate(30deg)'}],{duration:350,delay:690+i*22,easing:'ease-out',fill:'both'}));
    }
    const glow=document.createElement('i');glow.className='quest-finish-glow';layer.append(glow);
    animations.push(glow.animate([{opacity:0},{opacity:.85,offset:.28},{opacity:.35,offset:.65},{opacity:0}],{duration,fill:'both'}));
    const shine=document.createElement('i');shine.className='quest-finish-shine';layer.append(shine);
    animations.push(shine.animate([{transform:'translateX(-160%)',opacity:0},{opacity:.7,offset:.2},{opacity:.7,offset:.65},{transform:'translateX(420%)',opacity:0}],{duration:760,easing:'ease-in-out',fill:'both'}));
    for(let i=0;i<14;i++){
     const spark=document.createElement('i');spark.className='quest-finish-spark';spark.style.left=(15+(i*29)%70)+'%';spark.style.top=(24+(i*17)%52)+'%';spark.style.width=spark.style.height=(i%3===0?3:2)+'px';layer.append(spark);
     const angle=i*2.39996,dx=Math.cos(angle)*(18+i%4*5),dy=Math.sin(angle)*20-14;
     animations.push(spark.animate([{opacity:0,transform:'translate(0,0) scale(.4)'},{opacity:1,offset:.22},{opacity:.8,offset:.55},{opacity:0,transform:`translate(${dx}px,${dy}px) scale(.2)`}],{duration:650,delay:100+i%5*35,easing:'ease-out',fill:'both'}));
    }
   }
   animations.push(card.animate([{opacity:1,transform:'scale(1)'},{opacity:1,transform:'scale(1)',offset:.74},{opacity:0,transform:reduced?'scale(1)':'translateY(-8px) scale(.95)'}],{duration:reduced?180:1230,easing:'ease-in-out',fill:'forwards'}));
  }
  await Promise.all(animations.map(animation=>animation.finished.catch(()=>{})));
 }finally{
  clock.clearTimeout(timer);for(const layer of layers)layer.remove();for(const animation of animations)animation.cancel();
 }
}
