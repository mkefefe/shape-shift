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
 return {...profile,coins:(profile.coins||0)+100,discoveries:{day,claimed:[...new Set([...claimed,slot])]}};
}
export function initProfileTabs(){
 const dialog=document.getElementById('profile-dialog'),content=dialog.querySelector('.dialog-content');
 const tabs=document.createElement('div');tabs.className='profile-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Profile categories');
 const definitions=[['identity','Player'],['skins','Skins'],['frames','Frames'],['backgrounds','Worlds']];
 const panels=new Map(definitions.map(([id])=>{const panel=document.createElement('section');panel.id='profile-panel-'+id;panel.className='profile-tab-panel';panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby','profile-tab-'+id);panel.hidden=id!=='identity';return [id,panel];}));
 const move=(id,selector)=>dialog.querySelectorAll(selector).forEach(el=>panels.get(id).append(el));
 move('identity','#profile-preview,#player-id-row,#player-id-status,.name-label,.name-row,.menu-input-hint,#avatar-presets,#profile-photo');
 document.getElementById('profile-shop').hidden=true;
 for(const id of ['skins','frames','backgrounds']){
  const grid=document.getElementById('profile-'+id),panel=panels.get(id);
  if(grid.previousElementSibling?.tagName==='H3')panel.append(grid.previousElementSibling);panel.append(grid);
  const pager=document.createElement('nav');pager.className='profile-pages';pager.setAttribute('aria-label',id+' pages');
  const previous=document.createElement('button'),next=document.createElement('button'),label=document.createElement('span');
  previous.type=next.type='button';previous.textContent='Previous';next.textContent='Next';label.setAttribute('aria-live','polite');
  pager.append(previous,label,next);panel.append(pager);let page=0;
  function render(){const size=innerHeight<700?3:6,items=[...grid.children],pages=Math.max(1,Math.ceil(items.length/size));page=Math.min(page,pages-1);items.forEach((item,i)=>item.hidden=i<page*size||i>=(page+1)*size);previous.disabled=page===0;next.disabled=page===pages-1;label.textContent=(page+1)+' / '+pages;pager.hidden=pages===1;}
  previous.onclick=()=>{page--;render();};next.onclick=()=>{page++;render();};
  new MutationObserver(render).observe(grid,{childList:true});window.addEventListener('resize',render);render();
 }
 for(const [id,label] of definitions){const button=document.createElement('button');button.id='profile-tab-'+id;button.type='button';button.textContent=label;button.setAttribute('role','tab');button.setAttribute('aria-controls','profile-panel-'+id);button.setAttribute('aria-selected',String(id==='identity'));button.onclick=()=>{for(const [key,panel] of panels){panel.hidden=key!==id;document.getElementById('profile-tab-'+key).setAttribute('aria-selected',String(key===id));}};tabs.append(button);}
 content.querySelector('h2').after(tabs,...panels.values());
 dialog.addEventListener('close',()=>document.getElementById('profile-tab-identity').click());
}
export function initLivingMenu({getProfile,commit,sound=()=>{}}){
 initProfileTabs();
 initMenuScrolling();
 const app=document.getElementById('app'),home=document.getElementById('home');
 const canvas=document.createElement('canvas');canvas.id='living-water';canvas.setAttribute('aria-hidden','true');home.prepend(canvas);
 const waterArt=new Image();waterArt.src='assets/home-world-v101.webp';
 const ctx=canvas.getContext('2d'),motion=matchMedia('(prefers-reduced-motion: reduce)');let frame=0,last=0;
 const running=()=>app.dataset.screen==='home'&&!document.hidden&&!document.body.classList.contains('reduce-motion')&&!motion.matches&&!document.querySelector('dialog[open]')&&(!app.dataset.background||app.dataset.background==='garden');
 function paint(time){frame=0;if(!running())return;frame=requestAnimationFrame(paint);if(time-last<50)return;last=time;
  const w=home.clientWidth,h=home.clientHeight;if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  ctx.clearRect(0,0,w,h);const scale=Math.max(w/941,h/1672),ox=(w-941*scale)/2,oy=(h-1672*scale)/2;
  ctx.save();ctx.translate(ox,oy);ctx.scale(scale,scale);
  // Displace only painted water: moving texture, falling highlights, and foam.
  const falls=[[53,520,45,140],[84,675,78,204],[45,845,65,183],[148,917,91,310],[325,1105,48,82],[145,1240,73,100]];
  for(const [x,y,fw,fh] of falls){
   ctx.save();ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+fw*.65,y+5);ctx.lineTo(x+fw,y+fh);ctx.lineTo(x+fw*.24,y+fh);ctx.closePath();ctx.clip();
   if(waterArt.complete&&waterArt.naturalWidth){ctx.globalAlpha=.58;for(let row=0;row<fh;row+=5){const sy=(row+time*.085)%fh;ctx.drawImage(waterArt,x,y+sy,fw,Math.min(5,fh-sy),x+Math.sin(row*.07+time*.003)*2,y+row,fw,5);}ctx.globalAlpha=1;}
   for(let i=0;i<18;i++){const yy=y+((time*.12+i*31)%fh),xx=x+fw*(.15+(i%6)*.13);const gradient=ctx.createLinearGradient(xx,yy,xx+3,yy+40);gradient.addColorStop(0,'#eaffff00');gradient.addColorStop(.65,'#eaffff99');gradient.addColorStop(1,'#eaffff00');ctx.strokeStyle=gradient;ctx.lineWidth=1.4+i%3;ctx.beginPath();ctx.moveTo(xx,yy);ctx.quadraticCurveTo(xx+4,yy+22,xx+2,yy+42);ctx.stroke();}
   ctx.restore();
   for(let i=0;i<5;i++){const age=(time/1300+i/5)%1;ctx.strokeStyle='rgba(240,255,255,'+(.38*(1-age))+')';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x+fw*.7,y+fh+5,fw*(.22+age*.52),3+age*7,0,0,Math.PI*2);ctx.stroke();}
  }
  ctx.save();ctx.beginPath();ctx.moveTo(250,1268);ctx.lineTo(624,1200);ctx.lineTo(672,1252);ctx.lineTo(420,1400);ctx.lineTo(560,1533);ctx.lineTo(310,1512);ctx.lineTo(50,1455);ctx.lineTo(8,1380);ctx.lineTo(320,1323);ctx.closePath();ctx.clip();
  if(waterArt.complete&&waterArt.naturalWidth){ctx.globalAlpha=.65;for(let y=1200;y<1560;y+=4){const dx=Math.sin(y*.047-time*.0024)*5,dy=Math.sin(y*.06-time*.003)*2;ctx.drawImage(waterArt,0,y+dy,800,4,dx,y,800,4);}ctx.globalAlpha=1;}
  for(let i=0;i<60;i++){const drift=(time*.018+i*43)%330,x=30+(i*97)%620+Math.sin(time/1100+i)*12,y=1220+drift;ctx.strokeStyle='rgba(231,255,255,'+(.15+.35*(.5+.5*Math.sin(time/650+i)))+')';ctx.lineWidth=1.7;ctx.beginPath();ctx.ellipse(x,y,7+i%14,1.5,0,0,Math.PI);ctx.stroke();}ctx.restore();ctx.restore();
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

// Let trackpads scroll the active menu even when the pointer is on its header
// or (in the browser shell) beside the portrait game. Native list scrolling wins.
function initMenuScrolling(){
 const canScroll=el=>el&&el.clientHeight>0&&el.scrollHeight>el.clientHeight+1&&/(auto|scroll)/.test(getComputedStyle(el).overflowY);
 function route(delta){
  const dialog=[...document.querySelectorAll('dialog[open]')].at(-1),map=document.getElementById('adventure-map');
  const root=dialog||(!map.hidden?map:null);if(!root)return false;
  const candidates=[root,...root.querySelectorAll('*')].filter(canScroll).sort((a,b)=>b.clientWidth*b.clientHeight-a.clientWidth*a.clientHeight);
  const target=candidates.find(el=>delta>0?el.scrollTop<el.scrollHeight-el.clientHeight-1:el.scrollTop>0);
  if(!target)return false;target.scrollTop+=delta;return true;
 }
 document.addEventListener('wheel',event=>{
  if(event.ctrlKey||event.metaKey||event.defaultPrevented||!event.deltaY)return;
  for(let el=event.target;el&&el!==document.body;el=el.parentElement)if(canScroll(el))return;
  const delta=event.deltaY*(event.deltaMode===1?20:event.deltaMode===2?innerHeight:1);
  if(route(delta))event.preventDefault();
 },{passive:false});
 window.addEventListener('shape-shift-scroll',event=>route(event.detail));
}
