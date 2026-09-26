const clean=value=>typeof value==='string'?value.trim():'';
const iso=value=>{const d=new Date(value||Date.now());return Number.isNaN(d.getTime())?new Date().toISOString():d.toISOString();};

export function triageComment(item){
  const text=clean(item?.commentText);
  const lower=text.toLowerCase();
  const question=/\?/.test(text)||/\b(what|why|how|where|when|who|can|could|would|should|is|are|do|does)\b/i.test(text);
  const complaint=/\b(problem|issue|wrong|broken|scam|refund|complaint|angry|upset|disappointed|failed)\b/i.test(text);
  const praise=/\b(thank|thanks|great|love|excellent|awesome|amazing)\b/i.test(text);
  const priority=complaint?'high':question?'normal':'low';
  const disposition=complaint?'needs-human-attention':question?'reply-recommended':praise?'acknowledgement-optional':'review';
  return {...item,triage:{priority,disposition,signals:{question,complaint,praise}}};
}

export async function fetchLinkedInComments({activityUrn,accessToken,linkedinVersion=process.env.LINKEDIN_VERSION||'202609',start=0,count=100,fetchImpl=fetch}={}){
  if(!clean(activityUrn))throw new Error('linkedin_activity_urn_required');
  if(!clean(accessToken))throw new Error('linkedin_access_token_required');
  const q=new URLSearchParams({start:String(start),count:String(Math.min(Math.max(count,1),100))});
  const url=`https://api.linkedin.com/rest/socialActions/${encodeURIComponent(activityUrn)}/comments?${q}`;
  const res=await fetchImpl(url,{headers:{Authorization:`Bearer ${accessToken}`,'LinkedIn-Version':String(linkedinVersion),'X-Restli-Protocol-Version':'2.0.0'}});
  const body=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(`linkedin_comments_read_failed:${res.status}`);
  const elements=Array.isArray(body?.elements)?body.elements:[];
  return elements.map(c=>({
    platform:'linkedin',
    accountId:clean(c?.actor)||'unknown',
    commentId:String(c?.id||''),
    parentContentId:activityUrn,
    authorName:null,
    commentText:clean(c?.message?.text),
    parentContentText:null,
    permalink:null,
    receivedAt:iso(c?.created?.time||c?.createdAt),
    raw:c,
  })).filter(x=>x.commentId&&x.commentText);
}

export async function fetchYouTubeCommentThreads({accessToken,channelId,videoId,pageToken,maxResults=100,fetchImpl=fetch}={}){
  if(!clean(accessToken))throw new Error('youtube_access_token_required');
  if(!clean(channelId)&&!clean(videoId))throw new Error('youtube_channel_or_video_required');
  const q=new URLSearchParams({part:'snippet,replies',maxResults:String(Math.min(Math.max(maxResults,1),100)),order:'time',textFormat:'plainText'});
  if(clean(videoId))q.set('videoId',videoId);else q.set('allThreadsRelatedToChannelId',channelId);
  if(clean(pageToken))q.set('pageToken',pageToken);
  const res=await fetchImpl(`https://www.googleapis.com/youtube/v3/commentThreads?${q}`,{headers:{Authorization:`Bearer ${accessToken}`}});
  const body=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(`youtube_comments_read_failed:${res.status}`);
  const items=Array.isArray(body?.items)?body.items:[];
  const comments=items.map(thread=>{
    const top=thread?.snippet?.topLevelComment;
    const sn=top?.snippet||{};
    return {
      platform:'youtube',
      accountId:clean(sn?.authorChannelId?.value)||'unknown',
      commentId:String(top?.id||''),
      parentContentId:clean(thread?.snippet?.videoId)||clean(videoId)||clean(channelId),
      authorName:clean(sn?.authorDisplayName)||null,
      commentText:clean(sn?.textDisplay)||clean(sn?.textOriginal),
      parentContentText:null,
      permalink:null,
      receivedAt:iso(sn?.publishedAt),
      raw:thread,
    };
  }).filter(x=>x.commentId&&x.commentText);
  return {comments,nextPageToken:body?.nextPageToken||null};
}

export function filterOwnComments(items,{ownActorUrn,ownYouTubeChannelId}={}){
  return (Array.isArray(items)?items:[]).filter(item=>{
    if(item.platform==='linkedin'&&clean(ownActorUrn)&&item.accountId===clean(ownActorUrn))return false;
    if(item.platform==='youtube'&&clean(ownYouTubeChannelId)&&item.accountId===clean(ownYouTubeChannelId))return false;
    return true;
  });
}

