package io.neo.omnitrix;

import android.app.*;
import android.content.*;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.net.nsd.NsdManager;
import android.net.nsd.NsdServiceInfo;
import android.os.Bundle;
import android.os.Environment;
import android.text.InputType;
import android.view.*;
import android.webkit.*;
import android.widget.*;

import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends Activity {
    private static final String NOOGLE = "https://shemsizedek.github.io/neo-system/noogle/";
    private static final String SERVICE_TYPE = "_neo-miner._tcp.";
    private static final String MOBILE_UA = "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126 Mobile Safari/537.36 Omnitrix/1.3";
    private static final String DESKTOP_UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126 Safari/537.36 Omnitrix/1.3";

    private WebView web;
    private EditText addressBar;
    private LinearLayout dock, header;
    private FrameLayout rootFrame, webFrame;
    private View customView;
    private WebChromeClient.CustomViewCallback customViewCallback;
    private String pendingNoogleQuery;
    private int skin = 0;
    private boolean desktopMode = false;
    private final ArrayList<TabState> tabs = new ArrayList<>();
    private int activeTab = 0;
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private NsdManager nsd;
    private NsdManager.DiscoveryListener discoveryListener;
    private SharedPreferences prefs;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        prefs = getSharedPreferences("omnitrix", MODE_PRIVATE);
        skin = prefs.getInt("skin", 0);
        desktopMode = prefs.getBoolean("desktop", false);
        getWindow().setStatusBarColor(Color.BLACK);
        getWindow().setNavigationBarColor(Color.BLACK);
        buildUi();
        configureWeb();
        applySkin();
        tabs.add(new TabState("Noogle", NOOGLE));
        web.loadUrl(NOOGLE);
    }

    private void buildUi() {
        rootFrame = new FrameLayout(this);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.rgb(1,5,3));
        rootFrame.addView(root, new FrameLayout.LayoutParams(-1,-1));

        header = new LinearLayout(this);
        header.setGravity(Gravity.CENTER_VERTICAL);
        header.setPadding(dp(7),dp(6),dp(7),dp(6));

        ImageView brand = new ImageView(this);
        brand.setImageResource(R.drawable.omnitrix_logo);
        brand.setScaleType(ImageView.ScaleType.CENTER_CROP);
        brand.setContentDescription("Omnitrix home");
        brand.setPadding(dp(1),dp(1),dp(1),dp(1));
        brand.setOnClickListener(v -> openInCurrentTab(NOOGLE));
        header.addView(brand,new LinearLayout.LayoutParams(dp(48),dp(48)));

        Button back = navButton("‹"); back.setContentDescription("Back");
        back.setOnClickListener(v -> { if(web.canGoBack()) web.goBack(); }); header.addView(back);
        Button forward = navButton("›"); forward.setContentDescription("Forward");
        forward.setOnClickListener(v -> { if(web.canGoForward()) web.goForward(); }); header.addView(forward);
        Button reload = navButton("↻"); reload.setContentDescription("Reload"); reload.setOnClickListener(v -> web.reload()); header.addView(reload);

        addressBar = new EditText(this);
        addressBar.setSingleLine(true);
        addressBar.setHint("Search Noogle or enter a website");
        addressBar.setTextColor(Color.WHITE);
        addressBar.setHintTextColor(Color.rgb(120,150,132));
        addressBar.setTextSize(14);
        addressBar.setPadding(dp(15),0,dp(15),0);
        addressBar.setImeOptions(2);
        addressBar.setVisibility(View.GONE);
        addressBar.setSelectAllOnFocus(true);
        addressBar.setOnEditorActionListener((v,id,event) -> { navigate(addressBar.getText().toString()); return true; });
        LinearLayout.LayoutParams addressLp = new LinearLayout.LayoutParams(0,dp(42),1f);
        addressLp.setMargins(dp(5),0,dp(5),0);
        header.addView(addressBar,addressLp);

        Button tabsButton = navButton("▣"); tabsButton.setContentDescription("Tabs"); tabsButton.setOnClickListener(v -> showTabs()); header.addView(tabsButton);
        Button menu = navButton("⋮"); menu.setContentDescription("Omnitrix menu"); menu.setOnClickListener(v -> showBrowserMenu()); header.addView(menu);
        root.addView(header,new LinearLayout.LayoutParams(-1,dp(62)));

        webFrame = new FrameLayout(this);
        web = new WebView(this);
        webFrame.addView(web,new FrameLayout.LayoutParams(-1,-1));
        root.addView(webFrame,new LinearLayout.LayoutParams(-1,0,1f));

        dock = new LinearLayout(this);
        dock.setGravity(Gravity.CENTER);
        dock.setPadding(dp(5),dp(3),dp(5),dp(3));
        addDock(dock,"Noogle",v -> openInCurrentTab(NOOGLE));
        addDock(dock,"Bitcoin",v -> openInCurrentTab("https://mempool.space/"));
        addDock(dock,"XCP",v -> openInCurrentTab("https://tokenscan.io/"));
        addDock(dock,"Miner",v -> showMinerPanel());
        addDock(dock,"Menu",v -> showBrowserMenu());
        root.addView(dock,new LinearLayout.LayoutParams(-1,dp(52)));
        setContentView(rootFrame);
    }

    private void configureWeb() {
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setBuiltInZoomControls(true);
        s.setDisplayZoomControls(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setSafeBrowsingEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setUserAgentString(desktopMode ? DESKTOP_UA : MOBILE_UA);
        android.webkit.CookieManager.getInstance().setAcceptCookie(true);
        web.setBackgroundColor(Color.rgb(1,5,3));

        web.setDownloadListener((url,userAgent,contentDisposition,mimetype,contentLength) -> startDownload(url,userAgent,contentDisposition,mimetype));
        web.setWebChromeClient(new WebChromeClient() {
            @Override public void onReceivedTitle(WebView view,String title) {
                if(activeTab < tabs.size()) tabs.get(activeTab).title = title == null || title.isEmpty() ? "Tab" : title;
            }
            @Override public void onShowCustomView(View view, CustomViewCallback callback) {
                if(customView != null) { callback.onCustomViewHidden(); return; }
                customView = view; customViewCallback = callback;
                header.setVisibility(View.GONE); dock.setVisibility(View.GONE); webFrame.setVisibility(View.GONE);
                rootFrame.addView(view,new FrameLayout.LayoutParams(-1,-1));
                getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN|View.SYSTEM_UI_FLAG_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
            }
            @Override public void onHideCustomView() { exitFullscreen(); }
        });

        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                String u = req.getUrl().toString();
                if(UriSafety.check(u).allowed) return false;
                if(u.startsWith("mailto:") || u.startsWith("tel:") || u.startsWith("market:")) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(u))); } catch(Exception ignored) {}
                    return true;
                }
                Toast.makeText(MainActivity.this,"Blocked unsafe URL scheme",Toast.LENGTH_SHORT).show();
                return true;
            }
            @Override public void onPageFinished(WebView view,String url) {
                boolean atNoogle = url != null && url.startsWith(NOOGLE);
                addressBar.setText(url == null ? "" : url);
                addressBar.setVisibility(atNoogle ? View.GONE : View.VISIBLE);
                dock.setVisibility(atNoogle ? View.VISIBLE : View.GONE);
                if(activeTab < tabs.size()) tabs.get(activeTab).url = url == null ? NOOGLE : url;
                rememberHistory(url,view.getTitle());
                if(atNoogle) view.evaluateJavascript("(function(){var b=document.querySelector('.consumer-browser-bar');if(b)b.style.display='none';})()",null);
                if(pendingNoogleQuery != null && atNoogle) {
                    String q = pendingNoogleQuery.replace("\\","\\\\").replace("'","\\'");
                    pendingNoogleQuery = null;
                    view.evaluateJavascript("(function(){var i=document.getElementById('heroInput');var f=document.getElementById('heroForm');if(i&&f){i.value='"+q+"';if(f.requestSubmit)f.requestSubmit();else f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));return 'ok';}return 'missing';})()",null);
                }
            }
        });
    }

    private void navigate(String raw) {
        String value = raw == null ? "" : raw.trim();
        if(value.isEmpty()) return;
        if(value.matches("(?i)^https://.+")) openInCurrentTab(value);
        else if(value.matches("(?i)^http://.+")) Toast.makeText(this,"Omnitrix requires HTTPS for direct browsing",Toast.LENGTH_LONG).show();
        else if(value.matches("^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}(/.*)?$")) openInCurrentTab("https://"+value);
        else { pendingNoogleQuery = value; openInCurrentTab(NOOGLE); }
    }

    private void openInCurrentTab(String url) {
        if(activeTab >= tabs.size()) { tabs.add(new TabState("Tab",url)); activeTab=tabs.size()-1; }
        tabs.get(activeTab).url=url; web.loadUrl(url);
    }

    private void newTab() {
        tabs.add(new TabState("New Tab",NOOGLE)); activeTab=tabs.size()-1; web.clearHistory(); web.loadUrl(NOOGLE);
    }

    private void showTabs() {
        String[] rows = new String[tabs.size()+1];
        for(int i=0;i<tabs.size();i++) rows[i]=(i==activeTab?"● ":"○ ")+(tabs.get(i).title==null?"Tab":tabs.get(i).title);
        rows[rows.length-1]="＋ New tab";
        new AlertDialog.Builder(this).setTitle("Omnitrix Tabs").setItems(rows,(d,which)->{
            if(which==tabs.size()) newTab();
            else { activeTab=which; web.clearHistory(); web.loadUrl(tabs.get(which).url); }
        }).setNeutralButton("Close current",(d,w)->closeCurrentTab()).setNegativeButton("Done",null).show();
    }

    private void closeCurrentTab() {
        if(tabs.size()<=1) { tabs.clear(); tabs.add(new TabState("Noogle",NOOGLE)); activeTab=0; web.loadUrl(NOOGLE); return; }
        tabs.remove(activeTab); activeTab=Math.max(0,Math.min(activeTab,tabs.size()-1)); web.clearHistory(); web.loadUrl(tabs.get(activeTab).url);
    }

    private void showBrowserMenu() {
        String desktopLabel=desktopMode?"Mobile site":"Desktop site";
        String[] items={"New tab","Bookmarks","History","Share page","Bookmark this page",desktopLabel,"Downloads","NEO Miner","Change skin","Privacy & settings"};
        new AlertDialog.Builder(this).setTitle("Omnitrix").setItems(items,(d,which)->{
            switch(which) {
                case 0: newTab(); break;
                case 1: showBookmarks(); break;
                case 2: showHistory(); break;
                case 3: shareCurrentPage(); break;
                case 4: bookmarkCurrentPage(); break;
                case 5: toggleDesktop(); break;
                case 6: try { startActivity(new Intent(DownloadManager.ACTION_VIEW_DOWNLOADS)); } catch(Exception e){ Toast.makeText(this,"Open Android Downloads",Toast.LENGTH_SHORT).show(); } break;
                case 7: showMinerPanel(); break;
                case 8: cycleTheme(); break;
                case 9: showSettings(); break;
            }
        }).show();
    }

    private void shareCurrentPage() {
        Intent send=new Intent(Intent.ACTION_SEND); send.setType("text/plain"); send.putExtra(Intent.EXTRA_TEXT,web.getTitle()+"\n"+web.getUrl()); startActivity(Intent.createChooser(send,"Share with"));
    }

    private void bookmarkCurrentPage() {
        String url=web.getUrl(); if(url==null) return;
        LinkedHashSet<String> set=new LinkedHashSet<>(prefs.getStringSet("bookmarks",new LinkedHashSet<>()));
        set.add((web.getTitle()==null?url:web.getTitle())+"\t"+url); prefs.edit().putStringSet("bookmarks",set).apply();
        Toast.makeText(this,"Bookmarked",Toast.LENGTH_SHORT).show();
    }

    private void showBookmarks() {
        ArrayList<String> set=new ArrayList<>(prefs.getStringSet("bookmarks",new LinkedHashSet<>()));
        if(set.isEmpty()) { Toast.makeText(this,"No bookmarks yet",Toast.LENGTH_SHORT).show(); return; }
        String[] labels=new String[set.size()]; for(int i=0;i<set.size();i++) labels[i]=set.get(i).split("\\t",2)[0];
        new AlertDialog.Builder(this).setTitle("Bookmarks").setItems(labels,(d,w)->{ String[] p=set.get(w).split("\\t",2); if(p.length>1) openInCurrentTab(p[1]); }).setNeutralButton("Clear",(d,w)->prefs.edit().remove("bookmarks").apply()).setNegativeButton("Done",null).show();
    }

    private void rememberHistory(String url,String title) {
        if(url==null || url.equals("about:blank")) return;
        String old=prefs.getString("history","");
        String row=(title==null?url:title.replace("\n"," "))+"\t"+url;
        String combined=row+"\n"+old;
        String[] lines=combined.split("\n"); StringBuilder out=new StringBuilder(); HashSet<String> seen=new HashSet<>(); int count=0;
        for(String line:lines) { String[] p=line.split("\\t",2); if(p.length<2 || !seen.add(p[1])) continue; out.append(line).append('\n'); if(++count>=60) break; }
        prefs.edit().putString("history",out.toString()).apply();
    }

    private void showHistory() {
        String raw=prefs.getString("history","").trim(); if(raw.isEmpty()) { Toast.makeText(this,"History is empty",Toast.LENGTH_SHORT).show(); return; }
        String[] rows=raw.split("\n"); String[] labels=new String[rows.length]; for(int i=0;i<rows.length;i++) labels[i]=rows[i].split("\\t",2)[0];
        new AlertDialog.Builder(this).setTitle("History").setItems(labels,(d,w)->{String[] p=rows[w].split("\\t",2);if(p.length>1)openInCurrentTab(p[1]);}).setNeutralButton("Clear",(d,w)->prefs.edit().remove("history").apply()).setNegativeButton("Done",null).show();
    }

    private void toggleDesktop() {
        desktopMode=!desktopMode; prefs.edit().putBoolean("desktop",desktopMode).apply(); web.getSettings().setUserAgentString(desktopMode?DESKTOP_UA:MOBILE_UA); web.reload(); Toast.makeText(this,desktopMode?"Desktop site enabled":"Mobile site enabled",Toast.LENGTH_SHORT).show();
    }

    private void showSettings() {
        String[] items={"Clear browsing data","Clear cookies","Open Noogle home","Security: HTTPS-only browsing","Skin: "+skinName()};
        new AlertDialog.Builder(this).setTitle("Privacy & Settings").setItems(items,(d,w)->{
            if(w==0){ web.clearCache(true); web.clearHistory(); prefs.edit().remove("history").apply(); Toast.makeText(this,"Browsing data cleared",Toast.LENGTH_SHORT).show(); }
            else if(w==1){ android.webkit.CookieManager.getInstance().removeAllCookies(null); android.webkit.CookieManager.getInstance().flush(); Toast.makeText(this,"Cookies cleared",Toast.LENGTH_SHORT).show(); }
            else if(w==2) openInCurrentTab(NOOGLE);
            else if(w==3) Toast.makeText(this,"HTTPS-only direct navigation is active",Toast.LENGTH_LONG).show();
            else if(w==4) cycleTheme();
        }).setNegativeButton("Done",null).show();
    }

    private void startDownload(String url,String userAgent,String contentDisposition,String mimeType) {
        try {
            DownloadManager.Request req=new DownloadManager.Request(Uri.parse(url));
            req.setMimeType(mimeType); req.addRequestHeader("User-Agent",userAgent); req.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            String name=URLUtil.guessFileName(url,contentDisposition,mimeType); req.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS,name);
            ((DownloadManager)getSystemService(DOWNLOAD_SERVICE)).enqueue(req); Toast.makeText(this,"Downloading "+name,Toast.LENGTH_LONG).show();
        } catch(Exception e) { Toast.makeText(this,"Download could not start",Toast.LENGTH_LONG).show(); }
    }

    private void exitFullscreen() {
        if(customView==null) return;
        rootFrame.removeView(customView); customView=null; if(customViewCallback!=null)customViewCallback.onCustomViewHidden(); customViewCallback=null;
        webFrame.setVisibility(View.VISIBLE); header.setVisibility(View.VISIBLE); boolean atNoogle=web.getUrl()!=null&&web.getUrl().startsWith(NOOGLE); dock.setVisibility(atNoogle?View.VISIBLE:View.GONE);
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_VISIBLE);
    }

    private void showMinerPanel() {
        LinearLayout box=new LinearLayout(this); box.setOrientation(LinearLayout.VERTICAL); box.setPadding(dp(18),dp(8),dp(18),0);
        TextView intro=new TextView(this); intro.setText("Connect your NEO Miner or compatible adapter. Omnitrix accepts authenticated HTTPS adapters you control."); intro.setPadding(0,0,0,dp(12)); box.addView(intro);
        EditText endpoint=new EditText(this); endpoint.setHint("https://miner.local:9443"); endpoint.setSingleLine(true); box.addView(endpoint);
        EditText token=new EditText(this); token.setHint("Session access token"); token.setSingleLine(true); token.setInputType(InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_PASSWORD); box.addView(token);
        TextView status=new TextView(this); status.setText("Status: Not connected"); status.setPadding(0,dp(12),0,dp(8)); box.addView(status);
        Button discover=new Button(this); discover.setText("Find nearby NEO Miner adapters"); discover.setOnClickListener(v->discoverMiner(endpoint,status)); box.addView(discover);
        LinearLayout actions=new LinearLayout(this); Button check=new Button(this);check.setText("Telemetry");Button start=new Button(this);start.setText("Start");Button stop=new Button(this);stop.setText("Stop");
        actions.addView(check,new LinearLayout.LayoutParams(0,-2,1));actions.addView(start,new LinearLayout.LayoutParams(0,-2,1));actions.addView(stop,new LinearLayout.LayoutParams(0,-2,1));box.addView(actions);
        check.setOnClickListener(v->adapterCall(endpoint.getText().toString(),token.getText().toString(),"GET","/v1/status",status));
        start.setOnClickListener(v->adapterCall(endpoint.getText().toString(),token.getText().toString(),"POST","/v1/mining/start",status));
        stop.setOnClickListener(v->adapterCall(endpoint.getText().toString(),token.getText().toString(),"POST","/v1/mining/stop",status));
        AlertDialog dialog=new AlertDialog.Builder(this).setTitle("NEO Miner").setView(box).setNegativeButton("Close",null).create();dialog.setOnDismissListener(d->stopDiscovery());dialog.show();
    }

    private void discoverMiner(EditText endpoint,TextView status) {
        stopDiscovery(); nsd=(NsdManager)getSystemService(Context.NSD_SERVICE); status.setText("Status: Discovering secure local adapters…");
        discoveryListener=new NsdManager.DiscoveryListener(){
            public void onDiscoveryStarted(String type){} public void onServiceLost(NsdServiceInfo s){} public void onDiscoveryStopped(String type){} public void onStopDiscoveryFailed(String type,int code){}
            public void onStartDiscoveryFailed(String type,int code){runOnUiThread(()->status.setText("Status: Discovery unavailable"));}
            public void onServiceFound(NsdServiceInfo service){if(!service.getServiceType().startsWith("_neo-miner._tcp"))return;nsd.resolveService(service,new NsdManager.ResolveListener(){public void onResolveFailed(NsdServiceInfo s,int code){}public void onServiceResolved(NsdServiceInfo r){String host=r.getHost()==null?"":r.getHost().getHostAddress();int port=r.getPort();runOnUiThread(()->{endpoint.setText("https://"+host+":"+port);status.setText("Status: Adapter found — authenticate to connect");});}});}
        }; nsd.discoverServices(SERVICE_TYPE,NsdManager.PROTOCOL_DNS_SD,discoveryListener);
    }

    private void stopDiscovery(){if(nsd!=null&&discoveryListener!=null){try{nsd.stopServiceDiscovery(discoveryListener);}catch(Exception ignored){}}discoveryListener=null;}

    private void adapterCall(String base,String token,String method,String path,TextView status){
        base=base==null?"":base.trim();token=token==null?"":token.trim();if(!base.toLowerCase(Locale.US).startsWith("https://")||token.length()<8){status.setText("Status: HTTPS endpoint and access token required");return;}
        final String url=base.replaceAll("/+$","")+path,bearer=token;status.setText("Status: Connecting…");io.execute(()->{try{HttpURLConnection c=(HttpURLConnection)new URL(url).openConnection();c.setRequestMethod(method);c.setConnectTimeout(7000);c.setReadTimeout(9000);c.setRequestProperty("Accept","application/json");c.setRequestProperty("Authorization","Bearer "+bearer);if("POST".equals(method)){c.setDoOutput(true);c.getOutputStream().write("{}".getBytes(StandardCharsets.UTF_8));}int code=c.getResponseCode();InputStream stream=code>=200&&code<400?c.getInputStream():c.getErrorStream();String body=read(stream);String display=body.length()>420?body.substring(0,420)+"…":body;runOnUiThread(()->status.setText("Status: HTTP "+code+"\n"+display));}catch(Exception e){runOnUiThread(()->status.setText("Status: Connection failed — "+e.getMessage()));}});
    }

    private String read(InputStream in)throws IOException{if(in==null)return"No response body";ByteArrayOutputStream out=new ByteArrayOutputStream();byte[]buf=new byte[2048];int n;while((n=in.read(buf))>0&&out.size()<16384)out.write(buf,0,n);return out.toString(StandardCharsets.UTF_8.name());}

    private void cycleTheme(){skin=(skin+1)%3;prefs.edit().putInt("skin",skin).apply();applySkin();Toast.makeText(this,"Omnitrix "+skinName()+" skin",Toast.LENGTH_SHORT).show();}
    private String skinName(){return skin==0?"NEO Matrix":skin==1?"Electric Void":"Royal Neon";}
    private void applySkin(){
        int accent=skin==0?Color.rgb(101,255,138):skin==1?Color.rgb(0,217,255):Color.rgb(174,104,255);int accent2=skin==0?Color.rgb(0,180,95):skin==1?Color.rgb(0,96,255):Color.rgb(255,68,176);
        GradientDrawable top=new GradientDrawable(GradientDrawable.Orientation.LEFT_RIGHT,new int[]{Color.rgb(0,5,3),Color.rgb(5,17,11),Color.rgb(0,3,2)});top.setStroke(dp(1),Color.argb(80,Color.red(accent),Color.green(accent),Color.blue(accent)));header.setBackground(top);
        GradientDrawable bottom=new GradientDrawable(GradientDrawable.Orientation.LEFT_RIGHT,new int[]{Color.rgb(1,7,4),Color.rgb(5,18,12),Color.rgb(1,7,4)});bottom.setStroke(dp(1),Color.argb(60,Color.red(accent2),Color.green(accent2),Color.blue(accent2)));dock.setBackground(bottom);
        GradientDrawable addressBg=new GradientDrawable(GradientDrawable.Orientation.LEFT_RIGHT,new int[]{Color.rgb(6,18,12),Color.rgb(2,11,8)});addressBg.setCornerRadius(dp(24));addressBg.setStroke(dp(1),Color.argb(120,Color.red(accent),Color.green(accent),Color.blue(accent)));addressBar.setBackground(addressBg);
    }

    private Button navButton(String label){Button b=new Button(this);b.setText(label);b.setTextColor(Color.rgb(210,255,225));b.setTextSize(18);b.setAllCaps(false);b.setMinWidth(0);b.setMinimumWidth(0);b.setPadding(0,0,0,0);b.setBackgroundColor(Color.TRANSPARENT);b.setLayoutParams(new LinearLayout.LayoutParams(dp(38),dp(44)));return b;}
    private void addDock(LinearLayout d,String label,View.OnClickListener action){Button b=new Button(this);b.setText(label);b.setTextColor(Color.rgb(190,230,204));b.setTextSize(11);b.setAllCaps(false);b.setOnClickListener(action);b.setBackgroundColor(Color.TRANSPARENT);d.addView(b,new LinearLayout.LayoutParams(0,-1,1f));}
    private int dp(int value){return(int)(value*getResources().getDisplayMetrics().density+.5f);}

    @Override public void onBackPressed(){if(customView!=null){exitFullscreen();return;}if(web.canGoBack())web.goBack();else super.onBackPressed();}
    @Override protected void onDestroy(){stopDiscovery();io.shutdownNow();if(web!=null)web.destroy();super.onDestroy();}

    private static final class TabState{String title,url;TabState(String title,String url){this.title=title;this.url=url;}}
    private static final class UriSafety{final boolean allowed;UriSafety(boolean a){allowed=a;}static UriSafety check(String url){if(url==null)return new UriSafety(false);String u=url.toLowerCase(Locale.US);return new UriSafety(u.startsWith("https://")||u.startsWith("about:blank"));}}
}
