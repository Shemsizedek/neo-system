import assert from "node:assert/strict";
import test from "node:test";
import { publishNomniSocialJob } from "./nomni-social-publisher.mjs";

test("facebook publish returns normalized receipt", async()=>{
  const calls=[];
  const fetchImpl=async(url,options)=>{
    calls.push({url,options});
    return {ok:true,status:200,json:async()=>({id:"fb-photo-1",post_id:"fb-post-1"}),headers:{get:()=>null}};
  };
  const receipt=await publishNomniSocialJob({
    destination:"facebook",contentId:"nomni:1",imageUrl:"https://example.org/card.png",caption:"NOMNI",altText:"card"
  },{pageId:"123",pageAccessToken:"token",sourceVersion:"0.1"},{fetchImpl});
  assert.equal(receipt.destination,"facebook");
  assert.equal(receipt.platformPostId,"fb-post-1");
  assert.equal(receipt.status,"published");
});

test("linkedin performs initialize, upload and post then returns receipt", async()=>{
  let step=0;
  const fetchImpl=async(url,options={})=>{
    step++;
    if(step===1) return {ok:true,status:200,json:async()=>({value:{uploadUrl:"https://upload.example/u",image:"urn:li:image:1"}}),headers:{get:()=>null}};
    if(step===2) return {ok:true,status:200,arrayBuffer:async()=>new ArrayBuffer(2),headers:{get:()=>"image/png"}};
    if(step===3) return {ok:true,status:201,json:async()=>({}),headers:{get:()=>null}};
    if(step===4) return {ok:true,status:201,json:async()=>({}),headers:{get:(k)=>k==="x-restli-id"?"urn:li:share:1":null}};
    throw new Error("unexpected call");
  };
  const receipt=await publishNomniSocialJob({
    destination:"linkedin",contentId:"nomni:1",imageUrl:"https://example.org/card.png",caption:"NOMNI",altText:"card"
  },{ownerUrn:"urn:li:person:abc",accessToken:"token",sourceVersion:"0.1"},{fetchImpl});
  assert.equal(receipt.platformPostId,"urn:li:share:1");
  assert.equal(receipt.destination,"linkedin");
});

test("youtube community produces browser UI job and never fakes API publication", async()=>{
  const job=await publishNomniSocialJob({
    destination:"youtube_community",contentId:"nomni:1",imageUrl:"https://example.org/card.png",caption:"NOMNI",altText:"card"
  },{channelUrl:"https://www.youtube.com/@shemsizedek",sourceVersion:"0.1"});
  assert.equal(job.executionMode,"browser-ui");
  assert.equal(job.status,"ready-for-ui-publish");
  assert.equal(job.receiptRequired,true);
});
