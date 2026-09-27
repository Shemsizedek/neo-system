const domain = process.env.GOOGLE_SITEVERIFY_DOMAIN || "holytemples.org";
const merchantAccount = process.env.GOOGLE_MERCHANT_ACCOUNT_ID || "5429352076";
const homepage = process.env.GOOGLE_MERCHANT_HOMEPAGE_URI || "https://shop.holytemples.org";
const token = (process.env.GOOGLE_SITEVERIFY_ACCESS_TOKEN || "").trim();
const apply = process.env.GOOGLE_MERCHANT_APPLY || "";
const expected = "CONFIRM_VERIFY_SERVICE_ACCOUNT_AND_CLAIM_SHOP";

if (!token) throw new Error("GOOGLE_SITEVERIFY_ACCESS_TOKEN is required.");
if (apply !== expected) throw new Error(`Refusing verification/claim. Set GOOGLE_MERCHANT_APPLY=${expected}`);

async function call(url, {method="GET", body}={}) {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? {"Content-Type":"application/json"} : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  return {ok:res.ok,status:res.status,statusText:res.statusText,payload};
}

const site = {type:"INET_DOMAIN", identifier:domain};
const tokenResp = await call("https://www.googleapis.com/siteVerification/v1/token", {
  method:"POST",
  body:{site, verificationMethod:"DNS_TXT"}
});
if (!tokenResp.ok) {
  console.error(JSON.stringify({stage:"get_token",...tokenResp},null,2));
  process.exit(2);
}
const verificationToken = tokenResp.payload?.token;
if (!verificationToken) throw new Error("Site Verification API returned no DNS token.");

console.log(JSON.stringify({
  stage:"dns_token",
  domain,
  verification_method:"DNS_TXT",
  dns_name:"@",
  dns_value:verificationToken
},null,2));

const verifyResp = await call("https://www.googleapis.com/siteVerification/v1/webResource?verificationMethod=DNS_TXT", {
  method:"POST",
  body:{site}
});

if (!verifyResp.ok) {
  console.error(JSON.stringify({
    stage:"verification_pending",
    domain,
    dns_name:"@",
    dns_value:verificationToken,
    status:verifyResp.status,
    response:verifyResp.payload
  },null,2));
  process.exit(3);
}

const merchantBase = `https://merchantapi.googleapis.com/accounts/v1/accounts/${merchantAccount}/homepage`;
const homepageResp = await call(merchantBase);
if (!homepageResp.ok) {
  console.error(JSON.stringify({stage:"merchant_homepage_read",...homepageResp},null,2));
  process.exit(4);
}

if (homepageResp.payload?.uri !== homepage) {
  const updateResp = await call(`${merchantBase}?update_mask=uri`, {
    method:"PATCH",
    body:{name:`accounts/${merchantAccount}/homepage`,uri:homepage}
  });
  if (!updateResp.ok) {
    console.error(JSON.stringify({stage:"merchant_homepage_update",...updateResp},null,2));
    process.exit(5);
  }
}

const claimResp = await call(`${merchantBase}:claim`, {method:"POST",body:{overwrite:false}});
if (!claimResp.ok) {
  console.error(JSON.stringify({stage:"merchant_claim",...claimResp},null,2));
  process.exit(6);
}

console.log(JSON.stringify({
  verification_success:true,
  domain,
  verified_resource:verifyResp.payload,
  merchant_claim:claimResp.payload
},null,2));

if (claimResp.payload?.uri !== homepage || claimResp.payload?.claimed !== true) process.exit(7);
