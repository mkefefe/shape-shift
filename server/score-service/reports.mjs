const MODES=new Set(['Menus or settings','Endless','Adventure','Shape Drop','Shape Slice','Piano Flow','Battle','Other']);
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const STATES=new Set(['new','read','resolved']);
const RETENTION=180*86400000;
const bad=message=>Object.assign(Error(message),{status:400});
export const isReportPath=path=>['/api/reports','/api/reports/inbox','/api/reports/status'].includes(path);
export function validateReport(body){
 if(!body||typeof body!=='object'||Array.isArray(body)||!UUID.test(body.id||''))throw bad('Invalid report reference.');
 const description=typeof body.description==='string'?body.description.trim():'';
 if(!description||description.length>2000)throw bad('Please describe the issue in 2,000 characters or fewer.');
 if(!MODES.has(body.mode))throw bad('Choose a game mode.');
 if(typeof body.build!=='string'||!/^\d+(?:\.\d+){1,3}$/.test(body.build)||body.build.length>32)throw bad('Invalid game version.');
 if(typeof body.distribution!=='string'||!/^[-a-z0-9]{1,40}$/.test(body.distribution))throw bad('Invalid game edition.');
 return {id:body.id.toLowerCase(),mode:body.mode,description,build:body.build,distribution:body.distribution};
}
export async function reportService(request,env,reply,{actor,readBody}){
 try{
  if(request.method!=='POST')return reply(405,{error:'Method not allowed.'});
  const reporter=await actor(request),body=await readBody(request,16000),path=new URL(request.url).pathname,now=Date.now();
  if(!body||typeof body!=='object'||Array.isArray(body))throw bad('Invalid report request.');
  if(path==='/api/reports'){
   const report=validateReport(body);
   const prior=await env.DB.prepare('SELECT reporter_id,mode,description,build,distribution FROM bug_reports WHERE id=?').bind(report.id).first();
   if(prior){
    if(prior.reporter_id!==reporter||['mode','description','build','distribution'].some(k=>prior[k]!==report[k]))return reply(409,{error:'This report reference was already used. Please send a new report.'});
    return reply(200,{saved:true,id:report.id});
   }
   if(env.CREATIONS&&!(await env.CREATIONS.limit({key:'reports:'+String(request.headers.get('CF-Connecting-IP')||reporter)})).success)return reply(429,{error:'Please wait a minute before sending another report.'});
   // The limit and insert are one SQL statement, including concurrent requests.
   const inserted=await env.DB.prepare("INSERT INTO bug_reports(id,reporter_id,mode,description,build,distribution,created_at,updated_at) SELECT ?,?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM bug_reports WHERE reporter_id=? AND created_at>?)<5 ON CONFLICT(id) DO NOTHING").bind(report.id,reporter,report.mode,report.description,report.build,report.distribution,now,now,reporter,now-3600000).run();
   if(inserted.meta.changes!==1){
    const saved=await env.DB.prepare('SELECT reporter_id,mode,description,build,distribution FROM bug_reports WHERE id=?').bind(report.id).first();
    if(saved&&saved.reporter_id===reporter&&['mode','description','build','distribution'].every(k=>saved[k]===report[k]))return reply(200,{saved:true,id:report.id});
    return reply(429,{error:'You have sent several reports. Your draft is kept; please try again later.'});
   }
   await env.DB.prepare('DELETE FROM bug_reports WHERE created_at<?').bind(now-RETENTION).run();
   return reply(201,{saved:true,id:report.id});
  }
  const owner=await env.DB.prepare('SELECT player_id FROM owners WHERE player_id=?').bind(reporter).first();
  if(!owner)return reply(403,{error:'Owner access required.'});
  await env.DB.prepare('DELETE FROM bug_reports WHERE created_at<?').bind(now-RETENTION).run();
  if(path==='/api/reports/status'){
   if(!UUID.test(body.id||'')||!STATES.has(body.status))throw bad('Invalid report update.');
   const result=await env.DB.prepare('UPDATE bug_reports SET status=?,updated_at=? WHERE id=?').bind(body.status,now,body.id.toLowerCase()).run();
   return result.meta.changes===1?reply(200,{saved:true,id:body.id.toLowerCase(),status:body.status}):reply(404,{error:'Report not found.'});
  }
  const filter=body.filter||'all';if(filter!=='all'&&!STATES.has(filter))throw bad('Invalid report filter.');
  const conditions=[],params=[];
  if(filter!=='all'){conditions.push('status=?');params.push(filter);}
  if(body.before){if(!Number.isSafeInteger(body.before.createdAt)||body.before.createdAt<0||!UUID.test(body.before.id||''))throw bad('Invalid page reference.');conditions.push('(created_at<? OR (created_at=? AND id<?))');params.push(body.before.createdAt,body.before.createdAt,body.before.id.toLowerCase());}
  const where=conditions.length?' WHERE '+conditions.join(' AND '):'';
  const rows=await env.DB.prepare('SELECT id,mode,description,build,distribution,created_at AS createdAt,status FROM bug_reports'+where+' ORDER BY created_at DESC,id DESC LIMIT 26').bind(...params).all();
  const reports=rows.results.slice(0,25),last=reports.at(-1),next=rows.results.length>25?{createdAt:last.createdAt,id:last.id}:null;
  const count=await env.DB.prepare("SELECT COUNT(*) AS n FROM bug_reports WHERE status='new'").first();
  return reply(200,{reports,next,unread:count.n});
 }catch(error){
  if(!error.status)console.error(JSON.stringify({event:'bug_report_failed',type:error.name}));
  return reply(error.status||503,{error:error.status?error.message:'Reports are temporarily unavailable. Your draft is kept; please retry.'});
 }
}
