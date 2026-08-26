package io.neo.omnitrix;

import android.app.*;
import android.content.*;
import android.graphics.Color;
import android.os.Bundle;
import android.text.InputType;
import android.view.*;
import android.widget.*;

/** Secure entry boundary for the NEO-0001 profile. */
public class XcpKeyActivity extends Activity {
    private static final int REQ_UNLOCK = 1441;
    private static final int REQ_IMPORT = 1442;
    private XcpKeyVault vault;
    private TextView status;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.BLACK);
        getWindow().setNavigationBarColor(Color.BLACK);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
        vault = new XcpKeyVault(this);
        buildUi();
    }

    private void buildUi() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER_HORIZONTAL);
        root.setPadding(dp(24), dp(42), dp(24), dp(28));
        root.setBackgroundColor(Color.rgb(1,5,3));

        ImageView logo = new ImageView(this);
        logo.setImageResource(R.drawable.omnitrix_logo);
        logo.setScaleType(ImageView.ScaleType.CENTER_CROP);
        root.addView(logo, new LinearLayout.LayoutParams(dp(112), dp(112)));

        TextView title = text("OMNITRIX", 28, Color.rgb(225,255,234));
        title.setGravity(Gravity.CENTER); title.setPadding(0,dp(16),0,dp(4)); root.addView(title);
        TextView profile = text("NEO-0001 · Founding Profile", 13, Color.rgb(113,170,132)); profile.setGravity(Gravity.CENTER); root.addView(profile);

        status = text("", 15, Color.rgb(202,255,217)); status.setGravity(Gravity.CENTER); status.setPadding(0,dp(28),0,dp(20)); root.addView(status);

        Button primary = button(vault.hasKey() ? "UNLOCK WITH XCP KEY" : "SECURE MY XCP KEY");
        primary.setOnClickListener(v -> {
            if (vault.hasKey()) authenticate(REQ_UNLOCK);
            else authenticate(REQ_IMPORT);
        });
        root.addView(primary, new LinearLayout.LayoutParams(-1, dp(54)));

        Button watch = secondary("CONTINUE WITHOUT XCP KEY");
        LinearLayout.LayoutParams wlp = new LinearLayout.LayoutParams(-1, dp(50)); wlp.setMargins(0,dp(10),0,0); root.addView(watch,wlp);
        watch.setOnClickListener(v -> openBrowser());

        if (vault.hasKey()) {
            Button forget = secondary("REMOVE XCP KEY FROM THIS DEVICE");
            LinearLayout.LayoutParams flp = new LinearLayout.LayoutParams(-1, dp(48)); flp.setMargins(0,dp(10),0,0); root.addView(forget,flp);
            forget.setOnClickListener(v -> new AlertDialog.Builder(this)
                    .setTitle("Remove secured XCP Key?")
                    .setMessage("This removes the encrypted key material from this device. It does not affect your Bitcoin/Counterparty address or blockchain assets.")
                    .setPositiveButton("Remove", (d,w) -> { vault.forget(); recreate(); })
                    .setNegativeButton("Cancel", null).show());
        }

        TextView note = text("Your XCP Key is encrypted by Android Keystore and never sent to Noogle, GitHub, Counterparty APIs, or a web page. Never paste an XCP Key into chat or a website.", 12, Color.rgb(111,139,121));
        note.setGravity(Gravity.CENTER); note.setPadding(dp(6),dp(24),dp(6),0); root.addView(note);
        setContentView(root);
        updateStatus();
    }

    private void updateStatus() {
        if (vault.hasKey()) {
            String fp = vault.fingerprint();
            status.setText("XCP Key secured on this device" + (fp.isEmpty()?"":"\nVault fingerprint: "+fp));
        } else status.setText("Secure your Bitcoin / Counterparty XCP Key locally to activate protected profile access.");
    }

    private void authenticate(int requestCode) {
        KeyguardManager km = (KeyguardManager)getSystemService(KEYGUARD_SERVICE);
        if (km == null || !km.isDeviceSecure()) {
            new AlertDialog.Builder(this).setTitle("Device lock required")
                    .setMessage("Set a PIN, password, pattern, or supported biometric on Android before securing an XCP Key.")
                    .setPositiveButton("OK", null).show();
            return;
        }
        Intent intent = km.createConfirmDeviceCredentialIntent("Unlock Omnitrix", "Confirm your device identity for NEO-0001");
        if (intent != null) startActivityForResult(intent, requestCode);
        else onAuthenticated(requestCode);
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (resultCode == RESULT_OK) onAuthenticated(requestCode);
        else Toast.makeText(this,"Omnitrix remained locked",Toast.LENGTH_SHORT).show();
    }

    private void onAuthenticated(int requestCode) {
        if (requestCode == REQ_IMPORT) showImportDialog();
        else if (requestCode == REQ_UNLOCK) {
            try {
                vault.verifyUnlocked();
                openBrowser();
            } catch (Exception e) {
                status.setText("XCP Key vault could not unlock. Re-authenticate or re-import the key on this device.");
            }
        }
    }

    private void showImportDialog() {
        LinearLayout box = new LinearLayout(this); box.setOrientation(LinearLayout.VERTICAL); box.setPadding(dp(20),dp(8),dp(20),0);
        TextView help = text("Enter your mainnet Bitcoin/Counterparty XCP Key (WIF). It is encrypted immediately and is never transmitted.", 13, Color.DKGRAY); box.addView(help);
        EditText key = new EditText(this);
        key.setHint("XCP Key"); key.setSingleLine(true);
        key.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
        key.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS);
        box.addView(key, new LinearLayout.LayoutParams(-1,dp(56)));
        AlertDialog dialog = new AlertDialog.Builder(this).setTitle("Secure XCP Key").setView(box)
                .setPositiveButton("Secure", null).setNegativeButton("Cancel", null).create();
        dialog.setOnShowListener(d -> dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v -> {
            char[] value = key.getText().toString().toCharArray();
            key.setText("");
            try {
                vault.importXcpKey(value);
                dialog.dismiss();
                Toast.makeText(this,"XCP Key secured",Toast.LENGTH_SHORT).show();
                recreate();
            } catch (android.security.keystore.UserNotAuthenticatedException e) {
                status.setText("Android requires authentication again before the vault can be written.");
                dialog.dismiss(); authenticate(REQ_IMPORT);
            } catch (Exception e) {
                new AlertDialog.Builder(this).setTitle("XCP Key not accepted").setMessage(e.getMessage()==null?"Invalid XCP Key":e.getMessage()).setPositiveButton("OK",null).show();
            }
        }));
        dialog.getWindow(); dialog.show();
    }

    private void openBrowser() {
        Intent i = new Intent(this, MainActivityV14.class);
        i.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        startActivity(i);
    }

    private TextView text(String s,float size,int color){TextView t=new TextView(this);t.setText(s);t.setTextSize(size);t.setTextColor(color);return t;}
    private Button button(String s){Button b=new Button(this);b.setText(s);b.setTextColor(Color.rgb(0,24,9));b.setTextSize(14);b.setAllCaps(false);b.setBackgroundColor(Color.rgb(101,255,138));return b;}
    private Button secondary(String s){Button b=new Button(this);b.setText(s);b.setTextColor(Color.rgb(180,235,197));b.setTextSize(12);b.setAllCaps(false);b.setBackgroundColor(Color.rgb(7,26,16));return b;}
    private int dp(int v){return (int)(v*getResources().getDisplayMetrics().density+.5f);}
}
