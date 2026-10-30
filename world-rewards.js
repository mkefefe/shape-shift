import {playerLevel} from './economy.js?v=494200';
import {applyRestorationReward,normalizeRestoration} from './world-restoration.js?v=494200';

const safeAmount=value=>Number.isSafeInteger(value)&&value>=0;
const profileObject=value=>value&&typeof value==='object'&&!Array.isArray(value);
const clearReceipt=/^battle:clear:([1-9]|[12][0-9]|30)$/;
const matchReceipt=/^battle:match:([a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}):([1-9][0-9]*)$/;
const idleResult=profile=>applyRestorationReward(profile?.worldRestoration,{admin:true});
function canonicalBattleReceipt(value){
 if(typeof value!=='string')return null;
 if(clearReceipt.test(value))return value;
 const match=matchReceipt.exec(value);
 return match&&Number.isSafeInteger(Number(match[2]))?`battle:match:${match[1].toLowerCase()}:${match[2]}`:null;
}

// The caller already credited the gameplay XP to the shared profile. Copy that
// same earned amount into restoration; never credit the wallet or XP twice.
export function creditRestoration(profile,{mode,xp=0,receipt,firstAdventureWin=false}={}){
 const result=applyRestorationReward(profile?.worldRestoration,{mode,xp,receipt,firstAdventureWin,playerLevel:playerLevel(profile||{}),admin:!profileObject(profile)||profile.adminMode===true});
 const before=normalizeRestoration(profile?.worldRestoration);
 const changed=result.addedXp>0||result.state.firstAdventureWin!==before.firstAdventureWin||
  result.state.restoredCount!==before.restoredCount||result.state.taskProgress!==before.taskProgress||JSON.stringify(result.state.modeTasks)!==JSON.stringify(before.modeTasks);
 return {profile:changed?{...profile,worldRestoration:result.state}:profile,result};
}

// Return a single immutable wallet + XP + restoration transaction. The host
// persists this profile before acknowledging the child's reward queue.
export function creditBattleReward(profile,reward){
 const unchanged=(accepted=false)=>({profile,result:idleResult(profile),accepted});
 if(!profileObject(profile)||!reward||reward.mode!=='battle'||!safeAmount(reward.coins)||!safeAmount(reward.xp))return unchanged();
 const receipt=canonicalBattleReceipt(reward.receipt);if(!receipt)return unchanged();
 if(profile.adminMode===true)return unchanged(true);
 const clear=clearReceipt.test(receipt);
 const permanent=[...new Set((Array.isArray(profile.battleClearRewards)?profile.battleClearRewards:[]).filter(id=>typeof id==='string'&&clearReceipt.test(id)))];
 const ledger=normalizeRestoration(profile.worldRestoration);
 if(clear&&permanent.includes(receipt))return unchanged(true);
 if(ledger.receipts.includes(receipt)){
  // Promote a clear saved in an earlier ledger into the permanent list before
  // the bounded recent-receipt window can age it out. Never pay it again.
  return clear?{profile:{...profile,battleClearRewards:[...permanent,receipt]},result:idleResult(profile),accepted:true}:unchanged(true);
 }
 if(!safeAmount(profile.coins)||!safeAmount(profile.xp))return unchanged();
 const coins=profile.coins+reward.coins,xp=profile.xp+reward.xp;
 if(!safeAmount(coins)||!safeAmount(xp))return unchanged();
 const result=applyRestorationReward(ledger,{mode:'battle',xp:reward.xp,receipt,playerLevel:playerLevel({...profile,xp})});
 const next={...profile,coins,xp,worldRestoration:result.state};
 if(clear)next.battleClearRewards=[...permanent,receipt];
 return {profile:next,result,accepted:true};
}
