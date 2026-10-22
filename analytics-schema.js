// Closed vocabulary: no free text, IDs, device properties or client timestamps.
export const CATEGORIES=['Sessions','Modes','Adventure','Matching','Economy','Ads','Performance'];
const modes=['adventure','endless','rush'],difficulty=['easy','normal','hard','extreme'];
const levels=Array.from({length:100},(_,i)=>String(i+1));
const time=['under-1m','1-5m','5-15m','15-30m','30m-plus'];
export const METRICS=[
 ['sessions','Sessions started',0,['all']],
 ['active_seconds','Active play time',0,modes,'seconds'],
 ['average_session','Average active session',0,[],'average'],
 ['session_length','Session length',0,time],
 ['idle_seconds','Visible idle time',0,['all'],'seconds'],
 ['paused_seconds','Paused time',0,['all'],'seconds'],
 ['no_run','Sessions without a run',0,['all']],
 ['runs','Runs started',1,modes],
 ['mode_seconds','Time by mode',1,modes,'seconds'],
 ['difficulty_runs','Runs by difficulty',1,difficulty],
 ['difficulty_changes','Difficulty selections',1,difficulty],
 ['abandoned','Runs abandoned',1,modes],
 ['level_starts','Level starts',2,levels],
 ['level_wins','Level wins',2,levels],
 ['level_losses','Level losses',2,levels],
 ['completion_rate','Level completion rate',2,[],'rate'],
 ['completion_time','Winning level duration',2,time],
 ['stars','Stars earned',2,['0','1','2','3']],
 ['objectives','Objectives completed',2,['picks','collection','colorChanges','shapeChanges','streak','score','time','wrong']],
 ['layouts','Layout outcomes',2,[...['classic','diamond','steps','terraces','ring'].flatMap(n=>[n+'-win',n+'-loss'])]],
 ['correct','Correct picks',3,modes],
 ['wrong','Wrong picks',3,modes],
 ['missed','Missed opportunities',3,modes],
 ['response','Pick response time',3,['under-500ms','500ms-1s','1-2s','2s-plus']],
 ['streak','Completed streak length',3,['1-2','3-5','6-10','11-20','21-plus']],
 ['boosts','Boost charges activated',3,['shield','freeze','boost']],
 ['specials','Special items activated',3,['starburst','hourglass','crystal','reset','heart']],
 ['rocks','Rock damage and destruction',3,['crack','destroy']],
 ['coins_earned','Coins earned',4,['match','quest','ad']],
 ['coins_spent','Coins spent',4,['boost','avatar','frame','background','upgrade']],
 ['shop','Shop visits by tab',4,['boosts','avatars','frames','worlds']],
 ['purchases','Items purchased',4,['shield','freeze','boost','avatar-0','avatar-1','avatar-2','avatar-3','avatar-4','avatar-5','gold','ice','blossom','cosmic','moon','sunset','gold-upgrade','ice-upgrade']],
 ['blocked','Blocked purchases',4,['coins','level','inventory']],
 ['quests','Quests completed',4,['streak','color','score','picks','wear']],
 ['claims','Quest rewards claimed',4,['single','all']],
 ['ad_offers','Reward offers shown',5,['menu','continue','run-bonus']],
 ['ad_selections','Watch-ad selections',5,['menu','continue','run-bonus']],
 ['ad_complete','Rewarded ads completed',5,['menu','continue','run-bonus']],
 ['ad_outcome','Other ad outcomes',5,['dismissed','unavailable','failed','unsupported']],
 ['frames','Frame timing',6,['under-20ms','20-34ms','34-50ms','50ms-plus']]
].map(([id,title,category,buckets,unit='count'],i)=>({id,title,category:CATEGORIES[category],buckets,unit,number:i+1}));
const allowed=new Map(METRICS.map(m=>[m.id,new Set(m.buckets)]));
export function validCounter(metric,bucket,value){return allowed.get(metric)?.has(bucket)&&Number.isSafeInteger(value)&&value>0&&value<=86400;}
export function validateBatch(body){
 if(!body||Object.keys(body).length!==2||body.v!==1||!Array.isArray(body.counters)||body.counters.length>160)throw Error('Invalid batch');
 const seen=new Set();
 return body.counters.map(row=>{if(!Array.isArray(row)||row.length!==3||!validCounter(...row))throw Error('Invalid counter');const key=row[0]+':'+row[1];if(seen.has(key))throw Error('Duplicate counter');seen.add(key);return row;});
}
export const timeBucket=s=>s<60?time[0]:s<300?time[1]:s<900?time[2]:s<1800?time[3]:time[4];
