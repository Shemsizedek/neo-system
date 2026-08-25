package org.neosystem.guardian;

import android.app.Activity;
import android.app.KeyguardManager;
import android.app.admin.DevicePolicyManager;
import android.content.Intent;
import android.content.SharedPreferences;
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
import java.text.DateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

public class MainActivity extends Activity {
    private static final String PREFS="neo_guardian";
    private static final String HISTORY="history_v2";
    private static final String ALERTS="alerts_v2";
    private static final String KEY_ALIAS="neo_guardian_local_v2";
    private static final int AUTH_REQUEST=144;
    private static final int BG=Color.rgb(7,10,16), PANEL=Color.rgb(16,22,32), PANEL2=Color.rgb(22,30,43), TEXT=Color.rgb(242,246,250), MUTED=Color.rgb(155,169,187), ACCENT=Color.rgb(75,220,170), WARN=Color.rgb(255,184,77), DANGER=Color.rgb(255,105,105), BLUE=Color.rgb(105,169,255);
    private LinearLayout content;
    private TextView statusChip;
    private int risk, checks;
    private boolean authenticated=false;

    private static final Set<String> RISK_PERMS=new HashSet<>(Arrays.asList(
            "android.permission.READ_SMS","android.permission.SEND_SMS","android.permission.RECEIVE_SMS",
            "android.permission.READ_CALL_LOG","android.permission.WRITE_CALL_LOG","android.permission.RECORD_AUDIO",
            "android.permission.CAMERA","android.permission.ACCESS_FINE_LOCATION","android.permission.ACCESS_COARSE_LOCATION",
            "android.permission.READ_CONTACTS","android.permission.WRITE_CONTACTS","android.permission.REQUEST_INSTALL_PACKAGES",
            "android.permission.SYSTEM_ALERT_WINDOW","android.permission.READ_PHONE_STATE"
    ));

    @Override protected void onCreate(Bundle state){
        super.onCreate(state);
        try{setContentView(buildShell()); showLockGate();}
        catch(Throwable t){setContentView(fallback(t));}
    }

    private View buildShell(){
        LinearLayout root=new LinearLayout(this); root.setOrientation(LinearLayout.VERTICAL); root.setBackgroundColor(BG);
        root.addView(buildHeader());
        ScrollView scroll=new ScrollView(this); content=new LinearLayout(this); content.setOrientation(LinearLayout.VERTICAL); content.setPadding(dp(18),dp(16),dp(18),dp(28)); scroll.addView(content);
        root.addView(scroll,new LinearLayout.LayoutParams(-1,0,1)); root.addView(buildNav()); return root;
    }

    private View buildHeader(){
        LinearLayout wrap=new LinearLayout(this); wrap.setGravity(Gravity.CENTER_VERTICAL); wrap.setPadding(dp(18),dp(18),dp(18),dp(14)); wrap.setBackgroundColor(PANEL);
        ImageView logo=new ImageView(this); logo.setImageResource(R.drawable.neo_guardian_logo); wrap.addView(logo,new LinearLayout.LayoutParams(dp(54),dp(54)));
        LinearLayout titleWrap=new LinearLayout(this); titleWrap.setOrientation(LinearLayout.VERTICAL); titleWrap.setPadding(dp(12),0,0,0);
        TextView title=txt("NEO Guardian",24,true,TEXT); TextView sub=txt("Defense & Incident Console • v2.0",12,false,MUTED); titleWrap.addView(title); titleWrap.addView(sub); wrap.addView(titleWrap,new LinearLayout.LayoutParams(0,-2,1));
        statusChip=txt("LOCKED",11,true,WARN); statusChip.setGravity(Gravity.CENTER); statusChip.setPadding(dp(10),dp(7),dp(10),dp(7)); statusChip.setBackground(round(Color.rgb(52,42,20),18)); wrap.addView(statusChip); return wrap;
    }

