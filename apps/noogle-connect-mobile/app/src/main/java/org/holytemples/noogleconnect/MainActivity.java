package org.holytemples.noogleconnect;

import android.app.Activity;
import android.os.Bundle;
import android.os.Build;
import android.content.Intent;
import android.net.Uri;
import android.graphics.Typeface;
import android.view.View;
import android.widget.*;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.concurrent.Executors;

public final class MainActivity extends Activity {
  private final java.util.concurrent.ExecutorService worker=Executors.newSingleThreadExecutor();
  private TextView output;
  private EditText command;
  @Override public void onCreate(Bundle state) {
    super.onCreate(state);
    LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setPadding(28,35,28,20);root.setBackgroundColor(0xff071b17);
    TextView header=text("Noogle Connect Mobile",24);root.addView(header);
    TextView note=text("NEO Device Companion · Local Terminal\nRemote access requires future NEO Pass authorization.",14);root.addView(note);
    Button web=new Button(this);web.setText("Open Noogle Connect");root.addView(web);
    web.setOnClickListener(v->startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse("https://connect.holytemples.org/"))));
    Button neoTele=new Button(this);neoTele.setText("NeoTele eSIM / Network Diagnostics");root.addView(neoTele);neoTele.setOnClickListener(v->startActivity(new Intent(this,NeoTeleDiagnosticsActivity.class)));
    Button status=new Button(this);status.setText("Check this device");root.addView(status);
    Button enrollment=new Button(this);enrollment.setText("NEO Pass enrollment status");root.addView(enrollment);
    enrollment.setOnClickListener(v->checkEnrollmentStatus());
    status.setOnClickListener(v->output.setText("Android "+Build.VERSION.RELEASE+" · "+Build.MANUFACTURER+" "+Build.MODEL+"\nNative companion installed. NEO Pass remote enrollment is not active."));
    command=new EditText(this);command.setSingleLine(true);command.setTextColor(0xffffffff);command.setHintTextColor(0xffa6c6b3);command.setHint("Local command (runs on this phone)");root.addView(command);
    Button run=new Button(this);run.setText("Run local terminal command");root.addView(run);
    output=text("No remote commands accepted. Local terminal is on-device only.",14);output.setTypeface(Typeface.MONOSPACE);ScrollView sc=new ScrollView(this);sc.addView(output);root.addView(sc,new LinearLayout.LayoutParams(-1,0,1));
    run.setOnClickListener(v->{String cmd=command.getText().toString().trim();if(cmd.isEmpty())return;output.setText("Running local command…");worker.execute(()->{
      StringBuilder result=new StringBuilder();try {
        // Android app sandbox shell; no root, Termux packages or remote executor.
        Process process=new ProcessBuilder("/system/bin/sh","-c",cmd).redirectErrorStream(true).start();
        try(BufferedReader reader=new BufferedReader(new InputStreamReader(process.getInputStream()))) {
          String line;int size=0;while((line=reader.readLine())!=null && size<16000){result.append(line).append('\n');size+=line.length();}
        }
        result.append("\nExit status: ").append(process.waitFor());
      }catch(Exception e){result.append(e.getClass().getSimpleName()).append(": ").append(e.getMessage());}
      runOnUiThread(()->output.setText(result.toString()));
    });});
    setContentView(root);
  }
  // Read-only endpoint check. No credential or terminal execution is accepted from network.
  private void checkEnrollmentStatus() {
    output.setText("Checking NEO Pass availability…");
    worker.execute(()->{
      String result;
      try {
        java.net.URL endpoint=new java.net.URL("https://neopass.holytemples.org/");
        java.net.HttpURLConnection connection=(java.net.HttpURLConnection)endpoint.openConnection();
        connection.setConnectTimeout(7000);connection.setReadTimeout(7000);
        connection.setInstanceFollowRedirects(false);
        int status=connection.getResponseCode();connection.disconnect();
        result=(status>=200&&status<400)
          ?"NEO Pass service reachable (HTTP "+status+"). Identity verification and agent enrollment are not configured."
          :"NEO Pass unavailable (HTTP "+status+"). No device enrollment performed.";
      }catch(Exception e){result="NEO Pass not reachable. No device enrollment performed.";}
      final String message=result;
      runOnUiThread(()->output.setText(message));
    });
  }
  private TextView text(String s,int size){TextView v=new TextView(this);v.setText(s);v.setTextColor(0xffeafaf0);v.setTextSize(size);v.setPadding(2,8,2,16);return v;}
  @Override public void onDestroy(){worker.shutdownNow();super.onDestroy();}
}
