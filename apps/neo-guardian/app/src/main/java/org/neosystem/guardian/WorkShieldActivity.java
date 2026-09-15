package org.neosystem.guardian;

import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import java.util.List;

/**
 * Explicit, visible Work Shield session. Monitoring runs only while this screen is active
 * and the user has enabled the session. No hidden background service is started.
 */
public final class WorkShieldActivity extends Activity {
    private static final String BASELINE = "baseline";
    private static final String AUDIT = "audit";
    private static final long INTERVAL_MS = 30000L;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private LinearLayout content;
    private TextView chip;
    private boolean enabled;
    private GuardianWorkShield.Snapshot last;

    private final Runnable pulse = new Runnable() {
        @Override public void run() {
            if (!enabled) return;
            runPostureCheck(false);
            handler.postDelayed(this, INTERVAL_MS);
        }
    };

    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        setContentView(shell());
        showHome();
    }

    @Override protected void onPause() {
        super.onPause();
        handler.removeCallbacks(pulse);
    }

    @Override protected void onResume() {
        super.onResume();
        if (enabled) handler.post(pulse);
    }

    private View shell() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.rgb(6,9,14));
        LinearLayout header = new LinearLayout(this);
        header.setPadding(dp(18),dp(18),dp(18),dp(14));
        header.setGravity(Gravity.CENTER_VERTICAL);
        header.setBackgroundColor(Color.rgb(14,20,29));
        TextView title = text("NEO Guardian • Work Shield",22,true,Color.WHITE);
        header.addView(title,new LinearLayout.LayoutParams(0,-2,1));
        chip = text("OFF",12,true,Color.rgb(255,184,77));
        header.addView(chip);
        root.addView(header);
        ScrollView scroll = new ScrollView(this);
        content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setPadding(dp(18),dp(18),dp(18),dp(28));
        scroll.addView(content);
        root.addView(scroll,new LinearLayout.LayoutParams(-1,0,1));
        return root;
    }

    private void showHome() {
        content.removeAllViews();
        card("VISIBLE SESSION", "Work Shield runs posture checks only while this screen is visible and you explicitly enable it. No covert monitoring or background surveillance is started.", Color.rgb(75,220,170));
        Button toggle = button(enabled ? "STOP WORK SHIELD" : "START WORK SHIELD");
        toggle.setOnClickListener(v -> {
            enabled = !enabled;
            chip.setText(enabled ? "ACTIVE" : "OFF");
            chip.setTextColor(enabled ? Color.rgb(75,220,170) : Color.rgb(255,184,77));
            handler.removeCallbacks(pulse);
            if (enabled) {
                last = GuardianWorkShield.capture(this);
                saveBaseline(last);
                appendAudit("INFO|OBSERVATION|Work Shield session started");
                handler.post(pulse);
            } else appendAudit("INFO|OBSERVATION|Work Shield session stopped");
            showHome();
        });
        content.addView(toggle);
        Button now = button("RUN POSTURE CHECK NOW");
        now.setOnClickListener(v -> runPostureCheck(true));
        content.addView(now);
        Button infra = button("CHECK NEO INFRASTRUCTURE");
        infra.setOnClickListener(v -> runInfrastructureCheck());
        content.addView(infra);
        String saved = GuardianSecureStore.get(this, BASELINE);
        card("ENCRYPTED BASELINE", saved == null ? "No baseline stored yet." : saved, Color.rgb(105,169,255));
        String audit = GuardianSecureStore.get(this, AUDIT);
        card("LOCAL INCIDENT / AUDIT LEDGER", audit == null ? "No events recorded." : audit, Color.rgb(153,168,187));
    }

    private void runPostureCheck(boolean render) {
        GuardianWorkShield.Snapshot current = GuardianWorkShield.capture(this);
        List<GuardianWorkShield.Finding> findings = GuardianWorkShield.evaluate(current, true);
        String delta = compare(last, current);
        last = current;
        saveBaseline(current);
        GuardianWorkShield.Severity max = GuardianWorkShield.Severity.INFO;
        for (GuardianWorkShield.Finding f : findings) {
            if (f.severity.ordinal() > max.ordinal()) max = f.severity;
            appendAudit(f.severity + "|" + f.state + "|" + f.title + "|" + f.evidence);
        }
        if (!"no observable posture change".equals(delta)) appendAudit("MEDIUM|SUSPICION|Posture changed|" + delta);
        if (max.ordinal() >= GuardianWorkShield.Severity.HIGH.ordinal()) {
            Toast.makeText(this, "Work Shield HIGH-risk posture warning. Review before continuing administration.", Toast.LENGTH_LONG).show();
        }
        if (render) {
            content.removeAllViews();
            card("POSTURE DELTA", delta, "no observable posture change".equals(delta) ? Color.rgb(75,220,170) : Color.rgb(255,184,77));
            for (GuardianWorkShield.Finding f : findings) {
                int color = f.severity.ordinal() >= GuardianWorkShield.Severity.HIGH.ordinal() ? Color.rgb(255,105,105) :
                        f.severity.ordinal() >= GuardianWorkShield.Severity.MEDIUM.ordinal() ? Color.rgb(255,184,77) : Color.rgb(105,169,255);
                card(f.severity + " • " + f.state + " • " + f.title,
                        "Evidence: " + f.evidence + "\nAffected: " + f.affected + "\nConfidence: " + f.confidence +
                                "\nContainment: " + f.containment + "\nRotate credentials: " + (f.rotateCredentials ? "consider after verification" : "not indicated") +
                                "\nRemediation: " + f.remediation + "\nVerify: " + f.verification, color);
            }
            Button back = button("BACK"); back.setOnClickListener(v -> showHome()); content.addView(back);
        }
    }

    private void runInfrastructureCheck() {
        chip.setText("CHECKING");
        new Thread(() -> {
            List<GuardianInfrastructureHealth.Result> results = GuardianInfrastructureHealth.run();
            boolean githubHealthy = GuardianInfrastructureHealth.githubPrimaryHealthy(results);
            runOnUiThread(() -> {
                content.removeAllViews();
                for (GuardianInfrastructureHealth.Result r : results) {
                    String body = "URL: " + r.url + "\nHTTP: " + r.httpStatus + "\nTLS subject: " + r.certificateSubject +
                            "\nCertificate expiry epoch: " + r.certificateNotAfter + "\nResult: " + r.detail;
                    card((r.healthy ? "HEALTHY • " : "REVIEW • ") + r.name, body,
                            r.healthy ? Color.rgb(75,220,170) : Color.rgb(255,184,77));
                    appendAudit((r.healthy ? "INFO|OBSERVATION|" : "MEDIUM|SUSPICION|") + r.name + "|" + r.detail);
                }
                if (githubHealthy) card("PRIMARY OUTAGE POLICY", "GitHub Pages primary is healthy. A Vercel-only failure must not be classified as a primary NEO outage.", Color.rgb(75,220,170));
                Button back = button("BACK"); back.setOnClickListener(v -> { chip.setText(enabled ? "ACTIVE" : "OFF"); showHome(); }); content.addView(back);
            });
        }).start();
    }

    private String compare(GuardianWorkShield.Snapshot a, GuardianWorkShield.Snapshot b) {
        if (a == null || b == null) return "baseline initialized";
        StringBuilder d = new StringBuilder();
        if (a.secureLock != b.secureLock) d.append("secureLock changed; ");
        if (a.adbEnabled != b.adbEnabled) d.append("ADB changed; ");
        if (a.developerMode != b.developerMode) d.append("developerMode changed; ");
        if (a.vpnActive != b.vpnActive) d.append("VPN changed; ");
        if (!eq(a.networkType,b.networkType)) d.append("network changed ").append(a.networkType).append("→").append(b.networkType).append("; ");
        if (!eq(a.privateDnsMode,b.privateDnsMode)) d.append("Private DNS changed; ");
        if (!eq(a.securityPatch,b.securityPatch)) d.append("security patch changed; ");
        return d.length()==0 ? "no observable posture change" : d.toString();
    }

    private void saveBaseline(GuardianWorkShield.Snapshot s) {
        try { GuardianSecureStore.put(this, BASELINE, "patch="+s.securityPatch+"; lock="+s.secureLock+"; adb="+s.adbEnabled+"; dev="+s.developerMode+"; vpn="+s.vpnActive+"; network="+s.networkType+"; dns="+s.privateDnsMode); }
        catch (Throwable ignored) {}
    }

    private void appendAudit(String event) {
        try {
            String old = GuardianSecureStore.get(this, AUDIT);
            String row = System.currentTimeMillis() + "|" + event;
            String joined = row + (old == null || old.length()==0 ? "" : "\n" + old);
            String[] lines = joined.split("\n");
            StringBuilder bounded = new StringBuilder();
            for (int i=0;i<Math.min(lines.length,40);i++) { if (i>0) bounded.append('\n'); bounded.append(lines[i]); }
            GuardianSecureStore.put(this, AUDIT, bounded.toString());
        } catch (Throwable ignored) {}
    }

    private void card(String title,String body,int color) {
        LinearLayout box = new LinearLayout(this); box.setOrientation(LinearLayout.VERTICAL); box.setPadding(dp(16),dp(14),dp(16),dp(14));
        TextView t=text(title,15,true,color); TextView b=text(body,13,false,Color.rgb(210,220,232)); b.setPadding(0,dp(6),0,0); box.addView(t); box.addView(b);
        LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-1,-2); p.setMargins(0,0,0,dp(12)); content.addView(box,p);
    }
    private Button button(String label) { Button b=new Button(this); b.setText(label); LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-1,dp(54)); p.setMargins(0,0,0,dp(12)); b.setLayoutParams(p); return b; }
    private TextView text(String s,int size,boolean bold,int color){TextView v=new TextView(this);v.setText(s);v.setTextSize(size);v.setTextColor(color);if(bold)v.setTypeface(null,1);return v;}
    private int dp(int v){return Math.round(v*getResources().getDisplayMetrics().density);}
    private boolean eq(String a,String b){return a==null?b==null:a.equals(b);}
}
