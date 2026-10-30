import {skinCanvas} from './shape-skin-art.js';

export const MODE_LESSONS={
 battle:[['Match to attack','Choose the same shape OR color as your shape at the top. Each match hits the enemy.','match'],['Block the attack','When the shield lights up, tap it to block. Too early? Wait for its glow.','shield'],['Keep your hearts','Wrong matches cost a heart. Defeat an enemy to refill your hearts. Matching the enemy’s color deals double damage.','match']],
 drop:[['Aim and drop','Drag left or right, then release to drop your shape. You can also tap where you want it to land.','drop'],['Bring matches together','Touching shapes with the same shape OR color merge and score points.','match'],['Keep the pile low','Make room before the pile reaches the top. Aim for matches instead of stacking everything in one place.','drop']],
 slice:[['Swipe to slice','Swipe across a shape to cut it. Keep your finger down to slice several in one stroke.','slice'],['Watch for bombs','Leave bombs alone. Hitting one costs a heart. Missing shapes costs hearts too.','bomb']],
 piano:[['Follow the lowest note','Tap anywhere on the strip with the lowest shape. Play the notes from bottom to top.','piano'],['Hold the long notes','Keep your finger on a glowing strip until its trail is complete. Tap short notes separately.','hold'],['Keep the rhythm','A wrong strip or a missed note costs a heart. The piano follows your taps.','piano']]
};
export const modeLessonKey=mode=>'shape-shift-mode-intro-'+mode+'-v1';
const asset=path=>new URL('assets/'+path,import.meta.url).href;

