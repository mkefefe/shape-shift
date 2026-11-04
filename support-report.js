import {TELEMETRY_BUILD} from './telemetry-config.js?v=494238';
import {openSupportLink} from './privacy-content.js?v=494238';

export const SUPPORT_EMAIL='mk.studio.customersupport@gmail.com';
export const REPORT_MODES=['Menus or settings','Endless','Adventure','Shape Drop','Shape Slice','Piano Flow','Battle','Other'];
export function buildBugReport({description,mode='Other',version=TELEMETRY_BUILD}){
 const details=String(description||'').trim();
 if(!details)throw new Error('Describe what happened before opening email.');
 const selected=REPORT_MODES.includes(mode)?mode:'Other';
 const text=`Shape Shift bug report\nVersion: ${version}\nWhere: ${selected}\n\n${details}`;
 const subject=encodeURIComponent(`Shape Shift ${version}: bug report`);
 const base=`mailto:${SUPPORT_EMAIL}?subject=${subject}`;
 const full=base+'&body='+encodeURIComponent(text);
 // Android's external-link bridge accepts at most 2,048 characters. Keep the
 // full report available to copy when an email link cannot carry all of it.
 return {text,href:full.length<=2000?full:base,copyRequired:full.length>2000};
}

export function initBugReport(settingsRoot,sound=()=>{}){
 const doc=settingsRoot.ownerDocument;
 const existing=doc.getElementById('report-bug-open');if(existing)return existing;
 const sheet=doc.createElement('link');sheet.rel='stylesheet';sheet.href=new URL('./support-report.css?v=494238',import.meta.url).href;doc.head.append(sheet);
 const button=doc.createElement('button');button.type='button';button.id='report-bug-open';button.className='secondary';button.textContent='Report a bug';button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-controls','bug-report-dialog');
 settingsRoot.querySelector('.settings-links').prepend(button);
 const dialog=doc.createElement('dialog');dialog.id='bug-report-dialog';dialog.dataset.nativeForm='true';dialog.setAttribute('aria-labelledby','bug-report-title');
 dialog.innerHTML=`<form class="support-report-form">
  <header><h2 id="bug-report-title">Report a bug</h2><button type="button" class="support-report-close" aria-label="Close bug report">×</button></header>
  <p class="support-report-intro">Tell us what happened and what you expected.</p>
  <label for="bug-report-mode">Where did it happen?</label><select id="bug-report-mode"></select>
  <label for="bug-report-description">What went wrong?</label><textarea id="bug-report-description" rows="5" maxlength="2000" required placeholder="For example: the music stopped when I opened Shape Drop."></textarea>
  <p class="support-report-note">Open your email app to review and send the report. Nothing is sent automatically.</p>
  <div class="support-report-actions"><button type="submit" class="support-report-send">Open email</button><button type="button" class="support-report-copy">Copy report</button></div>
  <p class="support-report-status" role="status" aria-live="polite"></p>
  <div class="support-report-fallback" hidden><label for="bug-report-copy">Select and copy your report</label><textarea id="bug-report-copy" readonly rows="4"></textarea></div>
  <p class="support-report-address" data-no-translate></p>
 </form>`;
 doc.body.append(dialog);
 const form=dialog.querySelector('form'),mode=dialog.querySelector('#bug-report-mode'),description=dialog.querySelector('#bug-report-description'),status=dialog.querySelector('.support-report-status'),fallback=dialog.querySelector('.support-report-fallback'),copyText=dialog.querySelector('#bug-report-copy');
 dialog.querySelector('.support-report-address').textContent=SUPPORT_EMAIL;
 for(const name of REPORT_MODES){const option=doc.createElement('option');option.textContent=name;option.value=name;mode.append(option);}
 const valid=()=>{description.setCustomValidity(description.value.trim()?'':'Describe what happened.');return form.reportValidity();};
 description.addEventListener('input',()=>description.setCustomValidity(''));
 const report=()=>buildBugReport({description:description.value,mode:mode.value});
 const revealCopy=text=>{fallback.hidden=false;copyText.value=text;copyText.focus();copyText.select();};
 button.onclick=()=>{sound('click');status.textContent='';fallback.hidden=true;dialog.showModal();description.focus();};
 dialog.querySelector('.support-report-close').onclick=()=>{sound('close');dialog.close();};
 dialog.addEventListener('close',()=>button.focus());
 form.addEventListener('submit',event=>{
  event.preventDefault();if(!valid())return;
  const payload=report();sound('click');
  if(payload.copyRequired){revealCopy(payload.text);status.textContent='Copy your report, then paste it into your email app and send it.';}
  else status.textContent='Finish sending in your email app. If it did not open, use Copy report and email the address below.';
  try{openSupportLink(payload.href);}catch{revealCopy(payload.text);status.textContent='Email could not open. Copy your report and email it to the address below.';}
 });
 dialog.querySelector('.support-report-copy').onclick=async()=>{
  if(!valid())return;
  const payload=report();sound('click');
  try{await doc.defaultView.navigator.clipboard.writeText(payload.text);status.textContent='Report copied. Paste it into an email to the address below.';}
  catch{revealCopy(payload.text);status.textContent='Select and copy the report below, then paste it into your email.';}
 };
 return button;
}
