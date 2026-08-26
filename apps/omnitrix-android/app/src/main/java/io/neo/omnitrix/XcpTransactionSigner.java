package io.neo.omnitrix;

import org.bitcoinj.base.BitcoinNetwork;
import org.bitcoinj.base.Coin;
import org.bitcoinj.base.ScriptType;
import org.bitcoinj.core.Transaction;
import org.bitcoinj.core.TransactionInput;
import org.bitcoinj.core.TransactionOutput;
import org.bitcoinj.crypto.DumpedPrivateKey;
import org.bitcoinj.crypto.ECKey;
import org.bitcoinj.crypto.TransactionSignature;
import org.bitcoinj.script.Script;
import org.bitcoinj.script.ScriptBuilder;

import org.json.JSONArray;
import org.json.JSONObject;

import java.nio.ByteBuffer;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

/**
 * Omnitrix XCP signing engine v1.
 *
 * Contract: accepts a mainnet unsigned transaction plus explicit prevout metadata.
 * This first signer intentionally supports only single-key legacy P2PKH inputs owned by the secured XCP Key.
 * It never broadcasts and never persists private key material.
 */
final class XcpTransactionSigner {
    static final int MAX_TX_BYTES = 100_000;
    static final long MAX_FEE_SATS_WITHOUT_OVERRIDE = 1_000_000L; // 0.01 BTC

    static final class Preview {
        final String address;
        final String unsignedTxId;
        final int inputCount;
        final int outputCount;
        final long inputSats;
        final long outputSats;
        final long feeSats;
        final String action;
        final String asset;
        final String quantity;
        final String destination;

        Preview(String address, String unsignedTxId, int inputCount, int outputCount,
                long inputSats, long outputSats, long feeSats,
                String action, String asset, String quantity, String destination) {
            this.address=address; this.unsignedTxId=unsignedTxId; this.inputCount=inputCount; this.outputCount=outputCount;
            this.inputSats=inputSats; this.outputSats=outputSats; this.feeSats=feeSats;
            this.action=action; this.asset=asset; this.quantity=quantity; this.destination=destination;
        }

        String humanSummary() {
            StringBuilder s=new StringBuilder();
            s.append("XCP Key address\n").append(address).append("\n\n");
            if(!action.isEmpty()) s.append("Action: ").append(action).append('\n');
            if(!asset.isEmpty()) s.append("Asset: ").append(asset).append('\n');
            if(!quantity.isEmpty()) s.append("Quantity: ").append(quantity).append('\n');
            if(!destination.isEmpty()) s.append("Destination: ").append(destination).append('\n');
            s.append("Inputs: ").append(inputCount).append(" · Outputs: ").append(outputCount).append('\n');
            s.append("BTC input value: ").append(inputSats).append(" sats\n");
            s.append("BTC output value: ").append(outputSats).append(" sats\n");
            s.append("Network fee: ").append(feeSats).append(" sats\n");
            s.append("Unsigned txid: ").append(unsignedTxId);
            return s.toString();
        }
    }

    static final class SignedResult {
        final String address;
        final String txid;
        final String signedHex;
        final long feeSats;
        SignedResult(String address,String txid,String signedHex,long feeSats){this.address=address;this.txid=txid;this.signedHex=signedHex;this.feeSats=feeSats;}
    }

    private static final class RequestData {
        final Transaction unsigned;
        final List<Prevout> prevouts;
        final JSONObject summary;
        final long inputSats;
        final long outputSats;
        RequestData(Transaction unsigned,List<Prevout> prevouts,JSONObject summary,long in,long out){this.unsigned=unsigned;this.prevouts=prevouts;this.summary=summary;this.inputSats=in;this.outputSats=out;}
    }

    private static final class Prevout {
        final int index; final Script script; final long value;
        Prevout(int index,Script script,long value){this.index=index;this.script=script;this.value=value;}
    }

    static Preview preview(char[] wifChars,String requestJson) throws Exception {
        ECKey key = keyFromWif(wifChars);
        RequestData r = parseAndValidate(key,requestJson);
        long fee = r.inputSats-r.outputSats;
        JSONObject s=r.summary;
        return new Preview(address(key),r.unsigned.getTxId().toString(),r.unsigned.getInputs().size(),r.unsigned.getOutputs().size(),
                r.inputSats,r.outputSats,fee,
                s.optString("action",""),s.optString("asset",""),s.optString("quantity",""),s.optString("destination",""));
    }

    static SignedResult sign(char[] wifChars,String requestJson,boolean allowHighFee) throws Exception {
        ECKey key = keyFromWif(wifChars);
        RequestData r = parseAndValidate(key,requestJson);
        long fee=r.inputSats-r.outputSats;
        if(fee<0) throw new IllegalArgumentException("Transaction outputs exceed provided inputs");
        if(!allowHighFee && fee>MAX_FEE_SATS_WITHOUT_OVERRIDE) throw new IllegalArgumentException("Network fee exceeds 0.01 BTC. Review and explicitly approve high-fee signing.");

        Transaction base=copySkeleton(r.unsigned,r.prevouts,false,key);
        TransactionSignature[] sigs=new TransactionSignature[r.prevouts.size()];
        for(int i=0;i<r.prevouts.size();i++) {
            Prevout p=r.prevouts.get(i);
            sigs[i]=base.calculateSignature(i,key,p.script,Transaction.SigHash.ALL,false);
        }

        Transaction finalTx=copySkeleton(r.unsigned,r.prevouts,true,key,sigs);
        byte[] serialized=finalTx.serialize();
        try {
            return new SignedResult(address(key),finalTx.getTxId().toString(),hex(serialized),fee);
        } finally { Arrays.fill(serialized,(byte)0); }
    }

