import {frameRewardMultiplier} from './engine.js?v=49439-web2';
import {normalizeSkins} from './shape-skins.js?v=49439-web2';
export const BOOST_UNLOCK_LEVELS=Object.freeze({shield:3,freeze:5,boost:8});
export const boostUnlocked=(profile,name)=>Object.hasOwn(BOOST_UNLOCK_LEVELS,name)&&(profile.adventureCompleted||0)>=BOOST_UNLOCK_LEVELS[name];
export const PRICES=Object.freeze({shield:100,freeze:100,boost:100});
export function boostPrice(profile,item){const base=PRICES[item];if(!base)return 0;const n=profile.purchases?.[item];const count=Number.isSafeInteger(n)&&n>=0?n:0;return Math.min(Number.MAX_SAFE_INTEGER,Math.ceil(base*1.25**count));}
export function freshProfile(){return {coins:0,ownedSkins:['classic'],ownedAvatars:[0],avatarUnlocksMigrated:false,upgrades:{gold:0,ice:0},purchases:{shield:0,freeze:0,boost:0},inventory:{shield:0,freeze:0,boost:0},runs:[],pending:[],xp:0,owned:[],equipped:{frame:"none",background:"garden",skin:"classic"}};}
export function normalizeProfile(value){
 const p=value&&typeof value==='object'?value:freshProfile();
 const integer=n=>Number.isSafeInteger(n)&&n>=0?n:0;
 const owned=Array.isArray(p.owned)?p.owned.filter(id=>COSMETICS.some(c=>c.id===id)):[];
 const equipped={frame:'none',background:'garden',skin:p.equipped?.skin};for(const kind of ['frame','background']){const item=COSMETICS.find(c=>c.id===p.equipped?.[kind]&&c.kind===kind);if(item&&owned.includes(item.id))equipped[kind]=item.id;}
 return unlockLevelAvatars(normalizeSkins({...p,ownedAvatars:[...new Set([0,...(Array.isArray(p.ownedAvatars)?p.ownedAvatars.filter(n=>Number.isInteger(n)&&n>=0&&n<6):[])])],avatarUnlocksMigrated:p.avatarUnlocksMigrated===true,upgrades:{gold:owned.includes('gold')?Math.min(1,integer(p.upgrades?.gold)):0,ice:owned.includes('ice')?Math.min(2,integer(p.upgrades?.ice)):0},purchases:Object.fromEntries(Object.keys(PRICES).map(k=>[k,integer(p.purchases?.[k])])),xp:integer(p.xp),owned,equipped,coins:integer(p.coins),inventory:Object.fromEntries(Object.keys(PRICES).map(k=>[k,Math.min(999,integer(p.inventory?.[k]))])),runs:Array.isArray(p.runs)?p.runs.slice(0,30):[],pending:Array.isArray(p.pending)?p.pending.slice(0,20):[]}));
}
export function buy(profile,item){const price=boostPrice(profile,item);if(!price||profile.coins<price||profile.inventory[item]>=999)return profile;return {...profile,coins:profile.coins-price,purchases:{...profile.purchases,[item]:Math.min(Number.MAX_SAFE_INTEGER,(profile.purchases?.[item]||0)+1)},inventory:{...profile.inventory,[item]:profile.inventory[item]+1}};}
export function consume(profile,item){if(!PRICES[item]||profile.inventory[item]<=0)return profile;return {...profile,inventory:{...profile.inventory,[item]:profile.inventory[item]-1}};}
export const XP_PER_MATCH=3;
export const ADVENTURE_COMPLETION_XP=25;
export function adventureCompletionReward(profile,won){return won?{...profile,xp:(profile.xp||0)+ADVENTURE_COMPLETION_XP*frameRewardMultiplier(profile.equipped?.frame)}:profile;}
export const matchCoinReward=state=>state?.multiplier===5?5:1;
export function earnCoin(profile,state){return {...profile,coins:profile.coins+matchCoinReward(state),xp:(profile.xp||0)+XP_PER_MATCH*frameRewardMultiplier(state?.frame??profile.equipped?.frame)};}
export const earnsMatchCoin=(state,tile)=>state.outcome==='correct'&&!state.specialEffect&&!!tile&&!tile.special&&!tile.collected;

