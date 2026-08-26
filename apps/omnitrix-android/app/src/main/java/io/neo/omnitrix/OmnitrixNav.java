package io.neo.omnitrix;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.view.Gravity;
import android.widget.*;

/** Shared v2.4 consumer navigation. Never handles key material. */
public final class OmnitrixNav {
    private OmnitrixNav(){}
    public static LinearLayout bar(Activity a,String active){
        LinearLayout row=new LinearLayout(a);row.setOrientation(LinearLayout.HORIZONTAL);row.setGravity(Gravity.CENTER);row.setPadding(dp(a,3),dp(a,3),dp(a,3),dp(a,3));row.setBackgroundColor(Color.rgb(3,14,8));
        add(a,row,"Browser",active,()->launch(a,MainActivityV14.class));
        add(a,row,"Wallet",active,()->launch(a,WalletDashboardActivity.class));
        add(a,row,"Market",active,()->launch(a,MarketMatrixActivity.class));
        add(a,row,"Miner",active,()->{Intent i=new Intent(a,MainActivityV14.class);i.putExtra("open_miner",true);a.startActivity(i);});
        add(a,row,"NEO",active,()->{Intent i=new Intent(a,MainActivityV14.class);i.putExtra("open_neo_home",true);a.startActivity(i);});
        return row;
    }
    private static void add(Activity a,LinearLayout row,String label,String active,Runnable action){Button b=new Button(a);b.setText(label);b.setAllCaps(false);b.setTextSize(11);b.setTextColor(label.equals(active)?Color.rgb(6,30,12):Color.rgb(190,235,202));b.setBackgroundColor(label.equals(active)?Color.rgb(101,255,138):Color.rgb(7,25,15));b.setOnClickListener(v->action.run());row.addView(b,new LinearLayout.LayoutParams(0,dp(a,48),1f));}
    private static void launch(Activity a,Class<?> c){if(a.getClass()==c)return;Intent i=new Intent(a,c);i.addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);a.startActivity(i);}
    private static int dp(Activity a,int v){return(int)(v*a.getResources().getDisplayMetrics().density+.5f);}
}
