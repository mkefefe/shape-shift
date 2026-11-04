import {LEADERBOARD_URL} from './leaderboard.js?v=494240';

export const REPORT_MODES=Object.freeze(['Menus or settings','Endless','Adventure','Shape Drop','Shape Slice','Piano Flow','Battle','Other']);
export const REPORT_STATUSES=Object.freeze(['new','read','resolved']);
export const REPORT_FILTERS=Object.freeze(['all',...REPORT_STATUSES]);
export const REPORT_TOKEN_KEY='shape-shift-player-token';
const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const changed=()=>Object.assign(Error('Your player session changed. Please reopen this screen.'),{code:'SESSION_CHANGED'});
export function supportErrorMessage(error){
 if(error?.code==='SESSION_CHANGED')return 'Your player session changed. Your draft is kept; reopen this screen to try again.';
 if(error?.status===429)return 'Please wait a little before sending another report. Your draft is kept.';
 if(error?.status===401||error?.status===403)return 'Could not verify this player session. Your draft is kept; reopen the game and try again.';
 if(error?.status===409)return 'This report could not be confirmed. Edit the message and try again; your draft is kept.';
 if(error?.code==='TIMEOUT'||error?.name==='AbortError')return 'The server took too long to respond. Your draft is kept; try again.';
 return 'Could not send right now. Your draft is kept; check your connection and try again.';
}

// Reports use the same installation credential, separately from rankings and
// optional analytics. No address, photo, gameplay history or auth data is sent
// in the report body. Authorization is enforced by the server on every inbox call.
export async function supportRequest(path,body,{platform=globalThis.window.ShapeShiftPlatform,fetcher=globalThis.fetch,signal,timeout=12000,randomId=()=>crypto.randomUUID()}={}){
 if(!['/api/reports','/api/reports/inbox','/api/reports/status'].includes(path))throw Error('Unknown report request.');
 const storage=platform.storage;let credential=storage.getItem(REPORT_TOKEN_KEY);
 if(!credential){credential=randomId()+randomId();storage.setItem(REPORT_TOKEN_KEY,credential);}
 const current=()=>storage.getItem(REPORT_TOKEN_KEY)===credential;
 const controller=new AbortController();let timedOut=false;
 const stop=()=>controller.abort();signal?.addEventListener('abort',stop,{once:true});if(signal?.aborted)stop();
 const timer=setTimeout(()=>{timedOut=true;stop();},Math.max(1,Math.min(12000,timeout)));
 const monitor=setInterval(()=>{if(!current())stop();},200);
 try{
  if(!current())throw changed();
  const response=await fetcher(LEADERBOARD_URL+path,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+credential},body:JSON.stringify(body),signal:controller.signal,cache:'no-store',credentials:'omit'});
  if(!current())throw changed();
  let result;try{result=await response.json();}catch{throw Error('The server did not confirm the report.');}
  if(!current())throw changed();
  if(!response.ok)throw Object.assign(Error('Report request failed.'),{status:response.status});
  return result;
 }catch(error){
  if(!current())throw changed();
  if(timedOut)throw Object.assign(Error('Report request timed out.'),{code:'TIMEOUT'});
  throw error;
 }finally{clearTimeout(timer);clearInterval(monitor);signal?.removeEventListener('abort',stop);}
}

export async function submitBugReport(payload,options){
 const {id,mode,description,build,distribution}=payload;
 if(!uuid(id)||!REPORT_MODES.includes(mode)||typeof description!=='string'||!description.trim()||description.trim().length>2000)throw Error('Please enter a report of up to 2,000 characters.');
 const result=await supportRequest('/api/reports',{id,mode,description:description.trim(),build,distribution},options);
 if(result?.saved!==true||result.id!==id)throw Error('The server did not confirm this report.');
 return {saved:true,id};
}

export async function loadReportInbox({filter='new',before}={},options){
 if(!REPORT_FILTERS.includes(filter))throw Error('Invalid report filter.');
 const result=await supportRequest('/api/reports/inbox',{filter,...(before?{before}:{})},options);
 if(!Array.isArray(result?.reports)||result.reports.length>25||!Number.isSafeInteger(result.unread)||result.unread<0||!result.reports.every(row=>uuid(row?.id)&&REPORT_MODES.includes(row.mode)&&typeof row.description==='string'&&row.description.length<=2000&&typeof row.build==='string'&&typeof row.distribution==='string'&&Number.isFinite(row.createdAt)&&REPORT_STATUSES.includes(row.status))||!(result.next===null||uuid(result.next?.id)&&Number.isFinite(result.next?.createdAt)))throw Error('The server returned an incomplete report list.');
 return result;
}

export async function updateReportStatus(id,status,options){
 if(!uuid(id)||!REPORT_STATUSES.includes(status))throw Error('Invalid report status.');
 const result=await supportRequest('/api/reports/status',{id,status},options);
 if(result?.saved!==true||result.id!==id||result.status!==status)throw Error('The server did not confirm the report status.');
 return result;
}