    private static RequestData parseAndValidate(ECKey key,String requestJson) throws Exception {
        if(requestJson==null || requestJson.trim().isEmpty()) throw new IllegalArgumentException("Signing request is empty");
        JSONObject root=new JSONObject(requestJson);
        if(!"mainnet".equalsIgnoreCase(root.optString("network","mainnet"))) throw new IllegalArgumentException("Only Bitcoin mainnet signing is enabled");
        String txHex=root.optString("unsigned_tx","").trim();
        byte[] txBytes=unhex(txHex);
        if(txBytes.length==0 || txBytes.length>MAX_TX_BYTES) throw new IllegalArgumentException("Unsigned transaction size is invalid");
        Transaction unsigned;
        try { unsigned=Transaction.read(ByteBuffer.wrap(txBytes)); }
        finally { Arrays.fill(txBytes,(byte)0); }
        if(unsigned.getInputs().isEmpty() || unsigned.getOutputs().isEmpty()) throw new IllegalArgumentException("Unsigned transaction must have inputs and outputs");
        for(TransactionInput in:unsigned.getInputs()) {
            if(in.getScriptBytes().length!=0) throw new IllegalArgumentException("Signing request must contain unsigned inputs with empty scriptSig");
            if(in.hasWitness()) throw new IllegalArgumentException("XCP signer v1 accepts legacy P2PKH unsigned inputs only");
        }

        JSONArray arr=root.optJSONArray("inputs");
        if(arr==null || arr.length()!=unsigned.getInputs().size()) throw new IllegalArgumentException("Prevout metadata must be supplied for every input");
        byte[] expected=ScriptBuilder.createP2PKHOutputScript(key).program();
        List<Prevout> prevouts=new ArrayList<>(); long inputSats=0;
        boolean[] seen=new boolean[arr.length()];
        for(int n=0;n<arr.length();n++) {
            JSONObject item=arr.getJSONObject(n); int index=item.getInt("index");
            if(index<0||index>=arr.length()||seen[index]) throw new IllegalArgumentException("Invalid or duplicate input index");
            seen[index]=true;
            long value=item.getLong("value_sats"); if(value<=0) throw new IllegalArgumentException("Input value must be positive");
            Script script=Script.parse(unhex(item.getString("script_pub_key")));
            if(!Arrays.equals(expected,script.program())) throw new IllegalArgumentException("Input #"+index+" is not controlled by this XCP Key");
            prevouts.add(new Prevout(index,script,value)); inputSats=Math.addExact(inputSats,value);
        }
        prevouts.sort((a,b)->Integer.compare(a.index,b.index));
        long outputSats=0; for(TransactionOutput out:unsigned.getOutputs()) outputSats=Math.addExact(outputSats,out.getValue().value);
        long fee=inputSats-outputSats; if(fee<0) throw new IllegalArgumentException("Provided input values are below transaction outputs");
        return new RequestData(unsigned,prevouts,root.optJSONObject("summary")==null?new JSONObject():root.optJSONObject("summary"),inputSats,outputSats);
    }

    private static Transaction copySkeleton(Transaction src,List<Prevout> prevouts,boolean signed,ECKey key) throws Exception {
        return copySkeleton(src,prevouts,signed,key,null);
    }

    private static Transaction copySkeleton(Transaction src,List<Prevout> prevouts,boolean signed,ECKey key,TransactionSignature[] sigs) throws Exception {
        Transaction tx=new Transaction();
        tx.setVersion(src.getVersion());
        long lockTime=src.lockTime().rawValue();
        if(lockTime<0 || lockTime>0xffffffffL) throw new IllegalArgumentException("Invalid transaction locktime");
        // bitcoinj 0.17.1 uses an int here; the cast intentionally preserves the raw uint32 bits.
        tx.setLockTime((int)lockTime);
        for(TransactionOutput o:src.getOutputs()) tx.addOutput(new TransactionOutput(tx,o.getValue(),o.getScriptBytes()));
        for(int i=0;i<src.getInputs().size();i++) {
            TransactionInput orig=src.getInput(i); Prevout p=prevouts.get(i);
            byte[] script=signed?ScriptBuilder.createInputScript(sigs[i],key).program():new byte[0];
            long seq=orig.hasSequence()?orig.getSequenceNumber():TransactionInput.NO_SEQUENCE;
            tx.addInput(new TransactionInput(tx,script,orig.getOutpoint(),seq,Coin.valueOf(p.value),null));
        }
        return tx;
    }

    private static ECKey keyFromWif(char[] chars) {
        String wif=new String(chars);
        return DumpedPrivateKey.fromBase58(BitcoinNetwork.MAINNET,wif).getKey();
    }
    private static String address(ECKey key){ return key.toAddress(ScriptType.P2PKH,BitcoinNetwork.MAINNET).toString(); }

    private static byte[] unhex(String s) {
        if(s==null) throw new IllegalArgumentException("Missing hex data"); s=s.trim();
        if((s.length()&1)!=0 || !s.matches("(?i)[0-9a-f]*")) throw new IllegalArgumentException("Invalid transaction/script hex");
        byte[] out=new byte[s.length()/2]; for(int i=0;i<out.length;i++) out[i]=(byte)Integer.parseInt(s.substring(i*2,i*2+2),16); return out;
    }
    private static String hex(byte[] b){StringBuilder s=new StringBuilder(b.length*2);for(byte v:b)s.append(String.format(Locale.US,"%02x",v&0xff));return s.toString();}
}
