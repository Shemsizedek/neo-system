package org.neosystem.guardian;

import android.app.Activity;
import android.app.KeyguardManager;
import android.app.admin.DevicePolicyManager;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.net.ConnectivityManager;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.text.TextUtils;
import android.util.Base64;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import java.io.File;
import java.security.KeyStore;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

public class MainActivity extends Activity {
    static final String PREFS="neo_guardian", ALERTS="alerts_v2", HISTORY="history_v2", KEY="neo_guardian_local_v2";
    static final int AUTH=144;
    static final int BG=Color.rgb(7,10,16), PANEL=Color.rgb(16,22,32), PANEL2=Color.rgb(22,30,43), TEXT=Color.rgb(242,246,250), MUTED=Color.rgb(155,169,187), ACCENT=Color.rgb(75,220,170), WARN=Color.rgb(255,184,77), DANGER=Color.rgb(255,105,105), BLUE=Color.rgb(105,169,255);
    LinearLayout content; TextView chip; boolean unlocked=false; int risk=0,checks=0;
    static final Set<String> RISK_PERMS=new HashSet<>(Arrays.asList(
        "android.permission.READ_SMS","android.permission.SEND_SMS","android.permission.RECEIVE_SMS","android.permission.READ_CALL_LOG","android.permission.WRITE_CALL_LOG","android.permission.RECORD_AUDIO","android.permission.CAMERA","android.permission.ACCESS_FINE_LOCATION","android.permission.ACCESS_COARSE_LOCATION","android.permission.READ_CONTACTS","android.permission.WRITE_CONTACTS","android.permission.REQUEST_INSTALL_PACKAGES","android.permission.SYSTEM_ALERT_WINDOW","android.permission.READ_PHONE_STATE"));

    @Override protected void onCreate(Bundle b){super.onCreate(b);try{setContentView(shell());locked();}catch(Throwable t){setContentView(fallback(t));}}

    View shell(){
        LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setBackgroundColor(BG);root.addView(header());
        ScrollView s=new ScrollView(this);content=new LinearLayout(this);content.setOrientation(LinearLayout.VERTICAL);content.setPadding(dp(18),dp(16),dp(18),dp(28));s.addView(content);root.addView(s,new LinearLayout.LayoutParams(-1,0,1));root.addView(nav());return root;
    }
    View header(){
        LinearLayout x=new LinearLayout(this);x.setGravity(Gravity.CENTER_VERTICAL);x.setPadding(dp(18),dp(18),dp(18),dp(14));x.setBackgroundColor(PANEL);
        ImageView logo=new ImageView(this);logo.setImageResource(R.drawable.neo_guardian_logo);x.addView(logo,new LinearLayout.LayoutParams(dp(54),dp(54)));
        LinearLayout titles=new LinearLayout(this);titles.setOrientation(LinearLayout.VERTICAL);titles.setPadding(dp(12),0,0,0);titles.addView(txt("NEO Guardian",24,true,TEXT));titles.addView(txt("Defense & Incident Console • v2.0",12,false,MUTED));x.addView(titles,new LinearLayout.LayoutParams(0,-2,1));
        chip=txt("LOCKED",11,true,WARN);chip.setGravity(Gravity.CENTER);chip.setPadding(dp(10),dp(7),dp(10),dp(7));chip.setBackground(round(Color.rgb(52,42,20),18));x.addView(chip);return x;
    }
    View nav(){LinearLayout n=new LinearLayout(this);n.setPadding(dp(8),dp(8),dp(8),dp(10));n.setBackgroundColor(PANEL);for(String name:new String[]{"HOME","SCAN","APPS","INCIDENT"}){Button b=navBtn(name);b.setOnClickListener(v->{if(!unlocked){locked();return;}if(name.equals("HOME"))home();else if(name.equals("SCAN"))scan();else if(name.equals("APPS"))apps();else incident();});n.addView(b,new LinearLayout.LayoutParams(0,dp(52),1));}return n;}

    void locked(){unlocked=false;clear();state("LOCKED",WARN);hero("Guardian is locked","Authenticate with your device security before opening app review or encrypted incident records.");action("Device authentication","Uses Android's trusted lock-screen authentication flow, which can include fingerprint, face, PIN, pattern, or password depending on device setup.","UNLOCK GUARDIAN",v->authenticate());info("ENCRYPTED LOCAL STATE","Scan history and incident findings are protected with Android Keystore.",ACCENT);info("NO CLOUD TELEMETRY","Guardian v2 declares no Internet permission.",BLUE);}
    void authenticate(){try{KeyguardManager km=(KeyguardManager)getSystemService(KEYGUARD_SERVICE);if(km==null||!km.isDeviceSecure()){unlocked=true;home();return;}Intent i=km.createConfirmDeviceCredentialIntent("Unlock NEO Guardian","Authenticate to access the defense console.");if(i!=null)startActivityForResult(i,AUTH);else{unlocked=true;home();}}catch(Throwable t){unlocked=true;home();}}
    @Override protected void onActivityResult(int req,int res,Intent data){super.onActivityResult(req,res,data);if(req==AUTH){if(res==RESULT_OK){unlocked=true;home();}else locked();}}