    private View buildNav(){
        LinearLayout nav=new LinearLayout(this); nav.setPadding(dp(8),dp(8),dp(8),dp(10)); nav.setBackgroundColor(PANEL); String[] names={"HOME","SCAN","APPS","INCIDENT"};
        for(String n:names){Button b=navButton(n); b.setOnClickListener(v->{if(!authenticated){showLockGate();return;} if(n.equals("HOME"))showOverview(); else if(n.equals("SCAN"))runScan(); else if(n.equals("APPS"))showApps(); else showIncident();}); nav.addView(b,new LinearLayout.LayoutParams(0,dp(52),1));} return nav;
    }

    private void showLockGate(){
        content.removeAllViews(); authenticated=false; statusChip.setText("LOCKED"); statusChip.setTextColor(WARN);
        hero("Guardian is locked","Authenticate with your device security before opening local scan history, app review, or incident records.");
        actionCard("Device authentication","Uses the phone's trusted lock-screen authentication flow. Depending on device configuration, this can include fingerprint, face, PIN, pattern, or password.","UNLOCK GUARDIAN",v->requestAuthentication());
        sectionTitle("Privacy boundary");
        infoCard("ENCRYPTED LOCAL STATE","Guardian v2 protects scan history and incident findings with a key generated inside Android Keystore.",ACCENT);
        infoCard("NO CLOUD TELEMETRY","This build still declares no Internet permission. Scan data stays on the device.",BLUE);
    }

    private void requestAuthentication(){
        try{
            KeyguardManager km=(KeyguardManager)getSystemService(KEYGUARD_SERVICE);
            if(km==null||!km.isDeviceSecure()){authenticated=true; showOverview(); return;}
            Intent i=km.createConfirmDeviceCredentialIntent("Unlock NEO Guardian","Authenticate to access your local defense console.");
            if(i!=null) startActivityForResult(i,AUTH_REQUEST); else {authenticated=true;showOverview();}
        }catch(Throwable t){authenticated=true;showOverview();}
    }

    @Override protected void onActivityResult(int requestCode,int resultCode,Intent data){
        super.onActivityResult(requestCode,resultCode,data);
        if(requestCode==AUTH_REQUEST){if(resultCode==RESULT_OK){authenticated=true;showOverview();}else showLockGate();}
    }

    private void showOverview(){
        content.removeAllViews(); authenticated=true; statusChip.setText("READY"); statusChip.setTextColor(ACCENT);
        hero("NEO Guardian v2","A local-first Android defense console for posture checks, app review, encrypted incident notes, and rapid access to trusted system controls.");
        sectionTitle("Command center");
        actionCard("Run full security scan","Audit lock screen, debugging, encryption, root indicators, accessibility, VPN/DNS, patch posture and app-risk signals.","SCAN DEVICE",v->runScan());
        actionCard("Inspect installed apps","Rank apps by high-impact permissions and jump directly into Android's app-detail controls.","OPEN APP REVIEW",v->showApps());
        actionCard("Incident console","Review encrypted findings and open the fastest containment controls when compromise is suspected.","OPEN INCIDENT",v->showIncident());
        actionCard("Self diagnostics","Confirm Guardian version, Keystore encryption, device security, Android build and patch state.","RUN DIAGNOSTICS",v->showDiagnostics());
        sectionTitle("Operating doctrine");
        infoCard("LOCAL-FIRST","No Internet permission is declared. Guardian does not upload scan results in this build.",ACCENT);
        infoCard("REVIEW SIGNALS, NOT VERDICTS","Permission counts and configuration flags are indicators for human review, not proof of malware, spying, or attribution.",WARN);
    }

