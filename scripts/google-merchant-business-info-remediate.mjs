const accountId = process.env.GOOGLE_MERCHANT_ACCOUNT_ID || "5429352076";
const token = (process.env.GOOGLE_MERCHANT_ACCESS_TOKEN || "").trim();
const targetCustomerServiceUri = "https://shop.holytemples.org/contact";
const apply = process.env.GOOGLE_MERCHANT_APPLY || "";
const expected = "CONFIRM_UPDATE_CUSTOMER_SERVICE_URI";

if (!token) throw new Error("GOOGLE_MERCHANT_ACCESS_TOKEN is required.");
if (apply !== expected) throw new Error(`Refusing update. Set GOOGLE_MERCHANT_APPLY=${expected}`);

async function api(path,{method="GET",body}={}) {
  const res=await fetch("https://merchantapi.googleapis.com"+path,{
    method,
    headers:{
      Authorization:`Bearer ${token}`,
      ...(body?{"Content-Type":"application/json"}:{})
    },
    body:body?JSON.stringify(body):undefined
  });
  const text=await res.text();
  let payload=null;
  try{payload=text?JSON.parse(text):null}catch{payload=text}
  if(!res.ok) throw new Error(`${method} ${path} failed ${res.status}: ${JSON.stringify(payload)}`);
  return payload;
}

const path=`/accounts/v1/accounts/${accountId}/businessInfo`;
const before=await api(path);

if (!before?.customerService) throw new Error("Merchant businessInfo has no customerService object; refusing blind replacement.");

const body={
  name:before.name,
  customerService:{
    ...before.customerService,
    uri:targetCustomerServiceUri
  }
};

const updated=await api(path+"?updateMask=customerService",{
  method:"PATCH",
  body
});

const after=await api(path);
console.log(JSON.stringify({
  updated:true,
  before_customer_service:before.customerService,
  after_customer_service:after.customerService,
  preserved_address:Boolean(after.address),
  preserved_phone:Boolean(after.phone),
  phone_verification_state:after.phoneVerificationState
},null,2));

if(after?.customerService?.uri!==targetCustomerServiceUri) process.exit(2);
