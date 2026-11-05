// Each word is an authored pair or special piece. Expansion never consults the
// board, score, equipped frame or an RNG; a retry starts this same sequence.
const phrases={
 coral:[[0,0,25,0],[0,1,25,0]],
 lagoon:[[2,1,28,0],[1,1,28,0]],
 meadow:[[1,2,28,0],[1,3,28,0]],
 sunlight:[[3,3,28,0],[2,3,28,0]],
 dusk:[[2,0,30,0],[2,2,30,0]],
 sky:[[3,1,30,0],[0,1,30,0]],
 bloom:[[0,2,32,0],[3,2,32,0]],
 ember:[[1,0,32,0],[3,0,32,0]],
 lock:[[2,0,32,0,'obstacle']],
 bomb:[[0,0,24,0,'bomb']]
};
const stages={
 5:{title:'Garden pairs',script:'coral lagoon coral lagoon meadow sunlight meadow sunlight coral lagoon'},
 20:{title:'A path through stone',script:'coral lagoon meadow sunlight lock bomb coral lagoon meadow sunlight dusk sky dusk sky'},
 35:{title:'Turning colors',script:'meadow sunlight dusk sky meadow sunlight lock bomb dusk sky bloom ember bloom ember coral lagoon'},
 50:{title:'Two clearings',script:'coral lagoon meadow sunlight lock bomb dusk sky bloom ember coral lagoon meadow sunlight lock bomb dusk sky bloom ember'},
 65:{title:'Evening garden',script:'dusk sky bloom ember dusk sky lock bomb bloom ember coral lagoon meadow sunlight coral lagoon lock bomb meadow sunlight dusk sky'},
 80:{title:'Stone and starlight',script:'coral lagoon meadow sunlight lock bomb dusk sky bloom ember coral lagoon lock bomb meadow sunlight dusk sky bloom ember lock bomb coral lagoon meadow sunlight'},
 95:{title:'The final cascade',script:'bloom ember dusk sky coral lagoon lock bomb meadow sunlight bloom ember dusk sky lock bomb coral lagoon meadow sunlight bloom ember lock bomb dusk sky coral lagoon'}
};
const levelOf=challenge=>typeof challenge==='object'?challenge?.mode==='drop'?challenge.level:null:challenge;
export function adventureDropSpec(challenge){
 const stage=stages[levelOf(challenge)];if(!stage)return null;
 return {title:stage.title,pieceCount:stage.script.split(' ').reduce((n,word)=>n+phrases[word].length,0)};
}
export function adventureDropSequence(challenge){
 const stage=stages[levelOf(challenge)];if(!stage)return null;
 return stage.script.split(' ').flatMap(word=>phrases[word].map(([shape,color,r,angle,special])=>({shape,color,r,angle,sizeScale:r/25,bomb:special==='bomb',obstacle:special==='obstacle'})));
}
