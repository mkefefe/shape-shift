// Daily discoveries share one receipt ledger across every equipped world.
export const discoveryDay=(now=Date.now())=>new Date(now).toISOString().slice(0,10);
export function discoveryOrder(day,world='garden'){
 let seed=2166136261;for(const c of day+world)seed=Math.imul(seed^c.charCodeAt(0),16777619)>>>0;
 const points=Array.from({length:16},(_,i)=>i);
 for(let i=points.length-1;i>0;i--){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const j=seed%(i+1);[points[i],points[j]]=[points[j],points[i]];}
 return points;
}
export function claimDiscovery(profile,slot,now=Date.now()){
 const day=discoveryDay(now),old=profile.discoveries;
 if(!Number.isInteger(slot)||slot<0||slot>2||old?.day>day)return profile;
 const claimed=old?.day===day?(old.claimed||[]).filter(n=>Number.isInteger(n)&&n>=0&&n<3):[];
 if(claimed.includes(slot))return profile;
 return {...profile,coins:(profile.coins||0)+[30,30,40][slot],discoveries:{day,claimed:[...new Set([...claimed,slot])]}};
}
export function initProfileTabs(){
 const dialog=document.getElementById('profile-dialog'),content=dialog.querySelector('.dialog-content');
 const tabs=document.createElement('div');tabs.className='profile-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Profile categories');
 const definitions=[['identity','Player'],['avatars','Avatars'],['skins','Skins'],['frames','Frames'],['backgrounds','Worlds']];
 const panels=new Map(definitions.map(([id,label])=>{const panel=document.createElement('section');panel.id='profile-panel-'+id;panel.className='profile-tab-panel';panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby','profile-tab-'+id);panel.hidden=id!=='identity';return [id,panel];}));
 const move=(id,selector)=>dialog.querySelectorAll(selector).forEach(el=>panels.get(id).append(el));
 move('identity','#profile-preview,#player-id-row,#player-id-status,.name-label,.name-row,.menu-input-hint');
 move('avatars','#avatar-presets,#choose-photo,#profile-photo');
 for(const id of ['skins','frames','backgrounds']){const grid=document.getElementById('profile-'+id);if(grid.previousElementSibling?.tagName==='H3')panels.get(id).append(grid.previousElementSibling);panels.get(id).append(grid);}
 for(const [id,label] of definitions){const button=document.createElement('button');button.id='profile-tab-'+id;button.type='button';button.textContent=label;button.setAttribute('role','tab');button.setAttribute('aria-controls','profile-panel-'+id);button.setAttribute('aria-selected',String(id==='identity'));button.onclick=()=>{for(const [key,panel] of panels){panel.hidden=key!==id;document.getElementById('profile-tab-'+key).setAttribute('aria-selected',String(key===id));}content.scrollTop=0;};tabs.append(button);}
 content.querySelector('h2').after(tabs,...panels.values());
 dialog.addEventListener('close',()=>document.getElementById('profile-tab-identity').click());
}
export function initLivingMenu({getProfile,commit,sound=()=>{}}){
 initProfileTabs();
 const app=document.getElementById('app'),home=document.getElementById('home');
 const canvas=document.createElement('canvas');canvas.id='living-water';canvas.setAttribute('aria-hidden','true');home.prepend(canvas);
 const ctx=canvas.getContext('2d'),motion=matchMedia('(prefers-reduced-motion: reduce)');let frame=0,last=0;
 const running=()=>app.dataset.screen==='home'&&!document.hidden&&!document.body.classList.contains('reduce-motion')&&!motion.matches&&!document.querySelector('dialog[open]')&&(!app.dataset.background||app.dataset.background==='garden');
 function paint(time){frame=0;if(!running())return;frame=requestAnimationFrame(paint);if(time-last<50)return;last=time;
  const w=home.clientWidth,h=home.clientHeight;if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  ctx.clearRect(0,0,w,h);const scale=Math.max(w/941,h/1672),ox=(w-941*scale)/2,oy=(h-1672*scale)/2;
  ctx.save();ctx.translate(ox,oy);ctx.scale(scale,scale);
  // Follow the painted waterfall silhouettes; the landscape itself remains still.
  const falls=[[53,520,28,140],[96,687,44,191],[47,850,37,177],[157,923,72,290],[320,1103,37,75],[149,1235,54,92]];
  for(const [x,y,fw,fh] of falls){ctx.save();ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+fw*.7,y+4);ctx.lineTo(x+fw, y+fh);ctx.lineTo(x+fw*.35,y+fh);ctx.closePath();ctx.clip();for(let i=0;i<12;i++){const yy=y+((time*.055+i*23)%fh);ctx.strokeStyle='rgba(232,255,255,'+(.12+.12*Math.sin(i+time/1000)**2)+')';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+fw*(i%4)/4,yy);ctx.lineTo(x+fw*(i%4)/4+8,yy+26);ctx.stroke();}ctx.restore();}
  ctx.save();ctx.beginPath();ctx.moveTo(250,1268);ctx.lineTo(624,1200);ctx.lineTo(672,1252);ctx.lineTo(420,1400);ctx.lineTo(560,1533);ctx.lineTo(310,1512);ctx.lineTo(50,1455);ctx.lineTo(8,1380);ctx.lineTo(320,1323);ctx.closePath();ctx.clip();
  for(let i=0;i<48;i++){const x=30+(i*97)%620+Math.sin(time/1800+i)*9,y=1220+(i*43)%330;ctx.strokeStyle='rgba(231,255,255,'+(.06+.19*(.5+.5*Math.sin(time/850+i)))+')';ctx.lineWidth=1.8;ctx.beginPath();ctx.ellipse(x,y,8+i%10,1.7,0,0,Math.PI);ctx.stroke();}ctx.restore();ctx.restore();
 }
 function refresh(){if(frame)cancelAnimationFrame(frame);frame=0;canvas.hidden=!running();if(running())frame=requestAnimationFrame(paint);}
 new MutationObserver(refresh).observe(app,{attributes:true,attributeFilter:['data-screen','data-background']});new MutationObserver(refresh).observe(document.body,{attributes:true,attributeFilter:['class','open'],subtree:true});document.addEventListener('visibilitychange',refresh);motion.addEventListener('change',refresh);refresh();
 const notice=document.createElement('span');notice.id='discovery-notice';notice.setAttribute('role','status');notice.hidden=true;home.append(notice);let noticeTimer;
 const logo=home.querySelector('h1');logo.setAttribute('role','button');logo.tabIndex=0;logo.setAttribute('aria-label','Shape Shift logo');
 function bounce(){if(!motion.matches&&!document.body.classList.contains('reduce-motion'))logo.animate([{transform:'scale(1)'},{transform:'scale(1.06) rotate(-2deg)'},{transform:'scale(1)'}],{duration:360,easing:'ease-out'});sound('click');}
 logo.addEventListener('click',bounce);logo.addEventListener('keydown',e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();e.stopPropagation();bounce();}});
 // Use only unobstructed scenery. Candidate points stay the same for a day and world;
 // resizing filters occluded points rather than placing rewards behind controls.
 const blocked=el=>!el||!home.contains(el)||!!el.closest('button,a,input,select,dialog,[role=button],.mode-card,.home-actions,.home-bottom');
 function spots(){const r=home.getBoundingClientRect(),candidates=[];for(const y of [.32,.48,.67,.79])for(const x of [.07,.18,.82,.93])candidates.push({x:r.left+r.width*x,y:r.top+r.height*y});
  return discoveryOrder(discoveryDay(),getProfile().equipped?.background).map(i=>candidates[i]).filter(p=>!blocked(document.elementFromPoint(p.x,p.y))).slice(0,3);
 }
 let press=null;home.addEventListener('pointerdown',e=>{if(e.button===0&&!blocked(e.target))press={x:e.clientX,y:e.clientY,id:e.pointerId};else press=null;},{capture:true,passive:true});
 window.addEventListener('pointercancel',()=>press=null);
 window.addEventListener('pointerup',e=>{const p=press;press=null;if(!p||p.id!==e.pointerId||Math.hypot(e.clientX-p.x,e.clientY-p.y)>10||app.dataset.screen!=='home'||document.querySelector('dialog[open]'))return;
  const slot=spots().findIndex(q=>Math.hypot(e.clientX-q.x,e.clientY-q.y)<25);if(slot<0)return;
  const before=getProfile(),after=claimDiscovery(before,slot);if(after===before)return;
  try{commit(after);}catch{return;}sound('quest-collect');notice.textContent='+'+(after.coins-before.coins)+' coins \u00b7 '+after.discoveries.claimed.length+'/3 finds today';notice.hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>notice.hidden=true,2500);
 });
}
