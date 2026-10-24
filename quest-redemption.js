// Presentation only: rewards are saved before this animation starts.
export async function animateQuestRedemption(cards,{reduced=false,sound=()=>{}}={}){
 const animations=[],layers=[],duration=reduced?180:1000;
 const clock=window.ShapeShiftPlatform||window;
 const timer=clock.setTimeout(()=>{
  if(cards.some(card=>card.isConnected&&card.closest('dialog')?.open))sound('quest-release');
 },reduced?100:700);
 try{
  for(const card of cards){
   card.classList.add('quest-redeeming');card.classList.toggle('quest-redeeming-reduced',reduced);
   if(!reduced){
    const layer=document.createElement('span');layer.className='quest-finish-light';layer.setAttribute('aria-hidden','true');card.append(layer);layers.push(layer);
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
   animations.push(card.animate([{opacity:1,transform:'scale(1)'},{opacity:1,transform:'scale(1)',offset:.68},{opacity:0,transform:reduced?'scale(1)':'translateY(-5px) scale(.98)'}],{duration,easing:'ease-in-out',fill:'forwards'}));
  }
  await Promise.all(animations.map(animation=>animation.finished.catch(()=>{})));
 }finally{
  clock.clearTimeout(timer);for(const layer of layers)layer.remove();for(const animation of animations)animation.cancel();
 }
}
