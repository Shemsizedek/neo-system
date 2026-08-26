package io.neo.omnitrix;

import android.app.*;
import android.content.*;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.text.InputType;
import android.view.*;
import android.webkit.*;
import android.widget.*;

import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class MainActivityV14 extends Activity {
    private static final String HOME = "file:///android_asset/newtab.html";
    private static final String NOOGLE = "https://shemsizedek.github.io/neo-system/noogle/";
    private static final String MOBILE_UA = "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126 Mobile Safari/537.36 Omnitrix/1.4";
    private static final String DESKTOP_UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126 Safari/537.36 Omnitrix/1.4";

    private final ArrayList<TabState> tabs = new ArrayList<>();
    private final ExecutorService io = Executors.newFixedThreadPool(2);
    private WebView web;
    private EditText address;
    private LinearLayout header, dock;
    private FrameLayout rootFrame, webFrame;
    private View customView;
    private WebChromeClient.CustomViewCallback customViewCallback;
    private SharedPreferences prefs;
    private int activeTab = 0;
    private int skin = 0;
    private boolean desktop = false;
    private String pendingNoogleQuery;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        prefs = getSharedPreferences("omnitrix", MODE_PRIVATE);
        skin = prefs.getInt("skin", 0);
        desktop = prefs.getBoolean("desktop", false);
        getWindow().setStatusBarColor(Color.BLACK);
        getWindow().setNavigationBarColor(Color.BLACK);
        buildUi();
        configureWeb();
        applySkin();
        tabs.add(new TabState("Omnitrix New Tab", HOME));
        web.loadUrl(HOME);
    }

    private void buildUi() {
        rootFrame = new FrameLayout(this);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.rgb(1,5,3));
        rootFrame.addView(root, new FrameLayout.LayoutParams(-1,-1));

        header = new LinearLayout(this);
        header.setGravity(Gravity.CENTER_VERTICAL);
        header.setPadding(dp(7),dp(5),dp(7),dp(5));

        ImageView logo = new ImageView(this);
        logo.setImageResource(R.drawable.omnitrix_logo);
        logo.setScaleType(ImageView.ScaleType.CENTER_CROP);
        logo.setContentDescription("Omnitrix home");
        logo.setOnClickListener(v -> open(HOME));
        header.addView(logo,new LinearLayout.LayoutParams(dp(48),dp(48)));

        Button back = nav("‹"); back.setOnClickListener(v -> { if(web.canGoBack()) web.goBack(); }); header.addView(back);
        Button fwd = nav("›"); fwd.setOnClickListener(v -> { if(web.canGoForward()) web.goForward(); }); header.addView(fwd);
        Button reload = nav("↻"); reload.setOnClickListener(v -> web.reload()); header.addView(reload);

        address = new EditText(this);
        address.setSingleLine(true);
        address.setHint("Search Noogle or enter a website");
        address.setTextColor(Color.WHITE);
        address.setHintTextColor(Color.rgb(115,145,125));
        address.setTextSize(14);
        address.setPadding(dp(14),0,dp(14),0);
        address.setImeOptions(2);
        address.setSelectAllOnFocus(true);
        address.setOnEditorActionListener((v,id,event) -> { navigate(address.getText().toString()); return true; });
        LinearLayout.LayoutParams alp = new LinearLayout.LayoutParams(0,dp(42),1f); alp.setMargins(dp(4),0,dp(4),0); header.addView(address,alp);

        Button tabBtn = nav("▣"); tabBtn.setOnClickListener(v -> showTabs()); header.addView(tabBtn);
        Button menu = nav("⋮"); menu.setOnClickListener(v -> showMenu()); header.addView(menu);
        root.addView(header,new LinearLayout.LayoutParams(-1,dp(60)));

        webFrame = new FrameLayout(this);
        web = new WebView(this);
        webFrame.addView(web,new FrameLayout.LayoutParams(-1,-1));
        root.addView(webFrame,new LinearLayout.LayoutParams(-1,0,1f));

        dock = new LinearLayout(this); dock.setGravity(Gravity.CENTER); dock.setPadding(dp(4),dp(2),dp(4),dp(2));
        dock(dock,"Home",v->open(HOME));
        dock(dock,"Noogle",v->open(NOOGLE));
        dock(dock,"Bitcoin",v->open("https://mempool.space/"));
        dock(dock,"XCP",v->open("https://tokenscan.io/"));
        dock(dock,"Miner",v->showMiner());
        root.addView(dock,new LinearLayout.LayoutParams(-1,dp(50)));
        setContentView(rootFrame);
    }

    private void configureWeb() {
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true); s.setDomStorageEnabled(true); s.setDatabaseEnabled(true);
        s.setLoadWithOverviewMode(true); s.setUseWideViewPort(true); s.setBuiltInZoomControls(true); s.setDisplayZoomControls(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW); s.setSafeBrowsingEnabled(true); s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(true); s.setAllowContentAccess(false); s.setUserAgentString(desktop ? DESKTOP_UA : MOBILE_UA);
        android.webkit.CookieManager.getInstance().setAcceptCookie(true);
        web.setBackgroundColor(Color.rgb(1,5,3));
        web.setDownloadListener((url,ua,cd,mime,len)->download(url,ua,cd,mime));
        web.setWebChromeClient(new WebChromeClient(){
            @Override public void onReceivedTitle(WebView v,String title){ if(activeTab<tabs.size()) tabs.get(activeTab).title=(title==null||title.isEmpty())?"Tab":title; }
            @Override public void onShowCustomView(View v,CustomViewCallback cb){ if(customView!=null){cb.onCustomViewHidden();return;} customView=v;customViewCallback=cb;header.setVisibility(View.GONE);dock.setVisibility(View.GONE);webFrame.setVisibility(View.GONE);rootFrame.addView(v,new FrameLayout.LayoutParams(-1,-1));getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN|View.SYSTEM_UI_FLAG_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY); }
            @Override public void onHideCustomView(){ exitFullscreen(); }
        });
        web.setWebViewClient(new WebViewClient(){
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest req){
                String u=req.getUrl().toString();
                if(u.startsWith("omnitrix://")) { if(view.getUrl()!=null && view.getUrl().startsWith(HOME)) handleInternal(Uri.parse(u)); else Toast.makeText(MainActivityV14.this,"Internal command blocked outside Omnitrix home",Toast.LENGTH_SHORT).show(); return true; }
                if(isSafeWeb(u)) return false;
                if(u.startsWith("mailto:")||u.startsWith("tel:")||u.startsWith("market:")){try{startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(u)));}catch(Exception ignored){}return true;}
                Toast.makeText(MainActivityV14.this,"Blocked unsafe URL scheme",Toast.LENGTH_SHORT).show(); return true;
            }
            @Override public void onPageFinished(WebView view,String url){
                boolean home=HOME.equals(url), noogle=url!=null&&url.startsWith(NOOGLE);
                address.setText(home?"":(url==null?"":url)); address.setVisibility(home||noogle?View.GONE:View.VISIBLE);
                if(activeTab<tabs.size()) tabs.get(activeTab).url=url==null?HOME:url;
                if(!home) rememberHistory(url,view.getTitle());
                if(noogle){view.evaluateJavascript("(function(){var b=document.querySelector('.consumer-browser-bar');if(b)b.style.display='none';})()",null);if(pendingNoogleQuery!=null){String q=js(pendingNoogleQuery);pendingNoogleQuery=null;view.evaluateJavascript("(function(){var i=document.getElementById('heroInput');var f=document.getElementById('heroForm');if(i&&f){i.value='"+q+"';if(f.requestSubmit)f.requestSubmit();else f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));}})()",null);}}
                if(home){injectDashboardState();refreshLiveCards();}
            }
        });
    }

    private void handleInternal(Uri uri){
        String host=uri.getHost()==null?"":uri.getHost();
        switch(host){
            case "search": navigate(uri.getQueryParameter("q")); break;
            case "new-tab": newTab(); break;
            case "tabs": showTabs(); break;
            case "switch-tab": try{switchTab(Integer.parseInt(uri.getQueryParameter("index")));}catch(Exception ignored){} break;
            case "bookmarks": showBookmarks(); break;
            case "history": showHistory(); break;
            case "downloads": try{startActivity(new Intent(DownloadManager.ACTION_VIEW_DOWNLOADS));}catch(Exception ignored){} break;
            case "miner": showMiner(); break;
            case "settings": showSettings(); break;
        }
    }

    private void navigate(String raw){
        String v=raw==null?"":raw.trim(); if(v.isEmpty()) return;
        if(v.matches("(?i)^https://.+")) open(v);
        else if(v.matches("(?i)^http://.+")) Toast.makeText(this,"Omnitrix requires HTTPS for direct browsing",Toast.LENGTH_LONG).show();
        else if(v.matches("^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}(/.*)?$")) open("https://"+v);
        else {pendingNoogleQuery=v;open(NOOGLE);}
    }

    private void open(String url){ if(activeTab>=tabs.size()){tabs.add(new TabState("Tab",url));activeTab=tabs.size()-1;}tabs.get(activeTab).url=url;web.loadUrl(url); }
    private void newTab(){tabs.add(new TabState("Omnitrix New Tab",HOME));activeTab=tabs.size()-1;web.clearHistory();web.loadUrl(HOME);}
    private void switchTab(int index){if(index<0||index>=tabs.size())return;activeTab=index;web.clearHistory();web.loadUrl(tabs.get(index).url);}
    private void closeTab(){if(tabs.size()<=1){tabs.clear();tabs.add(new TabState("Omnitrix New Tab",HOME));activeTab=0;web.loadUrl(HOME);return;}tabs.remove(activeTab);activeTab=Math.max(0,Math.min(activeTab,tabs.size()-1));web.clearHistory();web.loadUrl(tabs.get(activeTab).url);}

    private void showTabs(){String[] rows=new String[tabs.size()+1];for(int i=0;i<tabs.size();i++)rows[i]=(i==activeTab?"● ":"○ ")+(tabs.get(i).title==null?"Tab":tabs.get(i).title);rows[rows.length-1]="＋ New tab";new AlertDialog.Builder(this).setTitle("Omnitrix Tabs").setItems(rows,(d,w)->{if(w==tabs.size())newTab();else switchTab(w);}).setNeutralButton("Close current",(d,w)->closeTab()).setNegativeButton("Done",null).show();}

    private void showMenu(){String site=desktop?"Mobile site":"Desktop site";String[] items={"New tab","New Tab OS","Bookmarks","History","Share page","Bookmark this page",site,"Downloads","NEO Miner","Change skin","Privacy & settings"};new AlertDialog.Builder(this).setTitle("Omnitrix v1.4").setItems(items,(d,w)->{switch(w){case 0:newTab();break;case 1:open(HOME);break;case 2:showBookmarks();break;case 3:showHistory();break;case 4:share();break;case 5:bookmark();break;case 6:toggleDesktop();break;case 7:try{startActivity(new Intent(DownloadManager.ACTION_VIEW_DOWNLOADS));}catch(Exception ignored){}break;case 8:showMiner();break;case 9:cycleSkin();break;case 10:showSettings();break;}}).show();}
    private void share(){String u=web.getUrl();if(u==null||u.startsWith("file:"))u=NOOGLE;Intent i=new Intent(Intent.ACTION_SEND);i.setType("text/plain");i.putExtra(Intent.EXTRA_TEXT,(web.getTitle()==null?"Omnitrix":web.getTitle())+"\n"+u);startActivity(Intent.createChooser(i,"Share with"));}
    private void bookmark(){String u=web.getUrl();if(u==null||u.startsWith("file:")){Toast.makeText(this,"Open a website before bookmarking",Toast.LENGTH_SHORT).show();return;}LinkedHashSet<String> set=new LinkedHashSet<>(prefs.getStringSet("bookmarks",new LinkedHashSet<>()));set.add((web.getTitle()==null?u:web.getTitle())+"\t"+u);prefs.edit().putStringSet("bookmarks",set).apply();Toast.makeText(this,"Bookmarked",Toast.LENGTH_SHORT).show();if(HOME.equals(web.getUrl()))injectDashboardState();}
    private void showBookmarks(){ArrayList<String> set=new ArrayList<>(prefs.getStringSet("bookmarks",new LinkedHashSet<>()));if(set.isEmpty()){Toast.makeText(this,"No bookmarks yet",Toast.LENGTH_SHORT).show();return;}String[] labels=new String[set.size()];for(int i=0;i<set.size();i++)labels[i]=set.get(i).split("\\t",2)[0];new AlertDialog.Builder(this).setTitle("Favorites").setItems(labels,(d,w)->{String[]p=set.get(w).split("\\t",2);if(p.length>1)open(p[1]);}).setNeutralButton("Clear",(d,w)->prefs.edit().remove("bookmarks").apply()).setNegativeButton("Done",null).show();}
    private void rememberHistory(String url,String title){if(url==null||url.equals("about:blank")||url.startsWith("file:"))return;String old=prefs.getString("history","");String row=(title==null?url:title.replace("\n"," "))+"\t"+url;String[]lines=(row+"\n"+old).split("\n");StringBuilder out=new StringBuilder();HashSet<String>seen=new HashSet<>();int count=0;for(String line:lines){String[]p=line.split("\\t",2);if(p.length<2||!seen.add(p[1]))continue;out.append(line).append('\n');if(++count>=60)break;}prefs.edit().putString("history",out.toString()).apply();}
    private void showHistory(){String raw=prefs.getString("history","").trim();if(raw.isEmpty()){Toast.makeText(this,"History is empty",Toast.LENGTH_SHORT).show();return;}String[]rows=raw.split("\n"),labels=new String[rows.length];for(int i=0;i<rows.length;i++)labels[i]=rows[i].split("\\t",2)[0];new AlertDialog.Builder(this).setTitle("History").setItems(labels,(d,w)->{String[]p=rows[w].split("\\t",2);if(p.length>1)open(p[1]);}).setNeutralButton("Clear",(d,w)->prefs.edit().remove("history").apply()).setNegativeButton("Done",null).show();}

    private void showSettings(){String[]items={"Clear browsing data","Clear cookies","Open New Tab OS","Security: HTTPS-only direct browsing","Skin: "+skinName(),desktop?"Default to mobile sites":"Default to desktop sites"};new AlertDialog.Builder(this).setTitle("Privacy & Settings").setItems(items,(d,w)->{if(w==0){web.clearCache(true);web.clearHistory();prefs.edit().remove("history").apply();Toast.makeText(this,"Browsing data cleared",Toast.LENGTH_SHORT).show();}else if(w==1){android.webkit.CookieManager.getInstance().removeAllCookies(null);android.webkit.CookieManager.getInstance().flush();Toast.makeText(this,"Cookies cleared",Toast.LENGTH_SHORT).show();}else if(w==2)open(HOME);else if(w==3)Toast.makeText(this,"HTTPS-only direct navigation is active",Toast.LENGTH_LONG).show();else if(w==4)cycleSkin();else if(w==5)toggleDesktop();}).setNegativeButton("Done",null).show();}
    private void toggleDesktop(){desktop=!desktop;prefs.edit().putBoolean("desktop",desktop).apply();web.getSettings().setUserAgentString(desktop?DESKTOP_UA:MOBILE_UA);web.reload();Toast.makeText(this,desktop?"Desktop mode enabled":"Mobile mode enabled",Toast.LENGTH_SHORT).show();}

    private void showMiner(){
        LinearLayout box=new LinearLayout(this);box.setOrientation(LinearLayout.VERTICAL);box.setPadding(dp(18),dp(8),dp(18),0);
        TextView intro=new TextView(this);intro.setText("Connect an authenticated HTTPS NEO Miner adapter you control. Tokens remain local to this device.");intro.setPadding(0,0,0,dp(10));box.addView(intro);
        EditText endpoint=new EditText(this);endpoint.setHint("https://miner.local:9443");endpoint.setSingleLine(true);endpoint.setText(prefs.getString("miner_endpoint",""));box.addView(endpoint);
        EditText token=new EditText(this);token.setHint("Session access token");token.setSingleLine(true);token.setInputType(InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_PASSWORD);box.addView(token);
        TextView status=new TextView(this);status.setText("Status: Not connected");status.setPadding(0,dp(12),0,dp(8));box.addView(status);
        LinearLayout actions=new LinearLayout(this);Button check=new Button(this);check.setText("Telemetry");Button start=new Button(this);start.setText("Start");Button stop=new Button(this);stop.setText("Stop");actions.addView(check,new LinearLayout.LayoutParams(0,-2,1));actions.addView(start,new LinearLayout.LayoutParams(0,-2,1));actions.addView(stop,new LinearLayout.LayoutParams(0,-2,1));box.addView(actions);
        View.OnClickListener save=v->{String base=endpoint.getText().toString().trim();if(base.startsWith("https://"))prefs.edit().putString("miner_endpoint",base).apply();};endpoint.setOnFocusChangeListener((v,f)->{if(!f)save.onClick(v);});
        check.setOnClickListener(v->{save.onClick(v);adapterCall(endpoint.getText().toString(),token.getText().toString(),"GET","/v1/status",status);});
        start.setOnClickListener(v->{save.onClick(v);adapterCall(endpoint.getText().toString(),token.getText().toString(),"POST","/v1/mining/start",status);});
        stop.setOnClickListener(v->{save.onClick(v);adapterCall(endpoint.getText().toString(),token.getText().toString(),"POST","/v1/mining/stop",status);});
        new AlertDialog.Builder(this).setTitle("NEO Miner").setView(box).setNegativeButton("Close",null).show();
    }

    private void adapterCall(String base,String token,String method,String path,TextView status){base=base==null?"":base.trim();token=token==null?"":token.trim();if(!base.toLowerCase(Locale.US).startsWith("https://")||token.length()<8){status.setText("Status: HTTPS endpoint and access token required");return;}final String url=base.replaceAll("/+$","")+path,bearer=token;status.setText("Status: Connecting…");io.execute(()->{try{HttpURLConnection c=(HttpURLConnection)new URL(url).openConnection();c.setRequestMethod(method);c.setConnectTimeout(7000);c.setReadTimeout(9000);c.setRequestProperty("Accept","application/json");c.setRequestProperty("Authorization","Bearer "+bearer);if("POST".equals(method)){c.setDoOutput(true);c.getOutputStream().write("{}".getBytes(StandardCharsets.UTF_8));}int code=c.getResponseCode();String body=read(code>=200&&code<400?c.getInputStream():c.getErrorStream());String display=body.length()>420?body.substring(0,420)+"…":body;runOnUiThread(()->status.setText("Status: HTTP "+code+"\n"+display));}catch(Exception e){runOnUiThread(()->status.setText("Status: Connection failed — "+e.getMessage()));}});}

    private void injectDashboardState(){
        if(!HOME.equals(web.getUrl()))return;
        int bookmarks=prefs.getStringSet("bookmarks",new LinkedHashSet<>()).size();String hr=prefs.getString("history","").trim();int history=hr.isEmpty()?0:hr.split("\n").length;String miner=prefs.getString("miner_endpoint","").isEmpty()?"Not connected":"Adapter saved";
        StringBuilder t=new StringBuilder("[");for(int i=0;i<tabs.size();i++){if(i>0)t.append(',');TabState x=tabs.get(i);t.append("{\"title\":\"").append(json(x.title)).append("\",\"url\":\"").append(json(x.url)).append("\"}");}t.append(']');
        String js="window.omnitrixState&&window.omnitrixState({skin:\""+json(skinName())+"\",tabs:"+t+",active:"+activeTab+",bookmarks:"+bookmarks+",history:"+history+",miner:\""+json(miner)+"\"});";web.evaluateJavascript(js,null);
    }

    private void refreshLiveCards(){
        io.execute(()->{String btc="BTC network",btcSub="Price unavailable";try{String body=get("https://mempool.space/api/v1/prices");Matcher m=Pattern.compile("\\\"USD\\\"\\s*:\\s*([0-9.]+)").matcher(body);if(m.find()){double p=Double.parseDouble(m.group(1));btc="$"+String.format(Locale.US,"%,.0f",p);btcSub="Live BTC/USD · mempool.space";}}catch(Exception ignored){}final String b=btc,bs=btcSub;runOnUiThread(()->{if(HOME.equals(web.getUrl()))web.evaluateJavascript("document.getElementById('btc').textContent='"+js(b)+"';document.getElementById('btcSub').textContent='"+js(bs)+"';",null);});});
        io.execute(()->{String xcp="XCP network",sub="Core status unavailable";try{String body=get("https://api.counterparty.io:4000/v2/assets/XCP");Matcher m=Pattern.compile("\\\"supply\\\"\\s*:\\s*([0-9.]+)").matcher(body);if(m.find()){double raw=Double.parseDouble(m.group(1));double supply=raw>1000000000d?raw/100000000d:raw;xcp=String.format(Locale.US,"%,.0f XCP",supply);sub="Live asset state · Counterparty Core";}else{xcp="XCP online";sub="Counterparty Core v2 reachable";}}catch(Exception ignored){}final String x=xcp,s=sub;runOnUiThread(()->{if(HOME.equals(web.getUrl()))web.evaluateJavascript("document.getElementById('xcp').textContent='"+js(x)+"';document.getElementById('xcpSub').textContent='"+js(s)+"';",null);});});
    }

    private String get(String url)throws IOException{HttpURLConnection c=(HttpURLConnection)new URL(url).openConnection();c.setConnectTimeout(6500);c.setReadTimeout(6500);c.setRequestProperty("Accept","application/json");c.setRequestProperty("User-Agent","Omnitrix/1.4");return read(c.getInputStream());}
    private String read(InputStream in)throws IOException{if(in==null)return"";ByteArrayOutputStream out=new ByteArrayOutputStream();byte[]buf=new byte[2048];int n;while((n=in.read(buf))>0&&out.size()<65536)out.write(buf,0,n);return out.toString(StandardCharsets.UTF_8.name());}

    private void download(String url,String ua,String cd,String mime){try{DownloadManager.Request r=new DownloadManager.Request(Uri.parse(url));r.setMimeType(mime);r.addRequestHeader("User-Agent",ua);r.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);String name=URLUtil.guessFileName(url,cd,mime);r.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS,name);((DownloadManager)getSystemService(DOWNLOAD_SERVICE)).enqueue(r);Toast.makeText(this,"Downloading "+name,Toast.LENGTH_LONG).show();}catch(Exception e){Toast.makeText(this,"Download could not start",Toast.LENGTH_LONG).show();}}
    private void exitFullscreen(){if(customView==null)return;rootFrame.removeView(customView);customView=null;if(customViewCallback!=null)customViewCallback.onCustomViewHidden();customViewCallback=null;webFrame.setVisibility(View.VISIBLE);header.setVisibility(View.VISIBLE);dock.setVisibility(View.VISIBLE);getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_VISIBLE);}

    private void cycleSkin(){skin=(skin+1)%3;prefs.edit().putInt("skin",skin).apply();applySkin();Toast.makeText(this,"Omnitrix "+skinName()+" skin",Toast.LENGTH_SHORT).show();if(HOME.equals(web.getUrl()))injectDashboardState();}
    private String skinName(){return skin==0?"NEO Matrix":skin==1?"Electric Void":"Royal Neon";}
    private void applySkin(){int a=skin==0?Color.rgb(101,255,138):skin==1?Color.rgb(0,217,255):Color.rgb(174,104,255);int a2=skin==0?Color.rgb(0,180,95):skin==1?Color.rgb(0,96,255):Color.rgb(255,68,176);GradientDrawable top=new GradientDrawable(GradientDrawable.Orientation.LEFT_RIGHT,new int[]{Color.rgb(0,5,3),Color.rgb(5,17,11),Color.rgb(0,3,2)});top.setStroke(dp(1),Color.argb(80,Color.red(a),Color.green(a),Color.blue(a)));header.setBackground(top);GradientDrawable bot=new GradientDrawable(GradientDrawable.Orientation.LEFT_RIGHT,new int[]{Color.rgb(1,7,4),Color.rgb(5,18,12),Color.rgb(1,7,4)});bot.setStroke(dp(1),Color.argb(60,Color.red(a2),Color.green(a2),Color.blue(a2)));dock.setBackground(bot);GradientDrawable bg=new GradientDrawable(GradientDrawable.Orientation.LEFT_RIGHT,new int[]{Color.rgb(6,18,12),Color.rgb(2,11,8)});bg.setCornerRadius(dp(24));bg.setStroke(dp(1),Color.argb(120,Color.red(a),Color.green(a),Color.blue(a)));address.setBackground(bg);}

    private boolean isSafeWeb(String u){if(u==null)return false;String x=u.toLowerCase(Locale.US);return x.startsWith("https://")||x.equals("about:blank")||x.startsWith(HOME);}
    private String js(String s){return(s==null?"":s).replace("\\","\\\\").replace("'","\\'").replace("\n"," ").replace("\r"," ");}
    private String json(String s){return(s==null?"":s).replace("\\","\\\\").replace("\"","\\\"").replace("\n"," ").replace("\r"," ");}
    private Button nav(String label){Button b=new Button(this);b.setText(label);b.setTextColor(Color.rgb(210,255,225));b.setTextSize(18);b.setAllCaps(false);b.setMinWidth(0);b.setMinimumWidth(0);b.setPadding(0,0,0,0);b.setBackgroundColor(Color.TRANSPARENT);b.setLayoutParams(new LinearLayout.LayoutParams(dp(38),dp(44)));return b;}
    private void dock(LinearLayout d,String label,View.OnClickListener action){Button b=new Button(this);b.setText(label);b.setTextColor(Color.rgb(190,230,204));b.setTextSize(11);b.setAllCaps(false);b.setOnClickListener(action);b.setBackgroundColor(Color.TRANSPARENT);d.addView(b,new LinearLayout.LayoutParams(0,-1,1f));}
    private int dp(int v){return(int)(v*getResources().getDisplayMetrics().density+.5f);}

    @Override public void onBackPressed(){if(customView!=null){exitFullscreen();return;}if(web.canGoBack())web.goBack();else if(!HOME.equals(web.getUrl()))open(HOME);else super.onBackPressed();}
    @Override protected void onDestroy(){io.shutdownNow();if(web!=null)web.destroy();super.onDestroy();}
    private static final class TabState{String title,url;TabState(String t,String u){title=t;url=u;}}
}
