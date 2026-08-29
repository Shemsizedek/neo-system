package io.neo.omnitrix;

import android.content.*;
import org.json.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.UUID;

/** v3.9 file-native local registry. Content remains app-private; provider sync encrypts it with AccountE2eeVault. */
public final class FileNativeStore {
 private static final String PREFS="omnitrix_files_v1", INDEX="index";
 private FileNativeStore(){}
 private static SharedPreferences p(Context c){return c.getSharedPreferences(PREFS,Context.MODE_PRIVATE);}
 public static synchronized JSONObject save(Context c,String app,String title,String content,boolean offline){
  try{JSONObject old=findByApp(c,app);String id=old==null?UUID.randomUUID().toString():old.optString("id",UUID.randomUUID().toString());long rev=old==null?1:old.optLong("rev",0)+1;long now=System.currentTimeMillis();String hash=sha256(content);JSONObject m=new JSONObject();m.put("id",id);m.put("profile","NEO-0001");m.put("app",app);m.put("title",title);m.put("rev",rev);m.put("hash",hash);m.put("updatedAt",now);m.put("deleted",false);m.put("offline",offline);m.put("sync","pending");p(c).edit().putString("body."+id,content).apply();upsert(c,m);SuiteSyncBus.queueSync(c,app,title,id);SuiteSyncBus.recent(c,app,title,id);SuiteSyncBus.setProfilePref(c,"file.localMutationAt",String.valueOf(now));return m;}catch(Exception e){throw new IllegalStateException(e);}}
 public static synchronized JSONObject tombstone(Context c,String id){try{JSONObject m=find(c,id);if(m==null)return null;m.put("rev",m.optLong("rev",0)+1);m.put("updatedAt",System.currentTimeMillis());m.put("deleted",true);m.put("sync","pending");p(c).edit().remove("body."+id).apply();upsert(c,m);SuiteSyncBus.queueSync(c,m.optString("app"),m.optString("title"),id);return m;}catch(Exception e){throw new IllegalStateException(e);}}
 public static synchronized void setOffline(Context c,String id,boolean offline){try{JSONObject m=find(c,id);if(m==null)return;m.put("offline",offline);upsert(c,m);}catch(Exception ignored){}}
 public static synchronized void markSynced(Context c,String id,long remoteRev){try{JSONObject m=find(c,id);if(m==null)return;m.put("sync","synced");m.put("remoteRev",remoteRev);m.put("lastSyncedAt",System.currentTimeMillis());upsert(c,m);}catch(Exception ignored){}}
 public static synchronized String body(Context c,String id){return p(c).getString("body."+id,"");}
 public static synchronized JSONArray index(Context c){try{return new JSONArray(p(c).getString(INDEX,"[]"));}catch(Exception e){return new JSONArray();}}
 public static synchronized JSONObject find(Context c,String id){JSONArray a=index(c);for(int i=0;i<a.length();i++){JSONObject o=a.optJSONObject(i);if(o!=null&&id.equals(o.optString("id")))return o;}return null;}
 public static synchronized JSONObject findByApp(Context c,String app){JSONArray a=index(c);for(int i=0;i<a.length();i++){JSONObject o=a.optJSONObject(i);if(o!=null&&app.equals(o.optString("app"))&&!o.optBoolean("deleted"))return o;}return null;}
 public static synchronized JSONObject exportRecord(Context c,String id){try{JSONObject m=find(c,id);if(m==null)return null;JSONObject r=new JSONObject();r.put("meta",new JSONObject(m.toString()));r.put("body",m.optBoolean("deleted")?"":body(c,id));return r;}catch(Exception e){throw new IllegalStateException(e);}}
 public static synchronized void importRecord(Context c,JSONObject record){try{JSONObject m=record.getJSONObject("meta");String id=m.getString("id");JSONObject local=find(c,id);if(local!=null&&local.optLong("rev")>m.optLong("rev"))return;if(m.optBoolean("deleted"))p(c).edit().remove("body."+id).apply();else p(c).edit().putString("body."+id,record.optString("body","")).apply();m.put("sync","synced");m.put("lastSyncedAt",System.currentTimeMillis());upsert(c,m);}catch(Exception e){throw new IllegalStateException(e);}}
 public static synchronized JSONObject conflictCopy(Context c,JSONObject remote){try{JSONObject src=remote.getJSONObject("meta"),copy=new JSONObject(src.toString());String id=UUID.randomUUID().toString();copy.put("id",id);copy.put("title",src.optString("title")+" (conflict copy)");copy.put("sync","conflict-copy");copy.put("updatedAt",System.currentTimeMillis());p(c).edit().putString("body."+id,remote.optString("body","")).apply();upsert(c,copy);return copy;}catch(Exception e){throw new IllegalStateException(e);}}
 private static void upsert(Context c,JSONObject m)throws Exception{JSONArray a=index(c),n=new JSONArray();n.put(new JSONObject(m.toString()));String id=m.getString("id");for(int i=0;i<a.length();i++){JSONObject o=a.optJSONObject(i);if(o!=null&&!id.equals(o.optString("id")))n.put(o);}p(c).edit().putString(INDEX,n.toString()).apply();}
 public static String sha256(String s){try{byte[] h=MessageDigest.getInstance("SHA-256").digest((s==null?"":s).getBytes(StandardCharsets.UTF_8));StringBuilder b=new StringBuilder();for(byte x:h)b.append(String.format("%02x",x));return b.toString();}catch(Exception e){return "";}}
}
