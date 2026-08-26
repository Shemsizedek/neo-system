package io.neo.omnitrix;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;

/** Public-data wallet reads. Never accepts or transmits private key material. */
final class WalletNetwork {
    private static final String CP = "https://api.counterparty.io:4000/v2";
    private static final String MEMPOOL = "https://mempool.space/api";
    private static final int TIMEOUT = 20000;

    static final class AssetBalance {
        final String asset;
        final long raw;
        final boolean divisible;
        AssetBalance(String asset,long raw,boolean divisible){this.asset=asset;this.raw=raw;this.divisible=divisible;}
        String display(){return divisible?String.format(Locale.US,"%.8f",raw/100000000.0):Long.toString(raw);}
    }

    static final class WalletSnapshot {
        final long btcSats;
        final double btcUsd;
        final List<AssetBalance> assets;
        final List<String> activity;
        WalletSnapshot(long btcSats,double btcUsd,List<AssetBalance> assets,List<String> activity){this.btcSats=btcSats;this.btcUsd=btcUsd;this.assets=assets;this.activity=activity;}
        AssetBalance find(String name){for(AssetBalance b:assets)if(name.equalsIgnoreCase(b.asset))return b;return new AssetBalance(name,0,"XCP".equalsIgnoreCase(name));}
    }

    static WalletSnapshot load(String address) throws Exception {
        JSONObject btc=get(MEMPOOL+"/address/"+address);
        JSONObject chain=btc.optJSONObject("chain_stats");
        JSONObject mem=btc.optJSONObject("mempool_stats");
        long funded=(chain==null?0:chain.optLong("funded_txo_sum",0))+(mem==null?0:mem.optLong("funded_txo_sum",0));
        long spent=(chain==null?0:chain.optLong("spent_txo_sum",0))+(mem==null?0:mem.optLong("spent_txo_sum",0));
        long btcSats=Math.max(0,funded-spent);

        double btcUsd=0;
        try { JSONObject p=get("https://mempool.space/api/v1/prices"); btcUsd=p.optDouble("USD",0); } catch(Exception ignored){}

        List<AssetBalance> balances=new ArrayList<>();
        JSONArray rows=arrayFrom(get(CP+"/addresses/"+address+"/balances"));
        for(int i=0;i<rows.length();i++){
            JSONObject r=rows.optJSONObject(i); if(r==null)continue;
            String asset=r.optString("asset",""); if(asset.isEmpty())continue;
            long raw=r.optLong("quantity",r.optLong("amount",0));
            boolean divisible="XCP".equalsIgnoreCase(asset);
            try { JSONObject meta=objectFrom(get(CP+"/assets/"+asset)); if(meta!=null)divisible=meta.optBoolean("divisible",divisible); } catch(Exception ignored){}
            balances.add(new AssetBalance(asset,raw,divisible));
        }

        List<String> activity=new ArrayList<>();
        addCounterpartyActivity(activity,address,"sends","SENT");
        addCounterpartyActivity(activity,address,"receives","RECEIVED");
        try {
            JSONArray txs=new JSONArray(readUrl(MEMPOOL+"/address/"+address+"/txs"));
            for(int i=0;i<txs.length()&&activity.size()<12;i++){
                JSONObject t=txs.optJSONObject(i);if(t==null)continue;
                JSONObject status=t.optJSONObject("status");
                activity.add("BTC · "+(status!=null&&status.optBoolean("confirmed")?"confirmed":"pending")+" · "+shortId(t.optString("txid","")));
            }
        }catch(Exception ignored){}
        return new WalletSnapshot(btcSats,btcUsd,balances,activity);
    }

    private static void addCounterpartyActivity(List<String> out,String address,String route,String verb){
        try{
            JSONArray a=arrayFrom(get(CP+"/addresses/"+address+"/"+route));
            for(int i=0;i<a.length()&&out.size()<8;i++){
                JSONObject r=a.optJSONObject(i);if(r==null)continue;
                String asset=r.optString("asset","");
                long q=r.optLong("quantity",0);
                String peer="sends".equals(route)?r.optString("destination",""):r.optString("source","");
                out.add(verb+" · "+asset+" · "+q+" raw · "+shortId(peer));
            }
        }catch(Exception ignored){}
    }

    private static JSONArray arrayFrom(JSONObject response){
        Object result=response.opt("result");
        if(result instanceof JSONArray)return (JSONArray)result;
        if(result instanceof JSONObject){
            JSONObject o=(JSONObject)result;
            for(Iterator<String> it=o.keys();it.hasNext();){Object v=o.opt(it.next());if(v instanceof JSONArray)return (JSONArray)v;}
        }
        Object data=response.opt("data");if(data instanceof JSONArray)return (JSONArray)data;
        return new JSONArray();
    }

    private static JSONObject objectFrom(JSONObject response){Object r=response.opt("result");return r instanceof JSONObject?(JSONObject)r:response;}
    private static JSONObject get(String url)throws Exception{return new JSONObject(readUrl(url));}
    private static String readUrl(String url)throws Exception{
        HttpURLConnection c=(HttpURLConnection)new URL(url).openConnection();
        c.setConnectTimeout(TIMEOUT);c.setReadTimeout(TIMEOUT);c.setRequestMethod("GET");c.setRequestProperty("Accept","application/json");c.setRequestProperty("User-Agent","Omnitrix/2.0");
        int code=c.getResponseCode();InputStream in=code>=200&&code<300?c.getInputStream():c.getErrorStream();String text=read(in);
        if(code<200||code>=300)throw new java.io.IOException("HTTP "+code+": "+limit(text));return text;
    }
    private static String read(InputStream in)throws Exception{if(in==null)return"";try(BufferedReader r=new BufferedReader(new InputStreamReader(in,StandardCharsets.UTF_8))){StringBuilder b=new StringBuilder();String s;while((s=r.readLine())!=null)b.append(s);return b.toString();}}
    private static String shortId(String s){if(s==null||s.isEmpty())return"—";return s.length()>16?s.substring(0,8)+"…"+s.substring(s.length()-6):s;}
    private static String limit(String s){if(s==null)return"";s=s.replace('\n',' ');return s.length()>220?s.substring(0,220)+"…":s;}
}
