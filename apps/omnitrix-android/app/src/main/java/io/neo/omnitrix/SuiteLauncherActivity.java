package io.neo.omnitrix;

import android.app.*;
import android.content.*;
import android.graphics.Color;
import android.os.Bundle;
import android.view.*;
import android.widget.*;
import org.json.*;
import java.io.*;
import java.nio.charset.StandardCharsets;

/** Omnitrix Suit v3.0 launcher. Registry-driven, consumer-facing, and key-material free. */
public class SuiteLauncherActivity extends Activity {
    @Override public void onCreate(Bundle state){super.onCreate(state);getWindow().setStatusBarColor(Color.BLACK);getWindow().setNavigationBarColor(Color.BLACK);build();}

    private void build(){
        LinearLayout shell=new LinearLayout(this);shell.setOrientation(LinearLayout.VERTICAL);shell.setBackgroundColor(Color.rgb(1,5,3));
        ScrollView scroll=new ScrollView(this);LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setPadding(dp(16),dp(20),dp(16),dp(24));scroll.addView(root);
        LinearLayout head=new LinearLayout(this);head.setGravity(Gravity.CENTER_VERTICAL);ImageView logo=new ImageView(this);logo.setImageResource(R.drawable.omnitrix_logo);head.addView(logo,new LinearLayout.LayoutParams(dp(68),dp(68)));LinearLayout words=new LinearLayout(this);words.setOrientation(LinearLayout.VERTICAL);words.addView(text("OMNITRIX SUIT",25,Color.rgb(229,255,236)));words.addView(text("NEO-0001 · v3.0",12,Color.rgb(104,185,130)));head.addView(words);root.addView(head);
        TextView intro=text("One profile. One launcher. The full Noogle + NEO product family.",13,Color.rgb(188,224,198));intro.setPadding(0,dp(12),0,dp(16));root.addView(intro);
        try{
            JSONObject reg=new JSONObject(readAsset("omnitrix-suite.json"));JSONArray cats=reg.getJSONArray("categories");
            for(int i=0;i<cats.length();i++){JSONObject c=cats.getJSONObject(i);TextView h=text(c.getString("name").toUpperCase(),12,Color.rgb(118,255,151));h.setPadding(0,dp(18),0,dp(8));root.addView(h);JSONArray apps=c.getJSONArray("apps");for(int j=0;j<apps.length();j++){JSONObject app=apps.getJSONObject(j);root.addView(tile(app),new LinearLayout.LayoutParams(-1,dp(82)));}}
        }catch(Exception e){root.addView(text("Suite registry unavailable: "+e.getMessage(),13,Color.rgb(255,150,150)));}
        TextView policy=text("External Android software is integrated through compatible intent/API adapters. Omnitrix does not copy proprietary apps, credentials, or private APIs.",11,Color.rgb(105,145,118));policy.setPadding(0,dp(20),0,0);root.addView(policy);
        shell.addView(scroll,new LinearLayout.LayoutParams(-1,0,1f));shell.addView(OmnitrixNav.bar(this,"NEO"),new LinearLayout.LayoutParams(-1,dp(54)));setContentView(shell);
    }

    private View tile(JSONObject app)throws Exception{
        LinearLayout box=new LinearLayout(this);box.setOrientation(LinearLayout.VERTICAL);box.setPadding(dp(14),dp(10),dp(14),dp(8));box.setBackgroundColor(Color.rgb(5,20,12));
        LinearLayout line=new LinearLayout(this);line.setGravity(Gravity.CENTER_VERTICAL);TextView name=text(app.getString("name"),16,Color.rgb(222,255,230));line.addView(name,new LinearLayout.LayoutParams(0,-2,1f));String status=app.optString("status","foundation");TextView badge=text(status.equals("live")?"LIVE":status.equals("adapter")?"ADAPTER":"FOUNDATION",10,status.equals("live")?Color.rgb(101,255,138):Color.rgb(158,197,170));line.addView(badge);box.addView(line);TextView d=text(app.optString("description",""),11,Color.rgb(157,194,168));box.addView(d);box.setOnClickListener(v->open(app));return box;
    }

    private void open(JSONObject app){
        String route=app.optString("route","");String status=app.optString("status","foundation");
        if(route.equals("browser"))startActivity(new Intent(this,MainActivityV14.class));
        else if(route.equals("wallet"))startActivity(new Intent(this,WalletDashboardActivity.class));
        else if(route.equals("market"))startActivity(new Intent(this,MarketMatrixActivity.class));
        else if(route.equals("miner"))startActivity(new Intent(this,MinerControlActivity.class));
        else if(route.equals("home"))startActivity(new Intent(this,ConsumerHomeActivity.class));
        else if(status.equals("adapter"))new AlertDialog.Builder(this).setTitle(app.optString("name")).setMessage("Adapter layer registered. Omnitrix will launch compatible installed software or approved web/API adapters without copying proprietary code.").setPositiveButton("OK",null).show();
        else new AlertDialog.Builder(this).setTitle(app.optString("name")).setMessage(app.optString("description")+"\n\nThis product is registered in the Omnitrix Suit and ready for its functional module build.").setPositiveButton("OK",null).show();
    }

    private String readAsset(String name)throws Exception{try(InputStream in=getAssets().open(name);ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] b=new byte[4096];int n;while((n=in.read(b))>0)out.write(b,0,n);return out.toString(StandardCharsets.UTF_8.name());}}
    private TextView text(String s,float z,int c){TextView t=new TextView(this);t.setText(s);t.setTextSize(z);t.setTextColor(c);return t;}
    private int dp(int v){return(int)(v*getResources().getDisplayMetrics().density+.5f);}
}
