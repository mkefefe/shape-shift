// Import and fully prepare a mode once, before gameplay controls are released.
// A failed asset attempt can be retried without initializing another game.
export function createLazyMode(factory,{onReady=()=>{}}={}){
 let instance,pending,preparing,prepared=false,opening;
 async function initialize(){
  if(instance)return instance;
  if(!pending)pending=Promise.resolve().then(factory).then(value=>{
   if(typeof value?.open!=='function')throw new Error('Game mode unavailable');
   instance=value;return value;
  }).finally(()=>{pending=null;});
  return pending;
 }
 function prepare(){
  if(prepared)return Promise.resolve(instance);
  if(!preparing)preparing=initialize().then(async mode=>{
   if(await mode.prepare?.()===false)throw new Error('Game mode assets unavailable');
   onReady(mode);prepared=true;return mode;
  }).finally(()=>{preparing=null;});
  return preparing;
 }
 return {prepare,isReady:()=>prepared,open({shouldOpen=()=>true}={}){
  if(!opening)opening=prepare().then(async mode=>{
   if(!shouldOpen())return false;
   // Back/Escape may close the Games menu while its artwork is downloading.
   // Keep that menu visible until everything needed to draw the board is ready.
   return shouldOpen()?mode.open():false;
  }).finally(()=>{opening=null;});
  return opening;
 }};
}
