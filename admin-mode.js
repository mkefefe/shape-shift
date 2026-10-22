import {COSMETICS,AVATARS,xpForLevel} from './economy.js?v=49439-web8';
import {SHAPE_SKINS} from './shape-skins.js?v=49439-web8';
export const ADMIN_COINS=1_000_000_000_000;
export function adminProfile(profile){return {...profile,adminMode:true,coins:ADMIN_COINS,xp:Math.max(profile.xp||0,xpForLevel(100)),adventureCompleted:100,owned:COSMETICS.map(x=>x.id),ownedAvatars:AVATARS.map(x=>x.id),ownedSkins:SHAPE_SKINS.map(x=>x.id),inventory:{shield:999,freeze:999,boost:999},upgrades:{gold:1,ice:2},pending:[]};}
