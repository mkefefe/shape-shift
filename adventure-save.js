// Keep a failed campaign write available for retry without replaying rewards.
export function createAdventureSave(storage){
 let pending=null;
 const retry=()=>{if(pending===null)return true;try{storage.setItem('shape-shift-adventure-v1',pending);pending=null;return true;}catch{return false;}};
 return {write(progress){pending=JSON.stringify(progress);return retry();},retry,hasPending:()=>pending!==null};
}
