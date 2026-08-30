package io.neo.omnitrix;

import org.json.*;

/** Structured file-body codec for v4.4 Forms and Chat. Stored as encrypted FileNativeStore body text. */
public final class StructuredWorkspace {
 private StructuredWorkspace(){}
 public static JSONObject form(String body){
  JSONObject parsed=parse(body);if("neo.noogle.form/v1".equals(parsed.optString("schema")))return parsed;
  try{JSONObject o=new JSONObject();o.put("schema","neo.noogle.form/v1");o.put("description",body==null?"":body);o.put("questions",new JSONArray());return o;}catch(Exception e){return new JSONObject();}
 }
 public static JSONObject chat(String body){
  JSONObject parsed=parse(body);if("neo.noogle.chat/v1".equals(parsed.optString("schema")))return parsed;
  try{JSONObject o=new JSONObject();o.put("schema","neo.noogle.chat/v1");o.put("participants","");JSONArray a=new JSONArray();if(body!=null&&!body.trim().isEmpty()){JSONObject m=new JSONObject();m.put("text",body);m.put("author","Local");m.put("createdAt",System.currentTimeMillis());a.put(m);}o.put("messages",a);return o;}catch(Exception e){return new JSONObject();}
 }
 public static void addQuestion(JSONObject form,String prompt,String type,boolean required){try{JSONArray a=form.optJSONArray("questions");if(a==null){a=new JSONArray();form.put("questions",a);}JSONObject q=new JSONObject();q.put("prompt",prompt==null?"":prompt.trim());q.put("type",type==null?"text":type);q.put("required",required);a.put(q);}catch(Exception ignored){}}
 public static void addMessage(JSONObject chat,String text,String author){try{JSONArray a=chat.optJSONArray("messages");if(a==null){a=new JSONArray();chat.put("messages",a);}JSONObject m=new JSONObject();m.put("text",text==null?"":text.trim());m.put("author",author==null||author.trim().isEmpty()?"Local":author.trim());m.put("createdAt",System.currentTimeMillis());a.put(m);}catch(Exception ignored){}}
 public static String pretty(JSONObject o){return o==null?"{}":o.toString();}
 private static JSONObject parse(String s){try{return s==null||s.trim().isEmpty()?new JSONObject():new JSONObject(s);}catch(Exception e){return new JSONObject();}}
}
