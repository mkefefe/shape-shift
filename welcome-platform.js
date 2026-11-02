import {TERMS_VERSION} from './terms.js';
export const RANKING_AGREEMENT_KEY='shape-shift-ranking-agreement-v1';
// A native Java interface, not the user agent: mobile web also skips onboarding.
export const nativeWelcome=(host=globalThis.window)=>typeof host?.ShapeShiftClipboard?.copyPlayerId==='function';
export function rankingAgreement(storage=globalThis.localStorage,host=globalThis.window){
 if(nativeWelcome(host))return true;
 try{return storage?.getItem(RANKING_AGREEMENT_KEY)==='yes'||storage?.getItem('shape-shift-terms')===TERMS_VERSION;}catch{return false;}
}
export async function runWelcome({native,terms,audience,statistics,storage}){
 if(native){const agreed=await terms();await audience();await statistics(agreed);return;}
 // Resume an existing choice only. No dialog, age assumption, or new opt-in.
 let agreed=false;try{agreed=storage?.getItem('shape-shift-terms')===TERMS_VERSION&&storage?.getItem('shape-shift-statistics')==='yes';}catch{}
 if(agreed)await statistics(true);
}
