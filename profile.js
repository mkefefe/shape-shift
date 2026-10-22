import {leaderboardAllowed,audience} from './audience.js?v=49439-web11';
import {LEADERBOARD_URL,saveOnlineProfile} from './leaderboard.js?v=49439-web11';
const adjectives=['Sunny','Lucky','Swift','Cosmic','Mighty','Jolly','Brave','Bouncy','Golden','Chill','Merry','Electric'];
const animals=['Fox','Panda','Otter','Dragon','Tiger','Penguin','Koala','Falcon','Lynx','Gecko','Bunny','Bear'];
export const randomName=(rng=Math.random)=>adjectives[Math.floor(rng()*adjectives.length)]+animals[Math.floor(rng()*animals.length)]+(10+Math.floor(rng()*90));
export const cleanName=value=>String(value||'').normalize('NFKC').replace(/[\u0000-\u001f\u007f-\u009f<>]/g,'').trim().slice(0,20);
const key='shape-shift-identity-v1';
let identity;try{identity=JSON.parse(window.ShapeShiftPlatform.storage.getItem(key));}catch{}
if(!identity||!cleanName(identity.name))identity={name:randomName(),avatar:Math.floor(Math.random()*6),dirty:true};
if(identity.name==='Player'){identity.name=randomName();identity.dirty=true;}
identity.name=cleanName(identity.name);delete identity.photoURL;identity.avatar=Number.isInteger(identity.avatar)?identity.avatar:0;
// Publish the existing chosen name once when moving this installation to Cloudflare.
try{if(window.ShapeShiftPlatform.storage.getItem('shape-shift-ranking-host')!==LEADERBOARD_URL)identity.dirty=true;}catch{}
export const getIdentity=()=>({...identity});
export function protectLocalIdentity(){if(audience()!=='adult'&&!identity.protected){identity={...identity,protected:true,avatar:Number.isInteger(identity.avatar)?identity.avatar:0,dirty:true};persist();renderHomeIdentity();}}
export function avatarElement(value,photoURL,frame="none"){const wrap=document.createElement('span');wrap.className='avatar';const image=document.createElement('img');image.alt='';image.draggable=false;image.decoding='async';if(typeof value==='string'&&value.startsWith('data:image/jpeg;base64,')){image.src=value;wrap.classList.add('photo');}else if(value==='photo'&&photoURL){image.src=photoURL;wrap.classList.add('photo');}else{const n=Number.isInteger(+value)&&+value>=0&&+value<6?+value:0;image.src='assets/avatars-v7.webp';image.style.left=-(n%3)*100+'%';image.style.top=(-Math.floor(n/3)*150-25)+'%';}wrap.append(image);if(['gold','ice','blossom','cosmic'].includes(frame)){const shell=document.createElement('span');shell.className='avatar-shell';const ring=document.createElement('span');ring.className='frame-art frame-'+frame;shell.append(wrap,ring);return shell;}return wrap;}
function persist(){try{window.ShapeShiftPlatform.storage.setItem(key,JSON.stringify(identity));}catch{throw Error('Your phone could not save this photo. Try a smaller image.');}}
let syncing;
export async function syncIdentity(){if(!leaderboardAllowed()||!identity.dirty)return;if(syncing)return syncing.then(()=>identity.dirty?syncIdentity():undefined);const sending={...identity};syncing=saveOnlineProfile({name:sending.name,avatar:sending.avatar,frame:sending.frame}).then(()=>{if(identity.name===sending.name&&identity.avatar===sending.avatar&&identity.frame===sending.frame){identity.dirty=false;persist();window.ShapeShiftPlatform.storage.setItem('shape-shift-ranking-host',LEADERBOARD_URL);}}).finally(()=>syncing=null);return syncing;}
export function saveIdentity(name,avatar){const cleaned=cleanName(name);if(cleaned.length<2)throw Error('Please use at least two characters.');const previous=identity;identity={...identity,name:cleaned,avatar,dirty:true};try{persist();}catch(error){identity=previous;throw error;}renderHomeIdentity();}
export function renderHomeIdentity(){const button=document.getElementById('profile-open');if(!button)return;button.replaceChildren(avatarElement(identity.avatar,undefined,identity.frame));const name=document.createElement('span');name.textContent=identity.name;button.append(name);button.setAttribute('aria-label','Edit profile: '+identity.name);}
export function leaderboardAvatar(row){return avatarElement(row.avatar,row.avatar==='photo'?LEADERBOARD_URL+'/api/avatar?id='+encodeURIComponent(row.id)+'&v='+row.updatedAt:undefined,row.frame);}
export async function readPhoto(file){if(!file||!file.type.startsWith('image/'))throw Error('Choose an image from your photos.');if(file.size>20*1024*1024)throw Error('Choose a photo smaller than 20 MB.');const url=URL.createObjectURL(file);try{const img=new Image();img.src=url;await img.decode();const canvas=document.createElement('canvas');canvas.width=192;canvas.height=192;const context=canvas.getContext('2d');const side=Math.min(img.naturalWidth,img.naturalHeight);context.drawImage(img,(img.naturalWidth-side)/2,(img.naturalHeight-side)/2,side,side,0,0,192,192);let photo=canvas.toDataURL('image/jpeg',0.78);if(photo.length>60000)photo=canvas.toDataURL('image/jpeg',0.5);if(photo.length>60000)throw Error('Please try another photo.');return photo;}catch(error){throw Error(error.message||'This photo could not be opened. Try a JPG or PNG.');}finally{URL.revokeObjectURL(url);}}
try{persist();}catch{};


export function setIdentityFrame(frame){if(identity.frame===frame)return;identity={...identity,frame,dirty:true};persist();renderHomeIdentity();syncIdentity().catch(()=>{});}
