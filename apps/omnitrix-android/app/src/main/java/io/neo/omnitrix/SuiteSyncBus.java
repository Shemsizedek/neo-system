package io.neo.omnitrix;

import android.content.*;
import org.json.*;
import java.util.*;

/** Omnitrix Suit v3.5 local-first shared metadata bus. Stores profile-scoped recents, favorites, notifications and sync queue only. */
public final class SuiteSyncBus {
    private static final String PREFS="omnitrix_sync_bus_v1";
    private SuiteSyncBus(){}
    private static SharedPreferences p(Context c){return c.getSharedPreferences(PREFS,Context.MODE_PRIVATE);}
    public static synchronized void recent(Context c,String app,String title,String ref){append(c,"recent",entry(app,title,ref,"recent"),50);}
    public static synchronized void favorite(Context c,String app,String title,String ref){appendUnique(c,"favorites",entry(app,title,ref,"favorite"),100,"ref");}
    public static synchronized void notify(Context c,String app,String message){append(c,"notifications",entry(app,message,"","notification"),50);}
    public static synchronized void queueSync(Context c,String app,String title,String ref){append(c,"queue",entry(app,title,ref,"pending"),100);}
    public static synchronized JSONArray read(Context c,String key){try{return new JSONArray(p(c).getString(key,"[]"));}catch(Exception e){return new JSONArray();}}
    public static synchronized void clearQueue(Context c){p(c).edit().putString("queue","[]").apply();}
    public static synchronized void setProfilePref(Context c,String key,String value){p(c).edit().putString("profile."+key,value).apply();}
    public static String getProfilePref(Context c,String key,String def){return p(c).getString("profile."+key,def);}
    private static JSONObject entry(String app,String title,String ref,String state){JSONObject o=new JSONObject();try{o.put("profile","NEO-0001");o.put("app",app);o.put("title",title);o.put("ref",ref);o.put("state",state);o.put("ts",System.currentTimeMillis());}catch(Exception ignored){}return o;}
    private static void append(Context c,String key,JSONObject o,int max){JSONArray a=read(c,key),n=new JSONArray();n.put(o);for(int i=0;i<a.length()&&n.length()<max;i++)n.put(a.optJSONObject(i));p(c).edit().putString(key,n.toString()).apply();}
    private static void appendUnique(Context c,String key,JSONObject o,int max,String unique){JSONArray a=read(c,key),n=new JSONArray();n.put(o);String u=o.optString(unique);for(int i=0;i<a.length()&&n.length()<max;i++){JSONObject x=a.optJSONObject(i);if(x!=null&&!u.equals(x.optString(unique)))n.put(x);}p(c).edit().putString(key,n.toString()).apply();}
}
