package org.neosystem.guardian;

import android.content.Context;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/** Encrypted, bounded, tamper-evident local event chain. Hash chaining detects ledger modification; it is not a remote attestation claim. */
final class GuardianAuditChain {
    private static final String KEY="audit_chain_v2";
    private GuardianAuditChain() {}
    static String append(Context c,String event) {
        try {
            String old=GuardianSecureStore.get(c,KEY); String prev="GENESIS";
            if(old!=null&&!old.isEmpty()){String first=old.split("\n",2)[0];String[] parts=first.split("\\|",4);if(parts.length>=2)prev=parts[1];}
            long now=System.currentTimeMillis(); String payload=now+"|"+prev+"|"+event; String hash=sha256(payload);
            String row=now+"|"+hash+"|"+prev+"|"+event; String joined=row+(old==null||old.isEmpty()?"":"\n"+old);
            String[] lines=joined.split("\n");StringBuilder bounded=new StringBuilder();for(int i=0;i<Math.min(lines.length,80);i++){if(i>0)bounded.append('\n');bounded.append(lines[i]);}
            GuardianSecureStore.put(c,KEY,bounded.toString());return hash;
        }catch(Throwable t){return "unavailable";}
    }
    static String read(Context c){String s=GuardianSecureStore.get(c,KEY);return s==null?"No events recorded.":s;}
    private static String sha256(String s)throws Exception{byte[] d=MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8));StringBuilder b=new StringBuilder();for(byte x:d)b.append(String.format("%02x",x));return b.toString();}
}
