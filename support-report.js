import {TELEMETRY_BUILD,TELEMETRY_DISTRIBUTION} from './telemetry-config.js?v=494241';
import {REPORT_MODES,submitBugReport,supportErrorMessage} from './support-api.js?v=494241';
export {REPORT_MODES};
export const REPORT_DRAFT_KEY='shape-shift-report-draft-v2';

export function buildBugReport({description,mode='Other',version=TELEMETRY_BUILD,distribution=TELEMETRY_DISTRIBUTION,id=crypto.randomUUID()}){
 const details=String(description||'').trim();
 if(!details)throw Error('Describe what happened.');
 if(details.length>2000)throw Error('Keep the report to 2,000 characters or fewer.');
 return {id,mode:REPORT_MODES.includes(mode)?mode:'Other',description:details,build:version,distribution};
}

// Keep one editable draft and one stable request ID. If the connection drops
// after the server stores it, Retry resends that ID instead of creating a copy.
export function createReportDraft({storage,submit=submitBugReport,randomId=()=>crypto.randomUUID(),onChange=()=>{}}={}){
 let draft={description:'',mode:REPORT_MODES[0],request:null,sentId:null},revision=0,view=0,pending=null;
 try{
  const saved=JSON.parse(storage?.getItem(REPORT_DRAFT_KEY)||'null');
  if(saved&&typeof saved.description==='string'&&saved.description.length<=2000&&REPORT_MODES.includes(saved.mode)){
   draft={description:saved.description,mode:saved.mode,request:null,sentId:null};
   const p=saved.request;
   if(p&&typeof p.id==='string'&&p.mode===draft.mode&&p.description===draft.description.trim()&&typeof p.build==='string'&&typeof p.distribution==='string'){draft.request=p;draft.sentId=saved.sentId===p.id?p.id:null;}
  }
 }catch{}
 const persist=()=>{try{if(draft.description||draft.request)storage?.setItem(REPORT_DRAFT_KEY,JSON.stringify(draft));else storage?.removeItem(REPORT_DRAFT_KEY);}catch{}};
 const state=()=>({description:draft.description,mode:draft.mode,pending:Boolean(pending),sent:Boolean(draft.request&&draft.sentId===draft.request.id)});
 const changed=()=>onChange(state());
 return {
  snapshot:state,
  beginView(){return ++view;},
  endView(){view++;},
  update({description=draft.description,mode=draft.mode}){
   if(description===draft.description&&mode===draft.mode)return;
   draft={description:String(description),mode:REPORT_MODES.includes(mode)?mode:'Other',request:null,sentId:null};revision++;persist();changed();
  },
  send(formView=view){
   if(pending)return pending;
   if(draft.request&&draft.sentId===draft.request.id)return Promise.resolve({saved:true,id:draft.sentId,alreadySent:true,cleared:false});
   const payload=draft.request||buildBugReport({description:draft.description,mode:draft.mode,id:randomId()});
   draft.request=payload;persist();const sentRevision=revision;
   pending=Promise.resolve().then(()=>submit(payload)).then(receipt=>{
    if(receipt?.saved!==true||receipt.id!==payload.id)throw Error('The server did not confirm this report.');
    const same=revision===sentRevision&&draft.request===payload;
    const cleared=same&&view===formView;
    if(cleared)draft={description:'',mode:draft.mode,request:null,sentId:null};
    else if(same)draft.sentId=payload.id;
    persist();return {...receipt,cleared};
   }).finally(()=>{pending=null;changed();});
   changed();return pending;
  }
 };
}

export function initBugReport(settingsRoot,sound=()=>{}){
 const doc=settingsRoot.ownerDocument;
 const existing=doc.getElementById('report-bug-open');if(existing)return existing;
 const sheet=doc.createElement('link');sheet.rel='stylesheet';sheet.href=new URL('./support-report.css?v=494241',import.meta.url).href;doc.head.append(sheet);
 const button=doc.createElement('button');button.type='button';button.id='report-bug-open';button.className='secondary';button.textContent='Report a bug';button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-controls','bug-report-dialog');settingsRoot.querySelector('.settings-links').prepend(button);
 const dialog=doc.createElement('dialog');dialog.id='bug-report-dialog';dialog.dataset.nativeForm='true';dialog.setAttribute('aria-labelledby','bug-report-title');
 dialog.innerHTML=`<form class="support-report-form">
  <header><h2 id="bug-report-title">Report a bug</h2><button type="button" class="support-report-close" aria-label="Close bug report">×</button></header>
  <p class="support-report-intro">Tell us what happened and what you expected.</p>
  <label for="bug-report-mode">Where did it happen?</label><select id="bug-report-mode"></select>
  <label for="bug-report-description">What went wrong?</label><textarea id="bug-report-description" rows="5" maxlength="2000" required placeholder="For example: the music stopped when I opened Shape Drop."></textarea>
  <p class="support-report-note">Your message, game mode and version are sent to the developer. No email needed. Please leave out personal details.</p>
  <div class="support-report-actions"><button type="submit" class="support-report-send">Send report</button></div>
  <p class="support-report-status" role="status" aria-live="polite"></p>
 </form>`;
 doc.body.append(dialog);
 const form=dialog.querySelector('form'),mode=dialog.querySelector('#bug-report-mode'),description=dialog.querySelector('#bug-report-description'),status=dialog.querySelector('.support-report-status'),send=dialog.querySelector('.support-report-send');
 for(const name of REPORT_MODES){const option=doc.createElement('option');option.textContent=name;option.value=name;mode.append(option);}
 const draft=createReportDraft({storage:doc.defaultView.ShapeShiftPlatform.storage,onChange:state=>{send.disabled=state.pending||state.sent;send.textContent=state.pending?'Sending…':state.sent?'Report sent':'Send report';if(!state.pending&&dialog.open&&status.textContent==='Sending your report…')status.textContent=state.sent?'This report was sent. Edit the message to send another report.':'Your draft is kept.';}});
 let formView=0;
 const renderDraft=()=>{const state=draft.snapshot();description.value=state.description;mode.value=state.mode;send.disabled=state.pending||state.sent;send.textContent=state.pending?'Sending…':state.sent?'Report sent':'Send report';return state;};
 const edit=()=>{description.setCustomValidity('');draft.update({description:description.value,mode:mode.value});status.textContent='';};
 description.addEventListener('input',edit);mode.addEventListener('change',edit);
 button.onclick=()=>{sound('click');formView=draft.beginView();const state=renderDraft();status.textContent=state.sent?'This report was sent. Edit the message to send another report.':state.pending?'Sending your report…':'';dialog.showModal();description.focus();};
 dialog.querySelector('.support-report-close').onclick=()=>{sound('close');dialog.close();};
 dialog.addEventListener('close',()=>{formView=0;draft.endView();button.focus();});
 form.addEventListener('submit',async event=>{
  event.preventDefault();description.setCustomValidity(description.value.trim()?'':'Describe what happened.');if(!form.reportValidity()||draft.snapshot().pending)return;
  draft.update({description:description.value,mode:mode.value});const sendingView=formView;status.textContent='Sending your report…';sound('click');
  try{
   const receipt=await draft.send(sendingView);if(sendingView!==formView||!dialog.open)return;
   if(receipt.cleared)renderDraft();
   status.textContent=receipt.cleared?'Report sent. Thank you!':draft.snapshot().sent?'This report was sent. Edit the message to send another report.':'Report sent. Your new draft is kept.';
  }catch(error){if(sendingView===formView&&dialog.open)status.textContent=supportErrorMessage(error);}
 });
 return button;
}
