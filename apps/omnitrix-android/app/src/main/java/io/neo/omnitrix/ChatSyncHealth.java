package io.neo.omnitrix;

import android.content.*;import org.json.*;

/** v4.10 local health ledger for encrypted Noogle Chat sync. Stores counters/timestamps only, never message bodies or XCP Key material. */
public final class ChatSyncHealth {
 private static final String PREF="omnitrix_chat_sync_health_v1";private ChatSyncHealth(){}
 public static void record(Context c,JSONObject pull,JSONObject push,int chats,int unread,int mentions){c.getSharedPreferences(PREF,Context.MODE_PRIVATE).edit().putLong("lastScan",System.currentTimeMillis()).putInt("chats",chats).putInt("unread",unread).putInt("mentions",mentions).putInt("applied",pull==null?0:pull.optInt("applied")).putInt("conflicts",pull==null?0:pull.optInt("conflicts")).putInt("pullFailed",pull==null?0:pull.optInt("failed")).putInt("uploaded",push==null?0:push.optInt("uploaded")).putInt("pushFailed",push==null?0:push.optInt("failed")).apply();}
 public static String status(Context c){android.content.SharedPreferences p=c.getSharedPreferences(PREF,Context.MODE_PRIVATE);long at=p.getLong("lastScan",0);return "lastScan="+at+" · chats="+p.getInt("chats",0)+" · unread="+p.getInt("unread",0)+" · mentions="+p.getInt("mentions",0)+" · applied="+p.getInt("applied",0)+" · conflicts="+p.getInt("conflicts",0)+" · uploaded="+p.getInt("uploaded",0)+" · failures="+(p.getInt("pullFailed",0)+p.getInt("pushFailed",0));}
}
