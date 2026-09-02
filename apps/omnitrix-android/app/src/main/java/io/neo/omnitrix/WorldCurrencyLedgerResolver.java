package io.neo.omnitrix;

import java.util.*;

/** Resolves published World Currency names to real Counterparty asset IDs from the Treasury ledger. */
final class WorldCurrencyLedgerResolver {
    static final String TREASURY_ADDRESS="18FyntJG9hdXYvanm67mGgbyo1P7adckvg";

    static final class Entry {
        final String symbol,name,asset,quantity,status;
        Entry(String symbol,String name,String asset,String quantity,String status){this.symbol=symbol;this.name=name;this.asset=asset;this.quantity=quantity;this.status=status;}
    }

    static List<Entry> resolve(List<String[]> catalog,List<WalletNetwork.AssetBalance> treasury){
        List<Entry> out=new ArrayList<>();
        Map<String,WalletNetwork.AssetBalance> exact=new HashMap<>();
        for(WalletNetwork.AssetBalance b:treasury) exact.put(b.asset.toUpperCase(Locale.US),b);
        for(String[] row:catalog){
            String symbol=row.length>0?row[0].trim():"";
            String name=row.length>1?row[1].trim():"";
            String explicit=row.length>2?row[2].trim():"";
            WalletNetwork.AssetBalance hit=null;
            if(!explicit.isEmpty()) hit=exact.get(explicit.toUpperCase(Locale.US));
            if(hit==null){
                String candidate=normalize(name);
                hit=exact.get(candidate);
                if(hit==null) hit=uniquePrefix(candidate,treasury);
            }
            if(hit!=null) out.add(new Entry(symbol,name,hit.asset,hit.display(),"verified-ledger"));
            else out.add(new Entry(symbol,name,"","","unmapped"));
        }
        return out;
    }

    private static WalletNetwork.AssetBalance uniquePrefix(String candidate,List<WalletNetwork.AssetBalance> treasury){
        if(candidate.length()<5)return null; WalletNetwork.AssetBalance only=null;
        for(WalletNetwork.AssetBalance b:treasury){
            String a=normalize(b.asset); if(a.length()<5)continue;
            if(candidate.startsWith(a)||a.startsWith(candidate)){
                if(only!=null&&!only.asset.equalsIgnoreCase(b.asset))return null;
                only=b;
            }
        }
        return only;
    }

    static String normalize(String s){return s==null?"":s.toUpperCase(Locale.US).replaceAll("[^A-Z0-9]","");}
}
