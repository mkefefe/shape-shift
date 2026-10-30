export const BATTLE_POWER_PRICES=Object.freeze([200,400,700,1100,1600,2200,2900,3700,4600,5600]);
export const battlePowerLevel=profile=>Math.min(10,Math.max(0,Number.isInteger(profile.battlePower)?profile.battlePower:0));
export const battleDamage=profile=>10+2*battlePowerLevel(profile);
export function buyBattlePower(profile){const level=battlePowerLevel(profile),price=BATTLE_POWER_PRICES[level];if(level>=10||!Number.isFinite(profile.coins)||profile.coins<price)return profile;return {...profile,battlePower:level+1,coins:profile.coins-price};}
