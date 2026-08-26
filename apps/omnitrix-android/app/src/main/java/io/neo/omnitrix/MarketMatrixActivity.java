package io.neo.omnitrix;

import android.app.*;
import android.graphics.Color;
import android.os.Bundle;
import android.view.*;
import android.widget.*;

import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Omnitrix v2.1 read-only BTC/XCP/NOMNI market matrix. */
public class MarketMatrixActivity extends Activity {
    private final ExecutorService io=Executors.newSingleThreadExecutor();
    private TextView btcUsd,xcpBtc,xcpUsd,nomniXcp,nomniBtc,nomniUsd,status;
    private Button refresh;

    @Override public void onCreate(Bundle state){
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.BLACK);getWindow().setNavigationBarColor(Color.BLACK);
        buildUi();load();
    }
    private void buildUi(){
        ScrollView scroll=new ScrollView(this);LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setPadding(dp(18),dp(20),dp(18),dp(30));root.setBackgroundColor(Color.rgb(1,5,3));scroll.addView(root);
        LinearLayout head=new LinearLayout(this);head.setGravity(Gravity.CENTER_VERTICAL);ImageView logo=new ImageView(this);logo.setImageResource(R.drawable.omnitrix_logo);logo.setContentDescription("Omnitrix");head.addView(logo,new LinearLayout.LayoutParams(dp(62),dp(62)));TextView title=text("  NEO MARKET MATRIX",23,Color.rgb(229,255,235));head.addView(title);root.addView(head);
        TextView sub=text("Omnitrix v2.1 · live public BTC / XCP / NOMNI market intelligence",12,Color.rgb(104,185,130));sub.setPadding(0,dp(6),0,dp(16));root.addView(sub);
        btcUsd=card("BTC / USD");xcpBtc=card("XCP / BTC");xcpUsd=card("XCP / USD");nomniXcp=card("∞ NOMNI / XCP");nomniBtc=card("∞ NOMNI / BTC");nomniUsd=card("∞ NOMNI / USD");
        root.addView(btcUsd);root.addView(xcpBtc);root.addView(xcpUsd);root.addView(nomniXcp);root.addView(nomniBtc);root.addView(nomniUsd);
        status=text("Loading public market feeds…",12,Color.rgb(184,218,194));status.setPadding(0,dp(10),0,dp(12));root.addView(status);
        refresh=primary("REFRESH MARKET MATRIX");root.addView(refresh,new LinearLayout.LayoutParams(-1,dp(52)));refresh.setOnClickListener(v->load());
        TextView note=text("DEX conversions are derived from live open Counterparty orders when liquidity exists. If a pair has no usable order book, Omnitrix shows market unavailable rather than inventing a price. Derived NOMNI/BTC and NOMNI/USD may use NOMNI/XCP × XCP/BTC.",11,Color.rgb(109,145,121));note.setPadding(0,dp(18),0,dp(14));root.addView(note);
        Button close=secondary("BACK TO NEO WALLET");root.addView(close,new LinearLayout.LayoutParams(-1,dp(48)));close.setOnClickListener(v->finish());setContentView(scroll);
    }
    private void load(){refresh.setEnabled(false);status.setText("Refreshing Bitcoin price and Counterparty open orders…");io.execute(()->{try{MarketNetwork.Matrix m=MarketNetwork.load();runOnUiThread(()->render(m));}catch(Exception e){runOnUiThread(()->{refresh.setEnabled(true);status.setText("Market refresh failed: "+safe(e));});}});}
    private void render(MarketNetwork.Matrix m){refresh.setEnabled(true);btcUsd.setText("BTC / USD\n"+(m.btcUsd>0?String.format(Locale.US,"$%,.2f",m.btcUsd):"Market unavailable"));
        xcpBtc.setText("XCP / BTC\n"+pair(m.xcpBtc,"BTC"));xcpUsd.setText("XCP / USD\n"+(m.xcpUsd()>0?String.format(Locale.US,"$%,.6f",m.xcpUsd()):"Market unavailable"));
        nomniXcp.setText("∞ NOMNI / XCP\n"+pair(m.nomniXcp,"XCP"));double nb=m.nomniBtc();nomniBtc.setText("∞ NOMNI / BTC\n"+(nb>0?String.format(Locale.US,"%.8f BTC",nb):"Market unavailable"));double nu=m.nomniUsd();nomniUsd.setText("∞ NOMNI / USD\n"+(nu>0?String.format(Locale.US,"$%,.4f",nu):"Market unavailable"));
        status.setText("Market matrix refreshed. Quotes are informational and can move before a transaction is composed or confirmed.");}
    private String pair(MarketNetwork.Pair p,String quote){if(!p.available())return"Market unavailable";String spread=(p.bid>0&&p.ask>0)?String.format(Locale.US,"\nBid %.8f · Ask %.8f",p.bid,p.ask):"";return String.format(Locale.US,"%.8f %s",p.mid,quote)+spread+"\nOpen bids "+p.bids+" · asks "+p.asks;}
    @Override protected void onDestroy(){super.onDestroy();io.shutdownNow();}
    private TextView card(String label){TextView t=text(label+"\n—",18,Color.rgb(220,255,230));t.setPadding(dp(16),dp(15),dp(16),dp(15));t.setBackgroundColor(Color.rgb(5,20,12));LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,dp(94));lp.setMargins(0,0,0,dp(8));t.setLayoutParams(lp);return t;}
    private TextView text(String s,float z,int c){TextView t=new TextView(this);t.setText(s);t.setTextSize(z);t.setTextColor(c);return t;}
    private Button primary(String s){Button b=new Button(this);b.setText(s);b.setAllCaps(false);b.setTextColor(Color.rgb(0,22,8));b.setBackgroundColor(Color.rgb(101,255,138));return b;}
    private Button secondary(String s){Button b=new Button(this);b.setText(s);b.setAllCaps(false);b.setTextColor(Color.rgb(188,235,201));b.setBackgroundColor(Color.rgb(7,25,15));return b;}
    private int dp(int v){return(int)(v*getResources().getDisplayMetrics().density+.5f);}
    private String safe(Exception e){String s=e.getMessage();return s==null||s.trim().isEmpty()?e.getClass().getSimpleName():s;}
}
