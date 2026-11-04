// Pointer/keyboard timestamps use the browser clock; platform time subtracts
// paused time. Map between them without rewinding a frame already rendered.
export function pianoInputClock(eventTime,now,platformNow,previous=platformNow,stallMilliseconds=1000){
 // Detect the whole foreground gap before compensating an old queued event.
 // Otherwise one stall can split into two ordinary updates and skip notes.
 if(platformNow-previous>stallMilliseconds)return platformNow;
 const age=Number.isFinite(eventTime)&&eventTime>0&&eventTime<=now?Math.min(1000,now-eventTime):0;
 return Math.max(previous,platformNow-age);
}
// Independent physical inputs can play different strips together. Reusing a
// strip transfers only that strip, so an older finger cannot release its replacement.
export function createPianoInput({getGame,enabled=()=>true,onChange=()=>{},onPress=()=>{}}){
 const owners=new Map(),lanes=new Map();
 function release(id){
  const owner=owners.get(id);if(!owner)return;owners.delete(id);
  if(lanes.get(owner.lane)===id){lanes.delete(owner.lane);getGame()?.release(owner.lane);}
  onChange();
 }
 function reset(){for(const id of [...owners.keys()])release(id);}
 function flush(){
  const game=getGame();if(!enabled()||!game?.started||game.paused||game.over||game.countdown>0)return;
  let changed=false;
  for(const owner of owners.values())if(owner.pending){owner.pending=false;game.pressStrip(owner.lane);changed=true;}
  if(changed)onChange();
 }
 function press(lane,id){
  const game=getGame();
  if(!Number.isInteger(lane)||lane<0||lane>=4||!enabled()||!game?.started||game.paused||game.over)return false;
  if(owners.has(id))return true;
  if(lanes.has(lane))release(lanes.get(lane));
  const owner={id,lane,pending:!(game.countdown>0||game.recoverySeconds>0)};
  owners.set(id,owner);lanes.set(lane,id);onPress(lane);flush();return true;
 }
 return {press,release,reset,flush};
}

export function bindPianoKeyboard({host,dialog,active,press,release,pause}){
 const media=host.matchMedia('(hover: hover) and (pointer: fine)');
 const keys=['a','s','d','f'],held=new Set();let row,keyboardUsed=false;
 const keyOf=event=>/^Key[ASDF]$/.test(event.code)?event.code.slice(3).toLowerCase():String(event.key||'').toLowerCase();
 const paint=lane=>row?.querySelectorAll('kbd').forEach((el,i)=>{if(lane<0)el.classList.remove('pressed');else if(i===lane)el.classList.add('pressed');});
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
  reset();row=dialog.ownerDocument.createElement('div');row.className='piano-key-labels';row.setAttribute('aria-label','Keyboard strips, left to right: A, S, D, F. Hold a key for an optional longer tone.');
  for(const key of keys){const label=dialog.ownerDocument.createElement('kbd');label.textContent=key.toUpperCase();row.append(label);}
  dialog.append(row);sync();return media.matches||keyboardUsed;
 }};
}
