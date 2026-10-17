package org.holytemples.neominer;
import android.app.*; import android.os.*; import android.content.*; import android.graphics.Color; import android.view.*; import android.widget.*; import java.security.*; import java.nio.charset.StandardCharsets; import java.util.concurrent.atomic.AtomicBoolean;
public class MainActivity extends Activity {
 private TextView status, stats; private Button start, stop; private final AtomicBoolean running=new AtomicBoolean(false); private Thread worker; private long hashes=0; private long started=0;
 private TextView text(String s,int size){TextView t=new TextView(this);t.setText(s);t.setTextSize(size);t.setTextColor(Color.WHITE);t.setPadding(8,14,8,14);return t;}
 private void update(String message){runOnUiThread(()->{status.setText(message);stats.setText("SHA-256 samples: "+hashes+"\nRuntime: "+((System.currentTimeMillis()-started)/1000)+" seconds\nBTC earned: Not available — benchmark only");});}
 private int battery(){Intent i=registerReceiver(null,new IntentFilter(Intent.ACTION_BATTERY_CHANGED));if(i==null)return -1;int level=i.getIntExtra(BatteryManager.EXTRA_LEVEL,-1),scale=i.getIntExtra(BatteryManager.EXTRA_SCALE,-1);return scale>0?level*100/scale:-1;}
 private int thermal(){PowerManager pm=(PowerManager)getSystemService(POWER_SERVICE);return android.os.Build.VERSION.SDK_INT>=29?pm.getCurrentThermalStatus():0;}
 private void startBenchmark(){if(!running.compareAndSet(false,true))return;hashes=0;started=System.currentTimeMillis();start.setEnabled(false);stop.setEnabled(true);
 worker=new Thread(()->{try{MessageDigest digest=MessageDigest.getInstance("SHA-256");byte[] buf="NEO Miner device benchmark (no Bitcoin pool submissions)".getBytes(StandardCharsets.UTF_8);
 while(running.get()){int b=battery();int th=thermal();if((b>=0 && b<25)||th>=PowerManager.THERMAL_STATUS_SEVERE){update("Stopped automatically: battery or thermal safety limit");break;}
 for(int k=0;k<1500&&running.get();k++){digest.update(buf);digest.update((byte)(hashes&255));digest.digest();hashes++;}
 if(hashes%15000==0)update("Local SHA-256 benchmark running — not mining BTC");
 try{Thread.sleep(12);}catch(InterruptedException e){break;}
 }
 }catch(Exception e){update("Benchmark error: "+e.getMessage());}finally{running.set(false);runOnUiThread(()->{start.setEnabled(true);stop.setEnabled(false);});}}, "neo-benchmark");worker.start();}
 public void onCreate(Bundle b){super.onCreate(b);getWindow().setStatusBarColor(Color.rgb(13,35,29)); LinearLayout root=new LinearLayout(this);root.setOrientation(1);root.setPadding(28,28,28,28);root.setBackgroundColor(Color.rgb(11,29,26));
 ScrollView scroll=new ScrollView(this);scroll.addView(root);setContentView(scroll);
 TextView title=text("NEO MINER + GENERATOR",25);title.setTextColor(Color.rgb(89,231,176));root.addView(title);
 root.addView(text("Bitcoin-native mobile mining control | Gate 011",15));
 root.addView(text("DEVICE STATUS",18));status=text("Ready • Local benchmark only",16);root.addView(status);
 stats=text("Battery: "+battery()+"%\nThermal status: "+thermal()+"\nBTC earned: Not available",15);root.addView(stats);
 start=new Button(this);start.setText("START SHA-256 BENCHMARK");root.addView(start);start.setOnClickListener(v->startBenchmark());
 stop=new Button(this);stop.setText("STOP BENCHMARK");stop.setEnabled(false);root.addView(stop);stop.setOnClickListener(v->{running.set(false);status.setText("Stopping benchmark…");});
 root.addView(text("NEO GENERATOR",18));root.addView(text("Energy generation: not connected\nRemote workers: not connected\nNEO Pass: enrollment pending\nPool shares and payouts: not verified",15));
 root.addView(text("Device safeguards: stops below 25% battery or at severe Android thermal status. Never submits hashes to a Bitcoin pool. No wallet keys or BTC transfer capability.",13));
 } public void onDestroy(){running.set(false);super.onDestroy();}
}