package io.neo.omnitrix;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.security.MessageDigest;
import java.util.Arrays;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/** Device-local encrypted storage for a Bitcoin/Counterparty private key ("XCP Key"). */
final class XcpKeyVault {
    private static final String ALIAS = "omnitrix_xcp_vault_v1";
    private static final String PREFS = "omnitrix_xcp_vault";
    private static final String CT = "ciphertext";
    private static final String IV = "iv";
    private static final String FP = "fingerprint";
    private static final int AUTH_WINDOW_SECONDS = 120;

    interface UnlockedAction<T> { T run(char[] xcpKey) throws Exception; }

    private final Context context;
    private final SharedPreferences prefs;

    XcpKeyVault(Context context) {
        this.context = context.getApplicationContext();
        this.prefs = this.context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    boolean hasKey() { return prefs.contains(CT) && prefs.contains(IV); }
    String fingerprint() { return prefs.getString(FP, ""); }

    void importXcpKey(char[] xcpKey) throws Exception {
        if (xcpKey == null || xcpKey.length < 20) throw new IllegalArgumentException("Invalid XCP Key");
        byte[] raw = charsToAscii(xcpKey);
        try {
            validateMainnetWif(raw);
            SecretKey aes = getOrCreateKey();
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, aes);
            byte[] encrypted = cipher.doFinal(raw);
            try {
                prefs.edit()
                        .putString(CT, Base64.encodeToString(encrypted, Base64.NO_WRAP))
                        .putString(IV, Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP))
                        .putString(FP, fingerprintFor(raw))
                        .apply();
            } finally { Arrays.fill(encrypted, (byte)0); }
        } finally {
            Arrays.fill(raw, (byte)0);
            Arrays.fill(xcpKey, '\0');
        }
    }

    void verifyUnlocked() throws Exception { withUnlockedXcpKey(k -> null); }

    /**
     * Decrypts the XCP Key only inside this callback. The supplied char[] is wiped immediately afterwards.
     * Callers must not retain it, log it, place it in WebView/SharedPreferences, or transmit it.
     */
    <T> T withUnlockedXcpKey(UnlockedAction<T> action) throws Exception {
        if (!hasKey()) throw new IllegalStateException("No XCP Key is secured on this device");
        byte[] ct = Base64.decode(prefs.getString(CT, ""), Base64.NO_WRAP);
        byte[] iv = Base64.decode(prefs.getString(IV, ""), Base64.NO_WRAP);
        byte[] plain = null;
        char[] chars = null;
        try {
            SecretKey aes = getOrCreateKey();
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, aes, new GCMParameterSpec(128, iv));
            plain = cipher.doFinal(ct);
            validateMainnetWif(plain);
            chars = new String(plain, StandardCharsets.US_ASCII).toCharArray();
            return action.run(chars);
        } finally {
            Arrays.fill(ct, (byte)0);
            Arrays.fill(iv, (byte)0);
            if (plain != null) Arrays.fill(plain, (byte)0);
            if (chars != null) Arrays.fill(chars, '\0');
        }
    }

    void forget() {
        prefs.edit().clear().apply();
        try {
            KeyStore ks = KeyStore.getInstance("AndroidKeyStore");
            ks.load(null);
            if (ks.containsAlias(ALIAS)) ks.deleteEntry(ALIAS);
        } catch (Exception ignored) {}
    }

    private SecretKey getOrCreateKey() throws Exception {
        KeyStore ks = KeyStore.getInstance("AndroidKeyStore");
        ks.load(null);
        if (ks.containsAlias(ALIAS)) return (SecretKey) ks.getKey(ALIAS, null);
        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        KeyGenParameterSpec.Builder b = new KeyGenParameterSpec.Builder(ALIAS,
                KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setRandomizedEncryptionRequired(true)
                .setUserAuthenticationRequired(true);
        if (Build.VERSION.SDK_INT >= 30) b.setUserAuthenticationParameters(AUTH_WINDOW_SECONDS,
                KeyProperties.AUTH_BIOMETRIC_STRONG | KeyProperties.AUTH_DEVICE_CREDENTIAL);
        else b.setUserAuthenticationValidityDurationSeconds(AUTH_WINDOW_SECONDS);
        generator.init(b.build());
        return generator.generateKey();
    }

    private static byte[] charsToAscii(char[] chars) {
        byte[] out = new byte[chars.length];
        for (int i=0;i<chars.length;i++) {
            if (chars[i] > 0x7f) throw new IllegalArgumentException("XCP Key must be Base58 text");
            out[i]=(byte)chars[i];
        }
        return out;
    }

    private static void validateMainnetWif(byte[] wifAscii) throws Exception {
        byte[] decoded = decodeBase58(new String(wifAscii, StandardCharsets.US_ASCII));
        try {
            if (decoded.length != 37 && decoded.length != 38) throw new IllegalArgumentException("Invalid XCP Key length");
            if ((decoded[0]&0xff) != 0x80) throw new IllegalArgumentException("Only Bitcoin/Counterparty mainnet XCP Keys are accepted");
            if (decoded.length == 38 && decoded[33] != 0x01) throw new IllegalArgumentException("Invalid compressed XCP Key");
            int payloadLen=decoded.length-4;
            byte[] payload=Arrays.copyOf(decoded,payloadLen), check=doubleSha256(payload);
            try { for(int i=0;i<4;i++) if(decoded[payloadLen+i]!=check[i]) throw new IllegalArgumentException("XCP Key checksum failed"); }
            finally { Arrays.fill(payload,(byte)0); Arrays.fill(check,(byte)0); }
        } finally { Arrays.fill(decoded,(byte)0); }
    }

    private static String fingerprintFor(byte[] key) throws Exception {
        byte[] h=MessageDigest.getInstance("SHA-256").digest(key);
        try { StringBuilder s=new StringBuilder(); for(int i=0;i<4;i++) s.append(String.format("%02X",h[i])); return s.toString(); }
        finally { Arrays.fill(h,(byte)0); }
    }

    private static byte[] doubleSha256(byte[] in) throws Exception {
        MessageDigest sha=MessageDigest.getInstance("SHA-256");
        return sha.digest(sha.digest(in));
    }

    private static byte[] decodeBase58(String input) {
        final String alphabet="123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
        if(input==null||input.isEmpty()) throw new IllegalArgumentException("Empty XCP Key");
        byte[] input58=new byte[input.length()];
        for(int i=0;i<input.length();i++){int p=alphabet.indexOf(input.charAt(i));if(p<0)throw new IllegalArgumentException("Invalid Base58 character");input58[i]=(byte)p;}
        int zeros=0;while(zeros<input58.length&&input58[zeros]==0)zeros++;
        byte[] decoded=new byte[input.length()];int outputStart=decoded.length;
        for(int inputStart=zeros;inputStart<input58.length;){int remainder=0;for(int i=inputStart;i<input58.length;i++){int digit=input58[i]&0xff;int temp=remainder*58+digit;input58[i]=(byte)(temp/256);remainder=temp%256;}decoded[--outputStart]=(byte)remainder;if(input58[inputStart]==0)inputStart++;}
        while(outputStart<decoded.length&&decoded[outputStart]==0)outputStart++;
        byte[] out=Arrays.copyOfRange(decoded,outputStart-zeros,decoded.length);
        Arrays.fill(input58,(byte)0);Arrays.fill(decoded,(byte)0);return out;
    }
}