// One shared first-play presentation, inside the already rendered game screen.
// Callers keep simulation and input paused until this resolves.
export function showModeIntro(mode,parent,{storage=window.ShapeShiftPlatform?.storage||window.localStorage,sound=()=>window.gameAudio?.ui('click'),seen,onComplete=()=>{}}={}){
 if(seen===undefined){try{seen=storage.getItem(modeLessonKey(mode))==='done';}catch{}}
 if(seen)return Promise.resolve(true);
 const doc=parent.ownerDocument;
 if(!doc.getElementById('mode-intro-style')){
  const style=doc.createElement('style');style.id='mode-intro-style';style.textContent=`
  .mode-intro{position:absolute;inset:0;z-index:1000;display:grid;place-items:center;padding:18px;background:#031b3266;box-sizing:border-box}
  .mode-intro-card{box-sizing:border-box;width:min(350px,100%);max-height:100%;overflow:auto;padding:24px 18px;text-align:center;color:#084a62;border:16px solid transparent;border-image:url('${asset('delivery-v144/menu-panel-v240.webp')}') 70 fill / 16px / 0 stretch;font:800 16px/1.4 Nunito,sans-serif;filter:drop-shadow(0 8px 16px #001e3444)}
  .mode-intro h2{margin:8px 0;font-size:24px;line-height:1.15}.mode-intro p{margin:10px 0 18px;min-height:66px}.mode-intro small{font-size:12px;letter-spacing:1px}
  .mode-intro button{font:900 18px Nunito,sans-serif;border:2px solid #78551b;border-radius:16px;background:linear-gradient(#ffe58a,#ffc52e);color:#533b10;padding:11px 25px;min-height:48px;min-width:150px;box-shadow:inset 0 2px #fff5c1,0 3px #9c751d;cursor:pointer}
  .mode-intro button:focus-visible{outline:3px solid #07536a;outline-offset:3px}
  .mode-intro-demo{position:relative;display:flex;align-items:center;justify-content:center;gap:12px;height:108px;margin:10px 0;background:#0a536312;border:2px solid #2f819655;border-radius:18px;overflow:hidden}
  .mode-intro-demo canvas,.mode-intro-demo>img:not(.mode-intro-hand){width:68px;height:68px;object-fit:contain}
  .mode-intro-hand{position:absolute;width:56px;height:56px;object-fit:contain;left:48%;top:51px;animation:mode-intro-tap 1s ease-in-out infinite;pointer-events:none}
  .mode-intro-demo[data-demo=slice] .mode-intro-hand{animation:mode-intro-swipe 1.5s ease-in-out infinite}
  .mode-intro-demo[data-demo=drop] canvas:first-child{animation:mode-intro-drop 1.7s ease-in-out infinite}
  .mode-intro-demo[data-demo=shield]>img:first-child{animation:mode-intro-glow 1.4s ease-in-out infinite}
  .mode-intro-demo[data-demo=piano] canvas,.mode-intro-demo[data-demo=hold] canvas{border:2px solid #27a9c6;background:#85e6f5;border-radius:9px}
  @keyframes mode-intro-tap{50%{transform:translateY(-9px)}}@keyframes mode-intro-swipe{0%,100%{transform:translateX(-65px)}60%{transform:translateX(55px)}}@keyframes mode-intro-drop{0%,20%{transform:translateY(-32px)}65%,100%{transform:translateY(12px)}}@keyframes mode-intro-glow{50%{filter:brightness(1.5) drop-shadow(0 0 8px #43e9ff)}}
  @media(max-height:520px){.mode-intro-card{padding:12px}.mode-intro-demo{height:72px;margin:3px}.mode-intro p{min-height:0;margin:6px 0}.mode-intro h2{font-size:21px}}
  `;doc.head.append(style);
 }
 return new Promise(resolve=>{
  const previous=doc.activeElement,children=[...parent.children].map(el=>[el,el.inert]);children.forEach(([el])=>el.inert=true);
  const layer=doc.createElement('section');layer.className='mode-intro';layer.setAttribute('role','dialog');layer.setAttribute('aria-modal','true');layer.setAttribute('aria-label','How to play');
  layer.innerHTML='<div class="mode-intro-card"><small></small><h2></h2><div class="mode-intro-demo" aria-hidden="true"></div><p></p><button type="button">Continue</button></div>';
  parent.append(layer);let step=0,finished=false;const button=layer.querySelector('button');
  const finish=complete=>{if(finished)return;finished=true;observer.disconnect();doc.removeEventListener('keydown',keys,true);doc.removeEventListener('keyup',up,true);layer.remove();children.forEach(([el,inert])=>{el.inert=inert;});if(complete){try{storage.setItem(modeLessonKey(mode),'done');}catch{}onComplete();}if(previous?.isConnected)previous.focus({preventScroll:true});resolve(complete);};
  const observer=new MutationObserver(()=>{if(!parent.isConnected||parent.tagName==='DIALOG'&&!parent.open)finish(false);});observer.observe(doc.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open']});
  const paint=()=>{const [title,copy,demo]=MODE_LESSONS[mode][step];layer.querySelector('small').textContent=`HOW TO PLAY · ${step+1} / ${MODE_LESSONS[mode].length}`;layer.querySelector('h2').textContent=title;layer.querySelector('p').textContent=copy;const art=layer.querySelector('.mode-intro-demo');art.dataset.demo=demo;art.replaceChildren();if(demo==='shield'||demo==='bomb'){const img=doc.createElement('img');img.src=asset(demo==='shield'?'delivery-v144/browser-shield-hd1.webp':'slice-bomb-v239.webp');img.alt='';art.append(img);}else{art.append(skinCanvas({shape:2,color:1}),skinCanvas({shape:0,color:1}));}if(demo!=='bomb'){const hand=doc.createElement('img');hand.className='mode-intro-hand';hand.src=asset('delivery-v144/ability-hand-v169.webp');hand.alt='';art.append(hand);}button.textContent=step===MODE_LESSONS[mode].length-1?'Let’s play':'Continue';button.focus({preventScroll:true});};
  const advance=()=>{sound();if(++step===MODE_LESSONS[mode].length)finish(true);else paint();};
  // Advance on key release so one held Space cannot also activate the game.
  let pressed=false;const keys=e=>{if(e.key==='Tab')return;e.preventDefault();e.stopImmediatePropagation();if(!e.repeat&&(e.code==='Space'||e.code==='Enter'))pressed=true;};
  const up=e=>{if(e.key==='Tab')return;e.preventDefault();e.stopImmediatePropagation();if(pressed&&(e.code==='Space'||e.code==='Enter')){pressed=false;advance();}};
  doc.addEventListener('keydown',keys,true);doc.addEventListener('keyup',up,true);button.onclick=advance;paint();
 });
}