    void home(){unlocked=true;clear();state("READY",ACCENT);hero("NEO Guardian v2","Local-first Android defense for posture checks, app inspection, encrypted findings, and rapid incident containment.");section("Command center");action("Run full security scan","Checks lock screen, debugging, encryption, patch level, root indicators, accessibility, network/DNS and app-risk signals.","SCAN DEVICE",v->scan());action("Inspect installed apps","Ranks visible apps by high-impact permissions and opens Android app controls.","OPEN APP REVIEW",v->apps());action("Incident console","Review encrypted findings and open containment controls.","OPEN INCIDENT",v->incident());action("Self diagnostics","Verify Guardian version, Android Keystore, device authentication, OS and patch state.","RUN DIAGNOSTICS",v->diagnostics());section("Operating doctrine");info("LOCAL-FIRST","No Internet permission is declared; Guardian does not upload scan results.",ACCENT);info("SIGNALS, NOT VERDICTS","A flagged permission or configuration is a review signal, not proof of malware or attribution.",WARN);}

    void diagnostics(){clear();state("DIAGNOSTICS",BLUE);hero("Guardian self diagnostics","Checks the app itself before you rely on its device scan.");String ver="2.0.0";try{ver=getPackageManager().getPackageInfo(getPackageName(),0).versionName;}catch(Exception ignored){}info("APP VERSION",ver,ACCENT);info("ANDROID",Build.VERSION.RELEASE+" • API "+Build.VERSION.SDK_INT,BLUE);info("DEVICE",Build.MANUFACTURER+" "+Build.MODEL,MUTED);info("SECURITY PATCH",TextUtils.isEmpty(Build.VERSION.SECURITY_PATCH)?"Unknown":Build.VERSION.SECURITY_PATCH,TextUtils.isEmpty(Build.VERSION.SECURITY_PATCH)?WARN:ACCENT);try{ensureKey();info("ENCRYPTED STORAGE","Android Keystore key available",ACCENT);}catch(Throwable t){info("ENCRYPTED STORAGE","Keystore unavailable: "+t.getClass().getSimpleName(),DANGER);}try{KeyguardManager km=(KeyguardManager)getSystemService(KEYGUARD_SERVICE);boolean ok=km!=null&&km.isDeviceSecure();info("DEVICE AUTHENTICATION",ok?"Secure lock configured":"No secure lock configured",ok?ACCENT:WARN);}catch(Throwable t){info("DEVICE AUTHENTICATION","Could not verify",WARN);}action("Android security settings","Review lock screen, credentials and security controls.","OPEN SETTINGS",v->open(Settings.ACTION_SECURITY_SETTINGS));}

