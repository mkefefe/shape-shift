package com.shapeshift.game;

import android.app.Application;
import com.google.android.gms.games.PlayGamesSdk;

public final class ShapeShiftApplication extends Application {
 @Override public void onCreate(){
  super.onCreate();
  if(BuildConfig.PLAY_GAMES_ENABLED)PlayGamesSdk.initialize(this);
 }
}
