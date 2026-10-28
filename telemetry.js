import {analyticsAgeGroup,audience} from './audience.js?v=494118';
import {createEngagement,deviceContext,AGE_GROUPS} from './engagement.js';
import {TELEMETRY_BUILD,TELEMETRY_DISTRIBUTION} from './telemetry-config.js?v=494118';
const endpoint='https://shape-shift-scores.fluffy-stone-5231.chatgpt.site/api/engagement';
export const CONSENT_KEY='shape-shift-analytics-choice-v2';
// Deliberately device-local, never the portals' cloud-synced progress store.
const memory=new Map();
const storage={getItem:k=>{try{return globalThis.localStorage?.getItem(k)??memory.get(k);}catch{return memory.get(k);}},setItem:(k,v)=>{memory.set(k,v);try{globalThis.localStorage?.setItem(k,v);}catch{}},removeItem:k=>{memory.delete(k);try{globalThis.localStorage?.removeItem(k);}catch{}}};
export function choice(){try{const c=JSON.parse(storage.getItem(CONSENT_KEY)||'null');return c&&typeof c.enabled==='boolean'&&AGE_GROUPS.includes(c.age)?c:null;}catch{return null;}}
export const engagement=createEngagement({storage,context:()=>({...deviceContext(globalThis.navigator,globalThis.location),build:TELEMETRY_BUILD,distribution:TELEMETRY_DISTRIBUTION,age:choice()?.age||'unknown'}),send:async body=>{const r=await fetch(endpoint,{method:'POST',credentials:'omit',referrerPolicy:'no-referrer',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(8000),keepalive:true});return r.ok;}});
const providers=new Map();
export function registerModeState(mode,read){providers.set(mode,read);}
export function sampleEngagement(main){for(const read of providers.values()){const state=read();if(state){engagement.sample({...state,visible:main.visible});return;}}engagement.sample(main);}
export async function telemetryChoice(review=false){
 const previous=choice();if(previous&&!review){if(previous.enabled&&audience()==='adult')engagement.enable();return;}
 const wasLoading=document.documentElement.classList.contains('startup-loading'),cover=document.getElementById('startup-ready');
 if(wasLoading){document.documentElement.classList.remove('startup-loading');if(cover)cover.hidden=true;}
 const d=document.createElement('dialog');d.className='telemetry-dialog';d.style.cssText='max-height:90dvh;overflow:auto;color:#153f56;background:#e9fbff;border:3px solid #40b9d2;border-radius:24px';d.setAttribute('aria-label','Gameplay statistics');
 d.innerHTML=`<div class="dialog-content" style="padding:28px;max-width:420px;text-align:center"><h2>Gameplay statistics</h2><p>Share optional gameplay statistics: play time, modes, repeat visits, game version, and device category. A random installation ID helps count returning players. We do not send your name, photos, birthday, or hardware ID.</p><p>Used only to improve this game. Records expire after 90 days. Change your choice in Settings.</p><label style="display:block;margin:12px"><input id="analytics-testing" type="checkbox"> This is a developer/test device</label><button class="primary" id="analytics-yes">Enable statistics</button><button class="secondary" id="analytics-no">Keep statistics off</button><p id="analytics-status" role="status"></p></div>`;
 document.body.append(d);d.querySelector('#analytics-testing').checked=!!engagement.snapshot()?.test;
 if(audience()!=='adult'){d.querySelector('#analytics-yes').disabled=true;d.querySelector('#analytics-status').textContent='Statistics sharing is off for protected or unstated ages.';}
 d.addEventListener('cancel',e=>e.preventDefault());d.showModal();
 await new Promise(resolve=>{async function finish(enabled){enabled=enabled&&audience()==='adult';for(const b of d.querySelectorAll('button'))b.disabled=true;if(!enabled&&engagement.identity()){await engagement.disable({retainIdentity:true});try{const r=await fetch(endpoint,{method:'DELETE',credentials:'omit',referrerPolicy:'no-referrer',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(8000),body:JSON.stringify({install:engagement.identity()})});if(!r.ok)throw Error();}catch{d.querySelector('#analytics-status').textContent='Could not delete previous statistics. Collection is stopped. Reopen this setting to retry deletion.';await engagement.disable({retainIdentity:true});storage.setItem(CONSENT_KEY,JSON.stringify({enabled:false,age:'unknown'}));for(const b of d.querySelectorAll('button'))b.disabled=false;const leave=d.querySelector('#analytics-no');leave.textContent='Continue without sharing';leave.onclick=()=>{d.close();d.remove();resolve();};return;}}storage.setItem('shape-shift-statistics',enabled?'yes':'no');storage.setItem(CONSENT_KEY,JSON.stringify({enabled,age:enabled?(previous?.age||analyticsAgeGroup()):'unknown'}));if(enabled){engagement.enable();if(d.querySelector('#analytics-testing').checked)engagement.setTest(true);}else await engagement.disable();d.close();d.remove();resolve();}d.querySelector('#analytics-yes').onclick=()=>finish(true);d.querySelector('#analytics-no').onclick=()=>finish(false);});
 if(wasLoading){document.documentElement.classList.add('startup-loading');if(cover)cover.hidden=false;}
}

// The welcome action explicitly describes statistics beside its button. Never
// reinterpret an old refusal or silently enable statistics after an update.
export async function applyWelcomeStatistics(agreed){
 const prior=choice();
 const enabled=agreed===true&&audience()==='adult'&&prior?.enabled!==false;
 const age=enabled?(analyticsAgeGroup()!=='unknown'?analyticsAgeGroup():prior?.age||'unknown'):'unknown';
 storage.setItem(CONSENT_KEY,JSON.stringify({enabled,age}));
 if(enabled)engagement.enable();else await engagement.disable({retainIdentity:!!engagement.identity()});
}
