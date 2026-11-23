import test from "node:test";
import assert from "node:assert/strict";
import {createPostgresStore} from "../src/pg-store.mjs";
function mockPool({failUpdate=false}={}){
 const calls=[];
 const query=async(sql,values=[])=>{
  calls.push({sql,values});
  if(sql.startsWith("UPDATE")&&failUpdate)return {rows:[],rowCount:0};
  if(sql.startsWith("UPDATE"))return {rows:[{id:values[1]}],rowCount:1};
  return {rows:[{id:"record-1",status:"pending"}],rowCount:1};
 };
 return {calls,pool:{query,connect:async()=>({query,release(){calls.push({sql:"RELEASE"})}})}};
}
test("parameterized member lookup and posts exclude SQL injection",async()=>{
 const {calls,pool}=mockPool(),store=createPostgresStore({pool});
 const attacker="test'; DROP TABLE members; --";
 await store.memberBySubject(attacker);
 assert.ok(calls[0].sql.includes("auth_subject=$1"));assert.deepEqual(calls[0].values,[attacker]);
 await store.addPost({communityId:"c",authorId:"a",title:attacker,body:"Safe question",status:"pending"});
 assert.ok(calls[1].sql.includes("$3"));assert.equal(calls[1].values[2],attacker);
 assert.ok(!calls[1].sql.includes(attacker));
});
test("moderation commits atomically and logs the actor",async()=>{
 const {calls,pool}=mockPool(),store=createPostgresStore({pool});
 await store.moderateTarget({actorId:"moderator",targetType:"post",targetId:"post1",next:"published",action:"approve",reason:"Reviewed content"});
 assert.deepEqual(calls.map(x=>x.sql.split(" ")[0]).filter(x=>x!=="RELEASE"),["BEGIN","UPDATE","INSERT","COMMIT"]);
 assert.ok(calls.some(x=>x.sql.includes("moderation_actions")));
});
test("moderation rollback if record cannot be updated",async()=>{
 const {calls,pool}=mockPool({failUpdate:true}),store=createPostgresStore({pool});
 await assert.rejects(()=>store.moderateTarget({actorId:"mod",targetType:"reply",targetId:"missing",next:"hidden",action:"hide",reason:"Inappropriate"}),/TARGET_UNAVAILABLE/);
 assert.ok(calls.some(x=>x.sql==="ROLLBACK"));assert.ok(!calls.some(x=>x.sql==="COMMIT"));
});
test("vote uniqueness uses Postgres partial-index conflict target",async()=>{
 const {calls,pool}=mockPool(),store=createPostgresStore({pool});
 await store.setVote({memberId:"member1",targetType:"reply",targetId:"reply1",value:1});
 assert.ok(calls[0].sql.includes("WHERE reply_id IS NOT NULL"));
 assert.deepEqual(calls[0].values,["member1","reply1",1]);
});
