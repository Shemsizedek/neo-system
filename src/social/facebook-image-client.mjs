// NEO Social — Facebook Page image adapter v0.1
export async function publishFacebookImage({pageId,pageAccessToken,imageUrl,caption,fetchImpl=fetch}) {
  if (!pageId || !pageAccessToken || !imageUrl) throw new Error("pageId, pageAccessToken and imageUrl are required");
  const body=new URLSearchParams({url:imageUrl,published:"true"});
  if(caption) body.set("caption",caption);
  const res=await fetchImpl(`https://graph.facebook.com/v23.0/${encodeURIComponent(pageId)}/photos`,{
    method:"POST",headers:{Authorization:`Bearer ${pageAccessToken}`,"Content-Type":"application/x-www-form-urlencoded"},body
  });
  const json=await res.json();
  if(!res.ok||json.error){const e=new Error(json?.error?.message||`Facebook HTTP ${res.status}`);e.payload=json;throw e;}
  return json;
}
