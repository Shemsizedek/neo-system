package org.neosystem.guardian;

import android.app.Activity;
import android.app.KeyguardManager;
import android.app.admin.DevicePolicyManager;
import android.content.ComponentName;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.graphics.Color;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.text.TextUtils;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import java.io.File;
import java.security.KeyStore;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Enumeration;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class MainActivity extends Activity {
    private static final String PREFS = "guardian_history";
    private static final String HISTORY = "scan_history";
    private LinearLayout results;
    private TextView scoreView;
    private int riskPoints;
    private int checks;

    private static final Set<String> HIGH_RISK_PERMISSIONS = new HashSet<>(Arrays.asList(
            "android.permission.READ_SMS","android.permission.RECEIVE_SMS","android.permission.SEND_SMS",
            "android.permission.READ_CALL_LOG","android.permission.WRITE_CALL_LOG","android.permission.RECORD_AUDIO",
            "android.permission.CAMERA","android.permission.ACCESS_FINE_LOCATION","android.permission.READ_CONTACTS",
            "android.permission.WRITE_CONTACTS","android.permission.REQUEST_INSTALL_PACKAGES","android.permission.SYSTEM_ALERT_WINDOW",
            "android.permission.BIND_ACCESSIBILITY_SERVICE"
    ));

    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        setContentView(buildUi());
        runSecurityScan();
    }

    private View buildUi() {
        ScrollView scroll = new ScrollView(this);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(dp(20), dp(24), dp(20), dp(32));
        root.setBackgroundColor(Color.rgb(10,13,18));
        TextView title = text("NEO GUARDIAN v1.1",28,true); title.setTextColor(Color.WHITE); root.addView(title);
        TextView sub = text("Advanced local-first Android defensive security center",15,false); sub.setTextColor(Color.LTGRAY); root.addView(sub);
        scoreView = text("Scanning…",22,true); scoreView.setPadding(0,dp(24),0,dp(16)); scoreView.setTextColor(Color.WHITE); root.addView(scoreView);
        Button scan = button("RUN ADVANCED SECURITY SCAN"); scan.setOnClickListener(v -> runSecurityScan()); root.addView(scan);
        Button lock = button("OPEN LOCKDOWN CENTER"); lock.setOnClickListener(v -> showLockdownCenter()); root.addView(lock);
        Button history = button("SHOW LOCAL SCAN HISTORY"); history.setOnClickListener(v -> showHistory()); root.addView(history);
        TextView privacy = text("Privacy posture: no Internet, microphone, camera, SMS, contacts, or location permission. Scan history stays on this device.",13,false);
        privacy.setTextColor(Color.rgb(160,210,180)); privacy.setPadding(0,dp(14),0,dp(14)); root.addView(privacy);
        results = new LinearLayout(this); results.setOrientation(LinearLayout.VERTICAL); root.addView(results); scroll.addView(root); return scroll;
    }

    private void runSecurityScan() {
        results.removeAllViews(); riskPoints=0; checks=0;
        checkScreenLock(); checkAdb(); checkDeveloperOptions(); checkEncryption(); checkSecurityPatch(); checkBuildIntegrityHints();
        checkRootIndicators(); checkAccessibilityExposure(); checkDeviceAdmins(); checkNetworkAndVpn(); checkPrivateDns();
        checkCertificateStore(); checkGuardianSignature(); auditInstalledApps();
        int score=Math.max(0,100-Math.min(100,riskPoints));
        String grade=score>=90?"A":score>=80?"B":score>=70?"C":score>=60?"D":"F";
        scoreView.setText("Security Score: "+score+"/100  •  Grade "+grade+"  •  "+checks+" checks"); recordHistory(score,grade);
    }

    private void checkScreenLock(){checks++; KeyguardManager km=(KeyguardManager)getSystemService(KEYGUARD_SERVICE); boolean ok=km!=null&&km.isDeviceSecure(); finding("Secure screen lock",ok?"Enabled":"Not enabled",ok,ok?0:20);}
    private void checkAdb(){checks++; boolean adb=Settings.Global.getInt(getContentResolver(),Settings.Global.ADB_ENABLED,0)==1; finding("USB debugging (ADB)",adb?"Enabled — disable when not actively developing":"Disabled",!adb,adb?10:0);}
    private void checkDeveloperOptions(){checks++; boolean dev=Settings.Global.getInt(getContentResolver(),Settings.Global.DEVELOPMENT_SETTINGS_ENABLED,0)==1; finding("Developer options",dev?"Enabled":"Disabled",!dev,dev?5:0);}

    private void checkEncryption(){
        checks++; DevicePolicyManager d=(DevicePolicyManager)getSystemService(DEVICE_POLICY_SERVICE); boolean ok=false;
        if(d!=null){int s=d.getStorageEncryptionStatus(); ok=s==DevicePolicyManager.ENCRYPTION_STATUS_ACTIVE||s==DevicePolicyManager.ENCRYPTION_STATUS_ACTIVE_DEFAULT_KEY||s==DevicePolicyManager.ENCRYPTION_STATUS_ACTIVE_PER_USER;}
        finding("Device storage encryption",ok?"Active":"Could not confirm active encryption",ok,ok?0:15);
    }

    private void checkSecurityPatch(){
        checks++; String patch=Build.VERSION.SECURITY_PATCH; boolean current=false; String detail="Security patch: "+(TextUtils.isEmpty(patch)?"unknown":patch);
        if(!TextUtils.isEmpty(patch)) try{long age=ChronoUnit.DAYS.between(LocalDate.parse(patch),LocalDate.now()); current=age<=120; detail+=" ("+age+" days old)";}catch(Exception ignored){}
        finding("Android security patch",detail,current,current?0:10);
    }

    private void checkBuildIntegrityHints(){checks++; String tags=Build.TAGS; boolean bad=(tags!=null&&tags.contains("test-keys"))||"eng".equals(Build.TYPE); finding("OS build integrity hints",bad?"Engineering/test-key build detected":"No obvious engineering/test-key indicators",!bad,bad?15:0);}

    private void checkRootIndicators(){
        checks++; String[] p={"/system/bin/su","/system/xbin/su","/sbin/su","/vendor/bin/su","/data/local/bin/su","/data/local/xbin/su","/system/app/Superuser.apk"}; List<String> found=new ArrayList<>();
        for(String x:p) if(new File(x).exists()) found.add(x); boolean bad=!found.isEmpty(); finding("Root indicators",bad?"Potential root artifacts: "+TextUtils.join(", ",found):"No common su/root artifacts detected",!bad,bad?20:0);
    }

    private void checkAccessibilityExposure(){
        checks++; boolean enabled=Settings.Secure.getInt(getContentResolver(),Settings.Secure.ACCESSIBILITY_ENABLED,0)==1; String s=Settings.Secure.getString(getContentResolver(),Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES);
        if(!enabled||TextUtils.isEmpty(s)){finding("Accessibility services","No enabled accessibility services detected",true,0);return;}
        String[] items=s.split(":"); finding("Accessibility services",items.length+" enabled service(s) — verify every one is intentional",false,Math.min(12,items.length*4)); for(String i:items)addDetail("• "+i);
    }

    private void checkDeviceAdmins(){
        checks++; DevicePolicyManager d=(DevicePolicyManager)getSystemService(DEVICE_POLICY_SERVICE); List<ComponentName> a=d==null?null:d.getActiveAdmins();
        if(a==null||a.isEmpty()){finding("Device administrators","No active third-party device administrators reported",true,0);return;}
        finding("Device administrators",a.size()+" active administrator(s) — verify every entry",false,Math.min(10,a.size()*3)); for(ComponentName c:a)addDetail("• "+c.flattenToShortString());
    }

    private void checkNetworkAndVpn(){
        checks++; ConnectivityManager cm=(ConnectivityManager)getSystemService(CONNECTIVITY_SERVICE); Network n=cm==null?null:cm.getActiveNetwork(); NetworkCapabilities c=n==null||cm==null?null:cm.getNetworkCapabilities(n);
        if(c==null){finding("Network / VPN posture","No active network detected",true,0);return;} List<String> t=new ArrayList<>();
        if(c.hasTransport(NetworkCapabilities.TRANSPORT_VPN))t.add("VPN"); if(c.hasTransport(NetworkCapabilities.TRANSPORT_WIFI))t.add("Wi‑Fi"); if(c.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR))t.add("Cellular"); if(c.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET))t.add("Ethernet");
        boolean vpn=c.hasTransport(NetworkCapabilities.TRANSPORT_VPN); finding("Network / VPN posture",TextUtils.join(" + ",t)+(vpn?" — VPN active":" — no VPN detected"),true,0);
    }

    private void checkPrivateDns(){checks++; String mode=Settings.Global.getString(getContentResolver(),"private_dns_mode"); String spec=Settings.Global.getString(getContentResolver(),"private_dns_specifier"); if(TextUtils.isEmpty(mode))mode="unknown"; boolean ok="hostname".equals(mode)||"opportunistic".equals(mode); finding("Private DNS","Mode: "+mode+(TextUtils.isEmpty(spec)?"":" • provider: "+spec),ok,ok?0:4);}

    private void checkCertificateStore(){
        checks++; try{KeyStore ks=KeyStore.getInstance("AndroidCAStore"); ks.load(null); Enumeration<String> e=ks.aliases(); int total=0,user=0; while(e.hasMoreElements()){String a=e.nextElement();total++;if(a!=null&&a.startsWith("user:"))user++;} boolean ok=user==0; finding("Trusted certificate store",total+" CA entries; "+user+" user-added certificate(s)",ok,ok?0:Math.min(12,user*4));}catch(Exception ex){finding("Trusted certificate store","Android did not expose certificate inventory",true,0);}
    }

    private void checkGuardianSignature(){
        checks++; try{PackageInfo i=getPackageManager().getPackageInfo(getPackageName(),PackageManager.GET_SIGNING_CERTIFICATES); Signature[] s=i.signingInfo==null?null:i.signingInfo.getApkContentsSigners(); if(s==null||s.length==0){finding("Guardian APK signature","Unable to read signing certificate",false,5);return;} byte[] d=MessageDigest.getInstance("SHA-256").digest(s[0].toByteArray()); finding("Guardian APK signature","SHA-256 certificate: "+hex(d),true,0);}catch(Exception e){finding("Guardian APK signature","Unable to calculate certificate fingerprint",false,5);}
    }

    private void auditInstalledApps(){
        checks++; PackageManager pm=getPackageManager(); List<PackageInfo> pkgs; try{pkgs=pm.getInstalledPackages(PackageManager.GET_PERMISSIONS);}catch(Exception e){finding("Installed-app audit","Android blocked package inventory",false,5);return;}
        List<String> flagged=new ArrayList<>(); for(PackageInfo pi:pkgs){if(pi.packageName.equals(getPackageName()))continue; ApplicationInfo ai=pi.applicationInfo; boolean debug=ai!=null&&(ai.flags&ApplicationInfo.FLAG_DEBUGGABLE)!=0; int count=0; if(pi.requestedPermissions!=null)for(String p:pi.requestedPermissions)if(HIGH_RISK_PERMISSIONS.contains(p))count++; if(debug||count>=6){String label; try{label=String.valueOf(pm.getApplicationLabel(ai));}catch(Exception e){label=pi.packageName;} flagged.add(label+" ["+pi.packageName+"] — "+count+" high-impact permissions"+(debug?", debuggable":""));}}
        Collections.sort(flagged); int penalty=Math.min(15,flagged.size()*2); if(flagged.isEmpty())finding("Installed-app audit","No apps crossed Guardian's review threshold",true,0); else{finding("Installed-app audit",flagged.size()+" app(s) deserve manual review; a flag is not proof of malware",false,penalty); for(String x:flagged)addDetail("• "+x);}
    }

    private void showLockdownCenter(){
        results.removeAllViews(); addSection("LOCKDOWN CENTER","Use this checklist when you suspect compromise or want maximum defensive posture.");
        addDetail("1. Disable USB debugging and Developer options unless actively required."); addDetail("2. Review every Accessibility service; disable anything you do not recognize or need."); addDetail("3. Review Device admin apps and remove unexpected administrators."); addDetail("4. Verify VPN and Private DNS configuration."); addDetail("5. Install Android security/system updates."); addDetail("6. Review unknown or sideloaded apps and broad permissions."); addDetail("7. Change critical account passwords from a trusted device if compromise is suspected."); addDetail("8. Preserve evidence before factory reset if professional incident response may be needed.");
        Button security=button("ANDROID SECURITY SETTINGS"); security.setOnClickListener(v->safeStart(new Intent(Settings.ACTION_SECURITY_SETTINGS))); results.addView(security);
        Button access=button("ACCESSIBILITY SETTINGS"); access.setOnClickListener(v->safeStart(new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))); results.addView(access);
        Button admins=button("DEVICE ADMIN SETTINGS"); admins.setOnClickListener(v->safeStart(new Intent("android.settings.DEVICE_ADMIN_SETTINGS"))); results.addView(admins);
        Button vpn=button("VPN SETTINGS"); vpn.setOnClickListener(v->safeStart(new Intent(Settings.ACTION_VPN_SETTINGS))); results.addView(vpn);
        if(Build.VERSION.SDK_INT>=Build.VERSION_CODES.P){Button dns=button("PRIVATE DNS SETTINGS"); dns.setOnClickListener(v->safeStart(new Intent("android.settings.PRIVATE_DNS_SETTINGS"))); results.addView(dns);}
    }

    private void recordHistory(int score,String grade){SharedPreferences p=getSharedPreferences(PREFS,MODE_PRIVATE); String old=p.getString(HISTORY,""); String all=System.currentTimeMillis()+","+score+","+grade+(TextUtils.isEmpty(old)?"":"\n"+old); String[] l=all.split("\n"); StringBuilder b=new StringBuilder(); for(int i=0;i<Math.min(10,l.length);i++){if(i>0)b.append('\n');b.append(l[i]);} p.edit().putString(HISTORY,b.toString()).apply();}
    private void showHistory(){results.removeAllViews();addSection("LOCAL SCAN HISTORY","Only score, grade, and timestamp are stored locally.");String raw=getSharedPreferences(PREFS,MODE_PRIVATE).getString(HISTORY,"");if(TextUtils.isEmpty(raw)){addDetail("No scan history yet.");return;}for(String line:raw.split("\n")){String[] p=line.split(",");if(p.length!=3)continue;try{String d=java.text.DateFormat.getDateTimeInstance().format(new java.util.Date(Long.parseLong(p[0])));addDetail("• "+d+" — "+p[1]+"/100, Grade "+p[2]);}catch(Exception ignored){}}}

    private void finding(String name,String detail,boolean good,int penalty){riskPoints+=penalty;LinearLayout card=new LinearLayout(this);card.setOrientation(LinearLayout.VERTICAL);card.setPadding(dp(14),dp(12),dp(14),dp(12));LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,-2);lp.setMargins(0,dp(8),0,0);card.setLayoutParams(lp);card.setBackgroundColor(good?Color.rgb(18,48,34):Color.rgb(70,38,28));TextView h=text((good?"✓ ":"⚠ ")+name,16,true);h.setTextColor(Color.WHITE);card.addView(h);TextView d=text(detail,13,false);d.setTextColor(Color.LTGRAY);card.addView(d);results.addView(card);}
    private void addSection(String h,String d){TextView a=text(h,20,true);a.setTextColor(Color.WHITE);a.setPadding(0,dp(14),0,dp(4));results.addView(a);TextView b=text(d,13,false);b.setTextColor(Color.LTGRAY);results.addView(b);}
    private void addDetail(String s){TextView v=text(s,12,false);v.setTextColor(Color.LTGRAY);v.setPadding(dp(10),dp(5),0,0);results.addView(v);}
    private Button button(String s){Button b=new Button(this);b.setText(s);return b;}
    private void safeStart(Intent i){try{startActivity(i);}catch(Exception e){startActivity(new Intent(Settings.ACTION_SETTINGS));}}
    private String hex(byte[] a){StringBuilder b=new StringBuilder();for(byte x:a)b.append(String.format("%02X",x));return b.toString();}
    private TextView text(String s,int sp,boolean bold){TextView t=new TextView(this);t.setText(s);t.setTextSize(sp);if(bold)t.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);t.setGravity(Gravity.START);return t;}
    private int dp(int v){return Math.round(v*getResources().getDisplayMetrics().density);}
}
