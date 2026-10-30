import {EVENTS,MILESTONES} from './experience-metrics.js';
// First-party gameplay analytics only. Never link this ID to rankings or ad IDs.
export const MODES=['adventure','endless','rush','drop','slice','piano','battle'];
export const AGE_GROUPS=['unknown','under-13','13-17','18-24','25-34','35-44','45-54','55-plus'];
const KEY='shape-shift-engagement-v2';
export function createEngagement({storage,now=()=>Date.now(),uuid=()=>crypto.randomUUID(),send=async()=>false,context=()=>({})}={}){
 let enabled=false,session=null,last=now(),inputAt=now(),hiddenAt=null,mode=null,playing=false,paused=false,queue=[],install=null,test=false,busy=false;
 const read=()=>{try{return JSON.parse(storage?.getItem(KEY)||'null')||{};}catch{return {};}};
 const persist=()=>{try{storage?.setItem(KEY,JSON.stringify({install,test,queue:queue.slice(-48)}));}catch{}};
 function ensure(){if(!enabled)return;const t=now();if(!session){session={id:uuid(),started:t,updated:t,revision:0,foreground:0,active:0,idle:0,paused:0,lastActivity:'menu',events:{},startup:{},modes:Object.fromEntries(MODES.map(m=>[m,{seconds:0,runs:0,finished:0,abandoned:0}])),test};last=t;}}
 function checkpoint(){if(!enabled||!session)return;session.updated=now();session.revision++;session.test||=test;const body={v:2,install,...context(),session:JSON.parse(JSON.stringify(session))};queue=queue.filter(x=>x.session.id!==session.id&&x.session.updated>now()-86400000);queue.push(body);persist();}
 async function flush(){if(!enabled||busy)return;checkpoint();busy=true;try{for(const row of [...queue]){if(!enabled)break;let ok=false;try{ok=await send(row);}catch{}if(!ok)break;queue=queue.filter(x=>x.session.id!==row.session.id||x.session.revision!==row.session.revision);persist();}}finally{busy=false;}}
 function sample({visible=true,playing:play=playing,paused:pause=paused}={}){if(!enabled)return;const t=now();if(!visible){background();return;}if(hiddenAt!==null)foreground();if(!session)ensure();const dt=Math.max(0,Math.min(5,(t-last)/1000));last=t;session.foreground+=dt;playing=play;paused=pause;if(t-inputAt>60000)session.idle+=dt;else if(pause)session.paused+=dt;else if(play&&mode){session.active+=dt;session.modes[mode].seconds+=dt;}session.updated=t;}
 function background(){if(!enabled||hiddenAt!==null)return;hiddenAt=now();if(session)session.lastActivity='background';void flush();}
 function foreground(){if(!enabled)return;if(hiddenAt!==null&&now()-hiddenAt>=1800000&&!mode)session=null;hiddenAt=null;ensure();inputAt=now();}
 return {sample,flush,background,foreground,
  event(name){if(!enabled||!EVENTS.includes(name))return;ensure();session.events[name]=Math.min(100000,(session.events[name]||0)+1);},
  milestone(name,ms){if(!enabled||!MILESTONES.includes(name)||!Number.isFinite(ms)||ms<0||ms>3600000)return;ensure();if(!(name in session.startup))session.startup[name]=Math.round(ms);},
  enable(){if(enabled)return;const old=read();install=old.install||uuid();test=!!old.test;queue=Array.isArray(old.queue)?old.queue.filter(x=>x?.v===2&&x.install===install&&x.session?.updated>now()-86400000).slice(-48):[];enabled=true;ensure();persist();},
  async disable({retainIdentity=false}={}){enabled=false;while(busy)await new Promise(r=>setTimeout(r,20));session=null;queue=[];mode=null;if(retainIdentity)persist();else{install=null;try{storage?.removeItem(KEY);}catch{}}},
  identity(){return install||read().install;},
  setTest(value=true){test=!!value;for(const row of queue)row.session.test=test;if(session)session.test=test;persist();if(enabled)void flush();},
  input(){inputAt=now();},
  startRun(m){if(!enabled||!MODES.includes(m))return;if(mode)this.endRun('abandoned');ensure();mode=m;playing=true;paused=false;inputAt=now();session.modes[m].runs++;session.lastActivity=m;void flush();},
  endRun(outcome='finished'){if(!enabled||!mode||!session)return;session.modes[mode][outcome==='abandoned'?'abandoned':'finished']++;session.lastActivity=mode+'-'+(outcome==='abandoned'?'abandoned':'finished');mode=null;playing=false;void flush();},
  snapshot(){return session?JSON.parse(JSON.stringify(session)):null;}
 };
}
export function deviceContext(nav={},loc={}){const ua=nav.userAgent||'';return {platform:loc.hostname==='appassets.androidplatform.net'?'android':'browser',device:/iPad|Tablet/i.test(ua)||(/Macintosh/.test(ua)&&nav.maxTouchPoints>1)?'tablet':/Android|iPhone|Mobile/i.test(ua)?'phone':'desktop',os:/Android/i.test(ua)?'Android':/iPhone|iPad/i.test(ua)||(/Macintosh/.test(ua)&&nav.maxTouchPoints>1)?'iOS':/Windows/i.test(ua)?'Windows':/Mac/i.test(ua)?'macOS':/Linux/i.test(ua)?'Linux':'Other',browser:/Edg\//.test(ua)?'Edge':/Firefox|FxiOS/.test(ua)?'Firefox':/Chrome|CriOS/.test(ua)?'Chrome':/Safari/.test(ua)?'Safari':'Other'};}
