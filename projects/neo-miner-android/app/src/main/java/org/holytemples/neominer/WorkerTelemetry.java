package org.holytemples.neominer;
import java.net.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;
final class WorkerTelemetry {
  static String fetch(String raw, String token) {
    HttpURLConnection c=null;
    try {
      URL url=new URL(raw);
      if(!"https".equalsIgnoreCase(url.getProtocol()))return "Rejected: HTTPS required";
      if(url.getUserInfo()!=null||url.getPort()==0)return "Rejected: invalid endpoint";
      c=(HttpURLConnection)url.openConnection();
      c.setConnectTimeout(7000);c.setReadTimeout(7000);c.setRequestMethod("GET");
      c.setInstanceFollowRedirects(false);c.setRequestProperty("Accept","application/json");
      if(!token.isEmpty())c.setRequestProperty("Authorization","Bearer "+token);
      int code=c.getResponseCode();
      if(code!=200)return "Gateway HTTP "+code;
      if(c.getContentLengthLong()>65536)return "Response too large";
      ByteArrayOutputStream out=new ByteArrayOutputStream();
      try(InputStream in=c.getInputStream()){
        byte[] buf=new byte[4096];int n,total=0;
        while((n=in.read(buf))!=-1){total+=n;if(total>65536)return "Response too large";out.write(buf,0,n);}
      }
      JSONObject j=new JSONObject(new String(out.toByteArray(),StandardCharsets.UTF_8));
      // Display gateway claims as reported, never certified as actual Bitcoin pool results.
      String name=j.optString("worker","Unnamed worker");
      String status=j.optString("status","Unknown");
      String rate=j.has("hashrate_hs")?j.opt("hashrate_hs").toString()+" H/s":"Not supplied";
      String shares=j.has("accepted_shares")?j.opt("accepted_shares").toString():"Not supplied";
      return "Gateway-reported: "+name+" | "+status+" | "+rate+" | shares "+shares+" (unverified)";
    }catch(Exception e){return "Connection failed: "+e.getClass().getSimpleName();}
    finally{if(c!=null)c.disconnect();}
  }
}
