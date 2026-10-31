// Keep optional mode engines out of the first-play module graph. A failed import
// can be retried; repeated taps share one initialization and one opening action.
export function createLazyMode(factory,{onReady=()=>{}}={}){
 let instance,pending,opening;
 async function prepare(){
  if(instance)return instance;
  if(!pending)pending=Promise.resolve().then(factory).then(value=>{
   if(typeof value?.open!=='function')throw new Error('Game mode unavailable');
   onReady(value);instance=value;return value;
  }).finally(()=>{pending=null;});
  return pending;
 }
 return {prepare,open({shouldOpen=()=>true}={}){
  if(!opening)opening=prepare().then(async mode=>{
   if(!shouldOpen())return false;
   await mode.prepare?.();
   // Back/Escape may close the Games menu while its artwork is downloading.
   // Keep that menu visible until everything needed to draw the board is ready.
   return shouldOpen()?mode.open():false;
  }).finally(()=>{opening=null;});
  return opening;
 }};
}