export const COSMETICS=Object.freeze([
 {id:'gold',kind:'frame',name:'Golden laurel',price:400,level:5,index:0},
 {id:'ice',kind:'frame',name:'Crystal halo',price:900,level:12,index:1},
 {id:'blossom',kind:'frame',name:'Blossom Wrath',price:1600,level:25,index:2},
 {id:'cosmic',kind:'frame',name:'Cosmic crown',price:3000,level:45,index:3},
 {id:'moon',kind:'background',name:'Moonlit forest',price:1200,level:20,index:0},
 {id:'sunset',kind:'background',name:'Sunset islands',price:2400,level:35,index:1}
]);
export const MAX_PLAYER_LEVEL=100;
export const xpRequiredForLevel=level=>level>=MAX_PLAYER_LEVEL?0:level<=10?50+Math.ceil((Math.max(1,level)-1)*50/9):100+level-10;
export function xpForLevel(level){let total=0;for(let n=1;n<Math.min(MAX_PLAYER_LEVEL,level);n++)total+=xpRequiredForLevel(n);return total;}
export function playerProgress(xp=0){
 let current=Number.isFinite(xp)?Math.max(0,Math.floor(xp)):0,level=1;
 while(level<MAX_PLAYER_LEVEL&&current>=xpRequiredForLevel(level)){current-=xpRequiredForLevel(level);level++;}
 return {level,current:level===MAX_PLAYER_LEVEL?0:current,required:xpRequiredForLevel(level),capped:level===MAX_PLAYER_LEVEL};
}
export const playerLevel=p=>playerProgress(p.xp).level;
export function buyCosmetic(p,id){const item=COSMETICS.find(c=>c.id===id);if(!item||p.owned.includes(id)||playerLevel(p)<item.level||p.coins<item.price)return p;return {...p,coins:p.coins-item.price,owned:[...p.owned,id],equipped:{...p.equipped,[item.kind]:id}};}
export function equipCosmetic(p,kind,id){if(!['frame','background'].includes(kind))return p;if(!((kind==='frame'&&id==='none')||(kind==='background'&&id==='garden')||p.owned.includes(id)&&COSMETICS.some(c=>c.id===id&&c.kind===kind)))return p;return {...p,equipped:{...p.equipped,[kind]:id}};}

export const VIDEO_COIN_REWARD=500;

// Ad rewards affect the spendable wallet only, never XP or leaderboard score.
export function rewardVideoCoins(profile,status){
 if(status!=='rewarded')return profile;
 return {...profile,coins:Math.min(Number.MAX_SAFE_INTEGER,profile.coins+VIDEO_COIN_REWARD)};
}

export const FRAME_UPGRADES=Object.freeze({gold:[{level:30,price:1800,benefit:'5 hearts'}],ice:[{level:30,price:1500,benefit:'15% more time'},{level:55,price:2800,benefit:'20% more time'}]});
export function nextFrameUpgrade(p,id){return FRAME_UPGRADES[id]?.[p.upgrades?.[id]||0]||null;}
export function upgradeFrame(p,id){
 const next=nextFrameUpgrade(p,id);if(!p.owned.includes(id)||!next||playerLevel(p)<next.level||p.coins<next.price)return p;
 return {...p,coins:p.coins-next.price,upgrades:{...p.upgrades,[id]:(p.upgrades?.[id]||0)+1}};
}

export const AVATARS=Object.freeze([
 {id:0,name:'Fox',level:1,price:0},
 {id:1,name:'Penguin',level:8,price:0},
 {id:2,name:'Cat',level:15,price:0},
 {id:3,name:'Frog',level:25,price:0},
 {id:4,name:'Dragon',level:40,price:0},
 {id:5,name:'Bear',level:60,price:0}
]);
export function preserveStarterAvatar(p,current){
 if(p.avatarUnlocksMigrated)return p;
 const ids=[...(p.ownedAvatars||[0])];if(Number.isInteger(current)&&current>=0&&current<6)ids.push(current);
 return {...p,ownedAvatars:[...new Set([0,...ids])],avatarUnlocksMigrated:true};
}
export function buyAvatar(p,id){
 const a=AVATARS.find(a=>a.id===id);
 if(!a||p.ownedAvatars.includes(id)||playerLevel(p)<a.level)return p;
 return {...p,coins:p.coins,ownedAvatars:[...p.ownedAvatars,id]};
}

export function grantAdventureBoosts(profile,completed){
 const grants={...profile.boostUnlockGrants},inventory={...profile.inventory};
 for(const [name,level] of Object.entries(BOOST_UNLOCK_LEVELS))if(completed>=level&&!grants[name]){inventory[name]=Math.min(999,(inventory[name]||0)+3);grants[name]=true;}
 return {...profile,adventureCompleted:completed,boostUnlockGrants:grants,inventory};
}

export function unlockLevelAvatars(p){
 const eligible=AVATARS.filter(a=>a.level<=playerLevel(p)).map(a=>a.id),owned=p.ownedAvatars||[0];
 if(eligible.every(id=>owned.includes(id)))return p;
 return {...p,ownedAvatars:[...new Set([...owned,...eligible])]};
}