export async function readBackLinkedInReply({activityUrn,commentId,accessToken,linkedinVersion=process.env.LINKEDIN_VERSION||'202609',fetchImpl=fetch}={}){
  if(!clean(activityUrn)||!clean(commentId)||!clean(accessToken))throw new Error('linkedin_readback_fields_required');
  const url=`https://api.linkedin.com/rest/socialActions/${encodeURIComponent(activityUrn)}/comments/${encodeURIComponent(commentId)}`;
  const res=await fetchImpl(url,{headers:{Authorization:`Bearer ${accessToken}`,'LinkedIn-Version':String(linkedinVersion),'X-Restli-Protocol-Version':'2.0.0'}});
  const body=await res.json().catch(()=>({}));
  if(res.status===404)return {verified:false,status:'not-found'};
  if(!res.ok)throw new Error(`linkedin_readback_failed:${res.status}`);
  return {verified:Boolean(body?.id||commentId),status:'verified',platformPostId:String(body?.id||commentId),providerResult:body};
}

export async function readBackYouTubeReply({commentId,accessToken,fetchImpl=fetch}={}){
  if(!clean(commentId)||!clean(accessToken))throw new Error('youtube_readback_fields_required');
  const q=new URLSearchParams({part:'snippet',id:commentId,textFormat:'plainText'});
  const res=await fetchImpl(`https://www.googleapis.com/youtube/v3/comments?${q}`,{headers:{Authorization:`Bearer ${accessToken}`}});
  const body=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(`youtube_readback_failed:${res.status}`);
  const found=Array.isArray(body?.items)&&body.items.some(x=>String(x?.id||'')===String(commentId));
  return {verified:found,status:found?'verified':'not-found',platformPostId:found?String(commentId):null,providerResult:body};
}

export function createShemsiIngestionRuntime({env=process.env,fetchImpl=fetch}={}){
  return {
    async ingestLinkedIn({activityUrn}={}){
      if(!env.LINKEDIN_ACCESS_TOKEN)return {platform:'linkedin,status:'credentials-required',items:[]};
      const items=await fetchLinkedInComments({activityUrn,accessToken:env.LINKEDIN_ACCESS_TOKEN,linkedinVersion:env.LINKEDIN_VERSION,fetchImpl});
      const external=filterOwnComments(items,{ownActorUrn:env.LINKEDIN_OWNER_URN}).map(item=>({...item,authorExternalId:item.accountId,accountId:clean(env.LINKEDIN_OWNER_URN)||'linkedin-authorized-account'}));
      return {platform:'linkedin',status:'ok',items:external.map(triageComment)};
    },
    async ingestYouTube({videoId,channelId=env.YOUTUBE_CHANNEL_ID,pageToken}={}){
      if(!env.YOUTUBE_ACCESS_TOKEN)return {platform:'youtube',status:'credentials-required',items:[]};
      const result=await fetchYouTubeCommentThreads({accessToken:env.YOUTUBE_ACCESS_TOKEN,channelId,videoId,pageToken,fetchImpl});
      const external=filterOwnComments(result.comments,{ownYouTubeChannelId:env.YOUTUBE_CHANNEL_ID}).map(item=>({...item,authorExternalId:item.accountId,accountId:clean(env.YOUTUBE_CHANNEL_ID)||clean(channelId)||'youtube-authorized-account'}));
      return {platform:'youtube',status:'ok',items:external.map(triageComment),nextPageToken:result.nextPageToken};
    },
    async verify(receipt,{parentContentId}={}){
      if(!receipt?.platformPostId)return {verified:false,status:'no-platform-id'};
      if(receipt.destination==='linkedin'){
        if(!env.LINKEDIN_ACCESS_TOKEN)return {verified:false,status:'credentials-required'};
        return readBackLinkedInReply({activityUrn:parentContentId,commentId:receipt.platformPostId,accessToken:env.LINKEDIN_ACCESS_TOKEN,linkedinVersion:env.LINKEDIN_VERSION,fetchImpl});
      }
      if(receipt.destination==='youtube'){
        if(!env.YOUTUBE_ACCESS_TOKEN)return {verified:false,status:'credentials-required'};
        return readBackYouTubeReply({commentId:receipt.platformPostId,accessToken:env.YOUTUBE_ACCESS_TOKEN,fetchImpl});
      }
      return {verified:false,status:'verification-adapter-not-configured'};
    },
  };
}
