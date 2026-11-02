// Private alpha session bridge: browser only, no token storage, signup or posting.
export function createForumSession({auth,apiBase,fetcher=fetch}){
 if(!auth||typeof auth.signIn!=="function"||typeof auth.getSession!=="function"||typeof auth.getAccessToken!=="function"||typeof auth.signOut!=="function")throw Error("AUTH_NOT_CONFIGURED");
 const u=new URL(apiBase||"");
 if(u.origin!=="https://br-misty-sun-b850yi7t-fwkfalpha.compute.c-14.us-east-1.aws.neon.tech"||u.pathname!=="/"||u.search||u.hash)throw Error("STAGING_API_ALLOWLIST_FAILED");
 const meUrl=u.origin+"/me";
 async function testIdentity(){
  const session=await auth.getSession();
  if(!session?.session)return {authenticated:false,reason:"SIGNED_OUT"};
  const token=await auth.getAccessToken(); // memory only, not storage or logs.
  const res=await fetcher(meUrl,{method:"GET",redirect:"error",headers:{authorization:"Bearer "+token,accept:"application/json"},signal:AbortSignal.timeout(10000)});
  if(res.status===401)return {authenticated:false,reason:"TOKEN_REJECTED"};
  if(!res.ok)throw Error("FORUM_IDENTITY_UNAVAILABLE");
  const data=await res.json();
  if(data.authenticated!==true||data.posting!==false||data.membership!=="requires_invitation")throw Error("INVALID_API_RESPONSE");
  return {authenticated:true,posting:false,membership:"requires_invitation"};
 }
 return Object.freeze({
  async signIn(email,password){
   if(typeof email!=="string"||!/^\S+@\S+\.\S+$/.test(email)||typeof password!=="string"||password.length<8)throw Error("INVALID_CREDENTIALS");
   await auth.signIn(email.trim(),password); // real identity checked by Neon Managed Auth, never by this page.
   return testIdentity();
  },
  getStatus:testIdentity,
  async signOut(){await auth.signOut();return {authenticated:false,reason:"SIGNED_OUT"};}
 });
}
