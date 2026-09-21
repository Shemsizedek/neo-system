// NEO Social — LinkedIn image-post adapter v0.1
export async function initializeLinkedInImageUpload({ownerUrn,accessToken,fetchImpl=fetch}) {
  if(!ownerUrn||!accessToken) throw new Error("ownerUrn and accessToken are required");
  const res=await fetchImpl("https://api.linkedin.com/rest/images?action=initializeUpload",{
    method:"POST",headers:{Authorization:`Bearer ${accessToken}`,"LinkedIn-Version":process.env.LINKEDIN_VERSION||"202509","X-Restli-Protocol-Version":"2.0.0","Content-Type":"application/json"},
    body:JSON.stringify({initializeUploadRequest:{owner:ownerUrn}})
  });
  const json=await res.json(); if(!res.ok){const e=new Error(`LinkedIn initialize HTTP ${res.status}`);e.payload=json;throw e;} return json;
}
export async function createLinkedInImagePost({authorUrn,accessToken,commentary,imageUrn,altText="",fetchImpl=fetch}) {
  if(!authorUrn||!accessToken||!imageUrn) throw new Error("authorUrn, accessToken and imageUrn are required");
  const res=await fetchImpl("https://api.linkedin.com/rest/posts",{
    method:"POST",headers:{Authorization:`Bearer ${accessToken}`,"LinkedIn-Version":process.env.LINKEDIN_VERSION||"202509","X-Restli-Protocol-Version":"2.0.0","Content-Type":"application/json"},
    body:JSON.stringify({author:authorUrn,commentary,visibility:"PUBLIC",distribution:{feedDistribution:"MAIN_FEED",targetEntities:[],thirdPartyDistributionChannels:[]},content:{media:{id:imageUrn,altText}},lifecycleState:"PUBLISHED",isReshareDisabledByAuthor:false})
  });
  const json=await res.json().catch(()=>({})); if(!res.ok){const e=new Error(`LinkedIn post HTTP ${res.status}`);e.payload=json;throw e;} return {id:res.headers.get("x-restli-id")||json.id||null,...json};
}