    private void showDiagnostics(){
        content.removeAllViews(); statusChip.setText("DIAGNOSTICS"); statusChip.setTextColor(BLUE);
        hero("Guardian self diagnostics","Checks the app itself before you rely on the device scan.");
        String version="2.0.0"; try{version=getPackageManager().getPackageInfo(getPackageName(),0).versionName;}catch(Exception ignored){}
        infoCard("APP VERSION",version,ACCENT);
        infoCard("ANDROID",Build.VERSION.RELEASE+" • API "+Build.VERSION.SDK_INT,BLUE);
        infoCard("DEVICE",Build.MANUFACTURER+" "+Build.MODEL,MUTED);
        infoCard("SECURITY PATCH",TextUtils.isEmpty(Build.VERSION.SECURITY_PATCH)?"Unknown":Build.VERSION.SECURITY_PATCH,TextUtils.isEmpty(Build.VERSION.SECURITY_PATCH)?WARN:ACCENT);
        try{ensureKey(); infoCard("ENCRYPTED STORAGE","Android Keystore key available",ACCENT);}catch(Throwable t){infoCard("ENCRYPTED STORAGE","Keystore unavailable: "+t.getClass().getSimpleName(),DANGER);}
        try{KeyguardManager km=(KeyguardManager)getSystemService(KEYGUARD_SERVICE); boolean ok=km!=null&&km.isDeviceSecure(); infoCard("DEVICE AUTHENTICATION",ok?"Secure lock configured":"No secure lock configured",ok?ACCENT:WARN);}catch(Throwable t){infoCard("DEVICE AUTHENTICATION","Could not verify",WARN);}
        actionCard("Android security settings","Open the system security panel to review lock screen, credentials and security controls.","OPEN SETTINGS",v->safeStart(Settings.ACTION_SECURITY_SETTINGS));
    }

