import {REPORT_FILTERS,REPORT_TOKEN_KEY,loadReportInbox,updateReportStatus} from './support-api.js?v=494240';

export function createReportInbox({load=loadReportInbox,update=updateReportStatus,isCurrent=()=>true,onChange=()=>{}}={}){
 let filter='new',reports=[],next=null,unread=0,error='',loading=false,generation=0,controller=null;
 const pending=new Set(),actions=new Set();
 const snapshot=()=>({filter,reports:reports.map(row=>({...row})),next,unread,error,loading,pending:[...pending]});
 const emit=()=>onChange(snapshot());
 const message=error=>error?.status===403||error?.status===401?'Owner access is unavailable for this player.':error?.code==='SESSION_CHANGED'?'Your player session changed. Reopen the inbox.':error?.status===429?'Too many requests. Wait a moment, then refresh.':'Could not load reports. Check your connection and refresh.';
 const clear=()=>{generation++;controller?.abort();controller=null;for(const action of actions)action.abort();actions.clear();pending.clear();reports=[];next=null;unread=0;error='';loading=false;emit();};
 async function refresh({more=false,selected=filter}={}){
  if(!isCurrent()){clear();return;}
  if(!REPORT_FILTERS.includes(selected))return;
  if(more&&(loading||!next))return;
  controller?.abort();const ownController=new AbortController();controller=ownController;
  const request=++generation,before=more?next:null;filter=selected;
  if(!more){reports=[];next=null;}
  loading=true;error='';emit();
  try{
   const result=await load({filter,...(before?{before}:{})},{signal:ownController.signal});
   if(request!==generation||!isCurrent()||ownController.signal.aborted)return;
   const seen=new Set(reports.map(row=>row.id));reports=[...reports,...result.reports.filter(row=>!seen.has(row.id))];next=result.next;unread=result.unread;
  }catch(cause){if(request===generation&&isCurrent()&&!ownController.signal.aborted)error=message(cause);}
  finally{if(request===generation){loading=false;controller=null;emit();}}
 }
 async function mark(id,status){
  if(!isCurrent()||pending.has(id))return;
  const report=reports.find(row=>row.id===id);if(!report||report.status===status)return;
  const request=generation,ownController=new AbortController();actions.add(ownController);pending.add(id);error='';emit();
  try{
   await update(id,status,{signal:ownController.signal});
   if(request!==generation||!isCurrent()||ownController.signal.aborted)return;
   unread=Math.max(0,unread+(report.status==='new'?-1:0)+(status==='new'?1:0));
   reports=reports.map(row=>row.id===id?{...row,status}:row).filter(row=>filter==='all'||row.status===filter);
  }catch(cause){if(request===generation&&isCurrent()&&!ownController.signal.aborted)error=message(cause).replace('load reports','update this report');}
  finally{actions.delete(ownController);pending.delete(id);if(request===generation)emit();}
 }
 return {snapshot,refresh,mark,clear};
}

export function initReportInbox(settingsRoot,sound=()=>{}){
 const doc=settingsRoot.ownerDocument,host=doc.defaultView,storage=host.ShapeShiftPlatform.storage;
 const button=doc.createElement('button');button.id='report-inbox-open';button.type='button';button.className='secondary';button.textContent='Bug reports';button.hidden=true;button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-controls','report-inbox-dialog');settingsRoot.querySelector('.settings-links').append(button);
 const dialog=doc.createElement('dialog');dialog.id='report-inbox-dialog';dialog.dataset.nativeForm='true';dialog.setAttribute('aria-labelledby','report-inbox-title');
 dialog.innerHTML=`<div class="support-report-form"><header><h2 id="report-inbox-title">Bug reports</h2><button type="button" class="support-report-close" aria-label="Close bug reports">×</button></header><p class="support-report-note">Messages sent by players. Only your owner account can view this inbox.</p><div class="report-inbox-tools"><label for="report-inbox-filter">Show</label><select id="report-inbox-filter"><option value="new">New</option><option value="read">Read</option><option value="resolved">Resolved</option><option value="all">All reports</option></select><button type="button" class="report-inbox-refresh">Refresh</button></div><p class="support-report-status" role="status" aria-live="polite"></p><div class="report-inbox-list"></div><button type="button" class="report-inbox-more" hidden>Load more</button></div>`;
 doc.body.append(dialog);
 const list=dialog.querySelector('.report-inbox-list'),status=dialog.querySelector('.support-report-status'),filter=dialog.querySelector('select'),refresh=dialog.querySelector('.report-inbox-refresh'),more=dialog.querySelector('.report-inbox-more');
 let owner=false,ownerToken=null,watcher=null;
 const current=()=>owner&&ownerToken&&storage.getItem(REPORT_TOKEN_KEY)===ownerToken;
 const text=(tag,value,className)=>{const node=doc.createElement(tag);node.textContent=value;if(className)node.className=className;return node;};
 const stateNames={new:'New',read:'Read',resolved:'Resolved'};
 const model=createReportInbox({isCurrent:current,onChange(state){
  if(!current()){list.replaceChildren();status.textContent='';return;}
  button.textContent=state.unread?'Bug reports ('+state.unread+' new)':'Bug reports';filter.value=state.filter;refresh.disabled=state.loading;more.hidden=!state.next;more.disabled=state.loading;
  status.textContent=state.error||(state.loading?'Loading reports…':state.reports.length?state.unread+' new report'+(state.unread===1?'':'s'):state.filter==='all'?'No reports yet.':'No '+state.filter+' reports.');
  list.replaceChildren();
  for(const report of state.reports){
   const card=doc.createElement('article');card.className='report-inbox-card';card.dataset.reportId=report.id;
   const heading=text('h3',report.mode+' · '+stateNames[report.status]),meta=text('p',new Date(report.createdAt).toLocaleString()+' · '+report.build+' · '+report.distribution,'report-inbox-meta');
   const description=text('p',report.description,'report-inbox-description');description.dataset.noTranslate='';
   const actions=doc.createElement('div');actions.className='report-inbox-actions';
   const choices=report.status==='new'?[['read','Mark read'],['resolved','Resolve']]:report.status==='read'?[['new','Mark new'],['resolved','Resolve']]:[['new','Reopen']];
   for(const [value,label]of choices){const action=text('button',label);action.type='button';action.disabled=state.pending.includes(report.id);action.setAttribute('aria-label',label+' report: '+report.mode);action.onclick=()=>{sound('click');void model.mark(report.id,value);};actions.append(action);}
   card.append(heading,meta,description,actions);list.append(card);
  }
 }});
 const close=()=>{if(dialog.open)dialog.close();else model.clear();};
 const verify=()=>{if(!current()){owner=false;button.hidden=true;close();return false;}return true;};
 button.onclick=()=>{if(!verify())return;sound('click');dialog.showModal();model.refresh({selected:filter.value});watcher=host.setInterval(verify,250);};
 dialog.querySelector('.support-report-close').onclick=()=>{sound('close');dialog.close();};
 dialog.addEventListener('close',()=>{host.clearInterval(watcher);watcher=null;model.clear();if(!button.hidden)button.focus();});
 filter.onchange=()=>{sound('click');model.refresh({selected:filter.value});};refresh.onclick=()=>{sound('click');model.refresh();};more.onclick=()=>{sound('click');model.refresh({more:true});};
 host.addEventListener('storage',event=>{if(event.key===REPORT_TOKEN_KEY)verify();});
 return {setOwner(value){owner=value===true;ownerToken=owner?storage.getItem(REPORT_TOKEN_KEY):null;button.hidden=!current();if(button.hidden)close();},close};
}
