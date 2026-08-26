package io.neo.omnitrix;

import org.bitcoinj.core.Transaction;
import org.bitcoinj.core.TransactionInput;
import org.json.JSONArray;
import org.json.JSONObject;

import java.io.*;
import java.net.*;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Iterator;

/** Network-only Counterparty/Bitcoin transport. This class never receives private keys. */
final class CounterpartyNetwork {
    static final String COUNTERPARTY = "https://api.counterparty.io:4000";
    static final String MEMPOOL = "https://mempool.space";
    private static final int TIMEOUT_MS = 20_000;

    static final class ComposeResult {
        final String signingRequestJson;
        final String unsignedHex;
        ComposeResult(String signingRequestJson, String unsignedHex) {
            this.signingRequestJson = signingRequestJson;
            this.unsignedHex = unsignedHex;
        }
    }

    static ComposeResult composeSend(String source, String destination, String asset, String rawQuantity) throws Exception {
        require(source, "source address"); require(destination, "destination"); require(asset, "asset"); require(rawQuantity, "quantity");
        if(!rawQuantity.matches("[0-9]+") || rawQuantity.equals("0")) throw new IllegalArgumentException("Quantity must be a positive raw protocol integer");
        String url = COUNTERPARTY + "/v2/addresses/" + enc(source) + "/compose/send"
                + "?destination=" + enc(destination)
                + "&asset=" + enc(asset.toUpperCase())
                + "&quantity=" + enc(rawQuantity)
                + "&verbose=true&encoding=opreturn";
        JSONObject response = getJson(url);
        Object result = response.opt("result");
        String unsigned = findString(result, "rawtransaction", "unsigned_tx", "tx_hex", "hex");
        if(unsigned == null || !unsigned.matches("(?i)[0-9a-f]+")) throw new IOException(apiError(response, "Counterparty did not return an unsigned transaction"));

        byte[] bytes = unhex(unsigned);
        Transaction tx;
        try { tx = Transaction.read(ByteBuffer.wrap(bytes)); }
        finally { Arrays.fill(bytes, (byte)0); }

        JSONArray prevouts = new JSONArray();
        for(int i=0;i<tx.getInputs().size();i++) {
            TransactionInput input = tx.getInput(i);
            String txid = input.getOutpoint().hash().toString();
            long vout = input.getOutpoint().index();
            JSONObject funding = getJson(MEMPOOL + "/api/tx/" + txid);
            JSONArray outputs = funding.optJSONArray("vout");
            if(outputs == null || vout < 0 || vout >= outputs.length()) throw new IOException("Unable to resolve funding output " + txid + ":" + vout);
            JSONObject prev = outputs.getJSONObject((int)vout);
            long value = prev.getLong("value");
            String script = prev.getString("scriptpubkey");
            prevouts.put(new JSONObject().put("index", i).put("value_sats", value).put("script_pub_key", script));
        }

        JSONObject summary = new JSONObject()
                .put("action", "Counterparty SEND")
                .put("asset", asset.toUpperCase())
                .put("quantity", rawQuantity + " raw units")
                .put("destination", destination);
        JSONObject request = new JSONObject()
                .put("network", "mainnet")
                .put("unsigned_tx", unsigned)
                .put("inputs", prevouts)
                .put("summary", summary);
        return new ComposeResult(request.toString(2), unsigned);
    }

    static String broadcast(String signedHex) throws Exception {
        require(signedHex, "signed transaction");
        if(!signedHex.matches("(?i)[0-9a-f]+")) throw new IllegalArgumentException("Signed transaction hex is invalid");
        HttpURLConnection c = (HttpURLConnection)new URL(MEMPOOL + "/api/tx").openConnection();
        c.setConnectTimeout(TIMEOUT_MS); c.setReadTimeout(TIMEOUT_MS); c.setRequestMethod("POST"); c.setDoOutput(true);
        c.setRequestProperty("Content-Type", "text/plain"); c.setRequestProperty("Accept", "text/plain");
        byte[] body = signedHex.getBytes(StandardCharsets.US_ASCII);
        try(OutputStream out=c.getOutputStream()){ out.write(body); }
        int code=c.getResponseCode(); String text=read(code>=200&&code<300?c.getInputStream():c.getErrorStream()).trim();
        if(code<200||code>=300) throw new IOException("Bitcoin broadcast rejected (HTTP " + code + "): " + limit(text));
        if(!text.matches("(?i)[0-9a-f]{64}")) throw new IOException("Broadcast returned an unexpected response: " + limit(text));
        return text;
    }

    private static JSONObject getJson(String u) throws Exception {
        HttpURLConnection c=(HttpURLConnection)new URL(u).openConnection(); c.setConnectTimeout(TIMEOUT_MS); c.setReadTimeout(TIMEOUT_MS); c.setRequestMethod("GET"); c.setRequestProperty("Accept","application/json"); c.setRequestProperty("User-Agent","Omnitrix/1.9");
        int code=c.getResponseCode(); String text=read(code>=200&&code<300?c.getInputStream():c.getErrorStream());
        if(code<200||code>=300) throw new IOException("Network request failed (HTTP " + code + "): " + limit(text));
        return new JSONObject(text);
    }

    private static String findString(Object node, String... keys) {
        if(node instanceof JSONObject) {
            JSONObject o=(JSONObject)node;
            for(String k:keys){ String v=o.optString(k,null); if(v!=null && v.matches("(?i)[0-9a-f]+")) return v; }
            Iterator<String> it=o.keys();
            while(it.hasNext()) {
                String k=it.next();
                Object child=o.opt(k);
                String v=findString(child,keys);
                if(v!=null)return v;
            }
        } else if(node instanceof JSONArray) {
            JSONArray a=(JSONArray)node; for(int i=0;i<a.length();i++){String v=findString(a.opt(i),keys);if(v!=null)return v;}
        }
        return null;
    }

    private static String apiError(JSONObject o,String fallback){ String e=o.optString("error",""); return e.isEmpty()?fallback:e; }
    private static void require(String v,String n){ if(v==null||v.trim().isEmpty()) throw new IllegalArgumentException("Missing " + n); }
    private static String enc(String s) throws Exception { return URLEncoder.encode(s, "UTF-8").replace("+","%20"); }
    private static byte[] unhex(String s){byte[] b=new byte[s.length()/2];for(int i=0;i<b.length;i++)b[i]=(byte)Integer.parseInt(s.substring(i*2,i*2+2),16);return b;}
    private static String read(InputStream in)throws IOException{if(in==null)return"";try(BufferedReader r=new BufferedReader(new InputStreamReader(in,StandardCharsets.UTF_8))){StringBuilder s=new StringBuilder();String l;while((l=r.readLine())!=null)s.append(l);return s.toString();}}
    private static String limit(String s){if(s==null)return"";s=s.replace('\n',' ').trim();return s.length()>320?s.substring(0,320)+"…":s;}
}
