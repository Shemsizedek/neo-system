package io.neo.omnitrix;

import android.app.*;
import android.content.*;
import android.graphics.Color;
import android.os.Bundle;
import android.text.InputType;
import android.view.*;
import android.widget.*;

/** Human approval boundary for local Bitcoin/Counterparty transaction signing. */
public class XcpSignerActivity extends Activity {
    private static final int REQ_PREVIEW=1801;
    private static final int REQ_SIGN=1802;
    private XcpKeyVault vault;
    private EditText request;
    private TextView preview,result;
    private Button sign,copy;
    private CheckBox highFee;
    private String approvedRequest;

    @Override public void onCreate(Bundle state){
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.BLACK);
        getWindow().setNavigationBarColor(Color.BLACK);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
        vault=new XcpKeyVault(this);
        if(!vault.hasKey()) { new AlertDialog.Builder(this).setTitle("XCP Key required").setMessage("Secure your XCP Key in Omnitrix before opening the signer.").setPositiveButton("Back",(d,w)->finish()).show(); }
        buildUi();
    }

    private void buildUi(){
        ScrollView scroll=new ScrollView(this); LinearLayout root=new LinearLayout(this); root.setOrientation(LinearLayout.VERTICAL); root.setPadding(dp(20),dp(24),dp(20),dp(28)); root.setBackgroundColor(Color.rgb(1,5,3)); scroll.addView(root);
        LinearLayout top=new LinearLayout(this);top.setGravity(Gravity.CENTER_VERTICAL);ImageView logo=new ImageView(this);logo.setImageResource(R.drawable.omnitrix_logo);top.addView(logo,new LinearLayout.LayoutParams(dp(58),dp(58)));TextView title=text("  XCP SIGNER",24,Color.rgb(226,255,234));top.addView(title);root.addView(top);
        TextView sub=text("NEO-0001 · Local Signing Boundary v1.8",12,Color.rgb(103,170,126));sub.setPadding(0,dp(5),0,dp(16));root.addView(sub);
        TextView guard=text("Review first. Sign second. Omnitrix never sends your XCP Key to a website or API, and this screen does not broadcast transactions.",13,Color.rgb(174,211,186));guard.setPadding(0,0,0,dp(14));root.addView(guard);

        request=new EditText(this);request.setHint("Paste unsigned Counterparty signing request JSON");request.setTextColor(Color.WHITE);request.setHintTextColor(Color.rgb(96,126,106));request.setBackgroundColor(Color.rgb(5,20,12));request.setGravity(Gravity.TOP|Gravity.START);request.setMinLines(9);request.setInputType(InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_FLAG_MULTI_LINE|InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS);root.addView(request,new LinearLayout.LayoutParams(-1,dp(220)));

        Button review=primary("REVIEW TRANSACTION");LinearLayout.LayoutParams rlp=new LinearLayout.LayoutParams(-1,dp(52));rlp.setMargins(0,dp(12),0,0);root.addView(review,rlp);review.setOnClickListener(v->authenticate(REQ_PREVIEW));
        preview=text("No transaction reviewed yet.",13,Color.rgb(190,226,201));preview.setPadding(dp(4),dp(16),dp(4),dp(10));preview.setTextIsSelectable(true);root.addView(preview);

        highFee=new CheckBox(this);highFee.setText("I explicitly approve signing if the BTC network fee is above 0.01 BTC");highFee.setTextColor(Color.rgb(238,198,100));highFee.setVisibility(View.GONE);root.addView(highFee);
        sign=primary("APPROVE & SIGN LOCALLY");sign.setEnabled(false);sign.setAlpha(.35f);root.addView(sign,new LinearLayout.LayoutParams(-1,dp(54)));sign.setOnClickListener(v->authenticate(REQ_SIGN));

        result=text("",12,Color.rgb(132,255,165));result.setPadding(dp(4),dp(16),dp(4),dp(10));result.setTextIsSelectable(true);root.addView(result);
        copy=secondary("COPY SIGNED TRANSACTION HEX");copy.setVisibility(View.GONE);root.addView(copy,new LinearLayout.LayoutParams(-1,dp(48)));copy.setOnClickListener(v->{ClipboardManager cm=(ClipboardManager)getSystemService(CLIPBOARD_SERVICE);String raw=result.getTag() instanceof String?(String)result.getTag():"";if(!raw.isEmpty()){cm.setPrimaryClip(ClipData.newPlainText("Omnitrix signed transaction",raw));Toast.makeText(this,"Signed transaction copied",Toast.LENGTH_SHORT).show();}});
        Button close=secondary("BACK TO OMNITRIX");LinearLayout.LayoutParams clp=new LinearLayout.LayoutParams(-1,dp(48));clp.setMargins(0,dp(10),0,0);root.addView(close,clp);close.setOnClickListener(v->finish());
        setContentView(scroll);
    }

    private void authenticate(int code){
        if(!vault.hasKey()){Toast.makeText(this,"No secured XCP Key",Toast.LENGTH_SHORT).show();return;}
        KeyguardManager km=(KeyguardManager)getSystemService(KEYGUARD_SERVICE);
        if(km==null||!km.isDeviceSecure()){Toast.makeText(this,"Android device lock is required",Toast.LENGTH_LONG).show();return;}
        String why=code==REQ_SIGN?"Approve local signing for NEO-0001":"Unlock XCP Key to review ownership and fees";
        Intent i=km.createConfirmDeviceCredentialIntent("Omnitrix XCP Signer",why);
        if(i!=null)startActivityForResult(i,code);else onAuthenticated(code);
    }

    @Override protected void onActivityResult(int code,int resultCode,Intent data){super.onActivityResult(code,resultCode,data);if(resultCode==RESULT_OK)onAuthenticated(code);else Toast.makeText(this,"Authorization cancelled",Toast.LENGTH_SHORT).show();}

    private void onAuthenticated(int code){
        try{
            String raw=request.getText().toString().trim();
            if(code==REQ_PREVIEW){
                XcpTransactionSigner.Preview p=vault.withUnlockedXcpKey(k->XcpTransactionSigner.preview(k,raw));
                approvedRequest=raw;preview.setText(p.humanSummary());
                highFee.setVisibility(p.feeSats>XcpTransactionSigner.MAX_FEE_SATS_WITHOUT_OVERRIDE?View.VISIBLE:View.GONE);
                highFee.setChecked(false);sign.setEnabled(true);sign.setAlpha(1f);result.setText("");result.setTag(null);copy.setVisibility(View.GONE);
            }else if(code==REQ_SIGN){
                if(approvedRequest==null||!approvedRequest.equals(raw)){sign.setEnabled(false);sign.setAlpha(.35f);throw new IllegalStateException("Signing request changed after review. Review it again before signing.");}
                boolean allow=highFee.getVisibility()==View.VISIBLE&&highFee.isChecked();
                XcpTransactionSigner.SignedResult s=vault.withUnlockedXcpKey(k->XcpTransactionSigner.sign(k,raw,allow));
                result.setText("SIGNED LOCALLY\nAddress: "+s.address+"\nTXID: "+s.txid+"\nFee: "+s.feeSats+" sats\n\nThe transaction is signed but NOT broadcast.");
                result.setTag(s.signedHex);copy.setVisibility(View.VISIBLE);sign.setEnabled(false);sign.setAlpha(.35f);approvedRequest=null;
            }
        }catch(Exception e){new AlertDialog.Builder(this).setTitle("Omnitrix blocked signing").setMessage(e.getMessage()==null?"The signing request was rejected.":e.getMessage()).setPositiveButton("OK",null).show();}
    }

    private TextView text(String s,float z,int c){TextView t=new TextView(this);t.setText(s);t.setTextSize(z);t.setTextColor(c);return t;}
    private Button primary(String s){Button b=new Button(this);b.setText(s);b.setAllCaps(false);b.setTextColor(Color.rgb(0,22,8));b.setBackgroundColor(Color.rgb(101,255,138));return b;}
    private Button secondary(String s){Button b=new Button(this);b.setText(s);b.setAllCaps(false);b.setTextColor(Color.rgb(188,235,201));b.setBackgroundColor(Color.rgb(7,25,15));return b;}
    private int dp(int v){return(int)(v*getResources().getDisplayMetrics().density+.5f);}
}
