// Business rules for Free World Knowledge Forum. No public routes or default admin.
const error=(code,status=400)=>Object.assign(new Error(code),{code,status});
const text=(value,min,max,label)=>{
 if(typeof value!=="string")throw error("INVALID_"+label);
 const trimmed=value.trim();
 if(trimmed.length<min||trimmed.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(trimmed))throw error("INVALID_"+label);
 return trimmed;
};
export function createForum({store,verifyIdentity,rateLimit}){
 if(!store||typeof verifyIdentity!=="function"||typeof rateLimit!=="function")throw error("SERVICE_NOT_CONFIGURED",503);
 async function principal(token){
  if(typeof token!=="string"||!token)throw error("AUTH_REQUIRED",401);
  const verified=await verifyIdentity(token); // Upstream verifier MUST check crypto signature, issuer, audience and expiry.
  if(!verified?.sub)throw error("AUTH_REQUIRED",401);
  const member=await store.memberBySubject(verified.sub);
  if(!member||member.status!=="active")throw error("MEMBERSHIP_INACTIVE",403);
  return member; // Role from database; never from user input or untrusted JWT role.
 }
 async function allow(token,action){
  const member=await principal(token);
  if(!(await rateLimit(member.id,action)))throw error("RATE_LIMIT",429);
  return member;
 }
 return Object.freeze({
  async list(communitySlug){
   const slug=text(communitySlug,3,50,"COMMUNITY");
   return await store.listPublished(slug);
  },
  async ask(token,{communityId,title,body}){
   const m=await allow(token,"ask"),community=await store.community(communityId);
   if(!community||community.status!=="active"||community.visibility!=="public")throw error("COMMUNITY_UNAVAILABLE",404);
   return await store.addPost({communityId,authorId:m.id,title:text(title,5,180,"TITLE"),body:text(body,1,20000,"BODY"),status:"pending"});
  },
  async answer(token,{postId,body,parentReplyId=null}){
   const m=await allow(token,"answer");
   if(!await store.publishedPost(postId))throw error("POST_UNAVAILABLE",404);
   if(parentReplyId&&!await store.publishedReply(parentReplyId,postId))throw error("PARENT_REPLY_UNAVAILABLE",404);
   return await store.addReply({postId,authorId:m.id,parentReplyId,body:text(body,1,10000,"BODY"),status:"pending"});
  },
  async vote(token,{targetType,targetId,value}){
   const m=await allow(token,"vote");
   if(!["post","reply"].includes(targetType)||!Number.isInteger(value)||![-1,1].includes(value))throw error("INVALID_VOTE");
   if(!await (targetType==="post"?store.publishedPost(targetId):store.publishedReply(targetId)))throw error("TARGET_UNAVAILABLE",404);
   return await store.setVote({memberId:m.id,targetType,targetId,value});
  },
  async report(token,{targetType,targetId,reason}){
   const m=await allow(token,"report");
   if(!["post","reply"].includes(targetType))throw error("INVALID_TARGET");
   if(!await (targetType==="post"?store.publishedPost(targetId):store.publishedReply(targetId)))throw error("TARGET_UNAVAILABLE",404);
   return await store.addReport({reporterId:m.id,targetType,targetId,reason:text(reason,10,1000,"REASON"),status:"open"});
  },
  async moderate(token,{targetType,targetId,action,reason}){
   const m=await allow(token,"moderate");
   if(!["moderator","admin"].includes(m.role))throw error("MODERATOR_REQUIRED",403);
   if(!["post","reply"].includes(targetType)||!["approve","hide"].includes(action))throw error("INVALID_ACTION");
   const target=await store.getTarget(targetType,targetId);
   if(!target||!["pending","published","hidden"].includes(target.status))throw error("TARGET_UNAVAILABLE",404);
   return await store.moderateTarget({actorId:m.id,targetType,targetId,next:action==="approve"?"published":"hidden",action,reason:text(reason,4,1000,"REASON")});
  }
 });
}
