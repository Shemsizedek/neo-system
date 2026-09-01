package io.neo.omnitrix;

import org.json.*;import java.util.UUID;

/** Structured E2EE file-body codec for Noogle Forms and Chat. */
public final class StructuredWorkspace {
 private StructuredWorkspace(){}
 private static String uid(){return UUID.randomUUID().toString();}
 public static JSONObject form(String body){
  JSONObject p=parse(body);if(p.has("questions")){try{p.put("schema","neo.noogle.form/v2");if(!p.has("formId"))p.put("formId",uid());if(!p.has("responses"))p.put("responses",new JSONArray());return p;}catch(Exception ignored){}}
  try{JSONObject o=new JSONObject();o.put("schema","neo.noogle.form/v2");o.put("formId",uid());o.put("description",body==null?"":body);o.put("questions",new JSONArray());o.put("responses",new JSONArray());return o;}catch(Exception e){return new JSONObject();}
 }
 public static void addQuestion(JSONObject f,String prompt,String type,boolean required){try{JSONArray a=f.optJSONArray("questions");if(a==null){a=new JSONArray();f.put("questions",a);}JSONObject q=new JSONObject();q.put("id",uid());q.put("prompt",prompt==null?"":prompt.trim());q.put("type",type==null?"text":type);q.put("required",required);a.put(q);}catch(Exception ignored){}}
 public static void addResponse(JSONObject f,JSONObject answers){try{JSONArray a=f.optJSONArray("responses");if(a==null){a=new JSONArray();f.put("responses",a);}JSONObject r=new JSONObject();r.put("id",uid());r.put("createdAt",System.currentTimeMillis());r.put("answers",answers==null?new JSONObject():answers);a.put(r);}catch(Exception ignored){}}
 public static JSONObject chat(String body){
  JSONObject p=parse(body);if(p.has("messages")){try{p.put("schema","neo.noogle.chat/v2");if(!p.has("workspaceId"))p.put("workspaceId",uid());if(!p.has("channelId"))p.put("channelId",uid());if(!p.has("channel"))p.put("channel","general");JSONArray a=p.optJSONArray("messages");if(a!=null)for(int i=0;i<a.length();i++){JSONObject m=a.optJSONObject(i);if(m!=null&&!m.has("id"))m.put("id",uid());}return p;}catch(Exception ignored){}}
  try{JSONObject o=new JSONObject();o.put("schema","neo.noogle.chat/v2");o.put("workspaceId",uid());o.put("channelId",uid());o.put("channel","general");o.put("participants","");JSONArray a=new JSONArray();if(body!=null&&!body.trim().isEmpty()){JSONObject m=new JSONObject();m.put("id",uid());m.put("text",body);m.put("author","Local");m.put("createdAt",System.currentTimeMillis());m.put("threadId",JSONObject.NULL);a.put(m);}o.put("messages",a);return o;}catch(Exception e){return new JSONObject();}
 }
 public static void addMessage(JSONObject chat,String text,String author){addMessage(chat,text,author,null);}
 public static void addMessage(JSONObject chat,String text,String author,String threadId){try{JSONArray a=chat.optJSONArray("messages");if(a==null){a=new JSONArray();chat.put("messages",a);}JSONObject m=new JSONObject();m.put("id",uid());m.put("text",text==null?"":text.trim());m.put("author",author==null||author.trim().isEmpty()?"Local":author.trim());m.put("createdAt",System.currentTimeMillis());if(threadId==null||threadId.trim().isEmpty())m.put("threadId",JSONObject.NULL);else m.put("threadId",threadId.trim());a.put(m);}catch(Exception ignored){}}
 public static String pretty(JSONObject o){return o==null?"{}":o.toString();}
 private static JSONObject parse(String s){try{return s==null||s.trim().isEmpty()?new JSONObject():new JSONObject(s);}catch(Exception e){return new JSONObject();}}
}
