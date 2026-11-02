// Postgres adapter: supply least-privileged pg Pool (no credentials stored here).
// Do not deploy until separate Neon test branch, auth, quotas and controls pass.
export function createPostgresStore({pool}){
 if(!pool||typeof pool.query!=="function"||typeof pool.connect!=="function")throw Error("PG_POOL_NOT_CONFIGURED");
 const q=(sql,values=[])=>pool.query(sql,values).then(r=>r.rows);
 const typeTable=t=>t==="post"?"posts":t==="reply"?"replies":null;
 return Object.freeze({
  async memberBySubject(sub){return (await q("SELECT id,role,status FROM fwkf_forum.members WHERE auth_subject=$1",[sub]))[0];},
  async community(id){return (await q("SELECT id,status,visibility FROM fwkf_forum.communities WHERE id=$1",[id]))[0];},
  async addPost(p){return (await q("INSERT INTO fwkf_forum.posts(community_id,author_id,title,body,status) VALUES ($1,$2,$3,$4,$5) RETURNING id,status",[p.communityId,p.authorId,p.title,p.body,p.status]))[0];},
  async addReply(p){return (await q("INSERT INTO fwkf_forum.replies(post_id,parent_reply_id,author_id,body,status) VALUES ($1,$2,$3,$4,$5) RETURNING id,status",[p.postId,p.parentReplyId,p.authorId,p.body,p.status]))[0];},
  async publishedPost(id){return (await q("SELECT id,status FROM fwkf_forum.posts WHERE id=$1 AND status='published'",[id]))[0];},
  async publishedReply(id,postId){return (await q("SELECT id,status FROM fwkf_forum.replies WHERE id=$1 AND status='published'"+(postId?" AND post_id=$2":""),postId?[id,postId]:[id]))[0];},
  async getTarget(type,id){const table=typeTable(type);if(!table)throw Error("INVALID_TARGET");return (await q("SELECT id,status FROM fwkf_forum."+table+" WHERE id=$1",[id]))[0];},
  async listPublished(slug){return await q("SELECT p.id,p.title,p.body FROM fwkf_forum.posts p JOIN fwkf_forum.communities c ON c.id=p.community_id WHERE c.slug=$1 AND c.status='active' AND c.visibility='public' AND p.status='published' ORDER BY p.created_at DESC LIMIT 25",[slug]);},
  async setVote(v){
   if(v.targetType==="post")return (await q("INSERT INTO fwkf_forum.votes(member_id,post_id,value) VALUES ($1,$2,$3) ON CONFLICT (member_id,post_id) WHERE post_id IS NOT NULL DO UPDATE SET value=excluded.value RETURNING id",[v.memberId,v.targetId,v.value]))[0];
   if(v.targetType==="reply")return (await q("INSERT INTO fwkf_forum.votes(member_id,reply_id,value) VALUES ($1,$2,$3) ON CONFLICT (member_id,reply_id) WHERE reply_id IS NOT NULL DO UPDATE SET value=excluded.value RETURNING id",[v.memberId,v.targetId,v.value]))[0];
   throw Error("INVALID_TARGET");
  },
  async addReport(r){const post=r.targetType==="post"?r.targetId:null,reply=r.targetType==="reply"?r.targetId:null;return (await q("INSERT INTO fwkf_forum.reports(reporter_id,post_id,reply_id,reason,status) VALUES ($1,$2,$3,$4,$5) RETURNING id,status",[r.reporterId,post,reply,r.reason,r.status]))[0];},
  async moderateTarget(m){
   const table=typeTable(m.targetType);if(!table)throw Error("INVALID_TARGET");
   const client=await pool.connect();
   try{
    await client.query("BEGIN");
    const updated=await client.query("UPDATE fwkf_forum."+table+" SET status=$1 WHERE id=$2 AND status IN ('pending','published','hidden') RETURNING id",[m.next,m.targetId]);
    if(updated.rowCount!==1)throw Error("TARGET_UNAVAILABLE");
    await client.query("INSERT INTO fwkf_forum.moderation_actions(actor_id,post_id,reply_id,action,reason) VALUES ($1,$2,$3,$4,$5)",[m.actorId,m.targetType==="post"?m.targetId:null,m.targetType==="reply"?m.targetId:null,m.action,m.reason]);
    await client.query("COMMIT");return {status:m.next};
   }catch(e){await client.query("ROLLBACK");throw e;}finally{client.release();}
  }
 });
}
