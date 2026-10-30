import {fitBoard} from './board-fit.js?v=494200';
// Teach on the real match board without changing ranked state, RNG, or rewards.
export function guidedMatch({doc=document,sprite,sound=()=>{}}){
 const game=doc.getElementById('game'),board=doc.getElementById('board'),current=doc.getElementById('current-sprite'),name=doc.getElementById('current-name'),status=doc.getElementById('board-status');
 const original={children:[...board.childNodes],count:board.getAttribute('data-count'),columns:board.getAttribute('data-columns'),layout:board.getAttribute('data-layout'),linear:board.getAttribute('data-linear'),currentChildren:[...current.childNodes],boardStyle:board.getAttribute('style'),currentStyle:current.getAttribute('style'),currentClass:current.className,name:name.textContent,status:status.textContent};
 const lessons=[
  {current:{shape:2,color:0},choices:[{shape:2,color:1},{shape:0,color:2}],answer:0,text:'Tap the same shape.',success:'Same shape — that works!'},
  {current:{shape:2,color:1},choices:[{shape:1,color:0},{shape:0,color:1}],answer:1,text:'Now tap the same color.',success:'Same color works too!'},
  {current:{shape:0,color:1},choices:[{shape:0,color:2},{shape:2,color:0}],answer:0,text:'Your turn: match shape OR color.',success:'You’re ready. Keep matching!'}
 ];
 const help=doc.createElement('div');help.id='guided-match';help.setAttribute('role','status');help.setAttribute('aria-live','polite');
 const copy=doc.createElement('strong'),note=doc.createElement('span'),skip=doc.createElement('button');note.textContent='No rush. No lives lost.';skip.type='button';skip.textContent='Skip practice';help.append(copy,note);board.before(help);
 game.classList.add('guided-match-active');let step=0,selected=0,busy=false,ended=false,timer,reminder;const host=doc.defaultView;
 const hand=doc.createElement('img');hand.src='assets/delivery-v144/ability-hand-v169.webp';hand.className='guided-match-hand';hand.alt='';hand.setAttribute('aria-hidden','true');
 const attrs=(el,key,value)=>value===null?el.removeAttribute(key):el.setAttribute(key,value);
 return new Promise(resolve=>{
  function finish(){if(ended)return;ended=true;host.clearTimeout(timer);host.clearTimeout(reminder);doc.removeEventListener('keydown',keys,true);game.classList.remove('guided-match-active');help.remove();board.replaceChildren(...original.children);attrs(board,'data-count',original.count);attrs(board,'data-columns',original.columns);attrs(board,'data-layout',original.layout);attrs(board,'data-linear',original.linear);attrs(board,'style',original.boardStyle);attrs(current,'style',original.currentStyle);current.className=original.currentClass;current.replaceChildren(...original.currentChildren);fitBoard(board);name.textContent=original.name;status.textContent=original.status;resolve(true);}
  function point(){const target=board.children[lessons[step].answer];target.classList.add('guided-target');target.append(hand);}
  function choose(index){if(busy||ended)return;const lesson=lessons[step];if(index!==lesson.answer){copy.textContent='Try the glowing shape.';point();return;}busy=true;host.clearTimeout(reminder);hand.remove();sound('correct');const target=board.children[index];target.classList.add('guided-success');sprite(current,lesson.choices[index]);name.textContent='';copy.textContent=lesson.success;timer=host.setTimeout(()=>{if(++step===lessons.length){finish();return;}busy=false;paint();},650);}
  function paint(){const lesson=lessons[step];sprite(current,lesson.current);name.textContent='Match this';status.textContent='';copy.textContent=lesson.text;board.replaceChildren();board.dataset.count='2';board.dataset.columns='2';board.dataset.layout='classic';board.dataset.linear='false';selected=0;
   lesson.choices.forEach((tile,index)=>{const button=doc.createElement('button');button.type='button';button.className='choice';button.setAttribute('aria-label',index===lesson.answer?'Matching shape':'Other shape');const art=doc.createElement('span');art.className='sprite';sprite(art,tile);button.append(art);button.onclick=()=>choose(index);board.append(button);});
   // The same layout metadata drives initial paint and every resize.
   fitBoard(board);
   if(step<2)point();else reminder=host.setTimeout(point,4500);
  }
  function keys(event){if(ended||event.ctrlKey||event.metaKey||event.altKey||event.isComposing||!['Space','Enter','KeyW','KeyA','KeyS','KeyD','Escape'].includes(event.code))return;event.preventDefault();event.stopImmediatePropagation();if(event.repeat||busy)return;if(event.code==='Escape'){finish();return;}if(event.code==='Space'||event.code==='Enter'){choose(selected);return;}selected=['KeyA','KeyW'].includes(event.code)?0:1;board.querySelectorAll('.keyboard-choice').forEach(n=>n.classList.remove('keyboard-choice'));board.children[selected]?.classList.add('keyboard-choice');board.children[selected]?.focus({preventScroll:true});}
  doc.addEventListener('keydown',keys,true);skip.onclick=finish;paint();
 });
}
