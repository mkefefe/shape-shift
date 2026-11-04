// A retained iframe has its own decoded-image and skin-atlas caches. Prepare
// every image its styles or controls may reveal before announcing readiness.
export function battleArtSources(document){
 const sources=new Set([new URL('../assets/close-v45.webp',document.baseURI).href]);
 for(const image of document.images)if(image.currentSrc||image.src)sources.add(new URL(image.currentSrc||image.src,document.baseURI).href);
 for(const sheet of document.styleSheets){
  const base=sheet.href||document.baseURI;
  for(const rule of sheet.cssRules)for(const match of rule.cssText.matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/g)){
   if(/\.(?:webp|png|jpe?g|svg)(?:[?#]|$)/i.test(match[1]))sources.add(new URL(match[1],base).href);
  }
 }
 return [...sources];
}
export async function prepareBattleArt(document,{prepareImage,prepareSkin,skins,awaitReady}){
 const work=[...battleArtSources(document).map(prepareImage),...skins.map(skin=>prepareSkin(skin.id))];
 if(document.fonts)work.push(awaitReady(document.fonts.load('20px Nunito'),'Battle font').then(fonts=>fonts.length>0));
 try{return (await Promise.all(work)).every(Boolean);}catch{return false;}
}
