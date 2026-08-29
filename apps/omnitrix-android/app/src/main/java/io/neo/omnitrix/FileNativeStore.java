package io.neo.omnitrix;

import android.content.*;
import org.json.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.UUID;

/** v4.0 file-native registry. App-private content, revision history, trash and encrypted provider sync metadata. */
public final class FileNativeStore {
 private static final String PREFS="omnitrix_files_v1", INDEX="index";
 private FileNativeStore(){}
 private static SharedPreferences p(Context c){return c.getSharedPreferences(PREFS,Context.MODE_PRIVATE);}
 public static synchronized JSONObject save(Context c,String app,String title,String content,boolean offline){
  try{
   JSONObject old=findByApp(c,app);String id=old==null?UUID.randomUUID().toString():old.optString("id",UUID.randomUUID().toString());
   if(old!=null&&!old.optBoolean("deleted"))archive(c,old,body(c,id));
   long rev=old==null?1:old.optLong("rev",0)+1,now=System.currentTimeMillis();String hash=sha256(content);
   JSONObject m=new JSONObject();m.put("id",id);m.put("profile","NEO-0001");m.put("app",app);m.put("title",title);m.put("rev",rev);m.put("hash",hash);m.put("updatedAt",now);m.put("deleted",false);m.put("offline",offline);m.put("sync","pending");
   p(c).edit().putString("body."+id,content).remove("trash."+id).apply();upsert(c,m);SuiteSyncBus.queueSync(c,app,title,id);SuiteSyncBus.recent(c,app,title,id);SuiteSyncBus.setProfilePref(c,"file.localMutationAt",String.valueOf(now));BackgroundFileSync.scheduleNow(c);return m;
  }catch(Exception e){throw new IllegalStateException(e);}
 }
 public static synchronized JSONObject tombstone(Context c,String id){try{JSONObject m=find(c,id);if(m==null)return null;String current=body(c,id);if(!current.isEmpty())p(c).edit().putString("trash."+id,current).apply();archive(c,m,current);m.put("rev",m.optLong("rev",0)+1);m.put("updatedAt",System.currentTimeMillis());m.put("deleted",true);m.put("sync","pending");p(c).edit().remove("body."+id).apply();upsert(c,m);SuiteSyncBus.queueSync(c,m.optString("app"),m.optString("title"),id);BackgroundFileSync.scheduleNow(c);return m;}catch(Exception e){throw new IllegalStateException(e);}}
 public static synchronized JSONObject restoreDeleted(Context c,String id){try{JSONObject m=find(c,id);if(m==null||!m.optBoolean("deleted"))return m;String restored=p(c).getString("trash."+id,"");m.put("rev",m.optLong("rev",0)+1);m.put("updatedAt",System.currentTimeMillis());m.put("deleted",false);m.put("hash",sha256(restored));m.put("sync","pending");p(c).edit().putString("body."+id,restored).remove("trash."+id).apply();upsert(c,m);SuiteSyncBus.queueSync(c,m.optString("app"),m.optString("title"),id);BackgroundFileSync.scheduleNow(c);return m;}catch(Exception e){throw new IllegalStateException(e);}}
 public static synchronized JSONObject restoreRevision(Context c,String id,long rev){try{JSONObject m=find(c,id);if(m==null)return null;String historical=p(c).getString("history.body."+id+"."+rev,null);if(historical==null)return null;return save(c,m.optString("app"),m.optString("title"),historical,m.optBoolean("offline",true));}catch(Exception e){throw new IllegalStateException(e);}}
 public static synchronized JSONArray history(Context c,String id){try{return new JSONArray(p(c).getString("history.index."+id,"[]"));}catch(Exception e){return new JSONArray();}}
 public static synchronized void setOffline(Context c,String id,boolean offline){try{JSONObject m=find(c,id);if(m==null)return;m.put("offline",offline);upsert(c,m);}catch(Exception ignored){}}
 public static synchronized void markSynced(Context c,String id,long remoteRev){try{JSONObject m=find(c,id);if(m==null)return;m.put("sync","synced");m.put("remoteRev",remoteRev);m.put("lastSyncedAt",System.currentTimeMillis());upsert(c,m);}catch(Exception ignored){}}
 public static synchronized String body(Context c,String id){return p(c).getString("body."+id,"");}
 public static synchronized JSONArray index(Context c){try{return new JSONArray(p(c).getString(INDEX,"[]"));}catch(Exception e){return new JSONArray();}}
 public static synchronized JSONObject find(Context c,String id){JSONArray a=index(c);for(int i=0;i<a.length();i++){JSONObject o=a.optJSONObject(i);if(o!=null&&id.equals(o.optString("id")))return o;}return null;}
 public static synchronized JSONObject findByApp(Context c,String app){JSONArray a=index(c);for(int i=0;i<a.length();i++){JSONObject o=a.optJSONObject(i);if(o!=null&&app.equals(o.optString("app"))&&!o.optBoolean("deleted"))return o;}return null;}
 public static synchronized JSONObject exportRecord(Context c,String id){try{JSONObject m=find(c,id);if(m==null)return null;JSONObject r=new JSONObject();r.put("meta",new JSONObject(m.toString()));r.put("body",m.optBoolean("deleted")?"":body(c,id));return r;}catch(Exception e){throw new IllegalStateException(e);}}
 public static synchronized void importRecord(Context c,JSONObject record){try{JSONObject m=record.getJSONObject("meta");String id=m.getString("id");JSONObject local=find(c,id);if(local!=null&&local.optLong("rev")>m.optLong("rev"))return;if(local!=null&&!local.optBoolean("deleted"))archive(c,local,body(c,id));if(m.optBoolean("deleted")){String cur=body(c,id);if(!cur.isEmpty())p(c).edit().putString("trash."+id,cur).apply();p(c).edit().remove("body."+id).apply();}else p(c).edit().putString("body."+id,record.optString("body","")).apply();m.put("sync","synced");m.put("remoteRev",m.optLong("rev"));m.put("lastSyncedAt",System.currentTimeMillis());upsert(c,m);}catch(Exception e){throw new IllegalStateException(e);}}
 public static synchronized JSONObject conflictCopy(Context c,JSONObject remote){try{JSONObject src=remote.getJSONObject("meta"),copy=new JSONObject(src.toString());String id=UUID.randomUUID().toString();copy.put("id",id);copy.put("title",src.optString("title")+" (conflict copy)");copy.put("sync","conflict-copy");copy.put("updatedAt",System.currentTimeMillis());p(c).edit().putString("body."+id,remote.optString("body","")).apply();upsert(c,copy);return copy;}catch(Exception e){throw new IllegalStateException(e);}}
 private static void archive(Context c,JSONObject m,String content)throws Exception{long rev=m.optLong("rev",0);if(rev<=0)return;String id=m.getString("id");JSONArray a=history(c,id);for(int i=0;i<a.length();i++)if(a.optJSONObject(i)!=null&&a.optJSONObject(i).optLong("rev")==rev)return;JSONObject h=new JSONObject();h.put("rev",rev);h.put("hash",m.optString("hash"));h.put("updatedAt",m.optLong("updatedAt"));h.put("deleted",m.optBoolean("deleted"));JSONArray n=new JSONArray();n.put(h);for(int i=0;i<a.length()&&i<19;i++)n.put(a.get(i));p(c).edit().putString("history.body."+id+"."+rev,content==null?"":content).putString("history.index."+id,n.toString()).apply();}
 private static void upsert(Context c,JSONObject m)throws Exception{JSONArray a=index(c),n=new JSONArray();n.put(new JSONObject(m.toString()));String id=m.getString("id");for(int i=0;i<a.length();i++){JSONObject o=a.optJSONObject(i);if(o!=null&&!id.equals(o.optString("id")))n.put(o);}p(c).edit().putString(INDEX,n.toString()).apply();}
 public static String sha256(String s){try{byte[] h=MessageDigest.getInstance("SHA-256").digest((s==null?"":s).getBytes(StandardCharsets.UTF_8));StringBuilder b=new StringBuilder();for(byte x:h)b.append(String.format("%02x",x));return b.toString();}catch(Exception e){return "";}}
}
