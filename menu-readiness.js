import {prepareMenuImage,decodeMenuImage} from './menu-preload.js?v=494200';
import {loadDestination} from './destination-loader.js?v=494200';

// A cached download is not necessarily decoded. Hold each destination until its
// artwork can actually be painted, including the first visit after loading.
export function createAssetReadiness(prepare=prepareMenuImage){
 const ready=new Set(),pending=new Map();
 const key=src=>new URL(src,globalThis.document?.baseURI||'https://game.invalid/').href;
 return {
  has(sources){return sources.every(src=>ready.has(key(src)));},
  async prepare(sources){
   const queue=[...new Set(sources.filter(Boolean))];let cursor=0;
   async function worker(){while(cursor<queue.length){const src=queue[cursor++],id=key(src);if(ready.has(id))continue;
    if(!pending.has(id)){const job=Promise.resolve().then(()=>prepare(src)).then(()=>{ready.add(id);});pending.set(id,job);job.then(()=>pending.delete(id),()=>pending.delete(id));}
    await pending.get(id);
   }}
   const results=await Promise.allSettled([worker(),worker()]);const failure=results.find(result=>result.status==='rejected');if(failure)throw failure.reason;
  }
 };
}

export function bindPreparedDialog(dialog,{sources,assets,extra=async()=>{},paint=async()=>{},paintReady=()=>true,load=loadDestination}){
 const show=dialog.showModal.bind(dialog),close=dialog.close.bind(dialog);let generation=0,controller,extraReady=false;
 const prepare=async()=>{await Promise.all([assets.prepare(sources()),extraReady?Promise.resolve():extra().then(()=>{extraReady=true;})]);await paint();};
 dialog.showModal=()=>{
  if(dialog.open||controller)return;
  const list=sources();
  if(extraReady&&assets.has(list)&&paintReady()){show();return;}
  const token=++generation;controller=new AbortController();
  load(dialog.querySelector('h2')?.textContent||'Loading',prepare,{signal:controller.signal}).then(ok=>{
   if(token!==generation)return;controller=null;
   if(ok&&dialog.isConnected&&!dialog.open){show();dialog.querySelector('[autofocus],button:not([disabled]),input')?.focus({preventScroll:true});}
  });
 };
 dialog.close=(...args)=>{generation++;controller?.abort();controller=null;return close(...args);};
 return {prepare};
}

const HOME_ART=['assets/mode-cards-v101.webp','assets/avatars-v7.webp','assets/delivery-v144/settings-v351.webp','assets/delivery-v144/quests-v351.webp','assets/delivery-v144/browser-shop-hd1.webp','assets/delivery-v144/browser-leaderboard-hd1.webp','assets/delivery-v144/achievements-v350.webp','assets/delivery-v144/xp-gold-painted-v335.webp'];
const COMMON=['assets/delivery-v144/menu-panel-v240.webp','assets/delivery-v144/action-v45.webp','assets/close-v45.webp','assets/coin-v10.webp','assets/delivery-v144/xp-gold-painted-v335.webp'];
const frames=()=>['gold','ice','blossom','cosmic'].map(name=>`assets/avatar-frame-${name}-${Math.min(4,Math.max(1,Math.ceil(globalThis.devicePixelRatio||1)))}x-v49462.webp`);
const images=(root,promote=false)=>[...root.querySelectorAll('img')].map(image=>{
 if(promote){if(image.dataset.src){image.src=image.dataset.src;delete image.dataset.src;}image.loading='eager';}
 return image.dataset.src||image.currentSrc||image.getAttribute('src');
}).filter(Boolean);

// Scores are useful before remote player portraits arrive. In particular, newly
// fetched rows must not hold a hidden leaderboard behind their lazy image decode.
const dialogImages=dialog=>[...dialog.querySelectorAll('img')].filter(image=>
 dialog.id!=='leaderboard-dialog'||!image.closest?.('#leaderboard-rows,#leaderboard-personal'));
const promoteImage=image=>{if(image.dataset.src){image.src=image.dataset.src;delete image.dataset.src;}image.loading='eager';};

