// Host overlays can pause or mute a visible iframe without a visibility event.
// Keep that state separate from the player's own pause and sound preferences.
export function createBattlePlatformState({suspendAudio,pauseGame,playMusic,isPlaying}){
 let paused=false,audioEnabled=true;
 return {
  get paused(){return paused;},
  get audioAllowed(){return audioEnabled&&!paused;},
  update(state={}){
   const wasAllowed=audioEnabled&&!paused;
   if(typeof state.paused==='boolean')paused=state.paused;
   if(typeof state.audioAllowed==='boolean')audioEnabled=state.audioAllowed;
   if(paused||!audioEnabled)suspendAudio();
   if(paused)pauseGame();
   // Returning focus never resumes a fight behind its Pause menu.
   if(!wasAllowed&&audioEnabled&&!paused&&isPlaying())playMusic();
  }
 };
}
