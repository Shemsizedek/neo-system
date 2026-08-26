package io.neo.omnitrix;

import android.app.*;
import android.content.*;
import android.graphics.Color;
import android.os.Bundle;
import android.text.InputType;
import android.view.*;
import android.widget.*;

import org.bitcoinj.base.BitcoinNetwork;
import org.bitcoinj.base.ScriptType;
import org.bitcoinj.crypto.DumpedPrivateKey;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Live Counterparty v2 composition boundary. Network requests receive only public transaction data. */
public class XcpComposerActivity extends Activity {
    private static final int REQ_COMPOSE=1901;
    private XcpKeyVault vault;
    private TextView source,status;
    private EditText destination,asset,quantity;
    private Button compose;
    private final ExecutorService io=Executors.newSingleThreadExecutor();

    @Override public void onCreate(Bundle state){
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.BLACK);getWindow().setNavigationBarColor(Color.BLACK);getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
        vault=new XcpKeyVault(this);
        if(!vault.hasKey()){new AlertDialog.Builder(this).setTitle("XCP Key required").setMessage("Secure your XCP Key first. Live composition uses its public Bitcoin address but never sends the private key to Counterparty.").setPositiveButton("Back",(d,w)->finish()).show();}
        buildUi();
        if(vault.hasKey()) authenticate();
    }

    private void buildUi(){
        ScrollView scroll=new ScrollView(this);LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setPadding(dp(20),dp(24),dp(20),dp(28));root.setBackgroundColor(Color.rgb(1,5,3));scroll.addView(root);
        LinearLayout top=new LinearLayout(this);top.setGravity(Gravity.CENTER_VERTICAL);ImageView logo=new ImageView(this);logo.setImageResource(R.drawable.omnitrix_logo);logo.setContentDescription("Omnitrix");top.addView(logo,new LinearLayout.LayoutParams(dp(58),dp(58)));TextView title=text("  COUNTERPARTY SEND",23,Color.rgb(226,255,234));top.addView(title);root.addView(top);
        TextView sub=text("Omnitrix v2.1 · XCP Key secured transaction composer",12,Color.rgb(103,170,126));sub.setPadding(0,dp(5),0,dp(16));root.addView(sub);
        TextView guard=text("Compose → review → sign → broadcast. Composition sends only public addresses and transaction parameters to Counterparty API v2. Your XCP Key remains inside the local vault.",13,Color.rgb(174,211,186));guard.setPadding(0,0,0,dp(14));root.addView(guard);

        source=text("Source address: locked",13,Color.rgb(135,255,165));source.setTextIsSelectable(true);source.setPadding(0,0,0,dp(14));root.addView(source);
        destination=input("Destination Bitcoin address");root.addView(destination,new LinearLayout.LayoutParams(-1,dp(56)));
        asset=input("Asset (example: NOMNI or XCP)");asset.setText("NOMNI");LinearLayout.LayoutParams alp=new LinearLayout.LayoutParams(-1,dp(56));alp.setMargins(0,dp(8),0,0);root.addView(asset,alp);
        quantity=input("Raw protocol quantity");quantity.setInputType(InputType.TYPE_CLASS_NUMBER);LinearLayout.LayoutParams qlp=new LinearLayout.LayoutParams(-1,dp(56));qlp.setMargins(0,dp(8),0,0);root.addView(quantity,qlp);
        TextView qhelp=text("Quantity is the raw Counterparty integer. NOMNI is configured as indivisible, so 25 = 25 NOMNI. For divisible assets such as XCP, 1.0 XCP = 100,000,000 raw units.",11,Color.rgb(130,157,139));qhelp.setPadding(dp(4),dp(7),dp(4),dp(12));root.addView(qhelp);

        compose=primary("COMPOSE UNSIGNED TRANSACTION");compose.setEnabled(false);compose.setAlpha(.4f);root.addView(compose,new LinearLayout.LayoutParams(-1,dp(54)));compose.setOnClickListener(v->compose());
        status=text("Authenticate to derive the public source address.",12,Color.rgb(190,226,201));status.setPadding(dp(4),dp(16),dp(4),dp(14));status.setTextIsSelectable(true);root.addView(status);
        Button manual=secondary("OPEN MANUAL SIGNER");root.addView(manual,new LinearLayout.LayoutParams(-1,dp(48)));manual.setOnClickListener(v->startActivity(new Intent(this,XcpSignerActivity.class)));
        Button close=secondary("BACK");LinearLayout.LayoutParams clp=new LinearLayout.LayoutParams(-1,dp(48));clp.setMargins(0,dp(10),0,0);root.addView(close,clp);close.setOnClickListener(v->finish());
        setContentView(scroll);
    }

    private void authenticate(){
        KeyguardManager km=(KeyguardManager)getSystemService(KEYGUARD_SERVICE);
        if(km==null||!km.isDeviceSecure()){status.setText("Android device lock is required before deriving the wallet address.");return;}
        Intent i=km.createConfirmDeviceCredentialIntent("Omnitrix Counterparty","Unlock XCP Key to derive the public source address");
        if(i!=null)startActivityForResult(i,REQ_COMPOSE);else unlockAddress();
    }

    @Override protected void onActivityResult(int requestCode,int resultCode,Intent data){super.onActivityResult(requestCode,resultCode,data);if(requestCode==REQ_COMPOSE&&resultCode==RESULT_OK)unlockAddress();else if(requestCode==REQ_COMPOSE)status.setText("Omnitrix remained locked.");}

    private void unlockAddress(){
        try{
            String address=vault.withUnlockedXcpKey(k->DumpedPrivateKey.fromBase58(BitcoinNetwork.MAINNET,new String(k)).getKey().toAddress(ScriptType.P2PKH,BitcoinNetwork.MAINNET).toString());
            source.setText("Source address\n"+address);source.setTag(address);compose.setEnabled(true);compose.setAlpha(1f);status.setText("Ready. Counterparty will only receive the public source, destination, asset, quantity, and normal transaction-composition parameters.");
        }catch(Exception e){status.setText("Could not derive source address: "+safe(e));}
    }

    private void compose(){
        String src=source.getTag() instanceof String?(String)source.getTag():"";String dst=destination.getText().toString().trim();String a=asset.getText().toString().trim().toUpperCase();String q=quantity.getText().toString().trim();
        if(src.isEmpty()){authenticate();return;} if(dst.isEmpty()||a.isEmpty()||q.isEmpty()){Toast.makeText(this,"Destination, asset, and quantity are required",Toast.LENGTH_SHORT).show();return;}
        compose.setEnabled(false);compose.setAlpha(.4f);status.setText("Composing unsigned Counterparty transaction and resolving its Bitcoin prevouts…");
        io.execute(()->{
            try{
                CounterpartyNetwork.ComposeResult r=CounterpartyNetwork.composeSend(src,dst,a,q);
                runOnUiThread(()->{compose.setEnabled(true);compose.setAlpha(1f);status.setText("Unsigned transaction composed. Opening the isolated review/signing boundary now.");Intent i=new Intent(this,XcpSignerActivity.class);i.putExtra("signing_request",r.signingRequestJson);startActivity(i);});
            }catch(Exception e){runOnUiThread(()->{compose.setEnabled(true);compose.setAlpha(1f);status.setText("Composition blocked: "+safe(e));});}
        });
    }

    @Override protected void onDestroy(){super.onDestroy();io.shutdownNow();}
    private EditText input(String hint){EditText e=new EditText(this);e.setHint(hint);e.setSingleLine(true);e.setTextColor(Color.WHITE);e.setHintTextColor(Color.rgb(96,126,106));e.setBackgroundColor(Color.rgb(5,20,12));e.setPadding(dp(12),0,dp(12),0);return e;}
    private TextView text(String s,float z,int c){TextView t=new TextView(this);t.setText(s);t.setTextSize(z);t.setTextColor(c);return t;}
    private Button primary(String s){Button b=new Button(this);b.setText(s);b.setAllCaps(false);b.setTextColor(Color.rgb(0,22,8));b.setBackgroundColor(Color.rgb(101,255,138));return b;}
    private Button secondary(String s){Button b=new Button(this);b.setText(s);b.setAllCaps(false);b.setTextColor(Color.rgb(188,235,201));b.setBackgroundColor(Color.rgb(7,25,15));return b;}
    private int dp(int v){return(int)(v*getResources().getDisplayMetrics().density+.5f);}
    private String safe(Exception e){String s=e.getMessage();return s==null||s.trim().isEmpty()?e.getClass().getSimpleName():s;}
}
