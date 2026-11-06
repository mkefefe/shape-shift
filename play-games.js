import {ACHIEVEMENTS} from './achievements.js?v=494248';

// Only the signed Android wrapper has this capability. Web/personal previews
// must never submit their local progress to a Google account.
export function googleAchievementsAvailable(host=globalThis.window){
 try{return host?.location?.hostname==='appassets.androidplatform.net'&&host.ShapeShiftGames?.configured()===true;}catch{return false;}
}
export function syncGoogleAchievements(state,host=globalThis.window){
 if(!googleAchievementsAvailable(host))return false;
 const keys=ACHIEVEMENTS.filter(a=>state?.unlocked?.includes(a.id)).map(a=>a.id);
 try{host.ShapeShiftGames.sync(JSON.stringify(keys));return true;}catch{return false;}
}
