const MODES=new Set(['drop','slice','piano']);
const shapeOrColor=value=>Number.isInteger(value)&&value>=0&&value<4;

// Mini-games report actions, not board picks. Count one completed action at a
// time, preserving only the shape/color that the action actually establishes.
export function normalizeMiniQuestEvent(event){
 if(!event||!MODES.has(event.mode))return null;
 if(event.type==='start'||event.type==='finish')return {...event};
 if(event.type==='failure')return {...event,type:'pick',correct:false,outcome:event.hazard?'wrong':'miss',lostLife:event.failure===true};
 if(event.type!=='success')return null;
 const tile={};
 if(event.mode==='drop'){
  // One connected merge can span several shapes AND colors. It is one match,
  // not one selection per cleared piece; only shared attributes are credited.
  if(!Array.isArray(event.pieces)||event.pieces.length<2)return null;
  for(const key of ['shape','color']){
   const value=event.pieces[0]?.[key];
   if(shapeOrColor(value)&&event.pieces.every(piece=>piece?.[key]===value&&!piece.special&&!piece.bomb))tile[key]=value;
  }
 }else{
  for(const key of ['shape','color'])if(shapeOrColor(event.tile?.[key]))tile[key]=event.tile[key];
 }
 const next={...event,type:'pick',correct:true,outcome:'correct',tile:Object.keys(tile).length?tile:null};
 // Existing producers omit score. Never turn action counts into an invented
 // score: combo, frame and other bonuses can make those numbers different.
 if(!Number.isSafeInteger(next.score)||next.score<0)delete next.score;
 return next;
}
