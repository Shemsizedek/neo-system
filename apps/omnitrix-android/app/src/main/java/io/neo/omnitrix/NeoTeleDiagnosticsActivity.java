package io.neo.omnitrix;

import android.app.Activity;
import android.os.Bundle;
import android.graphics.Color;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import org.json.JSONObject;

/** NTEL-018 first-device diagnostics screen: opt-in, read-only and local-only. */
public final class NeoTeleDiagnosticsActivity extends Activity {
  private LinearLayout root;
  private CheckBox consent;
  @Override public void onCreate(Bundle state) {
    super.onCreate(state);
    ScrollView scroll=new ScrollView(this);
    root=new LinearLayout(this);
    root.setOrientation(LinearLayout.VERTICAL);
    root.setPadding(24,24,24,24);
    root.setBackgroundColor(Color.rgb(1,12,8));
    scroll.addView(root);
    TextView header=new TextView(this);
    header.setText("NeoTele · First Device Diagnostics");
    header.setTextColor(Color.WHITE);
    header.setTextSize(21);
    root.addView(header);
    TextView notice=new TextView(this);
    notice.setText("Local device checks only. No carrier activation, eSIM installation or data upload. Your consent is required before reading network state.");
    notice.setTextColor(Color.LTGRAY);
    root.addView(notice);
    consent=new CheckBox(this);
    consent.setText("I authorize this one-time local diagnostics check");
    consent.setTextColor(Color.WHITE);
    root.addView(consent);
    Button check=new Button(this);
    check.setText("CHECK THIS PHONE");
    root.addView(check);
    final TextView results=new TextView(this);
    results.setTextColor(Color.rgb(150,255,180));
    results.setText("No diagnostics collected.");
    root.addView(results);
    check.setOnClickListener(v->{
      if(!consent.isChecked()){results.setText("Consent required.");return;}
      try{
        JSONObject reading=NeoTeleDiagnostics.snapshot(this,true);
        results.setText("eSIM enabled: "+reading.optBoolean("esimEnabled")+"\nNetwork: "+reading.optString("transport")+"\nInternet validated: "+reading.optBoolean("validated")+"\nCarrier activation: disabled");
      }catch(Exception error){results.setText("Diagnostics unavailable on this device.");}
    });
    setContentView(scroll);
  }
}
