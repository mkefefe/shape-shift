const LESSONS={
 drop:[['Tap where you want to drop','drop']],
 slice:[['Swipe shapes','slice']],
 piano:[['Tap the correct strip','tap'],['Hold the glowing strip','held']]
};
export function createMiniTutorial(mode,{storage=globalThis.window.ShapeShiftPlatform.storage,doc=globalThis.document}={}){
 const key='shape-shift-learn-'+mode+'-v1';let step=0,node=null,done=false;
 try{done=storage.getItem(key)==='done';}catch{}
 function paint(){if(node)node.textContent=LESSONS[mode][step][0];}
 return {
  mount(parent){node?.remove();node=null;if(done)return;node=doc.createElement('p');node.className='mini-teaching';node.setAttribute('role','status');node.setAttribute('aria-live','polite');parent.append(node);paint();},
  event(action){if(done||action!==LESSONS[mode][step][1])return;step++;if(step===LESSONS[mode].length){done=true;try{storage.setItem(key,'done');}catch{}node?.remove();node=null;}else paint();},
  clear(){node?.remove();node=null;},
  get complete(){return done;}
 };
}
