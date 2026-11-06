import {prepareMenuImage} from './menu-preload.js?v=494241';
export function mapTerrainFilter(section){
 const moon=Math.max(0,Math.min(1,(section-10)/6)),sunset=Math.max(0,Math.min(1,(section-27)/6));
 return `hue-rotate(${38*moon-63*sunset}deg) saturate(${.96-.28*moon+.2*sunset}) brightness(${1.055-.235*moon+.15*sunset}) sepia(${.4*sunset})`;
}
// Retain painted pixels, not fifty live GPU filter/mask layers that are discarded
// and rasterized again when distant sections re-enter the viewport.
export function createMapScenery({document=globalThis.document,load=prepareMenuImage}={}){
 const sections=new Map();let pending;
 const prepare=()=>pending??=(async()=>{
  const art=await load('assets/map-meadow-v212.webp');
  for(let section=0;section<50;section++){
   if(sections.has(section))continue;
   const canvas=document.createElement('canvas');canvas.width=512;canvas.height=676;canvas.setAttribute('aria-hidden','true');
   const context=canvas.getContext('2d');context.filter=mapTerrainFilter(section);context.drawImage(art,0,0,512,676);context.filter='none';
   context.globalCompositeOperation='destination-in';const fade=context.createLinearGradient(0,0,0,676);
   fade.addColorStop(0,'transparent');fade.addColorStop(.24,'#000');fade.addColorStop(.76,'#000');fade.addColorStop(1,'transparent');context.fillStyle=fade;context.fillRect(0,0,512,676);context.globalCompositeOperation='source-over';
   sections.set(section,canvas);
  }
 })().catch(error=>{pending=null;throw error;});
 return {prepare,get:section=>sections.get(section)};
}
