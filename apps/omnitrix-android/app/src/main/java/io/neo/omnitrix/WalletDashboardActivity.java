package io.neo.omnitrix;

import android.app.*;
import android.content.*;
import android.graphics.Color;
import android.os.Bundle;
import android.view.*;
import android.widget.*;

import org.bitcoinj.base.BitcoinNetwork;
import org.bitcoinj.base.ScriptType;
import org.bitcoinj.crypto.DumpedPrivateKey;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Omnitrix v2.0 unified non-custodial wallet dashboard. */
public class WalletDashboardActivity extends Activity {
    private static final int REQ_UNLOCK=2001;
    private XcpKeyVault vault;
    private final ExecutorService io=Executors.newSingleThreadExecutor();
    private TextView address,btc,xcp,nomni,activity,status;
    private Button refresh,send;
    private String publicAddress="";

    @Override public void onCreate(Bundle state){
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.BLACK);getWindow().setNavigationBarColor(Color.BLACK);getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
        vault=new XcpKeyVault(this);buildUi();
        if(vault.hasKey())authenticate(); else status.setText("Secure your XCP Key first to activate the wallet dashboard.");
    }

    private void buildUi(){
        ScrollView scroll=new ScrollView(this);LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setPadding(dp(18),dp(22),dp(18),dp(30));root.setBackgroundColor(Color.rgb(1,5,3));scroll.addView(root);
        LinearLayout top=new LinearLayout(this);top.setGravity(Gravity.CENTER_VERTICAL);ImageView logo=new ImageView(this);logo.setImageResource(R.drawable.omnitrix_logo);top.addView(logo,new LinearLayout.LayoutParams(dp(56),dp(56)));TextView title=text("  NEO WALLET",25,Color.rgb(227,255,234));top.addView(title);root.addView(top);
        TextView sub=text("Omnitrix v2.0 · BTC / XCP / NOMNI",12,Color.rgb(103,170,126));sub.setPadding(0,dp(6),0,dp(14));root.addView(sub);
        address=text("Wallet address: locked",12,Color.rgb(145,255,171));address.setTextIsSelectable(true);root.addView(address);
        status=text("Authenticate to load public wallet data.",12,Color.rgb(181,214,191));status.setPadding(0,dp(8),0,dp(14));root.addView(status);

        btc=card("BTC","—");xcp=card("XCP","—");nomni=card("∞ NOMNI","—");root.addView(btc);root.addView(xcp);root.addView(nomni);

        LinearLayout buttons=new LinearLayout(this);buttons.setOrientation(LinearLayout.HORIZONTAL);refresh=primary("REFRESH");send=primary("SEND");Button receive=secondary("RECEIVE");buttons.addView(refresh,new LinearLayout.LayoutParams(0,dp(52),1f));buttons.addView(send,new LinearLayout.LayoutParams(0,dp(52),1f));buttons.addView(receive,new LinearLayout.LayoutParams(0,dp(52),1f));root.addView(buttons);
        refresh.setEnabled(false);send.setEnabled(false);refresh.setOnClickListener(v->load());send.setOnClickListener(v->startActivity(new Intent(this,XcpComposerActivity.class)));receive.setOnClickListener(v->showReceive());

        TextView h=text("RECENT ACTIVITY",14,Color.rgb(119,255,151));h.setPadding(0,dp(22),0,dp(8));root.addView(h);
        activity=text("No wallet activity loaded yet.",12,Color.rgb(192,226,201));activity.setTextIsSelectable(true);root.addView(activity);
        TextView note=text("Public reads use Counterparty API v2 and mempool.space. Private keys stay inside Android Keystore and are only exposed transiently to the local signer after device authentication.",11,Color.rgb(107,139,117));note.setPadding(0,dp(20),0,dp(12));root.addView(note);
        Button browser=secondary("OPEN OMNITRIX BROWSER");root.addView(browser,new LinearLayout.LayoutParams(-1,dp(48)));browser.setOnClickListener(v->startActivity(new Intent(this,MainActivityV14.class)));
        Button back=secondary("BACK TO SECURITY HUB");LinearLayout.LayoutParams bp=new LinearLayout.LayoutParams(-1,dp(48));bp.setMargins(0,dp(8),0,0);root.addView(back,bp);back.setOnClickListener(v->finish());
        setContentView(scroll);
    }

    private void authenticate(){
        KeyguardManager km=(KeyguardManager)getSystemService(KEYGUARD_SERVICE);
        if(km==null||!km.isDeviceSecure()){status.setText("Android device lock is required.");return;}
        Intent i=km.createConfirmDeviceCredentialIntent("Omnitrix NEO Wallet","Unlock to derive your public BTC/XCP address");
        if(i!=null)startActivityForResult(i,REQ_UNLOCK);else unlock();
    }
    @Override protected void onActivityResult(int req,int resultCode,Intent data){super.onActivityResult(req,resultCode,data);if(req==REQ_UNLOCK&&resultCode==RESULT_OK)unlock();else if(req==REQ_UNLOCK)status.setText("Wallet remained locked.");}

    private void unlock(){
        try{
            publicAddress=vault.withUnlockedXcpKey(k->DumpedPrivateKey.fromBase58(BitcoinNetwork.MAINNET,new String(k)).getKey().toAddress(ScriptType.P2PKH,BitcoinNetwork.MAINNET).toString());
            address.setText("Wallet address\n"+publicAddress);refresh.setEnabled(true);send.setEnabled(true);load();
        }catch(Exception e){status.setText("Could not unlock wallet: "+safe(e));}
    }

    private void load(){
        if(publicAddress.isEmpty()){authenticate();return;}refresh.setEnabled(false);status.setText("Loading BTC, Counterparty balances, prices, and recent activity…");
        io.execute(()->{
            try{
                WalletNetwork.WalletSnapshot s=WalletNetwork.load(publicAddress);
                runOnUiThread(()->render(s));
            }catch(Exception e){runOnUiThread(()->{refresh.setEnabled(true);status.setText("Wallet refresh failed: "+safe(e));});}
        });
    }

    private void render(WalletNetwork.WalletSnapshot s){
        refresh.setEnabled(true);
        double btcAmount=s.btcSats/100000000.0;double usd=btcAmount*s.btcUsd;
        btc.setText("BTC\n"+String.format(java.util.Locale.US,"%.8f BTC",btcAmount)+(s.btcUsd>0?String.format(java.util.Locale.US,"\n≈ $%,.2f USD",usd):""));
        WalletNetwork.AssetBalance xb=s.find("XCP"),nb=s.find("NOMNI");
        xcp.setText("XCP\n"+xb.display()+" XCP\nMarket conversion: next feed gate");
        nomni.setText("∞ NOMNI\n∞ "+nb.display()+"\nNOMNI/XCP and NOMNI/USD: next DEX feed gate");
        StringBuilder a=new StringBuilder();for(String row:s.activity){if(a.length()>0)a.append("\n\n");a.append("• ").append(row);}activity.setText(a.length()==0?"No recent activity returned.":a.toString());
        status.setText("Live wallet data loaded. Signing and broadcasting remain separate authenticated actions.");
    }

    private void showReceive(){
        if(publicAddress.isEmpty()){authenticate();return;}
        new AlertDialog.Builder(this).setTitle("Receive BTC / Counterparty assets").setMessage(publicAddress+"\n\nUse this public Bitcoin address for compatible BTC and Counterparty asset receipts. Verify the asset/network before sending.").setPositiveButton("Copy",(d,w)->{ClipboardManager cm=(ClipboardManager)getSystemService(CLIPBOARD_SERVICE);cm.setPrimaryClip(ClipData.newPlainText("Omnitrix wallet address",publicAddress));Toast.makeText(this,"Address copied",Toast.LENGTH_SHORT).show();}).setNegativeButton("Done",null).show();
    }

    @Override protected void onDestroy(){super.onDestroy();io.shutdownNow();}
    private TextView card(String name,String value){TextView t=text(name+"\n"+value,18,Color.rgb(220,255,230));t.setPadding(dp(16),dp(16),dp(16),dp(16));t.setBackgroundColor(Color.rgb(5,20,12));LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,dp(96));lp.setMargins(0,0,0,dp(8));t.setLayoutParams(lp);return t;}
    private TextView text(String s,float z,int c){TextView t=new TextView(this);t.setText(s);t.setTextSize(z);t.setTextColor(c);return t;}
    private Button primary(String s){Button b=new Button(this);b.setText(s);b.setAllCaps(false);b.setTextColor(Color.rgb(0,22,8));b.setBackgroundColor(Color.rgb(101,255,138));return b;}
    private Button secondary(String s){Button b=new Button(this);b.setText(s);b.setAllCaps(false);b.setTextColor(Color.rgb(188,235,201));b.setBackgroundColor(Color.rgb(7,25,15));return b;}
    private int dp(int v){return(int)(v*getResources().getDisplayMetrics().density+.5f);}
    private String safe(Exception e){String s=e.getMessage();return s==null||s.trim().isEmpty()?e.getClass().getSimpleName():s;}
}
