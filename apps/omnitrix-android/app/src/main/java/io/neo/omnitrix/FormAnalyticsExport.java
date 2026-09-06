package io.neo.omnitrix;

import org.json.*;

/** v4.10 aggregate analytics export. Deliberately excludes individual response answers. */
public final class FormAnalyticsExport {
 private FormAnalyticsExport(){}
 public static String csv(JSONObject form){JSONObject a=StructuredWorkspace.responseAnalytics(form);StringBuilder b=new StringBuilder("question,type,responses,answered,completion_percent,option,count\n");int total=a.optInt("responses");JSONArray qs=a.optJSONArray("questions");if(qs==null)return b.toString();for(int i=0;i<qs.length();i++){JSONObject q=qs.optJSONObject(i);if(q==null)continue;String prompt=q.optString("prompt"),type=q.optString("type"),base=cell(prompt)+","+cell(type)+","+total+","+q.optInt("answered")+","+q.optDouble("completionRate");JSONObject counts=q.optJSONObject("counts");if(counts==null||counts.length()==0){b.append(base).append(",,\n");continue;}java.util.Iterator<String> keys=counts.keys();while(keys.hasNext()){String option=keys.next();b.append(base).append(',').append(cell(option)).append(',').append(counts.optInt(option)).append('\n');}}return b.toString();}
 private static String cell(String s){String v=s==null?"":s;return "\""+v.replace("\"","\"\"")+"\"";}
}
