package io.neo.omnitrix;

import android.content.Context;
import android.provider.Settings;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import org.json.JSONObject;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.security.MessageDigest;

/** v3.6 device-local encrypted sync manifest. No provider credentials or wallet key material are stored here. */
public final class ProfileSyncVault {
    private static final String ALIAS="omnitrix.profile.sync.NEO-0001";
    private static final String PREFS="omnitrix_profile_sync_v1";
    private static final String FIELD="manifest";
    private final Context context;
    public ProfileSyncVault(Context c){context=c.getApplicationContext();}

    public String deviceId(){
        try{
            String raw=Settings.Secure.getString(context.getContentResolver(),Settings.Secure.ANDROID_ID);
            MessageDigest d=MessageDigest.getInstance("SHA-256");
            byte[] h=d.digest((raw==null?"unknown":raw).getBytes(StandardCharsets.UTF_8));
            StringBuilder b=new StringBuilder("NEO-"); for(int i=0;i<8;i++)b.append(String.format("%02x",h[i])); return b.toString();
        }catch(Exception e){return "NEO-device";}
    }

    public JSONObject load(){
        String envelope=context.getSharedPreferences(PREFS,Context.MODE_PRIVATE).getString(FIELD,"");
        if(envelope.isEmpty()) return fresh();
        try{
            JSONObject e=new JSONObject(envelope);
            byte[] iv=Base64.decode(e.getString("iv"),Base64.NO_WRAP), ct=Base64.decode(e.getString("ct"),Base64.NO_WRAP);
            Cipher c=Cipher.getInstance("AES/GCM/NoPadding"); c.init(Cipher.DECRYPT_MODE,key(),new GCMParameterSpec(128,iv));
            return new JSONObject(new String(c.doFinal(ct),StandardCharsets.UTF_8));
        }catch(Exception ex){return fresh();}
    }

    public void save(JSONObject manifest){
        try{
            manifest.put("profile","NEO-0001"); manifest.put("deviceId",deviceId()); manifest.put("updatedAt",System.currentTimeMillis());
            Cipher c=Cipher.getInstance("AES/GCM/NoPadding"); c.init(Cipher.ENCRYPT_MODE,key()); byte[] ct=c.doFinal(manifest.toString().getBytes(StandardCharsets.UTF_8));
            JSONObject e=new JSONObject(); e.put("v",1); e.put("iv",Base64.encodeToString(c.getIV(),Base64.NO_WRAP)); e.put("ct",Base64.encodeToString(ct,Base64.NO_WRAP));
            context.getSharedPreferences(PREFS,Context.MODE_PRIVATE).edit().putString(FIELD,e.toString()).apply();
        }catch(Exception e){throw new IllegalStateException("Could not secure sync manifest",e);}
    }

    private JSONObject fresh(){
        JSONObject o=new JSONObject(); try{o.put("schema","neo.omnitrix.sync/v1");o.put("profile","NEO-0001");o.put("deviceId",deviceId());o.put("conflictPolicy","newest-wins-with-copy");o.put("provider","unbound");o.put("updatedAt",System.currentTimeMillis());}catch(Exception ignored){} return o;
    }

    private SecretKey key() throws Exception{
        KeyStore ks=KeyStore.getInstance("AndroidKeyStore"); ks.load(null); java.security.Key existing=ks.getKey(ALIAS,null); if(existing instanceof SecretKey)return(SecretKey)existing;
        KeyGenerator kg=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");
        kg.init(new KeyGenParameterSpec.Builder(ALIAS,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).setKeySize(256).build());
        return kg.generateKey();
    }
}
