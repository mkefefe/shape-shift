// Path endpoints and tangent lengths agree between every pair of upright tiles.
export const ROUTE_SEGMENTS=Object.freeze([
 [500,0,584,83,660,167,660,250],
 [660,250,660,333,584,417,500,500],
 [500,500,416,583,340,667,340,750],
 [340,750,340,833,416,917,500,1000]
]);
// Draw beyond both tile edges so clipping cannot cut a diagonal road cap.
export const routePath='M500 -1000 '+[-1000,0,1000].flatMap(offset=>ROUTE_SEGMENTS.map(p=>'C'+p.slice(2).map((v,i)=>i%2?v+offset:v).join(' '))).join(' ');
export function routeArtwork(section){
 const id='route-grain-'+section;
 return `<div class="route-scenery"></div><svg class="route-road" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true"><defs><pattern id="${id}" width="37" height="43" patternUnits="userSpaceOnUse"><circle cx="6" cy="9" r="1" fill="#96774b" opacity=".22"/><circle cx="26" cy="31" r="1.3" fill="#fff7d9" opacity=".4"/></pattern></defs><path d="${routePath}" fill="none" stroke="#476b36" stroke-opacity=".18" stroke-width="150"/><path d="${routePath}" fill="none" stroke="#bca16c" stroke-width="138"/><path d="${routePath}" fill="none" stroke="#e6ce98" stroke-width="130"/><path d="${routePath}" fill="none" stroke="url(#${id})" stroke-width="130"/></svg>`;
}
