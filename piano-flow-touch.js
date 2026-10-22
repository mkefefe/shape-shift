export function pianoLayout(w,h,rhythm=false,stripTap=false,bottomLine=false){const width=Math.min(w-16,580),lanes=rhythm?4:3,lane=width/lanes,size=Math.min(78,lane*.72),top=Math.min(164,h*.29),hit=bottomLine?h-Math.max(44,h*.055):rhythm&&!stripTap?h-Math.max(65,h*.12):h+size/2;return {w,h,x:(w-width)/2,lane,lanes,size,top,hit,missLine:bottomLine?hit:null,rhythm,unit:(hit-top)/4};}
export function pianoTarget(note,beat,layout){return {x:note.anchor?note.anchor.x*layout.w:layout.x+(note.lane+.5)*layout.lane,y:note.anchor?note.anchor.y*layout.h:layout.hit-(note.beat-(layout.rhythm?beat:Math.max(0,beat)))*layout.unit,size:layout.size};}
export function touchedPianoNote(notes,beat,layout,x,y){
 if(beat<(layout.rhythm?-.38:0)||y<layout.top||y>layout.h)return null;
 return notes.filter(n=>n.status==='waiting'||n.status==='holding'&&n.awaiting).map(n=>({n,p:pianoTarget(n,beat,layout)})).filter(({p})=>p.y>=layout.top-p.size/2&&p.y-p.size/2<layout.h&&Math.abs(x-p.x)<=p.size/2+7&&Math.abs(y-p.y)<=p.size/2+7).sort((a,b)=>Math.hypot(x-a.p.x,y-a.p.y)-Math.hypot(x-b.p.x,y-b.p.y))[0]?.n||null;
}
export function pianoStripNote(notes,beat,layout,x,y){
 if(x<layout.x||x>=layout.x+layout.lane*layout.lanes||y<layout.top-12||y>layout.h)return null;
 const lane=Math.floor((x-layout.x)/layout.lane),held=notes.find(n=>n.lane===lane&&n.status==='holding'&&n.awaiting);if(held)return held;
 return notes.find(n=>{if(n.lane!==lane||!['waiting','partial'].includes(n.status))return false;const p=pianoTarget(n,beat,layout);return p.y+p.size/2>=layout.top&&p.y-p.size/2<layout.h;})||null;
}

export function pianoStripAt(layout,x,y){
 if(x<layout.x||x>=layout.x+layout.lane*layout.lanes||y<layout.top-12||y>layout.h)return null;
 return Math.floor((x-layout.x)/layout.lane);
}
