// Thirty individually illustrated encounters: six stages, five fights each.
const names=['Moss Muncher','Crystal Sentry','Ember Prowler','Honey Hush','The Emerald Regent','Frost Hex','Ruby Fang','Bramble Block','Lunar Nectar','The Winter Crown','Scarlet Shard','Clover Wink','Solar Sprout','Glacier Drop','The Cinder Monarch','Honeycomb Hopper','Fern Spiral','Sapphire Prism','Flare Spark','The Amber Sovereign','Nimbus Puff','Thorn Peak','Ruby Ripple','Sun Kite','The Frost Castellan','Briar Star','Golden Gazer','Azure Lance','Coral Cross','The Verdant Eclipse'];
const colors=[2,1,0,3,2,1,0,2,3,1,0,2,3,1,0,3,2,1,0,3,1,2,0,3,1,2,3,1,0,2];
const shapes=[0,2,3,1,2,2,0,2,0,3,2,3,0,0,1,2,0,2,3,2,0,1,0,2,2,3,0,2,3,3];
const intervals=[7,6.5,6,6,6,6.8,6.2,6.6,5.9,6.1,6.5,6.1,5.8,6.3,5.8,6.3,5.7,6.2,5.9,5.7,6.1,5.8,5.5,6,5.6,5.9,5.5,5.8,5.4,5.5];
const titles=['The overgrown path','The frozen crossing','The ember sanctuary','The golden grove','The cloud citadel','The final bloom'];
export const ROSTER=names.map((name,i)=>({id:i+1,name,color:colors[i],shape:shapes[i],sprite:`assets/monsters-v143/${String(i+1).padStart(2,'0')}.webp`,title:titles[Math.floor(i/5)],hp:Math.round([36,60,80,100,120][i%5]*(1+Math.floor(i/5)*.1)),interval:intervals[i],boss:i%5===4,interrupt:i%5===2,style:['pounce','sweep','slam'][i%3],rule:`${['Red','Blue','Green','Gold'][colors[i]]} matches deal double damage.`}));
export const encounter=s=>ROSTER[Math.min(29,Math.max(0,s.set*5+s.stage))];
export const stageEncounters=s=>ROSTER.slice(Math.min(5,s.set)*5,Math.min(5,s.set)*5+5);
