// Keep artwork proportions while extending the world to every display edge.
export function sliceViewport(width,height){
 const w=Math.max(1,Number(width)||1),h=Math.max(1,Number(height)||1),scale=Math.min(w/360,h/560);
 const x=(w-360*scale)/2,y=h-560*scale;
 return {x,y,scale,bounds:{left:-x/scale,top:-y/scale,right:(w-x)/scale,bottom:560,launchTop:(Math.min(h*.38,h<=650?116:148)-y)/scale}};
}
export const SLICE_DEFAULT_BOUNDS=Object.freeze({left:0,top:0,right:360,bottom:560});
export function normalizeSliceBounds(value={}){
 return Number.isFinite(value.left)&&Number.isFinite(value.top)&&Number.isFinite(value.right)&&Number.isFinite(value.bottom)&&value.right-value.left>=100&&value.bottom-value.top>=100?{...value}:{...SLICE_DEFAULT_BOUNDS};
}
