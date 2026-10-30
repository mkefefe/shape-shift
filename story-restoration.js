// Canonical Color Beacon geography. These masks only select pixels from the
// original painting; buildings, objects, camera, and scale never move.
export const STORY_RESTORATION = Object.freeze([
 {percent:10,title:'The first trees',adds:'Both rear trees and a few garden flowers'},
 {percent:25,title:'The river returns',adds:'The complete river, waterfall, foam, and spray'},
 {percent:30,title:'The western garden',adds:'The left garden, outer tree, flowers, and fence'},
 {percent:40,title:'The eastern garden',adds:'The right garden, outer foliage, flowers, and fence'},
 {percent:50,title:'Welcome home',adds:'All three cottages and their entrance steps'},
 {percent:60,title:'The beacon awakens',adds:'The lower beacon building and front steps'},
 {percent:70,title:'A crown of color',adds:'The upper beacon architecture'},
 {percent:80,title:'A path to the sky',adds:'Central paths, remaining upper ground, and upper cliffs'},
 {percent:90,title:'Almost home',adds:'The western lower cliffs and hanging gardens'},
 {percent:100,title:'Color comes home',adds:'The last eastern cliffs and hanging gardens'}
]);

// Polygon points use the original 1254 × 1254 island coordinates. Cottage and
// beacon silhouettes are explicitly protected from the earlier garden masks.
const COTTAGES=[
 [[236,539],[249,453],[259,422],[308,421],[310,432],[321,411],[394,419],[432,443],[484,481],[481,510],[448,526],[449,585],[417,635],[278,633],[260,590]],
 [[776,471],[823,428],[896,409],[899,372],[957,373],[960,416],[1005,471],[1010,499],[978,515],[973,588],[819,609],[812,521]],
 [[844,618],[888,570],[925,548],[994,548],[997,527],[1048,528],[1051,568],[1091,620],[1080,654],[1074,724],[1035,750],[915,758],[907,683]]
];
export const BEACON=[[475,0],[785,0],[785,207],[797,232],[797,345],[777,386],[779,439],[767,458],[754,597],[746,625],[695,643],[690,695],[555,695],[555,652],[489,625],[476,486],[482,454],[458,427],[447,361],[437,334],[437,257],[455,224],[475,195]];
const BEACON_BASE=[[487,399],[765,399],[777,425],[774,446],[758,461],[754,597],[746,625],[695,643],[690,695],[555,695],[555,652],[489,625],[476,486],[482,454]];
const CROWNS=[
 [[207,375],[230,305],[270,252],[325,235],[395,242],[450,286],[484,360],[494,425],[450,454],[370,451],[295,450],[230,414]],
 [[748,362],[774,285],[818,222],[879,202],[950,216],[1010,248],[1048,301],[1070,355],[1066,418],[1019,464],[949,461],[884,434],[823,449],[771,432]]
];
const WEST_GARDEN=[
 [[130,351],[235,334],[296,398],[285,483],[266,542],[251,585],[210,595],[187,560],[124,551],[107,467]],
 [[55,525],[225,531],[327,588],[440,576],[493,619],[491,692],[439,724],[418,757],[475,779],[486,807],[538,814],[579,859],[557,892],[488,874],[455,885],[410,867],[347,863],[290,824],[241,839],[180,820],[119,805],[75,772],[30,757],[22,670]]
];
const WEST_FRONT_TREE=[[128,423],[143,389],[173,366],[204,353],[244,363],[265,365],[283,370],[305,385],[315,407],[306,427],[282,432],[273,472],[267,507],[249,526],[247,550],[231,566],[208,559],[196,532],[174,526],[148,513],[132,490],[124,457]];
const EAST_GARDEN=[
 [[1003,453],[1038,457],[1073,484],[1086,516],[1074,551],[1046,564],[1010,549],[993,530],[987,490]],
 [[758,426],[817,440],[842,499],[802,554],[797,604],[757,617],[727,592],[733,520]],
 [[1058,456],[1104,494],[1101,533],[1153,541],[1195,590],[1228,671],[1228,758],[1254,797],[1224,853],[1153,879],[1099,877],[1045,903],[994,888],[941,913],[880,901],[835,911],[792,884],[756,884],[714,862],[718,820],[767,787],[826,762],[870,722],[902,679],[1015,621],[1010,538]],
 [[729,565],[832,570],[900,641],[917,718],[877,758],[823,784],[770,764],[719,748],[720,690],[698,643]]
];
const WEST_CLIFF=[[0,747],[327,753],[459,790],[562,844],[608,925],[588,1067],[595,1114],[656,1149],[731,1166],[685,1254],[0,1254]];
const UPPER_CLIFFS=[
 [[28,750],[83,776],[130,821],[202,848],[239,872],[238,951],[180,974],[100,931],[37,864]],
 [[306,808],[376,831],[414,864],[472,878],[475,950],[422,979],[352,957],[304,906]],
 [[1016,890],[1089,863],[1151,850],[1220,825],[1216,930],[1140,975],[1072,974],[1012,941]]
];
const WEST_HANGING_GARDEN=[[360,789],[393,778],[432,792],[457,817],[461,851],[445,871],[415,880],[403,923],[385,963],[386,1017],[361,1064],[335,1081],[318,1056],[318,1001],[325,950],[318,902],[332,863],[330,832]];
const EAST_HANGING_GARDEN=[[935,790],[1001,769],[1057,783],[1086,826],[1083,873],[1109,908],[1120,960],[1109,1018],[1076,1090],[1020,1134],[972,1151],[941,1110],[943,1070],[970,1023],[968,968],[966,916],[935,872],[925,831]];
const BEACON_FLOWERS=[[456,611],[486,601],[516,606],[546,630],[554,650],[546,668],[509,679],[471,665],[457,642]];
const EAST_FENCE=[[841,753],[864,749],[876,760],[879,771],[914,773],[954,768],[976,763],[978,748],[992,741],[1010,745],[1013,756],[1033,747],[1033,735],[1047,730],[1058,738],[1059,771],[1046,778],[1034,773],[1033,766],[1013,772],[1013,791],[993,797],[978,793],[976,783],[948,796],[908,799],[875,794],[876,803],[863,811],[841,807]];
const WEST_RAIL=[[350,664],[373,674],[415,682],[419,699],[396,699],[369,690],[348,683]];
const STONES=[
 [591,705,66,21,80],[656,723,66,21,80],[714,742,66,24,80],
 [765,766,70,25,80],[848,788,76,25,80],
 [503,713,60,39,80],[608,760,42,39,80],[697,822,69,43,80],
 [469,850,80,53,90],[112,643,50,39,75],[350,733,61,35,75]
];
const pointIn=(x,y,polygon)=>{let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
 const [xi,yi]=polygon[i],[xj,yj]=polygon[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;
}return inside;};
export function createStoryRestorationMap(source,water,n){
 // Rasterize named silhouettes once in the canvas implementation, then make a
 // single simple pixel pass. Testing every polygon for every pixel stalls
 // mobile startup; this produces the same fixed map without that workload.
 const canvas=document.createElement('canvas');canvas.width=canvas.height=n;
 const ctx=canvas.getContext('2d'),scale=n/1254;ctx.scale(scale,scale);
 const color=stage=>ctx.fillStyle=`rgb(${stage},0,0)`;
 const polygon=points=>{ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();};
 const polygons=list=>list.forEach(polygon);
 const orb=(cx,cy,rx,ry)=>{ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);ctx.fill();};
 const beaconShape=()=>{ctx.save();ctx.beginPath();ctx.rect(0,0,1254,208);ctx.clip();polygon(BEACON);ctx.restore();orb(621,298,159,149);orb(466,293,25,43);orb(767,293,26,43);polygon(BEACON_BASE);};
 color(100);ctx.fillRect(0,0,1254,1254);
 color(90);polygon(WEST_CLIFF);
 color(80);ctx.fillRect(0,0,1254,875);
 color(75);polygons(UPPER_CLIFFS);
 color(30);polygons(WEST_GARDEN);
 color(40);polygons(EAST_GARDEN);
 color(90);polygon(WEST_HANGING_GARDEN);
 color(100);polygon(EAST_HANGING_GARDEN);
 color(10);polygons(CROWNS);
 color(30);polygon(WEST_FRONT_TREE);
 color(50);polygons(COTTAGES);
 color(70);beaconShape();ctx.save();ctx.beginPath();ctx.rect(0,458,1254,796);ctx.clip();color(60);beaconShape();ctx.restore();
 const painted=ctx.getImageData(0,0,n,n).data,map=new Uint8Array(n*n),unit=1254/n;
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const i=y*n+x,k=i*4;if(source[k+3]<8)continue;
  const xx=(x+.5)*unit,yy=(y+.5)*unit,r=source[k],g=source[k+1],b=source[k+2];
  const foliage=g>r&&g>b*1.25;
  let stage=Math.max(10,Math.min(100,Math.round(painted[k]/5)*5));
  // Actual leaf edges that overlap conservative architecture outlines belong
  // to the tree, never to a roof. Keep entire crowns, not ellipse-shaped cuts.
  if(foliage&&((xx>=230&&xx<480&&yy>=245&&yy<450)||(xx>=750&&xx<1065&&yy>=205&&yy<464))&&!pointIn(xx,yy,WEST_FRONT_TREE))stage=10;
  // The lawn can return before the path. Use its real green paint, then assign
  // complete stone silhouettes to the later path chapter, avoiding a straight
  // polygon edge across a stone or the continuous grass beside it.
  if(xx>420&&xx<855&&yy>600&&yy<830&&foliage)stage=40;
  if(xx>450&&xx<555&&yy>600&&yy<680&&pointIn(xx,yy,BEACON_FLOWERS))stage=40;
  if(xx>60&&xx<930&&yy>600&&yy<910&&g<r*1.05&&b<r*1.1){for(const[cx,cy,rx,ry,when]of STONES){if(((xx-cx)/(rx+4))**2+((yy-cy)/(ry+7))**2<=1){stage=when;break;}}}
  if(xx>837&&xx<1063&&yy>726&&yy<816&&pointIn(xx,yy,EAST_FENCE))stage=40;
  if(xx>345&&xx<423&&yy>660&&yy<703&&pointIn(xx,yy,WEST_RAIL))stage=30;
  if(water[k+3])stage=25;
  map[i]=stage;
 }
 return map;
}

export function createRestorationStage(source,gray,map,percent,ctx){
 const data=ctx.createImageData(ctx.canvas.width,ctx.canvas.height),out=data.data;
 for(let i=0;i<map.length;i++){
  const k=i*4,input=map[i]&&map[i]<=percent?source:gray;
  out[k]=input[k];out[k+1]=input[k+1];out[k+2]=input[k+2];out[k+3]=input[k+3];
 }
 ctx.putImageData(data,0,0);
}
