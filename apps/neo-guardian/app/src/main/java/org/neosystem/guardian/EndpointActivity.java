package org.neosystem.guardian;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.provider.Settings;
import android.view.Gravity;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import java.util.UUID;

/**
 * NEO Endpoint v3.4 developer-security console.
 *
 * This is deliberately not an ADB client or unrestricted remote shell. It observes
 * Android-exposed debugging posture, records a bounded user-approved development
 * session, and routes the user to Android's own authorization UI.
 */
public final class EndpointActivity extends Activity {
    private static final String ENDPOINT_ID = "endpoint_id_v1";
    private static final String DEV_SESSION_UNTIL = "endpoint_dev_session_until_v1";
    private static final long DEV_SESSION_MS = 2L * 60L * 60L * 1000L;

    private LinearLayout content;

    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        setContentView(shell());
        render();
    }

    @Override protected void onResume() {
        super.onResume();
        if (content != null) render();
    }

    private ScrollView shell() {
        ScrollView scroll = new ScrollView(this);
        content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setPadding(dp(18), dp(22), dp(18), dp(30));
        content.setBackgroundColor(Color.rgb(6, 9, 14));
        scroll.addView(content);
        return scroll;
    }

    private void render() {
        content.removeAllViews();
        TextView title = text("NEO Endpoint v3.4", 26, true, Color.WHITE);
        content.addView(title);
        content.addView(text("Protected Android enrollment • local-first • explicit authorization", 13, false, Color.rgb(153,168,187)));

        String endpointId = endpointId();
        boolean usb = globalEnabled(Settings.Global.ADB_ENABLED);
        boolean wireless = globalEnabled("adb_wifi_enabled");
        boolean dev = globalEnabled(Settings.Global.DEVELOPMENT_SETTINGS_ENABLED);
        long until = readLong(DEV_SESSION_UNTIL);
        boolean approved = until > System.currentTimeMillis();
        String state = state(dev, usb, wireless, approved);

        card("ENDPOINT ID", endpointId + "\nThis random NEO identifier is not a MAC address, IP address, password, or Android hardware credential.", Color.rgb(105,169,255));
        card("ENDPOINT STATE", state + "\nDeveloper options: " + onOff(dev) + "\nUSB debugging: " + onOff(usb) + "\nWireless debugging: " + onOff(wireless) + "\nApproved NEO dev session: " + (approved ? "ACTIVE" : "NONE"), state.equals("WARNING") ? Color.rgb(255,184,77) : Color.rgb(75,220,170));

        Button start = button("START 2-HOUR NEO DEV SESSION");
        start.setOnClickListener(v -> {
            GuardianSecureStore.put(this, DEV_SESSION_UNTIL, Long.toString(System.currentTimeMillis() + DEV_SESSION_MS));
            GuardianAuditChain.append(this, "INFO|OBSERVATION|User started bounded NEO development session");
            Toast.makeText(this, "NEO development session approved for 2 hours.", Toast.LENGTH_LONG).show();
            render();
        });
        content.addView(start);

        Button end = button("END NEO DEV SESSION");
        end.setOnClickListener(v -> {
            GuardianSecureStore.put(this, DEV_SESSION_UNTIL, "0");
            GuardianAuditChain.append(this, "INFO|OBSERVATION|User ended NEO development session");
            Toast.makeText(this, "Session ended. Turn USB/Wireless debugging off unless you still need it.", Toast.LENGTH_LONG).show();
            render();
        });
        content.addView(end);

        Button wirelessSettings = button("OPEN WIRELESS DEBUGGING SETTINGS");
        wirelessSettings.setOnClickListener(v -> openWirelessDebugging());
        content.addView(wirelessSettings);

        Button developerSettings = button("OPEN DEVELOPER OPTIONS");
        developerSettings.setOnClickListener(v -> safeStart(new Intent(Settings.ACTION_APPLICATION_DEVELOPMENT_SETTINGS)));
        content.addView(developerSettings);

        card("AUTHORIZED HOSTS", "ADB pairing remains under Android's own cryptographic authorization. Guardian does not collect the six-digit pairing code or ADB private keys. Host enrollment records should contain only a NEO endpoint ID, a public-key fingerprint, approval time, and optional label.", Color.rgb(105,169,255));
        card("PAIRING RULE", "Type the temporary six-digit code only into the authorized ADB host when adb pair prompts for it. Do not paste the code into chat, source control, tickets, or NEO telemetry.", Color.rgb(75,220,170));
        card("LIMITS", "A normal Android app cannot enumerate every ADB host key or silently control Developer Options. NEO Endpoint therefore observes Android-exposed state and keeps Android's authorization boundary intact.", Color.rgb(153,168,187));
    }

    private String state(boolean dev, boolean usb, boolean wireless, boolean approved) {
        if ((usb || wireless) && !approved) return "WARNING";
        if (approved && (usb || wireless)) return "DEV_SESSION";
        return "NORMAL";
    }

    private boolean globalEnabled(String key) {
        try { return Settings.Global.getInt(getContentResolver(), key, 0) == 1; }
        catch (Throwable ignored) { return false; }
    }

    private String endpointId() {
        String id = GuardianSecureStore.get(this, ENDPOINT_ID);
        if (id == null || id.isEmpty()) {
            id = "neo:endpoint:" + UUID.randomUUID();
            GuardianSecureStore.put(this, ENDPOINT_ID, id);
            GuardianAuditChain.append(this, "INFO|OBSERVATION|Generated local NEO endpoint identifier");
        }
        return id;
    }

    private long readLong(String key) {
        try { String v = GuardianSecureStore.get(this, key); return v == null ? 0L : Long.parseLong(v); }
        catch (Throwable ignored) { return 0L; }
    }

    private void openWirelessDebugging() {
        try {
            Intent specific = new Intent("android.settings.WIRELESS_DEBUGGING_SETTINGS");
            startActivity(specific);
        } catch (Throwable ignored) {
            safeStart(new Intent(Settings.ACTION_APPLICATION_DEVELOPMENT_SETTINGS));
        }
    }

    private void safeStart(Intent i) {
        try { startActivity(i); }
        catch (Throwable t) { Toast.makeText(this, "Android does not expose that settings page on this build.", Toast.LENGTH_LONG).show(); }
    }

    private void card(String title, String body, int accent) {
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setPadding(dp(15), dp(13), dp(15), dp(13));
        TextView t = text(title, 14, true, accent);
        TextView b = text(body, 13, false, Color.rgb(210,220,232));
        b.setPadding(0, dp(6), 0, 0);
        box.addView(t); box.addView(b);
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(-1, -2);
        p.setMargins(0, dp(12), 0, 0);
        content.addView(box, p);
    }

    private Button button(String label) {
        Button b = new Button(this);
        b.setText(label);
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(-1, dp(54));
        p.setMargins(0, dp(12), 0, 0);
        b.setLayoutParams(p);
        return b;
    }

    private TextView text(String value, int size, boolean bold, int color) {
        TextView v = new TextView(this);
        v.setText(value); v.setTextSize(size); v.setTextColor(color);
        if (bold) v.setTypeface(null, 1);
        v.setGravity(Gravity.START);
        return v;
    }

    private String onOff(boolean value) { return value ? "ON" : "OFF"; }
    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }
}
