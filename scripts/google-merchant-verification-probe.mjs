const accountId = process.env.GOOGLE_MERCHANT_ACCOUNT_ID || "5429352076";
const targetUri = process.env.GOOGLE_MERCHANT_HOMEPAGE_URI || "https://shemsizedek.myspreadshop.com";
const token = (process.env.GOOGLE_MERCHANT_ACCESS_TOKEN || "").trim();
if (!token) throw new Error("GOOGLE_MERCHANT_ACCESS_TOKEN is required.");

async function api(url,{method="GET",body}={}) {
  const res=await fetch(url,{
    method,
    headers:{Authorization:`Bearer ${token}`,...(body?{"Content-Type":"application/json"}:{})},
    body:body?JSON.stringify(body):undefined
  });
  const text=await res.text();
  let payload=null; try{payload=text?JSON.parse(text):null}catch{payload=text}
  if(!res.ok){
    const err=new Error(`${method} ${url} failed: ${res.status} ${res.statusText}\n${JSON.stringify(payload,null,2)}`);
    err.status=res.status; err.payload=payload; throw err;
  }
  return payload;
}

const base=`https://merchantapi.googleapis.com/accounts/v1/accounts/${accountId}/homepage`;
const current=await api(base);

let verificationReady=false;
let probe=null;
let reason="not_attempted";

// Non-destructive probe: temporarily point homepage at Spreadshop, attempt claim,
// and always restore the prior homepage unless claim succeeds.
if(current?.uri===targetUri && current?.claimed===true){
  verificationReady=true;
  probe={already_claimed:true};
}else{
  const prior=current;
  try{
    await api(`${base}?update_mask=uri`,{
      method:"PATCH",
      body:{name:`accounts/${accountId}/homepage`,uri:targetUri}
    });
    probe=await api(`${base}:claim`,{method:"POST",body:{overwrite:false}});
    verificationReady=probe?.claimed===true;
    reason=verificationReady?"verified_and_claimable":"claim_returned_not_claimed";
  }catch(err){
    const metadata=err?.payload?.error?.details?.find?.(x=>x?.metadata)?.metadata||{};
    reason=metadata.REASON||err?.payload?.error?.status||String(err);
  }finally{
    if(!verificationReady && prior?.uri){
      await api(`${base}?update_mask=uri`,{
        method:"PATCH",
        body:{name:`accounts/${accountId}/homepage`,uri:prior.uri}
      });
      if(prior?.claimed){
        await api(`${base}:claim`,{method:"POST",body:{overwrite:false}});
      }
    }
  }
}

const after=await api(base);
console.log(JSON.stringify({
  account_id:accountId,
  target_uri:targetUri,
  verification_ready:verificationReady,
  reason,
  probe,
  current_after_probe:after,
  next_action:verificationReady
    ?"Homepage is verified and claimable; proceed to refetch and diagnostics."
    :"Verify the Spreadshop URL in Google Search Console, then rerun this probe."
},null,2));

if(!verificationReady) process.exit(2);
