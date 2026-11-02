// Only the Android bridge can show a native rewarded ad. Ordinary browser builds stay ad-free.
export function requestReward(host, timeout=120000, placement='default'){
 if(typeof host?.ShapeShiftAds?.showRewarded!=='function')return Promise.resolve('unsupported');
 return new Promise(resolve=>{
  const id='reward-'+(placement==='run-bonus'?'bonus-':'')+Date.now()+'-'+Math.random().toString(36).slice(2);
  let done=false;
  const finish=status=>{
   if(done)return;
   done=true;clearTimeout(timer);host.removeEventListener('rewardedad',listener);resolve(status);
  };
  const listener=event=>{
   const detail=event.detail;
   if(detail?.id===id&&['rewarded','dismissed','unavailable','failed'].includes(detail.status))finish(detail.status);
  };
  const timer=setTimeout(()=>finish('unavailable'),timeout);
  host.addEventListener('rewardedad',listener);
  try{host.ShapeShiftAds.showRewarded(id);}catch{finish('failed');}
 });
}
