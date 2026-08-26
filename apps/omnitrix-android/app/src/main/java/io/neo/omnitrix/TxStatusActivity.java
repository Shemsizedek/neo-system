package io.neo.omnitrix;

import android.app.*;
import android.graphics.Color;
import android.os.Bundle;
import android.view.*;
import android.widget.*;
import org.json.JSONObject;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.*;

/** Read-only Bitcoin transaction tracker. Accepts a public TXID only. */
public class TxStatusActivity extends Activity {
    private final ExecutorService io=Executors.newSingleThreadExecutor();
    private EditText txid; private TextView status; private Button check;
    @Override public void onCreate(Bundle s){super.onCreate(s);getWindow().setStatusBarColor(Color.BLACK);getWindow().setNavigationBarColor(Color.BLACK);buildUi();}
    private void buildUi(){LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setPadding(dp(20),dp(24),dp(20),dp(30));root.setBackgroundColor(Color.rgb(1,5,3));ImageView logo=new ImageView(this);logo.setImageResource(R.drawable.omnitrix_logo);root.addView(logo,new LinearLayout.LayoutParams(dp(72),dp(72)));root.addView(text("TRANSACTION STATUS",24,Color.rgb(228,255,235)));TextView sub=text("Bitcoin / Counterparty confirmation tracker",12,Color.rgb(104,185,130));sub.setPadding(0,dp(5),0,dp(18));root.addView(sub);txid=new EditText(this);txid.setHint("Enter Bitcoin TXID");txid.setSingleLine(true);txid.setTextColor(Color.WHITE);txid.setHintTextColor(Color.rgb(95,125,105));txid.setBackgroundColor(Color.rgb(5,20,12));txid.setPadding(dp(12),0,dp(12),0);root.addView(txid,new LinearLayout.LayoutParams(-1,dp(54)));check=primary("CHECK STATUS");LinearLayout.LayoutParams cp=new LinearLayout.LayoutParams(-1,dp(52));cp.setMargins(0,dp(10),0,0);root.addView(check,cp);check.setOnClickListener(v->load());status=text("Paste a public transaction ID to check mempool/confirmation state. No keys or wallet secrets are used.",13,Color.rgb(184,218,194));status.setPadding(0,dp(18),0,dp(18));status.setTextIsSelectable(true);root.addView(status);Button back=secondary("BACK");root.addView(back,new LinearLayout.LayoutParams(-1,dp(48)));back.setOnClickListener(v->finish());setContentView(root);}
    private void load(){String id=txid.getText().toString().trim();if(!id.matches("(?i)^[0-9a-f]{64}$")){status.setText("Enter a valid 64-character Bitcoin TXID.");return;}check.setEnabled(false);status.setText("Checking Bitcoin network…");io.execute(()->{try{JSONObject j=get("https://mempool.space/api/tx/"+id+"/status");boolean c=j.optBoolean("confirmed",false);long h=j.optLong("block_height",0);long t=j.optLong("block_time",0);String out=c?"CONFIRMED\nBlock: "+h+(t>0?"\nBlock time: "+new java.util.Date(t*1000L):""):"PENDING / MEMPOOL\nTransaction is not yet confirmed.";runOnUiThread(()->{check.setEnabled(true);status.setText(out+"\n\nCounterparty parsing follows Bitcoin propagation/confirmation.");});}catch(Exception e){runOnUiThread(()->{check.setEnabled(true);status.setText("Status unavailable: "+safe(e));});}});}
    private JSONObject get(String u)throws Exception{HttpURLConnection c=(HttpURLConnection)new URL(u).openConnection();c.setConnectTimeout(15000);c.setReadTimeout(15000);c.setRequestProperty("Accept","application/json");int code=c.getResponseCode();InputStream in=code>=200&&code<300?c.getInputStream():c.getErrorStream();StringBuilder b=new StringBuilder();try(BufferedReader r=new BufferedReader(new InputStreamReader(in,StandardCharsets.UTF_8))){String s;while((s=r.readLine())!=null)b.append(s);}if(code<200||code>=300)throw new IOException("HTTP "+code);return new JSONObject(b.toString());}
    @Override protected void onDestroy(){super.onDestroy();io.shutdownNow();}
    private TextView text(String s,float z,int c){TextView t=new TextView(this);t.setText(s);t.setTextSize(z);t.setTextColor(c);return t;}
    private Button primary(String s){Button b=new Button(this);b.setText(s);b.setAllCaps(false);b.setTextColor(Color.rgb(0,22,8));b.setBackgroundColor(Color.rgb(101,255,138));return b;}
    private Button secondary(String s){Button b=new Button(this);b.setText(s);b.setAllCaps(false);b.setTextColor(Color.rgb(188,235,201));b.setBackgroundColor(Color.rgb(7,25,15));return b;}
    private int dp(int v){return(int)(v*getResources().getDisplayMetrics().density+.5f);} private String safe(Exception e){return e.getMessage()==null?e.getClass().getSimpleName():e.getMessage();}
}
