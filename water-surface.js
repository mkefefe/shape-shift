// Refract only the water painted in the original scene. The mask fades inward
// and limits displacement near its boundary, keeping banks and plants fixed.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function insideDistance(x,y,points){
 let inside=false,distance=Infinity;
 for(let i=0,j=points.length-1;i<points.length;j=i++){
  const [ax,ay]=points[j],[bx,by]=points[i],dx=bx-ax,dy=by-ay;
  if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
  const t=clamp(((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy),0,1);
  distance=Math.min(distance,Math.hypot(x-ax-t*dx,y-ay-t*dy));
 }
 return inside?distance:0;
}
function makeMask(scene){
 const regions=scene.pools.map(points=>({points,fall:false,slope:0,feather:10}));
 for(const [x0,y0,x1,y1,w0,w1] of scene.falls)regions.push({points:[[x0-w0/2,y0],[x0+w0/2,y0],[x1+w1/2,y1],[x1-w1/2,y1]],fall:true,slope:(x1-x0)/(y1-y0),feather:4});
 const bounds=regions.flatMap(r=>r.points),left=Math.max(0,Math.floor(Math.min(...bounds.map(p=>p[0])))),top=Math.floor(Math.min(...bounds.map(p=>p[1])));
 const width=Math.min(scene.width,Math.ceil(Math.max(...bounds.map(p=>p[0]))))-left+1,height=Math.ceil(Math.max(...bounds.map(p=>p[1])))-top+1;
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const ctx=canvas.getContext('2d'),image=ctx.createImageData(width,height);
 for(const {points,fall,slope,feather} of regions){
  const minX=Math.max(left,Math.floor(Math.min(...points.map(p=>p[0])))),maxX=Math.min(left+width-1,Math.ceil(Math.max(...points.map(p=>p[0]))));
  const minY=Math.max(top,Math.floor(Math.min(...points.map(p=>p[1])))),maxY=Math.min(top+height-1,Math.ceil(Math.max(...points.map(p=>p[1]))));
  for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
   const distance=insideDistance(x+.5,y+.5,points),fade=clamp((distance-1.5)/feather,0,1),a=Math.round(fade*fade*(3-2*fade)*255);
   const k=((y-top)*width+x-left)*4;if(a<=image.data[k+3])continue;
   image.data[k]=fall?255:0;image.data[k+1]=Math.round((clamp(slope,-1,1)+1)*127.5);image.data[k+2]=255;image.data[k+3]=a;
  }
 }
 ctx.putImageData(image,0,0);return {canvas,left,top,width,height};
}
const vertex=`attribute vec2 position;
varying vec2 uv;
void main(){uv=vec2(position.x*.5+.5,.5-position.y*.5);gl_Position=vec4(position,0.,1.);}`;
const fragment=`precision highp float;
varying vec2 uv;
uniform sampler2D source;
uniform sampler2D mask;
uniform vec2 sceneSize;
uniform vec2 offset;
uniform vec2 regionSize;
uniform float time;
void main(){
 vec4 m=texture2D(mask,uv);
 if(m.a<.003){gl_FragColor=vec4(0.);return;}
 vec2 p=offset+uv*regionSize;
 vec2 flow;
 vec3 color;
 if(m.r>.5){
  // Two overlapping streams advect the original foam down the fall. A stream
  // becomes transparent before wrapping, so nothing jumps back upstream.
  float phase=fract(time*.58+p.x*.003),other=fract(phase+.5);
  float a=sin(phase*3.14159265);a*=a;
  float y1=(phase-.5)*14.*m.a,y2=(other-.5)*14.*m.a;
  float slope=m.g*2.-1.;
  float sway=sin(p.y*.11-time*3.7)*.85*m.a;
  vec2 d1=vec2(-slope*y1+sway,-y1),d2=vec2(-slope*y2+sway,-y2);
  color=texture2D(source,(p+d1)/sceneSize).rgb*a+texture2D(source,(p+d2)/sceneSize).rgb*(1.-a);
  color*=1.+.035*sin(p.y*.18-time*5.5+p.x*.13)*m.a;
 }else{
  // Crossing waves bend the painted reflections continuously instead of
  // drawing separate geometric lines over a stationary river.
  flow.x=(sin(p.y*.095-time*2.6+p.x*.007)*3.4+sin(p.y*.23+time*1.9)*1.15)*m.a;
  flow.y=(sin(p.x*.058+p.y*.027-time*2.15)*1.5+sin(p.x*.13-time*3.2)*.55)*m.a;
  color=texture2D(source,(p+flow)/sceneSize).rgb;
  float sheen=sin(p.x*.065+p.y*.15-time*2.8)*sin(p.y*.19-time*2.1);
  color*=1.+sheen*.07*m.a;
 }
 float alpha=m.a*.96;
 gl_FragColor=vec4(color*alpha,alpha);
}`;
function gpuSurface(source,scene,region){
 const canvas=document.createElement('canvas');canvas.width=region.width;canvas.height=region.height;
 const gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:true});
 if(!gl)return null;
 const shader=(type,code)=>{const s=gl.createShader(type);gl.shaderSource(s,code);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
 const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
 const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
 const loc=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
 for(const [unit,name,image] of [[0,'source',source],[1,'mask',region.canvas]]){
  const texture=gl.createTexture();gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);gl.uniform1i(gl.getUniformLocation(program,name),unit);
 }
 gl.uniform2f(gl.getUniformLocation(program,'sceneSize'),scene.width,scene.height);gl.uniform2f(gl.getUniformLocation(program,'offset'),region.left,region.top);gl.uniform2f(gl.getUniformLocation(program,'regionSize'),region.width,region.height);
 const time=gl.getUniformLocation(program,'time');gl.viewport(0,0,canvas.width,canvas.height);
 return {canvas,kind:'webgl',paint(t){gl.uniform1f(time,t/1000);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);return canvas;},lost:()=>gl.isContextLost()};
}
function canvasSurface(source,region){
 const canvas=document.createElement('canvas');canvas.width=region.width;canvas.height=region.height;const ctx=canvas.getContext('2d');
 return {canvas,kind:'canvas',paint(time){
  ctx.clearRect(0,0,canvas.width,canvas.height);ctx.globalCompositeOperation='source-over';
  // The inexpensive fallback retains water motion if WebGL is unavailable.
  for(let row=0;row<canvas.height;row+=2){
   const y=row+region.top,dx=Math.sin(y*.095-time*.0026)*2.2,dy=Math.sin(y*.034-time*.002)*1.2;
   ctx.drawImage(source,region.left+dx,y+dy,canvas.width,2,0,row,canvas.width,2);
  }
  ctx.globalCompositeOperation='destination-in';ctx.drawImage(region.canvas,0,0);ctx.globalCompositeOperation='source-over';return canvas;
 }};
}
export function createWaterSurface(image,world,scene){
 const source=document.createElement('canvas');source.width=scene.width;source.height=scene.height;const ctx=source.getContext('2d');
 if(world==='garden')ctx.drawImage(image,0,0);else ctx.drawImage(image,world==='sunset'?627:0,0,627,1254,0,0,627,1254);
 const region=makeMask(scene);let surface;
 try{surface=gpuSurface(source,scene,region);}catch{surface=null;}
 surface||=canvasSurface(source,region);
 return {left:region.left,top:region.top,get kind(){return surface.kind;},paint(time){
  if(surface.lost?.())surface=canvasSurface(source,region);return surface.paint(time);
 }};
}
