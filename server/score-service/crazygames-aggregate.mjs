import {validateBatch} from './crazygames-schema.mjs';
export async function aggregate(request,env,reply){
 if(request.method!=='POST')return reply(405,{error:'Method not allowed'});
 if(env.CREATIONS&&!(await env.CREATIONS.limit({key:'cg-metrics:'+ (request.headers.get('CF-Connecting-IP')||'unknown')})).success)return reply(429,{error:'Please retry later'});
 try{
  const reader=request.body?.getReader();if(!reader)return reply(400,{error:'Missing body'});let size=0,chunks=[];while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>16384){await reader.cancel();return reply(413,{error:'Too large'});}chunks.push(value);}
  const data=new Uint8Array(size);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.length;}
  let rows;try{rows=validateBatch(JSON.parse(new TextDecoder().decode(data)));}catch{return reply(400,{error:'Invalid counters'});}
  const day=new Date().toISOString().slice(0,10),cutoff=new Date(Date.now()-90*86400000).toISOString().slice(0,10);
  await env.DB.batch([env.DB.prepare('DELETE FROM crazygames_daily WHERE day < ?').bind(cutoff),...rows.map(([metric,bucket,value])=>env.DB.prepare('INSERT INTO crazygames_daily(day,metric,bucket,value) VALUES(?,?,?,?) ON CONFLICT(day,metric,bucket) DO UPDATE SET value=value+excluded.value').bind(day,metric,bucket,value))]);
  return reply(200,{accepted:rows.length});
 }catch(error){console.error(JSON.stringify({event:'crazygames_metrics_failed',type:error.name}));return reply(503,{error:'Statistics unavailable'});}
}
