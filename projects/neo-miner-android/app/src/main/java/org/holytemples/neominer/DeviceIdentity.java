package org.holytemples.neominer;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import java.security.KeyPairGenerator;
import java.security.KeyStore;
import java.security.PublicKey;
import java.security.Signature;
import java.security.SecureRandom;
import java.security.MessageDigest;
import java.util.Base64;
import java.nio.charset.StandardCharsets;
public final class DeviceIdentity {
 private static final String ALIAS="neo-miner-device-identity-v1";
 private static KeyStore store() throws Exception { KeyStore s=KeyStore.getInstance("AndroidKeyStore");s.load(null);return s; }
 public static synchronized PublicKey enrollLocal() throws Exception {
  KeyStore ks=store();
  if(!ks.containsAlias(ALIAS)){
   KeyPairGenerator g=KeyPairGenerator.getInstance(KeyProperties.KEY_ALGORITHM_EC,"AndroidKeyStore");
   g.initialize(new KeyGenParameterSpec.Builder(ALIAS,KeyProperties.PURPOSE_SIGN|KeyProperties.PURPOSE_VERIFY)
     .setAlgorithmParameterSpec(new java.security.spec.ECGenParameterSpec("secp256r1"))
     .setDigests(KeyProperties.DIGEST_SHA256).build());
   g.generateKeyPair();
  }
  return store().getCertificate(ALIAS).getPublicKey();
 }
 public static String publicKey() throws Exception {
  return Base64.getEncoder().encodeToString(enrollLocal().getEncoded());
 }
 public static String fingerprint() throws Exception {
  byte[] h=MessageDigest.getInstance("SHA-256").digest(enrollLocal().getEncoded());
  StringBuilder b=new StringBuilder();for(int i=0;i<8;i++)b.append(String.format("%02x",h[i]));return b.toString();
 }
 public static boolean selfTest() throws Exception {
  byte[] challenge=new byte[32];new SecureRandom().nextBytes(challenge);
  Signature sign=Signature.getInstance("SHA256withECDSA");sign.initSign(store().getKey(ALIAS,null) instanceof java.security.PrivateKey?(java.security.PrivateKey)store().getKey(ALIAS,null):null);
  sign.update(challenge);byte[] signature=sign.sign();
  Signature verify=Signature.getInstance("SHA256withECDSA");verify.initVerify(enrollLocal());verify.update(challenge);return verify.verify(signature);
 }
 private DeviceIdentity(){}
}
