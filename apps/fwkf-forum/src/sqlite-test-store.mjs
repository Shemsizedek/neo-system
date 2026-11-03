// Ephemeral SQLite adapter for tests, not a production store. No public routes.
import {DatabaseSync} from "node:sqlite";
import {randomUUID} from "node:crypto";
export function createTestStore(){
 const db=new DatabaseSync(":memory:");
 db.exec(`PRAGMA foreign_keys=ON;
 CREATE TABLE members (id TEXT PRIMARY KEY, sub TEXT UNIQUE, role TEXT, status TEXT);
 CREATE TABLE communities (id TEXT PRIMARY KEY, slug TEXT UNIQUE, status TEXT, visibility TEXT);
 CREATE TABLE posts (id TEXT PRIMARY KEY, community_id TEXT, author_id TEXT, title TEXT, body TEXT, status TEXT);
 CREATE TABLE replies (id TEXT PRIMARY KEY, post_id TEXT, author_id TEXT, parent_reply_id TEXT, body TEXT, status TEXT);
 CREATE TABLE votes (member_id TEXT,target_type TEXT,target_id TEXT,value INTEGER,PRIMARY KEY(member_id,target_type,target_id));
 CREATE TABLE reports (id TEXT PRIMARY KEY, reporter_id TEXT, target_type TEXT, target_id TEXT, reason TEXT, status TEXT);
 CREATE TABLE moderation_actions (id TEXT PRIMARY KEY,actor_id TEXT,target_type TEXT,target_id TEXT,action TEXT,reason TEXT);`);
 const get=(sql,...v)=>db.prepare(sql).get(...v),all=(sql,...v)=>db.prepare(sql).all(...v),run=(sql,...v)=>db.prepare(sql).run(...v);
 return {
  seedMember({sub,role="member",status="active"}){const id=randomUUID();run("INSERT INTO members VALUES(?,?,?,?)",id,sub,role,status);return {id,sub,role,status};},
  seedCommunity({slug,status="active",visibility="public"}){const id=randomUUID();run("INSERT INTO communities VALUES(?,?,?,?)",id,slug,status,visibility);return {id,slug,status,visibility};},
  memberBySubject(sub){return get("SELECT * FROM members WHERE sub=?",sub);},
  community(id){return get("SELECT * FROM communities WHERE id=?",id);},
  addPost(p){const id=randomUUID();run("INSERT INTO posts VALUES(?,?,?,?,?,?)",id,p.communityId,p.authorId,p.title,p.body,p.status);return {id,status:p.status};},
  addReply(p){const id=randomUUID();run("INSERT INTO replies VALUES(?,?,?,?,?,?)",id,p.postId,p.authorId,p.parentReplyId,p.body,p.status);return {id,status:p.status};},
  publishedPost(id){return get("SELECT * FROM posts WHERE id=? AND status='published'",id);},
  publishedReply(id,postId){return postId?get("SELECT * FROM replies WHERE id=? AND post_id=? AND status='published'",id,postId):get("SELECT * FROM replies WHERE id=? AND status='published'",id);},
  getTarget(type,id){return get("SELECT * FROM "+(type==="post"?"posts":"replies")+" WHERE id=?",id);},
  listPublished(slug){return all("SELECT p.id,p.title,p.body FROM posts p JOIN communities c ON c.id=p.community_id WHERE c.slug=? AND c.status='active' AND c.visibility='public' AND p.status='published' ORDER BY p.id",slug);},
  setVote(v){run("INSERT INTO votes VALUES (?,?,?,?) ON CONFLICT(member_id,target_type,target_id) DO UPDATE SET value=excluded.value",v.memberId,v.targetType,v.targetId,v.value);return {recorded:true};},
  addReport(r){const id=randomUUID();run("INSERT INTO reports VALUES(?,?,?,?,?,?)",id,r.reporterId,r.targetType,r.targetId,r.reason,r.status);return {id,status:r.status};},
  moderateTarget(m){db.exec("BEGIN");try{run("UPDATE "+(m.targetType==="post"?"posts":"replies")+" SET status=? WHERE id=?",m.next,m.targetId);run("INSERT INTO moderation_actions VALUES (?,?,?,?,?,?)",randomUUID(),m.actorId,m.targetType,m.targetId,m.action,m.reason);db.exec("COMMIT");return {status:m.next};}catch(e){db.exec("ROLLBACK");throw e;}},
  countVotes(){return get("SELECT COUNT(*) AS n FROM votes").n;},
  countActions(){return get("SELECT COUNT(*) AS n FROM moderation_actions").n;},
  close(){db.close();}
 };
}
