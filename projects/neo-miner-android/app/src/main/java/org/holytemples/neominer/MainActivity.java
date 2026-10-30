package org.holytemples.neominer;

import android.app.Activity;
import android.os.Bundle;
import android.os.BatteryManager;
import android.os.PowerManager;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.Context;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.view.View;
import android.view.Gravity;
import android.widget.*;
import java.nio.ByteBuffer;
import java.security.MessageDigest;
import java.util.concurrent.atomic.AtomicBoolean;

public class MainActivity extends Activity {
  private static final int BG=0xff071c18, PANEL=0xff12312b, GREEN=0xff55e7b0, MUTED=0xffafc7bd, WHITE=0xfff4fff9;
  private final AtomicBoolean running=new AtomicBoolean(false);
  private volatile long count=0, started=0;
  private volatile String state="Ready";
  private LinearLayout root, page, navigation;
  private TextView metric, indicator;
  private Button begin, end;
  private android.os.Handler timer=new android.os.Handler(android.os.Looper.getMainLooper());
  private int tab=0;
  private int dp(float v){return (int)(getResources().getDisplayMetrics().density*v+0.5f);}
  private GradientDrawable panel(int color,int radius){GradientDrawable d=new GradientDrawable();d.setColor(color);d.setCornerRadius(dp(radius));return d;}
  private TextView txt(String s,int sp,int color,boolean bold){TextView t=new TextView(this);t.setText(s);t.setTextColor(color);t.setTextSize(sp);if(bold)t.setTypeface(Typeface.DEFAULT,Typeface.BOLD);return t;}
  private LinearLayout column(){LinearLayout l=new LinearLayout(this);l.setOrientation(1);return l;}
  private void pad(View v,int x,int y){v.setPadding(dp(x),dp(y),dp(x),dp(y));}
  private void add(LinearLayout to,View v,int bottom){LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-1,-2);p.bottomMargin=dp(bottom);to.addView(v,p);}
  private LinearLayout card(){LinearLayout c=column();pad(c,18,16);c.setBackground(panel(PANEL,18));return c;}
  private void label(LinearLayout c,String title,String value){add(c,txt(title,12,MUTED,false),7);add(c,txt(value,18,WHITE,true),0);}
  private int battery(){Intent i=registerReceiver(null,new IntentFilter(Intent.ACTION_BATTERY_CHANGED));if(i==null)return -1;int a=i.getIntExtra(BatteryManager.EXTRA_LEVEL,-1),b=i.getIntExtra(BatteryManager.EXTRA_SCALE,-1);return b>0?a*100/b:-1;}
  private int thermal(){PowerManager p=(PowerManager)getSystemService(Context.POWER_SERVICE);return android.os.Build.VERSION.SDK_INT>=29?p.getCurrentThermalStatus():0;}
  private Button button(String caption,boolean bright){Button b=new Button(this);b.setText(caption);b.setTextColor(bright?BG:WHITE);b.setAllCaps(false);b.setTextSize(15);b.setBackground(panel(bright?GREEN:0xff245047,13));return b;}
  private void render(){
    LinearLayout shell=column();shell.setBackgroundColor(BG);setContentView(shell);
    TextView heading=txt("NEO   /   MINER + GENERATOR",19,GREEN,true);pad(heading,20,20);add(shell,heading,0);
    ScrollView scroll=new ScrollView(this);page=column();pad(page,18,8);scroll.setFillViewport(true);scroll.addView(page);shell.addView(scroll,new LinearLayout.LayoutParams(-1,0,1));
    if(tab==0) dashboard(); else if(tab==1) miner(); else if(tab==2) generator(); else security();
    navigation=new LinearLayout(this);navigation.setBackgroundColor(0xff0d2822);String[] names={"Overview","Miner","Generator","Security"};
    for(int i=0;i<4;i++){final int n=i;TextView t=txt(names[i],12,i==tab?GREEN:MUTED,i==tab);t.setGravity(Gravity.CENTER);pad(t,4,18);navigation.addView(t,new LinearLayout.LayoutParams(0,-2,1));t.setOnClickListener(v->{tab=n;render();});}shell.addView(navigation);
  }
  private void dashboard(){
    add(page,txt("Operations overview",27,WHITE,true),5);
    add(page,txt("Bitcoin-native monitoring  •  Device benchmark",13,MUTED,false),22);
    LinearLayout c=card();add(c,txt("DEVICE HEALTH",12,GREEN,true),13);label(c,"Battery",battery()+"%");add(c,txt("Thermal status: "+thermal()+"   •   "+(running.get()?"Benchmark running":"Standby"),14,MUTED,false),0);add(page,c,14);
    c=card();add(c,txt("LOCAL COMPUTE",12,GREEN,true),12);metric=txt("0 H/s",28,WHITE,true);add(c,metric,4);indicator=txt("SHA-256 benchmark only — no BTC earned",13,MUTED,false);add(c,indicator,0);add(page,c,14);
    c=card();add(c,txt("WORKER CONNECTIONS",12,GREEN,true),12);add(c,txt("Not connected",19,WHITE,true),8);add(c,txt("No live Bitcoin pool or external mining worker has been authenticated.",13,MUTED,false),0);add(page,c,16);
    Button b=button("Open miner controls",true);add(page,b,10);b.setOnClickListener(v->{tab=1;render();});updateMetrics();
  }
  private void miner(){
    add(page,txt("Local miner",28,WHITE,true),6);add(page,txt("Opt-in SHA-256 device performance test",14,MUTED,false),18);
    LinearLayout c=card();add(c,txt("COMPUTE RATE",12,GREEN,true),12);metric=txt("0 H/s",30,WHITE,true);add(c,metric,5);indicator=txt(state,14,MUTED,false);add(c,indicator,0);add(page,c,16);
    begin=button("Start benchmark",true);begin.setEnabled(!running.get());add(page,begin,10);begin.setOnClickListener(v->startBenchmark());
    end=button("Stop benchmark",false);end.setEnabled(running.get());add(page,end,18);end.setOnClickListener(v->{running.set(false);state="Stopped by user";updateMetrics();});
    c=card();add(c,txt("SAFETY LIMITS",12,GREEN,true),10);add(c,txt("Automatic stop below 25% battery or at severe thermal status. No background mining. No pool submissions.",14,WHITE,false),0);add(page,c,14);
    updateMetrics();
  }
  private void generator(){
    add(page,txt("NEO Generator",28,WHITE,true),6);add(page,txt("Power, capacity and production visibility",14,MUTED,false),18);
    LinearLayout c=card();label(c,"Energy generation","Not connected");add(c,txt("The phone cannot generate electricity by running the SHA-256 benchmark.",13,MUTED,false),0);add(page,c,14);
    c=card();label(c,"Remote mining capacity","Not connected");add(c,txt("A verified gateway and mining worker API are required.",13,MUTED,false),0);add(page,c,14);
    c=card();label(c,"Pool-confirmed earnings","Unavailable");add(c,txt("No estimated BTC balances are presented as verified payouts.",13,MUTED,false),0);add(page,c,14);
  }
  private void security(){
    add(page,txt("Security & access",28,WHITE,true),6);add(page,txt("Device protection and verified connections",14,MUTED,false),18);
    LinearLayout c=card();label(c,"NEO Pass","Enrollment pending");add(c,txt("Authentication is not active in this build.",13,MUTED,false),0);add(page,c,14);
    c=card();label(c,"Wallet / seed access","None");add(c,txt("This application does not request wallet credentials or store seed phrases.",13,MUTED,false),0);add(page,c,14);
    c=card();label(c,"Build","0.12.0 • Development");add(c,txt("Local benchmark only. Do not interpret the hash count as submitted Bitcoin shares.",13,MUTED,false),0);add(page,c,14);
  }
  private void updateMetrics(){if(metric==null)return;long sec=Math.max(1,(System.currentTimeMillis()-started)/1000);metric.setText((running.get()?count/sec:0)+" H/s");if(indicator!=null)indicator.setText(state+(running.get()?" • "+count+" hashes":""));}
  private void startBenchmark(){
    if(!running.compareAndSet(false,true))return;
    count=0;started=System.currentTimeMillis();state="Running";render();
    new Thread(()->{try{MessageDigest sha=MessageDigest.getInstance("SHA-256");byte[] input=ByteBuffer.allocate(32).array();while(running.get()){
      int b=battery(),t=thermal();if((b>=0&&b<25)||t>=5){state="Stopped for battery or temperature safety";break;}
      for(int i=0;i<1000&&running.get();i++){input[0]=(byte)(count&255);input[1]=(byte)((count>>8)&255);sha.digest(input);count++;}
      try{Thread.sleep(15);}catch(InterruptedException e){break;}
    }}catch(Exception ex){state="Benchmark error";}finally{running.set(false);runOnUiThread(()->render());}},"neo-sha256-benchmark").start();
  }
  @Override public void onCreate(Bundle saved){super.onCreate(saved);getWindow().setStatusBarColor(BG);getWindow().setNavigationBarColor(BG);render();timer.post(new Runnable(){public void run(){updateMetrics();timer.postDelayed(this,1000);}});}
  @Override protected void onDestroy(){running.set(false);timer.removeCallbacksAndMessages(null);super.onDestroy();}
}
