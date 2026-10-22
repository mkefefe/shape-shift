import {playerLevel} from './economy.js?v=49439-web7';
export const SHAPE_SKINS=Object.freeze([
 {id:'classic',level:1,name:'Classic',price:0,art:'assets/shapes-v2.webp',chainedArt:'assets/skin-classic-wrapped-v318.webp'},
 {id:'candy',level:5,name:'Candy Swirl',price:300,art:'assets/skin-candy-v273.webp',chainedArt:'assets/skin-candy-wrapped-v318.webp'},
 {id:'crystal',level:15,name:'Cartoon Pop',price:700,art:'assets/skin-cartoon-v315.webp',chainedArt:'assets/skin-cartoon-wrapped-v318.webp'},
 {id:'robots',level:30,name:'Tiny Bots',price:1200,art:'assets/skin-robots-v272.webp',chainedArt:'assets/skin-robots-wrapped-v318.webp'},
 {id:'starlight',level:50,name:'Starlight',price:1800,art:'assets/skin-starlight-v273.webp',chainedArt:'assets/skin-starlight-wrapped-v318.webp'}
]);
const migratedSkin=id=>id==='pals'?'candy':id==='monsters'?'starlight':id==='whiskers'?'crystal':id;
export function normalizeSkins(p){
 const ownedSkins=[...new Set(['classic',...(Array.isArray(p.ownedSkins)?p.ownedSkins.map(migratedSkin).filter(id=>SHAPE_SKINS.some(s=>s.id===id)):[])])];
 return {...p,ownedSkins,equipped:{...p.equipped,skin:ownedSkins.includes(migratedSkin(p.equipped?.skin))?migratedSkin(p.equipped.skin):'classic'}};
}
export function equipSkin(p,id){if(!SHAPE_SKINS.some(s=>s.id===id)||!p.ownedSkins?.includes(id)||p.equipped?.skin===id)return p;return {...p,equipped:{...p.equipped,skin:id}};}
export function skinUnlocked(p,id){const skin=SHAPE_SKINS.find(s=>s.id===id);return !!skin&&(p.adminMode===true||p.ownedSkins?.includes(id)||playerLevel(p)>=skin.level);}
export function buySkin(p,id){
 const skin=SHAPE_SKINS.find(s=>s.id===id);if(!skin||!skinUnlocked(p,id)||p.ownedSkins?.includes(id)||!Number.isSafeInteger(p.coins)||p.coins<skin.price)return p;
 return {...p,coins:p.coins-skin.price,ownedSkins:[...(p.ownedSkins||['classic']),id],equipped:{...p.equipped,skin:id}};
}
