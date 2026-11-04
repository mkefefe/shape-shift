// Written formations and their order are level content, not random seeds.
// Repeating a formation preserves its shapes, colors, spacing and flight.
const target=(x,shape,color,angle,spin,offset=0)=>Object.freeze({x,shape,color,angle,spin,offset,r:27,hazard:false,flight:2.8});
const bomb=x=>Object.freeze({x,shape:0,color:0,angle:0,spin:.35,offset:35,r:24,hazard:true,flight:2.6});
const formations=Object.freeze({
 left:Object.freeze([target(.20,0,1,0,.5),target(.30,1,2,.2,-.6,14),target(.40,2,3,-.1,.4,28)]),
 right:Object.freeze([target(.60,2,3,.1,-.4,28),target(.70,1,2,-.2,.6,14),target(.80,0,1,0,-.5)]),
 center:Object.freeze([target(.38,3,0,-.15,.55),target(.50,0,2,0,-.5,12),target(.62,3,0,.15,.55,24)]),
 guardLeft:Object.freeze([target(.14,1,2,.15,.5),target(.24,2,1,0,-.4,14),target(.34,3,3,-.15,.5,28),bomb(.85)]),
 guardRight:Object.freeze([bomb(.15),target(.66,3,3,.15,-.5,28),target(.76,2,1,0,.4,14),target(.86,1,2,-.15,-.5)]),
 finale:Object.freeze([target(.40,0,3,0,.35),target(.50,3,3,0,-.35),target(.60,0,3,0,.35)])
});
const scores=Object.freeze({
 10:{title:'First ribbons',order:['left','right','left','right','center','finale']},
 25:{title:'Safe passages',order:['left','right','left','right','guardLeft','guardRight','finale']},
 40:{title:'Crossing colors',order:['guardLeft','guardRight','center','center','guardLeft','guardRight','center','finale']},
 55:{title:'Three-part refrain',order:['left','right','center','left','right','center','guardLeft','guardRight','finale']},
 70:{title:'Ribbon dance',order:['guardLeft','guardRight','center','guardLeft','guardRight','center','left','right','center','finale']},
 85:{title:'Color celebration',order:['guardLeft','guardRight','center','guardLeft','guardRight','center','guardLeft','guardRight','center','center','finale']}
});
export function adventureSliceSpec(level){
 const number=Number(level),score=Number.isInteger(number)?scores[number]:null;if(!score)return null;
 const waves=score.order.map((formation,index)=>({at:.8+index*3.6,formation,pieces:formations[formation].map(piece=>({...piece}))}));
 return {level:number,title:score.title,waveCount:waves.length,targetCount:waves.length*3,waves};
}
export function adventureSlicePiece(written,bounds){
 const height=bounds.bottom-bounds.top,ceiling=bounds.launchTop??bounds.top+Math.min(140,height*.25);
 const x=bounds.left+written.x*(bounds.right-bounds.left),y=bounds.bottom+80+written.offset;
 const apex=ceiling+written.r+(written.hazard?100:written.offset*.45),distance=Math.max(100,y-apex);
 // The authored flight duration stays fixed on every viewport. Scaling gravity
 // with the arena avoids a tall screen overlapping two otherwise separate waves.
 const gravity=8*distance/(written.flight*written.flight),vy=-4*distance/written.flight;
 return {...written,x,y,vx:0,vy,gravity,entered:false};
}
export function sliceStageFeedbackSettled({fragments=[],labels=[],effects={sparks:[],flashes:[]}}={}){
 return !fragments.length&&!labels.length&&!effects.sparks.length&&!effects.flashes.length;
}
