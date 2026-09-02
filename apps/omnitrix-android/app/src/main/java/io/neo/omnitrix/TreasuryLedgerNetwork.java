package io.neo.omnitrix;

import org.json.*;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

/** Read-only Counterparty Treasury inventory. Never accepts XCP Key material. */
final class TreasuryLedgerNetwork {
    private static final String CP="https://api.counterparty.io:4000/v2";
    private static final int TIMEOUT=20000;

    static List<WalletNetwork.AssetBalance> load() throws Exception {
        List<WalletNetwork.AssetBalance> out=new ArrayList<>();
        String cursor=""; int pages=0;
        do{
            String u=CP+"/addresses/"+URLEncoder.encode(WorldCurrencyLedgerResolver.TREASURY_ADDRESS,"UTF-8")+"/balances?verbose=true&limit=1000"+(cursor.isEmpty()?"":"&cursor="+URLEncoder.encode(cursor,"UTF-8"));
            JSONObject response=get(u); JSONArray rows=arrayFrom(response);
            for(int i=0;i<rows.length();i++){
                JSONObject r=rows.optJSONObject(i); if(r==null)continue;
                String asset=r.optString("asset",""); if(asset.isEmpty())continue;
                long raw=r.optLong("quantity",r.optLong("amount",0));
                JSONObject info=r.optJSONObject("asset_info"); boolean divisible=info!=null?info.optBoolean("divisible",false):"XCP".equalsIgnoreCase(asset);
                String normalized=r.optString("quantity_normalized",r.optString("amount_normalized",""));
                out.add(new WalletNetwork.AssetBalance(asset,raw,divisible,normalized));
            }
            Object next=response.opt("next_cursor"); cursor=next==null||JSONObject.NULL.equals(next)?"":String.valueOf(next); pages++;
        }while(!cursor.isEmpty()&&pages<20);
        return out;
    }

    private static JSONObject get(String url)throws Exception{return new JSONObject(readUrl(url));}
    private static String readUrl(String url)throws Exception{
        HttpURLConnection c=(HttpURLConnection)new URL(url).openConnection();
        c.setConnectTimeout(TIMEOUT);c.setReadTimeout(TIMEOUT);c.setRequestMethod("GET");c.setRequestProperty("Accept","application/json");c.setRequestProperty("User-Agent","Omnitrix/4.18");
        int code=c.getResponseCode();InputStream in=code>=200&&code<300?c.getInputStream():c.getErrorStream();String text=read(in);if(code<200||code>=300)throw new IOException("Counterparty HTTP "+code);return text;
    }
    private static JSONArray arrayFrom(JSONObject response){Object result=response.opt("result");if(result instanceof JSONArray)return(JSONArray)result;if(result instanceof JSONObject){Object rows=((JSONObject)result).opt("data");if(rows instanceof JSONArray)return(JSONArray)rows;}Object data=response.opt("data");return data instanceof JSONArray?(JSONArray)data:new JSONArray();}
    private static String read(InputStream in)throws Exception{if(in==null)return"";try(BufferedReader r=new BufferedReader(new InputStreamReader(in,StandardCharsets.UTF_8))){StringBuilder b=new StringBuilder();String s;while((s=r.readLine())!=null)b.append(s);return b.toString();}}
}
