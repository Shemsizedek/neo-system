package io.neo.omnitrix;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;

/** Public read-only Counterparty DEX market data. No private key material enters this class. */
final class MarketNetwork {
    private static final String CP="https://api.counterparty.io:4000/v2";
    private static final int TIMEOUT=18000;

    static final class Pair {
        final String base,quote; final double bid,ask,mid; final int bids,asks;
        Pair(String base,String quote,double bid,double ask,int bids,int asks){this.base=base;this.quote=quote;this.bid=bid;this.ask=ask;this.bids=bids;this.asks=asks;this.mid=bid>0&&ask>0?(bid+ask)/2.0:(bid>0?bid:ask);}
        boolean available(){return mid>0;}
    }
    static final class Matrix {
        final Pair xcpBtc,nomniXcp,nomniBtc; final double btcUsd;
        Matrix(Pair xcpBtc,Pair nomniXcp,Pair nomniBtc,double btcUsd){this.xcpBtc=xcpBtc;this.nomniXcp=nomniXcp;this.nomniBtc=nomniBtc;this.btcUsd=btcUsd;}
        double xcpUsd(){return xcpBtc.available()&&btcUsd>0?xcpBtc.mid*btcUsd:0;}
        double nomniBtc(){if(nomniBtc.available())return nomniBtc.mid;if(nomniXcp.available()&&xcpBtc.available())return nomniXcp.mid*xcpBtc.mid;return 0;}
        double nomniUsd(){double n=nomniBtc();return n>0&&btcUsd>0?n*btcUsd:0;}
    }

    static Matrix load() throws Exception {
        double btcUsd=0;
        try{JSONObject p=get("https://mempool.space/api/v1/prices");btcUsd=p.optDouble("USD",0);}catch(Exception ignored){}
        Pair xb=pair("XCP",true,"BTC",true);
        Pair nx=pair("NOMNI",false,"XCP",true);
        Pair nb=pair("NOMNI",false,"BTC",true);
        return new Matrix(xb,nx,nb,btcUsd);
    }

    private static Pair pair(String base,boolean baseDiv,String quote,boolean quoteDiv){
        List<Double> asks=prices(base,baseDiv,quote,quoteDiv,true);
        List<Double> bids=prices(base,baseDiv,quote,quoteDiv,false);
        double ask=minPositive(asks),bid=maxPositive(bids);
        return new Pair(base,quote,bid,ask,bids.size(),asks.size());
    }

    // ask: give BASE, get QUOTE => quote/base. bid: give QUOTE, get BASE => quote/base.
    private static List<Double> prices(String base,boolean baseDiv,String quote,boolean quoteDiv,boolean ask){
        List<Double> out=new ArrayList<>();
        try{
            String give=ask?base:quote,get=ask?quote:base;
            String u=CP+"/orders?status=open&give_asset="+enc(give)+"&get_asset="+enc(get)+"&limit=100";
            JSONArray a=arrayFrom(get(u));
            for(int i=0;i<a.length();i++){
                JSONObject o=a.optJSONObject(i);if(o==null)continue;
                double giveQ=o.optDouble("give_remaining",o.optDouble("give_quantity",0));
                double getQ=o.optDouble("get_remaining",o.optDouble("get_quantity",0));
                if(giveQ<=0||getQ<=0)continue;
                double giveUnits=giveQ/(div(give,base,baseDiv,quote,quoteDiv)?100000000.0:1.0);
                double getUnits=getQ/(div(get,base,baseDiv,quote,quoteDiv)?100000000.0:1.0);
                double px=ask?getUnits/giveUnits:giveUnits/getUnits;
                if(Double.isFinite(px)&&px>0)out.add(px);
            }
        }catch(Exception ignored){}
        return out;
    }
    private static boolean div(String asset,String base,boolean baseDiv,String quote,boolean quoteDiv){if(asset.equalsIgnoreCase(base))return baseDiv;if(asset.equalsIgnoreCase(quote))return quoteDiv;return true;}
    private static double minPositive(List<Double> a){double v=0;for(double x:a)if(x>0&&(v==0||x<v))v=x;return v;}
    private static double maxPositive(List<Double> a){double v=0;for(double x:a)if(x>v)v=x;return v;}

    private static JSONArray arrayFrom(JSONObject response){Object r=response.opt("result");if(r instanceof JSONArray)return(JSONArray)r;if(r instanceof JSONObject){JSONObject o=(JSONObject)r;for(Iterator<String>it=o.keys();it.hasNext();){Object v=o.opt(it.next());if(v instanceof JSONArray)return(JSONArray)v;}}Object d=response.opt("data");return d instanceof JSONArray?(JSONArray)d:new JSONArray();}
    private static JSONObject get(String u)throws Exception{HttpURLConnection c=(HttpURLConnection)new URL(u).openConnection();c.setConnectTimeout(TIMEOUT);c.setReadTimeout(TIMEOUT);c.setRequestMethod("GET");c.setRequestProperty("Accept","application/json");c.setRequestProperty("User-Agent","Omnitrix/2.1");int code=c.getResponseCode();String t=read(code>=200&&code<300?c.getInputStream():c.getErrorStream());if(code<200||code>=300)throw new java.io.IOException("HTTP "+code+": "+limit(t));return new JSONObject(t);}
    private static String enc(String s)throws Exception{return URLEncoder.encode(s,"UTF-8").replace("+","%20");}
    private static String read(InputStream in)throws Exception{if(in==null)return"";try(BufferedReader r=new BufferedReader(new InputStreamReader(in,StandardCharsets.UTF_8))){StringBuilder b=new StringBuilder();String s;while((s=r.readLine())!=null)b.append(s);return b.toString();}}
    private static String limit(String s){if(s==null)return"";s=s.replace('\n',' ');return s.length()>180?s.substring(0,180)+"…":s;}
}