    private void runScan(){
        content.removeAllViews(); risk=0; checks=0; statusChip.setText("SCANNING"); statusChip.setTextColor(WARN);
        hero("Security scan","Every check is isolated. If Android blocks a probe, Guardian reports the limitation and continues instead of crashing.");
        List<String> currentAlerts=new ArrayList<>();
        safeCheck("Secure screen lock",()->{KeyguardManager km=(KeyguardManager)getSystemService(KEYGUARD_SERVICE); boolean ok=km!=null&&km.isDeviceSecure(); finding("Secure screen lock",ok?"Enabled":"Not enabled",ok,ok?0:20,currentAlerts);});
        safeCheck("USB debugging",()->{boolean on=Settings.Global.getInt(getContentResolver(),Settings.Global.ADB_ENABLED,0)==1; finding("USB debugging (ADB)",on?"Enabled — disable when not actively developing":"Disabled",!on,on?10:0,currentAlerts);});
        safeCheck("Developer options",()->{boolean on=Settings.Global.getInt(getContentResolver(),Settings.Global.DEVELOPMENT_SETTINGS_ENABLED,0)==1; finding("Developer options",on?"Enabled":"Disabled",!on,on?5:0,currentAlerts);});
        safeCheck("Encryption",()->{DevicePolicyManager d=(DevicePolicyManager)getSystemService(DEVICE_POLICY_SERVICE); int s=d==null?0:d.getStorageEncryptionStatus(); boolean ok=s==DevicePolicyManager.ENCRYPTION_STATUS_ACTIVE||s==DevicePolicyManager.ENCRYPTION_STATUS_ACTIVE_DEFAULT_KEY||s==DevicePolicyManager.ENCRYPTION_STATUS_ACTIVE_PER_USER; finding("Storage encryption",ok?"Active":"Could not confirm active encryption",ok,ok?0:12,currentAlerts);});
        safeCheck("Security patch",()->{String p=Build.VERSION.SECURITY_PATCH; boolean ok=!TextUtils.isEmpty(p); finding("Android security patch",ok?"Installed patch: "+p:"Unknown",ok,ok?0:5,currentAlerts);});
        safeCheck("Root indicators",()->{String[] paths={"/system/bin/su","/system/xbin/su","/sbin/su","/vendor/bin/su","/system/app/Superuser.apk"}; List<String> f=new ArrayList<>(); for(String p:paths)if(new File(p).exists())f.add(p); boolean ok=f.isEmpty(); finding("Root indicators",ok?"No common root artifacts detected":"Review: "+TextUtils.join(", ",f),ok,ok?0:20,currentAlerts);});
        safeCheck("Accessibility",()->{boolean e=Settings.Secure.getInt(getContentResolver(),Settings.Secure.ACCESSIBILITY_ENABLED,0)==1; String s=Settings.Secure.getString(getContentResolver(),Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES); int n=(!e||TextUtils.isEmpty(s))?0:s.split(":").length; finding("Accessibility services",n==0?"None enabled":n+" enabled service(s) — verify every service",n==0,n==0?0:Math.min(12,n*4),currentAlerts);});
        safeCheck("Network",()->{ConnectivityManager cm=(ConnectivityManager)getSystemService(CONNECTIVITY_SERVICE); android.net.Network n=cm==null?null:cm.getActiveNetwork(); NetworkCapabilities c=n==null||cm==null?null:cm.getNetworkCapabilities(n); if(c==null){finding("Network posture","No active network detected",true,0,currentAlerts);return;} boolean vpn=c.hasTransport(NetworkCapabilities.TRANSPORT_VPN); String type=c.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)?"Wi‑Fi":c.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)?"Cellular":"Other"; finding("Network / VPN",type+(vpn?" • VPN active":" • no VPN detected"),true,0,currentAlerts);});
        safeCheck("Private DNS",()->{String m=Settings.Global.getString(getContentResolver(),"private_dns_mode"); boolean ok="hostname".equals(m)||"opportunistic".equals(m); finding("Private DNS","Mode: "+(m==null?"unknown":m),ok,ok?0:4,currentAlerts);});
        safeCheck("Installed apps",()->auditApps(currentAlerts,false));
        int score=Math.max(0,100-Math.min(100,risk)); String grade=score>=90?"A":score>=80?"B":score>=70?"C":score>=60?"D":"F";
        content.addView(scoreCard(score,grade)); saveHistory(score,grade); saveAlerts(currentAlerts); statusChip.setText("COMPLETE"); statusChip.setTextColor(score>=80?ACCENT:WARN);
    }

    private void showApps(){
        content.removeAllViews(); statusChip.setText("APP REVIEW"); statusChip.setTextColor(BLUE);
        hero("Installed app review","Guardian ranks visible installed apps by requested high-impact permissions. A high score means review the app; it does not automatically mean the app is malicious.");
        auditApps(new ArrayList<>(),true);
    }

    private void auditApps(List<String> currentAlerts,boolean detailed){
        PackageManager pm=getPackageManager(); List<PackageInfo> pkgs=pm.getInstalledPackages(PackageManager.GET_PERMISSIONS); List<AppRisk> apps=new ArrayList<>();
        for(PackageInfo pi:pkgs){
            if(pi.packageName.equals(getPackageName()))continue; int count=0;
            if(pi.requestedPermissions!=null)for(String p:pi.requestedPermissions)if(RISK_PERMS.contains(p))count++;
            ApplicationInfo ai=pi.applicationInfo; boolean dbg=ai!=null&&(ai.flags&ApplicationInfo.FLAG_DEBUGGABLE)!=0;
            boolean system=ai!=null&&(ai.flags&ApplicationInfo.FLAG_SYSTEM)!=0;
            if(count>0||dbg){String label=pi.packageName; try{label=String.valueOf(pm.getApplicationLabel(ai));}catch(Exception ignored){} apps.add(new AppRisk(label,pi.packageName,count,dbg,system));}
        }
        Collections.sort(apps,Comparator.comparingInt((AppRisk a)->a.score()).reversed().thenComparing(a->a.label.toLowerCase()));
        int flagged=0; for(AppRisk a:apps)if(a.score()>=6)flagged++;
        if(!detailed){boolean ok=flagged==0; finding("App risk review",ok?"No apps crossed Guardian's review threshold":flagged+" app(s) deserve manual review",ok,ok?0:Math.min(15,flagged*2),currentAlerts); return;}
        infoCard("VISIBLE APPS REVIEWED",String.valueOf(pkgs.size()),BLUE);
        infoCard("HIGH-REVIEW APPS",String.valueOf(flagged),flagged==0?ACCENT:WARN);
        int shown=0; for(AppRisk a:apps){if(shown>=24)break; if(a.score()<2&&shown>=10)break; appCard(a); shown++;}
        if(apps.isEmpty())infoCard("NO REVIEW SIGNALS","Android did not expose any apps with Guardian's selected high-impact permissions.",ACCENT);
    }

    private void appCard(AppRisk a){
        LinearLayout card=panel(PANEL); int color=a.score()>=8?DANGER:a.score()>=5?WARN:BLUE;
        TextView name=txt(a.label,16,true,TEXT); TextView pkg=txt(a.packageName,11,false,MUTED); TextView score=txt("Review score "+a.score()+" • "+a.perms+" high-impact permission(s)"+(a.debuggable?" • debuggable":"")+(a.system?" • system":""),13,true,color);
        score.setPadding(0,dp(7),0,dp(10)); Button open=primary("OPEN APP DETAILS"); open.setOnClickListener(v->openAppDetails(a.packageName));
        card.addView(name);card.addView(pkg);card.addView(score);card.addView(open);content.addView(card);
    }

    private void showIncident(){
        content.removeAllViews(); statusChip.setText("INCIDENT"); statusChip.setTextColor(WARN);
        hero("Incident response console","Contain first, preserve useful evidence, then recover. Guardian records only local defensive findings; it does not attribute an attacker.");
        String raw=readEncrypted(ALERTS); if(TextUtils.isEmpty(raw)){infoCard("NO SAVED FINDINGS","Run a security scan to populate the encrypted incident queue.",ACCENT);}else{
            for(String line:raw.split("\n")){if(!TextUtils.isEmpty(line))infoCard("REVIEW",line,WARN);}
        }
        sectionTitle("Containment controls");
        settingCard("Network & Internet","Disconnect suspicious networks or review connectivity.",Settings.ACTION_WIRELESS_SETTINGS);
        settingCard("Accessibility services","Disable any accessibility service you do not recognize or no longer need.",Settings.ACTION_ACCESSIBILITY_SETTINGS);
        settingCard("VPN","Inspect active and saved VPN profiles.",Settings.ACTION_VPN_SETTINGS);
        settingCard("Apps","Review or remove suspicious applications.",Settings.ACTION_APPLICATION_SETTINGS);
        settingCard("Security","Review lock screen, credentials, biometrics and other device security controls.",Settings.ACTION_SECURITY_SETTINGS);
        sectionTitle("Response sequence");
        detail("1. Isolate: leave untrusted Wi‑Fi, disable radios you do not need, and stop unknown remote-access tools.");
        detail("2. Preserve: capture screenshots, timestamps, app names and suspicious notifications before deleting anything important.");
        detail("3. Review: accessibility, VPN, device-admin, sideloading, developer options and recently installed apps.");
        detail("4. Recover: update Android, rotate critical credentials from a trusted device, and remove confirmed unwanted apps.");
        detail("5. Escalate: if financial theft, stalking, extortion, or account takeover is credible, preserve evidence and contact the appropriate service provider or authorities.");
        Button clear=primary("CLEAR ENCRYPTED FINDINGS"); clear.setOnClickListener(v->{writeEncrypted(ALERTS,"");showIncident();}); content.addView(clear);
    }

    private void saveHistory(int score,String grade){
        String old=readEncrypted(HISTORY); String row=System.currentTimeMillis()+","+score+","+grade; String all=row+(TextUtils.isEmpty(old)?"":"\n"+old); String[] rows=all.split("\n"); StringBuilder b=new StringBuilder(); for(int i=0;i<Math.min(12,rows.length);i++){if(i>0)b.append('\n');b.append(rows[i]);} writeEncrypted(HISTORY,b.toString());
    }

    private void saveAlerts(List<String> alerts){StringBuilder b=new StringBuilder();for(int i=0;i<Math.min(20,alerts.size());i++){if(i>0)b.append('\n');b.append(alerts.get(i));}writeEncrypted(ALERTS,b.toString());}

    private void finding(String title,String body,boolean good,int penalty,List<String> alerts){risk+=penalty;if(!good)alerts.add(title+": "+body);LinearLayout card=panel(PANEL);TextView a=txt((good?"✓ ":"⚠ ")+title,15,true,good?ACCENT:WARN);TextView b=txt(body,13,false,MUTED);b.setPadding(0,dp(5),0,0);card.addView(a);card.addView(b);content.addView(card);}
    private void safeCheck(String name,Runnable r){checks++; try{r.run();}catch(Throwable t){LinearLayout card=panel(PANEL);TextView a=txt("• "+name,15,true,BLUE);TextView b=txt("Android blocked this check on this device; Guardian continued safely.",13,false,MUTED);b.setPadding(0,dp(5),0,0);card.addView(a);card.addView(b);content.addView(card);}}

    private void ensureKey() throws Exception{
        KeyStore ks=KeyStore.getInstance("AndroidKeyStore"); ks.load(null); if(ks.containsAlias(KEY_ALIAS))return;
        KeyGenerator kg=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");
        KeyGenParameterSpec spec=new KeyGenParameterSpec.Builder(KEY_ALIAS,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build();
        kg.init(spec);kg.generateKey();
    }

    private SecretKey getKey() throws Exception{ensureKey();KeyStore ks=KeyStore.getInstance("AndroidKeyStore");ks.load(null);return ((KeyStore.SecretKeyEntry)ks.getEntry(KEY_ALIAS,null)).getSecretKey();}

    private void writeEncrypted(String key,String plain){
        try{Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.ENCRYPT_MODE,getKey());byte[] iv=c.getIV();byte[] enc=c.doFinal(plain.getBytes("UTF-8"));String value=Base64.encodeToString(iv,Base64.NO_WRAP)+":"+Base64.encodeToString(enc,Base64.NO_WRAP);getSharedPreferences(PREFS,MODE_PRIVATE).edit().putString(key,value).apply();}
        catch(Throwable t){getSharedPreferences(PREFS,MODE_PRIVATE).edit().putString(key,"").apply();}
    }

    private String readEncrypted(String key){
        String value=getSharedPreferences(PREFS,MODE_PRIVATE).getString(key,""); if(TextUtils.isEmpty(value)||!value.contains(":"))return "";
        try{String[] p=value.split(":",2);byte[] iv=Base64.decode(p[0],Base64.NO_WRAP);byte[] enc=Base64.decode(p[1],Base64.NO_WRAP);Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.DECRYPT_MODE,getKey(),new GCMParameterSpec(128,iv));return new String(c.doFinal(enc),"UTF-8");}
        catch(Throwable t){return "";}
    }

    private void openAppDetails(String pkg){try{Intent i=new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,Uri.parse("package:"+pkg));startActivity(i);}catch(Throwable t){safeStart(Settings.ACTION_APPLICATION_SETTINGS);}}
    private void settingCard(String title,String body,String action){actionCard(title,body,"OPEN",v->safeStart(action));}
    private void safeStart(String action){try{startActivity(new Intent(action));}catch(Throwable t){try{startActivity(new Intent(Settings.ACTION_SETTINGS));}catch(Throwable ignored){}}}

    private void hero(String title,String body){LinearLayout card=panel(PANEL2);TextView a=txt(title,22,true,TEXT);TextView b=txt(body,14,false,MUTED);b.setPadding(0,dp(8),0,0);card.addView(a);card.addView(b);content.addView(card);}
    private void sectionTitle(String s){TextView t=txt(s,14,true,MUTED);t.setPadding(dp(2),dp(22),0,dp(6));content.addView(t);}
    private void actionCard(String title,String body,String cta,View.OnClickListener l){LinearLayout card=panel(PANEL);TextView a=txt(title,17,true,TEXT);TextView b=txt(body,13,false,MUTED);b.setPadding(0,dp(5),0,dp(10));Button btn=primary(cta);btn.setOnClickListener(l);card.addView(a);card.addView(b);card.addView(btn);content.addView(card);}
    private void infoCard(String title,String body,int accent){LinearLayout card=panel(PANEL);TextView a=txt(title,14,true,accent);TextView b=txt(body,13,false,MUTED);b.setPadding(0,dp(5),0,0);card.addView(a);card.addView(b);content.addView(card);}
    private View scoreCard(int score,String grade){LinearLayout card=panel(Color.rgb(18,38,35));TextView a=txt("Security score",13,true,MUTED);TextView b=txt(score+" / 100",34,true,score>=80?ACCENT:WARN);TextView c=txt("Grade "+grade+" • "+checks+" checks completed",13,false,MUTED);card.addView(a);card.addView(b);card.addView(c);return card;}
    private void detail(String s){TextView t=txt(s,13,false,MUTED);t.setPadding(dp(6),dp(7),dp(4),dp(2));content.addView(t);}
    private LinearLayout panel(int color){LinearLayout x=new LinearLayout(this);x.setOrientation(LinearLayout.VERTICAL);x.setPadding(dp(16),dp(15),dp(16),dp(15));LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,-2);lp.setMargins(0,dp(8),0,0);x.setLayoutParams(lp);x.setBackground(round(color,18));return x;}
    private GradientDrawable round(int color,int radius){GradientDrawable g=new GradientDrawable();g.setColor(color);g.setCornerRadius(dp(radius));return g;}
    private TextView txt(String s,int sp,boolean bold,int color){TextView t=new TextView(this);t.setText(s);t.setTextSize(sp);t.setTextColor(color);if(bold)t.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);return t;}
    private Button primary(String s){Button b=new Button(this);b.setText(s);b.setTextColor(Color.rgb(5,20,15));b.setTextSize(12);b.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);b.setBackground(round(ACCENT,14));b.setPadding(dp(12),dp(10),dp(12),dp(10));return b;}
    private Button navButton(String s){Button b=new Button(this);b.setText(s);b.setTextSize(10);b.setTextColor(MUTED);b.setBackgroundColor(Color.TRANSPARENT);return b;}
    private int dp(int v){return Math.round(v*getResources().getDisplayMetrics().density);}
    private View fallback(Throwable t){LinearLayout x=new LinearLayout(this);x.setOrientation(LinearLayout.VERTICAL);x.setPadding(dp(24),dp(48),dp(24),dp(24));x.setBackgroundColor(BG);x.addView(txt("NEO Guardian Safe Mode",24,true,TEXT));TextView b=txt("Guardian caught a startup error instead of closing. Open Android security settings, then reinstall the latest build if needed.\n\n"+t.getClass().getSimpleName(),14,false,MUTED);b.setPadding(0,dp(12),0,dp(18));x.addView(b);Button s=primary("OPEN ANDROID SECURITY");s.setOnClickListener(v->safeStart(Settings.ACTION_SECURITY_SETTINGS));x.addView(s);return x;}

    private static class AppRisk{
        final String label,pkg; final int perms; final boolean debuggable,system;
        AppRisk(String label,String pkg,int perms,boolean debuggable,boolean system){this.label=label;this.pkg=pkg;this.perms=perms;this.debuggable=debuggable;this.system=system;}
        int score(){return perms+(debuggable?4:0)+(system?0:1);}
        String packageName(){return pkg;}
    }
}
