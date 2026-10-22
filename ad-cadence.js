export const RUN_AD_INTERVAL=5;
export const RUN_AD_REWARD=1000;
export function normalizeCadence(v={}){return {runs:Number.isInteger(v?.runs)&&v.runs>=0?v.runs%RUN_AD_INTERVAL:0,lastRun:typeof v?.lastRun==='string'?v.lastRun:'',rewardedRun:typeof v?.rewardedRun==='string'?v.rewardedRun:''};}
export function completeAdRun(value,id){const s=normalizeCadence(value);if(!id||s.lastRun===id)return {state:s,offer:false};s.lastRun=id;if(s.rewardedRun===id)return {state:s,offer:false};s.runs++;const offer=s.runs>=RUN_AD_INTERVAL;if(offer)s.runs=0;return {state:s,offer};}
export function watchedAd(value,id=''){return {...normalizeCadence(value),runs:0,rewardedRun:id};}
export function grantRunAdReward(profile,status){return status==='rewarded'?{...profile,coins:profile.coins+RUN_AD_REWARD}:profile;}
