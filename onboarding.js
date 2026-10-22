export const RESET_KEY='shape-shift-fresh-start-v34';
export const TUTORIAL_KEY='shape-shift-tutorial-v1';
export function resetProgressOnce(storage){
 if(storage.getItem(RESET_KEY)==='done')return false;
 for(const key of ['shape-shift-profile-v1','shape-shift-endless-best-v3',TUTORIAL_KEY])storage.removeItem(key);
 storage.setItem('shape-shift-profile-v1',JSON.stringify({coins:0,xp:0,inventory:{shield:0,freeze:0,boost:0},owned:[],equipped:{frame:'none',background:'garden'},runs:[],pending:[]}));
 storage.setItem(RESET_KEY,'done');return true;
}
export const LESSONS=[
 {title:'Match the shape',copy:'Tap the blue square. Same shape, new color!',current:{shape:2,color:0},choices:[{shape:2,color:1},{shape:0,color:2}],answer:0},
 {title:'Match the color',copy:'Tap the blue circle. Same color, new shape!',current:{shape:2,color:1},choices:[{shape:1,color:0},{shape:0,color:1}],answer:1},
 {title:'Avoid a mismatch',copy:'Tap the green circle. Avoid the red triangle: neither its shape nor color matches.',current:{shape:0,color:1},choices:[{shape:0,color:2},{shape:1,color:0}],answer:0},
 {title:'No match? Let it pass',copy:'Neither tile matches. Let the timer pass without tapping. No matching choice means no lost life.',current:{shape:0,color:2},choices:[{shape:2,color:0},{shape:1,color:1}],answer:null}
];
