package org.holytemples.noogleconnect;

import android.app.Activity;
import android.os.Bundle;
import android.content.Context;
import android.graphics.Color;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.telephony.euicc.EuiccManager;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

/** NTEL-022: user-initiated local diagnostics only. No remote commands or carrier management. */
public final class NeoTeleDiagnosticsActivity extends Activity {
 @Override public void onCreate(Bundle state){
  super.onCreate(state);
  LinearLayout content=new LinearLayout(this);
  content.setOrientation(LinearLayout.VERTICAL);
  content.setPadding(28,32,28,28);
  content.setBackgroundColor(0xff071b17);
  TextView title=new TextView(this);
  title.setText("NeoTele · First Phone Check");title.setTextSize(22);title.setTextColor(Color.WHITE);content.addView(title);
  TextView note=new TextView(this);
  note.setText("This reads local eSIM capability and network connectivity only. It does not install, activate, download or control an eSIM. Nothing is uploaded.");
  note.setTextColor(Color.LTGRAY);content.addView(note);
  CheckBox consent=new CheckBox(this);
  consent.setText("I approve this one-time local diagnostic check");
  consent.setTextColor(Color.WHITE);content.addView(consent);
  Button button=new Button(this);button.setText("CHECK THIS PHONE");content.addView(button);
  TextView result=new TextView(this);result.setTextColor(0xffa6f9ba);result.setText("No diagnostics collected.");content.addView(result);
  button.setOnClickListener(view->{
   if(!consent.isChecked()){result.setText("Consent required.");return;}
   try{
    EuiccManager esim=(EuiccManager)getSystemService(Context.EUICC_SERVICE);
    boolean enabled=esim!=null&&esim.isEnabled();
    ConnectivityManager manager=(ConnectivityManager)getSystemService(Context.CONNECTIVITY_SERVICE);
    Network active=manager==null?null:manager.getActiveNetwork();
    NetworkCapabilities capabilities=active==null?null:manager.getNetworkCapabilities(active);
    String network="NONE";
    if(capabilities!=null){
     if(capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR))network="CELLULAR";
     else if(capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI))network="WIFI";
    }
    boolean internet=capabilities!=null&&capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED);
    result.setText("eSIM enabled: "+enabled+"\nNetwork: "+network+"\nInternet validated: "+internet+"\nExternal carrier enrollment: required\nNeoTele activation: disabled");
   }catch(RuntimeException exception){result.setText("Local diagnostics unavailable on this device.");}
  });
  ScrollView scroll=new ScrollView(this);scroll.addView(content);setContentView(scroll);
 }
}
