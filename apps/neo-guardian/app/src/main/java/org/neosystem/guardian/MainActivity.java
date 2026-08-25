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
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.text.TextUtils;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import java.io.File;
import java.text.DateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class MainActivity extends Activity {
    private static final String PREFS="neo_guardian";
    private static final String HISTORY="history";
    private static final int BG=Color.rgb(7,10,16), PANEL=Color.rgb(16,22,32), PANEL2=Color.rgb(22,30,43), TEXT=Color.rgb(242,246,250), MUTED=Color.rgb(155,169,187), ACCENT=Color.rgb(75,220,170), WARN=Color.rgb(255,184,77), DANGER=Color.rgb(255,105,105);
    private LinearLayout content;
    private TextView statusChip;
    private int risk, checks;

    private static final Set<String> RISK_PERMS=new HashSet<>(Arrays.asList(
            "android.permission.READ_SMS","android.permission.SEND_SMS","android.permission.RECEIVE_SMS",
            "android.permission.READ_CALL_LOG","android.permission.WRITE_CALL_LOG","android.permission.RECORD_AUDIO",
            "android.permission.CAMERA","android.permission.ACCESS_FINE_LOCATION","android.permission.READ_CONTACTS",
            "android.permission.WRITE_CONTACTS","android.permission.REQUEST_INSTALL_PACKAGES"
    ));

    @Override protected void onCreate(Bundle state){
        super.onCreate(state);
        try{setContentView(buildShell()); showOverview();}
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
        ImageView logo=new ImageView(this); logo.setImageResource(org.neosystem.guardian.R.drawable.neo_guardian_logo); wrap.addView(logo,new LinearLayout.LayoutParams(dp(54),dp(54)));
        LinearLayout titleWrap=new LinearLayout(this); titleWrap.setOrientation(LinearLayout.VERTICAL); titleWrap.setPadding(dp(12),0,0,0);
        TextView title=txt("NEO Guardian",24,true,TEXT); TextView sub=txt("Mobile Defense Center • v1.2",12,false,MUTED); titleWrap.addView(title); titleWrap.addView(sub); wrap.addView(titleWrap,new LinearLayout.LayoutParams(0,-2,1));
        statusChip=txt("READY",11,true,ACCENT); statusChip.setGravity(Gravity.CENTER); statusChip.setPadding(dp(10),dp(7),dp(10),dp(7)); statusChip.setBackground(round(Color.rgb(20,52,45),18)); wrap.addView(statusChip); return wrap;
    }

    private View buildNav(){
        LinearLayout nav=new LinearLayout(this); nav.setPadding(dp(8),dp(8),dp(8),dp(10)); nav.setBackgroundColor(PANEL); String[] names={"HOME","SCAN","TOOLS","HISTORY"};
        for(String n:names){Button b=navButton(n); b.setOnClickListener(v->{if(n.equals("HOME"))showOverview(); else if(n.equals("SCAN"))runScan(); else if(n.equals("TOOLS"))showTools(); else showHistory();}); nav.addView(b,new LinearLayout.LayoutParams(0,dp(52),1));} return nav;
    }

    private void showOverview(){
        content.removeAllViews(); statusChip.setText("READY"); statusChip.setTextColor(ACCENT);
        hero("Protection that stays on your phone","Guardian does not need Internet, camera, microphone, SMS, contacts, or location access. It audits Android security posture and points you to the exact controls to review.");
        sectionTitle("Security center");
        actionCard("Run full security scan","Screen lock, debugging, updates, root indicators, accessibility exposure, VPN/DNS and app-risk review.","SCAN NOW",v->runScan());
        actionCard("Lockdown tools","Jump directly to Android security, accessibility, VPN, DNS and app settings.","OPEN TOOLS",v->showTools());
        actionCard("Local scan history","Track your security score over time. Stored only inside Guardian.","VIEW HISTORY",v->showHistory());
        sectionTitle("Privacy posture"); infoCard("LOCAL-FIRST","No network permission is declared. Guardian cannot upload scan results in this build.",ACCENT);
        infoCard("DEFENSIVE ONLY","Flags are review indicators, not proof that an app, person, or organization is spying on you.",WARN);
    }

    private void runScan(){
        content.removeAllViews(); risk=0; checks=0; statusChip.setText("SCANNING"); statusChip.setTextColor(WARN);
        hero("Security scan","Each test is isolated. If Android blocks one check, Guardian reports it instead of crashing.");
        safeCheck("Secure screen lock",()->{KeyguardManager km=(KeyguardManager)getSystemService(KEYGUARD_SERVICE); boolean ok=km!=null&&km.isDeviceSecure(); finding("Secure screen lock",ok?"Enabled":"Not enabled",ok,ok?0:20);});
        safeCheck("USB debugging",()->{boolean on=Settings.Global.getInt(getContentResolver(),Settings.Global.ADB_ENABLED,0)==1; finding("USB debugging (ADB)",on?"Enabled — turn off when not developing":"Disabled",!on,on?10:0);});
        safeCheck("Developer options",()->{boolean on=Settings.Global.getInt(getContentResolver(),Settings.Global.DEVELOPMENT_SETTINGS_ENABLED,0)==1; finding("Developer options",on?"Enabled":"Disabled",!on,on?5:0);});
        safeCheck("Encryption",()->{DevicePolicyManager d=(DevicePolicyManager)getSystemService(DEVICE_POLICY_SERVICE); int s=d==null?0:d.getStorageEncryptionStatus(); boolean ok=s==DevicePolicyManager.ENCRYPTION_STATUS_ACTIVE||s==DevicePolicyManager.ENCRYPTION_STATUS_ACTIVE_DEFAULT_KEY||s==DevicePolicyManager.ENCRYPTION_STATUS_ACTIVE_PER_USER; finding("Storage encryption",ok?"Active":"Could not confirm active encryption",ok,ok?0:12);});
        safeCheck("Security patch",()->{String p=Build.VERSION.SECURITY_PATCH; finding("Android security patch",TextUtils.isEmpty(p)?"Unknown":"Installed patch: "+p,!TextUtils.isEmpty(p),TextUtils.isEmpty(p)?5:0);});
        safeCheck("Root indicators",()->{String[] paths={"/system/bin/su","/system/xbin/su","/sbin/su","/vendor/bin/su","/system/app/Superuser.apk"}; List<String> f=new ArrayList<>(); for(String p:paths)if(new File(p).exists())f.add(p); boolean ok=f.isEmpty(); finding("Root indicators",ok?"No common root artifacts detected":"Review: "+TextUtils.join(", ",f),ok,ok?0:20);});
        safeCheck("Accessibility",()->{boolean e=Settings.Secure.getInt(getContentResolver(),Settings.Secure.ACCESSIBILITY_ENABLED,0)==1; String s=Settings.Secure.getString(getContentResolver(),Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES); int n=(!e||TextUtils.isEmpty(s))?0:s.split(":").length; finding("Accessibility services",n==0?"None enabled":n+" enabled service(s) — verify each one",n==0,n==0?0:Math.min(12,n*4));});
        safeCheck("Network",()->{ConnectivityManager cm=(ConnectivityManager)getSystemService(CONNECTIVITY_SERVICE); android.net.Network n=cm==null?null:cm.getActiveNetwork(); NetworkCapabilities c=n==null||cm==null?null:cm.getNetworkCapabilities(n); if(c==null){finding("Network posture","No active network detected",true,0);return;} boolean vpn=c.hasTransport(NetworkCapabilities.TRANSPORT_VPN); String type=c.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)?"Wi‑Fi":c.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)?"Cellular":"Other"; finding("Network / VPN",type+(vpn?" • VPN active":" • no VPN detected"),true,0);});
        safeCheck("Private DNS",()->{String m=Settings.Global.getString(getContentResolver(),"private_dns_mode"); boolean ok="hostname".equals(m)||"opportunistic".equals(m); finding("Private DNS","Mode: "+(m==null?"unknown":m),ok,ok?0:4);});
        safeCheck("Installed apps",this::auditApps);
        int score=Math.max(0,100-Math.min(100,risk)); String grade=score>=90?"A":score>=80?"B":score>=70?"C":score>=60?"D":"F";
        content.addView(scoreCard(score,grade)); saveHistory(score,grade); statusChip.setText("COMPLETE"); statusChip.setTextColor(score>=80?ACCENT:WARN);
    }

    private void auditApps(){
        PackageManager pm=getPackageManager(); List<PackageInfo> pkgs=pm.getInstalledPackages(PackageManager.GET_PERMISSIONS); List<String> flagged=new ArrayList<>();
        for(PackageInfo pi:pkgs){if(pi.packageName.equals(getPackageName()))continue; int count=0; if(pi.requestedPermissions!=null)for(String p:pi.requestedPermissions)if(RISK_PERMS.contains(p))count++; ApplicationInfo ai=pi.applicationInfo; boolean dbg=ai!=null&&(ai.flags&ApplicationInfo.FLAG_DEBUGGABLE)!=0; if(count>=6||dbg){String label=pi.packageName; try{label=String.valueOf(pm.getApplicationLabel(ai));}catch(Exception ignored){} flagged.add(label+" • "+count+" high-impact permissions"+(dbg?" • debuggable":""));}}
        Collections.sort(flagged); boolean ok=flagged.isEmpty(); finding("App risk review",ok?"No apps crossed Guardian's review threshold":flagged.size()+" app(s) deserve manual review",ok,ok?0:Math.min(15,flagged.size()*2)); for(int i=0;i<Math.min(8,flagged.size());i++)detail("• "+flagged.get(i));
    }

    private void safeCheck(String name,Runnable r){checks++; try{r.run();}catch(Throwable t){finding(name,"Android blocked this check on this device; Guardian continued safely.",true,0);}}

    private void showTools(){
        content.removeAllViews(); statusChip.setText("TOOLS"); statusChip.setTextColor(ACCENT); hero("Lockdown & review tools","These buttons open trusted Android settings. Guardian does not secretly change system controls behind your back.");
        settingCard("Security & lock screen","Review PIN/password, biometrics, device security and credentials.",Settings.ACTION_SECURITY_SETTINGS);
        settingCard("Accessibility services","Audit apps with powerful accessibility access.",Settings.ACTION_ACCESSIBILITY_SETTINGS);
        settingCard("VPN","Review active and saved VPN profiles.",Settings.ACTION_VPN_SETTINGS);
        settingCard("Private DNS","Review encrypted DNS configuration.","android.settings.PRIVATE_DNS_SETTINGS");
        settingCard("Apps & permissions","Inspect apps, permissions, sideloaded software and uninstall anything unwanted.",Settings.ACTION_APPLICATION_SETTINGS);
        settingCard("Developer options","Disable debugging features when they are not needed.",Settings.ACTION_APPLICATION_DEVELOPMENT_SETTINGS);
        sectionTitle("Incident checklist"); detail("1. Disconnect from untrusted Wi‑Fi and disable Bluetooth/NFC if not needed."); detail("2. Review Accessibility, VPN, device-admin and unknown apps."); detail("3. Install Android system/security updates."); detail("4. Change critical passwords from a trusted device if compromise is credible."); detail("5. Preserve screenshots/logs before a factory reset when evidence matters.");
    }

    private void showHistory(){
        content.removeAllViews(); statusChip.setText("HISTORY"); statusChip.setTextColor(ACCENT); hero("Local security history","Guardian stores only timestamp, score and grade in its private app storage.");
        String raw=getSharedPreferences(PREFS,MODE_PRIVATE).getString(HISTORY,""); if(TextUtils.isEmpty(raw)){infoCard("NO SCANS YET","Run a security scan to create your first baseline.",MUTED);return;}
        for(String line:raw.split("\n")){String[] p=line.split(","); if(p.length!=3)continue; try{String when=DateFormat.getDateTimeInstance(DateFormat.MEDIUM,DateFormat.SHORT).format(new Date(Long.parseLong(p[0]))); infoCard(p[1]+" / 100 • Grade "+p[2],when,Integer.parseInt(p[1])>=80?ACCENT:WARN);}catch(Exception ignored){}}
        Button clear=primary("CLEAR LOCAL HISTORY"); clear.setOnClickListener(v->{getSharedPreferences(PREFS,MODE_PRIVATE).edit().remove(HISTORY).apply();showHistory();}); content.addView(clear);
    }

    private void saveHistory(int score,String grade){SharedPreferences p=getSharedPreferences(PREFS,MODE_PRIVATE); String old=p.getString(HISTORY,""); String row=System.currentTimeMillis()+","+score+","+grade; String all=row+(TextUtils.isEmpty(old)?"":"\n"+old); String[] rows=all.split("\n"); StringBuilder b=new StringBuilder(); for(int i=0;i<Math.min(12,rows.length);i++){if(i>0)b.append('\n');b.append(rows[i]);} p.edit().putString(HISTORY,b.toString()).apply();}

    private void settingCard(String title,String body,String action){actionCard(title,body,"OPEN",v->safeStart(action));}
    private void safeStart(String action){try{startActivity(new Intent(action));}catch(Throwable t){try{startActivity(new Intent(Settings.ACTION_SETTINGS));}catch(Throwable ignored){}}}

    private void hero(String title,String body){LinearLayout card=panel(PANEL2); TextView a=txt(title,22,true,TEXT); TextView b=txt(body,14,false,MUTED); b.setPadding(0,dp(8),0,0); card.addView(a);card.addView(b);content.addView(card);}
    private void sectionTitle(String s){TextView t=txt(s,14,true,MUTED);t.setPadding(dp(2),dp(22),0,dp(6));content.addView(t);}
    private void actionCard(String title,String body,String cta,View.OnClickListener l){LinearLayout card=panel(PANEL);TextView a=txt(title,17,true,TEXT);TextView b=txt(body,13,false,MUTED);b.setPadding(0,dp(5),0,dp(10));Button btn=primary(cta);btn.setOnClickListener(l);card.addView(a);card.addView(b);card.addView(btn);content.addView(card);}
    private void infoCard(String title,String body,int accent){LinearLayout card=panel(PANEL);TextView a=txt(title,14,true,accent);TextView b=txt(body,13,false,MUTED);b.setPadding(0,dp(5),0,0);card.addView(a);card.addView(b);content.addView(card);}
    private void finding(String title,String body,boolean good,int penalty){risk+=penalty;LinearLayout card=panel(PANEL);TextView a=txt((good?"✓ ":"⚠ ")+title,15,true,good?ACCENT:WARN);TextView b=txt(body,13,false,MUTED);b.setPadding(0,dp(5),0,0);card.addView(a);card.addView(b);content.addView(card);}
    private View scoreCard(int score,String grade){LinearLayout card=panel(Color.rgb(18,38,35));TextView a=txt("Security score",13,true,MUTED);TextView b=txt(score+" / 100",34,true,score>=80?ACCENT:WARN);TextView c=txt("Grade "+grade+" • "+checks+" checks completed",13,false,MUTED);card.addView(a);card.addView(b);card.addView(c);return card;}
    private void detail(String s){TextView t=txt(s,13,false,MUTED);t.setPadding(dp(6),dp(7),dp(4),dp(2));content.addView(t);}

    private LinearLayout panel(int color){LinearLayout x=new LinearLayout(this);x.setOrientation(LinearLayout.VERTICAL);x.setPadding(dp(16),dp(15),dp(16),dp(15));LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,-2);lp.setMargins(0,dp(8),0,0);x.setLayoutParams(lp);x.setBackground(round(color,18));return x;}
    private GradientDrawable round(int color,int radius){GradientDrawable g=new GradientDrawable();g.setColor(color);g.setCornerRadius(dp(radius));return g;}
    private TextView txt(String s,int sp,boolean bold,int color){TextView t=new TextView(this);t.setText(s);t.setTextSize(sp);t.setTextColor(color);if(bold)t.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);return t;}
    private Button primary(String s){Button b=new Button(this);b.setText(s);b.setTextColor(Color.rgb(5,20,16));b.setTextSize(12);b.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);b.setBackground(round(ACCENT,14));return b;}
    private Button navButton(String s){Button b=new Button(this);b.setText(s);b.setTextSize(10);b.setTextColor(TEXT);b.setBackgroundColor(Color.TRANSPARENT);b.setAllCaps(false);return b;}
    private View fallback(Throwable t){LinearLayout x=new LinearLayout(this);x.setOrientation(LinearLayout.VERTICAL);x.setPadding(dp(24),dp(40),dp(24),dp(24));x.setBackgroundColor(BG);x.addView(txt("NEO Guardian",28,true,TEXT));x.addView(txt("Safe mode",16,true,WARN));x.addView(txt("The dashboard hit a device-specific Android error, but Guardian stayed open. Reinstall the latest build or open Android Security Settings below.",14,false,MUTED));Button b=primary("OPEN ANDROID SECURITY SETTINGS");b.setOnClickListener(v->safeStart(Settings.ACTION_SECURITY_SETTINGS));x.addView(b);return x;}
    private int dp(int v){return Math.round(v*getResources().getDisplayMetrics().density);}
}