export function initMenuReadiness({getProfile,skinSources=[],prepareSkins=async()=>{},idle=()=>true,root=document}){
 const assets=createAssetReadiness();let homeRequest=null,homeController;
 const homeRoots=()=>['#home','.topbar','#profile-open'].map(selector=>root.querySelector(selector)).filter(Boolean);
 const homeImages=()=>[...new Set(homeRoots().flatMap(node=>[...node.querySelectorAll('img')]))];
 const decodedHomeImages=new WeakSet();
 const homeSources=()=>{const profile=getProfile(),world=profile.equipped?.background||'garden',frame=profile.equipped?.frame;return [...HOME_ART,...COMMON,world==='garden'?'assets/delivery-v144/home-world-v101.webp':'assets/worlds-v12.webp',...frames().filter(src=>src.includes('-'+frame+'-')),...homeRoots().flatMap(node=>images(node))];};
 const prepareHome=async()=>{
  await assets.prepare(homeSources());homeRoots().forEach(node=>images(node,true));
  // Decode the actual lazy DOM nodes too, including the floating profile avatar
  // outside #home. A retained atlas alone does not make a new <img> paint ready.
  await Promise.all(homeImages().map(async image=>{await decodeMenuImage(image);decodedHomeImages.add(image);}));
 };
 const menuSources=dialog=>{
  const id=dialog.id,list=[...COMMON,...dialogImages(dialog).map(image=>{promoteImage(image);return image.currentSrc||image.getAttribute('src')||image.src;}).filter(Boolean)];
  if(/profile|shop/.test(id))list.push('assets/avatars-v7.webp','assets/worlds-v12.webp','assets/delivery-v144/home-world-v101.webp','assets/garden-v2.webp',...frames(),...skinSources);
  if(/leaderboard/.test(id))list.push('assets/avatars-v7.webp',...frames());
  if(/achievements/.test(id))list.push('assets/achievement-medals-v208.webp');
  return list;
 };
 const dialogs=['settings-dialog','shop-dialog','profile-dialog','leaderboard-dialog','quests-dialog','achievements-dialog','xp-help-dialog','coin-help-dialog','coins-ad-dialog'].map(id=>root.getElementById(id)).filter(Boolean);
 const decodedDialogImages=new WeakSet();
 const preparedDialogs=dialogs.map(dialog=>bindPreparedDialog(dialog,{assets,sources:()=>menuSources(dialog),extra:()=>/profile|shop/.test(dialog.id)?prepareSkins():Promise.resolve(),paintReady:()=>dialogImages(dialog).every(image=>decodedDialogImages.has(image)),paint:()=>Promise.all(dialogImages(dialog).map(async image=>{
  // Rendering the menu may have replaced its images while assets were loading.
  // Promote the actual nodes being decoded, not just the earlier source list.
  promoteImage(image);await decodeMenuImage(image);decodedDialogImages.add(image);
 } ))}));
 return {
  homeReady:()=>assets.has(homeSources())&&homeImages().every(image=>decodedHomeImages.has(image)),
  prepareHome,
  async prepareAll(){await prepareHome();await prepareSkins();for(const dialog of preparedDialogs)await dialog.prepare();},
  openHome(action){
   if(homeRequest)return homeRequest;
   homeController=new AbortController();
   homeRequest=loadDestination('Main menu',prepareHome,{signal:homeController.signal}).then(ok=>{homeRequest=null;homeController=null;if(ok){action();return true;}return false;});return homeRequest;
  },
  cancelHome(){homeController?.abort();},
  warm(){
   // Decode just one image per idle turn. Never compete with an active board.
   const queue=[...new Set([...homeSources(),...COMMON,'assets/achievement-medals-v208.webp'])];let index=0;
   async function pump(){if(!idle()){setTimeout(pump,500);return;}if(index>=queue.length){try{await prepareHome();}catch{}return;}try{await assets.prepare([queue[index++]]);}catch{}setTimeout(pump,150);}
   setTimeout(pump,300);
  }
 };
}
