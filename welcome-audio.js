export function startWelcomeMusic(){
 const audio=window.gameAudio;if(!audio)return;
 let prefs={};try{prefs=JSON.parse(window.ShapeShiftPlatform.storage.getItem('shape-shift-settings'))||{};}catch{}
 audio.setMusic(prefs.music!==false);audio.setMusicVolume(prefs.musicVolume??40);audio.setSfx(prefs.sfx!==false);audio.setSfxVolume(prefs.sfxVolume??65);audio.setScene('menu');
 const play=()=>{if(!document.hidden&&!window.ShapeShiftPlatform.paused)void audio.start().catch(()=>{});};
 document.addEventListener('pointerdown',play,{capture:true,passive:true});document.addEventListener('keydown',play,{capture:true});play();
}
