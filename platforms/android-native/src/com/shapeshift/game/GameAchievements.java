package com.shapeshift.game;

import android.app.Activity;
import android.content.SharedPreferences;
import android.os.SystemClock;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import com.google.android.gms.games.PlayGames;
import java.util.HashSet;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONObject;

/** Bundled-content bridge. Sign-in is optional and never gates gameplay. */
public final class GameAchievements {
 private final Activity activity;
 private final WebView web;
 private final SharedPreferences saved;
 private final JSONObject ids;
 private final Set<String> earned=new HashSet<>();
 private boolean syncing, opening, destroyed;
 private long retryAfter;
 private int remaining;
 private final android.os.Handler retries=new android.os.Handler(android.os.Looper.getMainLooper());
 private final Runnable retry=()->flush();

 GameAchievements(Activity activity,WebView web){
  this.activity=activity;this.web=web;
  saved=activity.getSharedPreferences("google-achievements-v1",0);
  JSONObject config;try{config=new JSONObject(BuildConfig.PLAY_GAMES_IDS);}catch(Exception ignored){config=new JSONObject();}
  ids=config;
  for(String key:saved.getStringSet("earned",new HashSet<>()))if(ids.has(key))earned.add(key);
 }
 @JavascriptInterface public boolean configured(){return BuildConfig.PLAY_GAMES_ENABLED;}
 private boolean available(){return configured()&&!destroyed&&!activity.isFinishing()&&!activity.isDestroyed();}
 private void message(String text){if(available())web.evaluateJavascript("window.dispatchEvent(new CustomEvent('playgamesstatus',{detail:"+JSONObject.quote(text)+"}));",null);}
 private void retryLater(){syncing=false;retryAfter=SystemClock.elapsedRealtime()+30000;retries.removeCallbacks(retry);retries.postDelayed(retry,30100);message("Saved on this device. Google Play sync will retry when connected.");}

 @JavascriptInterface public void sync(String keys){
  if(keys==null||keys.length()>1000)return;
  activity.runOnUiThread(()->{
   if(!available())return;
   try{
    JSONArray list=new JSONArray(keys);
    for(int i=0;i<Math.min(20,list.length());i++){String key=list.optString(i);if(ids.has(key)&&!ids.optString(key).isEmpty())earned.add(key);}
   }catch(Exception ignored){return;}
   saved.edit().putStringSet("earned",new HashSet<>(earned)).apply();
   flush();
  });
 }
 private void flush(){
  if(!available()||syncing||earned.isEmpty()||SystemClock.elapsedRealtime()<retryAfter)return;
  syncing=true;
  PlayGames.getGamesSignInClient(activity).isAuthenticated().addOnCompleteListener(auth->{
   if(!available()){syncing=false;return;}
   if(!auth.isSuccessful()){retryLater();return;}
   if(!auth.getResult().isAuthenticated()){syncing=false;return;}
   // Acknowledgements are account-specific, so switching a Play Games account
   // cannot mistake another account's successful uploads for this one's.
   PlayGames.getPlayersClient(activity).getCurrentPlayer().addOnCompleteListener(player->{
    if(!available()){syncing=false;return;}
    if(!player.isSuccessful()||player.getResult()==null){retryLater();return;}
    final String account="confirmed:"+player.getResult().getPlayerId();
    final Set<String> confirmed=new HashSet<>(saved.getStringSet(account,new HashSet<>()));
    final Set<String> pending=new HashSet<>(earned);pending.removeAll(confirmed);
    remaining=pending.size();
    if(remaining==0){syncing=false;return;}
    final boolean[] failed={false};
    for(String key:pending)PlayGames.getAchievementsClient(activity).unlockImmediate(ids.optString(key)).addOnCompleteListener(result->{
     if(!available()){syncing=false;return;}
     if(result.isSuccessful()){
      confirmed.add(key);saved.edit().putStringSet(account,new HashSet<>(confirmed)).apply();
     }else failed[0]=true;
     if(--remaining==0){
      syncing=false;
      if(failed[0])retryLater();
      else{message("Achievements synced with Google Play Games.");flush();}
     }
    });
   });
  });
 }
 @JavascriptInterface public void show(){activity.runOnUiThread(()->{
  if(!available()||opening)return;
  opening=true;
  PlayGames.getGamesSignInClient(activity).isAuthenticated().addOnCompleteListener(auth->{
   if(!available()){opening=false;return;}
   if(auth.isSuccessful()&&auth.getResult().isAuthenticated()){openAchievements();return;}
   // Only this explicit player action may start interactive sign-in.
   PlayGames.getGamesSignInClient(activity).signIn().addOnCompleteListener(signIn->{
    if(!available()){opening=false;return;}
    if(!signIn.isSuccessful()||!signIn.getResult().isAuthenticated()){
     opening=false;message("Sign-in was not completed. Your achievements stay saved on this device.");return;
    }
    openAchievements();
   });
  });
 });}
 private void openAchievements(){
  retryAfter=0;flush();
  web.evaluateJavascript("window.dispatchEvent(new Event('playgamesconnected'));",null);
  PlayGames.getAchievementsClient(activity).getAchievementsIntent().addOnCompleteListener(task->{
   opening=false;if(!available())return;
   if(!task.isSuccessful()){message("Google achievements could not open. Please try again.");return;}
   try{activity.startActivityForResult(task.getResult(),110);}catch(Exception ignored){message("Google achievements could not open. Please try again.");}
  });
 }
 void resume(){retries.removeCallbacks(retry);retryAfter=0;flush();}
 void destroy(){destroyed=true;retries.removeCallbacks(retry);}
}
