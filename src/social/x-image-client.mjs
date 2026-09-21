// NEO Social — X image-post adapter v0.1
// Media upload and post creation are deliberately separated so upload failures never create text-only posts.
export async function createXImagePost({text,mediaId,bearerToken,fetchImpl=fetch}) {
  if(!text||!mediaId||!bearerToken) throw new Error("text, mediaId and bearerToken are required");
  const res=await fetchImpl("https://api.x.com/2/tweets",{
    method:"POST",headers:{Authorization:`Bearer ${bearerToken}`,"Content-Type":"application/json"},
    body:JSON.stringify({text,media:{media_ids:[mediaId]}})
  });
  const json=await res.json();
  if(!res.ok||json.errors){const e=new Error(json?.detail||json?.title||`X HTTP ${res.status}`);e.payload=json;throw e;}
  return json;
}
export async function uploadXMedia({bytes,mimeType,oauth1Authorization,fetchImpl=fetch}) {
  if(!bytes||!mimeType||!oauth1Authorization) throw new Error("bytes, mimeType and OAuth 1.0a authorization are required");
  const form=new FormData(); form.append("media",new Blob([bytes],{type:mimeType}),"article-image");
  const res=await fetchImpl("https://upload.twitter.com/1.1/media/upload.json",{
    method:"POST",headers:{Authorization:oauth1Authorization},body:form
  });
  const json=await res.json();
  if(!res.ok||!json.media_id_string){const e=new Error(json?.errors?.[0]?.message||`X media HTTP ${res.status}`);e.payload=json;throw e;}
  return json;
}