    void scan(){clear();risk=0;checks=0;state("SCANNING",WARN);hero("Security scan","Every check is isolated so one blocked Android API cannot crash the whole app.");List<String>alerts=new ArrayList<>();
        check("Secure screen lock",()->{KeyguardManager km=(KeyguardManager)getSystemService(KEYGUARD_SERVICE);boolean ok=km!=null&&km.isDeviceSecure();finding("Secure screen lock",ok?"Enabled":"Not enabled",ok,ok?0:20,alerts);});
        check("USB debugging",()->{boolean on=Settings.Global.getInt(getContentResolver(),Settings.Global.ADB_ENABLED,0)==1;finding("USB debugging",on?"Enabled — disable when not developing":"Disabled",!on,on?10:0,alerts);});
        check("Developer options",()->{boolean on=Settings.Global.getInt(getContentResolver(),Settings.Global.DEVELOPMENT_SETTINGS_ENABLED,0)==1;finding("Developer options",on?"Enabled":"Disabled",!on,on?5:0,alerts);});
        check("Encryption",()->{DevicePolicyManager d=(DevicePolicyManager)getSystemService(DEVICE_POLICY_SERVICE);int s=d==null?0:d.getStorageEncryptionStatus();boolean ok=s==DevicePolicyManager.ENCRYPTION_STATUS_ACTIVE||s==DevicePolicyManager.ENCRYPTION_STATUS_ACTIVE_DEFAULT_KEY||s==DevicePolicyManager.ENCRYPTION_STATUS_ACTIVE_PER_USER;finding("Storage encryption",ok?"Active":"Could not confirm active encryption",ok,ok?0:12,alerts);});
        check("Patch",()->{String p=Build.VERSION.SECURITY_PATCH;boolean ok=!TextUtils.isEmpty(p);finding("Android security patch",ok?p:"Unknown",ok,ok?0:5,alerts);});
        check("Root",()->{String[] paths={"/system/bin/su","/system/xbin/su","/sbin/su","/vendor/bin/su","/system/app/Superuser.apk"};List<String>f=new ArrayList<>();for(String p:paths)if(new File(p).exists())f.add(p);boolean ok=f.isEmpty();finding("Root indicators",ok?"No common root artifacts detected":TextUtils.join(", ",f),ok,ok?0:20,alerts);});
        check("Accessibility",()->{boolean e=Settings.Secure.getInt(getContentResolver(),Settings.Secure.ACCESSIBILITY_ENABLED,0)==1;String s=Settings.Secure.getString(getContentResolver(),Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES);int n=(!e||TextUtils.isEmpty(s))?0:s.split(":").length;finding("Accessibility services",n==0?"None enabled":n+" enabled — verify each service",n==0,n==0?0:Math.min(12,n*4),alerts);});
        check("Network",()->{ConnectivityManager cm=(ConnectivityManager)getSystemService(CONNECTIVITY_SERVICE);android.net.Network n=cm==null?null:cm.getActiveNetwork();NetworkCapabilities c=n==null||cm==null?null:cm.getNetworkCapabilities(n);if(c==null){finding("Network posture","No active network",true,0,alerts);return;}boolean vpn=c.hasTransport(NetworkCapabilities.TRANSPORT_VPN);String type=c.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)?"Wi‑Fi":c.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)?"Cellular":"Other";finding("Network / VPN",type+(vpn?" • VPN active":" • no VPN detected"),true,0,alerts);});
        check("DNS",()->{String m=Settings.Global.getString(getContentResolver(),"private_dns_mode");boolean ok="hostname".equals(m)||"opportunistic".equals(m);finding("Private DNS","Mode: "+(m==null?"unknown":m),ok,ok?0:4,alerts);});
        check("Apps",()->audit(alerts,false));int score=Math.max(0,100-Math.min(100,risk));String grade=score>=90?"A":score>=80?"B":score>=70?"C":score>=60?"D":"F";content.addView(scoreCard(score,grade));saveHistory(score,grade);saveAlerts(alerts);state("COMPLETE",score>=80?ACCENT:WARN);}

    void apps(){clear();state("APP REVIEW",BLUE);hero("Installed app review","Apps are ranked by requested high-impact permissions and debuggable status. High score means review it; not automatically malicious.");audit(new ArrayList<>(),true);}
    void audit(List<String>alerts,boolean detailed){PackageManager pm=getPackageManager();List<PackageInfo>pkgs=pm.getInstalledPackages(PackageManager.GET_PERMISSIONS);List<AppRisk>list=new ArrayList<>();for(PackageInfo p:pkgs){if(p.packageName.equals(getPackageName()))continue;int count=0;if(p.requestedPermissions!=null)for(String perm:p.requestedPermissions)if(RISK_PERMS.contains(perm))count++;ApplicationInfo ai=p.applicationInfo;boolean dbg=ai!=null&&(ai.flags&ApplicationInfo.FLAG_DEBUGGABLE)!=0;boolean sys=ai!=null&&(ai.flags&ApplicationInfo.FLAG_SYSTEM)!=0;if(count>0||dbg){String label=p.packageName;try{label=String.valueOf(pm.getApplicationLabel(ai));}catch(Exception ignored){}list.add(new AppRisk(label,p.packageName,count,dbg,sys));}}Collections.sort(list,Comparator.comparingInt((AppRisk a)->a.score()).reversed().thenComparing(a->a.label.toLowerCase()));int flagged=0;for(AppRisk a:list)if(a.score()>=6)flagged++;if(!detailed){boolean ok=flagged==0;finding("App risk review",ok?"No apps crossed the review threshold":flagged+" app(s) deserve manual review",ok,ok?0:Math.min(15,flagged*2),alerts);return;}info("VISIBLE APPS REVIEWED",String.valueOf(pkgs.size()),BLUE);info("HIGH-REVIEW APPS",String.valueOf(flagged),flagged==0?ACCENT:WARN);int shown=0;for(AppRisk a:list){if(shown>=24)break;if(a.score()<2&&shown>=10)break;appCard(a);shown++;}if(list.isEmpty())info("NO REVIEW SIGNALS","No visible apps requested Guardian's selected high-impact permissions.",ACCENT);}
    void appCard(AppRisk a){LinearLayout c=panel(PANEL);int color=a.score()>=8?DANGER:a.score()>=5?WARN:BLUE;c.addView(txt(a.label,16,true,TEXT));c.addView(txt(a.pkg,11,false,MUTED));TextView s=txt("Review score "+a.score()+" • "+a.perms+" high-impact permission(s)"+(a.debug?" • debuggable":"")+(a.system?" • system":""),13,true,color);s.setPadding(0,dp(7),0,dp(10));c.addView(s);Button b=primary("OPEN APP DETAILS");b.setOnClickListener(v->appDetails(a.pkg));c.addView(b);content.addView(c);}

    void incident(){clear();state("INCIDENT",WARN);hero("Incident response console","Contain first, preserve useful evidence, then recover. Guardian does not attribute an attacker.");String raw=readEncrypted(ALERTS);if(TextUtils.isEmpty(raw))info("NO SAVED FINDINGS","Run a security scan to populate the encrypted incident queue.",ACCENT);else for(String line:raw.split("\n"))if(!TextUtils.isEmpty(line))info("REVIEW",line,WARN);section("Containment controls");setting("Network & Internet","Disconnect suspicious networks or review connectivity.",Settings.ACTION_WIRELESS_SETTINGS);setting("Accessibility services","Disable services you do not recognize or need.",Settings.ACTION_ACCESSIBILITY_SETTINGS);setting("VPN","Inspect active and saved VPN profiles.",Settings.ACTION_VPN_SETTINGS);setting("Apps","Review or remove suspicious applications.",Settings.ACTION_APPLICATION_SETTINGS);setting("Security","Review lock screen, credentials and device security.",Settings.ACTION_SECURITY_SETTINGS);section("Response sequence");detail("1. Isolate: leave untrusted Wi‑Fi and stop unknown remote-access tools.");detail("2. Preserve: capture screenshots, timestamps, app names and suspicious notifications.");detail("3. Review: accessibility, VPN, sideloading, developer options and recent installs.");detail("4. Recover: update Android, rotate critical credentials from a trusted device, and remove confirmed unwanted apps.");detail("5. Escalate: preserve evidence when financial theft, stalking, extortion, or account takeover is credible.");Button b=primary("CLEAR ENCRYPTED FINDINGS");b.setOnClickListener(v->{writeEncrypted(ALERTS,"");incident();});content.addView(b);}

    void check(String name,Runnable r){checks++;try{r.run();}catch(Throwable t){info("CHECK LIMITED: "+name,"Android blocked this check; Guardian continued safely.",BLUE);}}
    void finding(String title,String body,boolean good,int penalty,List<String>alerts){risk+=penalty;if(!good)alerts.add(title+": "+body);info((good?"✓ ":"⚠ ")+title,body,good?ACCENT:WARN);}
    void saveHistory(int score,String grade){String old=readEncrypted(HISTORY);String row=System.currentTimeMillis()+","+score+","+grade;writeEncrypted(HISTORY,row+(TextUtils.isEmpty(old)?"":"\n"+old));}
    void saveAlerts(List<String>a){StringBuilder b=new StringBuilder();for(int i=0;i<Math.min(20,a.size());i++){if(i>0)b.append('\n');b.append(a.get(i));}writeEncrypted(ALERTS,b.toString());}

    void ensureKey() throws Exception{KeyStore ks=KeyStore.getInstance("AndroidKeyStore");ks.load(null);if(ks.containsAlias(KEY))return;KeyGenerator kg=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");KeyGenParameterSpec spec=new KeyGenParameterSpec.Builder(KEY,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build();kg.init(spec);kg.generateKey();}
    SecretKey key() throws Exception{ensureKey();KeyStore ks=KeyStore.getInstance("AndroidKeyStore");ks.load(null);return((KeyStore.SecretKeyEntry)ks.getEntry(KEY,null)).getSecretKey();}
    void writeEncrypted(String k,String plain){try{Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.ENCRYPT_MODE,key());String v=Base64.encodeToString(c.getIV(),Base64.NO_WRAP)+":"+Base64.encodeToString(c.doFinal(plain.getBytes("UTF-8")),Base64.NO_WRAP);getSharedPreferences(PREFS,MODE_PRIVATE).edit().putString(k,v).apply();}catch(Throwable t){getSharedPreferences(PREFS,MODE_PRIVATE).edit().remove(k).apply();}}
    String readEncrypted(String k){String v=getSharedPreferences(PREFS,MODE_PRIVATE).getString(k,"");if(TextUtils.isEmpty(v)||!v.contains(":"))return"";try{String[]p=v.split(":",2);Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.DECRYPT_MODE,key(),new GCMParameterSpec(128,Base64.decode(p[0],Base64.NO_WRAP)));return new String(c.doFinal(Base64.decode(p[1],Base64.NO_WRAP)),"UTF-8");}catch(Throwable t){return"";}}

    void appDetails(String pkg){try{startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,Uri.parse("package:"+pkg)));}catch(Throwable t){open(Settings.ACTION_APPLICATION_SETTINGS);}}
    void setting(String title,String body,String action){action(title,body,"OPEN",v->open(action));}
    void open(String action){try{startActivity(new Intent(action));}catch(Throwable t){try{startActivity(new Intent(Settings.ACTION_SETTINGS));}catch(Throwable ignored){}}}
    void clear(){content.removeAllViews();}
    void state(String s,int color){chip.setText(s);chip.setTextColor(color);}
    void hero(String title,String body){LinearLayout c=panel(PANEL2);c.addView(txt(title,22,true,TEXT));TextView b=txt(body,14,false,MUTED);b.setPadding(0,dp(8),0,0);c.addView(b);content.addView(c);}
    void section(String s){TextView t=txt(s,14,true,MUTED);t.setPadding(dp(2),dp(22),0,dp(6));content.addView(t);}
    void action(String title,String body,String cta,View.OnClickListener l){LinearLayout c=panel(PANEL);c.addView(txt(title,17,true,TEXT));TextView d=txt(body,13,false,MUTED);d.setPadding(0,dp(5),0,dp(10));c.addView(d);Button b=primary(cta);b.setOnClickListener(l);c.addView(b);content.addView(c);}
    void info(String title,String body,int color){LinearLayout c=panel(PANEL);c.addView(txt(title,14,true,color));TextView b=txt(body,13,false,MUTED);b.setPadding(0,dp(5),0,0);c.addView(b);content.addView(c);}
    View scoreCard(int score,String grade){LinearLayout c=panel(Color.rgb(18,38,35));c.addView(txt("Security score",13,true,MUTED));c.addView(txt(score+" / 100",34,true,score>=80?ACCENT:WARN));c.addView(txt("Grade "+grade+" • "+checks+" checks completed",13,false,MUTED));return c;}
    void detail(String s){TextView t=txt(s,13,false,MUTED);t.setPadding(dp(6),dp(7),dp(4),dp(2));content.addView(t);}
    LinearLayout panel(int color){LinearLayout x=new LinearLayout(this);x.setOrientation(LinearLayout.VERTICAL);x.setPadding(dp(16),dp(15),dp(16),dp(15));LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-1,-2);p.setMargins(0,dp(8),0,0);x.setLayoutParams(p);x.setBackground(round(color,18));return x;}
    GradientDrawable round(int color,int radius){GradientDrawable g=new GradientDrawable();g.setColor(color);g.setCornerRadius(dp(radius));return g;}
    TextView txt(String s,int size,boolean bold,int color){TextView t=new TextView(this);t.setText(s);t.setTextSize(size);t.setTextColor(color);if(bold)t.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);return t;}
    Button primary(String s){Button b=new Button(this);b.setText(s);b.setTextColor(Color.rgb(5,20,15));b.setTextSize(12);b.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);b.setBackground(round(ACCENT,14));return b;}
    Button navBtn(String s){Button b=new Button(this);b.setText(s);b.setTextSize(10);b.setTextColor(MUTED);b.setBackgroundColor(Color.TRANSPARENT);return b;}
    int dp(int v){return Math.round(v*getResources().getDisplayMetrics().density);}
    View fallback(Throwable t){LinearLayout x=new LinearLayout(this);x.setOrientation(LinearLayout.VERTICAL);x.setPadding(dp(24),dp(48),dp(24),dp(24));x.setBackgroundColor(BG);x.addView(txt("NEO Guardian Safe Mode",24,true,TEXT));x.addView(txt("Guardian caught a startup error instead of closing. Reinstall the latest build if needed.\n\n"+t.getClass().getSimpleName(),14,false,MUTED));return x;}
    static class AppRisk{final String label,pkg;final int perms;final boolean debug,system;AppRisk(String l,String p,int n,boolean d,boolean s){label=l;pkg=p;perms=n;debug=d;system=s;}int score(){return perms+(debug?4:0)+(system?0:1);}}
}
