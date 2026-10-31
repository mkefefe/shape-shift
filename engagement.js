import {EVENTS,MILESTONES} from './experience-metrics.js';
// First-party gameplay analytics only. Never link this ID to rankings or ad IDs.
export const MODES=['adventure','endless','rush','drop','slice','piano','battle'];
export const AGE_GROUPS=['unknown','under-13','13-17','18-24','25-34','35-44','45-54','55-plus'];
const KEY='shape-shift-engagement-v2';
export function createEngagement({storage,now=()=>Date.now(),uuid=()=>crypto.randomUUID(),send=async()=>false,context=()=>({})}={}){
 let enabled=false,session=null,last=now(),inputAt=now(),hiddenAt=null,mode=null,sampledMode=null,playing=false,paused=false,queue=[],install=null,test=false,busy=false,pendingContinue=false,beforeHiddenActivity='menu';
 const read=()=>{try{return JSON.parse(storage?.getItem(KEY)||'null')||{};}catch{return {};}};
 const persist=()=>{try{storage?.setItem(KEY,JSON.stringify({install,test,queue:queue.slice(-48)}));}catch{}};
 function ensure(){if(!enabled)return;const t=now();if(!session){session={id:uuid(),measurementVersion:3,started:t,updated:t,revision:0,foreground:0,active:0,idle:0,paused:0,lastActivity:'menu',events:{},startup:{},modes:Object.fromEntries(MODES.map(m=>[m,{seconds:0,runs:0,finished:0,abandoned:0}])),test};last=t;}}
 function checkpoint(){if(!enabled||!session)return;session.updated=now();session.revision++;session.test||=test;const body={v:2,install,...context(),session:JSON.parse(JSON.stringify(session))};queue=queue.filter(x=>x.session.id!==session.id&&x.session.updated>now()-86400000);queue.push(body);persist();}
 async function flush(){if(!enabled)return;checkpoint();if(busy)return;busy=true;try{while(enabled&&queue.length){const row=queue[0];let ok=false;try{ok=await send(row);}catch{}if(!ok)break;queue=queue.filter(x=>x.session.id!==row.session.id||x.session.revision!==row.session.revision);persist();}}finally{busy=false;}}
 // Mode sampling also covers first lessons, without inventing started or ended runs.
 function sample({visible=true,playing:play=playing,paused:pause=paused,sampleMode=sampledMode}={}){if(!enabled)return;const t=now();if(!visible){background();return;}if(hiddenAt!==null){foreground();return;}if(!session)ensure();sampledMode=MODES.includes(sampleMode)?sampleMode:null;const activeMode=sampledMode||mode;const dt=Math.max(0,Math.min(5,(t-last)/1000));last=t;session.foreground+=dt;playing=pendingContinue?false:play;paused=pendingContinue?true:pause;if(t-inputAt>60000)session.idle+=dt;else if(paused)session.paused+=dt;else if(playing&&activeMode){session.active+=dt;session.modes[activeMode].seconds+=dt;session.lastActivity=activeMode;}session.updated=t;}
 function background(){if(!enabled||hiddenAt!==null)return;sample();hiddenAt=now();if(session){beforeHiddenActivity=session.lastActivity;session.lastActivity='background';}void flush();}
 function foreground(){if(!enabled||hiddenAt===null)return;const t=now(),newSession=t-hiddenAt>=1800000&&!mode;if(newSession){session=null;sampledMode=null;}hiddenAt=null;ensure();last=t;inputAt=t;session.lastActivity=newSession?'menu':mode?(pendingContinue?mode+'-finished':mode):beforeHiddenActivity;session.updated=t;}
 function count(name){session.events[name]=Math.min(100000,(session.events[name]||0)+1);}
 function successfulAction(m){if(!enabled||!MODES.includes(m)||pendingContinue||hiddenAt!==null||!session?.events[`mode_${m}_action`])return;session.events.first_correct=1;count(`mode_${m}_correct`);session.lastActivity=m;}
 return {sample,flush,background,foreground,
  event(name){if(!enabled||!EVENTS.includes(name))return;ensure();count(name);},
  // Called by real mode actions only, never by pointer movement or a turn timeout.
  interaction(m,{correct=false}={}){if(!enabled||!MODES.includes(m)||pendingContinue||hiddenAt!==null)return;ensure();inputAt=now();session.events.first_action=1;count(`mode_${m}_action`);if(correct)successfulAction(m);session.lastActivity=m;},
  successfulAction,
  milestone(name,ms){if(!enabled||!MILESTONES.includes(name)||!Number.isFinite(ms)||ms<0||ms>3600000)return;ensure();if(!(name in session.startup))session.startup[name]=Math.round(ms);},
  enable(){if(enabled)return;const old=read();install=old.install||uuid();test=!!old.test;queue=Array.isArray(old.queue)?old.queue.filter(x=>x?.v===2&&x.install===install&&x.session?.updated>now()-86400000).slice(-48):[];enabled=true;ensure();persist();},
  async disable({retainIdentity=false}={}){enabled=false;while(busy)await new Promise(r=>setTimeout(r,20));session=null;queue=[];mode=null;sampledMode=null;pendingContinue=false;hiddenAt=null;if(retainIdentity)persist();else{install=null;try{storage?.removeItem(KEY);}catch{}}},
  identity(){return install||read().install;},
  setTest(value=true){test=!!value;for(const row of queue)row.session.test=test;if(session)session.test=test;persist();if(enabled)void flush();},
  input(){inputAt=now();},
  startRun(m){if(!enabled||!MODES.includes(m))return;if(mode)this.endRun('abandoned');else sample();ensure();mode=m;sampledMode=m;pendingContinue=false;playing=true;paused=false;last=inputAt=now();session.modes[m].runs++;session.lastActivity=m;void flush();},
  // A loss is already a completed run while the player decides about Continue.
  // Sending its result now preserves exits at this screen. A successful revive
  // revises this same session/run, rather than recording a second run or reward.
  offerContinue(){if(!enabled||!mode||!session||pendingContinue)return;sample();pendingContinue=true;playing=false;paused=true;session.modes[mode].finished++;session.lastActivity=mode+'-finished';count('run_loss');count('continue_offer');void flush();},
  resumeRun(){if(!enabled||!mode||!session||!pendingContinue)return;session.modes[mode].finished=Math.max(0,session.modes[mode].finished-1);pendingContinue=false;playing=true;paused=false;last=inputAt=now();session.lastActivity=mode;count('continue_used');void flush();},
  endRun(outcome='finished'){if(!enabled||!mode||!session)return;if(hiddenAt===null)sample();if(!pendingContinue)session.modes[mode][outcome==='abandoned'?'abandoned':'finished']++;session.lastActivity=mode+'-'+(pendingContinue?'finished':outcome==='abandoned'?'abandoned':'finished');mode=null;sampledMode=null;pendingContinue=false;playing=false;paused=false;last=now();void flush();},
  snapshot(){return session?JSON.parse(JSON.stringify(session)):null;}
 };
}
export function deviceContext(nav={},loc={}){const ua=nav.userAgent||'';return {platform:loc.hostname==='appassets.androidplatform.net'?'android':'browser',device:/iPad|Tablet/i.test(ua)||(/Macintosh/.test(ua)&&nav.maxTouchPoints>1)?'tablet':/Android|iPhone|Mobile/i.test(ua)?'phone':'desktop',os:/Android/i.test(ua)?'Android':/iPhone|iPad/i.test(ua)||(/Macintosh/.test(ua)&&nav.maxTouchPoints>1)?'iOS':/Windows/i.test(ua)?'Windows':/Mac/i.test(ua)?'macOS':/Linux/i.test(ua)?'Linux':'Other',browser:/Edg\//.test(ua)?'Edge':/Firefox|FxiOS/.test(ua)?'Firefox':/Chrome|CriOS/.test(ua)?'Chrome':/Safari/.test(ua)?'Safari':'Other'};}
