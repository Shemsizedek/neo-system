const accountId = process.env.GOOGLE_MERCHANT_ACCOUNT_ID || "5429352076";
const token = (process.env.GOOGLE_MERCHANT_ACCESS_TOKEN || "").trim();
if (!token) throw new Error("GOOGLE_MERCHANT_ACCESS_TOKEN is required.");

const url=`https://merchantapi.googleapis.com/issueresolution/v1/accounts/${accountId}:renderaccountissues?timeZone=America%2FChicago&languageCode=en-US&userInputActionOption=REDIRECT_TO_MERCHANT_CENTER`;
const res=await fetch(url,{
  method:"POST",
  headers:{
    Authorization:`Bearer ${token}`,
    "Content-Type":"application/json"
  },
  body:"{}"
});
const text=await res.text();
let payload=null;
try{payload=text?JSON.parse(text):null}catch{payload=text}
if(!res.ok) throw new Error(`renderaccountissues failed ${res.status}: ${JSON.stringify(payload)}`);

const issues=payload?.renderedIssues||[];
const simplified=issues.map(issue=>({
  title:issue.title,
  impact:issue.impact,
  actions:(issue.actions||[]).map(a=>({
    title:a.title,
    description:a.description,
    action:a.action
  }))
}));

console.log(JSON.stringify({
  account_id:accountId,
  rendered_issue_count:issues.length,
  issues:simplified
},null,2));
