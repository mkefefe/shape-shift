// Pointer/keyboard timestamps use the browser clock; platform time subtracts
// paused time. Map between them without rewinding a frame already rendered.
export function pianoInputClock(eventTime,now,platformNow,previous=platformNow){
 const age=Number.isFinite(eventTime)&&eventTime>0&&eventTime<=now?Math.min(1000,now-eventTime):0;
 return Math.max(previous,platformNow-age);
}
// One physical input owns the active strip. A newer finger/key can take over
// without an older pointer's eventual release cancelling the replacement.
export function createPianoInput({getGame,enabled=()=>true,onChange=()=>{},onPress=()=>{}}){
 let owner=null;
 function release(id){
  if(!owner||owner.id!==id)return;
  const previous=owner;owner=null;
  getGame()?.release(previous.lane);onChange();
 }
 function reset(){if(owner)release(owner.id);}
 function flush(){
  const game=getGame();
  if(!owner?.pending||!enabled()||!game?.started||game.paused||game.over||game.countdown>0)return;
  const next=game.notes.find(n=>['waiting','partial','holding'].includes(n.status));
  // A full-song press is judged once, at its physical time. Holding an early
  // key must not silently turn it into a perfectly timed strike later.
  if(game.fullSongs&&game.practice&&(!next||next.beat-game.beat>(game.inputWindow??4.4)))return;
  owner.pending=false;game.pressStrip(owner.lane);onChange();
 }
 function press(lane,id){
  const game=getGame();
  if(!Number.isInteger(lane)||lane<0||lane>=4||!enabled()||!game?.started||game.paused||game.over)return false;
  if(owner?.id===id)return true;
  reset();owner={id,lane,pending:!(game.fullSongs&&!game.practice&&(game.countdown>0||game.recoverySeconds>0))};onPress(lane);flush();return true;
 }
 return {press,release,reset,flush};
}

export function bindPianoKeyboard({host,dialog,active,press,release,pause}){
 const media=host.matchMedia('(hover: hover) and (pointer: fine)');
 const keys=['a','s','d','f'],held=new Set();let row,keyboardUsed=false;
 const keyOf=event=>/^Key[ASDF]$/.test(event.code)?event.code.slice(3).toLowerCase():String(event.key||'').toLowerCase();
 const paint=lane=>row?.querySelectorAll('kbd').forEach((el,i)=>el.classList.toggle('pressed',i===lane));
 const reset=()=>{for(const key of held)release('key-'+key);held.clear();paint(-1);};
 function sync(){const visible=media.matches||keyboardUsed;dialog.classList.toggle('piano-desktop-keys',visible);if(row)row.hidden=!visible;}
 host.addEventListener('keydown',event=>{
  const key=keyOf(event),lane=keys.indexOf(key);
  if(lane<0||!dialog.open||!active()||event.isComposing||event.ctrlKey||event.metaKey||event.altKey||event.target?.closest?.('input,textarea,select,[contenteditable="true"]'))return;
  event.preventDefault();if(held.has(key))return;
  // Pointer capability only controls hints. Physical keyboards also work on
  // touch-primary tablets, laptops and Android devices with a keyboard.
  held.add(key);keyboardUsed=true;sync();
  if(press(lane,'key-'+key,event.timeStamp))paint(lane);else held.delete(key);
 });
 host.addEventListener('keyup',event=>{
  const key=keyOf(event);if(!held.has(key))return;
  event.preventDefault();release('key-'+key,event.timeStamp);held.delete(key);
  row?.querySelectorAll('kbd')[keys.indexOf(key)]?.classList.remove('pressed');
 });
 host.addEventListener('blur',()=>{reset();if(dialog.open)pause();});
 host.addEventListener('shape-shift-input-reset',reset);
 media.addEventListener('change',sync);
 return {reset,mount(){
  reset();row=dialog.ownerDocument.createElement('div');row.className='piano-key-labels';row.setAttribute('aria-label','Keyboard strips, left to right: A, S, D, F. Hold the key for long notes.');
  for(const key of keys){const label=dialog.ownerDocument.createElement('kbd');label.textContent=key.toUpperCase();row.append(label);}
  dialog.append(row);sync();return media.matches||keyboardUsed;
 }};
}
