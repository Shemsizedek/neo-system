import test from "node:test";
import assert from "node:assert/strict";
import {createForum} from "../src/core.mjs";
import {createTestStore} from "../src/sqlite-test-store.mjs";
function fixture(){
 const store=createTestStore(),member=store.seedMember({sub:"member-identity-001"}),mod=store.seedMember({sub:"moderator-identity-001",role:"moderator"}),community=store.seedCommunity({slug:"world-library"});
 const identities=new Map([["good",{sub:member.sub}],["mod",{sub:mod.sub}],["fake-admin",{sub:member.sub}]]);
 const forum=createForum({store,verifyIdentity:async token=>identities.get(token),rateLimit:async()=>true});
 return {store,forum,member,mod,community};
}
test("missing identity verifier is rejected",()=>assert.throws(()=>createForum({store:{}}),{code:"SERVICE_NOT_CONFIGURED"}));
test("anonymous and forged moderator access denied",async()=>{
 const {store,forum,community}=fixture();
 await assert.rejects(()=>forum.ask(null,{communityId:community.id,title:"Question about library",body:"Is it available?"}),{code:"AUTH_REQUIRED"});
 await assert.rejects(()=>forum.moderate("fake-admin",{targetType:"post",targetId:"x",action:"approve",reason:"valid review"}),{code:"MODERATOR_REQUIRED"});
 store.close();
});
test("questions, answers, votes, reports and moderation enforce visibility",async()=>{
 const {store,forum,community}=fixture();
 const post=await forum.ask("good",{communityId:community.id,title:"What should we study?",body:"Local history resources?"});
 assert.equal(post.status,"pending");assert.equal((await forum.list("world-library")).length,0);
 await assert.rejects(()=>forum.vote("good",{targetType:"post",targetId:post.id,value:1}),{code:"TARGET_UNAVAILABLE"});
 await forum.moderate("mod",{targetType:"post",targetId:post.id,action:"approve",reason:"Approved question"});
 assert.equal((await forum.list("world-library")).length,1);
 const reply=await forum.answer("good",{postId:post.id,body:"Resources will be reviewed."});
 assert.equal(reply.status,"pending");
 await forum.moderate("mod",{targetType:"reply",targetId:reply.id,action:"approve",reason:"Reviewed answer"});
 await forum.vote("good",{targetType:"post",targetId:post.id,value:1});
 await forum.vote("good",{targetType:"post",targetId:post.id,value:-1});
 assert.equal(store.countVotes(),1);
 assert.equal((await forum.report("good",{targetType:"post",targetId:post.id,reason:"May contain inaccurate data"})).status,"open");
 await forum.moderate("mod",{targetType:"post",targetId:post.id,action:"hide",reason:"Review fact check"});
 assert.equal((await forum.list("world-library")).length,0);
 assert.equal(store.countActions(),3);store.close();
});
test("rate limits and draft communities fail closed",async()=>{
 const {store,community}=fixture();const ident=async()=>({sub:"member-identity-001"});
 const blocked=createForum({store,verifyIdentity:ident,rateLimit:async()=>false});
 await assert.rejects(()=>blocked.ask("good",{communityId:community.id,title:"Valid topic",body:"Question"}),{code:"RATE_LIMIT"});
 const enabled=createForum({store,verifyIdentity:ident,rateLimit:async()=>true});
 const draft=store.seedCommunity({slug:"not-launched",status:"draft"});
 await assert.rejects(()=>enabled.ask("good",{communityId:draft.id,title:"Valid topic",body:"Question"}),{code:"COMMUNITY_UNAVAILABLE"});
 store.close();
});
test("short titles and empty bodies rejected",async()=>{
 const {store,forum,community}=fixture();
 await assert.rejects(()=>forum.ask("good",{communityId:community.id,title:"hi",body:"Question"}),{code:"INVALID_TITLE"});
 await assert.rejects(()=>forum.ask("good",{communityId:community.id,title:"A valid question",body:""}),{code:"INVALID_BODY"});
 store.close();
});
