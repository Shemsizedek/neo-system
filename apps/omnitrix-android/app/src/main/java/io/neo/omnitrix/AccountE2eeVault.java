package io.neo.omnitrix;

import android.content.Context;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import org.json.JSONObject;
import javax.crypto.*;
import javax.crypto.spec.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.security.spec.KeySpec;

/** v3.7 NEO account E2EE key, separate from wallet/XCP Key material. */
public final class AccountE2eeVault {
 private static final String WRAP_ALIAS="omnitrix.account.wrap.NEO-0001", PREFS="omnitrix_account_e2ee_v1", FIELD="wrappedAccountKey";
 private final Context c; public AccountE2eeVault(Context c){this.c=c.getApplicationContext();}
 public boolean initialized(){return !c.getSharedPreferences(PREFS,Context.MODE_PRIVATE).getString(FIELD,"").isEmpty();}
 public void ensure(){if(initialized())return;try{byte[] raw=new byte[32];new SecureRandom().nextBytes(raw);storeRaw(raw);}catch(Exception e){throw new IllegalStateException(e);}}
 public String encryptText(String plain){try{ensure();Cipher x=Cipher.getInstance("AES/GCM/NoPadding");x.init(Cipher.ENCRYPT_MODE,new SecretKeySpec(raw(),"AES"));byte[] ct=x.doFinal(plain.getBytes(StandardCharsets.UTF_8));JSONObject o=new JSONObject();o.put("v",1);o.put("iv",Base64.encodeToString(x.getIV(),Base64.NO_WRAP));o.put("ct",Base64.encodeToString(ct,Base64.NO_WRAP));return o.toString();}catch(Exception e){throw new IllegalStateException(e);}}
 public String decryptText(String envelope){try{JSONObject o=new JSONObject(envelope);Cipher x=Cipher.getInstance("AES/GCM/NoPadding");x.init(Cipher.DECRYPT_MODE,new SecretKeySpec(raw(),"AES"),new GCMParameterSpec(128,Base64.decode(o.getString("iv"),Base64.NO_WRAP)));return new String(x.doFinal(Base64.decode(o.getString("ct"),Base64.NO_WRAP)),StandardCharsets.UTF_8);}catch(Exception e){throw new IllegalStateException(e);}}
 public String sign(String text){try{Mac m=Mac.getInstance("HmacSHA256");m.init(new SecretKeySpec(raw(),"HmacSHA256"));return Base64.encodeToString(m.doFinal(text.getBytes(StandardCharsets.UTF_8)),Base64.NO_WRAP);}catch(Exception e){throw new IllegalStateException(e);}}
 public String exportRecovery(String passphrase){try{if(passphrase==null||passphrase.length()<10)throw new IllegalArgumentException("Recovery passphrase must be at least 10 characters");byte[] salt=new byte[16];new SecureRandom().nextBytes(salt);SecretKey k=derive(passphrase,salt);Cipher x=Cipher.getInstance("AES/GCM/NoPadding");x.init(Cipher.ENCRYPT_MODE,k);byte[] ct=x.doFinal(raw());JSONObject o=new JSONObject();o.put("schema","neo.omnitrix.account-recovery/v1");o.put("profile","NEO-0001");o.put("salt",Base64.encodeToString(salt,Base64.NO_WRAP));o.put("iv",Base64.encodeToString(x.getIV(),Base64.NO_WRAP));o.put("ct",Base64.encodeToString(ct,Base64.NO_WRAP));return Base64.encodeToString(o.toString().getBytes(StandardCharsets.UTF_8),Base64.NO_WRAP);}catch(Exception e){throw new IllegalStateException(e);}}
 public void importRecovery(String pkg,String passphrase){try{JSONObject o=new JSONObject(new String(Base64.decode(pkg,Base64.NO_WRAP),StandardCharsets.UTF_8));SecretKey k=derive(passphrase,Base64.decode(o.getString("salt"),Base64.NO_WRAP));Cipher x=Cipher.getInstance("AES/GCM/NoPadding");x.init(Cipher.DECRYPT_MODE,k,new GCMParameterSpec(128,Base64.decode(o.getString("iv"),Base64.NO_WRAP)));byte[] raw=x.doFinal(Base64.decode(o.getString("ct"),Base64.NO_WRAP));if(raw.length!=32)throw new IllegalArgumentException("Invalid account key");storeRaw(raw);}catch(Exception e){throw new IllegalStateException("Recovery import failed",e);}}
 private SecretKey derive(String p,byte[] salt)throws Exception{KeySpec spec=new PBEKeySpec(p.toCharArray(),salt,210000,256);return new SecretKeySpec(SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded(),"AES");}
 private void storeRaw(byte[] raw)throws Exception{Cipher x=Cipher.getInstance("AES/GCM/NoPadding");x.init(Cipher.ENCRYPT_MODE,wrapKey());JSONObject o=new JSONObject();o.put("iv",Base64.encodeToString(x.getIV(),Base64.NO_WRAP));o.put("ct",Base64.encodeToString(x.doFinal(raw),Base64.NO_WRAP));c.getSharedPreferences(PREFS,Context.MODE_PRIVATE).edit().putString(FIELD,o.toString()).apply();}
 private byte[] raw()throws Exception{JSONObject o=new JSONObject(c.getSharedPreferences(PREFS,Context.MODE_PRIVATE).getString(FIELD,""));Cipher x=Cipher.getInstance("AES/GCM/NoPadding");x.init(Cipher.DECRYPT_MODE,wrapKey(),new GCMParameterSpec(128,Base64.decode(o.getString("iv"),Base64.NO_WRAP)));return x.doFinal(Base64.decode(o.getString("ct"),Base64.NO_WRAP));}
 private SecretKey wrapKey()throws Exception{KeyStore ks=KeyStore.getInstance("AndroidKeyStore");ks.load(null);Key e=ks.getKey(WRAP_ALIAS,null);if(e instanceof SecretKey)return(SecretKey)e;KeyGenerator kg=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");kg.init(new KeyGenParameterSpec.Builder(WRAP_ALIAS,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).setKeySize(256).build());return kg.generateKey();}
}
