package com.shapeshift.game;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.webkit.WebChromeClient;
import android.webkit.ValueCallback;
import android.app.AlertDialog;
import android.content.DialogInterface;
import android.os.Bundle;
import android.os.Build;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.view.WindowInsets;
import android.view.DisplayCutout;
import android.graphics.Insets;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.HashMap;
import java.util.Locale;

/** Offline game content with a restricted native rewarded-ad bridge. */
public final class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private WebView web;
    private RewardedAds ads;
    private GameAchievements achievements;
    private ContentUpdates contentUpdates;
    private PlayUpdates playUpdates;
    private UpdateScreen updateScreen;
    private boolean gameLoaded;
    private final java.util.concurrent.ExecutorService updateWorker=java.util.concurrent.Executors.newSingleThreadExecutor();
    private GameReminders reminders;
    private AlertDialog exitDialog;
    private ValueCallback<Uri[]> photoCallback;
    private static final int PICK_PHOTO = 109;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        web = new WebView(this);
        web.setBackgroundColor(0xff087eaf);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        // Suppress Android's webpage/image long-press actions, but retain editing in name fields.
        web.setOnLongClickListener(view -> {
            WebView.HitTestResult hit = web.getHitTestResult();
            return hit == null || hit.getType() != WebView.HitTestResult.EDIT_TEXT_TYPE;
        });
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        // Keep the game at its responsive viewport size, including the main menu.
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(false);
        reminders=new GameReminders(this,web);
        web.addJavascriptInterface(reminders,"ShapeShiftReminders");
        web.addJavascriptInterface(new Object(){
            @android.webkit.JavascriptInterface public void open(String url){runOnUiThread(()->openSupportLink(url));}
        },"ShapeShiftLinks");
        ads=new RewardedAds(this,web);
        web.addJavascriptInterface(ads,"ShapeShiftAds");
        web.addJavascriptInterface(new Object() {
            @android.webkit.JavascriptInterface public boolean copyPlayerId(String id) {
                if (id == null || !id.matches("[0-9]{7,9}")) return false;
                try {
                    android.content.ClipboardManager clipboard = (android.content.ClipboardManager)getSystemService(CLIPBOARD_SERVICE);
                    clipboard.setPrimaryClip(android.content.ClipData.newPlainText("Shape Shift player ID",id));
                    return true;
                } catch (Exception error) { return false; }
            }
        },"ShapeShiftClipboard");
        web.addJavascriptInterface(new Object() {
            private long lastImpact = -1000;
            @android.webkit.JavascriptInterface public void bombHit() {
                runOnUiThread(() -> {
                    long now = android.os.SystemClock.uptimeMillis();
                    if (!web.isShown() || !web.hasWindowFocus() || now - lastImpact < 250) return;
                    lastImpact = now;
                    // Use system touch feedback; do not override the player's haptics setting.
                    web.performHapticFeedback(Build.VERSION.SDK_INT >= 30
                        ? android.view.HapticFeedbackConstants.REJECT
                        : android.view.HapticFeedbackConstants.LONG_PRESS);
                });
            }
        },"ShapeShiftFeedback");
        achievements=new GameAchievements(this,web);
        web.addJavascriptInterface(achievements,"ShapeShiftGames");
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (photoCallback != null) photoCallback.onReceiveValue(null);
                photoCallback = callback;
                Intent pick = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                pick.addCategory(Intent.CATEGORY_OPENABLE);
                pick.setType("image/*");
                pick.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                try { startActivityForResult(pick, PICK_PHOTO); }
                catch (android.content.ActivityNotFoundException error) { photoCallback.onReceiveValue(null); photoCallback = null; }
                return true;
            }
        });
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if(HOST.equals(request.getUrl().getHost()))return false;
                // Never replace a bundled policy or the game with an external page.
                if(request.hasGesture())openSupportLink(request.getUrl().toString());
                return true;
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                String path = request.getUrl().getPath();
                if (ScoreNetworkPolicy.allows(request.getUrl().getScheme(), request.getUrl().getHost(), path, ads.onlineAllowed())) return null;
                if (!HOST.equals(request.getUrl().getHost()) || path == null || !path.startsWith("/assets/") || path.contains("..")) return missing();
                try {
                    HashMap<String, String> headers = new HashMap<>();
                    headers.put("Cache-Control", "no-cache");
                    headers.put("Access-Control-Allow-Origin", "https://" + HOST);
                    return new WebResourceResponse(mime(path), "UTF-8", 200, "OK", headers, contentUpdates.open(path.substring(8)));
                } catch (IOException error) { return missing(); }
            }
        });
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(0xff087eaf);
        FrameLayout bannerHost = new FrameLayout(this);
        bannerHost.setVisibility(View.GONE);
        root.addView(bannerHost,new LinearLayout.LayoutParams(-1,-2));
        ads.attachBanner(bannerHost);
        root.addView(web, new LinearLayout.LayoutParams(-1, 0, 1));
        // The keyboard overlays/pans the window; it must never shrink the game viewport.
        // Profile frame sizing depends on viewport height, so only permanent safe areas belong here.
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            int left=0, top=0, right=0, bottom=0;
            if (Build.VERSION.SDK_INT >= 30) {
                Insets safe = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                left=safe.left; top=safe.top; right=safe.right; bottom=safe.bottom;
            } else {
                left=insets.getSystemWindowInsetLeft(); top=insets.getSystemWindowInsetTop();
                right=insets.getSystemWindowInsetRight();
                // Older inset APIs can include IME height. Keep only the navigation-bar inset.
                bottom=Math.min(insets.getSystemWindowInsetBottom(),insets.getStableInsetBottom());
                if (Build.VERSION.SDK_INT >= 28) {
                    DisplayCutout cutout=insets.getDisplayCutout();
                    if(cutout!=null){left=Math.max(left,cutout.getSafeInsetLeft());top=Math.max(top,cutout.getSafeInsetTop());right=Math.max(right,cutout.getSafeInsetRight());bottom=Math.max(bottom,cutout.getSafeInsetBottom());}
                }
            }
            view.setPadding(left,top,right,bottom);
            // The root already applies safe insets; do not apply them again inside WebView.
            return Build.VERSION.SDK_INT >= 30 ? WindowInsets.CONSUMED : insets.consumeSystemWindowInsets();
        });
        FrameLayout startupRoot=new FrameLayout(this);
        startupRoot.addView(root,new FrameLayout.LayoutParams(-1,-1));
        contentUpdates=new ContentUpdates(this,BuildConfig.VERSION_CODE);
        playUpdates=new PlayUpdates(this);
        updateScreen=new UpdateScreen(this,()->{contentUpdates.cancel();openInstalledGame();});
        startupRoot.addView(updateScreen,new FrameLayout.LayoutParams(-1,-1));
        setContentView(startupRoot);
        root.requestApplyInsets();
        immersive();
        updateWorker.execute(()->{
            contentUpdates.restore();
            try {
                ContentUpdates.Pack pack=contentUpdates.prepare((text,percent)->runOnUiThread(()->{if(!gameLoaded)updateScreen.show(text,percent);}));
                runOnUiThread(()->{if(gameLoaded||isDestroyed())return;contentUpdates.activate(pack);checkPlayUpdate();});
            } catch(Exception error) {
                runOnUiThread(()->{if(gameLoaded||isDestroyed())return;updateScreen.show("Playing with saved content",-1);checkPlayUpdate();});
            }
        });
        // Age selection in the bundled game starts the SDK through setAudience.
    }

    private void checkPlayUpdate(){
        updateScreen.show("Checking for game updates...",-1);
        playUpdates.checkAtLaunch(this::openInstalledGame);
    }
    private void openInstalledGame(){
        if(gameLoaded||isDestroyed()||isFinishing())return;
        gameLoaded=true;contentUpdates.cancel();playUpdates.cancelCheck();updateScreen.setVisibility(View.GONE);
        web.loadUrl("https://"+HOST+"/assets/index.html");
    }
    private void openSupportLink(String value) {
        if(value==null||value.length()>2048)return;
        Uri uri=Uri.parse(value);String scheme=uri.getScheme();
        boolean email="mailto".equalsIgnoreCase(scheme)&&"mk.studio.customersupport@gmail.com".equalsIgnoreCase(uri.getSchemeSpecificPart().split("\\?",2)[0]);
        boolean website="https".equalsIgnoreCase(scheme)&&uri.getHost()!=null&&!HOST.equals(uri.getHost())&&uri.getUserInfo()==null;
        if(!email&&!website)return;
        Intent open=new Intent(email?Intent.ACTION_SENDTO:Intent.ACTION_VIEW,uri);
        if(email){
            try{startActivity(new Intent(open).setPackage("com.google.android.gm"));return;}
            catch(android.content.ActivityNotFoundException ignored){}
        }
        try{startActivity(open);}catch(android.content.ActivityNotFoundException error){
            android.widget.Toast.makeText(this,email?"Install an email app to contact mk.studio.customersupport@gmail.com":"No browser is available to open this link.",android.widget.Toast.LENGTH_LONG).show();
        }
    }

    private static WebResourceResponse missing() {
        return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", null, new ByteArrayInputStream(new byte[0]));
    }
    private static String mime(String path) {
        String p = path.toLowerCase(Locale.ROOT);
        if (p.endsWith(".html")) return "text/html";
        if (p.endsWith(".js") || p.endsWith(".mjs")) return "application/javascript";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".json") || p.endsWith(".webmanifest")) return "application/json";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".webp")) return "image/webp";
        if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
        if (p.endsWith(".wav")) return "audio/wav";
        if (p.endsWith(".ogg")) return "audio/ogg";
        if (p.endsWith(".mp3")) return "audio/mpeg";
        if (p.endsWith(".ttf")) return "font/ttf";
        if (p.endsWith(".woff2")) return "font/woff2";
        return "application/octet-stream";
    }
    private void immersive() {
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION);
    }
    @Override public void onWindowFocusChanged(boolean focused) { super.onWindowFocusChanged(focused); if (focused) {immersive(); if(ads!=null)ads.onFocused();} }
    @Override protected void onPause() {
        web.evaluateJavascript("window.dispatchEvent(new Event('androidpause'));", null);
        // pauseTimers() is process-wide and freezes the Google ad WebView too.
        // Pause only our game view; androidpause stops gameplay and audio.
        web.onPause(); if(ads!=null)ads.pauseBanner(); super.onPause();
    }
    @Override protected void onResume() { super.onResume(); if(achievements!=null)achievements.resume(); if(playUpdates!=null&&gameLoaded)playUpdates.resume(); if(reminders!=null)reminders.resume(); if(ads!=null)ads.resumeBanner(); if (web != null) { web.onResume(); web.evaluateJavascript("window.dispatchEvent(new Event('androidresume'));", null); } }
    @Override protected void onStop(){if(reminders!=null)reminders.leave();super.onStop();}
    @Override public void onRequestPermissionsResult(int requestCode,String[] permissions,int[] results){super.onRequestPermissionsResult(requestCode,permissions,results);if(requestCode==GameReminders.REQUEST&&reminders!=null)reminders.permissionResult();}
    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == PlayUpdates.REQUEST && playUpdates!=null)playUpdates.result();
        if (requestCode == PICK_PHOTO && photoCallback != null) {
            Uri uri = resultCode == RESULT_OK && data != null ? data.getData() : null;
            boolean valid = false;
            try { valid = uri != null && "content".equals(uri.getScheme()) && getContentResolver().getType(uri) != null && getContentResolver().getType(uri).startsWith("image/"); } catch (SecurityException ignored) {}
            photoCallback.onReceiveValue(valid ? new Uri[]{uri} : null);
            photoCallback = null;
        }
    }
    @Override public void onBackPressed() {
        if(!gameLoaded){contentUpdates.cancel();openInstalledGame();return;}
        if(ads!=null && ads.isShowing())return;
        if(exitDialog!=null&&exitDialog.isShowing())return;
        // Let the game dismiss its topmost screen before offering to exit the app.
        // The fallback preserves safe pause behavior with older bundled content.
        web.evaluateJavascript("(function(){if(typeof window.handleAndroidBack==='function')return window.handleAndroidBack()===true;window.dispatchEvent(new Event('androidback'));return false;})()", result -> {
            if(isFinishing()||isDestroyed()||"true".equals(result))return;
            showExitConfirmation();
        });
    }
    private void showExitConfirmation() {
        if(exitDialog!=null&&exitDialog.isShowing())return;
        exitDialog=new AlertDialog.Builder(this).setTitle("Leave Shape Shift?").setMessage("Your progress is saved on this device.")
            .setPositiveButton("Leave", new DialogInterface.OnClickListener() {
                @Override public void onClick(DialogInterface dialog, int which) { finish(); }
            }).setNegativeButton("Stay", new DialogInterface.OnClickListener() {
                @Override public void onClick(DialogInterface dialog, int which) { immersive(); }
            }).create();
        exitDialog.setOnDismissListener(dialog -> exitDialog=null);
        exitDialog.show();
    }
    @Override protected void onDestroy() { if(achievements!=null)achievements.destroy(); if(contentUpdates!=null)contentUpdates.cancel();updateWorker.shutdownNow();if(playUpdates!=null)playUpdates.destroy(); if(exitDialog!=null){exitDialog.dismiss();exitDialog=null;} if(photoCallback!=null){photoCallback.onReceiveValue(null);photoCallback=null;} if(ads!=null)ads.destroy(); if (web != null) web.destroy(); super.onDestroy(); }
}


