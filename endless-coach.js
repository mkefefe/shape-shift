export function tutorialChangeMessage(previous,current){
 if(!previous)return 'Look at your shape above.';
 const shape=previous.shape!==current.shape,color=previous.color!==current.color;
 return shape&&color?'Your shape and color changed. Look again.':shape?'Your shape changed. Look again.':color?'Your color changed. Look again.':'Same shape and color. Keep matching!';
}
// Coaching uses real Endless choices and the normal scoring/expiry pipeline.
export function createEndlessCoach({doc=document,complete=()=>{},resetTimer=()=>{}}={}){
 let rounds=0,choices=[],current,node,introducing=true,previousHand=null,helping=false,previousCurrent=null;
 const noMatch=()=>rounds===4||rounds===8;
 const needsExplanation=()=>rounds<3||rounds===4;
 function position(){if(!node)return;const r=doc.getElementById('game').getBoundingClientRect(),focus=doc.getElementById('current-sprite').parentElement.getBoundingClientRect();node.style.setProperty('--coach-left',(r.left+r.width/2)+'px');node.style.setProperty('--coach-top',(focus.bottom+12)+'px');node.style.setProperty('--coach-width',Math.max(0,r.width-24)+'px');}
 const reduced=()=>doc.defaultView.matchMedia('(prefers-reduced-motion: reduce)').matches;
 function handRect(){return doc.querySelector('.coach-pointer')?.getBoundingClientRect();}
 function clear(){doc.querySelectorAll('.coach-pointer').forEach(n=>n.remove());doc.querySelectorAll('.coach-target').forEach(n=>n.classList.remove('coach-target'));}
 function point(target,top=false,from=null){
  if(!target)return;target.classList.add('coach-target');
  const hand=doc.createElement('img');hand.src='assets/ability-hand-v169.webp';hand.className='coach-pointer'+(top?' coach-look-pointer':'');hand.alt='';hand.setAttribute('aria-hidden','true');
  const anchor=top?target:target.querySelector('.sprite')||target,host=top?target.parentElement:target;
  const rect=anchor.getBoundingClientRect(),box=host.getBoundingClientRect(),size=top?52:58;
  hand.style.left=((rect.left-box.left+rect.width*.35-size*.9)/box.width*100)+'%';hand.style.top=((rect.top-box.top+rect.height*.35-size*.85)/box.height*100)+'%';host.append(hand);
  if(from&&!reduced()){
   const end=hand.getBoundingClientRect(),dx=from.left-end.left,dy=from.top-end.top;
   hand.animate([{transform:`translate(${dx}px,${dy}px)`,opacity:1},{transform:'translate(0,0)',opacity:1}],{duration:650,easing:'cubic-bezier(.22,.7,.24,1)'});
  }
 }
 function pointChoice(from){point(doc.getElementById('board').children[choices.findIndex(t=>t.shape===current.shape||t.color===current.color)],false,from);}
 function close(){doc.defaultView.removeEventListener('resize',position);clear();node?.remove();node=null;previousHand=null;doc.getElementById('game').classList.remove('endless-coaching','coach-introduction','coach-wait-lesson');}
 function advance(){previousHand=handRect();clear();rounds++;helping=false;introducing=needsExplanation();if(rounds===10){complete();close();}}
 return {
  get active(){return rounds<10;},get introducing(){return introducing;},
  get timerRunning(){return !introducing&&!helping&&(noMatch()||rounds>=5);},
  board(state){
   previousCurrent=current;current={...state.current};const otherShape=[0,1,2,3].find(n=>n!==current.shape&&n!==state.excludedShape),otherColor=(current.color+1)%4;
   const match=rounds===1?{shape:otherShape,color:current.color}:rounds%2===0?{shape:current.shape,color:otherColor}:{shape:otherShape,color:current.color};
   const wrong={shape:otherShape,color:otherColor};
   choices=noMatch()?[wrong,{shape:otherShape,color:(current.color+2)%4}]:rounds===0?[match]:rounds%2?[wrong,match]:[match,wrong];return choices.map(x=>({...x}));
  },
  paint(from=null){
   if(rounds>=10){close();return;}clear();if(!node){node=doc.createElement('div');node.id='endless-coach';node.setAttribute('role','status');node.setAttribute('aria-live','polite');doc.getElementById('board').before(node);doc.defaultView.addEventListener('resize',position);}
   const game=doc.getElementById('game');game.classList.add('endless-coaching');game.classList.toggle('coach-introduction',introducing);game.classList.toggle('coach-wait-lesson',noMatch());node.replaceChildren();node.classList.toggle('tutorial-panel',introducing);position();
   if(introducing){
    const title=doc.createElement('strong');title.className='board-guide-title';title.textContent=noMatch()?'Nothing matches this time.':tutorialChangeMessage(rounds===0?null:previousCurrent,current);
    const rule=doc.createElement('p');rule.textContent=noMatch()?'If neither shape nor color matches, wait.':rounds===1?'This time, match the color.':'Choose the same shape OR color.';
    const go=doc.createElement('button');go.id='coach-begin';go.className='primary board-guide-continue';go.type='button';go.textContent='Continue';go.onclick=()=>{const start=handRect();introducing=false;this.paint(start);};node.append(title,rule,go);point(doc.getElementById('current-sprite'),true,previousHand);previousHand=null;
   }else{
    node.textContent=rounds===4?'Do not tap. Let the timer run out.':rounds<3?'Tap to collect.':'Your turn. Match the shape OR color.';
    if(rounds===4)point(doc.querySelector('.timer-track'),false,from);else if(rounds<3)pointChoice(from);
   }
  },
  accept(index){
   if(rounds>=10)return true;if(introducing)return false;
   if(noMatch()){
    if(index===null){advance();return true;}
    node.replaceChildren();const title=doc.createElement('strong');title.textContent='Do not tap. Let the timer run out.';const rule=doc.createElement('p');rule.textContent='If neither shape nor color matches, wait.';node.append(title,rule);clear();point(doc.querySelector('.timer-track'));resetTimer();return false;
   }
   if(index===null){helping=true;resetTimer();node.textContent='Not a match. Try this one.';clear();pointChoice();return false;}const tile=choices[index];if(!tile)return false;
   if(tile.shape!==current.shape&&tile.color!==current.color){helping=true;node.textContent='Not a match. Try this one.';clear();pointChoice();return false;}
   advance();return true;
  },close
 };
}
