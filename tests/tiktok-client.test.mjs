import assert from "node:assert/strict";
import {publishPhoto} from "../src/social/tiktok-client.mjs";

const originalFetch = globalThis.fetch;
let captured;
globalThis.fetch = async (url, options) => {
  captured = {url, options, body: JSON.parse(options.body)};
  return {ok:true,status:200,json:async()=>({data:{publish_id:"p_test_27"},error:{code:"ok",message:""}})};
};
try {
  const out = await publishPhoto({
    token:"test-token",
    title:"Paper 27",
    description:"Test",
    photoUrls:["https://holytemples.org/media/paper-27.webp"],
    privacyLevel:"SELF_ONLY",
    brandOrganic:true
  });
  assert.equal(captured.url,"https://open.tiktokapis.com/v2/post/publish/content/init/");
  assert.equal(captured.body.media_type,"PHOTO");
  assert.equal(captured.body.post_mode,"DIRECT_POST");
  assert.equal(captured.body.source_info.source,"PULL_FROM_URL");
  assert.equal(captured.body.post_info.privacy_level,"SELF_ONLY");
  assert.equal(out.data.publish_id,"p_test_27");
  console.log("TikTok adapter contract test passed");
} finally { globalThis.fetch = originalFetch; }
