function required(name,value){if(typeof value!=='string'||!value.trim())throw new Error(`${name}_required`);return value.trim();}
function version(value,fallback){return String(value||fallback).trim();}

export async function publishLinkedInReply(job,{accessToken,actorUrn,linkedinVersion=process.env.LINKEDIN_VERSION||'202609',fetchImpl=fetch}={}){
  required('accessToken',accessToken);required('actorUrn',actorUrn);
  const activityUrn=required('parentContentId',job.parentContentId);
  const parentCommentId=required('targetCommentId',job.targetCommentId);
  const compositeParent=`urn:li:comment:(${activityUrn},${parentCommentId})`;
  const url=`https://api.linkedin.com/rest/socialActions/${encodeURIComponent(activityUrn)}/comments`;
  const res=await fetchImpl(url,{method:'POST',headers:{
    Authorization:`Bearer ${accessToken}`,
    'LinkedIn-Version':version(linkedinVersion,'202609'),
    'X-Restli-Protocol-Version':'2.0.0',
    'content-type':'application/json',
  },body:JSON.stringify({actor:actorUrn,message:{text:required('text',job.text)},parentComment:compositeParent})});
  const body=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(`linkedin_reply_failed:${res.status}`);
  const platformPostId=body?.id||res.headers?.get?.('x-restli-id')||null;
  return {destination:'linkedin',published:Boolean(platformPostId),status:platformPostId?'published':'submitted',platformPostId,providerResult:body};
}

export async function publishYouTubeReply(job,{accessToken,fetchImpl=fetch}={}){
  required('accessToken',accessToken);
  const res=await fetchImpl('https://www.googleapis.com/youtube/v3/comments?part=snippet',{method:'POST',headers:{
    Authorization:`Bearer ${accessToken}`,'content-type':'application/json',
  },body:JSON.stringify({snippet:{parentId:required('targetCommentId',job.targetCommentId),textOriginal:required('text',job.text)}})});
  const body=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(`youtube_reply_failed:${res.status}`);
  return {destination:'youtube',published:Boolean(body?.id),status:body?.id?'published':'submitted',platformPostId:body?.id||null,providerResult:body};
}

export function createShemsiReplyPublisher({env=process.env,fetchImpl=fetch}={}){
  return async function publish(job){
    if(!job?.approval||job.approval.status!=='approved')throw new Error('explicit_approval_required');
    if(job.destination==='linkedin'){
      if(!env.LINKEDIN_ACCESS_TOKEN||!env.LINKEDIN_OWNER_URN)return {destination:'linkedin',status:'credentials-required',published:false};
      return publishLinkedInReply(job,{accessToken:env.LINKEDIN_ACCESS_TOKEN,actorUrn:env.LINKEDIN_OWNER_URN,linkedinVersion:env.LINKEDIN_VERSION,fetchImpl});
    }
    if(job.destination==='youtube'){
      if(!env.YOUTUBE_ACCESS_TOKEN)return {destination:'youtube',status:'credentials-required',published:false};
      return publishYouTubeReply(job,{accessToken:env.YOUTUBE_ACCESS_TOKEN,fetchImpl});
    }
    return {destination:job.destination,status:'adapter-not-configured',published:false};
  };
}
