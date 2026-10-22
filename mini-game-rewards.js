// Versioned receipts preserve the amount promised by older unfinished payouts.
export const MINI_GAME_COIN_RATE=3;
export function miniGameCoins(count,version=2){
 if(!Number.isSafeInteger(count)||count<0||count>100000)return 0;
 if(version===3)return count;
 return version===2?count*MINI_GAME_COIN_RATE:Math.floor(count/2);
}
