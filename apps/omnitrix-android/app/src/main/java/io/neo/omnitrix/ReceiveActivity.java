package io.neo.omnitrix;

import android.app.*;
import android.content.*;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.os.Bundle;
import android.view.*;
import android.widget.*;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.MultiFormatWriter;
import com.google.zxing.common.BitMatrix;

/** Omnitrix v2.3 branded receive center with public-address QR. */
public class ReceiveActivity extends Activity {
    public static final String EXTRA_ADDRESS="address";
    @Override public void onCreate(Bundle state){super.onCreate(state);getWindow().setStatusBarColor(Color.BLACK);getWindow().setNavigationBarColor(Color.BLACK);buildUi();}
    private void buildUi(){
        String address=getIntent().getStringExtra(EXTRA_ADDRESS);if(address==null)address="";
        ScrollView scroll=new ScrollView(this);LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setGravity(Gravity.CENTER_HORIZONTAL);root.setPadding(dp(20),dp(24),dp(20),dp(30));root.setBackgroundColor(Color.rgb(1,5,3));scroll.addView(root);
        ImageView logo=new ImageView(this);logo.setImageResource(R.drawable.omnitrix_logo);logo.setContentDescription("Omnitrix");root.addView(logo,new LinearLayout.LayoutParams(dp(84),dp(84)));
        TextView title=text("RECEIVE",26,Color.rgb(228,255,235));title.setGravity(Gravity.CENTER);root.addView(title);
        TextView sub=text("BTC / Counterparty XCP / ∞ NOMNI",13,Color.rgb(104,185,130));sub.setGravity(Gravity.CENTER);sub.setPadding(0,dp(5),0,dp(18));root.addView(sub);
        if(!address.isEmpty()){
            try{ImageView qr=new ImageView(this);qr.setImageBitmap(qr("bitcoin:"+address,dp(244)));qr.setContentDescription("QR code for public Bitcoin and Counterparty address");qr.setBackgroundColor(Color.WHITE);qr.setPadding(dp(10),dp(10),dp(10),dp(10));root.addView(qr,new LinearLayout.LayoutParams(dp(264),dp(264)));}
            catch(Exception e){TextView qerr=text("QR unavailable · address remains usable below",12,Color.rgb(238,198,100));qerr.setPadding(0,dp(8),0,dp(8));root.addView(qerr);}
        }
        TextView label=text("PUBLIC WALLET ADDRESS",12,Color.rgb(119,255,151));label.setPadding(0,dp(16),0,0);root.addView(label);
        TextView addr=text(address.isEmpty()?"Wallet address unavailable":address,15,Color.WHITE);addr.setTextIsSelectable(true);addr.setGravity(Gravity.CENTER);addr.setPadding(dp(14),dp(18),dp(14),dp(18));addr.setBackgroundColor(Color.rgb(5,20,12));root.addView(addr,new LinearLayout.LayoutParams(-1,-2));
        TextView note=text("Scan or share this public address to receive compatible BTC and Counterparty assets. Omnitrix never puts the XCP Key into the QR code.",12,Color.rgb(174,211,186));note.setPadding(0,dp(18),0,dp(16));root.addView(note);
        Button copy=primary("COPY ADDRESS");root.addView(copy,new LinearLayout.LayoutParams(-1,dp(52)));final String a=address;copy.setEnabled(!a.isEmpty());copy.setOnClickListener(v->{ClipboardManager cm=(ClipboardManager)getSystemService(CLIPBOARD_SERVICE);cm.setPrimaryClip(ClipData.newPlainText("Omnitrix receive address",a));Toast.makeText(this,"Public address copied",Toast.LENGTH_SHORT).show();});
        Button share=secondary("SHARE PUBLIC ADDRESS");LinearLayout.LayoutParams slp=new LinearLayout.LayoutParams(-1,dp(50));slp.setMargins(0,dp(8),0,0);root.addView(share,slp);share.setEnabled(!a.isEmpty());share.setOnClickListener(v->{Intent i=new Intent(Intent.ACTION_SEND);i.setType("text/plain");i.putExtra(Intent.EXTRA_TEXT,a);startActivity(Intent.createChooser(i,"Share Omnitrix address"));});
        Button track=secondary("TRACK A TRANSACTION");LinearLayout.LayoutParams tlp=new LinearLayout.LayoutParams(-1,dp(50));tlp.setMargins(0,dp(8),0,0);root.addView(track,tlp);track.setOnClickListener(v->startActivity(new Intent(this,TxStatusActivity.class)));
        Button back=secondary("BACK TO WALLET");LinearLayout.LayoutParams blp=new LinearLayout.LayoutParams(-1,dp(48));blp.setMargins(0,dp(16),0,0);root.addView(back,blp);back.setOnClickListener(v->finish());setContentView(scroll);
    }
    private Bitmap qr(String text,int size)throws Exception{BitMatrix m=new MultiFormatWriter().encode(text,BarcodeFormat.QR_CODE,size,size);Bitmap b=Bitmap.createBitmap(size,size,Bitmap.Config.RGB_565);for(int y=0;y<size;y++)for(int x=0;x<size;x++)b.setPixel(x,y,m.get(x,y)?Color.BLACK:Color.WHITE);return b;}
    private TextView text(String s,float z,int c){TextView t=new TextView(this);t.setText(s);t.setTextSize(z);t.setTextColor(c);return t;}
    private Button primary(String s){Button b=new Button(this);b.setText(s);b.setAllCaps(false);b.setTextColor(Color.rgb(0,22,8));b.setBackgroundColor(Color.rgb(101,255,138));return b;}
    private Button secondary(String s){Button b=new Button(this);b.setText(s);b.setAllCaps(false);b.setTextColor(Color.rgb(188,235,201));b.setBackgroundColor(Color.rgb(7,25,15));return b;}
    private int dp(int v){return(int)(v*getResources().getDisplayMetrics().density+.5f);}
}
